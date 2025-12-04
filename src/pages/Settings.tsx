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
import { Shield, Smartphone, Monitor, Upload, Loader2, Plus, Trash2, RefreshCw, MessageSquare } from "lucide-react";
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
  const [phone, setPhone] = useState(""); // <--- NOVO ESTADO
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
        setPhone(profile.phone || ""); // <--- CARREGA O TELEFONE
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
    if (error) toast({ title: "Erro", variant: "destructive" });
    else { toast({ title: "Categoria criada!" }); setNewCatName(""); fetchCategories(); }
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
      { name: 'Salário', type: 'income', color: '#22c55e' },
    ];
    const toInsert = defaults.map(d => ({ ...d, user_id: user.id }));
    const { error } = await supabase.from('categories').insert(toInsert);
    if (error) toast({ title: "Algumas já existem", variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Formata telefone (remove espaços e garante formato internacional se necessário)
    // Aqui salvamos como o usuário digita, mas o ideal é padronizar (ex: whatsapp:+55...)
    let cleanPhone = phone.replace(/\D/g, ''); 
    if(cleanPhone && !cleanPhone.startsWith('55') && cleanPhone.length > 10) cleanPhone = '55' + cleanPhone; // Add Brasil DDI se faltar
    const formattedPhone = cleanPhone ? `whatsapp:+${cleanPhone}` : null;

    const { error } = await supabase.from('profiles').upsert(
      { 
        user_id: user.id, 
        full_name: fullName, 
        phone: formattedPhone, // Salva formatado para Twilio
        updated_at: new Date().toISOString() 
      },
      { onConflict: 'user_id' }
    );

    if (error) toast({ title: "Erro ao salvar perfil", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil atualizado!" });
    
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="appearance">Visual</TabsTrigger>
            <TabsTrigger value="integration">Integrações</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            <Card>
              <CardHeader><CardTitle>Seus Dados</CardTitle><CardDescription>Gerencie sua identidade.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-sm"><AvatarImage src={avatarUrl || ""} /><AvatarFallback>{fullName?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                  <Label htmlFor="picture" className="cursor-pointer bg-secondary px-4 py-2 rounded-md text-sm">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 inline mr-2" />} Alterar Foto
                    <Input id="picture" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  </Label>
                </div>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid gap-2"><Label>Nome Completo</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                  <div className="grid gap-2"><Label>E-mail</Label><Input value={email} disabled className="bg-muted" /></div>
                  <div className="grid gap-2">
                    <Label>Celular (WhatsApp)</Label>
                    <Input 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="Ex: 11999999999" 
                    />
                    <p className="text-xs text-muted-foreground">Necessário para usar o bot. Digite DDD + Número.</p>
                  </div>
                  <Button disabled={loading}>Salvar Alterações</Button>
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

          <TabsContent value="integration" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-600" /> Bot do WhatsApp</CardTitle>
                <CardDescription>Envie áudios ou fotos para lançar gastos automaticamente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Como usar:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                    <li>Salve seu número na aba <strong>Perfil</strong>.</li>
                    <li>Envie uma mensagem para o nosso bot no WhatsApp.</li>
                    <li>Mande um áudio: <em>"Gastei 50 reais no almoço"</em>.</li>
                    <li>Ou mande a foto de uma nota fiscal.</li>
                  </ol>
                </div>
                <Button variant="outline" className="w-full text-green-600 border-green-200 hover:bg-green-50">Conectar ao WhatsApp (Em breve)</Button>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}