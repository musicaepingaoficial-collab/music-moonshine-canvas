import { Users, CreditCard, Library, HardDrive, DollarSign, LayoutDashboard, Music2, FolderOpen, BadgeDollarSign, Settings, Target, Bell, FileText, ImagePlay } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Usuários", url: "/admin/usuarios", icon: Users },
  { title: "Assinaturas", url: "/admin/assinaturas", icon: CreditCard },
  { title: "Biblioteca", url: "/admin/biblioteca", icon: Library },
  { title: "Drives", url: "/admin/drives", icon: HardDrive },
  { title: "Planos", url: "/admin/planos", icon: BadgeDollarSign },
  { title: "Repertórios", url: "/admin/repertorios", icon: FolderOpen },
  { title: "PDFs", url: "/admin/pdfs", icon: FileText },
  { title: "Financeiro", url: "/admin/financeiro", icon: DollarSign },
  { title: "Site", url: "/admin/site", icon: Settings },
  { title: "Pixels", url: "/admin/pixels", icon: Target },
  { title: "Notificações", url: "/admin/notificacoes", icon: Bell },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <NavLink to="/admin" className="flex items-center gap-2 text-primary">
          <Music2 className="h-7 w-7" />
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight text-foreground">
              Admin
            </span>
          )}
        </NavLink>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/60 text-xs uppercase tracking-widest">
            Painel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
