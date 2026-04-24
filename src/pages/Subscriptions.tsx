import { useEffect, useState } from "react";
import { ArrowLeft, Plus, CreditCard, Users, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/format";
import { buildWaMessage, openWa } from "@/lib/i18n/waMessages";
import { getPaymentInfo } from "@/lib/payment";
import { toast } from "sonner";

interface Sub {
  id: string;
  service_name: string;
  amount: number;
  currency: string | null;
  billing_cycle: string;
  next_billing_date: string;
  is_shared: boolean | null;
  notes: string | null;
}

interface Member {
  id: string;
  subscription_id: string;
  member_name: string;
  member_phone: string | null;
  share_amount: number;
  is_paid: boolean | null;
}

const Subscriptions = () => {
  const { user } = useAuth();
  const { t, lang, vibe } = useI18n();
  const navigate = useNavigate();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    service_name: "",
    amount: "",
    billing_cycle: "monthly",
    next_billing_date: new Date().toISOString().slice(0, 10),
    is_shared: false,
    members: [{ name: "", phone: "" }],
  });

  const load = async () => {
    if (!user) return;
    const { data: s } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("next_billing_date", { ascending: true });
    setSubs((s as Sub[]) || []);
    const ids = (s || []).map((x: any) => x.id);
    if (ids.length) {
      const { data: m } = await supabase
        .from("subscription_members")
        .select("*")
        .in("subscription_id", ids);
      const grouped: Record<string, Member[]> = {};
      (m || []).forEach((row: any) => {
        (grouped[row.subscription_id] = grouped[row.subscription_id] || []).push(row);
      });
      setMembers(grouped);
    }
  };

  useEffect(() => { load(); }, [user]);

  const addMemberRow = () =>
    setForm((f) => ({ ...f, members: [...f.members, { name: "", phone: "" }] }));

  const handleSave = async () => {
    if (!user || !form.service_name || !form.amount) {
      return toast.error(t("error_generic"));
    }
    const amount = Number(form.amount);
    const validMembers = form.is_shared ? form.members.filter((m) => m.name.trim()) : [];
    const totalParticipants = (form.is_shared ? validMembers.length : 0) + 1; // include owner
    const share = form.is_shared && totalParticipants > 0 ? amount / totalParticipants : amount;

    const { data: ins, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        service_name: form.service_name,
        amount,
        billing_cycle: form.billing_cycle,
        next_billing_date: form.next_billing_date,
        is_shared: form.is_shared,
      })
      .select()
      .single();
    if (error || !ins) return toast.error(t("error_generic"));

    if (form.is_shared && validMembers.length) {
      await supabase.from("subscription_members").insert(
        validMembers.map((m) => ({
          subscription_id: ins.id,
          member_name: m.name,
          member_phone: m.phone || null,
          share_amount: share,
        }))
      );
    }
    toast.success(t("saved"));
    setOpen(false);
    setForm({
      service_name: "", amount: "", billing_cycle: "monthly",
      next_billing_date: new Date().toISOString().slice(0, 10),
      is_shared: false, members: [{ name: "", phone: "" }],
    });
    load();
  };

  const handleNudge = (sub: Sub, m: Member) => {
    const pay = getPaymentInfo();
    const payBlock = pay
      ? `${pay.bank}\n${pay.accountNumber}\na.n. ${pay.accountName}`
      : "";
    const msg = buildWaMessage(lang, vibe, {
      name: m.member_name,
      service: sub.service_name,
      amount: m.share_amount,
      currency: sub.currency || "IDR",
      paymentBlock: payBlock,
    });
    openWa(m.member_phone || undefined, msg);
  };

  const togglePaid = async (m: Member) => {
    await supabase
      .from("subscription_members")
      .update({ is_paid: !m.is_paid, paid_at: !m.is_paid ? new Date().toISOString() : null })
      .eq("id", m.id);
    load();
  };

  const deleteSub = async (id: string) => {
    await supabase.from("subscriptions").update({ is_active: false }).eq("id", id);
    load();
  };

  return (
    <div className="app-shell pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="-ml-2 p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold flex-1">{t("subscriptions")}</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> {t("sub_add")}
        </Button>
      </header>

      <main className="px-4 py-4 space-y-3">
        {subs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
              {t("no_subs")}
            </CardContent>
          </Card>
        ) : (
          subs.map((s) => {
            const ms = members[s.id] || [];
            return (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold">{s.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("sub_next_date")}: {new Date(s.next_billing_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatRupiah(s.amount, s.currency || "IDR")}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.billing_cycle === "monthly" ? t("sub_monthly") : t("sub_yearly")}
                      </p>
                    </div>
                  </div>

                  {s.is_shared && ms.length > 0 && (
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {t("sub_members")} · {formatRupiah(ms[0].share_amount, s.currency || "IDR")} {t("sub_per_person")}
                      </div>
                      {ms.map((m) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.member_name}</p>
                            {m.is_paid && <p className="text-[10px] text-success">✓ {t("mark_paid")}</p>}
                          </div>
                          {!m.is_paid && (
                            <Button size="sm" variant="outline" onClick={() => handleNudge(s, m)}>
                              {t("tagih_via_wa")}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => togglePaid(m)}>
                            {m.is_paid ? "↺" : "✓"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => deleteSub(s.id)} className="text-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("sub_add")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("sub_name")}</Label>
              <Input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} placeholder="Netflix, Spotify..." />
            </div>
            <div>
              <Label>{t("sub_amount")}</Label>
              <Input inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div>
              <Label>{t("sub_next_date")}</Label>
              <Input type="date" value={form.next_billing_date} onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/40">
              <Label className="m-0">{t("sub_shared")}</Label>
              <Switch checked={form.is_shared} onCheckedChange={(v) => setForm({ ...form, is_shared: v })} />
            </div>
            {form.is_shared && (
              <div className="space-y-2 border-t pt-3">
                <Label>{t("sub_members")}</Label>
                {form.members.map((m, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Input placeholder="Nama" value={m.name} onChange={(e) => {
                      const next = [...form.members]; next[i] = { ...m, name: e.target.value }; setForm({ ...form, members: next });
                    }} />
                    <Input placeholder="WA (08xx)" value={m.phone} onChange={(e) => {
                      const next = [...form.members]; next[i] = { ...m, phone: e.target.value }; setForm({ ...form, members: next });
                    }} />
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addMemberRow}>+ Anggota</Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Subscriptions;
