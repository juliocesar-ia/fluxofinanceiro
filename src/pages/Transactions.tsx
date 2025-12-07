import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, Trash2, Calendar as CalendarIcon, 
  ArrowUpCircle, ArrowDownCircle, CreditCard, Wallet, CheckCircle2, Clock, 
  Tag, Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, parseISO, isToday, isYesterday, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  account_id?: string;
  card_id?: string;
  category_id?: string;
  payment_method: string;
  is_paid: boolean;
  is_fixed: boolean;
  installment_number?: number;
  installment_total?: number;
  observation?: string;
  categories?: { name: string, color: string };
  accounts?: { name: string };
  credit_cards?: { name: string };
  // possível campo extra para parcelamento
  installment_id?: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [month, setMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); 
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Inicializa o formulário com a data de HOJE (YYYY-MM-DD)
  const [formData, setFormData] = useState<any>({
    description: "", 
    amount: "", 
    date: format(new Date(), 'yyyy-MM-dd'), 
    type: "expense", category_id: "", account_id: "", card_id: "", payment_method: "debit",
    observation: "", is_paid: true, is_fixed: false, is_installment: false, installments_count: 2
  });

  const { toast } = useToast();

  useEffect(() => { fetchAllData(); }, [month]);

  // Efeito para preencher o formulário ao editar ou limpar ao criar novo
  useEffect(() => {
    if (editingId) {
      const tx = transactions.find(t => t.id === editingId);
      if (tx) {
        // tx.date pode ser 'YYYY-MM-DD' ou ISO 'YYYY-MM-DDTHH:MM:SSZ'
        let dateToSet = tx.date;
        if (tx.date.includes('T')) {
          try {
            dateToSet = format(parseISO(tx.date), 'yyyy-MM-dd');
          } catch (e) {
            // se parse falhar, tenta pegar substring
            dateToSet = tx.date.substring(0, 10);
          }
        } else {
          dateToSet = tx.date.substring(0, 10);
        }

        setFormData({
          description: tx.description,
          amount: String(tx.amount),
          date: dateToSet,
          type: tx.type as any,
          category_id: (tx as any).category_id || "",
          account_id: (tx as any).account_id || "",
          card_id: (tx as any).card_id || "",
          payment_method: tx.payment_method || "debit",
          observation: tx.observation || "",
          is_paid: tx.is_paid,
          is_fixed: tx.is_fixed,
          is_installment: false,
          installments_count: 2
        });
      }
    } else {
      setFormData({
        description: "", amount: "", date: format(new Date(), 'yyyy-MM-dd'),
        type: "expense", category_id: "", account_id: "", card_id: "", payment_method: "debit",
        observation: "", is_paid: true, is_fixed: false, is_installment: false, installments_count: 2
      });
    }
  }, [editingId, isSheetOpen, transactions]);

  const fetchAllData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Tenta buscar por intervalo ISO (mais eficiente)
    const startISO = startOfMonth(month).toISOString();
    const endISO = endOfMonth(month).toISOString();

    try {
      const [transRes, accRes, cardRes, catRes] = await Promise.all([
        supabase.from('transactions')
          .select(`*, categories(name, color), accounts(name), credit_cards(name)`)
          .eq('user_id', user.id)
          .gte('date', startISO)
          .lte('date', endISO)
          .order('date', { ascending: false }),
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').order('name')
      ]);

      // Se voltou com dados, usa direto
      if (transRes && Array.isArray(transRes.data) && transRes.data.length > 0) {
        setTransactions(transRes.data as any);
      } else {
        // fallback: o banco pode ter a coluna como DATE (sem hora), então a query acima pode não achar
        // então buscamos TODAS as transações do usuário e filtramos localmente pelo mês selecionado
        const allRes = await supabase.from('transactions')
          .select(`*, categories(name, color), accounts(name), credit_cards(name)`)
          .eq('user_id', user.id)
          .order('date', { ascending: false });
        if (allRes && Array.isArray(allRes.data)) {
          // filtra localmente por mês/ano
          const filtered = allRes.data.filter((t: any) => {
            if (!t.date) return false;
            // extrai yyyy-mm-dd (primeiros 10 chars)
            const dateKey = String(t.date).substring(0, 10);
            const [y, m] = dateKey.split('-').map(Number);
            if (!y || !m) return false;
            return (y === month.getFullYear() && (m === month.getMonth() + 1));
          });
          setTransactions(filtered as any);
        } else {
          setTransactions([]);
        }
      }

      if (accRes.data) setAccounts(accRes.data);
      if (cardRes.data) setCards(cardRes.data);
      if (catRes.data) setCategories(catRes.data);
    } catch (err: any) {
      console.error("Erro ao buscar dados", err);
      toast({ title: "Erro ao buscar dados", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!formData.description || !formData.amount) {
      toast({ title: "Preencha a descrição e o valor", variant: "destructive" });
      return;
    }

    // garante que a data enviada pro banco seja ISO (timestamp)
    const normalizedDate = (() => {
      try {
        // se formData.date já tiver hora, parseISO; senão monta uma Date a partir do yyyy-mm-dd
        if (String(formData.date).includes('T')) {
          return new Date(formData.date).toISOString();
        } else {
          // formData.date no formato yyyy-mm-dd
          const [y, m, d] = String(formData.date).split('-').map(Number);
          const dt = new Date(y, m - 1, d, 0, 0, 0);
          return dt.toISOString();
        }
      } catch {
        return new Date().toISOString();
      }
    })();

    const basePayload: any = {
      user_id: user.id,
      description: formData.description,
      amount: Number(formData.amount),
      type: formData.type,
      date: normalizedDate,
      category_id: formData.category_id || null,
      account_id: formData.payment_method === 'credit' ? null : (formData.account_id || null),
      card_id: formData.payment_method === 'credit' ? (formData.card_id || null) : null,
      payment_method: formData.payment_method,
      is_paid: formData.is_paid,
      is_fixed: formData.is_fixed,
      observation: formData.observation,
      category: "Personalizada" 
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('transactions').update(basePayload).eq('id', editingId);
        if (error) throw error;
      } else {
        if (formData.is_installment && formData.type === 'expense') {
          const batch: any[] = [];
          const groupId = crypto.randomUUID();
          
          // Correção da data para parcelas: parte do formData.date (yyyy-mm-dd)
          const [year, monthNum, day] = String(formData.date).split('-').map(Number);
          const initialDate = new Date(year, monthNum - 1, day);
          
          for (let i = 0; i < Number(formData.installments_count); i++) {
            const nextDate = new Date(initialDate);
            nextDate.setMonth(nextDate.getMonth() + i);
            // converte pra ISO antes de inserir
            batch.push({
              ...basePayload,
              date: new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate(), 0, 0, 0).toISOString(),
              installment_id: groupId,
              installment_number: i + 1,
              installment_total: Number(formData.installments_count),
              is_paid: i === 0 ? basePayload.is_paid : false
            });
          }
          const { error } = await supabase.from('transactions').insert(batch);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('transactions').insert(basePayload);
          if (error) throw error;
        }
      }

      toast({ title: editingId ? "Atualizado com sucesso!" : "Transação criada!" });
      setIsSheetOpen(false);
      // recarrega os dados após criação/atualização
      fetchAllData(); 

    } catch (err: any) {
      console.error("Erro ao salvar transação", err);
      toast({ title: "Erro", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      await supabase.from('transactions').delete().eq('id', id);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('transactions').update({ is_paid: !currentStatus }).eq('id', id);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({
      description: "", amount: "", date: format(new Date(), 'yyyy-MM-dd'),
      type: "expense", category_id: "", account_id: "", card_id: "", payment_method: "debit",
      observation: "", is_paid: true, is_fixed: false, is_installment: false, installments_count: 2
    });
    setIsSheetOpen(true);
  };

  // Agrupamento robusto (pega os 10 primeiros chars da data, independente do formato)
  const groupedTransactions = transactions
    .filter(t => {
      const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .reduce((groups: any, t) => {
      const raw = String(t.date || "");
      const dateKey = raw.substring(0, 10); // yyyy-mm-dd
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
      return groups;
    }, {});

  const formatDateHeader = (dateStr: string) => {
    if (!dateStr) return "Data desconhecida";
    // dateStr já vem como yyyy-mm-dd
    try {
      const [year, monthStr, dayStr] = dateStr.split('-').map(Number);
      const date = new Date(year, (monthStr || 1) - 1, dayStr || 1);
      if (isToday(date)) return "Hoje";
      if (isYesterday(date)) return "Ontem";
      return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-24">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-b">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Extrato</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
               <CalendarIcon className="h-4 w-4" />
               {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="flex items-center border rounded-md bg-background">
               <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))}>{"<"}</Button>
               <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>{">"}</Button>
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button className="gap-2 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90" onClick={openNew}>
                  <Plus className="h-4 w-4" /> Nova
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle>{editingId ? "Editar Transação" : "Nova Transação"}</SheetTitle>
                  <SheetDescription>Detalhes do lançamento.</SheetDescription>
                </SheetHeader>

                <div className="space-y-6 pb-10">
                  <Tabs value={formData.type} onValueChange={(v: any) => setFormData({...formData, type: v})} className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="expense" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600">Despesa</TabsTrigger>
                      <TabsTrigger value="income" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-600">Receita</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">R$</span>
                        <Input type="number" className="pl-10 text-lg font-bold" placeholder="0,00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                      </div>
                    </div>
                    
                    <div className="space-y-2 flex flex-col">
                      <Label>Data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !formData.date && "text-muted-foreground"
                            )}
                          >
                            {formData.date ? (
                              format(parseISO(formData.date), "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.date ? parseISO(formData.date) : undefined}
                            onSelect={(date) => date && setFormData({ ...formData, date: format(date, "yyyy-MM-dd") })}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input placeholder="Ex: Supermercado" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={formData.category_id} onValueChange={v => setFormData({...formData, category_id: v})}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                                {categories.filter((c:any) => c.type === formData.type).map((c:any) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: c.color}} /> {c.name}</div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Pagamento</Label>
                        <Select value={formData.payment_method} onValueChange={v => setFormData({...formData, payment_method: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="debit">Débito / Pix</SelectItem>
                                <SelectItem value="credit">Cartão de Crédito</SelectItem>
                                <SelectItem value="cash">Dinheiro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>

                  {formData.payment_method === 'credit' ? (
                     <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Qual Cartão?</Label>
                        <Select value={formData.card_id} onValueChange={v => setFormData({...formData, card_id: v})}>
                            <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                            <SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                     </div>
                  ) : (
                     <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Qual Conta?</Label>
                        <Select value={formData.account_id} onValueChange={v => setFormData({...formData, account_id: v})}>
                            <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                            <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                        </Select>
                     </div>
                  )}

                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                     <div className="flex items-center justify-between">
                        <Label className="cursor-pointer">Já foi pago?</Label>
                        <Switch checked={formData.is_paid} onCheckedChange={v => setFormData({...formData, is_paid: v})} />
                     </div>
                     <div className="flex items-center justify-between">
                        <Label className="cursor-pointer">É despesa fixa?</Label>
                        <Switch checked={formData.is_fixed} onCheckedChange={v => setFormData({...formData, is_fixed: v})} />
                     </div>
                     
                     {!editingId && formData.type === 'expense' && (
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="cursor-pointer">Parcelar?</Label>
                                {formData.is_installment && (
                                   <div className="flex items-center gap-2 mt-1">
                                      <Input type="number" className="h-7 w-16" value={formData.installments_count} onChange={e => setFormData({...formData, installments_count: Number(e.target.value)})} />
                                      <span className="text-xs text-muted-foreground">x</span>
                                   </div>
                                )}
                            </div>
                            <Switch checked={formData.is_installment} onCheckedChange={v => setFormData({...formData, is_installment: v})} />
                        </div>
                     )}
                  </div>

                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} placeholder="Detalhes..." />
                  </div>

                  <Button size="lg" className="w-full font-bold" onClick={handleSave}>
                    {editingId ? "Salvar Alterações" : "Confirmar Lançamento"}
                  </Button>

                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="space-y-6">
            {Object.keys(groupedTransactions).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(date => (
                <div key={date} className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 px-1">
                        <Badge variant="secondary" className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground bg-muted/50">
                            {formatDateHeader(date)}
                        </Badge>
                        <div className="h-[1px] flex-1 bg-border/50"></div>
                    </div>
                    
                    <Card className="overflow-hidden border-none shadow-sm bg-card">
                        <div className="divide-y">
                            {groupedTransactions[date].map((t: Transaction) => (
                                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors group cursor-pointer" onClick={() => { setEditingId(t.id); setIsSheetOpen(true); }}>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {t.type === 'income' ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
                                        </div>
                                        
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-foreground line-clamp-1">{t.description}</span>
                                                {t.installment_number && (
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground border-muted-foreground/30">
                                                        {t.installment_number}/{t.installment_total}
                                                    </Badge>
                                                )}
                                                {t.is_fixed && <Badge variant="secondary" className="text-[9px] h-4 px-1">Fixa</Badge>}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50">
                                                    <Tag className="h-3 w-3" /> {t.categories?.name || 'Geral'}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1 capitalize">
                                                    {t.payment_method === 'credit' ? <CreditCard className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
                                                    {t.payment_method === 'credit' ? t.credit_cards?.name : t.accounts?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-foreground'}`}>
                                                {t.type === 'expense' ? '- ' : '+ '}
                                                {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                            <div 
                                                className={`text-xs flex items-center justify-end gap-1 mt-1 cursor-pointer transition-colors ${t.is_paid ? 'text-green-600' : 'text-amber-600 hover:text-amber-700'}`}
                                                onClick={(e) => { e.stopPropagation(); handleTogglePaid(t.id, t.is_paid); }}
                                            >
                                                {t.is_paid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                {t.is_paid ? "Pago" : "Pendente"}
                                            </div>
                                        </div>
                                        
                                        <Button 
                                            variant="ghost" size="icon" 
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            ))}
            
            {transactions.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                    <div className="bg-muted p-4 rounded-full mb-4">
                        <Filter className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">Nenhum lançamento encontrado</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                        Tente mudar o mês no filtro acima ou adicione uma nova transação.
                    </p>
                </div>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
}
