import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2 pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Voltar para Início
          </Button>
        </Link>

        <div className="bg-card border rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Termos de Uso</h1>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-sm sm:text-base">
            <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString()}</p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
              <p>
                Ao criar uma conta no <strong>FinancePro</strong>, você concorda com estes Termos de Serviço. Se você não concordar com qualquer parte, não deve utilizar nossa plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Assinaturas e Pagamentos</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Teste Grátis:</strong> Oferecemos 3 dias de acesso gratuito para novos usuários.</li>
                <li><strong>Pagamento:</strong> Após o período de teste, uma assinatura mensal de R$ 5,00 será cobrada automaticamente.</li>
                <li><strong>Cancelamento:</strong> Você pode cancelar sua assinatura a qualquer momento nas configurações da conta ou painel de pagamento. O acesso continuará ativo até o fim do ciclo pago.</li>
                <li><strong>Reembolso:</strong> Não oferecemos reembolso para meses parciais ou não utilizados, salvo exigência legal.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Responsabilidades do Usuário</h2>
              <p>Você é responsável por:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Manter a confidencialidade da sua senha.</li>
                <li>Fornecer informações verdadeiras e atualizadas.</li>
                <li>Não utilizar a plataforma para fins ilegais.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Limitação de Responsabilidade</h2>
              <p>
                O FinancePro é uma ferramenta de organização. <strong>Não fornecemos consultoria financeira ou de investimentos.</strong> Não nos responsabilizamos por decisões financeiras tomadas com base nos dados da plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Alterações nos Termos</h2>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos os usuários sobre mudanças significativas através da plataforma ou e-mail.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}