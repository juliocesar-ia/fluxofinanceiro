import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Sparkles, TrendingUp, Zap, Trophy, Medal, Crown, Star } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { differenceInCalendarDays } from "date-fns";

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Gamificação
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState("Iniciante");
  const [xp, setXp] = useState(0); // Representado pela taxa de poupança
  const [badges, setBadges] = useState<{name: string, icon: any, color: string}[]>([]);

  // Estados Calculados
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, savingsRate: 0 });

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Carregar Transações e Resumo
    const { data: transData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    let calculatedSummary = { income: 0, expense: 0, balance: 0, savingsRate: 0 };

    if (transData) {
      setTransactions(transData);
      calculatedSummary = calculateSummary(transData);
    }

    // 2. Verificar Investimentos (Para Badge)
    const { count: investCount } = await supabase.from('investments').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

    // 3. Processar Gamificação (Streak e Nível)
    await handleGamification(user.id, calculatedSummary, investCount || 0);
    
    setLoading(false);
  };

  const calculateSummary = (data: any[]) => {
    const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = income - expense;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    
    const summ = { income, expense, balance, savingsRate };
    setSummary(summ);
    return summ;
  };

  // --- LÓGICA DE GAMIFICAÇÃO ---
  const handleGamification = async (userId: string, summ: any, investCount: number) => {
    // A. Calcular Nível baseado na Taxa de Poupança
    let newLevel = "Iniciante";
    let newXp = Math.max(0, summ.savingsRate); // XP é a % de economia

    if (summ.savingsRate >= 10) newLevel = "Poupador";
    if (summ.savingsRate >= 30) newLevel = "Investidor";
    if (summ.savingsRate >= 50) newLevel = "Magnata";
    
    setLevel(newLevel);
    setXp(newXp);

    // B. Calcular Badges (Conquistas)
    const earnedBadges = [];
    
    // Badge 1: Orçamento em dia (Saldo positivo)
    if (summ.balance > 0) {
      earnedBadges.push({ name: "No Azul", icon: <CheckBadge />, color: "text-green-500 bg-green-100" });
    }
    // Badge 2: Primeiro Investimento
    if (investCount > 0) {
      earnedBadges.push({ name: "Investidor", icon: <TrendingUp className="h-4 w-4" />, color: "text-blue-500 bg-blue-100" });
    }
    // Badge 3: Economia Forte (>20%)
    if (summ.savingsRate > 20) {
      earnedBadges.push({ name: "Reserva Forte", icon: <ShieldStar />, color: "text-purple-500 bg-purple-100" });
    }
    // Badge 4: Magnata (>50%)
    if (summ.savingsRate > 50) {
      earnedBadges.push({ name: "Magnata", icon: <Crown className="h-4 w-4" />, color: "text-yellow-600 bg-yellow-100" });
    }

    setBadges(earnedBadges);

    // C. Calcular Streak (Dias seguidos)
    const { data: profile } = await supabase.from('profiles').select('current_streak, last_login').eq('user_id', userId).single();
    
    if (profile) {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = profile.last_login;
      let currentStreak = profile.current_streak || 0;

      // Se o último login não foi hoje
      if (lastLogin !== today) {
        const diff = differenceInCalendarDays(new Date(today), new Date(lastLogin));
        
        if (diff === 1) {
          // Entrou ontem, aumenta streak
          currentStreak += 1;
        } else if (diff > 1) {
          // Quebrou a sequência, reseta (mas damos 1 de consolo pelo login de hoje)
          currentStreak = 1;
        }
        // Se diff === 0, é o mesmo dia, não muda nada.

        // Atualiza no banco
        await supabase.from('profiles').update({ 
          current_streak: currentStreak, 
          last_login: today 
        }).eq('user_id', userId);
      }
      setStreak(currentStreak);
    }
  };

  // Componentes de Ícone Auxiliares
  const CheckBadge = () => <div className="h-4 w-4 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-bold">✓</div>;
  const ShieldStar = () => <div className="relative"><Medal className="h-4 w-4" /><Star className="h-2 w-2 absolute -top-1 -right-1 text-yellow-500 fill-current" /></div>;

  const chartData = transactions.slice(-10).map(t => ({
    name: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    amount: Number(t.amount),
    type: t.type
  }));

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        
        {/* CABEÇALHO COM GAMIFICAÇÃO */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-xl border border-primary/10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              Olá, Investidor <span className="text-2xl">👋</span>
            </h2>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <span className="font-semibold text-primary">{level}</span>
              <span>•</span>
              <span className="text-xs">Economizando {xp.toFixed(0)}% da renda</span>
            </div>
            {/* Barra de XP (Progresso para o próximo nível) */}
            <div className="mt-3 w-full md:w-[300px] space-y-1">
               <div className="flex justify-between text-[10px] uppercase text-muted-foreground font-bold">
                  <span>Nível Atual</span>
                  <span>Próximo: {level === 'Iniciante' ? 'Poupador' : level === 'Poupador' ? 'Investidor' : 'Magnata'}</span>
               </div>
               <Progress value={Math.min(100, (xp / 50) * 100)} className="h-2" />
            </div>
          </div>

          <div className="flex gap-3">
             {/* Card de Streak */}
             <div className="flex flex-col items-center justify-center bg-background border rounded-lg p-3 w-24 shadow-sm">
                <Zap className={`h-6 w-6 mb-1 ${streak > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                <span className="text-xl font-bold">{streak}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Dias Seg.</span>
             </div>
             
             {/* Card de Conquistas */}
             <div className="flex flex-col items-center justify-center bg-background border rounded-lg p-3 w-24 shadow-sm">
                <Trophy className="h-6 w-6 mb-1 text-primary" />
                <span className="text-xl font-bold">{badges.length}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Medalhas</span>
             </div>
          </div>
        </div>

        {/* ÁREA DE CONQUISTAS (BADGES) */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
             {badges.map((b, i) => (
                <Badge key={i} variant="outline" className={`px-3 py-1 gap-2 border-0 ${b.color}`}>
                   {b.icon} {b.name}
                </Badge>
             ))}
          </div>
        )}

        {/* KPIs Cards (Original) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <span className="text-primary font-bold">R$</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <p className="text-xs text-muted-foreground mt-1">Carteira Principal</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Taxa de Poupança</CardTitle>
              <TrendingUp className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.savingsRate.toFixed(1)}%</div>
              <p className="text-xs text-white/80 mt-1">da renda economizada</p>
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
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} fontSize={12} />
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
                          <p className="text-sm font-medium line-clamp-1">{t.description}</p>
                          <p className="text-xs text-muted-foreground">{t.categories?.name || t.category}</p>
                        </div>
                      </div>
                      <div className={`font-medium text-sm whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'expense' ? '-' : '+'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">Sem transações recentes.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}