import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  ArrowRight,
  TrendingUp,
  Target,
  PieChart,
  Shield,
  Zap,
  Smartphone,
} from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
export default function Landing() {
  const navigate = useNavigate()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);
  return (
    
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-background to-background" />
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Controle suas finanças com simplicidade
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Organize seus gastos, acompanhe suas metas e conquiste a liberdade financeira
              que você sempre quis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 h-14 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary group">
                Criar Conta Gratuita
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades completas para gerenciar suas finanças de forma profissional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Dashboard Inteligente",
                description: "Visualize seu saldo, entradas, saídas e evolução mensal em tempo real",
              },
              {
                icon: Target,
                title: "Metas Financeiras",
                description: "Defina objetivos e acompanhe o progresso com metas mensais e anuais",
              },
              {
                icon: PieChart,
                title: "Relatórios Avançados",
                description: "Gráficos detalhados por categoria, períodos e comparativos",
              },
              {
                icon: Shield,
                title: "Segurança Total",
                description: "Seus dados protegidos com criptografia de ponta a ponta",
              },
              {
                icon: Zap,
                title: "Assinaturas Recorrentes",
                description: "Controle de pagamentos recorrentes com alertas automáticos",
              },
              {
                icon: Smartphone,
                title: "100% Responsivo",
                description: "Acesse de qualquer dispositivo, a qualquer hora e lugar",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="p-6 hover-lift card-shine border-border bg-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { number: "10k+", label: "Usuários ativos" },
              { number: "R$ 50M+", label: "Gerenciados na plataforma" },
              { number: "98%", label: "Satisfação dos clientes" },
            ].map((stat, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="text-5xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-lg text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Comece hoje mesmo a organizar suas finanças
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Crie sua conta gratuita e descubra como é simples ter o controle total
            do seu dinheiro.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8 h-14 bg-gradient-to-r from-primary to-primary/90 group">
              Experimentar Grátis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
