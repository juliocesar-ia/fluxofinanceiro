import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Check, ArrowRight } from "lucide-react";

async function createCheckout() {
  const user = (await supabase.auth.getUser()).data.user;

  const res = await fetch(
    "https://YOUR_SUPABASE_URL/functions/v1/create-checkout",
    {
      method: "POST",
      body: JSON.stringify({ userId: user.id }),
      headers: { "Content-Type": "application/json" },
    }
  );

  const data = await res.json();
  window.location.href = data.url;
}
<button onClick={createCheckout} className="bg-purple-600 px-4 py-2 rounded-xl">
  Assinar por R$ 9,90/mês
</button>

export default function Pricing() {
  const features = [
    "Dashboard completo com gráficos",
    "Controle ilimitado de transações",
    "Categorias personalizáveis",
    "Metas financeiras",
    "Planejamento mensal",
    "Assinaturas recorrentes",
    "Controle de cartões de crédito",
    "Relatórios avançados",
    "Exportação em PDF e CSV",
    "Notificações inteligentes",
    "Suporte prioritário",
    "Acesso mobile e desktop",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Planos e Preços
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comece com 5 dias grátis e tenha acesso completo a todas as funcionalidades
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-8 md:p-12 border-2 border-primary/20 shadow-xl hover-lift card-shine">
              <div className="text-center mb-8">
                <div className="inline-block bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-semibold px-4 py-1 rounded-full mb-4">
                  PLANO PREMIUM
                </div>
                <div className="flex items-baseline justify-center gap-2 mb-4">
                  <span className="text-5xl md:text-7xl font-bold text-primary">R$ 9,90</span>
                  <span className="text-2xl text-muted-foreground">/mês</span>
                </div>
                <p className="text-lg text-muted-foreground">
                  Acesso completo a todas as funcionalidades
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="bg-success/10 rounded-full p-1 mt-0.5">
                      <Check className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-8 space-y-4">
                <div className="bg-accent/50 rounded-lg p-4 text-center">
                  <p className="font-semibold text-lg text-accent-foreground mb-2">
                    🎉 5 Dias Grátis
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Teste todas as funcionalidades sem compromisso. Cancele quando quiser.
                  </p>
                </div>

                <Link to="/auth" className="block">
                  <Button
                    size="lg"
                    className="w-full text-lg h-14 bg-gradient-to-r from-primary to-primary/90 group"
                  >
                    Começar Teste Grátis
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>

                <p className="text-center text-sm text-muted-foreground">
                  Após o período grátis, apenas R$ 9,90/mês. Sem taxas ocultas.
                </p>
              </div>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Perguntas Frequentes
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: "Como funciona o período grátis?",
                  a: "Você tem 5 dias completos para testar todas as funcionalidades sem pagar nada. Após esse período, a cobrança mensal será realizada automaticamente.",
                },
                {
                  q: "Posso cancelar a qualquer momento?",
                  a: "Sim! Você pode cancelar sua assinatura a qualquer momento, sem multas ou taxas de cancelamento.",
                },
                {
                  q: "Quais são as formas de pagamento?",
                  a: "Aceitamos cartões de crédito e débito das principais bandeiras.",
                },
                {
                  q: "Meus dados estão seguros?",
                  a: "Sim! Utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de segurança para proteger suas informações.",
                },
              ].map((faq, index) => (
                <Card key={index} className="p-6">
                  <h3 className="font-semibold text-lg mb-2 text-foreground">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
