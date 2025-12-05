import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAfter, parseISO, isValid } from 'date-fns';

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("🔒 SUBSCRIPTION: Usuário não logado.");
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("❌ SUBSCRIPTION: Erro ao buscar perfil", error);
        setHasAccess(false);
        setLoading(false);
        return;
      }

      if (profile) {
        const now = new Date();
        let trialEnd = new Date(0); // Data padrão (1970) para bloquear se falhar

        // Tenta processar a data vinda do banco de várias formas
        if (profile.trial_ends_at) {
          const rawDate = profile.trial_ends_at;
          
          // 1. Tenta parse ISO direto (Formato padrão do Supabase: 2025-12-06T...)
          const isoDate = new Date(rawDate);
          
          if (isValid(isoDate)) {
            trialEnd = isoDate;
          } else {
            // 2. Fallback: Se o usuário escreveu texto manual (ex: 06/12/2025)
            console.warn("⚠️ Data em formato não padrão:", rawDate);
            // Tenta parsear ISO forçado se possível ou mantém inválido
            try {
                trialEnd = parseISO(rawDate);
            } catch (e) {
                console.error("Data inválida:", e);
            }
          }
        }

        // Verifica se a data é futura
        const isDateFuture = isAfter(trialEnd, now);
        
        // DEBUG: Mostra no Console (F12) exatamente o que o sistema está vendo
        console.log(`🔍 DIAGNÓSTICO DE ACESSO:
          - Status no Banco: ${profile.subscription_status}
          - Data Bruta: ${profile.trial_ends_at}
          - Data Entendida: ${trialEnd.toLocaleString()}
          - Hoje: ${now.toLocaleString()}
          - É Futuro? ${isDateFuture ? "SIM ✅" : "NÃO ❌"}
        `);

        // REGRA DE ACESSO:
        // 1. É assinante ativo? -> LIBERA
        // 2. A data é futura? -> LIBERA (Mesmo que status seja trial ou expired)
        if (profile.subscription_status === 'active' || isDateFuture) {
          setHasAccess(true);
          
          // Calcula dias restantes para mostrar
          const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          setDaysLeft(diffDays);
        } else {
          console.log("🚫 ACESSO NEGADO: Data expirada ou status inválido.");
          setHasAccess(false);
        }
      }
    } catch (error) {
      console.error("❌ Erro fatal na verificação:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return { loading, hasAccess, daysLeft };
}