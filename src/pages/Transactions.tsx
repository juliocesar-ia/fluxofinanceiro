import { useEffect, useState } from "react";
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
import { Plus, Search, Filter, Trash2, Pencil, CalendarClock, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Estados do Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  // Estados de Recorrência/Parcelamento
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'installments' | 'fixed'>('installments');
  const [installments, setInstallments] = useState(2);
  
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

    // Buscar Transações
    const { data: transData } = await supabase
      .from('transactions')
      .select(`*, accounts(name), categories(name, color)`)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    // Buscar Auxiliares
    const { data: accData } = await supabase.from('accounts').select('*');
    const { data: catData } = await supabase.from('categories').select('*');

    if (transData) setTransactions(transData);
    if (accData) setAccounts(accData);
    if (catData) setCategories(catData);
    
    setLoading(false);
  };

  // Corrige bug de data (GMT-3)
  const fixDate = (dateString: string) => {
    if (!dateString) return new Date();
    return new Date(dateString + 'T12:00:00');
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza que deseja excluir?")) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      toast({ title: "Transação removida" });
      fetchInitialData();
    }
  };

  const handleEdit = (t: any) => {
    setEditingTransaction(t);
    setIsRecurring(false); // Desativa recorrência na edição para simplificar
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingTransaction(null);
    setIsRecurring(false);
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
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      type: formData.get('type'),
      account_id: formData.get('account_id'),
      category_id: formData.get('category_id'),
      category: "Personalizada",
      date: formData.get('date') as string
    };

    let error = null;

    if (editingTransaction) {
      // Edição simples (sem gerar parcelas)
      const { error: updateError } = await supabase
        .from('transactions')
        .update(baseTransaction)
        .eq('id', editingTransaction.id);
      error = updateError;
    } else {
      // Criação (Com suporte a parcelamento)
      if (isRecurring && recurrenceType === 'installments') {
        // GERAÇÃO DE PARCELAS
        const transactionsToInsert = [];
        const initialDate = new Date(baseTransaction.date + 'T12:00:00');

        for (let i = 0; i < installments; i++) {
          const nextDate = addMonths(initialDate, i);
          transactionsToInsert.push({
            ...baseTransaction,
            description: `${baseTransaction.description} (${i + 1}/${installments})`,
            date: nextDate.toISOString().split('T')[0] // Formato YYYY-MM-DD
          });
        }

        const { error: insertError } = await supabase.from('transactions').insert(transactionsToInsert);
        error = insertError;

      } else {
        // Inserção Única (ou Recorrente Fixa tratada como única por enquanto)
        const { error: insertError } = await supabase.from('transactions').insert(baseTransaction);
        error = insertError;
      }
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      const msg = isRecurring 
        ? `Criadas ${installments} parcelas com sucesso!` 
        : (editingTransaction ? "Atualizado com sucesso!" : "Criado com sucesso!");
      
      toast({ title: msg });
      setIsDialogOpen(false);
      fetchInitialData();
    }
  };

  // Cálculo da data final para feedback visual
  const getEndDate = () => {
    const today = new Date();
    const end = addMonths(today, installments - 1);
    return format(end, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
            <p className="text-muted-foreground">Gerencie entradas, saídas e parcelamentos.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-primary/90" onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" /> Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? "Editar Transação" : "Adicionar Transação"}</DialogTitle>
                {!editingTransaction && <DialogDescription>Registe uma compra única ou parcelada.</DialogDescription>}
              </DialogHeader>
              
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select name="type" defaultValue={editingTransaction?.type || "expense"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor {isRecurring && "(da parcela)"}</Label>
                    <Input 
                      type="number" 
                      name="amount" 
                      step="0.01" 
                      placeholder="0,00" 
                      defaultValue={editingTransaction?.amount} 
                      required 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input 
                    name="description" 
                    placeholder="Ex: Compra TV, Empréstimo" 
                    defaultValue={editingTransaction?.description}
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data {isRecurring && "(1ª parcela)"}</Label>
                    <Input 
                      type="date" 
                      name="date" 
                      defaultValue={editingTransaction ? editingTransaction.date : new Date().toISOString().split('T')[0]} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta / Cartão</Label>
                    <Select name="account_id" defaultValue={editingTransaction?.account_id}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select name="category_id" defaultValue={editingTransaction?.category_id}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      )) : <SelectItem value="default" disabled>Nenhuma categoria criada</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {/* --- SEÇÃO DE PARCELAMENTO (APENAS NA CRIAÇÃO) --- */}
                {!editingTransaction && (
                  <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base flex items-center gap-2">
                           <Repeat className="h-4 w-4" /> Repetir / Parcelar?
                        </Label>
                        <p className="text-xs text-muted-foreground">Criar múltiplas transações futuras.</p>
                      </div>
                      <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                    </div>

                    {isRecurring && (
                      <div className="space-y-3 pt-2 animate-fade-in">
                        <div className="space-y-2">
                           <Label>Tipo de Repetição</Label>
                           <Select value={recurrenceType} onValueChange={(v:any) => setRecurrenceType(v)}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="installments">Parcelado (x vezes)</SelectItem>
                               {/* <SelectItem value="fixed">Fixo (Mensal)</SelectItem> - Desativado por enquanto */} 
                             </SelectContent>
                           </Select>
                        </div>

                        {recurrenceType === 'installments' && (
                          <div className="space-y-2">
                            <Label>Número de Parcelas</Label>
                            <div className="flex items-center gap-4">
                              <Input 
                                type="number" 
                                min="2" 
                                max="360" 
                                value={installments} 
                                onChange={e => setInstallments(Number(e.target.value))} 
                              />
                              <div className="text-xs text-muted-foreground whitespace-nowrap">
                                <CalendarClock className="h-3 w-3 inline mr-1" />
                                Termina em <strong className="text-primary">{getEndDate()}</strong>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full">
                  {editingTransaction ? "Atualizar Transação" : (isRecurring ? `Gerar ${installments} Lançamentos` : "Salvar Transação")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
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
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Carregando...</TableCell></TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma transação.</TableCell></TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="group hover:bg-muted/30">
                    <TableCell className="font-medium">{format(fixDate(t.date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell>
                      {t.description}
                      {/* Indicador visual se for parcela (detectado pelo texto) */}
                      {t.description.match(/\(\d+\/\d+\)/) && (
                         <Badge variant="outline" className="ml-2 text-[10px] h-4 border-purple-200 text-purple-600">Parcelado</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="secondary" style={{backgroundColor: t.categories?.color ? t.categories.color + '20' : undefined, color: t.categories?.color }}>{t.categories?.name || 'Geral'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.accounts?.name}</TableCell>
                    <TableCell className={`text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                         </Button>
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