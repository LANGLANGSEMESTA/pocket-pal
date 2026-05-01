import { LogOut, Settings as SettingsIcon, User as UserIcon, Languages, Sparkles, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { usePlan } from "@/hooks/usePlan";
import { getInitials } from "@/lib/format";
import { LANGUAGES } from "@/lib/i18n/types";

export const AvatarMenu = ({ username }: { username?: string }) => {
  const { signOut, user } = useAuth();
  const { lang, vibe, setLang, setVibe, t } = useI18n();
  const { isPro, isSuperAdmin } = usePlan();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Akun"
          className="h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition"
        >
          <Avatar className="h-10 w-10 bg-primary text-primary-foreground">
            <AvatarFallback className="text-sm font-bold bg-primary text-primary-foreground">
              {getInitials(username || user?.email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{username || user?.email || "Akun"}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <UserIcon className="h-4 w-4 mr-2" /> {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <SettingsIcon className="h-4 w-4 mr-2" /> {t("settings")}
        </DropdownMenuItem>
        {!isPro && (
          <DropdownMenuItem onClick={() => navigate("/upgrade")} className="text-primary focus:text-primary">
            <Sparkles className="h-4 w-4 mr-2" /> Upgrade ke Pro
          </DropdownMenuItem>
        )}
        {isSuperAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            <Shield className="h-4 w-4 mr-2" /> Admin Panel
          </DropdownMenuItem>
        )}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages className="h-4 w-4 mr-2" /> {t("language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
            <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as any)}>
              {LANGUAGES.map((l) => (
                <DropdownMenuRadioItem key={l.v} value={l.v}>
                  {l.flag} {l.l}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sparkles className="h-4 w-4 mr-2" /> {t("vibe")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={vibe} onValueChange={(v) => setVibe(v as any)}>
              <DropdownMenuRadioItem value="casual">😎 {t("vibe_casual")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pro">💼 {t("vibe_pro")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-danger focus:text-danger">
          <LogOut className="h-4 w-4 mr-2" /> {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
