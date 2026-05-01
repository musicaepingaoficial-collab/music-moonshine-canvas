import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { MaintenanceGate } from "@/components/auth/MaintenanceGate";
import { PixelInjector } from "@/components/pixels/PixelInjector";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { Loader2 } from "lucide-react";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
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
const PdfsPage = lazy(() => import("./pages/PdfsPage"));
const IndicacoesPage = lazy(() => import("./pages/IndicacoesPage"));
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <ErrorBoundary>
        <BrowserRouter>
          <PixelInjector />
          <CookieBanner />
          <Suspense fallback={<PageLoader />}>
            <MaintenanceGate>
            <Routes>
              {/* Public landing */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/privacidade" element={<PrivacyPage />} />
              <Route path="/termos" element={<TermsPage />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/completar-perfil" element={<CompleteProfilePage />} />
              <Route path="/planos" element={<PlanosGatePage />} />
              <Route path="/instalar" element={<InstalarPage />} />

              {/* App routes */}
              <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/biblioteca" element={<BibliotecaPage />} />
                <Route path="/categoria/:id" element={<CategoriaPage />} />
                <Route path="/favoritos" element={<FavoritosPage />} />
                <Route path="/downloads" element={<DownloadsPage />} />
                <Route path="/conta" element={<ContaPage />} />
                <Route path="/musica/:id" element={<MusicaPage />} />
                <Route path="/ofertas" element={<OfertasPage />} />
                <Route path="/repertorio/:id" element={<RepertorioPage />} />
                <Route path="/repertorios" element={<MeusRepertoriosPage />} />
                <Route path="/pdfs" element={<PdfsPage />} />
                <Route path="/indicacoes" element={<IndicacoesPage />} />
              </Route>
              </Route>

              {/* Admin routes */}
              <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="usuarios" element={<AdminUsuariosPage />} />
                <Route path="assinaturas" element={<AdminAssinaturasPage />} />
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
              </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </MaintenanceGate>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
