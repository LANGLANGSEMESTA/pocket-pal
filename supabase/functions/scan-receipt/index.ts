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
      `Extract this receipt data as JSON: { merchant_name: string, total_amount: number, currency: string (ISO 4217, default IDR), transaction_date: string (YYYY-MM-DD or null), payment_method: string or null, category: one of ["makan","kopi_survival","kopi_lifestyle","transport","kuliah","kos","belanja","kesehatan","hiburan","stok","lainnya"], items: [{item_name, price}] or [], confidence_score: number (0-1) }.

Category rules (infer from merchant_name + items):
- "transport": toll roads (Jasa Marga, Tol, Gerbang Tol, GTO), gas stations (Pertamina, Shell, BP, SPBU), ride-hailing (Gojek, GoCar, GoRide, Grab, Maxim, inDrive), parking, public transport (KRL, MRT, TransJakarta, KAI, train, bus, taxi), vehicle service.
- "makan": restaurants, warung, fast food (KFC, McD, HokBen), bakery, food delivery for food, food court.
- "kopi_survival": cheap coffee/warkop/instant coffee.
- "kopi_lifestyle": Starbucks, Kopi Kenangan, Janji Jiwa, Fore, Tomoro, %Arabica, boba (Chatime, Xing Fu Tang, KOI).
- "kuliah": stationery, books, printing, tuition.
- "kos": rent, PLN, PDAM, Indihome, Biznet, gas LPG.
- "belanja": clothing, fashion, electronics, marketplace goods.
- "kesehatan": Apotek, Kimia Farma, Guardian, Watsons, hospital, clinic.
- "hiburan": cinema (XXI, CGV), Netflix, Spotify, games, gym, concerts.
- "stok": galon Aqua, gas LPG refill, laundry, beras.
- "lainnya": only if nothing fits.

If not a receipt return {"error":"INVALID_IMAGE"}. confidence_score: 0.85+ all clear, 0.60-0.84 some uncertain, <0.60 unreadable.`;

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
