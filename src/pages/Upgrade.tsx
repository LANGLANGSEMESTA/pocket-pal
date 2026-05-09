import { useState } from "react";
import { ArrowLeft, Sparkles, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "sonner";

type Cycle = "monthly" | "yearly";

const PLANS: Record<Cycle, { label: string; price: number; sub: string; badge?: string }> = {
  monthly: { label: "Bulanan", price: 15000, sub: "/bulan", badge: undefined },
  yearly: { label: "Tahunan", price: 150000, sub: "/tahun", badge: "Hemat 2 bulan" },
};

const FEATURES = [
  "Voice input untuk catat transaksi",
  "Scan struk dengan AI (otomatis baca total, merchant, kategori)",
  "Hubungkan ke max 2 orang tua",
  "Laporan Excel bulanan otomatis ke email orang tua",
  "Prioritas dukungan",
];

const Upgrade = () => {
  const navigate = useNavigate();
  const { isPro, expiresAt, refresh } = usePlan();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { plan: "pro", billing_cycle: cycle },
      });

      if (error) throw error;

      const snapToken = (data as any)?.token;

      if (!snapToken) {
        toast.error("Gagal mendapatkan token pembayaran.");
        return;
      }

      (window as any).snap.pay(snapToken, {
        onSuccess: () => {
          toast.success("Pembayaran berhasil! Akses Pro sudah aktif.");
          refresh();
          navigate("/");
        },
        onPending: () => {
          toast.info("Pembayaran pending. Akses Pro aktif setelah terkonfirmasi.");
        },
        onError: () => {
          toast.error("Pembayaran gagal. Silakan coba lagi.");
        },
        onClose: () => {
          toast.info("Pembayaran dibatalkan.");
        },
      });

    } catch (err: any) {
      toast.error(err?.message || "Gagal memulai pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const p = PLANS[cycle];

  return (
    <div className="app-shell pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="-ml-2 p-2"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold flex items-center gap-1.5"><Sparkles className="h-5 w-5 text-primary" /> Upgrade ke Pro</h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        {isPro && (
          <Card className="border-success/30 bg-success-soft">
            <CardContent className="p-4 text-sm text-success">
              ✨ Kamu sudah Pro! {expiresAt && <>Aktif sampai <strong>{expiresAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong>.</>}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(PLANS) as Cycle[]).map((c) => {
            const pp = PLANS[c];
            const active = cycle === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={cn(
                  "relative rounded-xl border p-4 text-left transition",
                  active ? "border-primary bg-primary-soft ring-2 ring-primary" : "border-border bg-card"
                )}
              >
                {pp.badge && (
                  <span className="absolute -top-2 right-2 text-[10px] font-bold bg-warning text-warning-foreground px-2 py-0.5 rounded-full">
                    {pp.badge}
                  </span>
                )}
                <div className="text-xs text-muted-foreground">{pp.label}</div>
                <div className="font-bold mt-1">{formatRupiah(pp.price)}</div>
                <div className="text-xs text-muted-foreground">{pp.sub}</div>
              </button>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-4 space-y-2.5">
            <h3 className="font-semibold text-sm">Yang kamu dapat:</h3>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex gap-2 text-sm">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Button onClick={handlePay} disabled={loading} className="w-full" size="lg">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</> : <>Bayar {formatRupiah(p.price)} via Midtrans</>}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground">
          Pembayaran aman via Midtrans. Akses Pro otomatis aktif setelah pembayaran terkonfirmasi.
        </p>
      </main>
    </div>
  );
};

export default Upgrade;
