import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, Smartphone, Moon, Sun, Monitor, Upload, Loader2, Tag, Plus, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  // Estados Perfil
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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

  // --- CATEGORIAS ---
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

  const handleSeedCategories = async () => {
    setLoading(true);
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
    
    if (error) toast({ title: "Erro ao gerar", description: "Talvez algumas já existam.", variant: "destructive" });
    else {
      toast({ title: "Categorias Padrão Criadas!" });
      fetchCategories();
    }
    setLoading(false);
  };

  // --- PERFIL & OUTROS ---
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
      { user_id: user.id, full_name: fullName, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) toast({ title: "Erro", variant: "destructive" });
    else toast({ title: "Perfil atualizado!" });
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (password !== confirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: password });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Senha atualizada!" });
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="appearance">Visual</TabsTrigger>
          </TabsList>

          {/* --- ABA CATEGORIAS (NOVA) --- */}
          <TabsContent value="categories" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Gerenciar Categorias</CardTitle>
                  <CardDescription>Crie rótulos para organizar suas transações.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleSeedCategories} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Restaurar Padrões
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Form Nova Categoria */}
                <form onSubmit={handleCreateCategory} className="flex gap-4 items-end p-4 bg-muted/30 rounded-lg border">
                  <div className="flex-1 space-y-2">
                    <Label>Nome</Label>
                    <Input placeholder="Ex: Mercado" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
                  </div>
                  <div className="w-[140px] space-y-2">
                    <Label>Tipo</Label>
                    <Select value={newCatType} onValueChange={(v: any) => setNewCatType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[100px] space-y-2">
                    <Label>Cor</Label>
                    <Input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="h-10 p-1 cursor-pointer" />
                  </div>
                  <Button type="submit"><Plus className="h-4 w-4" /></Button>
                </form>

                {/* Lista de Categorias */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">{cat.type === 'expense' ? 'Despesa' : 'Receita'}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="col-span-2 text-center text-muted-foreground py-8">Nenhuma categoria encontrada.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- ABA PERFIL --- */}
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

          {/* --- ABA SEGURANÇA --- */}
          <TabsContent value="security" className="mt-6 space-y-6">
             <Card>
                <CardHeader>
                   <CardTitle>Alterar Senha</CardTitle>
                   <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
                </CardHeader>
                <CardContent>
                   <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                         <Label htmlFor="password">Nova Senha</Label>
                         <Input id="password" name="password" type="password" placeholder="Digite a nova senha" required />
                      </div>
                      <div className="space-y-2">
                         <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                         <Input id="confirm_password" name="confirm_password" type="password" placeholder="Confirme a senha" required />
                      </div>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Atualizando..." : "Atualizar Senha"}
                      </Button>
                   </form>
                </CardContent>
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
                      Em breve disponível.
                    </div>
                  </div>
                  <Switch disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- ABA VISUAL --- */}
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