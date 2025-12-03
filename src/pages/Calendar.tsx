import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowUpCircle, ArrowDownCircle, Repeat } from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO, getDate 
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos unificados para o calendário
type CalendarEvent = {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  date: Date;
  isRecurring?: boolean;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    // 1. Buscar Transações Reais do mês
    const { data: transData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());

    // 2. Buscar Assinaturas (Projeção)
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true);

    const mappedEvents: CalendarEvent[] = [];

    // Mapear Transações
    if (transData) {
      transData.forEach(t => {
        mappedEvents.push({
          id: t.id,
          title: t.description,
          amount: Number(t.amount),
          type: t.type as 'income' | 'expense',
          date: parseISO(t.date), // Transações já têm data fixa
          isRecurring: false
        });
      });
    }

    // Mapear Assinaturas (Simulação Simples: Se for mensal, repete no mesmo dia deste mês)
    if (subData) {
      subData.forEach(sub => {
        const subDate = parseISO(sub.next_payment_date);
        const dayOfMonth = getDate(subDate);
        
        // Criar data neste mês atual
        const projectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfMonth);
        
        // Só adiciona se a data for válida (ex: dia 31 em mês de 30 dias pode dar bug, date-fns trata isso ajustando, mas aqui simplificamos)
        if (isSameMonth(projectedDate, currentDate)) {
           mappedEvents.push({
             id: `sub-${sub.id}`,
             title: sub.name,
             amount: Number(sub.amount),
             type: 'expense',
             date: projectedDate,
             isRecurring: true
           });
        }
      });
    }

    setEvents(mappedEvents);
    setLoading(false);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate))
  });

  const getDayEvents = (day: Date) => events.filter(e => isSameDay(e.date, day));

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setIsDetailsOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in h-full flex flex-col">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendário Financeiro</h1>
            <p className="text-muted-foreground">Visualize seus vencimentos e fluxo de caixa.</p>
          </div>
          <div className="flex items-center gap-4 bg-card p-1 rounded-lg border">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
            <div className="flex items-center gap-2 px-2 font-semibold min-w-[140px] justify-center">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
          </div>
        </div>

        <div className="flex-1 min-h-[600px] border rounded-lg bg-card shadow-sm overflow-hidden">
          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center py-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <span key={d} className="text-sm font-medium text-muted-foreground">{d}</span>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 h-full auto-rows-fr">
            {days.map((day, i) => {
              const dayEvents = getDayEvents(day);
              const income = dayEvents.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
              const expense = dayEvents.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div 
                  key={i} 
                  className={`
                    min-h-[100px] border-b border-r p-2 transition-colors cursor-pointer hover:bg-muted/50
                    ${!isCurrentMonth ? 'bg-muted/10 text-muted-foreground' : ''}
                    ${isToday(day) ? 'bg-primary/5' : ''}
                  `}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-semibold rounded-full w-7 h-7 flex items-center justify-center ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {/* Indicadores resumidos */}
                    <div className="flex flex-col gap-1 items-end">
                      {income > 0 && (
                        <Badge variant="outline" className="text-[10px] h-5 border-green-200 bg-green-50 text-green-700 px-1">
                          +{income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </Badge>
                      )}
                      {expense > 0 && (
                        <Badge variant="outline" className="text-[10px] h-5 border-red-200 bg-red-50 text-red-700 px-1">
                          -{expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Lista curta de eventos (max 2) */}
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-[10px] truncate opacity-80">
                        <div className={`h-1.5 w-1.5 rounded-full ${event.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-2.5">
                        + {dayEvents.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal de Detalhes do Dia */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                {selectedDay && format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
              </DialogTitle>
              <DialogDescription>
                Resumo financeiro do dia.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {selectedDay && getDayEvents(selectedDay).length > 0 ? (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {getDayEvents(selectedDay).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${event.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {event.type === 'income' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{event.title}</p>
                            {event.isRecurring && (
                              <span className="text-[10px] flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 rounded mt-0.5 w-fit">
                                <Repeat className="h-3 w-3" /> Assinatura
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${event.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {event.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nada agendado para este dia.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}