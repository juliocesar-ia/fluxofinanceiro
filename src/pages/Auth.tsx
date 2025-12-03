import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Wallet, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Reset Password State
  const [resetEmail, setResetEmail] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "https://fluxofinanceiro-h5lu.vercel.app/email-confirmed",
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast({ title: "Cadastro realizado!", description: "Verifique seu e-mail." });
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: "https://fluxofinanceiro-h5lu.vercel.app/dashboard/settings", // Redireciona para settings para trocar a senha
    });
    
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Email enviado", description: "Verifique sua caixa de entrada." });
      setIsResetOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-background to-background" />
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-5 w-5" /><span>Voltar</span>
      </Link>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl text-foreground">FinanceControl</span>
        </div>

        <Card className="p-8 shadow-xl">
          <div className="flex gap-2 p-1 bg-muted rounded-lg mb-8">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Entrar</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Cadastrar</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2"><Label htmlFor="name">Nome Completo</Label><Input id="name" name="name" placeholder="Seu nome" required={!isLogin} className="h-11" /></div>
            )}
            <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" placeholder="seu@email.com" required className="h-11" /></div>
            <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" placeholder="******" required minLength={6} className="h-11" /></div>

            <Button type="submit" size="lg" className="w-full h-12 bg-gradient-to-r from-primary to-primary/90" disabled={isLoading}>
              {isLoading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta Grátis"}
            </Button>

            {isLogin && (
              <div className="text-center">
                <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="text-sm text-muted-foreground hover:text-primary transition-colors">Esqueci minha senha</button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recuperar Senha</DialogTitle>
                      <DialogDescription>Digite seu e-mail para receber um link de redefinição.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="seu@email.com" />
                      </div>
                      <Button type="submit" className="w-full">Enviar Link</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}