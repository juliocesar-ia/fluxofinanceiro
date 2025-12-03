import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, Wallet, CreditCard, PieChart, 
  Target, Settings, LogOut, Menu, Bell, Repeat, Calendar, TrendingUp,
  Calculator, User, X // Removi o BrainCircuit daqui
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ModeToggle } from "./ModeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
    fetchNotifications();
    
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      setUserProfile(data || { full_name: user.email });
    }
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Visão Geral", path: "/dashboard" },
    // Removi o item da IA aqui
    { icon: Wallet, label: "Transações", path: "/dashboard/transactions" },
    { icon: Calculator, label: "Planejamento", path: "/dashboard/planning" },
    { icon: Calendar, label: "Calendário", path: "/dashboard/calendar" },
    { icon: CreditCard, label: "Cartões e Contas", path: "/dashboard/cards" },
    { icon: TrendingUp, label: "Investimentos", path: "/dashboard/investments" },
    { icon: Repeat, label: "Assinaturas", path: "/dashboard/subscriptions" },
    { icon: Target, label: "Metas", path: "/dashboard/goals" },
    { icon: PieChart, label: "Relatórios", path: "/dashboard/reports" },
    { icon: Settings, label: "Configurações", path: "/dashboard/settings" },
  ];

  const NavigationContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center justify-center border-b border-border">
        <span className="text-xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
          FinancePro
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Button 
              variant={location.pathname === item.path ? "secondary" : "ghost"} 
              className="w-full justify-start"
            >
              <item.icon className="h-5 w-5 mr-2" />
              <span>{item.label}</span>
            </Button>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
           <span className="text-xs text-muted-foreground">Tema</span>
           <ModeToggle />
        </div>
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col`}
      >
        <div className="h-16 flex items-center justify-center border-b border-border">
          {isSidebarOpen ? (
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">FinancePro</span>
          ) : (
             <span className="text-xl font-bold text-primary">FP</span>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button 
                variant={location.pathname === item.path ? "secondary" : "ghost"} 
                className={`w-full justify-start ${!isSidebarOpen && 'justify-center px-0'}`}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <item.icon className={`h-5 w-5 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && <span>{item.label}</span>}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
             {isSidebarOpen && <span className="text-xs text-muted-foreground">Tema</span>}
             <ModeToggle />
          </div>
          {isSidebarOpen && (
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          )}
        </div>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'} w-full`}>
        <header className="h-16 bg-card/50 backdrop-blur border-b border-border flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <NavigationContent />
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex">
              <Menu className="h-5 w-5" />
            </Button>

            <h1 className="text-lg font-semibold capitalize truncate max-w-[150px] sm:max-w-none">
              {menuItems.find(i => i.path === location.pathname)?.label || "Dashboard"}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 mr-2" align="end">
                <div className="p-4 border-b font-semibold flex justify-between items-center">
                  Notificações
                  {unreadCount > 0 && <Badge variant="secondary">{unreadCount} novas</Badge>}
                </div>
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Nenhuma notificação.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!notif.read ? 'bg-primary/5' : ''}`}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-sm font-medium leading-none">{notif.title}</h4>
                            {!notif.read && <div className="h-2 w-2 bg-primary rounded-full" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notif.message}</p>
                          <span className="text-[10px] text-muted-foreground/60 mt-2 block">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {userProfile?.full_name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">{userProfile?.full_name || "Usuário"}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      Minha Conta
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto w-full max-w-[100vw] overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}