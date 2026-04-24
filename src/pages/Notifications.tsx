import { useEffect, useState } from "react";
import { ArrowLeft, Bell, CreditCard, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Card, CardContent } from "@/components/ui/card";

interface Notif {
  id: string;
  type: "sub" | "split";
  title: string;
  desc: string;
  date: string;
}

const Notifications = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date();
      const in3 = new Date(today.getTime() + 3 * 86400000).toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);

      const [{ data: subs }, { data: splits }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id, service_name, next_billing_date")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .gte("next_billing_date", todayStr)
          .lte("next_billing_date", in3),
        supabase
          .from("split_settlements")
          .select("id, member_name, amount_owed, created_at, transaction_id, transactions!inner(user_id)")
          .eq("transactions.user_id", user.id)
          .eq("is_settled", false),
      ]);

      const list: Notif[] = [];
      (subs || []).forEach((s: any) =>
        list.push({
          id: "sub-" + s.id,
          type: "sub",
          title: t("remind_sub", { name: s.service_name }),
          desc: new Date(s.next_billing_date).toLocaleDateString(),
          date: s.next_billing_date,
        })
      );
      (splits || []).forEach((s: any) =>
        list.push({
          id: "split-" + s.id,
          type: "split",
          title: t("remind_split", { name: s.member_name }),
          desc: `Rp ${Number(s.amount_owed).toLocaleString("id-ID")}`,
          date: s.created_at,
        })
      );
      setItems(list);
    })();
  }, [user, t]);

  return (
    <div className="app-shell pb-10">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="-ml-2 p-2"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">{t("notifications")}</h1>
      </header>
      <main className="px-4 py-4 space-y-2">
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
              {t("no_notifications")}
            </CardContent>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  {n.type === "sub" ? <CreditCard className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default Notifications;
