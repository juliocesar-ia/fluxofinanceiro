import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Wallet } from "lucide-react";

export default function EmailConfirmation() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Background Pattern igual ao da tela de Auth */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-background to-background" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl text-foreground">FinanceControl</span>
        </div>

        <Card className="p-8 shadow-xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-scale-in">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-3 text-foreground">
            E-mail Confirmado!
          </h1>
          
          <p className="text-muted-foreground mb-8">
            Sua conta foi verificada com sucesso. Você já pode acessar a plataforma e organizar suas finanças.
          </p>

          <Link to="/auth">
            <Button
              size="lg"
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 text-base font-semibold hover:opacity-90 transition-opacity"
            >
              Fazer Login
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}