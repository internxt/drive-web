import React, { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface TranslationContextProps {
  translate: (key: string, props?: Record<string, unknown>) => string;
}

const TranslationContext = createContext<TranslationContextProps>({ translate: () => '' });
interface TranslationProviderProps {
  children: React.ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const value = useMemo(() => ({ translate: t }), [t]);
  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export const useTranslationContext = (): TranslationContextProps => {
  return useContext(TranslationContext);
};
