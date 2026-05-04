// Edge function: parse a voice transcript into amount + merchant + category
// Uses DeepSeek V4 API. CORS enabled.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, lang } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "transcript is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DEEPSEEK_API_KEY = Deno.env.get("sk-2df51f2b904b42ffa54ccd64b084b5c9");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY missing");

    const systemPrompt = `You are an expense parser. Extract structured data from a short spoken expense in any language. Return ONLY valid JSON with these fields: merchant, amount, category, payment_method, notes, confidence.
Examples:
- "Kopi 30 ribu" -> {"merchant":"Kopi","amount":30000,"category":"kopi_lifestyle","payment_method":null,"notes":null,"confidence":0.95}
- "Bensin 50rb gopay" -> {"merchant":"Bensin","amount":50000,"category":"transport","payment_method":"GoPay","notes":null,"confidence":0.9}
- "Makan siang 25 ribu di warteg" -> {"merchant":"Warteg","amount":25000,"category":"makan","payment_method":null,"notes":"makan siang","confidence":0.95}
Indonesian shortcuts: "ribu"/"rb"=*1000, "juta"/"jt"=*1000000, "k"=*1000.
Categories: makan, kopi_survival, kopi_lifestyle, transport, kuliah, kos, belanja, kesehatan, hiburan, stok, lainnya.
Payment methods: Tunai, GoPay, OVO, DANA, Transfer, Kartu.
Return ONLY the JSON object, no markdown, no explanation.`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat", // DeepSeek V4 / DeepSeek-V3 latest
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Language hint: ${lang || "id"}\nTranscript: "${transcript}"` },
        ],
        temperature: 0.1,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("DeepSeek API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI parse failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    // Strip markdown fences if any
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    let parsed: any = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse DeepSeek output:", rawText);
      return new Response(JSON.stringify({ error: "Failed to parse AI output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-voice-transaction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
