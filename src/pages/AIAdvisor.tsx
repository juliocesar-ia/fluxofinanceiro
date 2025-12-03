import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, Sparkles } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Tenta pegar do .env
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AIAdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou sua Inteligência Financeira. Como posso ajudar a analisar seus gastos hoje?',
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Contexto financeiro
  const [contextData, setContextData] = useState("");

  useEffect(() => {
    fetchFinancialContext();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchFinancialContext = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar resumo para alimentar a IA
    const { data: transactions } = await supabase.from('transactions').select('*, categories(name)').eq('user_id', user.id);
    
    if (transactions) {
      const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
      const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
      
      // Cria um resumo em texto simples para a IA entender
      const summary = `
        RESUMO FINANCEIRO DO USUÁRIO:
        - Saldo Atual: R$ ${(income - expense).toFixed(2)}
        - Total Receitas: R$ ${income.toFixed(2)}
        - Total Despesas: R$ ${expense.toFixed(2)}
        - Histórico recente: ${JSON.stringify(transactions.slice(-10).map(t => ({
            data: t.date,
            desc: t.description, 
            val: t.amount, 
            tipo: t.type,
            cat: t.categories?.name || t.category
          })))}
      `;
      setContextData(summary);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      if (!API_KEY) {
        throw new Error("Chave de API ausente. Verifique o arquivo .env");
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      
      // --- MODELO CORRIGIDO AQUI: gemini-1.5-flash ---
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Você é um consultor financeiro pessoal chamado FinancePro AI.
        Analise os dados abaixo e responda à pergunta do usuário.
        
        ${contextData}
        
        PERGUNTA: ${userMsg.content}
        
        Diretrizes:
        1. Seja curto, direto e use emojis.
        2. Se a pergunta for sobre saldo ou gastos, use os dados fornecidos.
        3. Se não tiver dados suficientes, dê uma dica genérica de finanças.
        4. Use formatação Markdown (negrito, listas) para facilitar a leitura.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      setMessages(prev => [...prev, { 
        id: (Date.now()+1).toString(), 
        role: 'assistant', 
        content: responseText 
      }]);

    } catch (error: any) {
      console.error("Erro IA:", error);
      
      let errorMsg = "Erro de conexão.";
      if (error.message) errorMsg = `Erro: ${error.message}`;
      if (error.toString().includes("404")) errorMsg = "Erro: Modelo não encontrado ou chave inválida.";
      
      setMessages(prev => [...prev, { 
        id: (Date.now()+1).toString(), 
        role: 'assistant', 
        content: `⚠️ ${errorMsg}`
      }]);
    } finally {
      setIsTyping(false);
    }
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
              <Sparkles className="h-3 w-3 text-yellow-500" /> Assistente Inteligente
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
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                    <p dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-xs text-muted-foreground animate-pulse ml-12">Analisando...</div>}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
          <CardFooter className="p-4 bg-muted/20 border-t">
            <form onSubmit={handleSend} className="flex w-full gap-2">
              <Input placeholder="Ex: Quanto gastei com mercado?" value={input} onChange={e => setInput(e.target.value)} className="flex-1 bg-background" autoFocus />
              <Button type="submit" disabled={!input.trim() || isTyping}><Send className="h-4 w-4" /></Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}