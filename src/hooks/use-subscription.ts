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
      const trialEnd = new Date(profile.trial_ends_at);
      const isTrialActive = isAfter(trialEnd, now);
      
      // Calcula dias restantes do trial
      const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      setDaysLeft(isTrialActive ? diffDays : 0);

      // Lógica de Acesso: Tem acesso se o status for 'active' OU se o trial ainda não venceu
      if (profile.subscription_status === 'active') {
        setHasAccess(true);
      } else if (profile.subscription_status === 'trial' && isTrialActive) {
        setHasAccess(true);
      } else {
        setHasAccess(false); // Bloqueia
      }
    }
    
    setLoading(false);
  };

  return { loading, hasAccess, daysLeft };
}