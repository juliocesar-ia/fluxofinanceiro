import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileSpreadsheet, FileText, TrendingUp, TrendingDown, Award, PieChart as PieChartIcon } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie 
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// Cores para o gráfico de pizza
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const { toast } = useToast();
  
  // Referência para exportação PDF
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar transações do ano selecionado para gerar histórico completo
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data } = await supabase
      .from('transactions')
      .select('*, categories(name, color)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (data) setTransactions(data);
    setLoading(false);
  };

  // --- Processamento de Dados ---

  // 1. Dados Mensais (para o gráfico de barras)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i;
    const monthTrans = transactions.filter(t => new Date(t.date).getMonth() === monthIndex);
    const income = monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    return {
      name: format(new Date(Number(year), i, 1), 'MMM', { locale: ptBR }),
      Receita: income,
      Despesa: expense,
      Saldo: income - expense
    };
  });

  // 2. Dados por Categoria (para o gráfico de pizza - filtrado pelo mês selecionado)
  const currentMonthTransactions = transactions.filter(t => new Date(t.date).getMonth() === Number(month) - 1 && t.type === 'expense');
  
  const categoryDataMap = currentMonthTransactions.reduce((acc: any, t) => {
    const catName = t.categories?.name || t.category || 'Outros';
    if (!acc[catName]) acc[catName] = 0;
    acc[catName] += Number(t.amount);
    return acc;
  }, {});

  const categoryData = Object.keys(categoryDataMap).map(key => ({
    name: key,
    value: categoryDataMap[key]
  })).sort((a, b) => b.value - a.value); // Ordenar do maior para o menor

  // 3. KPIs do "Wrapped"
  const totalYearIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalYearExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const biggestExpense = transactions.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];
  const bestMonth = monthlyData.reduce((prev, current) => (prev.Saldo > current.Saldo) ? prev : current);

  // --- Funções de Exportação ---

  const exportPDF = async () => {
    if (!reportRef.current) return;
    toast({ title: "Gerando PDF...", description: "Aguarde um momento." });
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`relatorio-financeiro-${year}.pdf`);
      toast({ title: "PDF Baixado com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
      Data: format(new Date(t.date), 'dd/MM/yyyy'),
      Descrição: t.description,
      Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
      Categoria: t.categories?.name || t.category,
      Valor: t.amount,
      Conta: t.account_id ? 'Conta Vinculada' : '-'
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
    XLSX.writeFile(workbook, `financeiro-${year}.xlsx`);
    toast({ title: "Excel Baixado com sucesso!" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in pb-10">
        
        {/* Header e Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios Avançados</h1>
            <p className="text-muted-foreground">Análise detalhada da sua vida financeira.</p>
          </div>
          
          <div className="flex gap-2">
             <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 12}, (_, i) => (
                  <SelectItem key={i} value={(i+1).toString()}>{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={exportPDF} title="Baixar PDF">
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={exportExcel} title="Baixar Excel">
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Área Principal de Conteúdo (Ref para PDF) */}
        <div ref={reportRef} className="space-y-8 bg-background p-2"> {/* Padding para o PDF não cortar bordas */}
          
          {/* Seção 1: Wrapped Financeiro (Resumo do Ano) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 font-medium">Fluxo Anual</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400 absolute top-6 right-6" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalYearIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                <p className="text-xs text-slate-400 mt-1">Total Recebido em {year}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Melhor Mês</CardTitle>
                <Award className="h-4 w-4 text-yellow-500 absolute top-6 right-6" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{bestMonth?.name || '-'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sobrou: <span className="text-green-600 font-semibold">{bestMonth?.Saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </p>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Maior Despesa</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500 absolute top-6 right-6" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate" title={biggestExpense?.description || '-'}>
                  {biggestExpense?.description || 'Nenhuma'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor: <span className="text-red-600 font-semibold">{Number(biggestExpense?.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-primary font-medium">Economia Total</CardTitle>
                <PieChartIcon className="h-4 w-4 text-primary absolute top-6 right-6" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {(totalYearIncome - totalYearExpense).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <p className="text-xs text-primary/70 mt-1">Acumulado no ano</p>
              </CardContent>
            </Card>
          </div>

          {/* Seção 2: Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Gráfico de Barras (Evolução Mensal) */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Evolução Financeira ({year})</CardTitle>
                <CardDescription>Comparativo mensal de entradas e saídas.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `R$${v/1000}k`} />
                    <Tooltip 
                      formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Pizza (Categorias do Mês) */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Gastos por Categoria</CardTitle>
                <CardDescription>Onde você gastou mais em {format(new Date(Number(year), Number(month)-1), 'MMMM', { locale: ptBR })}.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                 {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                       Sem dados de despesa neste mês.
                    </div>
                 )}
              </CardContent>
            </Card>

            {/* Lista Top Gastos */}
            <Card className="col-span-1">
               <CardHeader>
                  <CardTitle>Top Categorias</CardTitle>
                  <CardDescription>Ranking de gastos do mês.</CardDescription>
               </CardHeader>
               <CardContent>
                  <div className="space-y-4">
                     {categoryData.slice(0, 5).map((cat, index) => (
                        <div key={index} className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="font-medium">{cat.name}</span>
                           </div>
                           <div className="text-sm font-semibold">
                              {cat.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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