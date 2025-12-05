import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { loading, hasAccess } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !hasAccess) {
      // Tenta redirecionar automaticamente
      navigate("/subscription");
    }
  }, [loading, hasAccess, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">Verificando permissões...</p>
      </div>
    );
  }

  // Se não tem acesso, mostra a tela de bloqueio (fallback visual da tela branca)
  if (!hasAccess) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-destructive/50">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Acesso Bloqueado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Seu período de teste acabou ou sua assinatura expirou.
            </p>
            <Button onClick={() => window.location.href = "/subscription"} className="w-full">
              Ir para Pagamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}