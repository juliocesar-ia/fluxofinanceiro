import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, TrendingUp, TrendingDown, DollarSign, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AdBanner } from "@/components/AdBanner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categories?: { name: string, color: string };
  date: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      .select('*, categories(name, color)')
      .order('date', { ascending: false });
    
    if (error) console.error(error);
    else setTransactions(data || []);
  };

  const currentMonth = new Date().getMonth();
  const monthTransactions = transactions.filter(t => new Date(t.date).getMonth() === currentMonth);
  
  const totalIncome = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const chartData = [
    { name: 'Receitas', value: totalIncome, color: '#22c55e' },
    { name: 'Despesas', value: totalExpense, color: '#ef4444' },
  ];

  const fixDate = (dateString: string) => {
    if (!dateString) return new Date();
    return new Date(dateString + 'T12:00:00');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saldo do Mês</p>
              <h2 className={`text-3xl font-bold mt-2 ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receitas</p>
              <h2 className="text-3xl font-bold mt-2 text-green-600">
                {totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Despesas</p>
              <h2 className="text-3xl font-bold mt-2 text-red-600">
                {totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="h-full">
            <CardHeader><CardTitle>Transações Recentes</CardTitle></CardHeader>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 5).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{t.description}</span>
                            <span className="text-xs text-muted-foreground">{format(fixDate(t.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                           <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: t.categories?.color + '20', color: t.categories?.color }}>
                              {t.categories?.name || 'Geral'}
                           </span>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'expense' ? '- ' : '+ '}
                          {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Visão Geral</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `R$${value}`} />
                  <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="bg-card border border-border rounded-xl p-4 min-h-[200px] flex items-center justify-center">
             <AdBanner />
          </div>
        </div>
      </div>
    </div>
  );
}