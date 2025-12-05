import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Lock, Sparkles, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Substitua pelo seu ID real do Stripe
const STRIPE_PRICE_ID = "price_1Sa6PuCFnHZiIXy4ymDpUuLF";

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log("Página de Assinatura carregada!"); // Log de teste
  }, []);

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

      console.log("Iniciando checkout...");

      const { data, error } = await supabase.functions.invoke('subscribe', {
        body: { priceId: STRIPE_PRICE_ID },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de pagamento não recebida.");
      }
      
    } catch (error: any) {
      console.error("Erro pagamento:", error);
      toast({ 
        title: "Erro ao iniciar", 
        description: "Verifique o console para detalhes.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full space-y-8">
        
        <div className="text-center space-y-2">
          <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Assinatura Premium</h1>
          <p className="text-muted-foreground">
            Libere o acesso completo ao sistema.
          </p>
        </div>

        <Card className="border-primary shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Plano Mensal</CardTitle>
            <CardDescription>Tudo incluso. Cancele quando quiser.</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex justify-center items-baseline gap-1">
              <span className="text-4xl font-bold">R$ 5,00</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Gestão de Dívidas</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Comparativo de Mercado</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Gamificação e Níveis</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> App Instalável (PWA)</li>
            </ul>
          </CardContent>
          
          <CardFooter className="flex-col gap-3 pt-2">
            <Button 
              className="w-full font-bold h-11" 
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {loading ? "Processando..." : "Assinar Agora"}
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="h-4 w-4 mr-2" /> Sair da conta
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}