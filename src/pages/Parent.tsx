import { useEffect, useState } from "react";
import { ArrowLeft, Link2, Unlink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CATEGORIES, formatRupiah, getCategory, getInitials } from "@/lib/format";
import { toast } from "sonner";

const COLORS = ["#1E40AF", "#0891B2", "#16A34A", "#CA8A04", "#DC2626", "#9333EA", "#0EA5E9", "#F97316", "#65A30D", "#7C3AED", "#475569"];

const Parent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState<{ id: string; child_id: string } | null>(null);
  const [child, setChild] = useState<{ username: string | null; id: string } | null>(null);
  const [budget, setBudget] = useState(0);
  const [spent, setSpent] = useState(0);
  const [byCat, setByCat] = useState<{ label: string; emoji: string; amount: number }[]>([]);
  const [byMonth, setByMonth] = useState<{ label: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: pc } = await supabase
      .from("parent_child")
      .select("id,child_id,connected_at")
      .eq("parent_id", user.id)
      .not("connected_at", "is", null)
      .maybeSingle();
    if (!pc?.child_id) {
      setLink(null);
      setLoading(false);
      return;
    }
    setLink({ id: pc.id, child_id: pc.child_id });
    const childId = pc.child_id;
    const now = new Date();
    const m = now.getMonth() + 1, y = now.getFullYear();
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const monthsBack = new Date(y, m - 4, 1).toISOString().slice(0, 10);
    const [{ data: prof }, { data: bud }, { data: txMonth }, { data: txAll }] = await Promise.all([
      supabase.from("profiles").select("id,username").eq("id", childId).maybeSingle(),
      supabase.from("budgets").select("total_limit").eq("user_id", childId).eq("year", y).eq("month", m).maybeSingle(),
      supabase.from("transactions").select("total_amount,category").eq("user_id", childId).gte("transaction_date", start),
      supabase.from("transactions").select("total_amount,transaction_date").eq("user_id", childId).gte("transaction_date", monthsBack),
    ]);
    setChild(prof as any);
    setBudget(Number(bud?.total_limit || 0));
    const sp = (txMonth || []).reduce((s, t: any) => s + Number(t.total_amount), 0);
    setSpent(sp);
    const map = new Map<string, number>();
    (txMonth || []).forEach((t: any) => {
      const k = t.category || "lainnya";
      map.set(k, (map.get(k) || 0) + Number(t.total_amount));
    });
    setByCat(
      Array.from(map.entries())
        .map(([k, v]) => ({ label: getCategory(k).l, emoji: getCategory(k).e, amount: v }))
        .sort((a, b) => b.amount - a.amount)
    );
    // Group by month for bar chart
    const monthMap = new Map<string, number>();
    (txAll || []).forEach((t: any) => {
      const key = t.transaction_date.slice(0, 7);
      monthMap.set(key, (monthMap.get(key) || 0) + Number(t.total_amount));
    });
    const sorted = Array.from(monthMap.entries()).sort();
    setByMonth(sorted.slice(-3).map(([k, v]) => ({ label: k.slice(5), amount: v })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleLink = async () => {
    if (!user || !code.trim()) return;
    setLinking(true);
    const { data, error } = await supabase
      .from("parent_child")
      .select("id,expires_at,connected_at")
      .eq("invite_code", code.trim().toUpperCase())
      .maybeSingle();
    if (error || !data) {
      toast.error("Kode tidak ditemukan");
      setLinking(false);
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error("Kode sudah kadaluarsa");
      setLinking(false);
      return;
    }
    if (data.connected_at) {
      toast.error("Kode sudah dipakai");
      setLinking(false);
      return;
    }
    const { error: updErr } = await supabase
      .from("parent_child")
      .update({ parent_id: user.id, connected_at: new Date().toISOString() })
      .eq("id", data.id);
    setLinking(false);
    if (updErr) return toast.error("Gagal hubungkan");
    toast.success("Berhasil terhubung!");
    setCode("");
    load();
  };

  const handleDisconnect = async () => {
    if (!link) return;
    if (!confirm("Putuskan koneksi dengan anak?")) return;
    await supabase.from("parent_child").delete().eq("id", link.id);
    toast.success("Koneksi diputus");
    load();
  };

  const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;
  const barColor = pct < 50 ? "bg-success" : pct < 80 ? "bg-warning" : "bg-danger";

  return (
    <div className="app-shell pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="-ml-2 p-2"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Pantau Anak</h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : !link ? (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="text-center">
                <Link2 className="h-8 w-8 mx-auto text-primary mb-2" />
                <h2 className="font-semibold">Hubungkan ke Akun Anak</h2>
                <p className="text-xs text-muted-foreground mt-1">Minta anak generate kode di Pengaturan, lalu masukkan di sini.</p>
              </div>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Kode 6 karakter"
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
              />
              <Button className="w-full" disabled={linking || code.length !== 6} onClick={handleLink}>
                {linking ? "Menghubungkan..." : "Hubungkan"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar className="h-12 w-12 bg-primary text-primary-foreground">
                  <AvatarFallback>{getInitials(child?.username)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold">{child?.username || "Anak"}</div>
                  <div className="text-xs text-muted-foreground">Read-only · agregat saja</div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-danger"><Unlink className="h-4 w-4" /></Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="text-xs text-muted-foreground">Budget Bulan Ini</div>
                <div className="font-bold">{formatRupiah(spent)} <span className="text-muted-foreground font-normal">/ {formatRupiah(budget)}</span></div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </CardContent>
            </Card>

            {byMonth.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="font-semibold mb-2 text-sm">Pengeluaran 3 Bulan Terakhir</div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byMonth}>
                        <XAxis dataKey="label" fontSize={10} />
                        <Tooltip formatter={(v: number) => formatRupiah(v)} />
                        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {byCat.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="font-semibold mb-2 text-sm">Per Kategori</div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byCat} dataKey="amount" nameKey="label" innerRadius={40} outerRadius={70}>
                          {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Parent;
