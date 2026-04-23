// Edge function: parse a voice transcript into amount + merchant + category
// Uses Lovable AI Gateway (free, no extra key needed). CORS enabled.

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are an expense parser. Extract structured data from a short spoken expense in any language. Return ONLY JSON via the tool. Examples:
- "Kopi 30 ribu" -> {merchant:"Kopi", amount:30000, category:"kopi_lifestyle"}
- "Bensin 50rb" -> {merchant:"Bensin", amount:50000, category:"transport"}
- "Makan siang 25 ribu di warteg" -> {merchant:"Warteg", amount:25000, category:"makan"}
- "Coffee 5 dollars" -> {merchant:"Coffee", amount:5, category:"kopi_lifestyle"}
- "Netflix 15000" -> {merchant:"Netflix", amount:15000, category:"hiburan"}
Indonesian shortcuts: "ribu"/"rb"=*1000, "juta"/"jt"=*1000000, "k"=*1000.
Categories: makan, kopi_survival, kopi_lifestyle, transport, kuliah, kos, belanja, kesehatan, hiburan, stok, lainnya.
If unparseable, set confidence to 0.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Language hint: ${lang || "id"}\nTranscript: "${transcript}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_expense",
              description: "Extract expense fields from a spoken transcript",
              parameters: {
                type: "object",
                properties: {
                  merchant: { type: "string", description: "Merchant or item name, capitalized" },
                  amount: { type: "number", description: "Numeric amount in the local currency" },
                  category: {
                    type: "string",
                    enum: ["makan", "kopi_survival", "kopi_lifestyle", "transport", "kuliah", "kos", "belanja", "kesehatan", "hiburan", "stok", "lainnya"],
                  },
                  confidence: { type: "number", description: "0 to 1" },
                },
                required: ["merchant", "amount", "category", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_expense" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI parse failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;

    if (!parsed) {
      return new Response(JSON.stringify({ error: "No structured output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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