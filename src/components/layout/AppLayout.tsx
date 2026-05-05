import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { MusicPlayer } from "@/components/player/MusicPlayer";
import { InstallBanner } from "@/components/pwa/InstallBanner";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col pb-24 md:pb-20">
          <Header />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
      <MusicPlayer />
      <InstallBanner />
    </SidebarProvider>
  );
}
