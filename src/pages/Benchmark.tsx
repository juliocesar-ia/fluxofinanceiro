import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, Users, Info } from "lucide-react";

export default function BenchmarkPage() {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any[]>([]);
  const [insight, setInsight] = useState<any>(null);

  // Média de Mercado (Baseado em recomendações financeiras saudáveis)
  const MARKET_BENCHMARK = [
    { category: 'Moradia', ideal: 30 },
    { category: 'Alimentação', ideal: 15 },
    { category: 'Transporte', ideal: 10 },
    { category: 'Lazer', ideal: 10 },
    { category: 'Saúde', ideal: 10 },
    { category: 'Educação', ideal: 5 },
    { category: 'Investimento', ideal: 20 },
  ];

  useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar transações do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, categories(name)')
      .eq('user_id', user.id)
      .gte('date', startOfMonth.toISOString());

    if (!transactions) {
        setLoading(false);
        return;
    }

    // 1. Calcular Renda Total
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    // Se não tiver renda, não dá pra comparar %
    if (totalIncome === 0) {
        setLoading(false);
        return;
    }

    // 2. Agrupar Despesas por Categoria
    const expensesByCategory: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const catName = t.categories?.name || 'Outros';
        expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Number(t.amount);
      });

    // 3. Montar dados para o Gráfico (Comparando com o Mercado)
    const comparisonData = MARKET_BENCHMARK.map(bench => {
      const userSpent = expensesByCategory[bench.category] || 0;
      const userPercent = (userSpent / totalIncome) * 100;
      
      return {
        category: bench.category,
        Você: parseFloat(userPercent.toFixed(1)),
        Mercado: bench.ideal,
        diff: userPercent - bench.ideal
      };
    });

    // 4. Gerar Insight Principal
    const biggestOffender = comparisonData.reduce((prev, current) => (current.diff > prev.diff ? current : prev), comparisonData[0]);
    
    let insightData = null;
    if (biggestOffender.diff > 5) {
        insightData = {
            type: 'warning',
            title: `Atenção com ${biggestOffender.category}`,
            message: `Você está gastando ${biggestOffender.Você}% da sua renda em ${biggestOffender.category}, o recomendado é até ${biggestOffender.Mercado}%.`
        };
    } else {
        insightData = {
            type: 'success',
            title: 'Parabéns!',
            message: 'Seus gastos estão equilibrados e dentro das médias saudáveis de mercado.'
        };
    }

    setUserStats(comparisonData);
    setInsight(insightData);
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in pb-10">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comparativo de Mercado</h1>
          <p className="text-muted-foreground">Veja como suas finanças se comparam com as médias saudáveis.</p>
        </div>

        {/* Insight Principal */}
        {insight && (
            <Alert className={`${insight.type === 'warning' ? 'border-yellow-500 bg-yellow-50' : 'border-green-500 bg-green-50'}`}>
                {insight.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                <AlertTitle className={insight.type === 'warning' ? 'text-yellow-800' : 'text-green-800'}>{insight.title}</AlertTitle>
                <AlertDescription className={insight.type === 'warning' ? 'text-yellow-700' : 'text-green-700'}>
                    {insight.message}
                </AlertDescription>
            </Alert>
        )}

        {/* Gráfico Comparativo */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Você vs Média Ideal
                </CardTitle>
                <CardDescription>Comparação percentual da sua renda gasta em cada categoria.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
                {userStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={userStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <XAxis dataKey="category" />
                            <YAxis unit="%" />
                            <Tooltip 
                                formatter={(value: number) => [`${value}%`, '']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="Você" fill="#f97316" radius={[4, 4, 0, 0]} name="Você" />
                            <Bar dataKey="Mercado" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Média Ideal" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-lg">
                        <Info className="h-10 w-10 mb-2 opacity-50" />
                        <p>Registre receitas e despesas este mês para ver o comparativo.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Detalhes em Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userStats.map((stat) => (
                <Card key={stat.category} className="overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-2xl font-bold">{stat.Você}%</span>
                            <span className="text-xs text-muted-foreground">Ideal: {stat.Mercado}%</span>
                        </div>
                        <Progress 
                            value={Math.min(100, (stat.Você / stat.Mercado) * 100)} 
                            className={`h-2 ${stat.Você > stat.Mercado ? "bg-red-100" : "bg-green-100"}`}
                            // Nota: A cor interna (indicator) precisa ser controlada via classe se quisermos mudar dinamicamente,
                            // mas o shadcn usa primary por padrão.
                        />
                        <p className={`text-xs mt-2 ${stat.Você > stat.Mercado ? 'text-red-500 font-medium' : 'text-green-600'}`}>
                            {stat.Você > stat.Mercado ? `+${(stat.Você - stat.Mercado).toFixed(1)}% acima do ideal` : 'Dentro do orçamento'}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>

      </div>
    </DashboardLayout>
  );
}