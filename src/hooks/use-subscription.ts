import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAfter, isValid, parseISO } from 'date-fns';

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
        // Garante data válida (se for nulo, usa data antiga pra bloquear)
        let trialEnd = new Date(0);
        
        if (profile.trial_ends_at) {
            const parsed = new Date(profile.trial_ends_at);
            if(isValid(parsed)) trialEnd = parsed;
        }

        const isDateFuture = isAfter(trialEnd, now);
        
        // REGRA: Assinante (active) OU Data Futura (trial/bonus)
        if (profile.subscription_status === 'active' || isDateFuture) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      }
    } catch (error) {
      console.error("Erro auth:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return { loading, hasAccess, daysLeft };
}