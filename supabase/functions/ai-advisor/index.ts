import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Trata CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Pega a chave do cofre (Secrets)
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('Chave GEMINI_API_KEY não encontrada no servidor.')
    }

    const { message, context } = await req.json()

    // 3. Monta o Prompt
    const systemPrompt = `
      Você é o Assistente Financeiro do FinancePro.
      CONTEXTO DO USUÁRIO: ${context}
      PERGUNTA: ${message}
      
      REGRAS:
      - Se for para criar algo, retorne APENAS JSON: {"tool": "create_transaction", ...}
      - Se for pergunta, responda texto curto.
    `

    // 4. Chama a API do Google via FETCH (Sem biblioteca)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemPrompt }]
          }]
        })
      }
    )

    const data = await response.json()

    // Verifica se o Google retornou erro
    if (data.error) {
      throw new Error(`Erro do Google: ${data.error.message}`)
    }

    // 5. Extrai a resposta
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não entendi."

    return new Response(
      JSON.stringify({ reply: replyText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("ERRO NA FUNCTION:", error) // Isso vai aparecer nos logs do Supabase
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})