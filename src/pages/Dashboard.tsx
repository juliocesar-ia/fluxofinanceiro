import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Zap, Trophy, Crown, Wallet, Scale, Filter } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { differenceInCalendarDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Confetti from 'react-confetti';
import { PrivacyDisplay } from "@/components/PrivacyDisplay";

// Helper para formatar moeda
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Estados de Filtro de Data
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth); // "all" para ano todo

  // Dados Patrimoniais
  const [netWorth, setNetWorth] = useState({ total: 0, assets: 0, liabilities: 0 });
  const [wealthDistribution, setWealthDistribution] = useState<any[]>([]);

  // Gamificação
  const [userName, setUserName] = useState("Investidor");
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState("Iniciante");
  const [xp, setXp] = useState(0);
  const [badges, setBadges] = useState<{name: string, icon: any, color: string}[]>([]);

  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, savingsRate: 0 });

  useEffect(() => {
    initializeDashboard();
  }, [selectedMonth, selectedYear]); // Recarrega quando muda o filtro

  const initializeDashboard = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 0. Definir datas de início e fim com base no filtro
    let startDate, endDate;
    const yearInt = parseInt(selectedYear);
    
    if (selectedMonth === 'all') {
      startDate = startOfYear(new Date(yearInt, 0, 1)).toISOString();
      endDate = endOfYear(new Date(yearInt, 0, 1)).toISOString();
    } else {
      const monthInt = parseInt(selectedMonth) - 1; // JS meses são 0-11
      startDate = startOfMonth(new Date(yearInt, monthInt, 1)).toISOString();
      endDate = endOfMonth(new Date(yearInt, monthInt, 1)).toISOString();
    }

    // 1. Buscar Nome do Usuário e Perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, current_streak, last_login')
      .eq('user_id', user.id)
      .single();

    if (profile?.full_name) setUserName(profile.full_name.split(' ')[0]);
    else if (user.user_metadata.full_name) setUserName(user.user_metadata.full_name.split(' ')[0]);

    // 2. Transações e Fluxo (FILTRADO PELA DATA)
    const { data: transData } = await supabase
      .from('transactions')
      .select('*, categories(name, color)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    // 3. Contas, Investimentos e Dívidas (Saldos Atuais - Snapshot)
    const { data: accounts } = await supabase.from('accounts').select('balance');
    const totalAccounts = accounts?.reduce((acc, a) => acc + Number(a.balance), 0) || 0;

    const { data: investments } = await supabase.from('investments').select('quantity, purchase_price, current_price, type');
    const totalInvestments = investments?.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.current_price || i.purchase_price)), 0) || 0;

    const { data: debts } = await supabase.from('debts').select('current_balance');
    const totalDebts = debts?.reduce((acc, d) => acc + Number(d.current_balance), 0) || 0;

    // --- CÁLCULO DE PATRIMÔNIO ---
    const totalAssets = totalAccounts + totalInvestments;
    const finalNetWorth = totalAssets - totalDebts;
    
    setNetWorth({ total: finalNetWorth, assets: totalAssets, liabilities: totalDebts });

    setWealthDistribution([
      { name: 'Em Conta', value: totalAccounts, color: '#22c55e' },
      { name: 'Investido', value: totalInvestments, color: '#3b82f6' },
      { name: 'Dívidas', value: totalDebts, color: '#ef4444' }
    ].filter(i => i.value > 0));

    if (transData) {
      setTransactions(transData);
      calculateSummary(transData);
    }

    // Gamificação
    await handleGamification(user.id, profile, calculateSummary(transData || []), (investments?.length || 0));
    
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

  const handleGamification = async (userId: string, profile: any, summ: any, investCount: number) => {
    let newLevel = "Iniciante";
    let newXp = Math.max(0, summ.savingsRate);

    if (summ.savingsRate >= 10) newLevel = "Poupador";
    if (summ.savingsRate >= 30) newLevel = "Investidor";
    if (summ.savingsRate >= 50) newLevel = "Magnata";
    
    if (newLevel === "Magnata" && level !== "Magnata") setShowConfetti(true);

    setLevel(newLevel);
    setXp(newXp);

    const earnedBadges = [];
    if (summ.balance > 0) earnedBadges.push({ name: "No Azul", icon: <Wallet className="h-3 w-3" />, color: "border-green-200 text-green-600 bg-green-50" });
    if (investCount > 0) earnedBadges.push({ name: "Investidor", icon: <TrendingUp className="h-3 w-3" />, color: "border-blue-200 text-blue-600 bg-blue-50" });
    if (summ.savingsRate > 50) earnedBadges.push({ name: "Magnata", icon: <Crown className="h-3 w-3" />, color: "border-yellow-200 text-yellow-600 bg-yellow-50" });

    setBadges(earnedBadges);

    // Streak Logic
    if (profile) {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = profile.last_login;
      let currentStreak = profile.current_streak || 0;

      if (lastLogin !== today) {
        const diff = differenceInCalendarDays(new Date(today), new Date(lastLogin));
        if (diff === 1) currentStreak += 1;
        else if (diff > 1) currentStreak = 1;
        
        await supabase.from('profiles').update({ current_streak: currentStreak, last_login: today }).eq('user_id', userId);
      }
      setStreak(currentStreak);
    }
  };

  const chartData = transactions.map(t => ({
    name: new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    amount: Number(t.amount),
    type: t.type
  }));

  // Correção de Data
  const fixDate = (dateString: string) => {
    if (!dateString) return new Date();
    return new Date(dateString + 'T12:00:00');
  };

  if (loading && !transactions.length) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <DashboardLayout>
      {showConfetti && <Confetti numberOfPieces={200} recycle={false} onConfettiComplete={() => setShowConfetti(false)} />}
      
      <div className="space-y-8 animate-fade-in">
        
        {/* HEADER GAMIFICADO & FILTROS */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-xl border border-primary/10 relative overflow-hidden">
          <div className="space-y-2 relative z-10 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    Olá, {userName} <span className="text-2xl animate-pulse">👋</span>
                    </h2>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-primary border-primary bg-primary/5 px-3 py-1 text-sm font-semibold">
                        Nível: {level}
                    </Badge>
                    <span className="text-sm">• Economia no Período: {xp.toFixed(0)}%</span>
                    </div>
                </div>

                {/* --- FILTROS DE DATA (NOVO) --- */}
                <div className="flex gap-2 bg-background/50 p-1 rounded-lg border backdrop-blur-sm">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[130px] h-9 border-0 bg-transparent focus:ring-0">
                            <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Ano Completo</SelectItem>
                            <SelectItem value="1">Janeiro</SelectItem>
                            <SelectItem value="2">Fevereiro</SelectItem>
                            <SelectItem value="3">Março</SelectItem>
                            <SelectItem value="4">Abril</SelectItem>
                            <SelectItem value="5">Maio</SelectItem>
                            <SelectItem value="6">Junho</SelectItem>
                            <SelectItem value="7">Julho</SelectItem>
                            <SelectItem value="8">Agosto</SelectItem>
                            <SelectItem value="9">Setembro</SelectItem>
                            <SelectItem value="10">Outubro</SelectItem>
                            <SelectItem value="11">Novembro</SelectItem>
                            <SelectItem value="12">Dezembro</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="w-[1px] h-6 bg-border my-auto"></div>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[80px] h-9 border-0 bg-transparent focus:ring-0">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2026">2026</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2023">2023</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="mt-3 w-full md:w-[300px] space-y-1">
               <div className="flex justify-between text-[10px] uppercase text-muted-foreground font-bold">
                  <span>Progresso</span>
                  <span>Próximo Nível</span>
               </div>
               <Progress value={Math.min(100, (xp / 50) * 100)} className="h-2" />
            </div>
          </div>

          <div className="flex gap-3 relative z-10">
             <div className="flex flex-col items-center justify-center bg-background border rounded-lg p-3 w-24 shadow-sm hover:border-yellow-400 transition-colors">
                <Zap className={`h-6 w-6 mb-1 ${streak > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                <span className="text-xl font-bold">{streak}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Dias</span>
             </div>
             <div className="flex flex-col items-center justify-center bg-background border rounded-lg p-3 w-24 shadow-sm">
                <Trophy className="h-6 w-6 mb-1 text-primary" />
                <span className="text-xl font-bold">{badges.length}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Badges</span>
             </div>
          </div>
        </div>

        {/* --- PAINEL PATRIMÔNIO --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-300">
                        <Scale className="h-5 w-5" /> Patrimônio Líquido (Atual)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        <div>
                            <div className="text-5xl font-bold tracking-tight text-white mb-1">
                                <PrivacyDisplay>{formatCurrency(netWorth.total)}</PrivacyDisplay>
                            </div>
                            <p className="text-sm text-slate-400">Sua riqueza real (Ativos - Passivos)</p>
                        </div>
                        <div className="flex gap-4 text-sm w-full md:w-auto">
                            <div className="bg-white/10 p-3 rounded-lg flex-1 md:flex-none">
                                <span className="block text-slate-400 text-xs uppercase mb-1">Ativos</span>
                                <span className="text-green-400 font-bold text-lg flex items-center gap-1">
                                    <ArrowUpRight className="h-4 w-4" /> 
                                    <PrivacyDisplay blur={false}>{formatCurrency(netWorth.assets)}</PrivacyDisplay>
                                </span>
                            </div>
                            <div className="bg-white/10 p-3 rounded-lg flex-1 md:flex-none">
                                <span className="block text-slate-400 text-xs uppercase mb-1">Passivos</span>
                                <span className="text-red-400 font-bold text-lg flex items-center gap-1">
                                    <ArrowDownRight className="h-4 w-4" /> 
                                    <PrivacyDisplay blur={false}>{formatCurrency(netWorth.liabilities)}</PrivacyDisplay>
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Distribuição</CardTitle></CardHeader>
                <CardContent className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={wealthDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                {wealthDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

        {/* KPIs Mensais */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Entradas {selectedMonth !== 'all' ? `(${format(new Date(parseInt(selectedYear), parseInt(selectedMonth)-1), 'MMMM', { locale: ptBR })})` : `(${selectedYear})`}
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center"><ArrowUpRight className="h-4 w-4 text-green-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                  <PrivacyDisplay>{formatCurrency(summary.income)}</PrivacyDisplay>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Saídas {selectedMonth !== 'all' ? `(${format(new Date(parseInt(selectedYear), parseInt(selectedMonth)-1), 'MMMM', { locale: ptBR })})` : `(${selectedYear})`}
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center"><ArrowDownRight className="h-4 w-4 text-red-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                  <PrivacyDisplay>{formatCurrency(summary.expense)}</PrivacyDisplay>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balanço do Período</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Scale className="h-4 w-4 text-primary" /></div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  <PrivacyDisplay>{formatCurrency(summary.balance)}</PrivacyDisplay>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Histórico */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Fluxo de Caixa</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
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
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                  <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <AdBanner />
            <Card className="max-h-[300px] overflow-y-auto">
              <CardHeader><CardTitle>Transações no Período</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.slice().reverse().map((t) => (
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
                        <PrivacyDisplay blur={false}>
                            {t.type === 'expense' ? '-' : '+'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </PrivacyDisplay>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">Sem dados neste período.</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}