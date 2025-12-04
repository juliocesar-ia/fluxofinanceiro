import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Trophy, Trash2, Calendar, TrendingUp, Upload, Image as ImageIcon, Calculator, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  image_url: string | null;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Estados dos Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Estados da Calculadora de Independência
  const [simMonthly, setSimMonthly] = useState(500);
  const [simCurrent, setSimCurrent] = useState(0);
  const [simTarget, setSimTarget] = useState(1000000);
  const [simRate, setSimRate] = useState(10); // 10% ao ano
  const [simYears, setSimYears] = useState(0);

  useEffect(() => {
    fetchGoals();
    calculateIndependence();
  }, []);

  useEffect(() => {
    calculateIndependence();
  }, [simMonthly, simCurrent, simTarget, simRate]);

  const fetchGoals = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('deadline', { ascending: true });

    if (data) {
      setGoals(data);
      // Preenche o "Já tenho" da calculadora com a soma das metas
      const totalSaved = data.reduce((acc, g) => acc + Number(g.current_amount), 0);
      setSimCurrent(totalSaved);
    }
    setLoading(false);
  };

  // --- LÓGICA DA CALCULADORA ---
  const calculateIndependence = () => {
    if (simMonthly <= 0) {
      setSimYears(999);
      return;
    }
    
    const ratePerMonth = (Math.pow(1 + (simRate / 100), 1/12)) - 1;
    let balance = simCurrent;
    let months = 0;

    // Simulação mês a mês (limite de 100 anos para não travar)
    while (balance < simTarget && months < 1200) {
      balance = balance * (1 + ratePerMonth) + simMonthly;
      months++;
    }
    
    setSimYears(months / 12);
  };

  // --- AÇÕES DAS METAS ---
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('goals').insert({
      user_id: user?.id,
      name: formData.get('name'),
      target_amount: Number(formData.get('target')),
      current_amount: Number(formData.get('current')) || 0,
      deadline: formData.get('deadline') || null
    });

    if (error) {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    } else {
      toast({ title: "Sonho criado com sucesso!" });
      setIsCreateOpen(false);
      fetchGoals();
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza que deseja desistir deste sonho?")) return;
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if(!error) { toast({ title: "Meta removida" }); fetchGoals(); }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const amountToAdd = Number(formData.get('amount'));
    const newAmount = selectedGoal.current_amount + amountToAdd;

    const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', selectedGoal.id);
    if (!error) { toast({ title: "Investimento registrado!" }); setIsDepositOpen(false); fetchGoals(); }
  };

  // --- UPLOAD DE IMAGEM DO SONHO ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, goalId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${goalId}-${Math.random()}.${fileExt}`;
    
    try {
        const { error: uploadError } = await supabase.storage.from('goal_images').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('goal_images').getPublicUrl(fileName);

        const { error: updateError } = await supabase.from('goals').update({ image_url: publicUrl }).eq('id', goalId);
        if (updateError) throw updateError;

        toast({ title: "Imagem do sonho atualizada!" });
        fetchGoals();
    } catch (error: any) {
        toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
        setUploading(false);
    }
  };

  // Helper de Cores
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in pb-10">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meus Sonhos & Metas</h1>
            <p className="text-muted-foreground">Transforme planos em realidade.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Novo Sonho</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Novo Sonho</DialogTitle><DialogDescription>O que você quer conquistar?</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateGoal} className="space-y-4 py-4">
                <div className="space-y-2"><Label>Nome do Objetivo</Label><Input name="name" placeholder="Ex: Viagem para Europa, Casa Própria" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valor Alvo (R$)</Label><Input name="target" type="number" step="0.01" required /></div>
                  <div className="space-y-2"><Label>Já tenho (R$)</Label><Input name="current" type="number" step="0.01" /></div>
                </div>
                <div className="space-y-2"><Label>Prazo Final (Opcional)</Label><Input name="deadline" type="date" /></div>
                <Button type="submit" className="w-full">Criar Meta</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* --- CALCULADORA DE INDEPENDÊNCIA (NOVA) --- */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Simulador de Liberdade Financeira</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
                <div className="space-y-4 lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Meta de Patrimônio</Label>
                            <Input className="bg-white/10 border-white/20 text-white" type="number" value={simTarget} onChange={e => setSimTarget(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Investimento Mensal</Label>
                            <Input className="bg-white/10 border-white/20 text-white" type="number" value={simMonthly} onChange={e => setSimMonthly(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Rentabilidade Anual (%)</Label>
                            <Input className="bg-white/10 border-white/20 text-white" type="number" value={simRate} onChange={e => setSimRate(Number(e.target.value))} />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center bg-white/10 rounded-xl p-4 text-center">
                    <span className="text-sm text-slate-300">Você atinge sua meta em</span>
                    <strong className="text-4xl font-bold text-primary mt-2">{simYears < 100 ? simYears.toFixed(1) : "99+"}</strong>
                    <span className="text-sm text-slate-300">Anos</span>
                </div>
            </CardContent>
        </Card>

        {/* --- GRID DE SONHOS --- */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const percentage = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            
            return (
              <Card key={goal.id} className="relative overflow-hidden group hover:shadow-lg transition-all flex flex-col h-full border-t-4" style={{ borderTopColor: percentage >= 100 ? '#22c55e' : '#f97316' }}>
                
                {/* Imagem de Fundo do Sonho */}
                <div className="h-32 bg-muted relative group-hover:h-40 transition-all duration-300">
                    {goal.image_url ? (
                        <img src={goal.image_url} alt={goal.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                    )}
                    
                    {/* Botão de Upload Invisível (Aparece no Hover) */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Label htmlFor={`upload-${goal.id}`} className="cursor-pointer flex flex-col items-center text-white text-xs hover:scale-105 transition-transform">
                            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                            <span className="mt-1">Alterar Foto</span>
                        </Label>
                        <input id={`upload-${goal.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, goal.id)} disabled={uploading} />
                    </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl line-clamp-1" title={goal.name}>{goal.name}</CardTitle>
                    {percentage >= 100 && <Trophy className="h-6 w-6 text-yellow-500 shrink-0" />}
                  </div>
                </CardHeader>
                
                <CardContent className="pb-2 flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground font-medium">{percentage.toFixed(1)}%</span>
                    <span className="text-muted-foreground">Meta: {goal.target_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  
                  <div className="flex justify-between items-center mt-4 text-sm">
                    <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-bold">{goal.current_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    {goal.deadline && (
                       <div className="flex items-center gap-1 text-muted-foreground" title="Prazo">
                         <Calendar className="h-3 w-3" />
                         <span className="text-xs">{format(new Date(goal.deadline), 'dd/MM/yy', { locale: ptBR })}</span>
                       </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-4 border-t bg-muted/20 flex justify-between gap-2 mt-auto">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(goal.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <Dialog open={isDepositOpen && selectedGoal?.id === goal.id} onOpenChange={(open) => { setIsDepositOpen(open); if(open) setSelectedGoal(goal); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                        <Plus className="h-4 w-4" /> Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                       <DialogHeader><DialogTitle>Adicionar em: {goal.name}</DialogTitle></DialogHeader>
                       <form onSubmit={handleDeposit} className="space-y-4 pt-4">
                          <div className="space-y-2"><Label>Valor guardado (R$)</Label><Input name="amount" type="number" step="0.01" autoFocus required /></div>
                          <Button type="submit" className="w-full">Confirmar</Button>
                       </form>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            );
          })}
          
          {/* Card Vazio */}
          {goals.length === 0 && !loading && (
             <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Nenhum sonho definido</h3>
                <Button variant="link" onClick={() => setIsCreateOpen(true)}>Criar primeiro sonho</Button>
             </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}