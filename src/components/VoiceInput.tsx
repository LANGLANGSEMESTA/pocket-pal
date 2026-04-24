import { useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";

type ParsedTx = {
  merchant?: string | null;
  amount?: number | null;
  category?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};

export const VoiceInput = ({ onParsed }: { onParsed: (data: ParsedTx) => void }) => {
  const { t, lang } = useI18n();
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const recRef = useRef<any>(null);

  const start = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Browser kamu belum support voice input");
      return;
    }
    const rec = new SR();
    const langMap: Record<string, string> = {
      id: "id-ID", en: "en-US", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR",
      es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR", it: "it-IT",
      nl: "nl-NL", ru: "ru-RU", ar: "ar-SA", hi: "hi-IN", th: "th-TH",
      vi: "vi-VN", tr: "tr-TR", pl: "pl-PL", sv: "sv-SE", ms: "ms-MY",
    };
    rec.lang = langMap[lang] || "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = async (e: any) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      setParsing(true);
      try {
        const { data, error } = await supabase.functions.invoke("parse-voice-transaction", {
          body: { transcript, lang },
        });
        if (error) throw error;
        toast.success("✓ " + transcript);
        onParsed(data as ParsedTx);
      } catch (err: any) {
        toast.error("Gagal proses suara");
      } finally {
        setParsing(false);
      }
    };
    rec.onerror = () => { setListening(false); toast.error("Mic error"); };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return (
    <Button
      type="button"
      variant={listening ? "destructive" : "outline"}
      size="sm"
      onClick={listening ? stop : start}
      disabled={parsing}
      className="gap-1.5"
    >
      {parsing ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</>
      ) : listening ? (
        <><MicOff className="h-4 w-4" /> {t("voice_listening")}</>
      ) : (
        <><Mic className="h-4 w-4" /> {t("voice_input")}</>
      )}
    </Button>
  );
};
