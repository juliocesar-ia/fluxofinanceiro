import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2 } from "lucide-react";

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { loading, hasAccess } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Se terminou de carregar E não tem acesso, chuta para o pagamento
    if (!loading && !hasAccess) {
      console.log("GUARD: Acesso negado. Redirecionando para /subscription");
      // Salva de onde ele veio para voltar depois (opcional)
      navigate("/subscription", { replace: true });
    }
  }, [loading, hasAccess, navigate]);

  // Enquanto carrega, mostra tela de loading
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">Verificando assinatura...</p>
      </div>
    );
  }

  // Se não tem acesso, retorna null (o useEffect vai redirecionar)
  // Isso evita "piscar" o conteúdo protegido
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}