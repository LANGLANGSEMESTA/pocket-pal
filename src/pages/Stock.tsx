import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Package, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Item = {
  id: string;
  item_name: string;
  avg_consumption_days: number | null;
  last_purchase_date: string | null;
  predicted_next_date: string | null;
  is_active: boolean | null;
};

const Stock = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lastDate, setLastDate] = useState(new Date().toISOString().slice(0, 10));
  const [estDays, setEstDays] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("stock_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("predicted_next_date", { ascending: true, nullsFirst: false });
    setItems((data || []) as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const daysRemaining = (it: Item) => {
    if (!it.predicted_next_date) return null;
    const d = new Date(it.predicted_next_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleBought = async (it: Item) => {
    const today = new Date().toISOString().slice(0, 10);
    const next = it.avg_consumption_days
      ? new Date(Date.now() + it.avg_consumption_days * 86400000).toISOString().slice(0, 10)
      : null;
    const { error } = await supabase
      .from("stock_items")
      .update({ last_purchase_date: today, predicted_next_date: next })
      .eq("id", it.id);
    if (error) return toast.error("Gagal update");
    toast.success(`${it.item_name} ditandai dibeli ✓`);
    load();
  };

  const handleAdd = async () => {
    if (!user || !name.trim()) return;
    const days = estDays ? Number(estDays) : null;
    const next = days ? new Date(new Date(lastDate).getTime() + days * 86400000).toISOString().slice(0, 10) : null;
    const { error } = await supabase.from("stock_items").insert({
      user_id: user.id,
      item_name: name.trim(),
      last_purchase_date: lastDate,
      avg_consumption_days: days,
      predicted_next_date: next,
    });
    if (error) return toast.error("Gagal menambahkan");
    toast.success("Stok ditambahkan!");
    setOpen(false);
    setName("");
    setEstDays("");
    load();
  };

  return (
    <div className="app-shell pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="-ml-2 p-2"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold flex-1">Stok Barang</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Tambah stok</SheetTitle>
              <SheetDescription>Lacak kapan barang biasanya habis</SheetDescription>
            </SheetHeader>
            <div className="space-y-3 py-4">
              <div>
                <Label>Nama barang</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sabun mandi" />
              </div>
              <div>
                <Label>Tanggal beli terakhir</Label>
                <Input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
              </div>
              <div>
                <Label>Estimasi habis dalam (hari) — opsional</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={estDays}
                  onChange={(e) => setEstDays(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
            <SheetFooter>
              <Button onClick={handleAdd} className="w-full">Tambah</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </header>

      <main className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Belum ada stok yang dilacak.</p>
            <p className="text-xs">Tambah sekarang? 📦</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => {
              const days = daysRemaining(it);
              const badgeClass =
                days === null
                  ? "bg-muted text-muted-foreground"
                  : days <= 3
                  ? "bg-danger-soft text-danger"
                  : days <= 7
                  ? "bg-warning-soft text-warning"
                  : "bg-success-soft text-success";
              const badgeText = days === null ? "Belum cukup data" : days <= 0 ? "Habis hari ini" : `${days} hari lagi`;
              return (
                <Card key={it.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">{it.item_name}</div>
                      <Badge className={cn("text-[10px]", badgeClass)}>{badgeText}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Terakhir beli: {it.last_purchase_date || "-"}</div>
                      <div>Prediksi habis: {it.predicted_next_date || "Belum ada"}</div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => handleBought(it)}>
                      <ShoppingBag className="h-3.5 w-3.5 mr-1" /> Sudah Beli
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Stock;
