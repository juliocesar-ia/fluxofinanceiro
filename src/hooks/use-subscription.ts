import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAfter, isValid, parseISO } from 'date-fns';

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (mounted) {
             setHasAccess(false);
             setLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, trial_ends_at')
          .eq('user_id', session.user.id)
          .single();

        if (mounted) {
           if (!profile) {
              setHasAccess(false); // Perfil não encontrado = Bloqueado
           } else {
              const now = new Date();
              let trialEnd = new Date(0); // Padrão expirado

              if (profile.trial_ends_at) {
                 const parsed = new Date(profile.trial_ends_at);
                 if (isValid(parsed)) trialEnd = parsed;
              }

              const isFuture = isAfter(trialEnd, now);
              
              // Regra Simples: Ativo OU Data Futura
              if (profile.subscription_status === 'active' || isFuture) {
                 setHasAccess(true);
              } else {
                 setHasAccess(false);
              }
           }
           setLoading(false);
        }
      } catch (error) {
        console.error("Erro Sub:", error);
        if (mounted) {
           setHasAccess(false); // Em caso de erro, bloqueia (segurança)
           setLoading(false);
        }
      }
    };

    check();

    return () => { mounted = false; };
  }, []);

  return { loading, hasAccess };
}