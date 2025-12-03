import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Lock, Sparkles, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ⚠️ SUBSTITUA PELO ID DO SEU PREÇO NO STRIPE (Ex: price_1Pxyz...)
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

      // Chama a Edge Function 'subscribe'
      const { data, error } = await supabase.functions.invoke('subscribe', {
        body: { priceId: STRIPE_PRICE_ID },
      });

      if (error) throw error;

      if (data?.url) {
        // Redireciona o usuário para o Checkout do Stripe
        window.location.href = data.url;
      } else {
        throw new Error("URL de pagamento não retornada");
      }
      
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Erro ao iniciar assinatura", 
        description: "Tente novamente mais tarde ou contate o suporte.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Acesso Premium Necessário</h1>
          <p className="text-muted-foreground">
            Seu período gratuito acabou. Assine para continuar controlando suas finanças com inteligência.
          </p>
        </div>

        <Card className="border-2 border-primary shadow-2xl relative overflow-hidden transform hover:scale-105 transition-transform duration-300">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-orange-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-sm">
            MAIS POPULAR
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">FinancePro Premium</CardTitle>
            <CardDescription>Plano completo mensal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold tracking-tight">R$ 5,00</span>
              <span className="text-muted-foreground font-medium">/mês</span>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                <p className="text-sm font-medium text-primary flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> 3 Dias de Teste Grátis Inclusos
                </p>
            </div>

            <ul className="space-y-3">
              {[
                "Dashboard Completo & Ilimitado",
                "Inteligência Artificial (AI Advisor)",
                "Gestão de Múltiplos Cartões",
                "Relatórios em PDF e Excel",
                "Suporte Prioritário no WhatsApp"
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex-col gap-4 pt-2">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 font-bold text-lg h-12 shadow-lg hover:shadow-primary/25 transition-all" 
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Redirecionando...
                </>
              ) : (
                "Assinar Agora"
              )}
            </Button>
            <div className="flex items-center justify-between w-full text-xs text-muted-foreground px-2">
               <span>Cancelamento fácil</span>
               <span className="h-1 w-1 bg-muted-foreground rounded-full"></span>
               <span>Pagamento Seguro via Stripe</span>
            </div>
          </CardFooter>
        </Card>
        
        <div className="text-center">
            <Button variant="link" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Sair da conta e voltar depois
            </Button>
        </div>
      </div>
    </div>
  );
}