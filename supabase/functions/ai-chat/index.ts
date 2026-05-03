import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are SafeCity AI Safety Advisor, a calm, concise emergency assistant for citizens.

Your job: give short, step-by-step safety guidance during panic, danger, or unsafe situations, AND answer general safety / city-navigation / reporting questions.

RESPONSE STYLE:
- Calm, clear, reassuring, action-first.
- Use **markdown**: short bold headings, bullet lists, numbered steps. Keep under ~150 words.
- Lead with the single most important next action.
- When relevant, reference the user's CONTEXT (location, nearby services, nearby crimes) by name and distance.
- Use emojis sparingly for status (🚨 danger, ✅ safe, 📞 call, 📍 location).

SAFETY PROTOCOL (when user reports danger or fear):
1. **Get safe** — move to a crowded, well-lit, public place.
2. **Call** — Police 100 · Ambulance 102 · Women Helpline 1091 · Child Helpline 1098 (India).
3. **Trigger SOS** in this app (button below) so admins + your contacts are alerted with your live location.
4. Stay on the line with someone you trust; share live location.

CRIME REPORTING HELP:
- Encourage filing a report in the app with: type, time, exact location (use the map pin), description, and any photos.
- Remind users that false reports waste police time and the system flags suspicious reports automatically.

OUT-OF-SCOPE:
- For non-safety questions, answer briefly (1–2 lines) and redirect to safety topics.
- Never give legal/medical disclaimers. Never invent phone numbers, addresses, or laws.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const message: string = body?.message || "";
    const location = body?.location || null;
    const history: Array<{ role: string; content: string }> = body?.history || [];

    if (!message || typeof message !== "string" || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from DB
    let contextStr = "";
    if (location?.lat && location?.lng) {
      contextStr += `User location: lat ${location.lat.toFixed(4)}, lng ${location.lng.toFixed(4)}.\n`;

      const { data: services } = await supabase
        .from("emergency_services")
        .select("name, type, phone, address, location_lat, location_lng")
        .limit(50);

      if (services?.length) {
        const withDist = services.map((s: any) => {
          const dx = (s.location_lat - location.lat) * 111;
          const dy = (s.location_lng - location.lng) * 111;
          return { ...s, dist: Math.sqrt(dx * dx + dy * dy) };
        }).sort((a: any, b: any) => a.dist - b.dist).slice(0, 3);
        contextStr += "Nearest emergency services:\n";
        withDist.forEach((s: any) => {
          contextStr += `- ${s.name} (${s.type}) ${s.dist.toFixed(1)}km · ${s.phone}\n`;
        });
      }

      // Recent crimes within ~2km
      const { data: crimes } = await supabase
        .from("crime_reports")
        .select("type, severity, location_lat, location_lng, created_at")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
        .limit(200);

      if (crimes?.length) {
        const nearby = crimes.filter((c: any) => {
          const dx = (c.location_lat - location.lat) * 111;
          const dy = (c.location_lng - location.lng) * 111;
          return Math.sqrt(dx * dx + dy * dy) < 2;
        });
        if (nearby.length) {
          contextStr += `Recent crimes within 2km (last 30d): ${nearby.length}. `;
          const types = [...new Set(nearby.map((c: any) => c.type))].slice(0, 4).join(", ");
          contextStr += `Types: ${types}.\n`;
        }
      }
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + (contextStr ? `\n\nCONTEXT:\n${contextStr}` : "") },
      ...history.slice(-8),
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.4,
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply: string = data?.choices?.[0]?.message?.content || "I'm here. Stay calm.";

    // Persist
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      message,
      response: reply,
      location_lat: location?.lat ?? null,
      location_lng: location?.lng ?? null,
    });

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});