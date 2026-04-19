import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute = ({ children, requireOnboarding = true }: { children: ReactNode; requireOnboarding?: boolean }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(requireOnboarding);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user || !requireOnboarding) {
      setChecking(false);
      return;
    }
    supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNeedsOnboarding(!data?.onboarding_complete);
        setChecking(false);
      });
  }, [user, requireOnboarding]);

  if (loading || checking) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (needsOnboarding && location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};
