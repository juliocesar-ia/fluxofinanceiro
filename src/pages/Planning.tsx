import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, AlertTriangle, CheckCircle } from "lucide-react";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Buscar Orçamentos Existentes
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('*, categories(name, color)');

    // 2. Buscar Todas as Categorias (para o select)
    const { data: catData } = await supabase.from('categories').select('*');

    // 3. Calcular Gastos do Mês Atual por Categoria
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    
    const { data: transData } = await supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startOfMonth.toISOString());

    // Agrupar gastos
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

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const categoryId = formData.get('category_id') as string;
    const amount = Number(formData.get('amount'));
    const { data: { user } } = await supabase.auth.getUser();

    // Verifica se já existe (upsert)
    const { error } = await supabase
      .from('budgets')
      .upsert({ 
        user_id: user?.id,
        category_id: categoryId, 
        amount: amount 
      }, { onConflict: 'user_id, category_id' });

    if (error) toast({ title: "Erro ao salvar", variant: "destructive" });
    else {
      toast({ title: "Orçamento definido!" });
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
            <p className="text-muted-foreground">Defina limites para suas categorias e economize.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Wallet className="h-4 w-4" /> Definir Orçamento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Limite de Gastos</DialogTitle></DialogHeader>
              <form onSubmit={handleSaveBudget} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select name="category_id" required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Limite Mensal (R$)</Label>
                  <Input name="amount" type="number" step="0.01" placeholder="Ex: 500.00" required />
                </div>
                <Button type="submit" className="w-full">Salvar Planejamento</Button>
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
              <Card key={budget.id} className="overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: budget.categories?.color || '#ccc' }} />
                    <CardTitle className="text-base font-medium">{budget.categories?.name}</CardTitle>
                  </div>
                  <span className="text-sm text-muted-foreground">Meta: R$ {budget.amount}</span>
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
                  
                  <Progress 
                    value={percentage} 
                    className={`h-2 ${isOver ? "bg-red-200" : ""}`} 
                    // Nota: A cor da barra interna (indicator) é controlada pelo componente Progress ou classes globais. 
                    // Para forçar vermelho se estourar, precisaríamos de um componente Progress customizado ou CSS inline.
                    // Aqui usamos a cor padrão do tema (primary) que fica elegante.
                  />
                  
                  <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                    <span>{percentage.toFixed(0)}% usado</span>
                    <span>{remaining > 0 ? `R$ ${remaining.toFixed(2)} restantes` : `R$ ${Math.abs(remaining).toFixed(2)} excedidos`}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {budgets.length === 0 && !loading && (
             <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
               Nenhum planejamento definido. Comece criando um limite para uma categoria.
             </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}