import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";

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
// Removido o import do AIAdvisor

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/email-confirmed" element={<EmailConfirmation />} />
            
            {/* Rotas do Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/transactions" element={<TransactionsPage />} />
            <Route path="/dashboard/cards" element={<AccountsPage />} />
            <Route path="/dashboard/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/dashboard/goals" element={<GoalsPage />} />
            <Route path="/dashboard/reports" element={<ReportsPage />} />
            <Route path="/dashboard/calendar" element={<CalendarPage />} />
            <Route path="/dashboard/investments" element={<InvestmentsPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/planning" element={<PlanningPage />} />
            
            {/* Removida a rota /dashboard/advisor */}
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;