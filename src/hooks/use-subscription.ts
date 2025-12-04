import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAfter, parseISO } from 'date-fns';

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
        console.log("SUBSCRIPTION: Usuário não logado");
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("SUBSCRIPTION: Erro ao buscar perfil", error);
        setLoading(false);
        return;
      }

      if (profile) {
        const now = new Date();
        // Garante que a data venha correta do banco (ISO string)
        const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : new Date(0); 
        
        // Verifica se a data de fim é depois de agora
        const isTrialActive = isAfter(trialEnd, now);
        
        console.log("SUBSCRIPTION CHECK:", {
            status: profile.subscription_status,
            trialEnd: trialEnd.toISOString(),
            now: now.toISOString(),
            isTrialActive
        });

        // Lógica de Bloqueio
        if (profile.subscription_status === 'active') {
          setHasAccess(true);
        } else if (profile.subscription_status === 'trial' && isTrialActive) {
           // Calcula dias restantes apenas para exibição
           const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
           setDaysLeft(diffDays);
           setHasAccess(true);
        } else {
          setHasAccess(false); // Bloqueia: Trial acabou ou status expired
        }
      }
    } catch (e) {
      console.error("SUBSCRIPTION: Erro inesperado", e);
    } finally {
      setLoading(false);
    }
  };

  return { loading, hasAccess, daysLeft };
}