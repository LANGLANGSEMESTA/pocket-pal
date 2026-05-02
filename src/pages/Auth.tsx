import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) routeAfterAuth(user.id);
    // eslint-disable-next-line
  }, [user]);

  const routeAfterAuth = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("onboarding_complete").eq("id", uid).maybeSingle();
    navigate(data?.onboarding_complete ? "/dashboard" : "/onboarding", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Lengkapi email dan password");
    setLoading(true);
    try {
      if (tab === "register") {
        const redirectUrl = `${window.location.origin}/onboarding`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast.success("Akun dibuat! Yuk lanjut ke onboarding ✨");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Selamat datang kembali! 👋");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result.error) toast.error(result.error.message || "Gagal masuk dengan Google");
  };

  const handleForgot = async () => {
    if (!email) return toast.error("Masukkan email dulu ya");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else toast.success("Cek emailmu untuk link reset password");
  };

  return (
    // CONTAINER UTAMA (Penuh Layar)
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black p-4">
      
      {/* 1. KODE VIDEO LATAR BELAKANG (Anti-Watermark) */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <video
          autoPlay
          loop
          muted
          playsInline
          // Kunci CSS: Memperbesar sedikit (scale-110) untuk membuang watermark "Veo" ke luar layar
          className="absolute inset-0 h-full w-full object-cover scale-110 opacity-70"
        >
          <source src="https://tedqkttynjwsueugspbc.supabase.co/storage/v1/object/public/assets/f_f_a_a_e_b_f_c_mp_.mp4" type="video/mp4" />
        </video>
        {/* Lapisan Hitam Transparan untuk menajamkan kontras form */}
        <div className="absolute inset-0 bg-black/50 z-10" />
      </div>

      {/* 2. KODE KONTEN FORM LOGIN (Berada di atas Video) */}
      <div className="relative z-20 w-full max-w-md mx-auto flex flex-col items-center">
        
        {/* LOGO & JUDUL (Disederhanakan & Tanpa Margin Bawah Besar) */}
        <div className="flex flex-col items-center gap-3 mb-6 w-full text-white">
          <div className="h-16 w-16 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
            <Wallet className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Student Pocket</h1>
            <p className="text-sm text-gray-300 mt-1">Kelola uangmu, tenang kuliah ✨</p>
          </div>
        </div>

        {/* KOTAK LOGIN (Diperbarui: Sedikit Transparan agar Elegan) */}
        <Card className="w-full p-6 shadow-2xl border border-white/10 bg-white/5 backdrop-blur-lg">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 text-white">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary">Masuk</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="email" className="text-gray-200">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="kamu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    // Input styling agar serasi dengan background gelap
                    className="w-full bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-11"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="password" className="text-gray-200">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={tab === "login" ? "current-password" : "new-password"}
                      className="pr-10 w-full bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {tab === "login" && (
                    <button type="button" onClick={handleForgot} className="text-xs text-primary-foreground hover:underline mt-1">
                      Lupa password?
                    </button>
                  )}
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? "Memproses…" : tab === "login" ? "Masuk ke Akun" : "Buat Akun Baru"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-2 text-gray-400">atau</span></div>
              </div>

              <Button type="button" variant="outline" className="w-full h-11 border-white/20 text-white hover:bg-white/10" onClick={handleGoogle}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                Masuk dengan Google
              </Button>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6 px-4">
          Dengan masuk, kamu setuju dengan ketentuan kami.
        </p>
      </div>
    </div>
  );
};
export default Auth;
