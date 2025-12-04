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

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"income" | "expense">("expense");
  const [newCatColor, setNewCatColor] = useState("#808080");

  useEffect(() => { getProfile(); fetchCategories(); }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setEmail(user.email || "");
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (profile) { setFullName(profile.full_name || ""); setAvatarUrl(profile.avatar_url); } 
      else { setFullName(user.user_metadata.full_name || ""); }
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    const { error } = await supabase.from('categories').insert({ user_id: user.id, name: newCatName, type: newCatType, color: newCatColor });
    if (error) toast({ title: "Erro", variant: "destructive" });
    else { toast({ title: "Criada!" }); setNewCatName(""); fetchCategories(); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Excluir?")) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) { toast({ title: "Removida" }); fetchCategories(); }
  };

  const handleSeedCategories = async () => {
    setLoading(true);
    const defaults = [{ name: 'Alimentação', type: 'expense', color: '#ef4444' }, { name: 'Transporte', type: 'expense', color: '#f97316' }, { name: 'Salário', type: 'income', color: '#22c55e' }];
    const toInsert = defaults.map(d => ({ ...d, user_id: user.id }));
    const { error } = await supabase.from('categories').insert(toInsert);
    if (error) toast({ title: "Erro", description: "Algumas já existem." });
    else { toast({ title: "Padrões criados!" }); fetchCategories(); }
    setLoading(false);
  };

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
      await supabase.from('profiles').upsert({ user_id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      setAvatarUrl(publicUrl);
      toast({ title: "Foto atualizada!" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); } finally { setUploading(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, full_name: fullName, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) toast({ title: "Erro", variant: "destructive" }); else toast({ title: "Atualizado!" });
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const old = formData.get("old_password") as string;
    const pass = formData.get("password") as string;
    const confirm = formData.get("confirm_password") as string;

    if (pass !== confirm) { toast({ title: "Senhas não conferem", variant: "destructive" }); setLoading(false); return; }
    if (pass.length < 6) { toast({ title: "Senha curta", variant: "destructive" }); setLoading(false); return; }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: old });
    if (loginError) { toast({ title: "Senha antiga incorreta", variant: "destructive" }); setLoading(false); return; }

    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) toast({ title: "Erro", description: error.message }); else { toast({ title: "Senha atualizada!" }); (e.target as HTMLFormElement).reset(); }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="appearance">Visual</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger> {/* <--- NOVA ABA */}
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            <Card>
              <CardHeader><CardTitle>Seus Dados</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-sm"><AvatarImage src={avatarUrl || ""} /><AvatarFallback>{fullName?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                  <Label htmlFor="picture" className="cursor-pointer bg-secondary px-4 py-2 rounded-md text-sm">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 inline mr-2" />} Alterar Foto
                    <Input id="picture" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  </Label>
                </div>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid gap-2"><Label>Nome</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                  <div className="grid gap-2"><Label>E-mail</Label><Input value={email} disabled className="bg-muted" /></div>
                  <Button disabled={loading}>Salvar</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-6 space-y-6">
             <Card>
              <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Categorias</CardTitle></div><Button variant="outline" size="sm" onClick={handleSeedCategories}><RefreshCw className="h-4 w-4 mr-2"/> Restaurar</Button></CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleCreateCategory} className="flex gap-4 items-end p-4 border rounded-lg">
                  <div className="flex-1 space-y-2"><Label>Nome</Label><Input value={newCatName} onChange={e => setNewCatName(e.target.value)} /></div>
                  <div className="w-[140px] space-y-2"><Label>Tipo</Label><Select value={newCatType} onValueChange={(v:any)=>setNewCatType(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="expense">Despesa</SelectItem><SelectItem value="income">Receita</SelectItem></SelectContent></Select></div>
                  <div className="w-[100px] space-y-2"><Label>Cor</Label><Input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="h-10 p-1" /></div>
                  <Button><Plus className="h-4 w-4" /></Button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{categories.map(cat => (<div key={cat.id} className="flex justify-between p-3 border rounded-md"><div className="flex items-center gap-3"><div className="h-4 w-4 rounded-full" style={{backgroundColor:cat.color}}/><span className="font-medium">{cat.name}</span></div><Button variant="ghost" size="icon" onClick={()=>handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button></div>))}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-6">
             <Card>
                <CardHeader><CardTitle>Trocar Senha</CardTitle></CardHeader>
                <CardContent>
                   <form onSubmit={handlePasswordChange} className="space-y-4 border p-4 rounded-lg">
                      <div className="space-y-2"><Label>Senha Antiga</Label><Input name="old_password" type="password" required /></div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2"><Label>Nova Senha</Label><Input name="password" type="password" required /></div>
                         <div className="space-y-2"><Label>Repetir Nova</Label><Input name="confirm_password" type="password" required /></div>
                      </div>
                      <Button disabled={loading} className="w-full">Atualizar</Button>
                   </form>
                </CardContent>
             </Card>
             <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> 2FA</CardTitle></CardHeader>
                <CardContent><div className="flex justify-between border p-4 rounded-lg"><div className="space-y-0.5"><div className="font-medium">App Autenticador</div><div className="text-sm text-muted-foreground">Em breve.</div></div><Switch disabled /></div></CardContent>
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

          {/* --- ABA LEGAL (NOVA) --- */}
          <TabsContent value="legal" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentação Legal</CardTitle>
                <CardDescription>Termos e políticas que regem o uso da plataforma.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/terms" target="_blank" className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Termos de Uso</p>
                      <p className="text-xs text-muted-foreground">Regras de utilização e pagamentos.</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Link>
                
                <Link to="/privacy" target="_blank" className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Política de Privacidade</p>
                      <p className="text-xs text-muted-foreground">Como tratamos seus dados (LGPD).</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}