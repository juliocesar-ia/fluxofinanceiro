import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, PieChart as PieIcon, DollarSign, Plus, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useToast } from "@/hooks/use-toast";

type Investment = {
  id: string;
  name: string;
  type: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('investments').select('*');
    if (data) setInvestments(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const { data: { user } } = await supabase.auth.getUser();

    const newInv = {
      user_id: user?.id,
      name: formData.get('name'),
      type: formData.get('type'),
      quantity: Number(formData.get('quantity')),
      purchase_price: Number(formData.get('purchase_price')),
      current_price: Number(formData.get('current_price')) || Number(formData.get('purchase_price')),
    };

    const { error } = await supabase.from('investments').insert(newInv);

    if (error) toast({ title: "Erro ao salvar", variant: "destructive" });
    else {
      toast({ title: "Investimento adicionado!" });
      setIsDialogOpen(false);
      fetchInvestments();
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Remover este ativo?")) return;
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (!error) { toast({ title: "Removido" }); fetchInvestments(); }
  };

  // Cálculos
  const totalInvested = investments.reduce((acc, i) => acc + (i.quantity * i.purchase_price), 0);
  const totalCurrent = investments.reduce((acc, i) => acc + (i.quantity * (i.current_price || i.purchase_price)), 0);
  const profitability = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  // Dados para o gráfico (Agrupado por tipo)
  const allocationData = investments.reduce((acc: any[], curr) => {
    const existing = acc.find(i => i.name === curr.type);
    const value = curr.quantity * (curr.current_price || curr.purchase_price);
    if (existing) existing.value += value;
    else acc.push({ name: curr.type, value });
    return acc;
  }, []);

  const getTypeLabel = (type: string) => {
    const map: any = { stock: 'Ações', crypto: 'Cripto', fixed: 'Renda Fixa', fund: 'Fundos', reits: 'FIIs' };
    return map[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
            <p className="text-muted-foreground">Acompanhe a evolução do seu patrimônio.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4" /> Novo Ativo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Investimento</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Ativo</Label>
                  <Input name="name" placeholder="Ex: PETR4, Bitcoin, Tesouro Direto" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select name="type" defaultValue="stock">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">Ações (BR/USA)</SelectItem>
                        <SelectItem value="reits">Fundos Imobiliários (FIIs)</SelectItem>
                        <SelectItem value="fixed">Renda Fixa / Tesouro</SelectItem>
                        <SelectItem value="crypto">Criptomoedas</SelectItem>
                        <SelectItem value="fund">Fundos de Investimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input name="quantity" type="number" step="0.000001" placeholder="Ex: 100" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço Médio de Compra</Label>
                    <Input name="purchase_price" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço Atual (Cotação)</Label>
                    <Input name="current_price" type="number" step="0.01" />
                  </div>
                </div>
                <Button type="submit" className="w-full">Salvar Ativo</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-900 to-slate-900 text-white border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-200">Patrimônio Total</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-400 absolute top-6 right-6" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCurrent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <p className="text-xs text-blue-300 mt-1">Valor atualizado de mercado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lucro / Prejuízo</CardTitle>
              {profitability >= 0 ? <TrendingUp className="h-4 w-4 text-green-500 absolute top-6 right-6" /> : <TrendingDown className="h-4 w-4 text-red-500 absolute top-6 right-6" />}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${profitability >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitability > 0 ? '+' : ''}{profitability.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(totalCurrent - totalInvested).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
              <PieIcon className="h-4 w-4 text-primary absolute top-6 right-6" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <p className="text-xs text-muted-foreground mt-1">Custo de aquisição</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tabela de Ativos */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold">Meus Ativos</h3>
            {investments.map((inv) => {
              const totalVal = inv.quantity * (inv.current_price || inv.purchase_price);
              const profit = (inv.current_price || 0) - inv.purchase_price;
              const profitPercent = (profit / inv.purchase_price) * 100;

              return (
                <Card key={inv.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600">
                        {inv.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold">{inv.name}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] h-5">{getTypeLabel(inv.type)}</Badge>
                          <span>{inv.quantity} cotas</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold">{totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      <p className={`text-xs ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}% ({profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                      </p>
                    </div>

                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(inv.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {investments.length === 0 && !loading && (
               <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                  Você ainda não possui investimentos cadastrados.
               </div>
            )}
          </div>

          {/* Gráfico de Alocação */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Alocação</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {allocationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                      <Legend formatter={(value) => getTypeLabel(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados para exibir
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}