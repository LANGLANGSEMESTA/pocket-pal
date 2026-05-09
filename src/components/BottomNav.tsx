import { Home, ClipboardList, BarChart3, Plus, Scissors } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/dashboard", label: "Beranda", icon: Home },
  { to: "/transactions", label: "Transaksi", icon: ClipboardList },
  { to: "/split", label: "Split", icon: Scissors },
  { to: "/reports", label: "Laporan", icon: BarChart3 },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const Tab = ({ to, label, icon: Icon }: (typeof tabs)[number]) => {
    const active = pathname === to || pathname.startsWith(to + "/");
    return (
      <NavLink
        to={to}
        className="flex flex-col items-center justify-center gap-0.5 flex-1"
      >
        <span
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200",
            active
              ? "bg-primary text-primary-foreground"
              : "text-white/40 hover:text-white/70"
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
          <span className={cn("text-[10px] font-medium leading-none", active ? "text-primary-foreground" : "text-white/40")}>
            {label}
          </span>
        </span>
      </NavLink>
    );
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 md:hidden px-4 pb-4">
      <nav
        className="relative flex items-center justify-around rounded-[28px] px-2 py-2"
        style={{ background: "#1C1A18" }}
      >
        <Tab {...tabs[0]} />
        <Tab {...tabs[1]} />

        {/* FAB center */}
        <div className="flex flex-col items-center justify-center flex-1">
          <button
            onClick={() => navigate("/transactions/new")}
            aria-label="Catat Transaksi"
            className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all duration-150"
            style={{ border: "2.5px solid #1C1A18" }}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <Tab {...tabs[2]} />
        <Tab {...tabs[3]} />
      </nav>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
};
