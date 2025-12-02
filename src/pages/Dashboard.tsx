import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, LogOut, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AdBanner } from "@/components/AdBanner"; // Importe o componente criado

// Tipagem
type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados do formulário
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newCategory, setNewCategory] = useState("Outros");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      setUser(session?.user ?? null);
      if (session) fetchTransactions();
      setLoading(false);
    });
  }, [navigate]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) console.error(error);
    else setTransactions(data || []);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || !newDesc) return;

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      description: newDesc,
      amount: amount,
      type: newType,
      category: newCategory,
      date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      toast({ title: "Erro", description: "Falha ao salvar transação.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Transação adicionada!" });
      setIsDialogOpen(false);
      setNewDesc(""); setNewAmount("");
      fetchTransactions();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      toast({ title: "Removido", description: "Transação excluída." });
      fetchTransactions();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Cálculos
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Dados para o gráfico (Simplificado por tipo)
  const chartData = [
    { name: 'Receitas', value: totalIncome, color: '#22c55e' }, // success color
    { name: 'Despesas', value: totalExpense, color: '#ef4444' }, // destructive color
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-xl hidden sm:block">FinanceControl</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        
        {/* AdSense Topo */}
        <AdBanner />

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover-lift border-primary/20">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
                <h2 className={`text-3xl font-bold mt-2 ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h2>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                <h2 className="text-3xl font-bold mt-2 text-green-600">
                  {totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h2>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                <h2 className="text-3xl font-bold mt-2 text-red-600">
                  {totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h2>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seção Principal (Tabela + Gráfico) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Controles e Tabela */}
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Transações</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                      <Plus className="h-4 w-4" /> Nova
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Transação</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddTransaction} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input placeholder="Ex: Mercado, Salário" value={newDesc} onChange={e => setNewDesc(e.target.value)} required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Valor</Label>
                          <Input type="number" step="0.01" placeholder="0.00" value={newAmount} onChange={e => setNewAmount(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="expense">Despesa</SelectItem>
                              <SelectItem value="income">Receita</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={newCategory} onValueChange={setNewCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Alimentação">Alimentação</SelectItem>
                            <SelectItem value="Moradia">Moradia</SelectItem>
                            <SelectItem value="Transporte">Transporte</SelectItem>
                            <SelectItem value="Lazer">Lazer</SelectItem>
                            <SelectItem value="Saúde">Saúde</SelectItem>
                            <SelectItem value="Salário">Salário</SelectItem>
                            <SelectItem value="Investimento">Investimento</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full mt-4">Salvar</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">Nenhuma transação encontrada.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{t.description}</span>
                              <span className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </TableCell>
                          <TableCell><span className="px-2 py-1 rounded-full bg-secondary text-xs">{t.category}</span></TableCell>
                          <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'expense' ? '- ' : '+ '}
                            {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Direita: Gráfico e Anúncio Extra */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(value) => `R$${value}`} />
                    <Tooltip 
                      formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      cursor={{fill: 'transparent'}}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Anúncio Quadrado na Sidebar */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center min-h-[250px]">
               <span className="text-xs text-muted-foreground mb-2">Publicidade</span>
               {/* Coloque aqui outro bloco do AdSense (formato quadrado/retângulo) */}
               <div className="w-full h-full bg-muted/30 rounded flex items-center justify-center">
                  <AdBanner />
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}