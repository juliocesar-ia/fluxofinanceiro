import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User as UserIcon, Sparkles, Lightbulb } from "lucide-react";

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function AIAdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou sua Inteligência Financeira. Posso analisar seus gastos, sugerir economias ou responder sobre seu saldo. O que deseja saber hoje?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Dados locais para análise
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Buscamos TUDO para a IA ter contexto
    const { data } = await supabase.from('transactions').select('*, categories(name)').eq('user_id', user.id);
    if (data) setTransactions(data);
  };

  // --- CÉREBRO DA "IA" (Lógica Local) ---
  const generateResponse = (question: string) => {
    const q = question.toLowerCase();
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    if (q.includes('saldo') || q.includes('dinheiro tenho')) {
      return `Seu saldo atual é de **R$ ${balance.toFixed(2)}**. (Receitas: R$ ${totalIncome} - Despesas: R$ ${totalExpense})`;
    }

    if (q.includes('gastei') || q.includes('despesa')) {
      // Tenta achar categoria
      const categoryMatch = transactions.find(t => q.includes(t.categories?.name?.toLowerCase() || 'xxxxx'));
      if (q.includes('alimentação') || q.includes('comida')) {
         const food = transactions.filter(t => 
            (t.categories?.name?.toLowerCase().includes('alimentação') || t.description.toLowerCase().includes('mercado')) && t.type === 'expense'
         ).reduce((acc, t) => acc + Number(t.amount), 0);
         return `Você gastou aproximadamente **R$ ${food.toFixed(2)}** com alimentação/mercado.`;
      }
      return `No total, suas despesas somam **R$ ${totalExpense.toFixed(2)}**. Quer saber de uma categoria específica? Tente "quanto gastei com transporte".`;
    }

    if (q.includes('dica') || q.includes('economizar') || q.includes('ajuda')) {
      if (totalExpense > totalIncome) return "🚨 **Alerta Vermelho:** Você está gastando mais do que ganha. Recomendo revisar suas assinaturas e cortar gastos supérfluos imediatamente.";
      if (totalExpense > totalIncome * 0.8) return "⚠️ **Atenção:** Você está gastando mais de 80% da sua renda. Tente aplicar a regra 50/30/20 (50% essenciais, 30% desejos, 20% poupança).";
      return "✅ **Tudo sob controle:** Suas finanças parecem saudáveis. Que tal definir uma nova meta de investimento?";
    }

    if (q.includes('oi') || q.includes('olá')) {
      return "Olá! Como posso ajudar a organizar seu dinheiro hoje?";
    }

    return "Desculpe, ainda estou aprendendo. Tente perguntar 'qual meu saldo', 'quanto gastei' ou 'me dê uma dica'.";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simula tempo de "pensar"
    setTimeout(() => {
      const responseText = generateResponse(userMsg.content);
      const botMsg: Message = { id: (Date.now()+1).toString(), role: 'assistant', content: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 animate-fade-in max-w-5xl mx-auto">
        
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Advisor</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-yellow-500" /> Inteligência Financeira Pessoal
            </p>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-2">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className="bg-indigo-100 text-indigo-600"><Bot className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`
                    max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-muted text-foreground rounded-tl-sm'}
                  `}>
                    {/* Renderiza negrito simples */}
                    <p dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    <span className="text-[10px] opacity-50 block mt-1 text-right">
                      {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>

                  {msg.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="https://github.com/shadcn.png" />
                      <AvatarFallback>EU</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                   <Avatar className="h-8 w-8"><AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback></Avatar>
                   <div className="bg-muted p-3 rounded-2xl rounded-tl-sm flex gap-1 items-center h-10">
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                   </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <CardFooter className="p-4 bg-muted/20 border-t">
            <form onSubmit={handleSend} className="flex w-full gap-2">
              <Input 
                placeholder="Pergunte sobre seus gastos, saldo ou peça uma dica..." 
                value={input}
                onChange={e => setInput(e.target.value)}
                className="flex-1 bg-background"
                autoFocus
              />
              <Button type="submit" disabled={!input.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>

        {/* Sugestões Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {['💰 Qual meu saldo?', '📉 Quanto gastei esse mês?', '🍔 Gasto com alimentação', '💡 Dica de economia'].map(qs => (
            <Button key={qs} variant="outline" size="sm" className="text-xs h-8 justify-start text-muted-foreground hover:text-primary" onClick={() => { setInput(qs); }}>
              <Lightbulb className="h-3 w-3 mr-2" /> {qs}
            </Button>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
}