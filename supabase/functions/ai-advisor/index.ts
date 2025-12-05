import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Permite acesso do seu site
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Pega a chave que vamos configurar no Passo 2
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('Chave da API não configurada no servidor')

    const { message, context } = await req.json()

    // Chama o Google Gemini direto do servidor (Sem bloqueios)
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      Você é o Assistente Financeiro do FinancePro.
      Contexto do Usuário: ${context}
      
      Responda à pergunta: "${message}"
      
      IMPORTANTE:
      - Se o usuário pedir para criar algo (transação, meta, dívida), retorne APENAS um JSON puro neste formato:
        {"tool": "create_transaction", "description": "...", "amount": 0.00, "type": "expense", "category": "..."}
      - Se for pergunta, responda em texto curto e útil.
    `

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    return new Response(
      JSON.stringify({ reply: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})