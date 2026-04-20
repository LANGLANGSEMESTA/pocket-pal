import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, formatRupiah, getCategory } from "@/lib/format";

type Tx = { total_amount: number; category: string | null; transaction_date: string };

const COLORS = ["#1E40AF", "#0891B2", "#16A34A", "#CA8A04", "#DC2626", "#9333EA", "#0EA5E9", "#F97316", "#65A30D", "#7C3AED", "#475569"];

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [budget, setBudget] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  });
  const [msg, setMsg] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const start = `${cursor.y}-${String(cursor.m).padStart(2, "0")}-01`;
    const endDate = new Date(cursor.y, cursor.m, 0);
    const end = `${cursor.y}-${String(cursor.m).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    const [{ data: t }, { data: b }] = await Promise.all([
      supabase
        .from("transactions")
        .select("total_amount,category,transaction_date")
        .eq("user_id", user.id)
        .gte("transaction_date", start)
        .lte("transaction_date", end),
      supabase
        .from("budgets")
        .select("total_limit")
        .eq("user_id", user.id)
        .eq("year", cursor.y)
        .eq("month", cursor.m)
        .maybeSingle(),
    ]);
    setTxs((t || []) as Tx[]);
    setBudget(Number(b?.total_limit || 0));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user, cursor]);

  const total = useMemo(() => txs.reduce((s, t) => s + Number(t.total_amount), 0), [txs]);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    txs.forEach((t) => {
      const k = t.category || "lainnya";
      map.set(k, (map.get(k) || 0) + Number(t.total_amount));
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ category: k, amount: v, label: getCategory(k).l, emoji: getCategory(k).e }))
      .sort((a, b) => b.amount - a.amount);
  }, [txs]);

  const topCategory = byCategory[0];
  const sisa = budget - total;

  const buildReportMsg = () => {
    const lines = byCategory.slice(0, 6).map((c) => {
      const pct = total ? Math.round((c.amount / total) * 100) : 0;
      return `${c.emoji} ${c.label}: ${formatRupiah(c.amount)} (${pct}%)`;
    });
    return `Halo Ayah/Bunda! 👋\nIni laporan keuanganku bulan ${monthNames[cursor.m - 1]} ${cursor.y}:\n\n💰 Total pengeluaran: ${formatRupiah(total)}\n\n📊 Rincian:\n${lines.join("\n")}\n\n💚 Sisa budget: ${formatRupiah(Math.max(0, sisa))} dari ${formatRupiah(budget)}\n\nDikirim dari Student Pocket Assistant ✨`;
  };

  useEffect(() => {
    setMsg(buildReportMsg());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byCategory, total, budget, cursor]);

  const sendWA = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const prevMonth = () => setCursor((c) => (c.m === 1 ? { y: c.y - 1, m: 12 } : { y: c.y, m: c.m - 1 }));
  const nextMonth = () => setCursor((c) => (c.m === 12 ? { y: c.y + 1, m: 1 } : { y: c.y, m: c.m + 1 }));

  return (
    <div className="app-shell pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="-ml-2 p-2"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Laporan</h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Month selector */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2">
          <Button size="icon" variant="ghost" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="font-semibold">{monthNames[cursor.m - 1]} {cursor.y}</div>
          <Button size="icon" variant="ghost" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Total Pengeluaran" value={formatRupiah(total)} />
          <SummaryCard label="Sisa Budget" value={formatRupiah(Math.max(0, sisa))} accent={sisa < 0 ? "danger" : "success"} />
          <SummaryCard label="Jumlah Transaksi" value={String(txs.length)} />
          <SummaryCard label="Kategori Teratas" value={topCategory ? `${topCategory.emoji} ${topCategory.label}` : "-"} />
        </div>

        {/* Donut */}
        {loading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : byCategory.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Belum ada transaksi bulan ini.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="font-semibold mb-2">Per Kategori</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="amount" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {byCategory.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 mt-2">
                {byCategory.map((c, i) => {
                  const pct = total ? (c.amount / total) * 100 : 0;
                  return (
                    <li key={c.category}>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="flex-1 truncate">{c.emoji} {c.label}</span>
                        <span className="font-semibold">{formatRupiah(c.amount)}</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Laporan Damai */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <div className="font-semibold">Kirim Laporan ke Orang Tua 💌</div>
              <p className="text-xs text-muted-foreground">Kamu bisa edit pesan sebelum kirim</p>
            </div>
            <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={10} className="text-xs font-mono" />
            <Button onClick={sendWA} className="w-full"><Send className="h-4 w-4 mr-2" /> Kirim via WhatsApp</Button>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

const SummaryCard = ({ label, value, accent }: { label: string; value: string; accent?: "success" | "danger" }) => (
  <Card>
    <CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-bold mt-0.5 ${accent === "danger" ? "text-danger" : accent === "success" ? "text-success" : ""}`}>{value}</div>
    </CardContent>
  </Card>
);

export default Reports;
