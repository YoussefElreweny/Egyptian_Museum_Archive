import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { TRANSLATIONS } from './translations';
import type { TranslationKey } from './translations';
import type { Lang } from '@shared/types';

interface LanguageValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  /** Look up an interface string in the active language. */
  t: (key: TranslationKey) => string;
  /**
   * Pick the field of a bilingual record for the active language, falling back
   * to the other language so a half-translated record still reads sensibly.
   */
  pick: (en: string | undefined | null, ar: string | undefined | null) => string;
  /** Format a number using the active locale's digits. */
  n: (value: number) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

const STORAGE_KEY = 'archive.lang';

function initialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'ar' || stored === 'en' ? stored : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.documentElement.classList.toggle('font-arabic', lang === 'ar');
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(() => setLangState((l) => (l === 'en' ? 'ar' : 'en')), []);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      dir,
      isRtl: lang === 'ar',
      setLang,
      toggle,
      t: (key) => TRANSLATIONS[key]?.[lang] ?? key,
      pick: (en, ar) => {
        const primary = lang === 'ar' ? ar : en;
        const secondary = lang === 'ar' ? en : ar;
        return (primary?.trim() || secondary?.trim() || '') as string;
      },
      n: (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-GB').format(value),
    }),
    [lang, dir, setLang, toggle],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLang must be used inside LanguageProvider');
  return context;
}
