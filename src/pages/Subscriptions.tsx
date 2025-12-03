import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, CalendarDays, Repeat, Trash2, ExternalLink, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, addYears, addWeeks, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Subscription = {
  id: string;
  name: string;
  amount: number;
  billing_cycle: 'monthly' | 'yearly' | 'weekly';
  next_payment_date: string;
  active: boolean;
  category: string;
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('next_payment_date', { ascending: true });

    if (data) setSubs(data as Subscription[]);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const { data: { user } } = await supabase.auth.getUser();

    const newSub = {
      user_id: user?.id,
      name: formData.get('name'),
      amount: Number(formData.get('amount')),
      billing_cycle: formData.get('billing_cycle'),
      next_payment_date: formData.get('date'),
      category: formData.get('category') || 'Assinatura',
      active: true
    };

    const { error } = await supabase.from('subscriptions').insert(newSub);

    if (error) toast({ title: "Erro ao salvar", variant: "destructive" });
    else {
      toast({ title: "Assinatura adicionada!" });
      setIsDialogOpen(false);
      fetchSubs();
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('subscriptions').update({ active: !currentStatus }).eq('id', id);
    if (!error) {
      setSubs(subs.map(s => s.id === id ? { ...s, active: !currentStatus } : s));
      toast({ title: currentStatus ? "Assinatura pausada" : "Assinatura reativada" });
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Remover esta assinatura do sistema?")) return;
    const { error } = await supabase.from('subscriptions').delete().eq('id', id);
    if (!error) { toast({ title: "Removido com sucesso" }); fetchSubs(); }
  };

  // Cálculos de KPI
  const totalMonthly = subs
    .filter(s => s.active)
    .reduce((acc, s) => {
      if (s.billing_cycle === 'monthly') return acc + Number(s.amount);
      if (s.billing_cycle === 'yearly') return acc + (Number(s.amount) / 12);
      if (s.billing_cycle === 'weekly') return acc + (Number(s.amount) * 4);
      return acc;
    }, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assinaturas</h1>
            <p className="text-muted-foreground">Gerencie seus pagamentos recorrentes e evite surpresas.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="h-4 w-4" /> Nova Assinatura
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Recorrência</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Serviço</Label>
                  <Input name="name" placeholder="Ex: Netflix, Spotify, Aluguel" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciclo</Label>
                    <Select name="billing_cycle" defaultValue="monthly">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Próximo Pagamento</Label>
                    <Input name="date" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input name="category" placeholder="Ex: Streaming, Casa" />
                  </div>
                </div>
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-purple-900 to-slate-900 text-white border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Custo Mensal Fixo</CardTitle>
              <Zap className="h-4 w-4 text-purple-400 absolute top-6 right-6" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <p className="text-xs text-purple-300 mt-1">Estimativa baseada nos ciclos ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Serviços</CardTitle>
              <Repeat className="h-4 w-4 text-primary absolute top-6 right-6" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{subs.filter(s => s.active).length}</div>
              <p className="text-xs text-muted-foreground mt-1">Assinaturas ativas</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Assinaturas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subs.map((sub) => (
            <Card key={sub.id} className={`transition-all ${!sub.active ? 'opacity-60 grayscale' : 'hover:border-purple-500/50'}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center font-bold text-lg text-primary">
                    {sub.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{sub.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{sub.category}</p>
                  </div>
                </div>
                <Switch checked={sub.active} onCheckedChange={() => toggleActive(sub.id, sub.active)} />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-2xl font-bold">{Number(sub.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <Badge variant="outline" className="capitalize">{sub.billing_cycle === 'monthly' ? 'mês' : sub.billing_cycle === 'yearly' ? 'ano' : 'sem'}</Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                  <CalendarDays className="h-4 w-4" />
                  <span>Renova em: <strong>{format(parseISO(sub.next_payment_date), 'dd/MM/yyyy')}</strong></span>
                </div>
              </CardContent>
              <CardContent className="pt-0 flex justify-end pb-4 px-4">
                 <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => handleDelete(sub.id)}>
                    <Trash2 className="h-4 w-4" />
                 </Button>
              </CardContent>
            </Card>
          ))}
          {subs.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/10 border-2 border-dashed rounded-xl">
              Nenhuma assinatura cadastrada.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}