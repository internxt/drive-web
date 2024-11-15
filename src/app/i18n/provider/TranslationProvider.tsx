import React, { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Translate, TranslateArray } from '../types';

interface TranslationContextProps {
  translate: Translate;
  translateList: TranslateArray;
}

const TranslationContext = createContext<TranslationContextProps>({ translate: () => '', translateList: () => [] });
interface TranslationProviderProps {
  children: React.ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const { t } = useTranslation();

  const translateList = (key: string, props?: Record<string, unknown>) =>
    t(key, { returnObjects: true, replace: props }) as string[];

  const value = useMemo(() => ({ translate: t, translateList }), [t]);
  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export const useTranslationContext = (): TranslationContextProps => {
  return useContext(TranslationContext);
};
