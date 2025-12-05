import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, Lock, Sparkles, LogOut, Loader2, TrendingUp, 
  Calendar, PieChart, Target, Wallet, TrendingDown, BarChart3, 
  Smartphone, Shield, ArrowLeft 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STRIPE_PRICE_ID = "price_SEU_ID_AQUI"; // Substitua se tiver

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      // Tenta Checkout via Function, se falhar avisa
      try {
        const { data, error } = await supabase.functions.invoke('subscribe', {
            body: { priceId: STRIPE_PRICE_ID },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
      } catch (e) {
         console.error(e);
         toast({ title: "Erro de Pagamento", description: "Sistema de pagamento em manutenção (Modo Demo).", variant: "destructive" });
      }
      
    } catch (error: any) {
      toast({ title: "Erro", description: "Erro de sessão.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative">
      
      {/* Botão de Voltar */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50">
        <Link to="/dashboard">
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" /> 
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>

      <div className="max-w-lg w-full space-y-8 animate-in fade-in zoom-in duration-500">
        
        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Seja Premium</h1>
          <p className="text-muted-foreground">
            Desbloqueie todo o potencial do FinancePro.
          </p>
        </div>

        <Card className="border-2 border-primary shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-orange-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-sm">
            ACESSO TOTAL
          </div>
          
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-2xl">FinancePro Premium</CardTitle>
            <CardDescription>Acesso vitalício a todas as ferramentas.</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-extrabold tracking-tight">R$ 5,00</span>
              <span className="text-muted-foreground font-medium">/mês</span>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 text-center">
                <p className="text-sm font-medium text-primary">
                   Cancele quando quiser. Sem taxas ocultas.
                </p>
            </div>

            {/* Lista manual para evitar erros de renderização */}
            <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600"><TrendingDown className="h-4 w-4" /></div>
                    <span className="font-medium">Gestão de Dívidas (Bola de Neve)</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600"><BarChart3 className="h-4 w-4" /></div>
                    <span className="font-medium">Comparativo de Mercado</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600"><TrendingUp className="h-4 w-4" /></div>
                    <span className="font-medium">Investimentos e Patrimônio</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600"><Calendar className="h-4 w-4" /></div>
                    <span className="font-medium">Calendário Inteligente</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600"><Smartphone className="h-4 w-4" /></div>
                    <span className="font-medium">App Mobile (PWA)</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600"><Shield className="h-4 w-4" /></div>
                    <span className="font-medium">Modo Privacidade</span>
                </div>
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600"><Target className="h-4 w-4" /></div>
                    <span className="font-medium">Planejamento de Sonhos</span>
                </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex-col gap-4 pt-4 bg-muted/30">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 font-bold text-lg h-14 shadow-lg" 
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Assinar Agora"}
            </Button>
            
            <div className="flex items-center justify-center w-full text-xs text-muted-foreground gap-4">
               <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Pagamento Seguro</span>
            </div>
          </CardFooter>
        </Card>
        
        <div className="text-center">
            <Button variant="link" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Sair da conta
            </Button>
        </div>
      </div>
    </div>
  );
}