import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are a fraud-detection analyst for a citizen crime-reporting platform.
Given a new crime report, decide how likely it is GENUINE vs FAKE / spam / joke / duplicate.

Score 0-100: 100 = clearly genuine, 0 = clearly fake.
Consider: vague/empty descriptions, joke language, profanity-only, copy-paste of recent reports,
impossible details (e.g. "aliens", "zombies"), severity vs description mismatch, and prior duplicates.

Return ONLY via the report_authenticity tool.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const reportId: string = body?.reportId;
    if (!reportId) {
      return new Response(JSON.stringify({ error: "reportId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: report, error: rErr } = await admin
      .from("crime_reports")
      .select("id, user_id, type, title, description, severity, location_lat, location_lng, location_address, crime_location_lat, crime_location_lng, media_names, created_at")
      .eq("id", reportId).single();
    if (rErr || !report) throw new Error(rErr?.message || "Report not found");

    // Recent reports by same user (last 7d)
    const { data: history } = await admin
      .from("crime_reports")
      .select("type, title, description, severity, created_at, authenticity_score")
      .eq("user_id", report.user_id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(15);

    // Recent nearby reports (last 7d, ~2km)
    const { data: recent } = await admin
      .from("crime_reports")
      .select("type, title, description, location_lat, location_lng, created_at")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .limit(200);
    const nearby = (recent || []).filter((r: any) => {
      const dx = (r.location_lat - report.location_lat) * 111;
      const dy = (r.location_lng - report.location_lng) * 111;
      return Math.sqrt(dx * dx + dy * dy) < 2 && r.title !== report.title;
    }).slice(0, 8);

    const userPrompt = `NEW REPORT:
- type: ${report.type}
- severity: ${report.severity}
- title: ${report.title}
- description: ${report.description}
- has_media: ${(report.media_names?.length || 0) > 0}
- location: ${report.location_address || `${report.location_lat},${report.location_lng}`}
- crime_location_pinned: ${report.crime_location_lat != null}

REPORTER HISTORY (last 7d, ${history?.length || 0} reports):
${(history || []).map((h: any) => `- [${new Date(h.created_at).toISOString().slice(0,10)}] ${h.type}/${h.severity} · ${h.title} · score=${h.authenticity_score ?? 'n/a'}`).join("\n") || "none"}

NEARBY REPORTS (~2km, 7d):
${nearby.map((n: any) => `- ${n.type} · ${n.title}`).join("\n") || "none"}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_authenticity",
            description: "Return authenticity assessment for a crime report.",
            parameters: {
              type: "object",
              properties: {
                score: { type: "integer", minimum: 0, maximum: 100, description: "100=genuine, 0=fake" },
                verdict: { type: "string", enum: ["genuine", "suspicious", "likely_fake"] },
                reasons: { type: "array", items: { type: "string" }, description: "Short bullet reasons (3-5)" },
                flags: {
                  type: "array",
                  items: { type: "string", enum: ["vague", "joke", "duplicate", "spam", "impossible", "severity_mismatch", "no_evidence", "repeat_offender", "ok"] },
                },
              },
              required: ["score", "verdict", "reasons", "flags"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_authenticity" } },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      throw new Error("AI gateway error");
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let analysis: any = { score: 50, verdict: "suspicious", reasons: ["Could not parse AI response"], flags: [] };
    if (call?.function?.arguments) {
      try { analysis = JSON.parse(call.function.arguments); } catch { /* keep default */ }
    }

    const score = Math.max(0, Math.min(100, Math.round(analysis.score)));

    await admin.from("crime_reports").update({
      authenticity_score: score,
      authenticity_analysis: { ...analysis, analyzed_at: new Date().toISOString() },
    }).eq("id", reportId);

    // Notify admins on suspicious / fake
    if (score < 50) {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        const rows = admins.map((a: any) => ({
          user_id: a.user_id,
          type: "alert",
          title: `⚠️ Suspicious report (score ${score})`,
          message: `"${report.title}" — ${analysis.verdict}: ${(analysis.reasons || []).slice(0, 2).join("; ")}`,
        }));
        await admin.from("notifications").insert(rows);
      }
    }

    return new Response(JSON.stringify({ score, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-fake-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});