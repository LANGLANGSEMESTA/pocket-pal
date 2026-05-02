import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
  requireAdmin?: boolean; // Tambahkan properti baru
}

export const ProtectedRoute = ({ 
  children, 
  requireOnboarding = true,
  requireAdmin = false 
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    const checkUserStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_complete, role")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        // Cek Onboarding
        if (requireOnboarding) {
          setNeedsOnboarding(!data?.onboarding_complete);
        }

        // Cek Admin Role
        if (requireAdmin && data?.role !== 'admin') {
          setIsForbidden(true);
        }
      } catch (err) {
        console.error("Error checking protected route status:", err);
      } finally {
        setChecking(false);
      }
    };

    checkUserStatus();
  }, [user, requireOnboarding, requireAdmin]);

  if (loading || checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // 1. Jika belum login, lempar ke login
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  // 2. Jika bukan admin tapi halaman butuh admin, lempar ke dashboard atau halaman 403
  if (isForbidden) return <Navigate to="/dashboard" replace />;

  // 3. Jika butuh onboarding tapi belum selesai
  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
