import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.username || ""));
  }, [user]);

  return (
    <div className="app-shell pb-24">
      <header className="px-5 pt-10 pb-6">
        <p className="text-sm text-muted-foreground">Halo,</p>
        <h1 className="text-2xl font-bold">{name || "Sobat"} 👋</h1>
      </header>
      <main className="px-5 space-y-4">
        <Card className="p-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
          <p className="text-xs opacity-80">Pengeluaran bulan ini</p>
          <p className="text-3xl font-bold mt-1">Rp 0</p>
          <p className="text-xs opacity-80 mt-2">dari budget bulananmu</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Sesi 2 segera hadir</p>
              <p className="text-sm text-muted-foreground mt-1">
                Fitur transaksi, budget tracker, split bill, dan stok bakal aktif di sesi berikutnya.
              </p>
            </div>
          </div>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
};

export default Dashboard;
