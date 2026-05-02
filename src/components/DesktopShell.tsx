import { Home, ClipboardList, Scissors, BarChart3, Wallet, Heart, Bell, Plus, PiggyBank, ShieldCheck } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_GROUPS = {
  Utama: [
    { to: "/dashboard", label: "Beranda", icon: Home },
    { to: "/transactions", label: "Transaksi", icon: ClipboardList },
    { to: "/split", label: "Split Bill", icon: Scissors },
  ],
  Analitik: [
    { to: "/reports", label: "Laporan", icon: BarChart3 },
    { to: "/stock", label: "Budget", icon: PiggyBank },
    { to: "/subscriptions", label: "Langganan", icon: Heart },
  ]
};

export const DesktopShell = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [userState, setUserState] = useState({ username: "", email: "", isAdmin: false });

  useEffect(() => {
    (async () => {
      const u = await getAuthenticatedUser();
      if (!u) return;
      const { data } = await supabase.from("profiles").select("username, role").eq("id", u.id).maybeSingle();
      setUserState({ 
        email: u.email || "", 
        username: data?.username || "User", 
        isAdmin: data?.role === "admin" 
      });
    })();
  }, []);

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const NavItem = ({ to, label, icon: Icon, colorClass = "" }: any) => (
    <NavLink to={to} className={({ isActive }) => cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
      colorClass ? (isActive ? "bg-orange-600 text-white shadow-lg shadow-orange-900/30" : "text-orange-200/80 hover:bg-orange-500/10") 
                 : (isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white")
    )}>
      <Icon className="h-[18px] w-[18px]" /> {label}
    </NavLink>
  );

  return (
    <>
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-[240px] flex-col z-[60] text-sidebar-foreground" style={{ background: "hsl(var(--sidebar-bg))" }}>
        <div className="px-6 pt-7 pb-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20"><Wallet className="h-5 w-5 text-white" /></div>
          <div className="min-w-0">
            <h1 className="font-display text-[17px] font-bold text-white leading-tight">Student Pocket</h1>
            <p className="text-[10px] text-sidebar-foreground/60 leading-tight mt-0.5">Kelola uangmu, tenang kuliah</p>
          </div>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          {Object.entries(NAV_GROUPS).map(([group, items]) => (
            <div key={group} className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40 px-4 py-2">{group}</p>
              <div className="space-y-1">{items.map(item => <NavItem key={item.to} {...item} />)}</div>
            </div>
          ))}

          {userState.isAdmin && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-orange-400/60 px-4 py-2">Owner Area</p>
              <NavItem to="/admin" label="Admin Panel" icon={ShieldCheck} colorClass="admin" />
            </div>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-white/5 bg-inherit mt-auto">
          <button onClick={() => navigate("/settings")} type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-left cursor-pointer relative z-[70]">
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
              {userState.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{userState.username}</p>
              <p className="text-[11px] text-sidebar-foreground/60 truncate">{userState.email}</p>
            </div>
          </button>
        </div>
      </aside>

      <header className="hidden md:flex fixed top-0 left-[240px] right-0 h-[72px] items-center bg-background/90 backdrop-blur border-b border-border/60 z-40">
        <div className="w-full max-w-6xl px-10 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] font-bold truncate leading-tight">
              {pathname === "/dashboard" ? `Selamat pagi, ${userState.username}` : "Student Pocket"}
            </h2>
            <p className="text-[12px] text-muted-foreground capitalize mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/notifications")} className="h-10 w-10 rounded-full bg-card border border-border hover:bg-muted flex items-center justify-center transition"><Bell className="h-5 w-5" /></button>
            <button onClick={() => navigate("/transactions/new")} className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-95 transition shadow-md shadow-primary/30"><Plus className="h-4 w-4" /> Tambah Transaksi</button>
          </div>
        </div>
      </header>
    </>
  );
};
