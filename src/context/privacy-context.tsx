import React, { createContext, useContext, useState, useEffect } from 'react';

type PrivacyContextType = {
  isPrivacyOn: boolean;
  togglePrivacy: () => void;
};

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivacyOn: false,
  togglePrivacy: () => {},
});

export const PrivacyProvider = ({ children }: { children: React.ReactNode }) => {
  // Tenta ler do localStorage para lembrar a preferência do usuário
  const [isPrivacyOn, setIsPrivacyOn] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('privacy-mode') === 'true';
    }
    return false;
  });

  const togglePrivacy = () => {
    setIsPrivacyOn(prev => {
      const newVal = !prev;
      localStorage.setItem('privacy-mode', String(newVal));
      return newVal;
    });
  };

  return (
    <PrivacyContext.Provider value={{ isPrivacyOn, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => useContext(PrivacyContext);