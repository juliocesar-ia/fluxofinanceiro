import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Trophy, Trash2, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('deadline', { ascending: true });
    if (data) setGoals(data);
    setLoading(false);
  };

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
    if (error) toast({ title: "Erro", variant: "destructive" });
    else {
      toast({ title: "Meta criada!" });
      setIsCreateOpen(false);
      fetchGoals();
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Excluir meta?")) return;
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if(!error) { toast({ title: "Removida" }); fetchGoals(); }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const newAmount = selectedGoal.current_amount + Number(formData.get('amount'));
    const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', selectedGoal.id);
    if (!error) { toast({ title: "Saldo atualizado!" }); setIsDepositOpen(false); fetchGoals(); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/> Nova Meta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Meta</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateGoal} className="space-y-4 py-4">
                <div className="space-y-2"><Label>Nome</Label><Input name="name" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Alvo (R$)</Label><Input name="target" type="number" required /></div>
                  <div className="space-y-2"><Label>Atual (R$)</Label><Input name="current" type="number" /></div>
                </div>
                <div className="space-y-2"><Label>Prazo</Label><Input name="deadline" type="date" /></div>
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const pct = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            return (
              <Card key={goal.id} className="relative overflow-hidden">
                <div className={`absolute top-0 w-full h-1 ${pct >= 100 ? 'bg-green-500' : 'bg-primary'}`} />
                <CardHeader className="pb-2"><CardTitle>{goal.name}</CardTitle></CardHeader>
                <CardContent className="pb-2">
                  <div className="flex justify-between text-sm mb-2"><span>Progresso</span><span>{pct.toFixed(0)}%</span></div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex justify-between mt-4 text-sm font-bold">
                    <span className="text-green-600">R$ {goal.current_amount}</span>
                    <span className="text-muted-foreground">Meta: R$ {goal.target_amount}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t bg-muted/20 flex justify-between">
                   <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                   <Button size="sm" variant="outline" onClick={() => { setSelectedGoal(goal); setIsDepositOpen(true); }}>Depositar</Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* Modal de Depósito (fora do loop) */}
        <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Valor</DialogTitle></DialogHeader>
            <form onSubmit={handleDeposit} className="space-y-4"><Input name="amount" type="number" autoFocus /><Button className="w-full">Confirmar</Button></form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}