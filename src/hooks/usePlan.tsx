import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Plan = "free" | "pro";

export interface PlanInfo {
  plan: Plan;
  expiresAt: Date | null;
  isPro: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const usePlan = (): PlanInfo => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setPlan("free");
      setExpiresAt(null);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Ambil data subscription DAN data profile (untuk cek role admin)
    const [{ data: sub }, { data: profile }] = await Promise.all([
      supabase
        .from("user_subscriptions" as any) // Tabel langganan
        .select("plan, expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles") // Tabel profil yang kita update tadi
        .select("role")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const s: any = sub;
    const userRole = profile?.role;
    
    // LOGIKA BYPASS ADMIN:
    // Jika role di database adalah 'admin', paksa status jadi 'pro' dan 'isSuperAdmin'
    const isAdminAccount = userRole === "admin" || userRole === "super_admin";
    
    setPlan(isAdminAccount ? "pro" : (s?.plan as Plan) || "free");
    setExpiresAt(s?.expires_at ? new Date(s.expires_at) : null);
    setIsSuperAdmin(isAdminAccount);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  // isPro akan TRUE jika plan memang Pro (berbayar) ATAU jika user adalah Admin
  const isPro = 
    isSuperAdmin || (plan === "pro" && (!expiresAt || expiresAt.getTime() > Date.now()));

  return { plan, expiresAt, isPro, isSuperAdmin, loading, refresh: load };
};
