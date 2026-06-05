import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { MusicPlayer } from "@/components/player/MusicPlayer";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { WelcomePopup } from "@/components/popup/WelcomePopup";


export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full min-w-0 overflow-x-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-20">
          <Header />
          <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <MusicPlayer />
      <InstallBanner />
      <WelcomePopup />
      <VersionChecker />
    </SidebarProvider>
  );
}
