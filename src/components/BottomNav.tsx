import { Home, Receipt, PiggyBank, Package, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/dashboard", label: "Beranda", icon: Home },
  { to: "/transactions", label: "Transaksi", icon: Receipt },
  { to: "/budget", label: "Budget", icon: PiggyBank },
  { to: "/stock", label: "Stok", icon: Package },
  { to: "/profile", label: "Profil", icon: User },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border z-40">
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.to);
          return (
            <li key={t.to}>
              <NavLink
                to={t.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="h-5 w-5" />
                <span>{t.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
