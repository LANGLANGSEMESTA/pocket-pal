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
    const [{ data: sub }, { data: roles }] = await Promise.all([
      supabase
        .from("user_subscriptions" as any)
        .select("plan, expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id),
    ]);
    const s: any = sub;
    setPlan((s?.plan as Plan) || "free");
    setExpiresAt(s?.expires_at ? new Date(s.expires_at) : null);
    setIsSuperAdmin(!!(roles as any[])?.some((r) => r.role === "super_admin"));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isPro =
    plan === "pro" && (!expiresAt || expiresAt.getTime() > Date.now());

  return { plan, expiresAt, isPro, isSuperAdmin, loading, refresh: load };
};