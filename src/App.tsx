import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import SubscriptionGuard from "@/components/SubscriptionGuard"; // <--- NOVO

// Páginas
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TransactionsPage from "./pages/Transactions";
import AccountsPage from "./pages/Accounts";
import SubscriptionsPage from "./pages/Subscriptions";
import GoalsPage from "./pages/Goals";
import ReportsPage from "./pages/Reports";
import CalendarPage from "./pages/Calendar";
import InvestmentsPage from "./pages/Investments";
import SettingsPage from "./pages/Settings";
import PlanningPage from "./pages/Planning";
import NotFound from "./pages/NotFound";
import EmailConfirmation from "./pages/EmailConfirmation";
import SubscriptionPage from "./pages/SubscriptionPage"; // <--- NOVO

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas Públicas (Não precisam de pagamento) */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/email-confirmed" element={<EmailConfirmation />} />
            <Route path="/subscription" element={<SubscriptionPage />} /> {/* <--- Tela de Pagamento */}
            
            {/* Rotas Protegidas (Precisam de Login E Assinatura) */}
            <Route path="/dashboard" element={<SubscriptionGuard><Dashboard /></SubscriptionGuard>} />
            <Route path="/dashboard/transactions" element={<SubscriptionGuard><TransactionsPage /></SubscriptionGuard>} />
            <Route path="/dashboard/cards" element={<SubscriptionGuard><AccountsPage /></SubscriptionGuard>} />
            <Route path="/dashboard/subscriptions" element={<SubscriptionGuard><SubscriptionsPage /></SubscriptionGuard>} />
            <Route path="/dashboard/goals" element={<SubscriptionGuard><GoalsPage /></SubscriptionGuard>} />
            <Route path="/dashboard/reports" element={<SubscriptionGuard><ReportsPage /></SubscriptionGuard>} />
            <Route path="/dashboard/calendar" element={<SubscriptionGuard><CalendarPage /></SubscriptionGuard>} />
            <Route path="/dashboard/investments" element={<SubscriptionGuard><InvestmentsPage /></SubscriptionGuard>} />
            <Route path="/dashboard/settings" element={<SubscriptionGuard><SettingsPage /></SubscriptionGuard>} />
            <Route path="/dashboard/planning" element={<SubscriptionGuard><PlanningPage /></SubscriptionGuard>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;