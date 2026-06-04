import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Outlet } from "react-router-dom";

export function AdminLayout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
        <AdminSidebar />
        <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-x-hidden">
          <Header />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden w-full max-w-full">
            <div className="mx-auto w-full max-w-full overflow-hidden">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
