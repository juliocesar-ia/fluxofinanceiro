import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Lock, Sparkles, LogOut, Loader2, TrendingUp, Calendar, PieChart, Target, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ⚠️ SUBSTITUA PELO ID DO SEU PREÇO NO STRIPE
const STRIPE_PRICE_ID = "price_1Sa6PuCFnHZiIXy4ymDpUuLF";

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
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke('subscribe', {
        body: { priceId: STRIPE_PRICE_ID },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de pagamento não retornada");
      }
      
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Erro ao iniciar assinatura", 
        description: "Tente novamente mais tarde.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Wallet, text: "Gestão Ilimitada de Contas e Cartões" },
    { icon: PieChart, text: "Planejamento Mensal e Orçamentos" },
    { icon: TrendingUp, text: "Módulo de Investimentos e Ativos" },
    { icon: Calendar, text: "Calendário Financeiro Inteligente" },
    { icon: Target, text: "Controle de Metas e Objetivos" },
    { icon: Sparkles, text: "Relatórios Avançados (PDF e Excel)" },
    { icon: CheckCircle, text: "Gestão de Assinaturas Recorrentes" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-8 animate-fade-in">
        
        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Desbloqueie seu Potencial Financeiro</h1>
          <p className="text-muted-foreground">
            O período de teste acabou. Assine o Premium para continuar organizando sua vida financeira com as melhores ferramentas do mercado.
          </p>
        </div>

        <Card className="border-2 border-primary shadow-2xl relative overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-orange-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-sm">
            ACESSO TOTAL
          </div>
          
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-2xl">FinancePro Premium</CardTitle>
            <CardDescription>Tudo o que você precisa em um só lugar.</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-extrabold tracking-tight">R$ 5,00</span>
              <span className="text-muted-foreground font-medium">/mês</span>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 text-center">
                <p className="text-sm font-medium text-primary">
                    Cancele a qualquer momento sem taxas.
                </p>
            </div>

            <div className="grid gap-3">
              {features.map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-sm group">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <item.icon className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
          
          <CardFooter className="flex-col gap-4 pt-4 bg-muted/30">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 font-bold text-lg h-14 shadow-lg hover:shadow-primary/25 transition-all" 
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Redirecionando...
                </>
              ) : (
                "Assinar Agora e Liberar Acesso"
              )}
            </Button>
            
            <div className="flex items-center justify-center w-full text-xs text-muted-foreground gap-4">
               <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Pagamento Seguro</span>
               <span className="h-1 w-1 bg-muted-foreground rounded-full"></span>
               <span>Suporte via E-mail</span>
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