import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, Sparkles, Loader2, ChevronDown, AlertTriangle } from "lucide-react";
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
    { id: '1', role: 'assistant', content: 'Olá! Sou a IA do FinancePro. Estou conectada ao servidor seguro. Como posso ajudar?' }
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

      // 1. Busca Contexto
      const context = await getFinancialContext(user.id);

      // 2. Chama a Função Segura no Servidor
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { message: userMsg.content, context }
      });

      if (error) throw new Error(`Erro no servidor: ${error.message || 'Desconhecido'}`);
      if (!data?.reply) throw new Error("O servidor não retornou uma resposta válida.");

      let replyText = data.reply;

      // 3. Processa Ações (JSON)
      const cleanText = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
      if (cleanText.startsWith('{') && cleanText.includes('"tool":')) {
         const actionResult = await executeAIAction(user.id, cleanText);
         if (actionResult) replyText = actionResult;
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: replyText }]);

    } catch (error: any) {
      console.error("ERRO IA:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: `⚠️ Erro: ${error.message}. Verifique se você fez o deploy da função 'ai-advisor'.` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-110 transition-transform z-50"
          onClick={() => setIsOpen(true)}
        >
          <Bot className="h-8 w-8 text-white" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[90vw] md:w-[380px] h-[500px] shadow-2xl z-50 flex flex-col border-primary/20">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex flex-row items-center justify-between border-b shrink-0">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-white/20 rounded-lg"><Sparkles className="h-4 w-4 text-white" /></div>
               <CardTitle className="text-sm font-bold text-white">IA Segura (Server)</CardTitle>
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
                        {msg.role === 'assistant' && <Avatar className="h-8 w-8 border"><AvatarFallback><Bot /></AvatarFallback></Avatar>}
                        <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm border'}`}>
                           {msg.content}
                        </div>
                     </div>
                  ))}
                  {isTyping && <div className="text-xs ml-12 animate-pulse">Consultando servidor...</div>}
                  <div ref={scrollRef} />
               </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 border-t bg-background shrink-0">
             <form onSubmit={handleSend} className="flex w-full gap-2">
                <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Digite algo..." className="flex-1" autoFocus />
                <Button type="submit" size="icon" disabled={isTyping} className="bg-indigo-600 hover:bg-indigo-700"><Send className="h-4 w-4" /></Button>
             </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}