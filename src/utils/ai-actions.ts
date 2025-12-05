import { supabase } from "@/integrations/supabase/client";

// Busca os dados para a IA "ler"
export const getFinancialContext = async (userId: string) => {
  // Transações recentes
  const { data: transactions } = await supabase
    .from('transactions')
    .select('description, amount, type, date, categories(name)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(15);

  // Metas
  const { data: goals } = await supabase.from('goals').select('name, current_amount, target_amount').eq('user_id', userId);

  // Dívidas
  const { data: debts } = await supabase.from('debts').select('name, current_balance').eq('user_id', userId);

  // Saldos
  const income = transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0) || 0;
  const expense = transactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0) || 0;

  return `
    - Saldo Estimado (baseado nas últimas 15): R$ ${(income - expense).toFixed(2)}
    - Últimas Transações: ${JSON.stringify(transactions?.map(t => `${t.date}: ${t.description} R$${t.amount} (${t.type})`))}
    - Metas: ${JSON.stringify(goals)}
    - Dívidas Ativas: ${JSON.stringify(debts)}
  `;
};

// Executa o comando que a IA devolveu
export const executeAIAction = async (userId: string, actionJson: string) => {
  try {
    const action = JSON.parse(actionJson);
    
    switch (action.tool) {
      case "create_transaction":
        const { error: tError } = await supabase.from('transactions').insert({
          user_id: userId,
          description: action.description,
          amount: action.amount,
          type: action.type,
          category: action.category || "IA", // Tenta usar a categoria sugerida
          date: new Date().toISOString().split('T')[0],
          is_paid: true
        });
        if (tError) throw tError;
        return `✅ Feito! Criei a transação: ${action.description} de R$ ${action.amount}.`;

      case "create_goal":
        const { error: gError } = await supabase.from('goals').insert({
          user_id: userId,
          name: action.name,
          target_amount: action.target,
          current_amount: 0
        });
        if (gError) throw gError;
        return `✅ Meta criada com sucesso: ${action.name}.`;

      case "create_debt":
        const { error: dError } = await supabase.from('debts').insert({
          user_id: userId,
          name: action.name,
          total_amount: action.total,
          current_balance: action.total,
          interest_rate: 0,
          minimum_payment: 0
        });
        if (dError) throw dError;
        return `✅ Dívida registrada: ${action.name}.`;

      default:
        return null;
    }
  } catch (e) {
    console.error("Erro ao executar ação da IA:", e);
    return null;
  }
};