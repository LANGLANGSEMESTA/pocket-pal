import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const body = await req.json()
    const { order_id, transaction_status, fraud_status } = body

    // Verifikasi signature dari Midtrans
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")!
    const signatureKey = await crypto.subtle.digest(
      "SHA-512",
      new TextEncoder().encode(
        `${order_id}${body.status_code}${body.gross_amount}${serverKey}`
      )
    )
    const signature = Array.from(new Uint8Array(signatureKey))
      .map(b => b.toString(16).padStart(2, "0")).join("")

    if (signature !== body.signature_key) throw new Error("Invalid signature")

    // Cek status pembayaran berhasil
    const isPaid =
      (transaction_status === "capture" && fraud_status === "accept") ||
      transaction_status === "settlement"

    if (!isPaid) return new Response("OK", { status: 200 })

    // Ambil user_id dari order_id format: SP-{userId8char}-{timestamp}
    const parts = order_id.split("-")
    const userIdPrefix = parts[1]

    // Update subscription di Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Cari user berdasarkan id prefix
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("id", `${userIdPrefix}%`)
      .single()

    if (!profile) throw new Error("User not found")

    // Tentukan expires_at
    const billing = body.item_details?.[0]?.id?.includes("yearly") ? "yearly" : "monthly"
    const expiresAt = new Date()
    billing === "yearly"
      ? expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      : expiresAt.setMonth(expiresAt.getMonth() + 1)

    await supabase.from("user_subscriptions").upsert({
      user_id: profile.id,
      plan: "pro",
      status: "active",
      billing_cycle: billing,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" })

    return new Response("OK", { status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
