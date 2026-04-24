import { useEffect, useState } from "react";
import { ArrowLeft, Bell, CreditCard, Users, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";

interface Notif {
  id: string;
  type: "sub" | "split" | "stock";
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
      const in7 = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      const in5 = new Date(today.getTime() + 5 * 86400000).toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);

      const [{ data: subs }, { data: splits }, { data: stocks }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id, service_name, next_billing_date, amount, currency")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .gte("next_billing_date", todayStr)
          .lte("next_billing_date", in7),
        supabase
          .from("split_settlements")
          .select("id, member_name, amount_owed, created_at, transaction_id, transactions!inner(user_id)")
          .eq("transactions.user_id", user.id)
          .eq("is_settled", false),
        supabase
          .from("stock_items")
          .select("id, item_name, predicted_next_date")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .not("predicted_next_date", "is", null)
          .lte("predicted_next_date", in5),
      ]);

      const list: Notif[] = [];
      (subs || []).forEach((s: any) => {
        const days = Math.ceil((new Date(s.next_billing_date).getTime() - today.getTime()) / 86400000);
        list.push({
          id: "sub-" + s.id,
          type: "sub",
          title: t("remind_sub", { name: s.service_name }),
          desc: `${formatRupiah(Number(s.amount), s.currency || "IDR")} · ${new Date(s.next_billing_date).toLocaleDateString()} (H-${Math.max(days, 0)})`,
          date: s.next_billing_date,
        });
      });
      (splits || []).forEach((s: any) =>
        list.push({
          id: "split-" + s.id,
          type: "split",
          title: t("remind_split", { name: s.member_name }),
          desc: formatRupiah(Number(s.amount_owed)),
          date: s.created_at,
        })
      );
      (stocks || []).forEach((s: any) =>
        list.push({
          id: "stock-" + s.id,
          type: "stock",
          title: s.item_name,
          desc: `Diprediksi habis ${new Date(s.predicted_next_date).toLocaleDateString()}`,
          date: s.predicted_next_date,
        })
      );
      list.sort((a, b) => (a.date < b.date ? -1 : 1));
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
                  {n.type === "sub" ? <CreditCard className="h-4 w-4" /> : n.type === "stock" ? <Package className="h-4 w-4" /> : <Users className="h-4 w-4" />}
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
