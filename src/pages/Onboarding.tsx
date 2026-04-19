import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Bell, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const CURRENCIES = [
  { v: "IDR", l: "🇮🇩 IDR — Rupiah" },
  { v: "USD", l: "🇺🇸 USD — Dollar" },
  { v: "SGD", l: "🇸🇬 SGD — Singapore $" },
  { v: "MYR", l: "🇲🇾 MYR — Ringgit" },
  { v: "AUD", l: "🇦🇺 AUD — Aussie $" },
  { v: "EUR", l: "🇪🇺 EUR — Euro" },
  { v: "GBP", l: "🇬🇧 GBP — Pound" },
  { v: "JPY", l: "🇯🇵 JPY — Yen" },
  { v: "CNY", l: "🇨🇳 CNY — Yuan" },
  { v: "KRW", l: "🇰🇷 KRW — Won" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState("id");
  const [username, setUsername] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [budget, setBudget] = useState("");
  const [threshold, setThreshold] = useState([70]);
  const [saving, setSaving] = useState(false);

  const finish = async (notif: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      if (notif && "Notification" in window) {
        await Notification.requestPermission();
      }
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          username,
          home_currency: currency,
          preferensi_bahasa: language,
          onboarding_complete: true,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;

      const now = new Date();
      const { error: bErr } = await supabase.from("budgets").upsert({
        user_id: user.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        total_limit: Number(budget),
        alert_threshold: threshold[0],
        currency,
      }, { onConflict: "user_id,month,year" });
      if (bErr) throw bErr;

      toast.success("Yeay, semua siap! 🎉");
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell flex flex-col px-5 py-8">
      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col flex-1 justify-between">
          <div className="flex flex-col items-center text-center pt-8">
            <div className="h-24 w-24 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/30 mb-6">
              <Wallet className="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Student Pocket Assistant</h1>
            <p className="text-muted-foreground mt-3 max-w-xs">
              Kelola uangmu, tenang kuliah. Tracking jajan, split bill, sampe budget — semua di satu app.
            </p>

            <div className="w-full mt-10 space-y-2">
              <Label className="text-xs">Pilih bahasa</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">🇮🇩 Bahasa Indonesia</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="zh">🇨🇳 中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full h-12 mt-8" onClick={() => setStep(2)}>
            Mulai Sekarang <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col flex-1 justify-between">
          <div>
            <h2 className="text-2xl font-bold">Kenalan dulu yuk 👋</h2>
            <p className="text-muted-foreground text-sm mt-1">Biar app nya bisa manggil kamu dengan benar.</p>

            <div className="space-y-5 mt-8">
              <div className="space-y-1.5">
                <Label htmlFor="uname">Username</Label>
                <Input
                  id="uname"
                  placeholder="contoh: rinaaa"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mata uang utama</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button
            className="w-full h-12 mt-8"
            onClick={() => setStep(3)}
            disabled={!username.trim()}
          >
            Lanjut <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col flex-1 justify-between">
          <div>
            <h2 className="text-2xl font-bold">Atur budget bulanan 💸</h2>
            <p className="text-muted-foreground text-sm mt-1">Kita bantu jagain biar gak kebablasan.</p>

            <div className="space-y-6 mt-8">
              <div className="space-y-1.5">
                <Label>Budget per bulan</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    {currency === "IDR" ? "Rp" : currency}
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="2.000.000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-11 pl-12"
                  />
                </div>
              </div>

              <Card className="p-4 bg-primary-soft border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm">Alarm budget</Label>
                  <span className="text-lg font-bold text-primary">{threshold[0]}%</span>
                </div>
                <Slider
                  min={50}
                  max={90}
                  step={5}
                  value={threshold}
                  onValueChange={setThreshold}
                />
                <p className="text-xs text-muted-foreground mt-3">
                  Ingatkan saat <b>{threshold[0]}%</b> budget kepakai.
                </p>
              </Card>
            </div>
          </div>
          <Button
            className="w-full h-12 mt-8"
            onClick={() => setStep(4)}
            disabled={!budget || Number(budget) <= 0}
          >
            Lanjut <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col flex-1 justify-between">
          <div className="flex flex-col items-center text-center pt-12">
            <div className="h-24 w-24 rounded-3xl bg-warning-soft text-warning flex items-center justify-center mb-6">
              <Bell className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold">Aktifkan notifikasi?</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs">
              Biar kamu dapet reminder kalau budget hampir habis atau ada cicilan split bill yang belum lunas.
            </p>
            <div className="flex items-center gap-2 text-xs text-primary mt-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Bisa diubah kapan aja di pengaturan</span>
            </div>
          </div>
          <div className="space-y-2.5 mt-8">
            <Button className="w-full h-12" onClick={() => finish(true)} disabled={saving}>
              Izinkan Notifikasi
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12"
              onClick={() => finish(false)}
              disabled={saving}
            >
              Nanti saja
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
