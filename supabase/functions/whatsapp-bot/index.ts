import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

// Configurações
const GEMINI_API_KEY = Deno.env.get('VITE_GEMINI_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    // 1. Parse do formulário do Twilio (x-www-form-urlencoded)
    const formData = await req.formData()
    const incomingMsg = formData.get('Body')?.toString() || ''
    const fromNumber = formData.get('From')?.toString() || '' // Ex: whatsapp:+5511999999999
    const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0')
    
    // 2. Inicializa Supabase Admin (para buscar usuário pelo telefone)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 3. Identifica o usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('phone', fromNumber)
      .single()

    if (!profile) {
      return twilioReply(`Olá! Não reconheci este número (${fromNumber}). Por favor, cadastre-o no seu perfil em Configurações > Perfil.`)
    }

    // 4. Prepara o Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    let prompt = ""
    let imageParts: any[] = []

    // 5. Verifica se tem Mídia (Foto ou Áudio)
    if (numMedia > 0) {
      const mediaUrl = formData.get('MediaUrl0')?.toString()
      const mediaType = formData.get('MediaContentType0')?.toString()

      if (mediaUrl && mediaType) {
        // Baixa o arquivo
        const mediaResponse = await fetch(mediaUrl)
        const mediaBlob = await mediaResponse.blob()
        const arrayBuffer = await mediaBlob.arrayBuffer()
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

        // Adiciona ao prompt do Gemini
        imageParts = [{
          inlineData: {
            data: base64Data,
            mimeType: mediaType
          }
        }]
        
        prompt = `Analise este arquivo (áudio ou imagem). Extraia os detalhes da transação financeira. 
        Se for áudio, transcreva e extraia. Se for imagem (cupom/nota), leia os totais.
        Retorne APENAS um JSON neste formato: {"description": "...", "amount": 0.00, "category": "..."}.
        Use categorias simples como: Alimentação, Transporte, Lazer, Outros.
        Se não conseguir identificar, retorne {"error": "..."}.`
      }
    } else {
      // É apenas texto
      prompt = `Extraia os dados financeiros desta mensagem: "${incomingMsg}".
      Retorne APENAS um JSON neste formato: {"description": "...", "amount": 0.00, "category": "..."}.
      Exemplo: "Gastei 50 no posto" -> {"description": "Posto de Gasolina", "amount": 50.00, "category": "Transporte"}`
    }

    // 6. Chama a IA
    const result = await model.generateContent([prompt, ...imageParts])
    const responseText = result.response.text()
    
    // Limpa o JSON (remove backticks se a IA colocar)
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(jsonString)

    if (data.error) {
      return twilioReply("Não consegui entender os dados dessa transação. Tente enviar novamente com mais clareza.")
    }

    // 7. Salva no Banco de Dados
    const { error } = await supabase.from('transactions').insert({
      user_id: profile.user_id,
      description: data.description,
      amount: data.amount,
      type: 'expense', // Assume despesa por padrão, IA poderia inferir
      category: data.category,
      date: new Date().toISOString().split('T')[0],
      account_id: null // Fica sem conta vinculada por enquanto
    })

    if (error) throw error

    return twilioReply(`✅ Salvo! R$ ${data.amount} em ${data.category} (${data.description}).`)

  } catch (error: any) {
    console.error(error)
    return twilioReply(`Erro ao processar: ${error.message}`)
  }
})

// Função auxiliar para responder ao Twilio (XML)
function twilioReply(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
      <Message>${message}</Message>
  </Response>`
  
  return new Response(xml, {
    headers: { "Content-Type": "text/xml" }
  })
}