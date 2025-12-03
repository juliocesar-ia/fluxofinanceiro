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
import { User, Shield, Smartphone, Moon, Sun, Monitor, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  // Estados
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setEmail(user.email || "");
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (profile) {
        setFullName(profile.full_name || "");
        setAvatarUrl(profile.avatar_url);
      } else {
        setFullName(user.user_metadata.full_name || "");
      }
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      // Upload para Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pegar URL Pública
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Atualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, avatar_url: publicUrl, updated_at: new Date() });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({ title: "Foto atualizada com sucesso!" });
      
      // Forçar recarregamento da página para atualizar o header (solução simples)
      setTimeout(() => window.location.reload(), 1000);

    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from('profiles').upsert({ 
      user_id: user.id, 
      full_name: fullName,
      updated_at: new Date()
    });

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil atualizado!" });
    
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seus Dados</CardTitle>
                <CardDescription>Gerencie sua foto e nome.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                    <AvatarImage src={avatarUrl || ""} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {fullName?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="picture" className="cursor-pointer">
                      <div className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploading ? "Enviando..." : "Alterar Foto"}
                      </div>
                      <Input 
                        id="picture" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                      />
                    </Label>
                    <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Max 2MB.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Nome Completo</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>E-mail</Label>
                    <Input value={email} disabled className="bg-muted" />
                  </div>
                  <Button type="submit" disabled={loading}>Salvar Dados</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ... Conteúdos de Segurança e Aparência (iguais ao anterior, mantidos por completude) ... */}
          <TabsContent value="security" className="mt-6">
             <Card>
                <CardHeader>
                   <CardTitle>Segurança</CardTitle>
                   <CardDescription>Proteja sua conta.</CardDescription>
                </CardHeader>
                <CardContent>
                   <p className="text-muted-foreground text-sm">Para trocar sua senha, enviamos um e-mail seguro.</p>
                   <Button variant="outline" className="mt-4" onClick={() => toast({title: "Funcionalidade disponível na tela de login"})}>
                      Trocar Senha
                   </Button>
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Tema</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {['light', 'dark', 'system'].map((t) => (
                    <div key={t} className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-muted/50 ${theme === t ? 'border-primary bg-primary/5' : 'border-transparent'}`} onClick={() => setTheme(t as any)}>
                      <Monitor className="h-8 w-8" />
                      <span className="font-medium capitalize">{t}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}