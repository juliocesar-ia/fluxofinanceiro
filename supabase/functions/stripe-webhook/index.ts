import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
})

// IMPORTANTE: Você precisa criar essa variável no painel do Supabase com o segredo do Webhook
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  if (!signature || !endpointSecret) {
    return new Response('Webhook Error: Missing signature or secret', { status: 400 })
  }

  let event;
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed.`, err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Configura o cliente Supabase com privilégios de ADMIN (Service Role)
  // Isso é necessário para alterar o perfil do usuário sem estar logado como ele
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Lida com os eventos
  switch (event.type) {
    case 'invoice.payment_succeeded':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      
      // Verifica se está ativo ou em trial
      const status = subscription.status // active, trialing, past_due, canceled
      
      // Atualiza o usuário no banco
      if (status === 'active' || status === 'trialing') {
        // Calcula nova data de fim (ex: data atual + 1 mês) ou usa a data do Stripe
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
        
        await supabaseAdmin
          .from('profiles')
          .update({ 
            subscription_status: 'active',
            trial_ends_at: currentPeriodEnd.toISOString() // Renova o acesso
          })
          .eq('stripe_customer_id', customerId)
      }
      break
      
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object as Stripe.Subscription
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'expired' })
        .eq('stripe_customer_id', deletedSub.customer as string)
      break
  }

  return new Response(JSON.stringify({ received: true }), { 
    headers: { 'Content-Type': 'application/json' },
    status: 200 
  })
})