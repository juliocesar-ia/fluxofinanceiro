import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Trash2,
  Calendar as CalendarIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  Wallet,
  CheckCircle2,
  Clock,
  Tag,
  Filter,
  PieChart,
  BarChart2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
  isToday,
  isYesterday,
  addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, PieChart as RePie, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

// ---------- Types ----------

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string; // ISO or yyyy-mm-dd
  category_id?: string | null;
  account_id?: string | null;
  card_id?: string | null;
  payment_method?: string;
  is_paid?: boolean;
  is_fixed?: boolean;
  installment_number?: number | null;
  installment_total?: number | null;
  observation?: string | null;
  categories?: { name?: string; color?: string };
  accounts?: { name?: string };
  credit_cards?: { name?: string };
};

// ---------- Helpers ----------
const isoDayKey = (d?: string) => String(d || "").substring(0, 10);
const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------- Component ----------
export default function TransactionsRedesign() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // dropdown data
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const { toast } = useToast();

  // form
  const [form, setForm] = useState<any>({
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    type: "expense",
    category_id: "",
    account_id: "",
    card_id: "",
    payment_method: "debit",
    is_paid: true,
    is_fixed: false,
    is_installment: false,
    installments_count: 1,
    observation: "",
  });

  // fetch data (robusto: tenta intervalo ISO e tem fallback)
  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function fetchAllData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const startISO = startOfMonth(month).toISOString();
      const endISO = endOfMonth(month).toISOString();

      const [transRes, accRes, cardRes, catRes] = await Promise.all([
        supabase
          .from("transactions")
          .select(`*, categories(name, color), accounts(name), credit_cards(name)`)
          .eq("user_id", user.id)
          .gte("date", startISO)
          .lte("date", endISO)
          .order("date", { ascending: false }),
        supabase.from("accounts").select("*").eq("user_id", user.id),
        supabase.from("credit_cards").select("*").eq("user_id", user.id),
        supabase.from("categories").select("*").order("name"),
      ]);

      if (accRes.data) setAccounts(accRes.data);
      if (cardRes.data) setCards(cardRes.data);
      if (catRes.data) setCategories(catRes.data);

      if (transRes.data && transRes.data.length > 0) {
        setTransactions(transRes.data as Transaction[]);
      } else {
        // fallback: busca tudo e filtra localmente (evita problema com coluna DATE vs TIMESTAMP)
        const all = await supabase
          .from("transactions")
          .select(`*, categories(name, color), accounts(name), credit_cards(name)`)
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (all.data) {
          const filtered = (all.data as any[]).filter((t) => {
            const k = isoDayKey(t.date);
            if (!k || k.length < 10) return false;
            const [y, m] = k.split("-").map(Number);
            return y === month.getFullYear() && m === month.getMonth() + 1;
          });
          setTransactions(filtered as Transaction[]);
        } else {
          setTransactions([]);
        }
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao buscar dados", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // quick totals and charts
  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      const cat = t.categories?.name || "Geral";
      map[cat] = (map[cat] || 0) + (t.type === "expense" ? t.amount : 0);
    });
    return Object.keys(map).map((k) => ({ name: k, value: map[k] }));
  }, [transactions]);

  // grouped by day
  const grouped = useMemo(() => {
    const g: Record<string, Transaction[]> = {};
    transactions.forEach((t) => {
      const k = isoDayKey(t.date) || "unknown";
      if (!g[k]) g[k] = [];
      g[k].push(t);
    });
    return g;
  }, [transactions]);

  // filters
  const visibleGroups = useMemo(() => {
    const keys = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const result: Record<string, Transaction[]> = {};
    for (const k of keys) {
      const items = grouped[k].filter((t) => {
        const matchSearch = searchTerm ? String(t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) : true;
        const matchType = typeFilter === "all" ? true : t.type === typeFilter;
        return matchSearch && matchType;
      });
      if (items.length) result[k] = items;
    }
    return result;
  }, [grouped, searchTerm, typeFilter]);

  // edit/open handlers
  useEffect(() => {
    if (!editingId) return;
    const tx = transactions.find((t) => t.id === editingId);
    if (!tx) return;
    const date = isoDayKey(tx.date);
    setForm({
      description: tx.description,
      amount: String(tx.amount),
      date,
      type: tx.type,
      category_id: tx.category_id || "",
      account_id: tx.account_id || "",
      card_id: tx.card_id || "",
      payment_method: tx.payment_method || "debit",
      is_paid: !!tx.is_paid,
      is_fixed: !!tx.is_fixed,
      is_installment: false,
      installments_count: tx.installment_total || 1,
      observation: tx.observation || "",
    });
    setIsSheetOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  // Save (create/update)
  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (!form.description || !form.amount) return toast({ title: "Preencha descrição e valor", variant: "destructive" });

      // normalize to ISO at midnight local
      const [y, m, d] = String(form.date).split("-").map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0);
      const iso = dt.toISOString();

      const payload: any = {
        user_id: user.id,
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        date: iso,
        category_id: form.category_id || null,
        account_id: form.payment_method === "credit" ? null : form.account_id || null,
        card_id: form.payment_method === "credit" ? form.card_id || null : null,
        payment_method: form.payment_method,
        is_paid: !!form.is_paid,
        is_fixed: !!form.is_fixed,
        observation: form.observation || null,
      };

      if (form.is_installment && form.type === "expense" && Number(form.installments_count) > 1) {
        const batch: any[] = [];
        const groupId = crypto.randomUUID();
        for (let i = 0; i < Number(form.installments_count); i++) {
          const nd = new Date(dt);
          nd.setMonth(nd.getMonth() + i);
          batch.push({ ...payload, date: new Date(nd.getFullYear(), nd.getMonth(), nd.getDate(), 0, 0, 0).toISOString(), installment_id: groupId, installment_number: i + 1, installment_total: Number(form.installments_count), is_paid: i === 0 ? payload.is_paid : false });
        }
        if (editingId) {
          await supabase.from('transactions').update(payload).eq('id', editingId);
        } else {
          await supabase.from('transactions').insert(batch);
        }
      } else {
        if (editingId) {
          await supabase.from('transactions').update(payload).eq('id', editingId);
        } else {
          await supabase.from('transactions').insert(payload);
        }
      }

      toast({ title: editingId ? "Atualizado" : "Criado" });
      setIsSheetOpen(false);
      setEditingId(null);
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Excluir esta transação?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    fetchAllData();
  };

  const togglePaid = async (id?: string, current = false) => {
    if (!id) return;
    await supabase.from('transactions').update({ is_paid: !current }).eq('id', id);
    fetchAllData();
  };

  // ---------- UI ----------
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        {/* Header + Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-30 bg-background/95 py-4 px-4 border-b">
          <div>
            <h1 className="text-3xl font-bold">Extrato</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2"><CalendarIcon className="h-4 w-4" />{format(month, "MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar transações..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))}>&lt;</Button>
              <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>&gt;</Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button className="ml-2 flex items-center gap-2 bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> Nova</Button>
              </SheetTrigger>

              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>{editingId ? 'Editar transação' : 'Nova transação'}</SheetTitle>
                </SheetHeader>

                <div className="space-y-4 mt-2 p-2">
                  <Tabs value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <TabsList className="grid grid-cols-2">
                      <TabsTrigger value="expense">Despesa</TabsTrigger>
                      <TabsTrigger value="income">Receita</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor</Label>
                      <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full text-left">{form.date}</Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <Calendar selected={parseISO(form.date)} onSelect={(d) => d && setForm({ ...form, date: format(d, 'yyyy-MM-dd') })} locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Categoria</Label>
                      <Select value={form.category_id} onValueChange={(v: any) => setForm({ ...form, category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c:any)=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Pagamento</Label>
                      <Select value={form.payment_method} onValueChange={(v:any)=> setForm({ ...form, payment_method: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debit">Débito/Pix</SelectItem>
                          <SelectItem value="credit">Crédito</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {form.payment_method === 'credit' ? (
                    <div>
                      <Label>Cartão</Label>
                      <Select value={form.card_id} onValueChange={(v:any)=> setForm({ ...form, card_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{cards.map(c=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label>Conta</Label>
                      <Select value={form.account_id} onValueChange={(v:any)=> setForm({ ...form, account_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{accounts.map(a=> <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <Label>Pago</Label>
                        <Switch checked={form.is_paid} onCheckedChange={(v:any)=> setForm({ ...form, is_paid: v })} />
                      </div>
                      <div>
                        <Label>Fixa</Label>
                        <Switch checked={form.is_fixed} onCheckedChange={(v:any)=> setForm({ ...form, is_fixed: v })} />
                      </div>
                    </div>
                    <div>
                      <Label>Parcelar</Label>
                      <Switch checked={form.is_installment} onCheckedChange={(v:any) => setForm({ ...form, is_installment: v })} />
                    </div>
                  </div>

                  {form.is_installment && (
                    <div>
                      <Label>Quantidade de parcelas</Label>
                      <Input type="number" value={form.installments_count} onChange={(e)=> setForm({ ...form, installments_count: Number(e.target.value) })} />
                    </div>
                  )}

                  <div>
                    <Label>Observação</Label>
                    <Input value={form.observation} onChange={(e)=> setForm({ ...form, observation: e.target.value })} />
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={()=> { setIsSheetOpen(false); setEditingId(null); }}>Cancelar</Button>
                    <Button className="flex-1" onClick={handleSave}>{editingId ? 'Salvar' : 'Confirmar'}</Button>
                  </div>

                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Top stats + charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Receitas</div>
                <div className="text-xl font-bold text-green-600">{currency(totals.income)}</div>
              </div>
              <PieChart className="h-6 w-6 text-green-600" />
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Total recebido neste mês</div>
          </Card>

          <Card className="p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Despesas</div>
                <div className="text-xl font-bold text-foreground">{currency(totals.expense)}</div>
              </div>
              <BarChart2 className="h-6 w-6 text-foreground" />
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Total gasto neste mês</div>
          </Card>

          <Card className="p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Saldo</div>
                <div className={`text-xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currency(totals.balance)}</div>
              </div>
              <div className="text-xs text-muted-foreground">{transactions.length} lançamentos</div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Visão rápida</div>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-3 md:col-span-2">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-3">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RePie data={categoryBreakdown} innerRadius={40} outerRadius={60}>
                  {categoryBreakdown.map((entry, idx) => (
                    <Cell key={entry.name} fill={['#60a5fa', '#f87171', '#fbbf24', '#34d399'][idx % 4]} />
                  ))}
                  <Tooltip />
                </RePie>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Transactions list */}
        <div className="space-y-4">
          {Object.keys(visibleGroups).length === 0 && !loading ? (
            <div className="flex flex-col items-center py-20 text-center opacity-60">
              <Filter className="h-8 w-8 mb-4" />
              <div className="text-lg font-medium">Nenhum lançamento encontrado</div>
              <div className="text-sm text-muted-foreground">Adicione uma transação ou mude o mês.</div>
            </div>
          ) : (
            Object.keys(visibleGroups).map((day) => (
              <div key={day} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <Badge variant="secondary" className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground bg-muted/50">{(isToday(new Date(day)) && 'Hoje') || (isYesterday(new Date(day)) && 'Ontem') || format(new Date(day), "EEEE, d 'de' MMMM", { locale: ptBR })}</Badge>
                  <div className="h-[1px] flex-1 bg-border/50" />
                </div>

                <Card>
                  <div className="divide-y">
                    {visibleGroups[day].map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {t.type === 'income' ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{t.description}</div>
                              {t.installment_number && <Badge variant="outline">{t.installment_number}/{t.installment_total}</Badge>}
                              {t.is_fixed && <Badge variant="secondary">Fixa</Badge>}
                            </div>

                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50"><Tag className="h-3 w-3" />{t.categories?.name || 'Geral'}</div>
                              <div className="capitalize flex items-center gap-1">{t.payment_method === 'credit' ? <CreditCard className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}{t.payment_method === 'credit' ? t.credit_cards?.name : t.accounts?.name}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`font-bold ${t.type === 'income' ? 'text-green-600' : ''}`}>{t.type === 'expense' ? '- ' : '+ '}{currency(t.amount)}</div>
                            <div className={`text-xs mt-1 ${t.is_paid ? 'text-green-600' : 'text-amber-600'}`} onClick={() => togglePaid(t.id, !!t.is_paid)}>{t.is_paid ? <><CheckCircle2 className="inline h-3 w-3" /> Pago</> : <><Clock className="inline h-3 w-3" /> Pendente</>}</div>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingId(t.id); setIsSheetOpen(true); }}><svg className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ))
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
