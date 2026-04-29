import { Library, Heart, User, Tag, LogOut, FolderOpen, FileText, Gift } from "lucide-react";
import logo from "@/assets/logo.jpeg";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useUser";

const menuItems = [
  { title: "Biblioteca", url: "/biblioteca", icon: Library },
  { title: "Meus Repertórios", url: "/repertorios", icon: FolderOpen },
  { title: "PDFs", url: "/pdfs", icon: FileText },
  { title: "Favoritos", url: "/favoritos", icon: Heart },
  { title: "Assinatura", url: "/ofertas", icon: Tag },
  { title: "Indicações", url: "/indicacoes", icon: Gift },
  { title: "Conta", url: "/conta", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <NavLink to="/" className="flex items-center gap-2">
          <img
            src={logo}
            alt="Repertório Música e Pinga"
            className="h-9 w-9 rounded-lg object-cover shrink-0"
          />
          {!collapsed && (
            <span className="text-base font-bold tracking-tight text-foreground leading-tight">
              Música e Pinga
            </span>
          )}
        </NavLink>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/60 text-xs uppercase tracking-widest">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="h-5 w-5 shrink-0 text-muted-foreground" />
              {!collapsed && <span className="text-muted-foreground">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
