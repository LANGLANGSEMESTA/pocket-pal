import { BottomNav } from "@/components/BottomNav";
import { useAuthReady } from "@/hooks/useAuth";
import { useEffect, useRef, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Package, ChevronRight, Bell, CreditCard, DollarSign, Monitor, Heart, Scissors } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatRupiah, getCategory } from "@/lib/format";
import { getAuthenticatedUser } from "@/lib/auth";
import { AvatarMenu } from "@/components/AvatarMenu";
import { useI18n } from "@/hooks/useI18n";

interface Tx {
  id: string;
  merchant_name: string | null;
  total_amount: number;
  category: string | null;
  transaction_date: string | null;
  original_currency: string | null;
}

interface Budget {
  total_limit: number;
  currency: string | null;
}

function useRollingCounter(target: number, duration = 800) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return;
    prevRef.current = to;
    const start = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * ease));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
      else setDisplay(to);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

const Dashboard = () => {
  const { isReady } = useAuthReady();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [homeCurrency, setHomeCurrency] = useState("IDR");
  const [budget, setBudget] = useState<Budget | null>(null);
  const [spent, setSpent] = useState(0);
  const [recent, setRecent] = useState<Tx[]>([]);
  const [runningLow, setRunningLow] = useState<{ id: string; item_name: string; predicted_next_date: string | null }[]>([]);
  const [monthCount, setMonthCount] = useState(0);
  const [topTx, setTopTx] = useState<Tx | null>(null);
  const [subsCount, setSubsCount] = useState(0);
  const [catSpend, setCatSpend] = useState<{ category: string; total: number }[]>([]);

  const today = useMemo(() => new Date(), []);
  const dateLabel = today.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

  const limit = budget?.total_limit || 0;
  const sisa = Math.max(0, limit - spent);
  const displaySisa = useRollingCounter(sisa);
  const displaySpent = useRollingCounter(spent);

  useEffect(() => {
    if (!isReady) return;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month - 1, 1).toISOString().slice(0, 10);

    (async () => {
      const currentUser = await getAuthenticatedUser();
      if (!currentUser) {
        setUsername("");
        setHomeCurrency("IDR");
        setBudget(null);
        setRecent([]);
        setSpent(0);
        return;
      }

      const [{ data: profile }, { data: bud }, { data: txs }] = await Promise.all([
        supabase.from("profiles").select("username, home_currency").eq("id", currentUser.id).maybeSingle(),
        supabase.from("budgets").select("total_limit, currency").eq("user_id", currentUser.id).eq("month", month).eq("year", year).maybeSingle(),
        supabase.from("transactions").select("id, merchant_name, total_amount, category, transaction_date, original_currency").eq("user_id", currentUser.id).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(5),
      ]);

      setUsername(profile?.username || "");
      setHomeCurrency(profile?.home_currency || "IDR");
      setBudget(bud);
      setRecent((txs as Tx[]) || []);

      const { data: sumRows } = await supabase.from("transactions").select("total_amount, category, merchant_name, transaction_date, original_currency, id").eq("user_id", currentUser.id).gte("transaction_date", startOfMonth);
      const rows = (sumRows || []) as any[];
      const total = rows.reduce((s, r: any) => s + Number(r.total_amount || 0), 0);
      setSpent(total);
      setMonthCount(rows.length);

      const top = [...rows].sort((a, b) => Number(b.total_amount) - Number(a.total_amount))[0] || null;
      setTopTx(top);

      const map = new Map<string, number>();
      rows.forEach((r: any) => {
        const k = r.category || "lainnya";
        map.set(k, (map.get(k) || 0) + Number(r.total_amount || 0));
      });
      const arr = Array.from(map.entries()).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total).slice(0, 4);
      setCatSpend(arr);

      const { count } = await supabase.from("subscriptions" as any).select("id", { count: "exact", head: true }).eq("user_id", currentUser.id);
      setSubsCount(count || 0);

      const fiveDays = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
      const { data: lows } = await supabase.from("stock_items").select("id, item_name, predicted_next_date").eq("user_id", currentUser.id).eq("is_active", true).not("predicted_next_date", "is", null).lte("predicted_next_date", fiveDays).order("predicted_next_date", { ascending: true }).limit(5);
      setRunningLow(lows || []);
    })();
  }, [isReady]);

  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const tone = pct < 50 ? "ok" : pct <= 80 ? "warn" : "danger";
  const message = tone === "ok" ? t("ok_msg") : tone === "warn" ? t("warn_msg") : t("danger_msg");

  const hour = today.getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="app-shell pb-32">
      {/* ===== MOBILE HEADER ===== */}
      <header className="px-5 pt-10 pb-4 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{greeting},</p>
            <h1 className="text-xl font-bold truncate">{username || "Sobat"} 👋</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/notifications" aria-label="Notifications" className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition">
              <Bell className="h-5 w-5" />
            </Link>
            <AvatarMenu username={username} />
          </div>
        </div>
      </header>

      <main className="px-5 md:px-8 md:py-8 space-y-4 md:space-y-6 md:max-w-[1400px]">

        {/* ===== DESKTOP HERO ===== */}
        <div className="hidden md:block rounded-[24px] p-8 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1C0F0A 0%, #3A1A0E 60%, #5A2412 100%)" }}>
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(193,68,14,0.35) 0%, rgba(193,68,14,0) 70%)" }} />
          <div className="absolute right-20 bottom-[-40px] h-40 w-40 rounded-full border border-white/10" />
          <div className="flex items-start justify-between gap-6 relative">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Total Pengeluaran {today.toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase()}</p>
              <p className="font-display text-[44px] leading-none font-bold mt-3 text-gold">{formatRupiah(spent, budget?.currency || homeCurrency)}</p>
              <p className="text-[13px] text-white/65 mt-2">dari {monthCount} transaksi tercatat</p>
              {limit === 0 && (
                <Link to="/settings" className="inline-block mt-4 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:opacity-90 transition">Belum ada budget — atur sekarang</Link>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Budget terpakai</p>
              <p className="font-display text-2xl font-bold text-white mt-2">{limit > 0 ? `${Math.round(pct)}%` : "—"}</p>
              {limit > 0 && (
                <div className="mt-3 w-40 h-1.5 rounded-full bg-white/10 overflow-hidden ml-auto">
                  <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== DESKTOP STAT CARDS ===== */}
        <div className="hidden md:grid grid-cols-3 gap-5">
          <div className="premium-card p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary-soft))" }}>
              <DollarSign className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Terbesar</p>
              <p className="font-display text-lg font-bold mt-1 truncate">{topTx?.merchant_name || "—"}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{topTx ? `${formatRupiah(Number(topTx.total_amount), topTx.original_currency || homeCurrency)} • ${new Date(topTx.transaction_date!).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}` : "Belum ada"}</p>
            </div>
          </div>
          <div className="premium-card p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 bg-accent">
              <Monitor className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Transaksi</p>
              <p className="font-display text-2xl font-bold mt-1">{monthCount}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Bulan ini</p>
            </div>
          </div>
          <div className="premium-card p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary-soft))" }}>
              <Heart className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Langganan</p>
              <p className="font-display text-2xl font-bold mt-1">{subsCount}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{subsCount === 0 ? "Tidak ada tagihan" : "Aktif"}</p>
            </div>
          </div>
        </div>

        {/* ===== DESKTOP 2-COL ===== */}
        <div className="hidden md:grid grid-cols-2 gap-5">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-bold">Budget Kategori</p>
              <Link to="/settings" className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>+ Atur budget</Link>
            </div>
            <div className="mt-5 space-y-4">
              {catSpend.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-5 text-center">
                  <p className="text-sm text-muted-foreground">Belum ada budget — tap untuk mengatur</p>
                </div>
              ) : catSpend.map((c) => {
                const cat = getCategory(c.category);
                const ratio = limit > 0 ? Math.min(100, (c.total / limit) * 100) : 0;
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{cat.l}</span>
                      <span className="text-muted-foreground text-[12px]">{formatRupiah(c.total, homeCurrency)}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${ratio}%`, background: "hsl(var(--primary))" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="premium-card p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-bold">Transaksi Terbaru</p>
              <Link to="/transactions" className="text-xs font-semibold flex items-center gap-0.5" style={{ color: "hsl(var(--primary))" }}>Lihat semua <ChevronRight className="h-3 w-3" /></Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-5">Belum ada transaksi.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {recent.map((tx) => {
                  const cat = getCategory(tx.category);
                  const date = tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "";
                  return (
                    <li key={tx.id} className="flex items-center gap-3 py-3">
                      <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-base shrink-0", cat.color)}>{cat.e}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{tx.merchant_name || "Tanpa nama"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{cat.l}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-muted-foreground">{date}</p>
                        <p className="text-sm font-bold">{formatRupiah(Number(tx.total_amount), tx.original_currency || homeCurrency)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ===== MOBILE: DARK BUDGET CARD ===== */}
        <div
          className="md:hidden rounded-[20px] p-5 relative overflow-hidden"
          style={{ background: "#1C1A18" }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(193,68,14,0.25) 0%, transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-white/50 uppercase tracking-wider">Budget Bulan Ini</p>
              {limit > 0 && (
                <span className={cn("text-[11px] font-bold", tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-red-400")}>
                  {Math.round(pct)}% terpakai
                </span>
              )}
            </div>
            <p className="text-[28px] font-bold text-white leading-tight tracking-tight">
              {limit > 0 ? formatRupiah(displaySisa, budget?.currency || homeCurrency) : formatRupiah(0, homeCurrency)}
            </p>
            <p className="text-[12px] text-white/40 mt-0.5">
              {limit > 0
                ? `Terpakai ${formatRupiah(displaySpent, budget?.currency || homeCurrency)} dari ${formatRupiah(limit, budget?.currency || homeCurrency)}`
                : "Belum ada budget — atur di pengaturan"}
            </p>
            {limit > 0 && (
              <div className="mt-4 h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: tone === "ok" ? "#34d399" : tone === "warn" ? "#fbbf24" : "#f87171" }}
                />
              </div>
            )}
            <p className={cn("text-xs mt-2 font-medium", tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-red-400")}>
              {message}
            </p>
          </div>
        </div>

        {/* ===== MOBILE: QUICK ACTIONS ===== */}
        <div className="md:hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 px-1">
            {t("quick_actions")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Cek Stok */}
            <Link to="/stock">
              <Card className="p-4 hover:shadow-md transition active:scale-[0.98] h-full flex items-center gap-3 overflow-hidden">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-success-soft text-success shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold leading-tight truncate min-w-0">{t("check_stock")}</p>
              </Card>
            </Link>
            {/* Langganan */}
            <Link to="/subscriptions">
              <Card className="p-4 hover:shadow-md transition active:scale-[0.98] h-full flex items-center gap-3 overflow-hidden">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary-soft text-primary shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold leading-tight truncate min-w-0">{t("subscriptions")}</p>
              </Card>
            </Link>
          </div>
        </div>

        {/* ===== MOBILE: RUNNING LOW ===== */}
        {runningLow.length > 0 && (
          <div className="md:hidden">
            <p className="text-xs font-semibold text-warning uppercase tracking-wide mb-2.5 px-1">
              ⚠️ {t("running_low")}
            </p>
            <Card className="p-4 border-warning/30 bg-warning-soft/40">
              <p className="text-xs text-muted-foreground mb-2">{t("running_low_desc")}</p>
              <ul className="space-y-1.5">
                {runningLow.map((s) => (
                  <li key={s.id} className="flex justify-between text-sm">
                    <span className="font-medium">{s.item_name}</span>
                    {s.predicted_next_date && (
                      <span className="text-xs text-muted-foreground">{new Date(s.predicted_next_date).toLocaleDateString()}</span>
                    )}
                  </li>
                ))}
              </ul>
              <Link to="/stock" className="block mt-3 text-xs text-primary font-semibold">{t("see_all")} →</Link>
            </Card>
          </div>
        )}

        {/* ===== MOBILE: RECENT TRANSACTIONS ===== */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transaksi Terbaru</p>
            <Link to="/transactions" className="text-xs font-semibold text-primary flex items-center gap-0.5">
              Lihat semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <Card className="p-6 text-center border border-dashed">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
              <Link to="/transactions/new" className="inline-block mt-3 text-xs font-semibold text-primary">+ Catat sekarang</Link>
            </Card>
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {recent.map((tx) => {
                const cat = getCategory(tx.category);
                const date = tx.transaction_date
                  ? new Date(tx.transaction_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                  : "";
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3.5">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0", cat.color)}>
                      {cat.e}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{tx.merchant_name || "Tanpa nama"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", cat.color)}>{cat.l}</span>
                        <span className="text-[11px] text-muted-foreground">{date}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold shrink-0">
                      {formatRupiah(Number(tx.total_amount), tx.original_currency || homeCurrency)}
                    </p>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        {/* ===== MOBILE: AI REPORTS CTA ===== */}
        <div className="md:hidden">
          <Link to="/reports">
            <div
              className="rounded-[16px] p-4 flex items-center justify-between gap-3 active:scale-[0.98] transition-transform"
              style={{ background: "#1C1A18" }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary-soft))" }}>
                  <BarChart3Icon />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">AI Reports</p>
                  <p className="text-[11px] text-white/40">Tanya AI soal keuangan lo</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
            </div>
          </Link>
        </div>

      </main>

      <BottomNav />
    </div>
  );
};

const BarChart3Icon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export default Dashboard;
