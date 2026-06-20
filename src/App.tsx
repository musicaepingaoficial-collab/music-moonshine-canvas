import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useSingleSession } from "@/hooks/useSingleSession";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DemoOrProtectedRoute } from "@/components/auth/DemoOrProtectedRoute";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { SignupGateDialog } from "@/components/demo/SignupGateDialog";
import { DemoWarningDialog } from "@/components/demo/DemoWarningDialog";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { MaintenanceGate } from "@/components/auth/MaintenanceGate";
import { PixelInjector } from "@/components/pixels/PixelInjector";
import { RouteTracker } from "@/components/pixels/RouteTracker";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { CookiePreferencesDialog } from "@/components/legal/CookiePreferencesDialog";
import { ReferralTracker } from "@/components/referrals/ReferralTracker";
import { Loader2 } from "lucide-react";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const BibliotecaPage = lazy(() => import("./pages/BibliotecaPage"));
const CategoriaPage = lazy(() => import("./pages/CategoriaPage"));
const FavoritosPage = lazy(() => import("./pages/FavoritosPage"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage"));
const ContaPage = lazy(() => import("./pages/ContaPage"));
const OfertasPage = lazy(() => import("./pages/OfertasPage"));
const RepertorioPage = lazy(() => import("./pages/RepertorioPage"));
const MeusRepertoriosPage = lazy(() => import("./pages/MeusRepertoriosPage"));
const MusicaPage = lazy(() => import("./pages/MusicaPage"));
const TodasMusicasPage = lazy(() => import("./pages/TodasMusicasPage"));
const CompleteProfilePage = lazy(() => import("./pages/CompleteProfilePage"));
const PlanosGatePage = lazy(() => import("./pages/PlanosGatePage"));
const InstalarPage = lazy(() => import("./pages/InstalarPage"));
const FinalizarCadastroPage = lazy(() => import("./pages/FinalizarCadastroPage"));
const PdfsPage = lazy(() => import("./pages/PdfsPage"));
const IndicacoesPage = lazy(() => import("./pages/IndicacoesPage"));
const ComoBaixarPage = lazy(() => import("./pages/ComoBaixarPage"));
const DiscografiasPage = lazy(() => import("./pages/DiscografiasPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminUsuariosPage = lazy(() => import("./pages/admin/AdminUsuariosPage"));
const AdminAssinaturasPage = lazy(() => import("./pages/admin/AdminAssinaturasPage"));
const AdminBibliotecaPage = lazy(() => import("./pages/admin/AdminBibliotecaPage"));
const AdminDrivesPage = lazy(() => import("./pages/admin/AdminDrivesPage"));
const AdminFinanceiroPage = lazy(() => import("./pages/admin/AdminFinanceiroPage"));
const AdminRepertoriosPage = lazy(() => import("./pages/admin/AdminRepertoriosPage"));
const AdminPlanosPage = lazy(() => import("./pages/admin/AdminPlanosPage"));
const AdminSitePage = lazy(() => import("./pages/admin/AdminSitePage"));
const AdminPixelsPage = lazy(() => import("./pages/admin/AdminPixelsPage"));
const AdminNotificacoesPage = lazy(() => import("./pages/admin/AdminNotificacoesPage"));
const AdminPdfsPage = lazy(() => import("./pages/admin/AdminPdfsPage"));
const AdminAnunciosPage = lazy(() => import("./pages/admin/AdminAnunciosPage"));
const AdminFornecedoresPage = lazy(() => import("./pages/admin/AdminFornecedoresPage"));
const AdminTutoriaisPage = lazy(() => import("./pages/admin/AdminTutoriaisPage"));
const AdminDiscografiasPage = lazy(() => import("./pages/admin/AdminDiscografiasPage"));
const AdminPopupPage = lazy(() => import("./pages/admin/AdminPopupPage"));
const AdminUserDetailsPage = lazy(() => import("./pages/admin/AdminUserDetailsPage"));
const AdminSubscriptionDetailsPage = lazy(() => import("./pages/admin/AdminSubscriptionDetailsPage"));
const AdminSalesPageStats = lazy(() => import("./pages/admin/AdminSalesPageStats"));
const AdminRecuperacaoPage = lazy(() => import("./pages/admin/AdminRecuperacaoPage"));
const AdminAfiliadosPage = lazy(() => import("./pages/admin/AdminAfiliadosPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function SingleSessionGuard() {
  useSingleSession();
  return null;
}

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

function OnlineStatusTracker() {
  useOnlineStatus();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <ErrorBoundary>
        <BrowserRouter>
          <DemoModeProvider>
          <PixelInjector />
          <RouteTracker />
          <CookieBanner />
          <CookiePreferencesDialog />
          <ReferralTracker />
          <OnlineStatusTracker />
          <SingleSessionGuard />
          <SignupGateDialog />
          <DemoWarningDialog />
          <Suspense fallback={<PageLoader />}>
            <MaintenanceGate>
            <Routes>
              {/* Public landing */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/privacidade" element={<PrivacyPage />} />
              <Route path="/termos" element={<TermsPage />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/completar-perfil" element={<CompleteProfilePage />} />
              <Route path="/planos" element={<PlanosGatePage />} />
              <Route path="/instalar" element={<InstalarPage />} />
              <Route path="/finalizar-cadastro" element={<FinalizarCadastroPage />} />

              {/* Demo + Logged-in browseable routes */}
              <Route element={<DemoOrProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/biblioteca" element={<BibliotecaPage />} />
                  <Route path="/categoria/:id" element={<CategoriaPage />} />
                  <Route path="/musicas" element={<TodasMusicasPage />} />
                  <Route path="/musica/:id" element={<MusicaPage />} />
                  <Route path="/ofertas" element={<OfertasPage />} />
                  <Route path="/pdfs" element={<PdfsPage />} />
                  <Route path="/discografias" element={<DiscografiasPage />} />
                  <Route path="/como-baixar" element={<ComoBaixarPage />} />
                  <Route path="/repertorios" element={<MeusRepertoriosPage />} />
                  <Route path="/repertorio/:id" element={<RepertorioPage />} />
                </Route>
              </Route>

              {/* Strictly private routes (logged-in only) */}
              <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/favoritos" element={<FavoritosPage />} />
                <Route path="/downloads" element={<DownloadsPage />} />
                <Route path="/conta" element={<ContaPage />} />
                <Route path="/indicacoes" element={<IndicacoesPage />} />

              </Route>
              </Route>

              {/* Admin routes */}
              <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="usuarios" element={<AdminUsuariosPage />} />
                <Route path="usuarios/:id" element={<AdminUserDetailsPage />} />
                <Route path="assinaturas" element={<AdminAssinaturasPage />} />
                <Route path="assinaturas/:id" element={<AdminSubscriptionDetailsPage />} />
                <Route path="biblioteca" element={<AdminBibliotecaPage />} />
                <Route path="drives" element={<AdminDrivesPage />} />
                <Route path="financeiro" element={<AdminFinanceiroPage />} />
                <Route path="planos" element={<AdminPlanosPage />} />
                <Route path="repertorios" element={<AdminRepertoriosPage />} />
                <Route path="site" element={<AdminSitePage />} />
                <Route path="pixels" element={<AdminPixelsPage />} />
                <Route path="notificacoes" element={<AdminNotificacoesPage />} />
                <Route path="pdfs" element={<AdminPdfsPage />} />
                <Route path="anuncios" element={<AdminAnunciosPage />} />
                <Route path="fornecedores" element={<AdminFornecedoresPage />} />
                <Route path="tutoriais" element={<AdminTutoriaisPage />} />
                <Route path="discografias" element={<AdminDiscografiasPage />} />
                <Route path="vendas-stats" element={<AdminSalesPageStats />} />
                <Route path="popup" element={<AdminPopupPage />} />
                <Route path="recuperacao" element={<AdminRecuperacaoPage />} />
                <Route path="afiliados" element={<AdminAfiliadosPage />} />
              </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </MaintenanceGate>
          </Suspense>
          </DemoModeProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
