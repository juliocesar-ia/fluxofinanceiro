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
        const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : new Date(0);
        
        // Verifica se a data ainda é válida (futuro)
        const isDateValid = isAfter(trialEnd, now);
        
        // Regra Simplificada:
        // 1. Se pagou (active), entra.
        // 2. Se a data é futura (seja trial ou bônus), entra.
        if (profile.subscription_status === 'active' || isDateValid) {
          setHasAccess(true);
          
          // Calcula dias apenas para mostrar na UI se não for vitalício
          if (profile.subscription_status !== 'active') {
             const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
             setDaysLeft(diffDays);
          }
        } else {
          setHasAccess(false);
        }
      }
    } catch (error) {
      console.error("Erro de assinatura:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return { loading, hasAccess, daysLeft };
}