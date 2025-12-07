import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  SheetDescription,
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
  Download,
  Loader2,
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

/**
 * Transactions - Ultra-complete single-file component
 * - Works with your schema (date is DATE)
 * - Features: filters, search, charts, totals, export CSV, bulk actions, pagination, skeletons, fallback queries, robust grouping
 *
 * Requirements:
 * - recharts
 * - date-fns
 * - your UI components (used above)
 * - supabase client configured
 *
 * Paste into Transactions.tsx and test.
 */

// ---------- Types ----------
type Transaction = {
  id: string;
  user_id?: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string; // yyyy-mm-dd or ISO substring(0,10)
  account_id?: string | null;
  card_id?: string | null;
  is_paid?: boolean | null;
  is_recurring?: boolean | null;
  category_id?: string | null;
  is_fixed?: boolean | null;
  installment_group_id?: string | null;
  installment_number?: number | null;
  installment_total?: number | null;
  observation?: string | null;
  categories?: { id?: string; name?: string; color?: string };
  accounts?: { id?: string; name?: string };
  credit_cards?: { id?: string; name?: string };
};

const isoDay = (s?: string) => String(s || "").substring(0, 10); // safe yyyy-mm-dd
const currency = (v = 0) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// small loading skeleton
function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <div className="bg-slate-200 rounded-full w-10 h-10" />
        <div className="space-y-1">
          <div className="bg-slate-200 w-48 h-4 rounded" />
          <div className="bg-slate-200 w-32 h-3 rounded mt-2" />
        </div>
      </div>
      <div className="text-right">
        <div className="bg-slate-200 w-24 h-5 rounded mb-2" />
        <div className="bg-slate-200 w-16 h-3 rounded" />
      </div>
    </div>
  );
}

export default function TransactionsFull() {
  // state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "pending">("all");
  const [accountFilter, setAccountFilter] = useState<string | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);

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
    is_recurring: false,
  });

  // Fetch data (robust: interval query first, fallback to all + local filter)
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      // Because your table `date` is of type DATE, use 'yyyy-mm-dd' range filter
      const start = format(startOfMonth(month), "yyyy-MM-dd");
      const end = format(endOfMonth(month), "yyyy-MM-dd");

      // Try efficient query
      const [transRes, accRes, cardRes, catRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*, categories(id, name, color), accounts(id, name), credit_cards(id, name)")
          .eq("user_id", user.id)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false })
          .limit(perPage)
          .range((page - 1) * perPage, page * perPage - 1),
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
        // fallback: get all transactions for user and filter locally
        const all = await supabase
          .from("transactions")
          .select("*, categories(id,name,color), accounts(id,name), credit_cards(id,name)")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (all.data) {
          const filtered = (all.data as any[]).filter((t) => {
            const d = isoDay(t.date);
            if (!d || d.length < 10) return false;
            const [y, m] = d.split("-").map(Number);
            return y === month.getFullYear() && m === month.getMonth() + 1;
          });
          setTransactions(filtered as Transaction[]);
        } else {
          setTransactions([]);
        }
      }
    } catch (err: any) {
      console.error("fetchAll transactions error", err);
      toast({ title: "Erro ao carregar transações", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [month, page, perPage, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Totals & charts
  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const paid = transactions.filter((t) => t.is_paid).reduce((s, t) => s + (t.amount || 0), 0);
    const pending = transactions.filter((t) => !t.is_paid).reduce((s, t) => s + (t.amount || 0), 0);
    return { income, expense, balance: income - expense, paid, pending };
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      const name = t.categories?.name || "Geral";
      if (t.type === "expense") map[name] = (map[name] || 0) + (t.amount || 0);
    });
    return Object.keys(map).map((k) => ({ name: k, value: map[k] }));
  }, [transactions]);

  // Group by day
  const grouped = useMemo(() => {
    const g: Record<string, Transaction[]> = {};
    transactions.forEach((t) => {
      const key = isoDay(t.date) || "unknown";
      if (!g[key]) g[key] = [];
      g[key].push(t);
    });
    // sort items in each group descending by date (and stable by id)
    Object.keys(g).forEach((k) => {
      g[k].sort((a, b) => (a.date < b.date ? 1 : -1));
    });
    return g;
  }, [transactions]);

  // Apply UI filters & search
  const visibleGroups = useMemo(() => {
    const keys = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const out: Record<string, Transaction[]> = {};
    for (const k of keys) {
      const items = grouped[k].filter((t) => {
        const matchSearch = search ? String(t.description || "").toLowerCase().includes(search.toLowerCase()) : true;
        const matchType = typeFilter === "all" ? true : t.type === typeFilter;
        const matchPaid = paidFilter === "all" ? true : (paidFilter === "paid" ? !!t.is_paid : !t.is_paid);
        const matchAccount = accountFilter === "all" ? true : t.account_id === accountFilter;
        const matchCategory = categoryFilter === "all" ? true : t.category_id === categoryFilter;
        return matchSearch && matchType && matchPaid && matchAccount && matchCategory;
      });
      if (items.length) out[k] = items;
    }
    return out;
  }, [grouped, search, typeFilter, paidFilter, accountFilter, categoryFilter]);

  // Edit open: populate form
  useEffect(() => {
    if (!editingId) return;
    const tx = transactions.find((t) => t.id === editingId);
    if (!tx) return;
    setForm({
      description: tx.description,
      amount: String(tx.amount),
      date: isoDay(tx.date),
      type: tx.type,
      category_id: tx.category_id || "",
      account_id: tx.account_id || "",
      card_id: tx.card_id || "",
      payment_method: tx.card_id ? "credit" : "debit",
      is_paid: !!tx.is_paid,
      is_fixed: !!tx.is_fixed,
      is_installment: !!tx.installment_group_id,
      installments_count: tx.installment_total || 1,
      observation: tx.observation || "",
      is_recurring: !!tx.is_recurring,
    });
    setIsSheetOpen(true);
  }, [editingId, transactions]);

  // Save transaction (create/update)
  const saveTransaction = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast({ title: "Usuário não autenticado", variant: "destructive" });

      if (!form.description || !form.amount) {
        return toast({ title: "Descrição e valor são obrigatórios", variant: "destructive" });
      }

      // normalize date to yyyy-mm-dd string (since DB column is date)
      const ymd = isoDay(form.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        return toast({ title: "Data inválida", variant: "destructive" });
      }

      const payload: any = {
        user_id: user.id,
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        date: ymd,
        category_id: form.category_id || null,
        account_id: form.payment_method === "credit" ? null : (form.account_id || null),
        card_id: form.payment_method === "credit" ? (form.card_id || null) : null,
        payment_method: form.payment_method,
        is_paid: !!form.is_paid,
        is_fixed: !!form.is_fixed,
        observation: form.observation || null,
        is_recurring: !!form.is_recurring,
      };

      if (!form.is_installment) {
        if (editingId) {
          const { error } = await supabase.from("transactions").update(payload).eq("id", editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("transactions").insert(payload);
          if (error) throw error;
        }
      } else {
        // create installments batch
        const cnt = Math.max(1, Number(form.installments_count || 1));
        const groupId = crypto.randomUUID();
        const [year, mon, day] = ymd.split("-").map(Number);
        const base = new Date(year, mon - 1, day);
        const batch: any[] = [];
        for (let i = 0; i < cnt; i++) {
          const nd = new Date(base);
          nd.setMonth(nd.getMonth() + i);
          const nextDate = format(nd, "yyyy-MM-dd");
          batch.push({
            ...payload,
            date: nextDate,
            installment_group_id: groupId,
            installment_number: i + 1,
            installment_total: cnt,
            is_paid: i === 0 ? payload.is_paid : false,
          });
        }
        if (editingId) {
          // naive approach: delete old installments for group and insert new (could be optimized)
          await supabase.from("transactions").delete().eq("installment_group_id", editingId);
          const { error } = await supabase.from("transactions").insert(batch);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("transactions").insert(batch);
          if (error) throw error;
        }
      }

      toast({ title: editingId ? "Atualizado com sucesso" : "Transações criadas" });
      setIsSheetOpen(false);
      setEditingId(null);
      fetchAll();
    } catch (err: any) {
      console.error("saveTransaction", err);
      toast({ title: "Erro ao salvar transação", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const deleteTransaction = async (id?: string) => {
    if (!id) return;
    if (!confirm("Excluir transação?")) return;
    try {
      await supabase.from("transactions").delete().eq("id", id);
      toast({ title: "Excluído" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const bulkDelete = async () => {
    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
    if (!ids.length) return toast({ title: "Nenhuma seleção" });
    if (!confirm(`Excluir ${ids.length} lançamentos?`)) return;
    try {
      await supabase.from("transactions").delete().in("id", ids);
      toast({ title: "Excluídos" });
      setSelectedIds({});
      fetchAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const togglePaid = async (id?: string, current = false) => {
    if (!id) return;
    try {
      await supabase.from("transactions").update({ is_paid: !current }).eq("id", id);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err?.message || String(err), variant: "destructive" });
    }
  };

  // CSV export
  const exportCSV = () => {
    const rows: string[] = [];
    rows.push(["id", "date", "description", "amount", "type", "category", "account", "card", "is_paid"].join(","));
    transactions.forEach((t) => {
      const row = [
        `"${t.id}"`,
        `"${isoDay(t.date)}"`,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        `${t.amount}`,
        `${t.type}`,
        `"${t.categories?.name || ""}"`,
        `"${t.accounts?.name || ""}"`,
        `"${t.credit_cards?.name || ""}"`,
        `${t.is_paid ? "paid" : "pending"}`,
      ].join(",");
      rows.push(row);
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions_${format(month, "yyyy-MM")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // checkbox handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectAllVisible = () => {
    const ids: Record<string, boolean> = {};
    Object.values(visibleGroups).forEach((arr) => arr.forEach((t) => (ids[t.id] = true)));
    setSelectedIds(ids);
  };

  const clearSelection = () => setSelectedIds({});

  // UX helper: count selected
  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  // small helpers for UI
  const formatDateHeader = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) return "Hoje";
      if (isYesterday(date)) return "Ontem";
      return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // render
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 p-4">
        {/* header controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-30 bg-background/95 py-4 border-b">
          <div>
            <h1 className="text-3xl font-bold">Extrato</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar transações..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))}>
                {"<"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
                {">"}
              </Button>
            </div>

            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paidFilter} onValueChange={(v: any) => setPaidFilter(v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={accountFilter} onValueChange={(v: any) => setAccountFilter(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Conta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas contas</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button className="ml-2 flex items-center gap-2 bg-primary text-primary-foreground" onClick={() => { setEditingId(null); setIsSheetOpen(true); }}>
              <Plus className="h-4 w-4" /> Nova
            </Button>
          </div>
        </div>

        {/* top cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Receitas</div>
                <div className="text-xl font-bold text-green-600">{currency(totals.income)}</div>
              </div>
              <ArrowUpCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-xs text-muted-foreground mt-3">Total recebido no mês</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Despesas</div>
                <div className="text-xl font-bold">{currency(totals.expense)}</div>
              </div>
              <ArrowDownCircle className="h-6 w-6" />
            </div>
            <div className="text-xs text-muted-foreground mt-3">Total gasto no mês</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Saldo</div>
                <div className={`text-xl font-bold ${totals.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{currency(totals.balance)}</div>
              </div>
              <div className="text-xs text-muted-foreground">{transactions.length} lançamentos</div>
            </div>
            <div className="text-xs text-muted-foreground mt-3">Visão rápida</div>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Pago / Pendente</div>
                <div className="text-lg font-bold">{currency(totals.paid)} / {currency(totals.pending)}</div>
              </div>
              <div className="text-xs text-muted-foreground">Percentual</div>
            </div>
            <div className="text-xs text-muted-foreground mt-3">Resumo de pagamentos</div>
            <div className="flex gap-2 mt-3">
              <Button variant="ghost" onClick={exportCSV} className="flex items-center gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
              <Button variant="ghost" onClick={() => { selectAllVisible(); }} className="flex items-center gap-2">Selecionar visíveis</Button>
              <Button variant="destructive" onClick={bulkDelete} disabled={!selectedCount}>Excluir ({selectedCount})</Button>
            </div>
          </Card>
        </div>

        {/* charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-3 md:col-span-2">
            <div className="h-56">
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
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RePie data={categoryBreakdown} innerRadius={40} outerRadius={60} >
                  {categoryBreakdown.map((entry, idx) => (
                    <Cell key={entry.name} fill={["#60a5fa", "#f87171", "#fbbf24", "#34d399", "#a78bfa"][idx % 5]} />
                  ))}
                  <Tooltip />
                </RePie>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* transactions list */}
        <div className="space-y-4">
          {/* loading skeleton */}
          {loading && (
            <Card>
              <div className="space-y-2">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            </Card>
          )}

          {!loading && Object.keys(visibleGroups).length === 0 && (
            <div className="flex flex-col items-center py-20 text-center opacity-60">
              <Filter className="h-8 w-8 mb-4" />
              <div className="text-lg font-medium">Nenhum lançamento encontrado</div>
              <div className="text-sm text-muted-foreground">Adicione uma transação ou mude o mês/filtros.</div>
            </div>
          )}

          {!loading && Object.keys(visibleGroups).map((day) => (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-3 px-1">
                <Badge variant="secondary" className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground bg-muted/50">
                  {formatDateHeader(day)}
                </Badge>
                <div className="h-[1px] flex-1 bg-border/50" />
              </div>

              <Card>
                <div className="divide-y">
                  {visibleGroups[day].map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors group">
                      <div className="flex items-center gap-4">
                        <input type="checkbox" checked={!!selectedIds[t.id]} onChange={() => toggleSelect(t.id)} />
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${t.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {t.type === "income" ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
                        </div>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{t.description}</div>
                            {t.installment_number && <Badge variant="outline">{t.installment_number}/{t.installment_total}</Badge>}
                            {t.is_fixed && <Badge variant="secondary">Fixa</Badge>}
                            {t.installment_group_id && <Badge variant="secondary">Parcela</Badge>}
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50">
                              <Tag className="h-3 w-3" /> {t.categories?.name || "Geral"}
                            </div>
                            <div className="capitalize flex items-center gap-1">
                              {t.payment_method === "credit" ? <CreditCard className="h-3 w-3" /> : <Wallet className="h-3 w-3" />} {t.payment_method === "credit" ? t.credit_cards?.name : t.accounts?.name}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`font-bold ${t.type === "income" ? "text-green-600" : ""}`}>
                            {t.type === "expense" ? "- " : "+ "}{currency(t.amount)}
                          </div>
                          <div className={`text-xs mt-1 ${t.is_paid ? "text-green-600" : "text-amber-600"} cursor-pointer`} onClick={() => togglePaid(t.id, !!t.is_paid)}>
                            {t.is_paid ? <><CheckCircle2 className="inline h-3 w-3" /> Pago</> : <><Clock className="inline h-3 w-3" /> Pendente</>}
                          </div>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingId(t.id); setIsSheetOpen(true); }}><svg className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteTransaction(t.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}

          {/* pagination controls (simple) */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <div className="text-sm text-muted-foreground">Página {page}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => { setPage((p) => Math.max(1, p - 1)); }} disabled={page === 1}><Loader2 className="h-4 w-4 transform rotate-180" /></Button>
              <Button variant="ghost" onClick={() => { setPage((p) => p + 1); }}><Loader2 className="h-4 w-4" /></Button>
              <Select value={String(perPage)} onValueChange={(v: any) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* create/edit sheet */}
        <Sheet open={isSheetOpen} onOpenChange={(v) => { setIsSheetOpen(v); if (!v) setEditingId(null); }}>
          <SheetTrigger asChild>
            <Button className="hidden">open</Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{editingId ? "Editar transação" : "Nova transação"}</SheetTitle>
              <SheetDescription>Detalhes do lançamento</SheetDescription>
            </SheetHeader>

            <div className="space-y-4 mt-2">
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
                      <Calendar selected={parseISO(form.date)} onSelect={(d) => d && setForm({ ...form, date: format(d, "yyyy-MM-dd") })} locale={ptBR} />
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
                      <SelectItem value="">Nenhuma</SelectItem>
                      {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Pagamento</Label>
                  <Select value={form.payment_method} onValueChange={(v: any) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Débito / Pix</SelectItem>
                      <SelectItem value="credit">Cartão</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.payment_method === "credit" ? (
                <div>
                  <Label>Cartão</Label>
                  <Select value={form.card_id} onValueChange={(v: any) => setForm({ ...form, card_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                    <SelectContent>{cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Conta</Label>
                  <Select value={form.account_id} onValueChange={(v: any) => setForm({ ...form, account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                    <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <Label>Pago</Label>
                    <Switch checked={form.is_paid} onCheckedChange={(v: any) => setForm({ ...form, is_paid: v })} />
                  </div>

                  <div>
                    <Label>Fixa</Label>
                    <Switch checked={form.is_fixed} onCheckedChange={(v: any) => setForm({ ...form, is_fixed: v })} />
                  </div>
                </div>

                <div>
                  <Label>Parcelar</Label>
                  <Switch checked={form.is_installment} onCheckedChange={(v: any) => setForm({ ...form, is_installment: v })} />
                </div>
              </div>

              {form.is_installment && (
                <div>
                  <Label>Quantidade de parcelas</Label>
                  <Input type="number" value={form.installments_count} onChange={(e) => setForm({ ...form, installments_count: Number(e.target.value) })} />
                </div>
              )}

              <div>
                <Label>Observação</Label>
                <Input value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { setIsSheetOpen(false); setEditingId(null); }}>Cancelar</Button>
                <Button className="flex-1" onClick={saveTransaction}>{editingId ? "Salvar" : "Confirmar"}</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}

/* Helpers used in markup scope */
function formatDateHeader(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isToday(d)) return "Hoje";
    if (isYesterday(d)) return "Ontem";
    return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}
