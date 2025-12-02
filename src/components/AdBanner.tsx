import React, { useEffect } from 'react';

export const AdBanner = () => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error", e);
    }
  }, []);

  return (
    <div className="w-full my-6 flex justify-center items-center overflow-hidden bg-muted/20 border border-border/50 rounded-lg min-h-[100px]">
      {/* Substitua data-ad-slot pelo seu ID de bloco de anúncio real do Google */}
      <ins className="adsbygoogle"
           style={{ display: 'block', width: '100%' }}
           data-ad-client="ca-pub-8833852962973603"
           data-ad-slot="8255371871"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      
      {/* Fallback visual enquanto não carrega (pode remover em produção) */}
      <span className="text-xs text-muted-foreground absolute pointer-events-none">Publicidade</span>
    </div>
  );
};