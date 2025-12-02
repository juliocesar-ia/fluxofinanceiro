import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    // Verifica se já existe sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta!",
        });
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: name,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Cadastro realizado!",
          description: "Sua conta foi criada com sucesso. Aproveite os 5 dias grátis!",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-background to-background" />
      
      {/* Back Button */}
      <Link 
        to="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Voltar</span>
      </Link>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl text-foreground">FinanceControl</span>
        </div>

        <Card className="p-8 shadow-xl">
          {/* Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                isLogin
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                !isLogin
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Seu nome"
                  required={!isLogin}
                  className="h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="h-11"
              />
            </div>

            {!isLogin && (
              <div className="bg-accent/50 rounded-lg p-3 text-sm text-accent-foreground">
                🎉 Ao se cadastrar, você ganha <strong>5 dias grátis</strong> para testar todas as funcionalidades!
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading
                ? "Carregando..."
                : isLogin
                ? "Entrar"
                : "Criar Conta Grátis"}
            </Button>

            {isLogin && (
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Ao continuar, você concorda com nossos{" "}
          <a href="#" className="text-primary hover:underline">
            Termos de Uso
          </a>{" "}
          e{" "}
          <a href="#" className="text-primary hover:underline">
            Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  );
}