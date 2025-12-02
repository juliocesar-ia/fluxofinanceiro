import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function SubscriptionStatus() {
  const [active, setActive] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    const user = (await supabase.auth.getUser()).data.user;
    const { data } = await supabase
      .from("subscriptions")
      .select("active")
      .eq("user_id", user.id)
      .single();

    setActive(data?.active);
  }

  if (active) return null;

  return (
    <div className="bg-red-600/20 text-red-300 border border-red-600 p-3 rounded-xl mb-4">
      Sua assinatura expirou.  
      <a href="/pricing" className="underline">Renovar agora</a>
    </div>
  );
}
