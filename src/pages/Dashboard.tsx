import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Sparkles, TrendingUp } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados Calculados
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, savingsRate: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (data) {
      setTransactions(data);
      calculateSummary(data);
    }
    setLoading(false);
  };

  const calculateSummary = (data: any[]) => {
    const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = income - expense;
    // Taxa de economia: (Receita - Despesa) / Receita
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    
    setSummary({ income, expense, balance, savingsRate });
  };

  // Prepara dados para o gráfico de evolução (agrupado por data simples)
  const chartData = transactions.slice(-10).map(t => ({
    name: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    amount: Number(t.amount),
    type: t.type
  }));

  // Geração de Insights "IA" (Lógica baseada em regras)
  const getInsight = () => {
    if (summary.savingsRate > 20) return "Ótimo trabalho! Você está economizando mais de 20% da sua renda.";
    if (summary.balance < 0) return "Atenção! Seus gastos superaram seus ganhos este mês.";
    if (summary.expense > summary.income * 0.9) return "Cuidado, você está gastando quase tudo que ganha.";
    return "Mantenha o registro constante para melhores insights.";
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando Finanças...</div>;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        
        {/* Seção de Boas Vindas & Insight */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Visão Geral</h2>
            <p className="text-muted-foreground">Resumo financeiro em tempo real.</p>
          </div>
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            IA Insight: {getInsight()}
          </div>
        </div>

        {/* KPIs Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <span className="text-primary font-bold">R$</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                 Carteira Principal
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas (Mês)</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary to-orange-600 text-white border-none">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Taxa de Poupança</CardTitle>
              <TrendingUp className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.savingsRate.toFixed(1)}%</div>
              <p className="text-xs text-white/80 mt-1">da renda mensal economizada</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos e Análises */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          
          {/* Gráfico Principal */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Fluxo de Caixa Recente</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Valor']}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Widgets Laterais / Anúncios */}
          <div className="col-span-3 space-y-4">
            <AdBanner />
            
            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.slice(-5).reverse().map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {t.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t.description}</p>
                          <p className="text-xs text-muted-foreground">{t.category}</p>
                        </div>
                      </div>
                      <div className={`font-medium text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'expense' ? '-' : '+'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}