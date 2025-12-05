import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, Sparkles, Loader2, ChevronDown, X } from "lucide-react";
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
    { id: '1', role: 'assistant', content: 'Olá! Sou sua IA Financeira Segura. Posso analisar seus dados ou criar registros para você. Como ajudo?' }
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

      // 2. Chama a Edge Function Segura (Backend)
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { message: userMsg.content, context }
      });

      if (error) throw error;

      let replyText = data.reply;

      // 3. Verifica se a IA mandou executar uma ação (JSON)
      // Limpa possíveis formatações de código do markdown
      const cleanReply = replyText.replace(/```json/g, '').replace(/```/g, '').trim();

      if (cleanReply.startsWith('{') && cleanReply.includes('"tool":')) {
         const actionResult = await executeAIAction(user.id, cleanReply);
         if (actionResult) {
            replyText = actionResult;
            // Opcional: Atualizar a página para mostrar a mudança
            // window.location.reload(); 
         }
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: replyText }]);

    } catch (error: any) {
      console.error("Erro IA:", error);
      toast({ title: "Erro na IA", description: "Não foi possível conectar ao servidor seguro.", variant: "destructive" });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Desculpe, tive um problema técnico. Tente novamente." }]);
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
                   <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online e Seguro
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
                   placeholder="Ex: Gastei 50 no mercado..." 
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