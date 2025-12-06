import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2, Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { loading, hasAccess } = useSubscription();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">Carregando...</p>
      </div>
    );
  }

  // Se NÃO tem acesso, mostra o bloqueio visual (sem redirecionar, para evitar loops)
  if (!hasAccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-destructive/50 shadow-2xl">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Acesso Bloqueado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Seu período gratuito encerrou.
            </p>
            <Button 
              size="lg" 
              className="w-full font-bold" 
              onClick={() => navigate("/subscription")}
            >
              Ver Planos e Liberar
            </Button>
            <Button 
              variant="link" 
              className="text-xs text-muted-foreground hover:text-destructive gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-3 w-3" /> Sair da conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se tem acesso, renderiza o conteúdo normal
  return <>{children}</>;
}