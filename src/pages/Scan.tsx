import { useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, formatRupiah, PAYMENT_METHODS } from "@/lib/format";
import { requireAuthenticatedUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ScanResult = {
  merchant_name?: string;
  total_amount?: number;
  currency?: string;
  transaction_date?: string | null;
  payment_method?: string | null;
  items?: { item_name: string; price: number }[];
  confidence_score?: number;
  error?: string;
};

const Scan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  // Editable form
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("makan");
  const [payment, setPayment] = useState<string>("Tunai");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!base64) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64: base64 },
      });
      if (error) throw error;
      const r = data as ScanResult;
      setResult(r);
      if (r.error) {
        toast.error(r.error === "INVALID_IMAGE" ? "Gambar bukan struk" : "Gagal proses gambar");
        return;
      }
      setMerchant(r.merchant_name || "");
      setAmount(String(r.total_amount || ""));
      setDate(r.transaction_date || new Date().toISOString().slice(0, 10));
      setPayment(r.payment_method || "Tunai");
      // Increment scan_count
      if (user) {
        const monthKey = new Date().toISOString().slice(0, 7);
        const { data: prof } = await supabase
          .from("profiles")
          .select("scan_count,scan_count_month")
          .eq("id", user.id)
          .maybeSingle();
        const sameMonth = prof?.scan_count_month === monthKey;
        await supabase
          .from("profiles")
          .update({
            scan_count: sameMonth ? (prof?.scan_count || 0) + 1 : 1,
            scan_count_month: monthKey,
          })
          .eq("id", user.id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal scan struk. Coba lagi ya.");
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setBase64(null);
    setResult(null);
    setMerchant("");
    setAmount("");
  };

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Total harus diisi");
      return;
    }
    setSaving(true);
    try {
      const currentUser = await requireAuthenticatedUser();
      const { error } = await supabase.from("transactions").insert({
        user_id: currentUser.id,
        merchant_name: merchant || "Struk",
        total_amount: Number(amount),
        transaction_date: date,
        category,
        payment_method: payment,
        notes: notes || null,
      });

      if (error) {
        throw error;
      }

      toast.success("Tersimpan dari struk! 🎉");
      navigate("/dashboard");
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const conf = result?.confidence_score ?? 0;
  const confColor =
    conf >= 0.85 ? "bg-success-soft text-success" : conf >= 0.6 ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger";
  const ConfIcon = conf >= 0.85 ? CheckCircle2 : conf >= 0.6 ? AlertTriangle : XCircle;
  const confText =
    conf >= 0.85 ? "Struk terbaca dengan baik" : conf >= 0.6 ? "Beberapa field perlu dicek" : "Foto kurang jelas, coba foto ulang";

  return (
    <div className="app-shell pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="-ml-2 p-2"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Scan Struk</h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        <Card className="bg-primary-soft border-primary/20">
          <CardContent className="p-3 text-xs text-primary flex gap-2">
            🔒 Foto kamu diproses di HP saja, tidak kami simpan ke server.
          </CardContent>
        </Card>

        {!previewUrl ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary-soft/30 transition-colors"
          >
            <Camera className="h-10 w-10 text-muted-foreground" />
            <span className="font-medium">Tap untuk pilih / foto struk</span>
            <span className="text-xs text-muted-foreground">JPG, PNG</span>
          </button>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={previewUrl} alt="Preview struk" className="w-full max-h-80 object-contain bg-muted" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {previewUrl && !result && (
          <Button onClick={handleScan} disabled={scanning} className="w-full" size="lg">
            {scanning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI sedang membaca struk... ✨</> : "Scan Struk"}
          </Button>
        )}

        {result && !result.error && (
          <>
            <Badge className={cn("w-full justify-center py-2 gap-2", confColor)}>
              <ConfIcon className="h-4 w-4" /> {confText}
            </Badge>

            <div className="space-y-3">
              <div>
                <Label>Merchant</Label>
                <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Total</Label>
                  <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
                  {amount && <p className="text-xs text-muted-foreground mt-1">{formatRupiah(Number(amount))}</p>}
                </div>
                <div>
                  <Label>Tanggal</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Kategori</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => setCategory(c.v)}
                      className={cn(
                        "text-left px-3 py-2 rounded-lg border text-sm flex items-center gap-2",
                        category === c.v ? "border-primary bg-primary-soft" : "border-border bg-card"
                      )}
                    >
                      <span>{c.e}</span> {c.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Metode Pembayaran</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayment(m)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs border",
                        payment === m ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              {result.items && result.items.length > 0 && (
                <Card>
                  <CardContent className="p-3 text-xs space-y-1">
                    <div className="font-semibold mb-1">Item terdeteksi:</div>
                    {result.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span>{it.item_name}</span>
                        <span>{formatRupiah(it.price)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-1" /> Scan Ulang
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : "Konfirmasi & Simpan"}
              </Button>
            </div>
          </>
        )}

        {result?.error === "INVALID_IMAGE" && (
          <Card className="bg-danger-soft border-danger/20">
            <CardContent className="p-3 text-sm text-danger">
              Gambar ini bukan struk. Coba foto struk yang lain.
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Scan;
