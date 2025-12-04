// Dicionário de palavras-chave para categorias
export const smartCategoryMap: Record<string, string> = {
    // Transporte
    uber: "Transporte",
    99: "Transporte",
    posto: "Transporte",
    gasolina: "Transporte",
    combustivel: "Transporte",
    ipva: "Transporte",
    estacionamento: "Transporte",
    
    // Alimentação
    ifood: "Alimentação",
    mercado: "Alimentação",
    supermercado: "Alimentação",
    padaria: "Alimentação",
    restaurante: "Alimentação",
    burger: "Alimentação",
    pizza: "Alimentação",
    fome: "Alimentação",
    
    // Lazer
    netflix: "Lazer",
    spotify: "Lazer",
    cinema: "Lazer",
    steam: "Lazer",
    jogo: "Lazer",
    bar: "Lazer",
    
    // Moradia
    aluguel: "Moradia",
    condominio: "Moradia",
    luz: "Moradia",
    agua: "Moradia",
    internet: "Moradia",
    claro: "Moradia",
    vivo: "Moradia",
    tim: "Moradia",
    
    // Saúde
    farmacia: "Saúde",
    drogasil: "Saúde",
    medico: "Saúde",
    hospital: "Saúde",
    academia: "Saúde",
    smartfit: "Saúde",
    
    // Receita
    salario: "Salário",
    pagamento: "Salário",
    pix: "Outros",
    transferencia: "Outros"
  };
  
  // Função que sugere a categoria baseada na descrição
  export const suggestCategory = (description: string): string | null => {
    const lowerDesc = description.toLowerCase();
    
    for (const keyword in smartCategoryMap) {
      if (lowerDesc.includes(keyword)) {
        return smartCategoryMap[keyword];
      }
    }
    return null;
  };
  
  // Função que gera o Insight do Dashboard
  export const generateFinancialSentiment = (income: number, expense: number, transactions: any[]) => {
    const balance = income - expense;
    const today = new Date();
    const dayOfMonth = today.getDate();
    const ratio = income > 0 ? (expense / income) * 100 : 100;
  
    // 1. Alerta Crítico (Vermelho)
    if (balance < 0) {
      return {
        status: "critical",
        title: "Alerta Vermelho",
        message: `Você gastou R$ ${Math.abs(balance).toFixed(2)} a mais do que recebeu este mês. Pare gastos não essenciais imediatamente.`,
        color: "bg-red-500/10 text-red-600 border-red-200"
      };
    }
  
    // 2. Alerta de Velocidade (Amarelo) - Gastou muito cedo
    if (dayOfMonth < 15 && ratio > 60) {
      return {
        status: "warning",
        title: "Desacelere os gastos!",
        message: `Cuidado! Ainda é dia ${dayOfMonth} e você já consumiu ${ratio.toFixed(0)}% da sua renda.`,
        color: "bg-yellow-500/10 text-yellow-700 border-yellow-200"
      };
    }
  
    // 3. Detecção de Assinatura/Anomalia (Lógica simples: transação repetida recente)
    // (Simplificado para este exemplo)
    
    // 4. Elogio (Verde) - Poupança Saudável
    if (dayOfMonth > 20 && ratio < 70) {
      return {
        status: "success",
        title: "Excelente Gestão!",
        message: `Fim do mês chegando e você ainda tem ${(100 - ratio).toFixed(0)}% da renda. Ótimo momento para investir.`,
        color: "bg-green-500/10 text-green-700 border-green-200"
      };
    }
  
    // 5. Neutro
    return {
      status: "neutral",
      title: "Resumo do Mês",
      message: `Seu saldo está positivo em R$ ${balance.toFixed(2)}. Mantenha o controle.`,
      color: "bg-blue-500/10 text-blue-700 border-blue-200"
    };
  };