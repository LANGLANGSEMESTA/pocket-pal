import { useRef, useState } from "react";
import { Square, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { usePlan } from "@/hooks/usePlan";
import { ProUpsellDialog } from "@/components/ProGate";
import { toast } from "sonner";

type ParsedTx = {
  merchant?: string | null;
  amount?: number | null;
  category?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};

// Vintage mic SVG icon
const VintageMicIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Mic capsule */}
    <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" />
    {/* Mic body lines — vintage style */}
    <line x1="9.5" y1="6" x2="14.5" y2="6" stroke="white" strokeWidth="0.6" strokeOpacity="0.4" />
    <line x1="9.5" y1="8" x2="14.5" y2="8" stroke="white" strokeWidth="0.6" strokeOpacity="0.4" />
    <line x1="9.5" y1="10" x2="14.5" y2="10" stroke="white" strokeWidth="0.6" strokeOpacity="0.4" />
    {/* Stand arm */}
    <path d="M6 11c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Stand pole */}
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Base */}
    <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const VoiceInput = ({
  onParsed,
  floating = false,
}: {
  onParsed: (data: ParsedTx) => void;
  floating?: boolean;
}) => {
  const { t, lang } = useI18n();
  const { isPro, loading: planLoading } = usePlan();
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async () => {
    if (!planLoading && !isPro) {
      setUpsellOpen(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Browser tidak mengizinkan akses mic di sini.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        await processAudio(blob);
      };

      recorder.start();
      setListening(true);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Akses mic ditolak. Klik ikon gembok di address bar → izinkan Microphone.");
      } else if (err?.name === "NotFoundError") {
        toast.error("Mic tidak ditemukan di perangkat ini.");
      } else {
        toast.error("Mic tidak bisa diakses: " + (err?.message || err?.name || "unknown"));
      }
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setListening(false);
  };

  const processAudio = async (blob: Blob) => {
    setParsing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke("transcribe-and-parse", {
        body: {
          audio: base64,
          mimeType: blob.type || "audio/webm",
          lang,
        },
      });

      if (error) throw error;
      if (!data?.transcript) throw new Error("Tidak ada suara terdeteksi");

      toast.success("✓ " + data.transcript);
      onParsed(data as ParsedTx);
    } catch (err: any) {
      toast.error("Gagal proses suara: " + (err?.message || "unknown"));
    } finally {
      setParsing(false);
    }
  };

  if (floating) {
    return (
      <>
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={parsing}
          aria-label={t("voice_input")}
          className={cn(
            "relative flex items-center justify-center transition-all active:scale-90",
            listening && "animate-pulse"
          )}
          style={{ background: "none", border: "none", padding: 0 }}
        >
          {parsing ? (
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: "hsl(var(--primary))" }}
            />
          ) : listening ? (
            <Square
              className="h-8 w-8"
              style={{ color: "hsl(var(--destructive))" }}
              strokeWidth={2.5}
            />
          ) : (
            <VintageMicIcon
              className="h-9 w-9 drop-shadow-sm"
              style={{ color: "hsl(var(--primary))" } as any}
            />
          )}

          {/* PRO badge */}
          {!planLoading && !isPro && (
            <span
              className="absolute -top-2 -right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
              style={{
                background: "hsl(var(--warning))",
                color: "hsl(var(--warning-foreground))",
              }}
            >
              <Lock className="h-2 w-2" /> PRO
            </span>
          )}
        </button>
        <ProUpsellDialog open={upsellOpen} onOpenChange={setUpsellOpen} feature="Voice input" />
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={listening ? "destructive" : "outline"}
        size="sm"
        onClick={listening ? stop : start}
        disabled={parsing}
        className="gap-1.5 relative"
      >
        {parsing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</>
        ) : listening ? (
          <><Square className="h-4 w-4" /> {t("voice_listening")}</>
        ) : (
          <>
            <VintageMicIcon className="h-4 w-4" /> {t("voice_input")}
            {!planLoading && !isPro && <Lock className="h-3 w-3 ml-0.5 text-warning" />}
          </>
        )}
      </Button>
      <ProUpsellDialog open={upsellOpen} onOpenChange={setUpsellOpen} feature="Voice input" />
    </>
  );
};
