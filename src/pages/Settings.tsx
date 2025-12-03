import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, Lock, Smartphone, Moon, Sun, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  // Estados de Formulário
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setEmail(user.email || "");
      
      // Buscar perfil na tabela (se existir) ou metadata
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (profile) setFullName(profile.full_name || "");
      else setFullName(user.user_metadata.full_name || "");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Atualiza tabela profiles
    const { error } = await supabase.from('profiles').upsert({ 
      user_id: user.id, 
      full_name: fullName,
      updated_at: new Date()
    });

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado com sucesso!" });
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newPassword = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: "Erro ao trocar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!", description: "Use a nova senha no próximo login." });
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta, segurança e preferências.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
          </TabsList>

          {/* --- PERFIL --- */}
          <TabsContent value="profile" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize seus dados de identificação.</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src="" />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {fullName?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <Button type="button" variant="outline" size="sm">Alterar Foto</Button>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" value={email} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar Alterações"}</Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* --- SEGURANÇA --- */}
          <TabsContent value="security" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Mantenha sua conta segura com uma senha forte.</CardDescription>
              </CardHeader>
              <form onSubmit={handlePasswordChange}>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current">Nova Senha</Label>
                    <Input id="current" name="password" type="password" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new">Confirmar Nova Senha</Label>
                    <Input id="new" name="confirm_password" type="password" required />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" variant="secondary" disabled={loading}>Atualizar Senha</Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Autenticação de Dois Fatores (2FA)
                </CardTitle>
                <CardDescription>Adicione uma camada extra de segurança.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="font-medium flex items-center gap-2">
                      <Smartphone className="h-4 w-4" /> Aplicativo Autenticador
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Use Google Authenticator ou Authy.
                    </div>
                  </div>
                  <Switch 
                    checked={is2FAEnabled} 
                    onCheckedChange={(v) => {
                      setIs2FAEnabled(v);
                      toast({ title: v ? "2FA Habilitado (Simulação)" : "2FA Desativado", description: "Esta é uma demonstração visual." });
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- APARÊNCIA --- */}
          <TabsContent value="appearance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Tema do Sistema</CardTitle>
                <CardDescription>Escolha como o FinancePro se parece para você.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-muted/50 ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-transparent'}`} onClick={() => setTheme('light')}>
                    <Sun className="h-8 w-8" />
                    <span className="font-medium">Claro</span>
                  </div>
                  <div className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-muted/50 ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-transparent'}`} onClick={() => setTheme('dark')}>
                    <Moon className="h-8 w-8" />
                    <span className="font-medium">Escuro</span>
                  </div>
                  <div className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-muted/50 ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-transparent'}`} onClick={() => setTheme('system')}>
                    <Monitor className="h-8 w-8" />
                    <span className="font-medium">Sistema</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}