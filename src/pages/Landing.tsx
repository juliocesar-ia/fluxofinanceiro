import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // <--- Importação que faltava
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ArrowRight, CheckCircle2, TrendingUp, Shield, Smartphone, 
  PieChart, Wallet, Trophy, Target, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Landing() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });

    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [navigate]);

  const features = [
    {
      icon: <Trophy className="h-6 w-6 text-yellow-500" />,
      title: "Gamificação Real",
      desc: "Transforme economia em jogo. Suba de nível, ganhe medalhas e mantenha sua ofensiva de dias seguidos."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-green-500" />,
      title: "Gestão de Dívidas",
      desc: "Use o método 'Bola de Neve' para quitar suas dívidas mais rápido e pagar menos juros."
    },
    {
      icon: <Smartphone className="h-6 w-6 text-blue-500" />,
      title: "App Instalável (PWA)",
      desc: "Funciona offline no seu celular. Instale direto do navegador, sem ocupar espaço."
    },
    {
      icon: <Shield className="h-6 w-6 text-primary" />,
      title: "Modo Privacidade",
      desc: "Abra seu extrato em público sem medo. Um clique esconde todos os seus valores."
    },
    {
      icon: <Target className="h-6 w-6 text-red-500" />,
      title: "Sonhos com Fotos",
      desc: "Visualize o carro ou a casa que você quer comprar. Acompanhe o progresso com fotos reais."
    },
    {
      icon: <PieChart className="h-6 w-6 text-purple-500" />,
      title: "Relatórios PDF",
      desc: "Gere relatórios profissionais para seu contador ou para análise pessoal em um clique."
    }
  ];

  const faqs = [
    { q: "Preciso de cartão de crédito?", a: "Para iniciar o período de teste sim, para garantir que você é uma pessoa real. Nada será cobrado nos primeiros 3 dias." },
    { q: "Meus dados estão seguros?", a: "Sim. Usamos criptografia de ponta a ponta e não vendemos seus dados. Você é o único dono da sua informação." },
    { q: "Funciona no iPhone e Android?", a: "Perfeitamente. Nossa tecnologia PWA permite instalar o app em qualquer dispositivo moderno." },
    { q: "Posso cancelar quando quiser?", a: "Sim. Sem fidelidade, sem letras miúdas. Cancele com um clique nas configurações." }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled ? "bg-background/80 backdrop-blur-md border-border py-3 shadow-sm" : "bg-transparent border-transparent py-6"}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary to-orange-600 p-2 rounded-xl text-white shadow-lg">
               <Wallet className="h-6 w-6" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:inline-block">FinancePro</span>
          </div>
          <div className="flex gap-4">
            <Link to="/auth">
               <Button variant="ghost" className="font-medium hover:bg-primary/10 hover:text-primary">Entrar</Button>
            </Link>
            <Link to="/auth">
               <Button className="font-bold shadow-lg bg-primary hover:bg-primary/90 transition-all hover:scale-105">Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-50"></div>
        
        <div className="container mx-auto px-6 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-primary/30 bg-primary/5 text-primary animate-in fade-in slide-in-from-bottom-4 duration-700">
             <Star className="h-3.5 w-3.5 mr-2 fill-primary" /> A escolha inteligente para seu bolso
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Domine seu dinheiro. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">Conquiste sua liberdade.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            A plataforma completa que une controle, investimentos e gamificação. 
            Saia do vermelho e comece a investir hoje.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all hover:scale-105">
                Começar Teste Grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            {/* BOTÃO "VER DEMO" REMOVIDO DAQUI */}
          </div>

          <p className="mt-6 text-sm text-muted-foreground animate-in fade-in delay-500">
            3 dias grátis • Cancele a qualquer momento
          </p>
        </div>
      </section>

      {/* MOCKUP E RESTO DA PÁGINA (MANTIDO) */}
      <section className="container mx-auto px-4 -mt-10 mb-24 relative z-10">
         <div className="rounded-xl border bg-card/50 backdrop-blur shadow-2xl p-2 md:p-4 animate-in fade-in zoom-in duration-1000 delay-300">
            <div className="rounded-lg overflow-hidden bg-background aspect-video md:aspect-[21/9] border flex items-center justify-center relative group">
               <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/50 to-background flex flex-col items-center justify-center text-center p-8">
                  <PieChart className="h-20 w-20 text-primary/20 mb-4" />
                  <p className="text-2xl font-bold text-muted-foreground/50">Dashboard Premium</p>
                  <p className="text-muted-foreground/40">Visão completa em tempo real</p>
               </div>
            </div>
         </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo o que você precisa</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ferramentas de nível bancário, simplificadas para o seu dia a dia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <Card key={i} className="bg-background border-none shadow-md hover:shadow-xl transition-all hover:-translate-y-1 duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <CardTitle className="text-xl">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 relative overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10"></div>
         
         <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
               <div>
                  <h2 className="text-4xl font-bold mb-6">Investimento simbólico,<br />retorno garantido.</h2>
                  <p className="text-lg text-muted-foreground mb-8">
                     O FinancePro custa menos que um café por mês, mas pode te economizar milhares de reais em juros e gastos desnecessários.
                  </p>
                  <ul className="space-y-4">
                     {["Acesso ilimitado a tudo", "Suporte prioritário", "Atualizações semanais", "Backup automático"].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                           <CheckCircle2 className="h-5 w-5 text-green-500" />
                           <span className="font-medium">{item}</span>
                        </li>
                     ))}
                  </ul>
               </div>

               <Card className="border-2 border-primary shadow-2xl relative overflow-hidden bg-background">
                  <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-primary to-orange-500"></div>
                  <CardHeader className="text-center pt-10">
                     <CardTitle className="text-2xl">Plano Pro</CardTitle>
                     <div className="flex justify-center items-baseline gap-1 my-4">
                        <span className="text-5xl font-extrabold">R$ 14,99</span>
                        <span className="text-muted-foreground">/mês</span>
                     </div>
                     <CardDescription>Cobrança mensal. Cancele quando quiser.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <Link to="/auth">
                        <Button className="w-full h-12 text-lg font-bold shadow-lg bg-primary hover:bg-primary/90">
                           Quero Assinar Agora
                        </Button>
                     </Link>
                     <p className="text-center text-xs text-muted-foreground mt-4">
                        3 dias de teste grátis inclusos.
                     </p>
                  </CardContent>
               </Card>
            </div>
         </div>
      </section>

      <section className="py-24 bg-secondary/30">
         <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
            <Accordion type="single" collapsible className="w-full">
               {faqs.map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-b border-primary/10">
                     <AccordionTrigger className="text-left text-lg hover:text-primary">{item.q}</AccordionTrigger>
                     <AccordionContent className="text-muted-foreground text-base">
                        {item.a}
                     </AccordionContent>
                  </AccordionItem>
               ))}
            </Accordion>
         </div>
      </section>

      <footer className="py-8 border-t border-border text-center text-sm text-muted-foreground">
         <p>© {new Date().getFullYear()} FinancePro. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}