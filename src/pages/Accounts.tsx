import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, CreditCard, Trash2, Landmark, PiggyBank, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";

// Tipos
type Account = { id: string; name: string; type: string; balance: number };
type CreditCardType = { id: string; name: string; limit_amount: number; closing_day: number; due_day: number };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Estados para Modais
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: accData } = await supabase.from('accounts').select('*').order('name');
    const { data: cardData } = await supabase.from('credit_cards').select('*').order('name');

    if (accData) setAccounts(accData);
    if (cardData) setCards(cardData);
    setLoading(false);
  };

  // --- Ações de Conta ---
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('accounts').insert({
      user_id: user?.id,
      name: formData.get('name'),
      type: formData.get('type'),
      balance: Number(formData.get('balance'))
    });

    if (error) toast({ title: "Erro ao criar conta", variant: "destructive" });
    else {
      toast({ title: "Conta criada!" });
      setIsAccountOpen(false);
      fetchData();
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if(!confirm("Excluir esta conta apagará todas as transações vinculadas a ela. Continuar?")) return;
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (!error) { toast({ title: "Conta excluída" }); fetchData(); }
  };

  // --- Ações de Cartão ---
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('credit_cards').insert({
      user_id: user?.id,
      name: formData.get('name'),
      limit_amount: Number(formData.get('limit')),
      closing_day: Number(formData.get('closing')),
      due_day: Number(formData.get('due'))
    });

    if (error) toast({ title: "Erro ao criar cartão", variant: "destructive" });
    else {
      toast({ title: "Cartão adicionado!" });
      setIsCardOpen(false);
      fetchData();
    }
  };

  const handleDeleteCard = async (id: string) => {
    if(!confirm("Deseja excluir este cartão?")) return;
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (!error) { toast({ title: "Cartão removido" }); fetchData(); }
  };

  // Helper para ícone
  const getAccountIcon = (type: string) => {
    switch(type) {
      case 'checking': return <Landmark className="h-5 w-5" />;
      case 'savings': return <PiggyBank className="h-5 w-5" />;
      case 'cash': return <Banknote className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
    }
  };

  const getTypeName = (type: string) => {
    const types: any = { checking: 'Conta Corrente', savings: 'Poupança', investment: 'Investimento', cash: 'Dinheiro', other: 'Outro' };
    return types[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Carteiras</h1>
          <p className="text-muted-foreground">Gerencie suas contas bancárias e cartões de crédito.</p>
        </div>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="accounts">Contas Bancárias</TabsTrigger>
            <TabsTrigger value="cards">Cartões de Crédito</TabsTrigger>
          </TabsList>

          {/* --- TAB CONTAS --- */}
          <TabsContent value="accounts" className="mt-6">
            <div className="flex justify-end mb-4">
              <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Conta</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Adicionar Conta</DialogTitle></DialogHeader>
                  <form onSubmit={handleSaveAccount} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome da Conta</Label>
                      <Input name="name" placeholder="Ex: Nubank, Itaú, Cofre" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select name="type" defaultValue="checking">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">Conta Corrente</SelectItem>
                            <SelectItem value="savings">Poupança</SelectItem>
                            <SelectItem value="investment">Investimentos</SelectItem>
                            <SelectItem value="cash">Dinheiro Físico</SelectItem>
                            <SelectItem value="other">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Saldo Inicial</Label>
                        <Input name="balance" type="number" step="0.01" placeholder="0.00" required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Criar Conta</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc) => (
                <Card key={acc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium capitalize text-muted-foreground">
                      {getTypeName(acc.type)}
                    </CardTitle>
                    {getAccountIcon(acc.type)}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{acc.name}</div>
                    <p className={`text-xl mt-2 font-semibold ${acc.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {acc.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-end">
                     <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteAccount(acc.id)}>
                       Excluir
                     </Button>
                  </CardFooter>
                </Card>
              ))}
              {accounts.length === 0 && !loading && (
                <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhuma conta cadastrada. Adicione sua primeira conta!
                </div>
              )}
            </div>
          </TabsContent>

          {/* --- TAB CARTÕES --- */}
          <TabsContent value="cards" className="mt-6">
            <div className="flex justify-end mb-4">
              <Dialog open={isCardOpen} onOpenChange={setIsCardOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Cartão</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Adicionar Cartão de Crédito</DialogTitle></DialogHeader>
                  <form onSubmit={handleSaveCard} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome do Cartão</Label>
                      <Input name="name" placeholder="Ex: Nubank Gold" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Limite Total</Label>
                      <Input name="limit" type="number" step="0.01" placeholder="5000.00" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Dia Fechamento</Label>
                        <Input name="closing" type="number" min="1" max="31" placeholder="Dia" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Dia Vencimento</Label>
                        <Input name="due" type="number" min="1" max="31" placeholder="Dia" required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Adicionar Cartão</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <Card key={card.id} className="bg-gradient-to-br from-slate-800 to-slate-900 text-white hover:shadow-xl transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CreditCard className="h-6 w-6 text-white/80" />
                    <span className="text-xs font-mono text-white/60">CRÉDITO</span>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-xl font-bold tracking-wide">{card.name}</div>
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Limite</span>
                        <span>{card.limit_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-white/70">Fecha dia</span>
                         <span>{card.closing_day}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-white/70">Vence dia</span>
                         <span>{card.due_day}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-white/10 pt-4 flex justify-end">
                     <Button variant="ghost" size="sm" className="text-red-300 hover:text-red-400 hover:bg-red-900/20" onClick={() => handleDeleteCard(card.id)}>
                       Remover
                     </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}