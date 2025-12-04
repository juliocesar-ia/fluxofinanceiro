import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { Card } from "@/components/ui/card";

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };
    
    // Ouve o evento do navegador que diz "Ei, esse site pode ser instalado"
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = (evt: any) => {
    evt.preventDefault();
    if (!promptInstall) return;
    
    promptInstall.prompt();
    promptInstall.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false); // Esconde se instalou
      }
      setPromptInstall(null);
    });
  };

  if (!supportsPWA || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <Card className="p-4 flex items-center justify-between bg-primary text-primary-foreground shadow-xl border-primary/20">
        <div className="flex flex-col">
          <span className="font-bold text-sm">Instalar FinancePro</span>
          <span className="text-xs opacity-90">Acesso rápido e offline na tela inicial.</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onClick} className="h-8 px-3">
            <Download className="h-4 w-4 mr-2" /> Instalar
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary-foreground/20" onClick={() => setIsVisible(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}