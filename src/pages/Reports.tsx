import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Send, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, formatRupiah, getCategory } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tx = { total_amount: number; category: string | null; transaction_date: string };

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

const COLORS = ["#C1440E", "#0891B2", "#16A34A", "#CA8A04", "#9333EA", "#0EA5E9", "#F97316", "#65A30D", "#7C3AED", "#475569", "#DC2626"];

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ─── AI Reports Chat Panel ──────────────────────────────────────────────────

interface AiReportsPanelProps {
  txs: Tx[];
  total: number;
  budget: number;
  cursor: { y: number; m: number };
  homeCurrency: string;
}

const SUGGESTION_CHIPS = [
  "Pengeluaran terbesar bulan ini apa?",
  "Gimana cara hemat bulan depan?",
  "Apakah saya boros di F&B?",
  "Berikan ringkasan keuangan saya",
];

const AiReportsPanel = ({ txs, total, budget, cursor, homeCurrency }: AiReportsPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = () => {
    const byCategory: Record<string, number> = {};
    txs.forEach((t) => {
      const k = t.category || "lainnya";
      byCategory[k] = (byCategory[k] || 0) + Number(t.total_amount);
    });
    const catLines = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `- ${getCategory(k).l}: ${formatRupiah(v, homeCurrency)}`)
      .join("\n");
    return `Data keuangan pengguna bulan ${monthNames[cursor.m - 1]} ${cursor.y}:\nTotal pengeluaran: ${formatRupiah(total, homeCurrency)}\nBudget: ${formatRupiah(budget, homeCurrency)}\nSisa: ${formatRupiah(Math.max(0, budget - total), homeCurrency)}\nJumlah transaksi: ${txs.length}\n\nPer kategori:\n${catLines || "Belum ada data"}`;
  };

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are an AI financial advisor inside a budget tracker app called Pocket Pal. 
Answer in the same language the user uses — if they write in Indonesian, reply in Indonesian; if English, reply in English.
Keep answers short (max 4-5 sentences), friendly, and use concrete numbers from this data:

${buildContext()}

Do not mention that you are Claude or made by Anthropic.`,
    messages: history,
  }),
});

      const data = await res.json();
      const reply = data.content?.[0]?.text || "Maaf, coba lagi ya!";
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Koneksi bermasalah. Coba lagi ya!" }]);
    }

    setLoading(false);
  };

  return (
    <Card className="overflow-hidden border-0" style={{ background: "#1C1A18" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary-soft))" }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">AI Reports</p>
          <p className="text-[10px] text-white/40 mt-0.5">Beta</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-col gap-3 px-4 py-3 min-h-[220px] max-h-[320px] overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <p className="text-xs text-white/40 text-center">Tanya soal keuangan lo bulan ini</p>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="text-left text-xs px-3 py-2 rounded-xl border transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "ai" && (
              <div className="flex items-start gap-2 max-w-[88%]">
                <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "hsl(var(--primary-soft))" }}>
                  <Sparkles className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-3 py-2.5 text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}>
                  {msg.text}
                </div>
              </div>
            )}
            {msg.role === "user" && (
              <div className="rounded-2xl rounded-tr-sm px-3 py-2.5 text-xs leading-relaxed max-w-[80%]" style={{ background: "hsl(var(--primary))", color: "#fff" }}>
                {msg.text}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary-soft))" }}>
              <Sparkles className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-3 py-2.5" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.4)",
                      animation: `bounce 1s infinite ${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Tanya sesuatu..."
          className="flex-1 bg-transparent text-xs text-white placeholder-white/30 outline-none min-w-0"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity"
          style={{ background: "hsl(var(--primary))" }}
          aria-label="Kirim"
        >
          <Send className="h-3.5 w-3.5 text-white" />
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </Card>
  );
};

// ─── Main Reports Page ───────────────────────────────────────────────────────

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [budget, setBudget] = useState<number>(0);
  const [homeCurrency, setHomeCurrency] = useState("IDR");
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
    const [{ data: t }, { data: b }, { data: profile }] = await Promise.all([
      supabase.from("transactions").select("total_amount,category,transaction_date").eq("user_id", user.id).gte("transaction_date", start).lte("transaction_date", end),
      supabase.from("budgets").select("total_limit").eq("user_id", user.id).eq("year", cursor.y).eq("month", cursor.m).maybeSingle(),
      supabase.from("profiles").select("home_currency").eq("id", user.id).maybeSingle(),
    ]);
    setTxs((t || []) as Tx[]);
    setBudget(Number(b?.total_limit || 0));
    setHomeCurrency(profile?.home_currency || "IDR");
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, cursor]);

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
    return `Halo Ayah/Bunda! 👋\nIni laporan keuanganku bulan ${monthNames[cursor.m - 1]} ${cursor.y}:\n\n💰 Total pengeluaran: ${formatRupiah(total)}\n\n📊 Rincian:\n${lines.join("\n")}\n\n💚 Sisa budget: ${formatRupiah(Math.max(0, sisa))} dari ${formatRupiah(budget)}\n\nDikirim dari Pocket Pal ✨`;
  };

  useEffect(() => {
    setMsg(buildReportMsg());
  }, [byCategory, total, budget, cursor]);

  const sendWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  const prevMonth = () => setCursor((c) => (c.m === 1 ? { y: c.y - 1, m: 12 } : { y: c.y, m: c.m - 1 }));
  const nextMonth = () => setCursor((c) => (c.m === 12 ? { y: c.y + 1, m: 1 } : { y: c.y, m: c.m + 1 }));

  return (
    <div className="app-shell pb-32">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="-ml-2 p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
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
          <SummaryCard label="Total Pengeluaran" value={formatRupiah(total, homeCurrency)} />
          <SummaryCard label="Sisa Budget" value={formatRupiah(Math.max(0, sisa), homeCurrency)} accent={sisa < 0 ? "danger" : "success"} />
          <SummaryCard label="Jumlah Transaksi" value={String(txs.length)} />
          <SummaryCard label="Kategori Teratas" value={topCategory ? `${topCategory.emoji} ${topCategory.label}` : "-"} />
        </div>

        {/* AI Reports */}
        <AiReportsPanel
          txs={txs}
          total={total}
          budget={budget}
          cursor={cursor}
          homeCurrency={homeCurrency}
        />

        {/* Donut chart */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : byCategory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">Belum ada transaksi bulan ini.</CardContent>
          </Card>
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
                        <span className="font-semibold">{formatRupiah(c.amount, homeCurrency)}</span>
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

        {/* Kirim ke ortu */}
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
      <div className={cn("text-base font-bold mt-0.5", accent === "danger" ? "text-danger" : accent === "success" ? "text-success" : "")}>
        {value}
      </div>
    </CardContent>
  </Card>
);

export default Reports;
