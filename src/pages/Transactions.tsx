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
import { Plus, Search, Trash2, Pencil, FileUp, Loader2, CalendarClock, Repeat, Anchor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import Papa from "papaparse";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Estados de Seleção
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  // Estados de Recorrência e Fixa
  const [isRecurring, setIsRecurring] = useState(false);
  const [isFixed, setIsFixed] = useState(false); // <--- NOVO
  const [recurrenceType, setRecurrenceType] = useState<'installments' | 'fixed'>('installments');
  const [installments, setInstallments] = useState(2);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

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

    if (transData) setTransactions(transData);
    if (accData) setAccounts(accData);
    if (catData) setCategories(catData);
    setLoading(false);
  };

  const fixDate = (dateString: string) => {
    if (!dateString) return new Date();
    return new Date(dateString + 'T12:00:00');
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // --- LÓGICA DE SELEÇÃO ---
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(filteredTransactions.map((t) => t.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds((prev) => [...prev, id]);
    else setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} transações?`)) return;

    const { error } = await supabase.from('transactions').delete().in('id', selectedIds);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${selectedIds.length} transações removidas!` });
      setSelectedIds([]); 
      fetchInitialData();
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza que deseja excluir?")) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) { toast({ title: "Transação removida" }); fetchInitialData(); }
  };

  const handleEdit = (t: any) => {
    setEditingTransaction(t);
    setIsRecurring(false);
    setIsFixed(t.is_fixed || false); // <--- CARREGA O ESTADO FIXO
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingTransaction(null);
    setIsRecurring(false);
    setIsFixed(false); // <--- RESET
    setInstallments(2);
    setIsDialogOpen(true);
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
      is_fixed: isFixed // <--- SALVA SE É FIXA
    };

    let error = null;

    if (editingTransaction) {
      const { error: updateError } = await supabase.from('transactions').update(baseTransaction).eq('id', editingTransaction.id);
      error = updateError;
    } else {
      if (isRecurring && recurrenceType === 'installments') {
        const transactionsToInsert = [];
        const initialDate = new Date(baseTransaction.date + 'T12:00:00');
        for (let i = 0; i < installments; i++) {
          const nextDate = addMonths(initialDate, i);
          transactionsToInsert.push({
            ...baseTransaction,
            description: `${baseTransaction.description} (${i + 1}/${installments})`,
            date: nextDate.toISOString().split('T')[0]
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
      fetchInitialData();
    }
  };

  const getEndDate = () => {
    const today = new Date();
    const end = addMonths(today, installments - 1);
    return format(end, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) { setImporting(false); return; }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const importedTransactions: any[] = [];

      try {
        if (file.name.toLowerCase().endsWith('.ofx')) {
           // Lógica OFX (Mantida igual)
           const transRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
           const typeRegex = /<TRNTYPE>(.*)/;
           const dateRegex = /<DTPOSTED>(\d{8})/;
           const amountRegex = /<TRNAMT>(.*)/;
           const memoRegex = /<MEMO>(.*)/;
           let match;
           while ((match = transRegex.exec(text)) !== null) {
              const block = match[1];
              const dateRaw = block.match(dateRegex)?.[1]?.trim();
              const amountRaw = block.match(amountRegex)?.[1]?.trim();
              const memoRaw = block.match(memoRegex)?.[1]?.trim();
              if (dateRaw && amountRaw) {
                 const dateFormatted = `${dateRaw.substring(0,4)}-${dateRaw.substring(4,6)}-${dateRaw.substring(6,8)}`;
                 const amount = parseFloat(amountRaw.replace(',', '.'));
                 importedTransactions.push({
                    user_id: user.id,
                    description: memoRaw || "Transação Importada",
                    amount: Math.abs(amount),
                    type: amount < 0 ? 'expense' : 'income',
                    date: dateFormatted,
                    category: "Importado",
                    account_id: accounts.length > 0 ? accounts[0].id : null
                 });
              }
           }
        } else if (file.name.toLowerCase().endsWith('.csv')) {
           // Lógica CSV (Mantida igual)
           Papa.parse(text, {
              header: true, skipEmptyLines: true,
              complete: (results) => {
                 results.data.forEach((row: any) => {
                    const dateVal = row['Data'] || row['date'];
                    const descVal = row['Descrição'] || row['Description'];
                    const amountVal = row['Valor'] || row['Amount'];
                    if (dateVal && amountVal) {
                       const cleanAmount = parseFloat(String(amountVal).replace('R$', '').replace('.', '').replace(',', '.').trim());
                       let cleanDate = dateVal;
                       if (dateVal.includes('/')) {
                          const parts = dateVal.split('/');
                          if(parts.length === 3) cleanDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                       }
                       if (!isNaN(cleanAmount)) {
                          importedTransactions.push({
                             user_id: user.id,
                             description: descVal || "CSV Importado",
                             amount: Math.abs(cleanAmount),
                             type: cleanAmount < 0 ? 'expense' : 'income',
                             date: cleanDate,
                             category: "Importado",
                             account_id: accounts.length > 0 ? accounts[0].id : null
                          });
                       }
                    }
                 });
              }
           });
        }

        if (importedTransactions.length > 0) {
           const { error } = await supabase.from('transactions').insert(importedTransactions);
           if (error) throw error;
           toast({ title: "Importação Concluída!", description: `${importedTransactions.length} transações importadas.` });
           fetchInitialData();
        } else {
           toast({ title: "Nenhuma transação encontrada", variant: "destructive" });
        }
      } catch (error: any) {
        toast({ title: "Erro na Importação", description: error.message, variant: "destructive" });
      } finally {
        setImporting(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div><h1 className="text-3xl font-bold tracking-tight">Transações</h1><p className="text-muted-foreground">Gerencie todas as suas entradas e saídas.</p></div>
          
          <div className="flex gap-2 items-center">
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBatchDelete} className="animate-in fade-in slide-in-from-right-5"><Trash2 className="mr-2 h-4 w-4" /> Excluir ({selectedIds.length})</Button>
            )}

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".ofx,.csv" className="hidden" />
            <Button variant="outline" onClick={triggerFileUpload} disabled={importing} className="gap-2">
               {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}<span className="hidden sm:inline">{importing ? "Lendo..." : "Importar Extrato"}</span>
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white hover:bg-primary/90" onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Nova Transação</span></Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingTransaction ? "Editar" : "Adicionar"} Transação</DialogTitle><DialogDescription>Registe uma compra única ou parcelada.</DialogDescription></DialogHeader>
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
                  
                  {/* --- OPÇÕES: FIXA E PARCELADA --- */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-muted/30 p-3 rounded-lg border flex items-center justify-between">
                        <div className="space-y-0.5"><Label className="flex items-center gap-2"><Anchor className="h-3 w-3" /> É Fixa?</Label></div>
                        <Switch checked={isFixed} onCheckedChange={setIsFixed} />
                     </div>
                     {!editingTransaction && (
                        <div className="bg-muted/30 p-3 rounded-lg border flex items-center justify-between">
                           <div className="space-y-0.5"><Label className="flex items-center gap-2"><Repeat className="h-3 w-3" /> Parcelar?</Label></div>
                           <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                        </div>
                     )}
                  </div>
                  
                  {isRecurring && !editingTransaction && (
                    <div className="space-y-3 pt-2 animate-fade-in bg-muted/20 p-3 rounded">
                       <div className="space-y-2"><Label>Parcelas</Label><div className="flex items-center gap-4"><Input type="number" min="2" max="360" value={installments} onChange={e => setInstallments(Number(e.target.value))} /><div className="text-xs text-muted-foreground whitespace-nowrap"><CalendarClock className="h-3 w-3 inline mr-1" />Fim: <strong className="text-primary">{getEndDate()}</strong></div></div></div>
                    </div>
                  )}
                  <Button type="submit" className="w-full">{editingTransaction ? "Atualizar" : (isRecurring ? `Gerar ${installments} Lançamentos` : "Salvar")}</Button>
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
                <TableHead className="w-[40px] text-center"><Checkbox checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length} onCheckedChange={(checked) => handleSelectAll(checked as boolean)} /></TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? ( <TableRow><TableCell colSpan={7} className="h-24 text-center">Carregando...</TableCell></TableRow> ) : filteredTransactions.length === 0 ? ( <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhuma transação.</TableCell></TableRow> ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className={`group hover:bg-muted/30 ${selectedIds.includes(t.id) ? 'bg-primary/5' : ''}`}>
                    <TableCell className="text-center"><Checkbox checked={selectedIds.includes(t.id)} onCheckedChange={(checked) => handleSelectOne(t.id, checked as boolean)} /></TableCell>
                    <TableCell className="font-medium">{format(fixDate(t.date), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                           {t.description} 
                           {t.is_fixed && <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-300 text-blue-600 bg-blue-50">Fixa</Badge>}
                           {t.description.match(/\(\d+\/\d+\)/) && (<Badge variant="outline" className="text-[9px] h-4 px-1 border-purple-200 text-purple-600">Parcela</Badge>)}
                        </span>
                        <span className="md:hidden text-xs text-muted-foreground">{t.categories?.name || 'Geral'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="secondary" style={{backgroundColor: t.categories?.color ? t.categories.color + '20' : undefined, color: t.categories?.color }}>{t.categories?.name || 'Geral'}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{t.accounts?.name || '-'}</TableCell>
                    <TableCell className={`text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}