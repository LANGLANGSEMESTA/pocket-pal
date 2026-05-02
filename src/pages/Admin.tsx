import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Search, Sparkles, Calendar, X, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth"; // Gunakan useAuth langsung
import { formatRupiah } from "@/lib/format";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  username: string | null;
  username_handle: string | null;
  email: string | null;
  scan_count: number;
  created_at: string;
  plan?: string;
  expires_at?: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // Ambil user dari auth
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifying, setVerifying] = useState(true);
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, pro: 0, mrr: 0 });
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editPlan, setEditPlan] = useState<"free" | "pro">("free");
  const [editCycle, setEditCycle] = useState<"monthly" | "yearly">("monthly");
  const [editExpires, setEditExpires] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [tab, setTab] = useState<"users" | "payments">("users");

  const load = async () => {
    const [{ data: profs }, { data: subs }, { data: pays }] = await Promise.all([
      supabase.from("profiles").select("id, username, username_handle, email, scan_count, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_subscriptions" as any).select("user_id, plan, expires_at, billing_cycle"),
      supabase.from("payments" as any).select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const subMap = new Map<string, any>();
    (subs as any[] || []).forEach((s) => subMap.set(s.user_id, s));
    const merged = (profs || []).map((p: any) => ({
      ...p,
      plan: subMap.get(p.id)?.plan || "free",
      expires_at: subMap.get(p.id)?.expires_at,
    }));
    setUsers(merged);
    setPayments((pays as any[]) || []);

    const proCount = merged.filter((u) => u.plan === "pro").length;
    const mrr = (subs as any[] || []).filter((s) => s.plan === "pro").reduce((sum, s) => {
      if (s.billing_cycle === "yearly") return sum + 150000 / 12;
      return sum + 15000;
    }, 0);
    setStats({ total: merged.length, pro: proCount, mrr });
  };

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setVerifying(false);
        return;
      }
      
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.role === 'admin') {
        setIsAdmin(true);
        load();
      }
      setVerifying(false);
    };

    if (!authLoading) checkAccess();
  }, [user, authLoading]);

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setEditPlan((u.plan as any) || "free");
    setEditCycle("monthly");
    setEditExpires(u.expires_at ? new Date(u.expires_at).toISOString().slice(0, 10) : "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const expiresIso = editExpires ? new Date(editExpires + "T23:59:59").toISOString() : null;
    const { error } = await supabase
      .from("user_subscriptions" as any)
      .upsert(
        { user_id: editing.id, plan: editPlan, billing_cycle: editPlan === "pro" ? editCycle : null, expires_at: expiresIso },
        { onConflict: "user_id" }
      );
    if (error) return toast.error("Gagal menyimpan: " + error.message);
    toast.success("Tersimpan");
    setEditing(null);
    load();
  };

  const extend = async (u: AdminUser, days: number) => {
    const base = u.expires_at && new Date(u.expires_at) > new Date() ? new Date(u.expires_at) : new Date();
    base.setDate(base.getDate() + days);
    await supabase
      .from("user_subscriptions" as any)
      .upsert({ user_id: u.id, plan: "pro", expires_at: base.toISOString() }, { onConflict: "user_id" });
    toast.success(`+${days} hari diperpanjang`);
    load();
  };

  if (authLoading || verifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center text-center px-4">
        <ShieldCheck className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground mb-6 max-w-xs">Akun {user?.email} tidak terdaftar sebagai Super Admin.</p>
        <Button onClick={() => navigate("/dashboard")}>Kembali ke Beranda</Button>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.username_handle?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
  });

  return (
    <div className="pb-12">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="-ml-2 p-2"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold flex items-center gap-1.5 text-orange-600"><Shield className="h-5 w-5" /> Admin Panel</h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total user</div><div className="font-bold text-lg">{stats.total}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Pengguna Pro</div><div className="font-bold text-lg text-primary">{stats.pro}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">MRR estimasi</div><div className="font-bold text-sm">{formatRupiah(stats.mrr)}</div></CardContent></Card>
        </div>

        <div className="flex gap-2 border-b border-border">
          {(["users", "payments"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
            >
              {k === "users" ? "Pengguna" : "Pembayaran"}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari username atau email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="space-y-2">
              {filtered.map((u) => (
                <Card key={u.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate">@{u.username_handle || "—"}</div>
                        {u.plan === "pro" ? (
                          <Badge className="bg-primary text-primary-foreground"><Sparkles className="h-2.5 w-2.5 mr-0.5" /> PRO</Badge>
                        ) : (
                          <Badge variant="outline">FREE</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      {u.expires_at && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" /> Aktif sampai {new Date(u.expires_at).toLocaleDateString("id-ID")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Edit</Button>
                      {u.plan === "pro" && (
                        <Button size="sm" variant="ghost" onClick={() => extend(u, 30)}>+30 hari</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {tab === "payments" && (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs truncate">{p.order_id}</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("id-ID")}</div>
                      <div className="text-xs text-muted-foreground">{p.billing_cycle} · {p.payment_type || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatRupiah(Number(p.amount))}</div>
                      <Badge className={p.status === "settlement" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit @{editing?.username_handle}</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold">Plan</label>
              <Select value={editPlan} onValueChange={(v) => setEditPlan(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editPlan === "pro" && (
              <>
                <div>
                  <label className="text-xs font-semibold">Billing cycle</label>
                  <Select value={editCycle} onValueChange={(v) => setEditCycle(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                      <SelectItem value="yearly">Tahunan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold">Expires at</label>
                  <Input type="date" value={editExpires} onChange={(e) => setEditExpires(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={saveEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
