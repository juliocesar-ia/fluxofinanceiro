import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Plus, Trash2, AlertTriangle, Calculator, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Debt = {
  id: string;
  name: string;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  total_amount: number;
};

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Estado do Simulador
  const [extraPayment, setExtraPayment] = useState(0);

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('interest_rate', { ascending: false }); // Ordena por maior juros (Prioridade)

    if (data) setDebts(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const { data: { user } } = await supabase.auth.getUser();

    const newDebt = {
      user_id: user?.id,
      name: formData.get('name'),
      total_amount: Number(formData.get('total')),
      current_balance: Number(formData.get('current')),
      interest_rate: Number(formData.get('interest')),
      minimum_payment: Number(formData.get('payment'))
    };

    const { error } = await supabase.from('debts').insert(newDebt);

    if (error) toast({ title: "Erro ao salvar", variant: "destructive" });
    else {
      toast({ title: "Dívida adicionada" });
      setIsDialogOpen(false);
      fetchDebts();
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Já quitou ou quer remover esta dívida?")) return;
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (!error) { toast({ title: "Dívida removida" }); fetchDebts(); }
  };

  // Cálculos do Painel Geral
  const totalDebt = debts.reduce((acc, d) => acc + Number(d.current_balance), 0);
  const totalMonthlyMin = debts.reduce((acc, d) => acc + Number(d.minimum_payment), 0);
  
  // Cálculo Simplificado de Tempo para Quitação (com aporte extra)
  const calculatePayoffMonths = () => {
    if (totalMonthlyMin + extraPayment <= 0) return 999;
    
    // Média ponderada de juros (estimativa simples para UX)
    // O cálculo real seria dívida a dívida, mas aqui damos uma estimativa geral
    return Math.ceil(totalDebt / (totalMonthlyMin + extraPayment));
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in pb-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-600">Gestão de Dívidas</h1>
            <p className="text-muted-foreground">Organize-se para sair do vermelho e pagar menos juros.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                <Plus className="h-4 w-4" /> Adicionar Dívida
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Dívida</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="space-y-2"><Label>Nome</Label><Input name="name" placeholder="Ex: Cartão Visa, Empréstimo" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valor Original</Label><Input name="total" type="number" step="0.01" required /></div>
                  <div className="space-y-2"><Label>Saldo Devedor Atual</Label><Input name="current" type="number" step="0.01" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Juros Mensal (%)</Label><Input name="interest" type="number" step="0.01" placeholder="Ex: 4.5" required /></div>
                  <div className="space-y-2"><Label>Parcela Mínima</Label><Input name="payment" type="number" step="0.01" required /></div>
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">Salvar Dívida</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Simulador de Quitação */}
        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-green-400" /> Simulador de Liberdade</CardTitle>
                <CardDescription className="text-slate-400">Descubra o impacto de pagar um pouco a mais.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Dívida Total</Label>
                        <div className="text-3xl font-bold text-red-400">{totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Pagamento Mínimo Obrigatório</Label>
                        <div className="text-xl font-semibold">{totalMonthlyMin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /mês</div>
                    </div>
                </div>

                <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="space-y-2">
                        <Label className="text-green-300 font-bold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Pagamento Extra (Snowball)</Label>
                        <Input 
                            type="number" 
                            className="bg-black/20 border-green-500/30 text-white placeholder:text-white/20" 
                            placeholder="Quanto você pode dar a mais?"
                            value={extraPayment}
                            onChange={e => setExtraPayment(Number(e.target.value))}
                        />
                        <p className="text-xs text-slate-400">Qualquer valor acima do mínimo ajuda.</p>
                    </div>
                </div>

                <div className="flex flex-col justify-center items-center text-center p-4">
                    <span className="text-sm text-slate-400">Estimativa de Quitação</span>
                    <strong className="text-5xl font-bold text-white mt-2">{calculatePayoffMonths()}</strong>
                    <span className="text-sm text-green-400 font-medium">Meses para a liberdade</span>
                </div>
            </CardContent>
        </Card>

        {/* Lista de Dívidas */}
        <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Prioridade de Pagamento (Juros mais altos primeiro)
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {debts.map((debt, index) => {
                    const percentagePaid = 100 - ((debt.current_balance / debt.total_amount) * 100);
                    
                    return (
                        <Card key={debt.id} className="relative overflow-hidden border-t-4 border-t-red-500 hover:shadow-md transition-shadow">
                            <div className="absolute top-2 right-2 text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                Prioridade #{index + 1}
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{debt.name}</CardTitle>
                                <div className="text-red-600 font-bold text-xl">{Number(debt.current_balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                <CardDescription>Restante</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Juros:</span>
                                    <span className="font-bold text-red-500">{debt.interest_rate}% a.m.</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Pago: {percentagePaid.toFixed(0)}%</span>
                                        <span>Total: {Number(debt.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <Progress value={percentagePaid} className="h-2" />
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 justify-end">
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-600" onClick={() => handleDelete(debt.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Quitar / Remover
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
            
            {debts.length === 0 && !loading && (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                    <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>Você não possui dívidas cadastradas. Parabéns!</p>
                </div>
            )}
        </div>

      </div>
    </DashboardLayout>
  );
}