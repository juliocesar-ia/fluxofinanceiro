import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAfter } from 'date-fns';

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
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const now = new Date();
        // Se trial_ends_at for nulo, assume uma data antiga para bloquear
        const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : new Date(0);
        
        // Verifica se hoje é antes do fim do teste
        const isTrialValid = isAfter(trialEnd, now);
        
        // Lógica: Libera se for Assinante OU (Trial E Data Válida)
        if (profile.subscription_status === 'active') {
          setHasAccess(true);
        } else if (profile.subscription_status === 'trial' && isTrialValid) {
          setHasAccess(true);
        } else {
          // Qualquer outra coisa bloqueia (expired, trial vencido, etc)
          setHasAccess(false);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar assinatura:", error);
      setHasAccess(false); // Bloqueia por segurança em caso de erro
    } finally {
      setLoading(false);
    }
  };

  return { loading, hasAccess, daysLeft };
}