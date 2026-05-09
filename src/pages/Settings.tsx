import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, Copy as CopyIcon, Sparkles, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { formatRupiah, getInitials } from "@/lib/format";
import { getPaymentInfo, setPaymentInfo, PaymentInfo } from "@/lib/payment";
import { toast } from "sonner";

const CURRENCIES = ["IDR", "USD", "SGD", "MYR", "AUD", "EUR", "GBP", "JPY", "CNY", "KRW"];
const LANGS = [
  { v: "id", l: "Indonesia" },
  { v: "en", l: "English" },
  { v: "zh", l: "中文" },
];

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [lang, setLang] = useState("id");
  const [budgetEdit, setBudgetEdit] = useState(false);
  const [budget, setBudget] = useState(0);
  const [threshold, setThreshold] = useState(70);
  const [budgetInput, setBudgetInput] = useState("");
  const [thresholdInput, setThresholdInput] = useState(70);
  const [pay, setPay] = useState<PaymentInfo>({ bank: "", accountNumber: "", accountName: "" });
  const [code, setCode] = useState<string | null>(null);
  const [codeExp, setCodeExp] = useState<Date | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  // ── Email orang tua ──
  const [parentEmail1, setParentEmail1] = useState("");
  const [parentEmail2, setParentEmail2] = useState("");
  const [savingEmails, setSavingEmails] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const now = new Date();
      const [{ data: prof }, { data: bud }] = await Promise.all([
        supabase
          .from("profiles")
          .select("username,home_currency,preferensi_bahasa,parent_email_1,parent_email_2")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("budgets")
          .select("total_limit,alert_threshold")
          .eq("user_id", user.id)
          .eq("year", now.getFullYear())
          .eq("month", now.getMonth() + 1)
          .maybeSingle(),
      ]);
      if (prof) {
        setUsername(prof.username || "");
        setCurrency(prof.home_currency || "IDR");
        setLang(prof.preferensi_bahasa || "id");
        setParentEmail1((prof as any).parent_email_1 || "");
        setParentEmail2((prof as any).parent_email_2 || "");
      }
      if (bud) {
        setBudget(Number(bud.total_limit));
        setThreshold(Number(bud.alert_threshold || 70));
        setBudgetInput(String(bud.total_limit));
        setThresholdInput(Number(bud.alert_threshold || 70));
      }
      const p = getPaymentInfo();
      if (p) setPay(p);
    };
    load();
  }, [user]);

  const saveProfile = async (
    patch: Partial<{ username: string; home_currency: string; preferensi_bahasa: string }>
  ) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) return toast.error("Gagal menyimpan");
    toast.success("Tersimpan");
  };

  const saveBudget = async () => {
    if (!user) return;
    const now = new Date();
    const { error } = await supabase.from("budgets").upsert(
      {
        user_id: user.id,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        total_limit: Number(budgetInput),
        alert_threshold: thresholdInput,
        currency,
      },
      { onConflict: "user_id,month,year" }
    );
    if (error) return toast.error("Gagal menyimpan budget");
    setBudget(Number(budgetInput));
    setThreshold(thresholdInput);
    setBudgetEdit(false);
    toast.success("Budget tersimpan");
  };

  const resetBudget = async () => {
    if (!user) return;
    const now = new Date();
    await supabase
      .from("budgets")
      .delete()
      .eq("user_id", user.id)
      .eq("year", now.getFullYear())
      .eq("month", now.getMonth() + 1);
    setBudget(0);
    setBudgetInput("");
    setResetOpen(false);
    toast.success("Budget bulan ini direset");
  };

  const savePayment = () => {
    if (!pay.bank || !pay.accountNumber || !pay.accountName)
      return toast.error("Lengkapi semua field");
    setPaymentInfo(pay);
    toast.success("Info pembayaran disimpan di device");
  };

  // ── Save email orang tua ──
  const saveParentEmails = async () => {
    if (!user) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (parentEmail1 && !emailRegex.test(parentEmail1)) {
      return toast.error("Format email orang tua 1 tidak valid");
    }
    if (parentEmail2 && !emailRegex.test(parentEmail2)) {
      return toast.error("Format email orang tua 2 tidak valid");
    }
    setSavingEmails(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        parent_email_1: parentEmail1 || null,
        parent_email_2: parentEmail2 || null,
      } as any)
      .eq("id", user.id);
    setSavingEmails(false);
    if (error) return toast.error("Gagal menyimpan email");
    toast.success("Email orang tua tersimpan ✓");
  };

  const generateInviteCode = async () => {
    if (!user) return;
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("parent_child").insert({
      child_id: user.id,
      invite_code: newCode,
      expires_at: exp.toISOString(),
    });
    if (error) return toast.error("Gagal generate kode");
    setCode(newCode);
    setCodeExp(exp);
    toast.success("Kode dibuat! Berlaku 24 jam");
  };

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Kode disalin");
  };

  const doLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="app-shell pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="-ml-2 p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Pengaturan</h1>
      </header>

      <main className="px-4 py-4 space-y-5">

        {/* PROFIL */}
        <Section title="Profil">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-14 w-14 bg-primary text-primary-foreground">
              <AvatarFallback className="text-lg font-bold">{getInitials(username)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => saveProfile({ username })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Bahasa</Label>
              <Select
                value={lang}
                onValueChange={(v) => {
                  setLang(v);
                  saveProfile({ preferensi_bahasa: v });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => (
                    <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Mata uang utama</Label>
              <Select
                value={currency}
                onValueChange={(v) => {
                  setCurrency(v);
                  saveProfile({ home_currency: v });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        {/* KEUANGAN */}
        <Section title="Keuangan">
          <Card>
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <div className="text-xs text-muted-foreground">Budget bulan ini</div>
                <div className="font-bold">{formatRupiah(budget)}</div>
                <div className="text-xs text-muted-foreground">Alert {threshold}%</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setBudgetEdit(true)}>
                Edit
              </Button>
            </CardContent>
          </Card>
          <Button
            variant="ghost"
            className="w-full text-danger mt-2"
            onClick={() => setResetOpen(true)}
          >
            Reset Budget Bulan Ini
          </Button>
        </Section>

        {/* INFO PEMBAYARAN */}
        <Section title="Informasi Pembayaran">
          <p className="text-xs text-muted-foreground mb-2">
            🔒 Disimpan di device kamu saja, tidak ke server.
          </p>
          <div className="space-y-2">
            <Input
              placeholder="Bank / E-wallet"
              value={pay.bank}
              onChange={(e) => setPay({ ...pay, bank: e.target.value })}
            />
            <Input
              placeholder="Nomor rekening / HP"
              value={pay.accountNumber}
              onChange={(e) => setPay({ ...pay, accountNumber: e.target.value })}
            />
            <Input
              placeholder="Nama pemilik"
              value={pay.accountName}
              onChange={(e) => setPay({ ...pay, accountName: e.target.value })}
            />
            <Button size="sm" onClick={savePayment} className="w-full">
              Simpan
            </Button>
          </div>
        </Section>

        {/* PRIVASI */}
        <Section title="Privasi">
          <Card className="bg-success-soft border-success/20">
            <CardContent className="p-3 text-xs text-success">
              🔒 Foto struk tidak pernah kami simpan. Setiap foto hanya diproses di HP kamu.
            </CardContent>
          </Card>
        </Section>

        {/* HUBUNGKAN ORTU */}
        <Section title="Hubungkan ke Orang Tua">
          {code ? (
            <Card>
              <CardContent className="p-4 text-center space-y-2">
                <div className="text-3xl font-mono font-bold tracking-widest text-primary">
                  {code}
                </div>
                {codeExp && (
                  <div className="text-xs text-muted-foreground">
                    Berlaku sampai {codeExp.toLocaleString("id-ID")}
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={copyCode} className="w-full">
                  <CopyIcon className="h-3.5 w-3.5 mr-1" /> Salin Kode
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={generateInviteCode} className="w-full" variant="outline">
              Generate Kode (24 jam)
            </Button>
          )}
        </Section>

        {/* EMAIL ORANG TUA */}
        <Section title="Email Orang Tua">
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Laporan keuangan bulanan akan dikirim otomatis ke email ini setiap awal bulan.
                  Maksimal 2 alamat email. Fitur <span className="text-primary font-semibold">Premium</span>.
                </p>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Email Orang Tua 1</Label>
                  <Input
                    type="email"
                    placeholder="contoh: ayah@gmail.com"
                    value={parentEmail1}
                    onChange={(e) => setParentEmail1(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Email Orang Tua 2 (opsional)</Label>
                  <Input
                    type="email"
                    placeholder="contoh: bunda@gmail.com"
                    value={parentEmail2}
                    onChange={(e) => setParentEmail2(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={saveParentEmails}
                  disabled={savingEmails}
                  className="w-full"
                >
                  {savingEmails ? "Menyimpan..." : "Simpan Email"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* BERLANGGANAN */}
        <Section title="Berlangganan">
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-muted-foreground">Paket saat ini</div>
                  <div className="font-semibold">Free Plan</div>
                </div>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">14 hari gratis untuk pengguna baru</p>
              <Button onClick={() => setProOpen(true)} className="w-full">
                Upgrade ke Pro – Rp 15.000/bulan
              </Button>
            </CardContent>
          </Card>
        </Section>

        {/* KELUAR */}
        <Button
          variant="outline"
          className="w-full text-danger border-danger/30 hover:bg-danger-soft"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="h-4 w-4 mr-2" /> Keluar
        </Button>
      </main>

      {/* Edit budget dialog */}
      <Dialog open={budgetEdit} onOpenChange={setBudgetEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget Bulanan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Total budget</Label>
              <Input
                inputMode="numeric"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <Label>Ingatkan saat {thresholdInput}% terpakai</Label>
              <Slider
                min={50}
                max={90}
                step={5}
                value={[thresholdInput]}
                onValueChange={(v) => setThresholdInput(v[0])}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveBudget}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset budget */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset budget bulan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Budget bulan ini akan dihapus. Transaksi tidak terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetBudget}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={doLogout}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pro modal */}
      <Dialog open={proOpen} onOpenChange={setProOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✨ Pro Plan – Coming Soon</DialogTitle>
            <DialogDescription>
              Fitur Pro segera hadir! Kamu akan dapat: scan struk unlimited, split per item,
              prediksi stok pintar, export laporan, kirim laporan ke email orang tua, dan banyak lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setProOpen(false)}>Oke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
      {title}
    </h2>
    {children}
  </section>
);

export default Settings;
