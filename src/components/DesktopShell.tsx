import { Home, ClipboardList, Scissors, BarChart3, Wallet, Heart, Bell, Plus, PiggyBank } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { AvatarMenu } from "@/components/AvatarMenu";
import { cn } from "@/lib/utils";

const NAV_MAIN = [
  { to: "/dashboard", label: "Beranda", icon: Home },
  { to: "/transactions", label: "Transaksi", icon: ClipboardList },
  { to: "/split", label: "Split Bill", icon: Scissors },
];
const NAV_ANALYTICS = [
  { to: "/reports", label: "Laporan", icon: BarChart3 },
  { to: "/stock", label: "Budget", icon: PiggyBank },
  { to: "/subscriptions", label: "Langganan", icon: Heart },
];
const NAV = [...NAV_MAIN, ...NAV_ANALYTICS];

const pageTitle = (path: string) => {
  const m = NAV.find((n) => path === n.to || path.startsWith(n.to + "/"));
  return m?.label || "Student Pocket";
};

export const DesktopShell = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const u = await getAuthenticatedUser();
      if (!u) return;
      setEmail(u.email || "");
      const { data } = await supabase.from("profiles").select("username").eq("id", u.id).maybeSingle();
      setUsername(data?.username || "");
    })();
  }, []);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Sidebar - Fixed di Kiri */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-[240px] flex-col z-50 text-sidebar-foreground" style={{ background: "hsl(var(--sidebar-bg))" }}>
        <div className="px-6 pt-7 pb-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary))" }}>
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[17px] font-bold text-white leading-tight">Student Pocket</h1>
            <p className="text-[10px] text-sidebar-foreground/60 leading-tight mt-0.5">Kelola uangmu, tenang kuliah</p>
          </div>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40 px-4 pt-2 pb-2">Utama</p>
          <div className="space-y-1">
            {NAV_MAIN.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </NavLink>
              );
            })}
          </div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40 px-4 pt-5 pb-2">Analitik</p>
          <div className="space-y-1">
            {NAV_ANALYTICS.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition text-left"
          >
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
              {(username || email || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{username || "User"}</p>
              <p className="text-[11px] text-sidebar-foreground/60 truncate">{email}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Topbar - Rapat Kiri Sejajar Konten */}
      <header className="hidden md:flex fixed top-0 left-[240px] right-0 h-[72px] items-center bg-background/90 backdrop-blur border-b border-border/60 z-40">
        <div className="w-full max-w-6xl px-10 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] font-bold truncate leading-tight">
              {pathname === "/dashboard" ? `Selamat pagi, ${username || "Sobat"}` : pageTitle(pathname)}
            </h2>
            <p className="text-[12px] text-muted-foreground capitalize mt-0.5">{today} — Mei baru dimulai!</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/notifications")}
              aria-label="Notifikasi"
              className="h-10 w-10 rounded-full bg-card border border-border hover:bg-muted flex items-center justify-center transition"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate("/transactions/new")}
              className="h-10 px-5 rounded-full text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-95 transition shadow-md shadow-primary/30"
              style={{ background: "hsl(var(--primary))" }}
            >
              <Plus className="h-4 w-4" />
              Tambah Transaksi
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
