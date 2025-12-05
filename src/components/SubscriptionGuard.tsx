import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client"; // <--- Importar Supabase

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { loading, hasAccess } = useSubscription();
  const navigate = useNavigate();

  // Função de Logout Real
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  useEffect(() => {
    if (!loading && !hasAccess) {
      // Opcional: Se quiser forçar a URL a mudar para /subscription visualmente
      // navigate("/subscription"); 
      // Mas manteremos o bloqueio visual aqui mesmo para evitar loops
    }
  }, [loading, hasAccess, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">Verificando acesso...</p>
      </div>
    );
  }

  // Tela de Bloqueio (Paywall)
  if (!hasAccess) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background p-4 animate-fade-in">
        <Card className="w-full max-w-md text-center border-destructive/50 shadow-2xl">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Acesso Bloqueado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Seu período de teste gratuito encerrou ou sua assinatura expirou.
            </p>
            <div className="bg-secondary/50 p-4 rounded-lg text-sm">
              <p>Para continuar acessando seus dados e usando a plataforma, ative o plano Premium.</p>
            </div>
            <Button 
              size="lg" 
              className="w-full font-bold" 
              onClick={() => navigate("/subscription")}
            >
              Ver Planos e Liberar Acesso
            </Button>
            
            {/* Botão de Sair Corrigido */}
            <Button 
              variant="link" 
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={handleLogout} 
            >
              Sair da conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}