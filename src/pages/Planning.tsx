import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, AlertTriangle, CheckCircle, Pencil, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Budget = {
  id: string;
  category_id: string;
  amount: number;
  categories: { name: string; color: string };
};

export default function PlanningPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  // Estados para Edição/Criação
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Buscar Orçamentos
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('*, categories(name, color)');

    // 2. Buscar Categorias
    const { data: catData } = await supabase.from('categories').select('*').eq('type', 'expense');

    // 3. Calcular Gastos do Mês
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    
    const { data: transData } = await supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startOfMonth.toISOString());

    const currentSpending: Record<string, number> = {};
    transData?.forEach(t => {
      if(t.category_id) {
        currentSpending[t.category_id] = (currentSpending[t.category_id] || 0) + Number(t.amount);
      }
    });

    if (budgetData) setBudgets(budgetData as any);
    if (catData) setCategories(catData);
    setSpending(currentSpending);
    setLoading(false);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingBudget(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Remover este planejamento?")) return;
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if(error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else {
      toast({ title: "Planejamento removido" });
      fetchData();
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const categoryId = formData.get('category_id') as string;
    const amount = Number(formData.get('amount'));
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const payload = {
      user_id: user.id,
      category_id: categoryId,
      amount: amount,
      period: 'monthly'
    };

    // Upsert funciona para criar ou atualizar se a combinação user_id + category_id for única
    const { error } = await supabase
      .from('budgets')
      .upsert(payload, { onConflict: 'user_id, category_id' });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Planejamento atualizado!" });
      setIsDialogOpen(false);
      fetchData();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planejamento Mensal</h1>
            <p className="text-muted-foreground">Defina limites e controle seus gastos por categoria.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={handleNew}>
                <Plus className="h-4 w-4" /> Novo Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBudget ? "Editar Limite" : "Novo Limite de Gastos"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveBudget} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select name="category_id" defaultValue={editingBudget?.category_id} disabled={!!editingBudget}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingBudget && <p className="text-xs text-muted-foreground">Para mudar a categoria, exclua e crie um novo.</p>}
                </div>
                <div className="space-y-2">
                  <Label>Limite Mensal (R$)</Label>
                  <Input name="amount" type="number" step="0.01" defaultValue={editingBudget?.amount} placeholder="Ex: 500.00" required />
                </div>
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const spent = spending[budget.category_id] || 0;
            const percentage = Math.min(100, (spent / budget.amount) * 100);
            const isOver = spent > budget.amount;
            const remaining = budget.amount - spent;

            return (
              <Card key={budget.id} className="overflow-hidden relative group">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: budget.categories?.color || '#ccc' }} />
                    <CardTitle className="text-base font-medium">{budget.categories?.name}</CardTitle>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(budget)}>
                      <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(budget.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-2xl font-bold">R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    {isOver ? (
                      <span className="text-xs text-red-500 flex items-center font-bold"><AlertTriangle className="h-3 w-3 mr-1" /> Estourou</span>
                    ) : (
                      <span className="text-xs text-green-600 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Dentro</span>
                    )}
                  </div>
                  
                  <Progress value={percentage} className={`h-2 ${isOver ? "bg-red-100" : ""}`} />
                  
                  <div className="mt-2 text-xs text-muted-foreground flex justify-between font-medium">
                    <span>{percentage.toFixed(0)}%</span>
                    <span>Meta: R$ {budget.amount.toLocaleString('pt-BR')}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {budgets.length === 0 && !loading && (
             <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
               <Wallet className="h-10 w-10 mx-auto mb-3 opacity-20" />
               <p>Nenhum planejamento definido.</p>
               <Button variant="link" onClick={handleNew}>Criar primeiro orçamento</Button>
             </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}