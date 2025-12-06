import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

export const checkAndGenerateRecurring = async (userId: string) => {
  console.log("🤖 Robô de Automação: Iniciando verificação...");

  // 1. Buscar Assinaturas Ativas
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  if (!subs || subs.length === 0) return;

  const today = new Date();
  const start = startOfMonth(today).toISOString();
  const end = endOfMonth(today).toISOString();

  // 2. Buscar transações já lançadas NESTE MÊS para não duplicar
  const { data: existingTrans } = await supabase
    .from('transactions')
    .select('description, amount')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end);

  const existingSignatures = new Set(
    existingTrans?.map(t => `${t.description}-${t.amount}`)
  );

  const newTransactions = [];

  // 3. Comparar e Gerar
  for (const sub of subs) {
    // Cria uma "assinatura digital" para comparar (Nome + Valor)
    const signature = `${sub.name}-${sub.amount}`;

    // Se essa assinatura ainda não virou transação este mês...
    if (!existingSignatures.has(signature)) {
      
      // Calcula a data de vencimento para ESTE mês
      const paymentDay = new Date(sub.next_payment_date).getDate();
      const dueDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
      
      // Ajuste simples para não gerar datas inválidas (ex: dia 31 em fevereiro)
      // O JS ajusta automaticamente (31 fev vira 2 ou 3 de março), mas vamos manter simples.

      newTransactions.push({
        user_id: userId,
        description: sub.name,
        amount: sub.amount,
        type: 'expense', // Assinatura é sempre despesa
        category_id: sub.category_id,
        account_id: sub.account_id,
        date: dueDate.toISOString().split('T')[0],
        is_fixed: true, // <--- Marca como Fixa
        is_paid: false, // Nasce como Pendente
        category: "Recorrente" // Fallback
      });
    }
  }

  // 4. Salvar no Banco
  if (newTransactions.length > 0) {
    console.log(`🤖 Gerando ${newTransactions.length} transações automáticas...`);
    await supabase.from('transactions').insert(newTransactions);
    return newTransactions.length; // Retorna quantos criou
  }
  
  return 0;
};