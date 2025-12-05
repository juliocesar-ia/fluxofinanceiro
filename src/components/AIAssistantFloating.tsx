import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, Sparkles, Loader2, ChevronDown, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFinancialContext, executeAIAction } from "@/utils/ai-actions";
import { useToast } from "@/hooks/use-toast";

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
    { id: '1', role: 'assistant', content: 'Olá! Sou a IA Segura do FinancePro. Estou rodando no servidor para proteger seus dados. Como posso ajudar?' }
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logado.");

      // 1. Busca os dados do usuário (Contexto)
      const context = await getFinancialContext(user.id);

      // 2. Chama a Função Segura no Servidor (Sem expor chaves)
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { message: userMsg.content, context }
      });

      if (error) {
        console.error("Erro da Edge Function:", error);
        throw new Error("O servidor da IA não respondeu. Verifique se a chave foi configurada no Supabase Secrets.");
      }

      if (!data?.reply) {
        throw new Error("Resposta vazia do servidor.");
      }

      let replyText = data.reply;

      // 3. Processa Ações (JSON) se a IA mandar
      const cleanText = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
      if (cleanText.startsWith('{') && cleanText.includes('"tool":')) {
         const actionResult = await executeAIAction(user.id, cleanText);
         if (actionResult) replyText = actionResult;
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: replyText }]);

    } catch (error: any) {
      console.error("ERRO IA:", error);
      let errorMsg = "Erro de conexão com o servidor seguro.";
      if (error.message) errorMsg = error.message;
      
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: `⚠️ ${errorMsg}` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:scale-110 transition-transform z-50 animate-in zoom-in duration-300"
          onClick={() => setIsOpen(true)}
        >
          <Bot className="h-7 w-7 text-white" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[90vw] md:w-[380px] h-[550px] shadow-2xl z-50 flex flex-col border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-300 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex flex-row items-center justify-between border-b shrink-0">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><ShieldCheck className="h-5 w-5 text-white" /></div>
               <div>
                 <CardTitle className="text-sm font-bold text-white">FinancePro AI</CardTitle>
                 <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                   <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></span> Conexão Segura
                 </p>
               </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={() => setIsOpen(false)}>
               <ChevronDown className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden bg-background">
            <ScrollArea className="h-full p-4">
               <div className="space-y-4">
                  {messages.map((msg, i) => (
                     <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <Avatar className="h-8 w-8 border bg-emerald-50">
                            <AvatarFallback className="text-emerald-600"><Bot className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`
                          p-3 rounded-2xl text-sm max-w-[85%] shadow-sm
                          ${msg.role === 'user' 
                            ? 'bg-emerald-600 text-white rounded-tr-sm' 
                            : 'bg-muted text-foreground rounded-tl-sm border'}
                        `}>
                           {msg.content}
                        </div>
                     </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-2 items-center text-xs text-muted-foreground ml-12 animate-pulse">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                  <div ref={scrollRef} />
               </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 border-t bg-background shrink-0">
             <form onSubmit={handleSend} className="flex w-full gap-2 relative">
                <Input 
                   value={input} 
                   onChange={e => setInput(e.target.value)} 
                   placeholder="Digite sua dúvida..." 
                   className="flex-1 pr-10"
                   autoFocus
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isTyping || !input.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
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