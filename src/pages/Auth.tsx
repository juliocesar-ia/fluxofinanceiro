import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Wallet, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [resetEmail, setResetEmail] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  const validations = [
    { label: "Mínimo 8 caracteres", valid: password.length >= 8 },
    { label: "Letra maiúscula", valid: /[A-Z]/.test(password) },
    { label: "Letra minúscula", valid: /[a-z]/.test(password) },
    { label: "Número", valid: /[0-9]/.test(password) },
  ];

  const isPasswordValid = validations.every((v) => v.valid);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isLogin && !isPasswordValid) {
      toast({ title: "Senha Fraca", description: "Atenda aos requisitos de segurança.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
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
      redirectTo: "https://fluxofinanceiro-h5lu.vercel.app/dashboard/settings",
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
          <span className="font-bold text-2xl text-foreground">FinancePro</span>
        </div>

        <Card className="p-8 shadow-xl">
          <div className="flex gap-2 p-1 bg-muted rounded-lg mb-8">
            <button onClick={() => { setIsLogin(true); setPassword(""); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Entrar</button>
            <button onClick={() => { setIsLogin(false); setPassword(""); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Cadastrar</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2"><Label htmlFor="name">Nome Completo</Label><Input id="name" name="name" placeholder="Seu nome" required={!isLogin} className="h-11" /></div>
            )}
            <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" placeholder="seu@email.com" required className="h-11" /></div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="******" required className="h-11 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2 bg-muted/30 p-3 rounded-md border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Requisitos da senha:</p>
                <div className="grid grid-cols-1 gap-1">
                  {validations.map((v, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs ${v.valid ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                      {v.valid ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                      <span>{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full h-12 bg-gradient-to-r from-primary to-primary/90" disabled={isLoading || (!isLogin && !isPasswordValid)}>
              {isLoading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta Grátis"}
            </Button>

            {/* --- LINKS LEGAIS (NOVO) --- */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Ao continuar, você concorda com nossos <Link to="/terms" className="underline hover:text-primary">Termos de Uso</Link> e <Link to="/privacy" className="underline hover:text-primary">Política de Privacidade</Link>.
            </p>

            {isLogin && (
              <div className="text-center mt-2">
                <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="text-sm text-muted-foreground hover:text-primary transition-colors">Esqueci minha senha</button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Recuperar Senha</DialogTitle><DialogDescription>Link de redefinição.</DialogDescription></DialogHeader>
                    <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                      <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required /></div>
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