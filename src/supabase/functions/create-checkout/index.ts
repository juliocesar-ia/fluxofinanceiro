import Stripe from "stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_KEY")!);

Deno.serve(async (req) => {
  const { userId } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: "price_1SYVZACFnHZiIXy4OAo6LgHw", quantity: 1 }],
    success_url: "https://SEU_SITE.com/app",
    cancel_url: "https://SEU_SITE.com/pricing",
    metadata: { userId },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
});
