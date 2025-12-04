import { Link } from "react-router-dom";
import { Wallet, Mail, Instagram, Twitter } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-secondary border-t border-border py-12 mt-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-2 rounded-xl">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl text-foreground">FinancePro</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              Controle financeiro completo para organizar suas finanças pessoais,
              conquistar metas e ter mais tranquilidade no dia a dia.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Links Úteis</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Início</Link></li>
              <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">Entrar / Cadastrar</Link></li>
            </ul>
          </div>

          {/* Legal & Contato */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal & Suporte</h3>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li>
                <a href="mailto:suporte@financepro.com" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 mt-2">
                  <Mail className="h-4 w-4" /> suporte@financepro.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FinancePro. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};