import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Lang, Vibe } from "@/lib/i18n/types";
import { tFor } from "@/lib/i18n/translations";

type I18nCtx = {
  lang: Lang;
  vibe: Vibe;
  setLang: (l: Lang) => Promise<void>;
  setVibe: (v: Vibe) => Promise<void>;
  t: (key: string, vars?: Record<string, string>) => string;
};

const Ctx = createContext<I18nCtx>({
  lang: "id",
  vibe: "casual",
  setLang: async () => {},
  setVibe: async () => {},
  t: (k) => k,
});

const LS_LANG = "app.lang";
const LS_VIBE = "app.vibe";

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(LS_LANG) as Lang) || "id");
  const [vibe, setVibeState] = useState<Vibe>(() => (localStorage.getItem(LS_VIBE) as Vibe) || "casual");

  // Hydrate from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("preferensi_bahasa, ui_vibe")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferensi_bahasa) {
          setLangState(data.preferensi_bahasa as Lang);
          localStorage.setItem(LS_LANG, data.preferensi_bahasa);
        }
        if ((data as any)?.ui_vibe) {
          setVibeState((data as any).ui_vibe as Vibe);
          localStorage.setItem(LS_VIBE, (data as any).ui_vibe);
        }
      });
  }, [user]);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    localStorage.setItem(LS_LANG, l);
    if (user) await supabase.from("profiles").update({ preferensi_bahasa: l }).eq("id", user.id);
  }, [user]);

  const setVibe = useCallback(async (v: Vibe) => {
    setVibeState(v);
    localStorage.setItem(LS_VIBE, v);
    if (user) await supabase.from("profiles").update({ ui_vibe: v } as any).eq("id", user.id);
  }, [user]);

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => tFor(lang, vibe, key as any, vars),
    [lang, vibe]
  );

  return <Ctx.Provider value={{ lang, vibe, setLang, setVibe, t }}>{children}</Ctx.Provider>;
};

export const useI18n = () => useContext(Ctx);