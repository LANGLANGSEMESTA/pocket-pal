import { useRef, useState, useEffect } from "react";
import { Mic, Loader2, Lock } from "lucide-react";
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
  date?: string | null;
  currency?: string | null;
};

// Animated waveform bars shown while recording
const Waveform = () => (
  <div className="flex items-center gap-[3px]">
    {[0, 1, 2, 3, 4].map((i) => (
      <span
        key={i}
        className="block w-[3px] rounded-full bg-white"
        style={{
          height: "18px",
          animation: `waveBar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
        }}
      />
    ))}
    <style>{`
      @keyframes waveBar {
        from { transform: scaleY(0.2); opacity: 0.5; }
        to   { transform: scaleY(1);   opacity: 1; }
      }
    `}</style>
  </div>
);

// Recording duration counter
const RecordTimer = ({ active }: { active: boolean }) => {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) { setSecs(0); return; }
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return <span className="text-[10px] font-mono text-white/80 absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">{m}:{s}</span>;
};

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
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        await processAudio(blob);
      };

      recorder.start();
      setListening(true);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Akses mic ditolak. Izinkan Microphone di browser kamu.");
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
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke("transcribe-and-parse", {
        body: { audio: base64, mimeType: blob.type || "audio/webm", lang },
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

  // ── FLOATING MODE (WA-style) ──
  if (floating) {
    return (
      <>
        <div className="relative">
          <button
            type="button"
            onClick={listening ? stop : start}
            disabled={parsing}
            aria-label={t("voice_input")}
            className={cn(
              "relative h-14 w-14 rounded-full shadow-lg flex items-center justify-center",
              "transition-all duration-200 active:scale-95 ring-4 ring-background",
              // States
              parsing
                ? "bg-muted cursor-wait"
                : listening
                ? "bg-red-500"
                : "bg-primary hover:brightness-110",
            )}
          >
            {/* Pulse rings when recording */}
            {listening && !parsing && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                <span className="absolute inset-[-6px] rounded-full border-2 border-red-400 opacity-40 animate-pulse" />
              </>
            )}

            {/* Icon content */}
            {parsing ? (
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            ) : listening ? (
              <Waveform />
            ) : (
              <Mic className="h-6 w-6 text-primary-foreground" />
            )}

            {/* PRO badge */}
            {!planLoading && !isPro && !listening && !parsing && (
              <span className="absolute -top-1 -right-1 bg-warning text-warning-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                <Lock className="h-2 w-2" /> PRO
              </span>
            )}
          </button>

          {/* Timer below button */}
          <RecordTimer active={listening} />

          {/* Tap to stop hint */}
          {listening && (
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
              Tap untuk stop
            </span>
          )}
        </div>

        <ProUpsellDialog open={upsellOpen} onOpenChange={setUpsellOpen} feature="Voice input" />
      </>
    );
  }

  // ── INLINE BUTTON MODE ──
  return (
    <>
      <Button
        type="button"
        variant={listening ? "destructive" : "outline"}
        size="sm"
        onClick={listening ? stop : start}
        disabled={parsing}
        className={cn(
          "gap-1.5 relative transition-all",
          listening && "ring-2 ring-red-400 ring-offset-1"
        )}
      >
        {parsing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}</>
        ) : listening ? (
          <>
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {t("voice_listening")}
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" /> {t("voice_input")}
            {!planLoading && !isPro && <Lock className="h-3 w-3 ml-0.5 text-warning" />}
          </>
        )}
      </Button>
      <ProUpsellDialog open={upsellOpen} onOpenChange={setUpsellOpen} feature="Voice input" />
    </>
  );
};
