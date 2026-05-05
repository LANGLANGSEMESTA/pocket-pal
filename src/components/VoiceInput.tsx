import { useRef, useState } from "react";
import { Mic, Square, Loader2, Lock } from "lucide-react";
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

      // Pick best supported format
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
      // Convert blob to base64
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
    const Icon = parsing ? Loader2 : listening ? Square : Mic;
    return (
      <>
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={parsing}
          aria-label={t("voice_input")}
          className={cn(
            "relative h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-primary-foreground transition-transform active:scale-95",
            listening ? "bg-destructive animate-pulse" : "bg-primary",
            "ring-4 ring-background"
          )}
        >
          <Icon className={cn("h-6 w-6", parsing && "animate-spin")} />
          {!planLoading && !isPro && (
            <span className="absolute -top-1 -right-1 bg-warning text-warning-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
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
            <Mic className="h-4 w-4" /> {t("voice_input")}
            {!planLoading && !isPro && <Lock className="h-3 w-3 ml-0.5 text-warning" />}
          </>
        )}
      </Button>
      <ProUpsellDialog open={upsellOpen} onOpenChange={setUpsellOpen} feature="Voice input" />
    </>
  );
};
