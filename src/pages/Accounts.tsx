import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Wallet, Building2, ArrowRightLeft, Trash2, History, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
  bank_color?: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  
  // Estado Transferência
  const [transferData, setTransferData] = useState({ from: "", to: "", amount: "", date: new Date().toISOString().split('T')[0] });

  const { toast } = useToast();

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data } = await supabase.from('accounts').select('*').order('name');
    if (data) setAccounts(data);
    setLoading(false);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('accounts').insert({
      user_id: user?.id,
      name: formData.get('name'),
      type: formData.get('type'),
      balance: Number(formData.get('balance')),
      bank_color: formData.get('color')
    });

    if (error) toast({ title: "Erro", variant: "destructive" });
    else {
      toast({ title: "Conta criada!" });
      setIsCreateOpen(false);
      fetchAccounts();
    }
  };

  const handleTransfer = async () => {
    if (!transferData.from || !transferData.to || !transferData.amount) return;
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('transactions').insert({
        user_id: user?.id,
        description: "Transferência Interna",
        amount: Number(transferData.amount),
        type: 'transfer',
        account_id: transferData.from,
        destination_account_id: transferData.to,
        date: transferData.date,
        is_paid: true, // Transferência é sempre imediata
        category: "Transferência"
    });

    if (error) toast({ title: "Erro na transferência", description: error.message, variant: "destructive" });
    else {
        toast({ title: "Transferência realizada!" });
        setIsTransferOpen(false);
        fetchAccounts(); // Atualiza saldos
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Excluir conta e todo seu histórico?")) return;
    await supabase.from('accounts').delete().eq('id', id);
    fetchAccounts();
  };

  const getTotalBalance = () => accounts.reduce((acc, a) => acc + Number(a.balance), 0);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in pb-20">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Minhas Contas</h1>
            <p className="text-muted-foreground">Saldo Total: <span className="text-primary font-bold text-lg">R$ {getTotalBalance().toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2"><ArrowRightLeft className="h-4 w-4" /> Transferir</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nova Transferência</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>De (Origem)</Label>
                                <Select onValueChange={v => setTransferData({...transferData, from: v})}>
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Para (Destino)</Label>
                                <Select onValueChange={v => setTransferData({...transferData, to: v})}>
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>{accounts.filter(a => a.id !== transferData.from).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Valor (R$)</Label>
                            <Input type="number" step="0.01" onChange={e => setTransferData({...transferData, amount: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Data</Label>
                            <Input type="date" value={transferData.date} onChange={e => setTransferData({...transferData, date: e.target.value})} />
                        </div>
                        <Button className="w-full" onClick={handleTransfer}>Confirmar Transferência</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                    <Button className="gap-2 bg-primary hover:bg-primary/90"><Plus className="h-4 w-4" /> Nova Conta</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Adicionar Conta</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateAccount} className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Nome</Label><Input name="name" placeholder="Ex: Nubank, Cofre Casa" required /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select name="type" defaultValue="checking">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="checking">Conta Corrente</SelectItem>
                                        <SelectItem value="savings">Poupança</SelectItem>
                                        <SelectItem value="wallet">Carteira Física</SelectItem>
                                        <SelectItem value="investment">Investimento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Saldo Inicial</Label><Input name="balance" type="number" step="0.01" defaultValue="0" /></div>
                        </div>
                        <div className="space-y-2">
                            <Label>Cor do Banco (Opcional)</Label>
                            <div className="flex gap-2">
                                {['#820ad1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#111827'].map(c => (
                                    <div key={c} className="h-6 w-6 rounded-full cursor-pointer border-2 border-transparent hover:border-black" style={{backgroundColor: c}} onClick={() => (document.getElementById('color-input') as HTMLInputElement).value = c} />
                                ))}
                                <input type="hidden" name="color" id="color-input" defaultValue="#111827" />
                            </div>
                        </div>
                        <Button type="submit" className="w-full">Salvar</Button>
                    </form>
                </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="relative overflow-hidden hover:shadow-lg transition-all border-none text-white shadow-md" style={{ backgroundColor: account.bank_color || '#1e293b' }}>
                <div className="absolute top-0 right-0 p-16 bg-white/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2 z-10">
                        {account.type === 'wallet' ? <Wallet className="h-5 w-5 opacity-80" /> : <Building2 className="h-5 w-5 opacity-80" />}
                        <span className="font-medium text-sm opacity-80 capitalize">{account.type === 'checking' ? 'Conta Corrente' : account.type}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 z-10" onClick={() => handleDelete(account.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardHeader>
                
                <CardContent className="z-10 relative">
                    <CardTitle className="text-2xl font-bold mb-1">{account.name}</CardTitle>
                    <div className="text-3xl font-extrabold mt-4">R$ {Number(account.balance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </CardContent>

                <CardFooter className="bg-black/20 py-2 px-4 flex justify-between items-center text-xs text-white/70">
                    <span>Atualizado agora</span>
                    <History className="h-3 w-3" />
                </CardFooter>
            </Card>
          ))}
          
          {accounts.length === 0 && !loading && (
             <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                <Wallet className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Nenhuma conta cadastrada.</p>
             </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}