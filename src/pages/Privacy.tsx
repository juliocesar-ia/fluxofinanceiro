import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
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
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Política de Privacidade</h1>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-sm sm:text-base">
            <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString()}</p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introdução</h2>
              <p>
                A sua privacidade é nossa prioridade. O <strong>FinancePro</strong> ("nós", "nosso") compromete-se a proteger os dados pessoais que você compartilha conosco. Esta política descreve como coletamos, usamos e protegemos suas informações financeiras e pessoais.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Dados que Coletamos</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Dados de Conta:</strong> Nome, e-mail e foto de perfil (opcional).</li>
                <li><strong>Dados Financeiros:</strong> Transações, saldos, metas e orçamentos inseridos manualmente por você.</li>
                <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador e logs de acesso para segurança.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Uso das Informações</h2>
              <p>Utilizamos seus dados exclusivamente para:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Fornecer o serviço de gestão financeira.</li>
                <li>Gerar relatórios e insights personalizados (via IA, quando solicitado).</li>
                <li>Processar pagamentos de assinatura (via Stripe).</li>
                <li>Melhorar a segurança da plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Segurança dos Dados</h2>
              <p>
                Empregamos criptografia de ponta a ponta em trânsito (SSL/TLS) e em repouso. Seus dados financeiros são armazenados em bancos de dados seguros (Supabase) com políticas de acesso restrito (RLS). Nunca vendemos seus dados para terceiros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Seus Direitos (LGPD)</h2>
              <p>Você tem o direito de:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Solicitar uma cópia dos seus dados.</li>
                <li>Corrigir informações imprecisas.</li>
                <li>Solicitar a exclusão total da sua conta e dados.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Contato</h2>
              <p>
                Para questões sobre privacidade, entre em contato conosco pelo e-mail: <strong>privacidade@financepro.com</strong>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}