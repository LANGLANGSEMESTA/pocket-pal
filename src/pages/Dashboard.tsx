import { BottomNav } from "@/components/BottomNav";
import { useAuthReady } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Package, ChevronRight, Bell } from "lucide-react";
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

const Dashboard = () => {
  const { isReady } = useAuthReady();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [homeCurrency, setHomeCurrency] = useState("IDR");
  const [budget, setBudget] = useState<Budget | null>(null);
  const [spent, setSpent] = useState(0);
  const [recent, setRecent] = useState<Tx[]>([]);
  const [runningLow, setRunningLow] = useState<{ id: string; item_name: string; predicted_next_date: string | null }[]>([]);

  const today = useMemo(() => new Date(), []);
  const dateLabel = today.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

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
        supabase
          .from("budgets")
          .select("total_limit, currency")
          .eq("user_id", currentUser.id)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("id, merchant_name, total_amount, category, transaction_date, original_currency")
          .eq("user_id", currentUser.id)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setUsername(profile?.username || "");
      setHomeCurrency(profile?.home_currency || "IDR");
      setBudget(bud);
      setRecent((txs as Tx[]) || []);

      const { data: sumRows } = await supabase
        .from("transactions")
        .select("total_amount")
        .eq("user_id", currentUser.id)
        .gte("transaction_date", startOfMonth);
      const total = (sumRows || []).reduce((s, r: any) => s + Number(r.total_amount || 0), 0);
      setSpent(total);

      // Running low: stock items predicted to run out within 5 days
      const fiveDays = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
      const { data: lows } = await supabase
        .from("stock_items")
        .select("id, item_name, predicted_next_date")
        .eq("user_id", currentUser.id)
        .eq("is_active", true)
        .not("predicted_next_date", "is", null)
        .lte("predicted_next_date", fiveDays)
        .order("predicted_next_date", { ascending: true })
        .limit(5);
      setRunningLow(lows || []);
    })();
  }, [isReady]);

  const limit = budget?.total_limit || 0;
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const tone = pct < 50 ? "ok" : pct <= 80 ? "warn" : "danger";
  const toneBar =
    tone === "ok" ? "bg-success" : tone === "warn" ? "bg-warning" : "bg-danger";
  const toneText =
    tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : "text-danger";
  const message =
    tone === "ok" ? t("ok_msg") : tone === "warn" ? t("warn_msg") : t("danger_msg");

  return (
    <div className="app-shell pb-28">
      <header className="px-5 pt-10 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{t("greeting")} {username || "Sobat"}! 👋</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition"
            >
              <Bell className="h-5 w-5" />
            </Link>
            <AvatarMenu username={username} />
          </div>
        </div>
      </header>

      <main className="px-5 space-y-5">
        {/* Budget */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Budget Bulan Ini</p>
            {limit > 0 && (
              <span className={cn("text-xs font-bold", toneText)}>{Math.round(pct)}%</span>
            )}
          </div>

          {limit > 0 ? (
            <>
              <div className="mt-3 h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", toneBar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-sm mt-3">
                <span className="font-bold">{formatRupiah(spent, budget?.currency || homeCurrency)}</span>
                <span className="text-muted-foreground"> dari {formatRupiah(limit, budget?.currency || homeCurrency)} terpakai</span>
              </p>
              <p className={cn("text-xs mt-2 font-medium", toneText)}>{message}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              Belum ada budget bulan ini. Atur di pengaturan ya!
            </p>
          )}
        </Card>

        {/* Quick Actions — only Cek Stok */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 px-1">
            {t("quick_actions")}
          </p>
          <Link to="/stock">
            <Card className="p-4 hover:shadow-md transition active:scale-[0.98] flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-success-soft text-success">
                <Package className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold flex-1">{t("check_stock")}</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </Link>
        </div>

        {/* Recent */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Transaksi Terbaru
            </p>
            <Link to="/transactions" className="text-xs font-semibold text-primary flex items-center gap-0.5">
              Lihat semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada transaksi. Yuk catat yang pertama! 🎉
              </p>
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
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", cat.color)}>
                          {cat.l}
                        </span>
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
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
