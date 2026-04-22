import { Home, ClipboardList, BarChart3, Settings, Plus, Scissors } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/dashboard", label: "Beranda", icon: Home },
  { to: "/transactions", label: "Transaksi", icon: ClipboardList },
  { to: "/split", label: "Split", icon: Scissors },
  { to: "/reports", label: "Laporan", icon: BarChart3 },
  { to: "/settings", label: "Pengaturan", icon: Settings },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const Tab = ({ to, label, icon: Icon }: typeof tabs[number]) => {
    const active = pathname === to || pathname.startsWith(to + "/");
    return (
      <NavLink
        to={to}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </NavLink>
    );
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border z-40">
      <div className="grid grid-cols-6 items-end relative">
        <Tab {...tabs[0]} />
        <Tab {...tabs[1]} />
        <div className="flex justify-center">
          <button
            onClick={() => navigate("/transactions/new")}
            aria-label="Catat Transaksi"
            className="-mt-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>
        <Tab {...tabs[2]} />
        <Tab {...tabs[3]} />
        <Tab {...tabs[4]} />
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};
