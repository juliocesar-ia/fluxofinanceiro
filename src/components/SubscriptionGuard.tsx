import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2 } from "lucide-react";

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { loading, hasAccess } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !hasAccess) {
      navigate("/subscription"); // Redireciona para o pagamento
    }
  }, [loading, hasAccess, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Verificando assinatura...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Não renderiza nada enquanto redireciona
  }

  return <>{children}</>;
}