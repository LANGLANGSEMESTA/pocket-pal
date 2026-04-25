import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

export const VoiceInput = ({
  onParsed,
  floating = false,
}: {
  onParsed: (data: ParsedTx) => void;
  floating?: boolean;
}) => {
  const { t, lang } = useI18n();
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const recRef = useRef<any>(null);

  const start = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Browser belum support voice input. Coba pakai Chrome/Edge di desktop atau Android.");
      return;
    }
    // Pre-flight: check mic permission. In iframes, getUserMedia surfaces a clear error
    // while SpeechRecognition often fails silently.
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Browser tidak mengizinkan akses mic di sini. Buka aplikasi di tab baru.");
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
    rec.onerror = (e: any) => {
      setListening(false);
      const code = e?.error || "unknown";
      console.error("[VoiceInput] SpeechRecognition error:", code, e);
      const msg: Record<string, string> = {
        "not-allowed": "Akses mic ditolak. Aktifkan permission mic di browser.",
        "service-not-allowed": "Akses mic ditolak. Aktifkan permission mic di browser.",
        "no-speech": "Tidak ada suara terdeteksi. Coba lagi.",
        "audio-capture": "Mic tidak ditemukan di perangkat ini.",
        "network": "Voice butuh koneksi internet (Web Speech pakai server Google).",
        "aborted": "Mic dibatalkan.",
      };
      toast.error(msg[code] || `Mic error: ${code}`);
    };
    rec.onend = () => setListening(false);

    // Trigger permission prompt via getUserMedia first (works inside iframes when allowed),
    // then start recognition. This makes the permission dialog actually appear.
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // Stop the mic stream immediately — SpeechRecognition opens its own.
        stream.getTracks().forEach((t) => t.stop());
        try {
          rec.start();
          recRef.current = rec;
          setListening(true);
        } catch (err: any) {
          console.error("[VoiceInput] start() threw:", err);
          toast.error("Tidak bisa memulai mic: " + (err?.message || "unknown"));
        }
      })
      .catch((err) => {
        console.error("[VoiceInput] getUserMedia denied:", err);
        if (err?.name === "NotAllowedError") {
          toast.error("Akses mic ditolak. Klik ikon gembok di address bar → izinkan Microphone.");
        } else if (err?.name === "NotFoundError") {
          toast.error("Mic tidak ditemukan di perangkat ini.");
        } else {
          toast.error("Mic tidak bisa diakses: " + (err?.message || err?.name || "unknown"));
        }
      });
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  if (floating) {
    const Icon = parsing ? Loader2 : listening ? Square : Mic;
    return (
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={parsing}
        aria-label={t("voice_input")}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-primary-foreground transition-transform active:scale-95",
          listening ? "bg-destructive animate-pulse" : "bg-primary",
          "ring-4 ring-background"
        )}
      >
        <Icon className={cn("h-6 w-6", parsing && "animate-spin")} />
      </button>
    );
  }

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
        <><Square className="h-4 w-4" /> {t("voice_listening")}</>
      ) : (
        <><Mic className="h-4 w-4" /> {t("voice_input")}</>
      )}
    </Button>
  );
};
