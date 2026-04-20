import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("imageBase64 required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt =
      "You are a receipt OCR assistant. Extract data from receipt images and return ONLY valid JSON, no explanation.";
    const userPrompt =
      "Extract this receipt data: { merchant_name: string, total_amount: number, currency: string (ISO 4217, default IDR), transaction_date: string (YYYY-MM-DD or null if not found), payment_method: string or null, items: [{item_name: string, price: number}] or [], confidence_score: number (0-1, where 1=all fields perfectly clear) }. If not a receipt image return {\"error\":\"INVALID_IMAGE\"}. confidence_score: 0.85+ if all main fields are clear, 0.60-0.84 if some fields uncertain, below 0.60 if mostly unreadable.";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "RATE_LIMIT" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "PAYMENT_REQUIRED" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${aiRes.status}: ${txt}`);
    }

    const data = await aiRes.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    // Strip code fences if any
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { error: "PARSE_ERROR", raw: cleaned };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scan-receipt error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
