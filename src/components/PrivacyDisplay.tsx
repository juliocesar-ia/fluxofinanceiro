import { usePrivacy } from "@/context/privacy-context";

interface PrivacyDisplayProps {
  children: React.ReactNode;
  blur?: boolean; // Se true, usa efeito de blur (borrado). Se false, usa bolinhas (••••)
  className?: string;
}

export function PrivacyDisplay({ children, blur = true, className = "" }: PrivacyDisplayProps) {
  const { isPrivacyOn } = usePrivacy();

  if (isPrivacyOn) {
    if (blur) {
      return <span className={`filter blur-md select-none transition-all duration-300 ${className}`}>{children}</span>;
    }
    return <span className={`font-mono tracking-widest select-none ${className}`}>••••••</span>;
  }

  return <span className={`transition-all duration-300 ${className}`}>{children}</span>;
}