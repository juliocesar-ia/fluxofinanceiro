import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, Wallet, CreditCard, PieChart, 
  Target, Settings, LogOut, Menu, Bell, Repeat, Calendar, TrendingUp,
  BrainCircuit, Calculator // <--- NOVOS ÍCONES
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ModeToggle } from "./ModeToggle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Visão Geral", path: "/dashboard" },
    { icon: BrainCircuit, label: "AI Advisor", path: "/dashboard/advisor" }, // <--- DESTAQUE PARA IA
    { icon: Wallet, label: "Transações", path: "/dashboard/transactions" },
    { icon: Calculator, label: "Planejamento", path: "/dashboard/planning" }, // <--- NOVO
    { icon: Calendar, label: "Calendário", path: "/dashboard/calendar" },
    { icon: CreditCard, label: "Cartões e Contas", path: "/dashboard/cards" },
    { icon: TrendingUp, label: "Investimentos", path: "/dashboard/investments" },
    { icon: Repeat, label: "Assinaturas", path: "/dashboard/subscriptions" },
    { icon: Target, label: "Metas", path: "/dashboard/goals" },
    { icon: PieChart, label: "Relatórios", path: "/dashboard/reports" },
    { icon: Settings, label: "Configurações", path: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar Desktop */}
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
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className={`h-4 w-4 ${isSidebarOpen && 'mr-2'}`} />
            {isSidebarOpen && "Sair"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        {/* Header */}
        <header className="h-16 bg-card/50 backdrop-blur border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold capitalize">
              {menuItems.find(i => i.path === location.pathname)?.label || "Dashboard"}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>US</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}