import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, Sparkles, Loader2, ChevronDown, X } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/integrations/supabase/client";
import { getFinancialContext, executeAIAction } from "@/utils/ai-actions";
import { useToast } from "@/hooks/use-toast";

// Tenta pegar do .env. Se não funcionar, COLE SUA CHAVE DENTRO DAS ASPAS ABAIXO:
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; 

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function AIAssistantFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Olá! Sou a IA do FinancePro. Posso criar transações, metas ou analisar seus gastos. O que manda?' }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // 1. Verificação de Segurança Básica
      if (!API_KEY) {
        throw new Error("Chave de API não encontrada. Verifique o arquivo .env ou cole a chave no código.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logado.");

      // 2. Busca Contexto (Dados do Usuário)
      const context = await getFinancialContext(user.id);

      // 3. Prepara o Gemini (Conexão Direta)
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const systemPrompt = `
        Você é o Assistente Executivo do FinancePro.
        Você tem acesso aos dados do usuário e PODE MODIFICAR o sistema.
        
        DADOS ATUAIS DO USUÁRIO:
        ${context}
        
        INSTRUÇÕES DE AÇÃO:
        Se o usuário pedir para criar, adicionar ou salvar algo, você DEVE retornar APENAS um JSON (sem markdown, apenas o objeto {}) no seguinte formato:
        
        - Para Transação: {"tool": "create_transaction", "description": "Descrição", "amount": 0.00, "type": "expense" (ou "income"), "category": "Categoria"}
        - Para Meta: {"tool": "create_goal", "name": "Nome", "target": 0.00}
        - Para Dívida: {"tool": "create_debt", "name": "Nome", "total": 0.00}
        
        Se for apenas uma pergunta ou análise, responda em texto normal, curto e amigável. Não use JSON para respostas de texto.
        
        PERGUNTA DO USUÁRIO: ${userMsg.content}
      `;

      // 4. Chama a IA
      const result = await model.generateContent(systemPrompt);
      const text = result.response.text();
      
      // 5. Processa a Resposta (Texto ou Ação)
      let finalResponse = text;
      
      // Limpa formatação de código se a IA mandar (```json ... ```)
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Tenta detectar se é um JSON de ação
      if (cleanText.startsWith('{') && cleanText.includes('"tool":')) {
         console.log("Ação Detectada:", cleanText);
         const actionResult = await executeAIAction(user.id, cleanText);
         if (actionResult) {
            finalResponse = actionResult;
            // Opcional: Atualizar a página para mostrar os novos dados
            // window.location.reload(); 
         }
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: finalResponse }]);

    } catch (error: any) {
      console.error("Erro IA:", error);
      let errorMsg = "Desculpe, tive um problema técnico.";
      
      if (error.message.includes("API")) errorMsg = "Erro de Configuração: Chave da API inválida.";
      if (error.message.includes("fetch")) errorMsg = "Erro de Conexão: Verifique sua internet.";
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: errorMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 hover:scale-110 transition-transform z-50 animate-in zoom-in duration-300"
          onClick={() => setIsOpen(true)}
        >
          <Bot className="h-7 w-7 text-white" />
        </Button>
      )}

      {/* Janela do Chat */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[90vw] md:w-[380px] h-[550px] shadow-2xl z-50 flex flex-col border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-300 rounded-2xl overflow-hidden">
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex flex-row items-center justify-between border-b shrink-0">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Sparkles className="h-5 w-5 text-white" /></div>
               <div>
                 <CardTitle className="text-sm font-bold text-white">FinancePro AI</CardTitle>
                 <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                   <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online
                 </p>
               </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={() => setIsOpen(false)}>
               <ChevronDown className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          {/* Mensagens */}
          <CardContent className="flex-1 p-0 overflow-hidden bg-background">
            <ScrollArea className="h-full p-4">
               <div className="space-y-4">
                  {messages.map((msg, i) => (
                     <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <Avatar className="h-8 w-8 border bg-indigo-50">
                            <AvatarFallback className="text-indigo-600"><Bot className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`
                          p-3 rounded-2xl text-sm max-w-[85%] shadow-sm
                          ${msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                            : 'bg-muted text-foreground rounded-tl-sm border'}
                        `}>
                           {msg.content}
                        </div>
                     </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-2 items-center text-xs text-muted-foreground ml-12 animate-pulse">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                  <div ref={scrollRef} />
               </div>
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <CardFooter className="p-3 border-t bg-background shrink-0">
             <form onSubmit={handleSend} className="flex w-full gap-2 relative">
                <Input 
                   value={input} 
                   onChange={e => setInput(e.target.value)} 
                   placeholder="Ex: Adicionar gasto de 50 no mercado..." 
                   className="flex-1 pr-10"
                   autoFocus
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isTyping || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                   {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
             </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}