import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const SendOtpSchema = z.object({
  phone: z.string().min(10).max(20),
});

const VerifyOtpSchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().length(6),
});

// Simple in-memory OTP store (production should use DB)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!TWILIO_API_KEY) {
    return new Response(JSON.stringify({ error: "TWILIO_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER");

  try {
    const body = await req.json();
    const action = body.action || new URL(req.url).searchParams.get("action");

    if (action === "send") {
      const parsed = SendOtpSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: "Invalid phone number" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { phone } = parsed.data;
      const code = generateOtp();
      otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

      const fromNumber = TWILIO_PHONE || "+15017122661";

      const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: fromNumber,
          Body: `Your MySafeCity verification code is: ${code}. Valid for 5 minutes.`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Twilio error:", data);
        return new Response(JSON.stringify({ error: "Failed to send OTP" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "OTP sent" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const parsed = VerifyOtpSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: "Invalid input" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { phone, code } = parsed.data;
      const stored = otpStore.get(phone);

      if (!stored || stored.expiresAt < Date.now()) {
        otpStore.delete(phone);
        return new Response(JSON.stringify({ error: "OTP expired or not found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (stored.code !== code) {
        return new Response(JSON.stringify({ error: "Invalid OTP" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      otpStore.delete(phone);

      // Sign in or sign up user via Supabase Admin
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Check if user exists with this phone
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.phone === phone);

      let session = null;

      if (existingUser) {
        // Generate a magic link / session for existing user
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: existingUser.email || `${phone.replace(/\+/g, "")}@phone.mysafecity.local`,
        });
        if (error) throw new Error(error.message);
        // Sign in with the token
        const tokenHash = new URL(data.properties.action_link).searchParams.get("token");
        session = { token_hash: tokenHash, type: "magiclink", user_id: existingUser.id };
      } else {
        // Create new user with phone
        const email = `${phone.replace(/[^0-9]/g, "")}@phone.mysafecity.local`;
        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          phone,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { name: "", phone },
        });
        if (error) throw new Error(error.message);
        
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
        const tokenHash = linkData ? new URL(linkData.properties.action_link).searchParams.get("token") : null;
        session = { token_hash: tokenHash, type: "magiclink", user_id: newUser.user.id };
      }

      return new Response(JSON.stringify({ success: true, verified: true, session }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("OTP error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
