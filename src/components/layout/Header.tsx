import { Search, Bell, ArrowLeft, Crown, Clock, Megaphone, User, LogOut, CreditCard, CheckCheck, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAssinatura, useAuth, useProfile } from "@/hooks/useUser";
import { useNotificacoes, useUnreadCount, useMarkAllRead } from "@/hooks/useNotificacoes";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: assinatura, isLoading: loadingAssinatura } = useAssinatura(user?.id);
  const { data: profile } = useProfile(user?.id);
  const { data: notificacoes } = useNotificacoes();
  const unreadCount = useUnreadCount();
  const markAllRead = useMarkAllRead();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        try {
          const { data, error } = await supabase
            .from("musicas" as any)
            .select("id, title, artist, cover_url, file_url, drive_id")
            .or(`title.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%`)
            .limit(10);
          
          if (!error) {
            setSearchResults(data || []);
            setShowResults(true);
          }
        } catch (err) {
          console.error("Search error:", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const showBack = location.pathname !== "/" && location.pathname !== "/dashboard";

  const userInitial = profile?.name?.charAt(0)?.toUpperCase() || "U";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const notifIcon = (type: string) => {
    if (type === "assinatura_expirando") return <Clock className="h-4 w-4 text-yellow-500 shrink-0" />;
    return <Megaphone className="h-4 w-4 text-primary shrink-0" />;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="relative flex-1 sm:flex-none" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar músicas, artistas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
            className="w-64 border-border/50 bg-secondary pl-9 pr-9 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary lg:w-80"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showResults && (
            <div className="absolute top-full mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="max-h-[400px] overflow-y-auto p-2">
                {isSearching ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resultados</p>
                    {searchResults.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setShowResults(false);
                          setSearchTerm("");
                          navigate(`/musica/${track.id}`); 
                        }}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {track.cover_url ? (
                            <img src={track.cover_url} alt={track.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Search className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{track.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma música encontrada
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!loadingAssinatura && (
          assinatura ? (
            <Badge className="gap-1.5 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
              <Crown className="h-3.5 w-3.5" />
              {assinatura.plan.charAt(0).toUpperCase() + assinatura.plan.slice(1)}
            </Badge>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10" onClick={() => navigate("/ofertas")}>
              <Crown className="h-3.5 w-3.5" />
              Assinar
            </Button>
          )
        )}

        {/* Notificações Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h4 className="text-sm font-semibold">Notificações</h4>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto gap-1 px-2 py-1 text-xs text-muted-foreground"
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="h-3 w-3" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {!notificacoes?.length ? (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Bell className="mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                </div>
              ) : (
                notificacoes.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 border-b border-border/50 p-3 last:border-0 ${!n.read ? "bg-accent/30" : ""}`}
                  >
                    <div className="mt-0.5">{notifIcon(n.type)}</div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Menu do Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent transition-all hover:ring-primary/50">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary/20 text-sm text-primary">
                {userInitial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.name || "Usuário"}</p>
                <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/conta")} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Minha Conta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/ofertas")} className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              Assinatura
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
