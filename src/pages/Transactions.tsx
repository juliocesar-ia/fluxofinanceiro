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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, ArrowUpDown, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Estados do Modal e Edição
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null); // Armazena a transação sendo editada
  
  const { toast } = useToast();

  // Dados auxiliares
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Buscar Transações
    const { data: transData } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (name, color)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    // 2. Buscar Contas
    const { data: accData } = await supabase.from('accounts').select('*');
    
    // 3. Buscar Categorias
    const { data: catData } = await supabase.from('categories').select('*');

    if (transData) setTransactions(transData);
    if (accData) setAccounts(accData);
    if (catData) setCategories(catData);
    
    setLoading(false);
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

  // Função para abrir modal em modo EDIÇÃO
  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction); // Salva os dados
    setIsDialogOpen(true); // Abre o modal
  };

  // Função para abrir modal em modo CRIAÇÃO (limpa dados anteriores)
  const handleNew = () => {
    setEditingTransaction(null);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const accountId = formData.get('account_id')?.toString();
    const categoryId = formData.get('category_id')?.toString();

    if (!accountId || accountId === "default") {
       toast({ title: "Selecione uma conta!", variant: "destructive" });
       return;
    }

    const transactionData = {
      user_id: user.id,
      description: formData.get('description'),
      amount: Number(formData.get('amount')),
      type: formData.get('type'),
      date: formData.get('date'),
      account_id: accountId,
      category_id: categoryId,
      category: "Personalizada" 
    };

    let error;

    if (editingTransaction) {
      // MODO EDIÇÃO: Update
      const { error: updateError } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', editingTransaction.id);
      error = updateError;
    } else {
      // MODO CRIAÇÃO: Insert
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionData);
      error = insertError;
    }

    if (error) {
      console.error(error);
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingTransaction ? "Transação atualizada!" : "Transação criada!" });
      setIsDialogOpen(false);
      fetchInitialData();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
            <p className="text-muted-foreground">Gerencie todas as suas entradas e saídas.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-primary/90" onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" /> Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? "Editar Transação" : "Adicionar Transação"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select name="type" defaultValue={editingTransaction?.type || "expense"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
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
                    placeholder="Ex: Supermercado Semanal" 
                    defaultValue={editingTransaction?.description}
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input 
                      type="date" 
                      name="date" 
                      defaultValue={editingTransaction ? editingTransaction.date : new Date().toISOString().split('T')[0]} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Select name="account_id" defaultValue={editingTransaction?.account_id}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.length > 0 ? accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        )) : <SelectItem value="default">Crie uma conta primeiro</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select name="category_id" defaultValue={editingTransaction?.category_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color || '#ccc' }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      )) : <SelectItem value="default" disabled>Nenhuma categoria criada</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">
                  {editingTransaction ? "Atualizar" : "Salvar"} Transação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar transação..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <Button variant={typeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('all')}>Todas</Button>
            <Button variant={typeFilter === 'income' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('income')}>Receitas</Button>
            <Button variant={typeFilter === 'expense' ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter('expense')}>Despesas</Button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[100px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Carregando transações...</TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhuma transação encontrada.</TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      {format(new Date(t.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {t.categories?.name || t.category || 'Geral'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t.accounts?.name || 'Carteira'}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'expense' ? '-' : '+'} 
                      {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {/* BOTÃO DE EDITAR FUNCIONAL */}
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