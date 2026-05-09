import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { plan, billing_cycle } = await req.json()

    // Ambil user dari token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Ambil profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", user.id)
      .single()

    // Tentukan harga
    const prices: Record<string, number> = {
      "pro_monthly": 29000,
      "pro_yearly": 199000,
    }
    const amount = prices[`${plan}_${billing_cycle}`] || 29000
    const orderId = `SP-${user.id.slice(0,8)}-${Date.now()}`

    // Request ke Midtrans
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")!
    const isProduction = !serverKey.includes("SB-")
    const midtransUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions"

    const response = await fetch(midtransUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(serverKey + ":")}`
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: amount },
        customer_details: {
          first_name: profile?.username || "User",
          email: profile?.email || user.email,
        },
        item_details: [{
          id: `${plan}_${billing_cycle}`,
          price: amount,
          quantity: 1,
          name: `Student Pocket ${plan} - ${billing_cycle}`
        }],
        callbacks: {
          finish: "https://qian.my.id/upgrade?status=success",
          error: "https://qian.my.id/upgrade?status=error",
          pending: "https://qian.my.id/upgrade?status=pending"
        }
      })
    })

    const snapData = await response.json()
    return new Response(JSON.stringify({ token: snapData.token, order_id: orderId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
