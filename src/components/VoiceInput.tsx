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

const RetroMicIcon = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="13" y="2" width="14" height="20" rx="7" fill="#D85A30"/>
    <rect x="15" y="7" width="10" height="1.2" rx="0.6" fill="white" opacity="0.5"/>
    <rect x="15" y="10" width="10" height="1.2" rx="0.6" fill="white" opacity="0.5"/>
    <rect x="15" y="13" width="10" height="1.2" rx="0.6" fill="white" opacity="0.5"/>
    <rect x="15" y="16" width="10" height="1.2" rx="0.6" fill="white" opacity="0.5"/>
    <path d="M8 20c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="#D85A30" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <line x1="20" y1="32" x2="20" y2="38" stroke="#D85A30" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="14" y1="38" x2="26" y2="38" stroke="#D85A30" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const RetroMicRecording = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="13" y="2" width="14" height="20" rx="7" fill="#E24B4A"/>
    <rect x="15" y="7" width="10" height="1.2" rx="0.6" fill="white" opacity="0.5"/>
    <rect x="15" y="10" width="10" height="1.2" rx="0.6" fill="white" opacity="0.5"/>
    <rect x="15" y="13" width="10" height="1.2" rx="0.6" fill="white" opacity="0.5"/>
    <rect x="15" y="16" width="10" height="1.2" rx="0.6" fill="white" opacity="0.5"/>
    <path d="M8 20c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="#E24B4A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <line x1="20" y1="32" x2="20" y2="38" stroke="#E24B4A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="14" y1="38" x2="26" y2="38" stroke="#E24B4A" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="20" cy="20" r="18" stroke="#E24B4A" strokeWidth="1" strokeDasharray="2 3" fill="none" opacity="0.4"/>
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
              className="h-7 w-7 animate-spin"
              style={{ color: "#D85A30" }}
            />
          ) : listening ? (
            <RetroMicRecording size={36} />
          ) : (
            <RetroMicIcon size={36} />
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
            <RetroMicIcon size={16} /> {t("voice_input")}
            {!planLoading && !isPro && <Lock className="h-3 w-3 ml-0.5 text-warning" />}
          </>
        )}
      </Button>
      <ProUpsellDialog open={upsellOpen} onOpenChange={setUpsellOpen} feature="Voice input" />
    </>
  );
};
