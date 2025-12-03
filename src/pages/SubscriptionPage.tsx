import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Lock, Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    // AQUI É ONDE ENTRA A INTEGRAÇÃO COM O STRIPE
    // Em produção, você chamaria uma Edge Function para criar o checkout do Stripe.
    // Por enquanto, vou SIMULAR que o pagamento deu certo para você testar a lógica.
    
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ATENÇÃO: Isso é apenas para teste. Em produção, isso deve ser feito via Webhook do Stripe (backend).
        await supabase.from('profiles').update({ subscription_status: 'active' }).eq('user_id', user.id);
        
        toast({ title: "Assinatura Ativada!", description: "Obrigado por assinar o FinancePro." });
        window.location.href = "/dashboard"; // Recarrega para atualizar o estado
      }
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Seu período de teste acabou</h1>
          <p className="text-muted-foreground">
            Para continuar organizando sua vida financeira e ter acesso a todos os recursos, torne-se Premium.
          </p>
        </div>

        <Card className="border-2 border-primary shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
            PREÇO ÚNICO
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">Plano Premium</CardTitle>
            <CardDescription>Acesso ilimitado a tudo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">R$ 5,00</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            
            <ul className="space-y-3 pt-4">
              {[
                "Controle ilimitado de transações",
                "Gráficos e Relatórios Avançados",
                "Inteligência Artificial (AI Advisor)",
                "Gestão de Cartões e Assinaturas",
                "Suporte Prioritário"
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90" 
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? "Processando..." : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Assinar Agora
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full">
              <LogOut className="h-4 w-4 mr-2" /> Sair da conta
            </Button>
          </CardFooter>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground">
          Pagamento seguro. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}