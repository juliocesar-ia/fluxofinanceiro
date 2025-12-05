import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Trata requisições de verificação (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Pega a chave segura do ambiente
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('Chave da API não configurada no servidor')
    }

    // 3. Recebe os dados do Frontend
    const { message, context } = await req.json()

    // 4. Configura o Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // 5. Monta o Prompt de Sistema (A "Personalidade" da IA)
    const prompt = `
      Você é o Assistente Financeiro Inteligente do FinancePro.
      Seu objetivo é ajudar o usuário a organizar suas finanças, analisar gastos e criar registros.

      CONTEXTO FINANCEIRO ATUAL DO USUÁRIO:
      ${context}

      INSTRUÇÕES IMPORTANTES:
      1. Se o usuário pedir para criar uma transação, meta ou dívida, você deve retornar EXATAMENTE um JSON no seguinte formato (sem markdown, apenas o JSON):
         - Transação: {"tool": "create_transaction", "description": "Descrição", "amount": 0.00, "type": "expense" ou "income", "category": "Categoria"}
         - Meta: {"tool": "create_goal", "name": "Nome", "target": 0.00}
         - Dívida: {"tool": "create_debt", "name": "Nome", "total": 0.00}
      
      2. Se for uma pergunta ou análise, responda em texto simples, amigável e direto. Use emojis 💰.
      3. Se o usuário perguntar sobre o saldo, use o contexto fornecido.

      MENSAGEM DO USUÁRIO: ${message}
    `

    // 6. Gera a resposta
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // 7. Retorna para o Frontend
    return new Response(
      JSON.stringify({ reply: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})