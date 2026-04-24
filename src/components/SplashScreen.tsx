import { useEffect, useRef, useState } from "react";

const SPLASH_KEY = "splash_shown_session";

export const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hidden, setHidden] = useState(false);

  const finish = () => {
    setHidden(true);
    setTimeout(onDone, 350);
  };

  useEffect(() => {
    // Auto-skip after 6s as a safety net
    const t = setTimeout(finish, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-background flex items-center justify-center transition-opacity duration-300 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        onError={finish}
        className="w-full h-full object-cover"
      />
      <button
        onClick={finish}
        className="absolute bottom-6 right-6 text-xs px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border text-foreground"
      >
        Skip
      </button>
    </div>
  );
};

export const useSplash = () => {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });
  const done = () => {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShow(false);
  };
  return { show, done };
};
