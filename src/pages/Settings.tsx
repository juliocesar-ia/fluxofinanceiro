import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Smartphone, Monitor, Upload, Loader2, Plus, Trash2, RefreshCw, Mail, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  // Estados Perfil
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Estados Categorias
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"income" | "expense">("expense");
  const [newCatColor, setNewCatColor] = useState("#808080");

  useEffect(() => {
    getProfile();
    fetchCategories();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setEmail(user.email || "");
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (profile) {
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setAvatarUrl(profile.avatar_url);
      } else {
        setFullName(user.user_metadata.full_name || "");
      }
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: newCatName,
      type: newCatType,
      color: newCatColor
    });

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Categoria criada!" });
      setNewCatName("");
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) { toast({ title: "Removida" }); fetchCategories(); }
  };

  // --- CORREÇÃO AQUI: LIMPAR ANTES DE CRIAR ---
  const handleSeedCategories = async () => {
    if (!confirm("Isso apagará suas categorias atuais e restaurará as originais. Continuar?")) return;
    
    setLoading(true);
    
    // 1. Apagar todas as categorias do usuário
    const { error: deleteError } = await supabase.from('categories').delete().eq('user_id', user.id);
    
    if (deleteError) {
        toast({ title: "Erro ao limpar", description: deleteError.message, variant: "destructive" });
        setLoading(false);
        return;
    }

    // 2. Criar as novas
    const defaults = [
      { name: 'Alimentação', type: 'expense', color: '#ef4444' },
      { name: 'Transporte', type: 'expense', color: '#f97316' },
      { name: 'Lazer', type: 'expense', color: '#8b5cf6' },
      { name: 'Moradia', type: 'expense', color: '#3b82f6' },
      { name: 'Saúde', type: 'expense', color: '#ef4444' },
      { name: 'Educação', type: 'expense', color: '#14b8a6' },
      { name: 'Salário', type: 'income', color: '#22c55e' },
      { name: 'Investimento', type: 'income', color: '#0ea5e9' },
    ];

    const toInsert = defaults.map(d => ({ ...d, user_id: user.id }));
    
    const { error } = await supabase.from('categories').insert(toInsert);
    
    if (error) toast({ title: "Erro ao restaurar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Categorias Padrão Restauradas!" });
      fetchCategories();
    }
    setLoading(false);
  };

  // Resto do código (Upload, Profile, Senha) mantém igual...
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Selecione uma imagem.');
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      toast({ title: "Foto atualizada!" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert(
      { user_id: user.id, full_name: fullName, phone: phone, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil atualizado!" });
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const oldPassword = formData.get("old_password") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;
    if (password !== confirmPassword) { toast({ title: "Senhas não conferem", variant: "destructive" }); setLoading(false); return; }
    if (password.length < 6) { toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres", variant: "destructive" }); setLoading(false); return; }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (loginError) { toast({ title: "Senha antiga incorreta", variant: "destructive" }); setLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password: password });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Senha atualizada!" }); (e.target as HTMLFormElement).reset(); }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="appearance">Visual</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            <Card>
              <CardHeader><CardTitle>Seus Dados</CardTitle><CardDescription>Gerencie sua identidade.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-sm"><AvatarImage src={avatarUrl || ""} /><AvatarFallback>{fullName?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="picture" className="cursor-pointer bg-secondary px-4 py-2 rounded-md text-sm">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 inline mr-2" />} Alterar Foto
                        <Input id="picture" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                    </Label>
                  </div>
                </div>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid gap-2"><Label>Nome Completo</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                  <div className="grid gap-2"><Label>E-mail</Label><Input value={email} disabled className="bg-muted" /></div>
                  <div className="grid gap-2"><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX" /></div>
                  <Button disabled={loading}>Salvar Alterações</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Gerenciar Categorias</CardTitle><CardDescription>Crie rótulos para organizar suas transações.</CardDescription></div>
                <Button variant="outline" size="sm" onClick={handleSeedCategories} disabled={loading} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Restaurar Padrões
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleCreateCategory} className="flex gap-4 items-end p-4 bg-muted/30 rounded-lg border">
                  <div className="flex-1 space-y-2"><Label>Nome</Label><Input placeholder="Ex: Mercado" value={newCatName} onChange={e => setNewCatName(e.target.value)} required /></div>
                  <div className="w-[140px] space-y-2">
                    <Label>Tipo</Label>
                    <Select value={newCatType} onValueChange={(v: any) => setNewCatType(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expense">Despesa</SelectItem><SelectItem value="income">Receita</SelectItem></SelectContent></Select>
                  </div>
                  <div className="w-[100px] space-y-2"><Label>Cor</Label><Input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="h-10 p-1 cursor-pointer" /></div>
                  <Button type="submit"><Plus className="h-4 w-4" /></Button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3"><div className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color }} /><span className="font-medium">{cat.name}</span><span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">{cat.type === 'expense' ? 'Despesa' : 'Receita'}</span></div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  {categories.length === 0 && <div className="col-span-2 text-center text-muted-foreground py-8">Nenhuma categoria encontrada.</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-6">
             <Card>
                <CardHeader><CardTitle>Trocar Senha</CardTitle><CardDescription>Use sua senha atual para validar a troca.</CardDescription></CardHeader>
                <CardContent>
                   <form onSubmit={handlePasswordChange} className="space-y-4 border p-4 rounded-lg">
                      <div className="space-y-2"><Label>Senha Antiga</Label><Input name="old_password" type="password" required placeholder="Sua senha atual" /></div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2"><Label>Nova Senha</Label><Input name="password" type="password" required /></div>
                         <div className="space-y-2"><Label>Repetir Nova</Label><Input name="confirm_password" type="password" required /></div>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full">{loading ? "Validando..." : "Atualizar Senha"}</Button>
                   </form>
                </CardContent>
             </Card>
             <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Autenticação de Dois Fatores (2FA)</CardTitle><CardDescription>Adicione uma camada extra de segurança.</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5"><div className="font-medium flex items-center gap-2"><Smartphone className="h-4 w-4" /> Aplicativo Autenticador</div><div className="text-sm text-muted-foreground">Em breve disponível.</div></div><Switch disabled />
                </div>
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
                      <Monitor className="h-8 w-8" /><span className="font-medium capitalize">{t}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legal" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Documentação</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Link to="/terms" target="_blank" className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-primary" /><div><p className="font-medium">Termos de Uso</p></div></div><ExternalLink className="h-4 w-4 text-muted-foreground" /></Link>
                <Link to="/privacy" target="_blank" className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"><div className="flex items-center gap-3"><Shield className="h-5 w-5 text-primary" /><div><p className="font-medium">Política de Privacidade</p></div></div><ExternalLink className="h-4 w-4 text-muted-foreground" /></Link>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}