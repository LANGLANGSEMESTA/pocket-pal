import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CATEGORIES, formatRupiah, getCategory } from "@/lib/format";
import { relativeDateID } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tx = {
  id: string;
  merchant_name: string | null;
  total_amount: number;
  category: string | null;
  payment_method: string | null;
  notes: string | null;
  transaction_date: string;
  is_itemized: boolean | null;
  source: string | null;
};

const Transactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("id,merchant_name,total_amount,category,payment_method,notes,transaction_date,is_itemized")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });
    setTxs((data || []) as Tx[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (search && !(t.merchant_name || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [txs, search, cat]);

  const handleDelete = async () => {
    if (!toDelete) return;
    const id = toDelete;
    setToDelete(null);
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus transaksi");
      return;
    }
    setTxs((p) => p.filter((t) => t.id !== id));
    toast.success("Transaksi dihapus");
  };

  return (
    <div className="app-shell pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold mb-3">Transaksi</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari merchant..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto mt-3 -mx-4 px-4 pb-1 scrollbar-none">
          <Chip active={cat === "all"} onClick={() => setCat("all")} label="Semua" emoji="🗂️" />
          {CATEGORIES.map((c) => (
            <Chip key={c.v} active={cat === c.v} onClick={() => setCat(c.v)} label={c.l} emoji={c.e} />
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">📭</div>
            <p>Belum ada transaksi tercatat.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((t) => {
              const c = getCategory(t.category);
              const open = expanded === t.id;
              return (
                <li key={t.id} className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpanded(open ? null : t.id)}
                    className="w-full text-left p-3 flex items-center gap-3 active:bg-muted/40 transition-colors"
                  >
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-lg shrink-0", c.color)}>
                      {c.e}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{t.merchant_name || "Tanpa nama"}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{c.l}</Badge>
                        <span className="text-xs text-muted-foreground">{relativeDateID(t.transaction_date)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-danger">-{formatRupiah(Number(t.total_amount))}</div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground ml-auto transition-transform", open && "rotate-180")} />
                    </div>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/30 text-sm space-y-1">
                      {t.payment_method && (
                        <div><span className="text-muted-foreground">Metode:</span> {t.payment_method}</div>
                      )}
                      {t.notes && (
                        <div><span className="text-muted-foreground">Catatan:</span> {t.notes}</div>
                      )}
                      {t.is_itemized && (
                        <Badge variant="outline" className="text-[10px]">Itemized</Badge>
                      )}
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger hover:text-danger hover:bg-danger-soft"
                          onClick={() => setToDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Hapus
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <button
        onClick={() => navigate("/transactions/new")}
        aria-label="Tambah transaksi"
        className="fixed bottom-24 right-4 z-30 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 flex items-center justify-center active:scale-95"
      >
        <Plus className="h-5 w-5" />
      </button>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi ini?</AlertDialogTitle>
            <AlertDialogDescription>Aksi ini tidak bisa dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-danger text-danger-foreground hover:bg-danger/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

const Chip = ({ active, onClick, label, emoji }: { active: boolean; onClick: () => void; label: string; emoji: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-foreground border-border hover:bg-muted"
    )}
  >
    <span className="mr-1">{emoji}</span>
    {label}
  </button>
);

export default Transactions;
