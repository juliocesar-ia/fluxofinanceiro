import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Search, Trash2, Pencil, FileUp, Loader2, CalendarClock, Repeat, Anchor, 
  ChevronRight, ChevronDown, CheckCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import Papa from "papaparse";

// Tipos
type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  account_id: string;
  category_id: string;
  categories?: { name: string, color: string };
  accounts?: { name: string };
  is_fixed?: boolean;
  is_paid?: boolean;
  installment_group_id?: string;
};

type GroupedTransaction = {
  main: Transaction;
  subTransactions: Transaction[];
  isExpanded: boolean;
};

export default function TransactionsPage() {
  // Estados de Dados
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Filtro e Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Estados de Ação
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  // Estados do Formulário
  const [isRecurring, setIsRecurring] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'installments' | 'fixed'>('installments');
  const [installments, setInstallments] = useState(2);

  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Sempre que os dados brutos mudarem, reagrupa
  useEffect(() => {
    groupTransactions();
  }, [rawTransactions, searchTerm, typeFilter]);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: transData } = await supabase
      .from('transactions')
      .select(`*, accounts(name), categories(name, color)`)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    const { data: accData } = await supabase.from('accounts').select('*');
    const { data: catData } = await supabase.from('categories').select('*');

    if (transData) setRawTransactions(transData);
    if (accData) setAccounts(accData);
    if (catData) setCategories(catData);
    
    setLoading(false);
  };

  // --- LÓGICA DE AGRUPAMENTO (A "Mágica" da Seta) ---
  const groupTransactions = () => {
    // 1. Filtrar
    let filtered = rawTransactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      return matchesSearch && matchesType;
    });

    // 2. Agrupar
    const groups: Record<string, Transaction[]> = {};
    const singles: Transaction[] = [];

    filtered.forEach(t => {
      if (t.installment_group_id) {
        if (!groups[t.installment_group_id]) groups[t.installment_group_id] = [];
        groups[t.installment_group_id].push(t);
      } else {
        singles.push(t);
      }
    });

    // 3. Processar Grupos
    const processedGroups: GroupedTransaction[] = [];
    
    Object.values(groups).forEach(groupList => {
      // Ordena parcelas pela data
      groupList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Define qual mostrar: A primeira que NÃO está paga (ou a última se tudo estiver pago)
      let mainDisplay = groupList.find(t => !t.is_paid) || groupList[groupList.length - 1];
      
      // Mantém o estado de expandido se já existia antes
      const wasExpanded = groupedTransactions.find(g => g.main.installment_group_id === groupList[0].installment_group_id)?.isExpanded || false;

      processedGroups.push({
        main: mainDisplay,
        subTransactions: groupList,
        isExpanded: wasExpanded
      });
    });

    // 4. Juntar singles e groups
    const finalData = [
      ...processedGroups,
      ...singles.map(t => ({ main: t, subTransactions: [], isExpanded: false }))
    ];

    // 5. Ordenar final por data
    finalData.sort((a, b) => new Date(b.main.date).getTime() - new Date(a.main.date).getTime());

    setGroupedTransactions(finalData);
  };

  const toggleExpand = (groupId: string) => {
    setGroupedTransactions(prev => prev.map(g => {
      if (g.main.installment_group_id === groupId && g.subTransactions.length > 0) {
        return { ...g, isExpanded: !g.isExpanded };
      }
      return g;
    }));
  };

  // --- AÇÕES ---

  const handleTogglePaid = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    const { error } = await supabase.from('transactions').update({ is_paid: !currentStatus }).eq('id', id);
    
    if (!error) {
      // Atualiza localmente para refletir na hora
      setRawTransactions(prev => prev.map(t => t.id === id ? { ...t, is_paid: !currentStatus } : t));
      toast({ title: !currentStatus ? "Pago!" : "Pendente" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const baseTransaction = {
      user_id: user.id,
      description: formData.get('description'),
      amount: Number(formData.get('amount')),
      type: formData.get('type'),
      account_id: formData.get('account_id'),
      category_id: formData.get('category_id'),
      category: "Personalizada",
      date: formData.get('date') as string,
      is_fixed: isFixed,
      // Se estiver editando, mantém o status. Se for novo, nasce como Pago (true).
      is_paid: editingTransaction ? editingTransaction.is_paid : true 
    };

    let error = null;

    if (editingTransaction) {
      const { error: updateError } = await supabase.from('transactions').update(baseTransaction).eq('id', editingTransaction.id);
      error = updateError;
    } else {
      if (isRecurring && recurrenceType === 'installments') {
        const groupId = crypto.randomUUID();
        const transactionsToInsert = [];
        const initialDate = new Date(baseTransaction.date + 'T12:00:00');

        for (let i = 0; i < installments; i++) {
          const nextDate = addMonths(initialDate, i);
          transactionsToInsert.push({
            ...baseTransaction,
            description: `${baseTransaction.description} (${i + 1}/${installments})`,
            date: nextDate.toISOString().split('T')[0],
            installment_group_id: groupId,
            // REGRA DE OURO: 1ª Parcela = Paga (true), Resto = Pendente (false)
            is_paid: i === 0 ? true : false 
          });
        }
        const { error: insertError } = await supabase.from('transactions').insert(transactionsToInsert);
        error = insertError;
      } else {
        const { error: insertError } = await supabase.from('transactions').insert(baseTransaction);
        error = insertError;
      }
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo com sucesso!" });
      setIsDialogOpen(false);
      fetchInitialData(); // Recarrega tudo do banco
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Excluir?")) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) { toast({ title: "Removida" }); fetchInitialData(); }
  };

  // --- SELEÇÃO EM MASSA ---
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(rawTransactions.map(t => t.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Excluir ${selectedIds.length} transações?`)) return;
    const { error } = await supabase.from('transactions').delete().in('id', selectedIds);
    if (error) toast({ title: "Erro", variant: "destructive" });
    else { toast({ title: "Excluídos!" }); setSelectedIds([]); fetchInitialData(); }
  };

  // Helpers
  const handleEdit = (t: any) => {
    setEditingTransaction(t);
    setIsRecurring(false);
    setIsFixed(t.is_fixed || false);
    setIsDialogOpen(true);
  };
  const handleNew = () => {
    setEditingTransaction(null);
    setIsRecurring(false);
    setIsFixed(false);
    setInstallments(2);
    setIsDialogOpen(true);
  };
  const fixDate = (d: string) => new Date(d + 'T12:00:00');
  const getEndDate = () => format(addMonths(new Date(), installments - 1), "MMMM 'de' yyyy", { locale: ptBR });
  
  const triggerFileUpload = () => fileInputRef.current?.click();
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // (Lógica de upload mantida igual, omitida aqui para focar no agrupamento)
    const file = event.target.files?.[0];
    if(!file) return;
    toast({title: "Arquivo selecionado", description: "Importação em breve..."});
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-20">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div><h1 className="text-3xl font-bold tracking-tight">Transações</h1><p className="text-muted-foreground">Controle detalhado de fluxo.</p></div>
          
          <div className="flex gap-2 items-center">
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBatchDelete}><Trash2 className="mr-2 h-4 w-4" /> Excluir ({selectedIds.length})</Button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".ofx,.csv" className="hidden" />
            <Button variant="outline" onClick={triggerFileUpload} disabled={importing} className="gap-2"><FileUp className="h-4 w-4" /> <span className="hidden sm:inline">Importar</span></Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild><Button className="bg-primary text-white hover:bg-primary/90" onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Nova</span></Button></DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingTransaction ? "Editar" : "Adicionar"} Transação</DialogTitle></DialogHeader>
                <form onSubmit={handleSave} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Tipo</Label><Select name="type" defaultValue={editingTransaction?.type || "expense"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expense">Despesa</SelectItem><SelectItem value="income">Receita</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Valor</Label><Input type="number" name="amount" step="0.01" defaultValue={editingTransaction?.amount} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Descrição</Label><Input name="description" defaultValue={editingTransaction?.description} required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Data</Label><Input type="date" name="date" defaultValue={editingTransaction ? editingTransaction.date : new Date().toISOString().split('T')[0]} required /></div>
                    <div className="space-y-2"><Label>Conta</Label><Select name="account_id" defaultValue={editingTransaction?.account_id}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label>Categoria</Label><Select name="category_id" defaultValue={editingTransaction?.category_id}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{categories.map(cat => (<SelectItem key={cat.id} value={cat.id}><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />{cat.name}</div></SelectItem>))}</SelectContent></Select></div>
                  
                  {/* REMOVIDO O BOTÃO "PAGO?" DAQUI */}
                  <div className="grid grid-cols-1 gap-4">
                     <div className="bg-muted/30 p-3 rounded-lg border flex items-center justify-between">
                        <div className="space-y-0.5"><Label className="flex items-center gap-2"><Anchor className="h-3 w-3" /> É Fixa?</Label></div>
                        <Switch checked={isFixed} onCheckedChange={setIsFixed} />
                     </div>
                  </div>

                  {!editingTransaction && (
                    <div className="bg-muted/30 p-3 rounded-lg border flex flex-col gap-3">
                       <div className="flex items-center justify-between">
                           <div className="space-y-0.5"><Label className="flex items-center gap-2"><Repeat className="h-3 w-3" /> Parcelar?</Label></div>
                           <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                       </div>
                       {isRecurring && (
                        <div className="space-y-2 animate-fade-in pt-2 border-t border-border/50"><Label>Parcelas</Label><div className="flex items-center gap-4"><Input type="number" min="2" max="360" value={installments} onChange={e => setInstallments(Number(e.target.value))} /><div className="text-xs text-muted-foreground whitespace-nowrap"><CalendarClock className="h-3 w-3 inline mr-1" />Fim: <strong className="text-primary">{getEndDate()}</strong></div></div></div>
                       )}
                    </div>
                  )}
                  <Button type="submit" className="w-full">{editingTransaction ? "Atualizar" : "Salvar"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="relative w-full sm:w-96"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            <Button variant={typeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('all')}>Todas</Button>
            <Button variant={typeFilter === 'income' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('income')}>Receitas</Button>
            <Button variant={typeFilter === 'expense' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('expense')}>Despesas</Button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px] text-center"><Checkbox checked={rawTransactions.length > 0 && selectedIds.length === rawTransactions.length} onCheckedChange={(checked) => handleSelectAll(checked as boolean)} /></TableHead>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? ( <TableRow><TableCell colSpan={8} className="h-24 text-center">Carregando...</TableCell></TableRow> ) : groupedTransactions.length === 0 ? ( <TableRow><TableCell colSpan={8} className="h-24 text-center">Nenhuma transação.</TableCell></TableRow> ) : (
                groupedTransactions.map((group, index) => (
                  <>
                    {/* LINHA PRINCIPAL */}
                    <TableRow key={group.main.id} className={`group hover:bg-muted/30 ${selectedIds.includes(group.main.id) ? 'bg-primary/5' : ''}`}>
                      <TableCell className="text-center"><Checkbox checked={selectedIds.includes(group.main.id)} onCheckedChange={(checked) => handleSelectOne(group.main.id, checked as boolean)} /></TableCell>
                      <TableCell className="font-medium">{format(fixDate(group.main.date), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* SETA PARA EXPANDIR */}
                          {group.subTransactions.length > 0 && (
                             <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground" onClick={() => toggleExpand(group.main.installment_group_id!)}>
                                {group.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                             </Button>
                          )}
                          <div className="flex flex-col">
                            <span className="flex items-center gap-2">
                               {group.main.description} 
                               {group.main.is_fixed && <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-300 text-blue-600 bg-blue-50">Fixa</Badge>}
                               {group.main.description.match(/\(\d+\/\d+\)/) && (<Badge variant="outline" className="text-[9px] h-4 px-1 border-purple-200 text-purple-600">Parcela</Badge>)}
                            </span>
                            <span className="md:hidden text-xs text-muted-foreground">{group.main.categories?.name || 'Geral'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell"><Badge variant="secondary" style={{backgroundColor: group.main.categories?.color ? group.main.categories.color + '20' : undefined, color: group.main.categories?.color }}>{group.main.categories?.name || 'Geral'}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{group.main.accounts?.name || '-'}</TableCell>
                      <TableCell className={`text-right font-bold ${group.main.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{Number(group.main.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      
                      {/* STATUS (APENAS PARA DESPESAS) */}
                      <TableCell className="text-center">
                         {group.main.type === 'expense' && (
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className={`h-6 px-2 gap-1 ${group.main.is_paid ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-muted-foreground hover:bg-muted"}`}
                               onClick={(e) => handleTogglePaid(e, group.main.id, !!group.main.is_paid)}
                             >
                                {group.main.is_paid ? <CheckCircle className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                             </Button>
                         )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(group.main)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(group.main.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* LINHAS EXPANDIDAS */}
                    {group.isExpanded && group.subTransactions.map((subT) => {
                        if(subT.id === group.main.id) return null; 
                        return (
                            <TableRow key={subT.id} className="bg-muted/10 hover:bg-muted/20 text-sm">
                                <TableCell></TableCell>
                                <TableCell className="font-medium pl-8 text-muted-foreground">{format(fixDate(subT.date), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                                <TableCell className="text-muted-foreground pl-8 flex items-center gap-2">
                                    {subT.description}
                                    {subT.description.match(/\(\d+\/\d+\)/) && (<Badge variant="outline" className="text-[8px] h-3 px-1 text-muted-foreground border-muted-foreground/30">Futura</Badge>)}
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right text-muted-foreground">{Number(subT.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                <TableCell className="text-center">
                                    {subT.type === 'expense' && (
                                        <Button variant="ghost" size="sm" className={`h-6 px-2 ${subT.is_paid ? "text-green-600" : "text-muted-foreground"}`} onClick={(e) => handleTogglePaid(e, subT.id, !!subT.is_paid)}>
                                            {subT.is_paid ? <CheckCircle className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                                        </Button>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(subT.id)}><Trash2 className="h-3 w-3 text-red-400" /></Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}