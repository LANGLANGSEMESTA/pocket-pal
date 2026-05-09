import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { useAuth, useAuthReady } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CATEGORIES, PAYMENT_METHODS } from "@/lib/format";
import { requireAuthenticatedUser } from "@/lib/auth";
import { VoiceInput } from "@/components/VoiceInput";
import { toast } from "sonner";

const CURRENCIES = ["IDR", "USD", "SGD", "MYR", "AUD", "EUR", "GBP", "JPY", "CNY", "KRW"];

const NewTransaction = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isReady } = useAuthReady();

  const [merchant, setMerchant] = useState(searchParams.get("merchant") || "");
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState(searchParams.get("amount") || "");
  const [currency, setCurrency] = useState("IDR");
  const [category, setCategory] = useState<string>(searchParams.get("category") || "makan");
  const [payment, setPayment] = useState<string>(searchParams.get("payment") || "Tunai");
  const [notes, setNotes] = useState(searchParams.get("notes") || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("home_currency")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.home_currency) setCurrency(data.home_currency);
      });
  }, [user]);

  // Show toast if came from voice input
  useEffect(() => {
    if (searchParams.get("merchant") || searchParams.get("amount")) {
      toast.success("✓ Data dari suara berhasil diisi!");
    }
  }, []);

  const finalAmount = Number(amount) || 0;

  const save = async () => {
    if (!isReady) return toast.error("Sesi belum siap, coba lagi sebentar");
    if (!merchant.trim()) return toast.error("Nama merchant wajib diisi");
    if (finalAmount <= 0) return toast.error("Nominal harus lebih dari 0");

    setSaving(true);
    try {
      const currentUser = await requireAuthenticatedUser();

      const { error: txErr } = await supabase
        .from("transactions")
        .insert({
          user_id: currentUser.id,
          merchant_name: merchant.trim(),
          total_amount: finalAmount,
          original_currency: currency,
          home_currency: currency,
          transaction_date: format(date, "yyyy-MM-dd"),
          category,
          payment_method: payment,
          is_itemized: false,
          notes: notes.trim() || null,
        })
        .select()
        .single();
      if (txErr) throw txErr;

      toast.success("Transaksi tersimpan! 🎉");
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell pb-32">
      <header className="px-5 pt-8 pb-4 flex items-center gap-3 sticky top-0 bg-background z-10">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold flex-1">Catat Transaksi</h1>
      </header>

      <main className="px-5 space-y-5">
        {/* Merchant */}
        <div className="space-y-1.5">
          <Label htmlFor="merchant">Nama merchant</Label>
          <Input
            id="merchant"
            autoFocus
            placeholder="contoh: Warteg Bahari"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Date + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("h-11 w-full justify-start font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {format(date, "d MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Mata uang</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Nominal</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              {currency === "IDR" ? "Rp" : currency}
            </span>
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 pl-12 text-lg font-semibold"
            />
          </div>
          {amount && Number(amount) > 0 && (
            <p className="text-xs text-muted-foreground pl-1">
              = {Number(amount).toLocaleString("id-ID")}
            </p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.v} value={c.v}>
                  <span className="mr-2">{c.e}</span>{c.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment */}
        <div className="space-y-1.5">
          <Label>Metode pembayaran</Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPayment(m)}
                className={cn(
                  "px-3.5 py-2 rounded-full text-xs font-semibold border transition",
                  payment === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Catatan (opsional)</Label>
          <Textarea
            id="notes"
            placeholder="contoh: makan siang sama Andi"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-2">
          <Button variant="outline" className="flex-1 h-12" onClick={() => navigate(-1)} disabled={saving}>
            Batal
          </Button>
          <Button className="flex-1 h-12" onClick={save} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </main>

      {/* Floating mic — posisi sama persis seperti halaman lain */}
      <div className="fixed bottom-26 right-4 z-50">
        <VoiceInput
          floating
          onParsed={(d) => {
            if (d.merchant) setMerchant(d.merchant);
            if (d.amount) setAmount(String(d.amount));
            if (d.category) setCategory(d.category);
            if (d.payment_method) setPayment(d.payment_method);
            if (d.notes) setNotes(d.notes);
          }}
        />
      </div>
    </div>
  );
};

export default NewTransaction;
