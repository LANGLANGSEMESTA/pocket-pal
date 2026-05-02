import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { I18nProvider } from "@/hooks/useI18n";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SplashScreen, useSplash } from "@/components/SplashScreen";
import { DesktopShell } from "@/components/DesktopShell";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NewTransaction from "./pages/NewTransaction.tsx";
import Transactions from "./pages/Transactions.tsx";
import SplitBill from "./pages/SplitBill.tsx";
import Scan from "./pages/Scan.tsx";
import Stock from "./pages/Stock.tsx";
import Reports from "./pages/Reports.tsx";
import Parent from "./pages/Parent.tsx";
import Settings from "./pages/Settings.tsx";
import Subscriptions from "./pages/Subscriptions.tsx";
import Notifications from "./pages/Notifications.tsx";
import Upgrade from "./pages/Upgrade.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";

const ShellGate = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const hideOn = ["/", "/auth", "/onboarding"];
  if (!user || hideOn.includes(pathname)) return null;
  return <DesktopShell />;
};

const App = () => {
  const { show, done } = useSplash();

  return (
    <TooltipProvider>
      {show && <SplashScreen onDone={done} />}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <I18nProvider>
            {/* Sidebar & Header */}
            <ShellGate />
            
            <div className="min-h-screen bg-background flex">
              {/* SPACER: Blok fisik ini memastikan area sidebar 240px 
                  benar-benar kosong dan tidak tertutup elemen konten utama */}
              <div className="hidden md:block w-[240px] shrink-0" />

              <div className="flex-1 flex flex-col min-w-0">
                {/* Area Utama */}
                <main className="flex-1 pt-[72px]">
                  <div className="w-full max-w-6xl p-6 md:p-10">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route
                        path="/onboarding"
                        element={
                          <ProtectedRoute requireOnboarding={false}>
                            <Onboarding />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/transactions"
                        element={
                          <ProtectedRoute>
                            <Transactions />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/transactions/new"
                        element={
                          <ProtectedRoute>
                            <NewTransaction />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/split"
                        element={
                          <ProtectedRoute>
                            <SplitBill />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
                      <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
                      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                      <Route path="/parent" element={<ProtectedRoute><Parent /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
                      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                      <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
                      <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><Admin /></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </div>
          </I18nProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
