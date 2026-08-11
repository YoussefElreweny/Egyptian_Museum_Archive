import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { useToast } from './Toast';

export interface Crumb {
  label: string;
  to?: string;
}

/** Chevron that points the correct way in both writing directions. */
function Chevron({ rtl }: { rtl: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5 shrink-0 text-sand-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d={rtl ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppShell({ crumbs, children }: { crumbs?: Crumb[]; children: ReactNode }) {
  const { t, lang, toggle, isRtl } = useLang();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.archive
      .appInfo()
      .then((info) => setVersion(info.version))
      .catch(() => setVersion(''));
  }, []);

  // Clear the box when the user navigates away from the results page.
  useEffect(() => {
    if (!location.pathname.startsWith('/search')) setQuery('');
  }, [location.pathname]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const backup = async () => {
    try {
      const path = await window.archive.backupDatabase();
      if (path) toast.show(`${t('toast.backedUp')} ${path}`);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-sand-300 bg-gradient-to-l from-lapis-900 to-lapis-800 text-white shadow-lg">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-6 py-3">
          <Link to="/" className="flex items-center gap-3 rounded-lg py-1 transition hover:opacity-90">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500 shadow-inner">
              {/* Ankh, drawn rather than typed: the hieroglyph code point has no
                  font on most Windows installs and renders as a blank box. */}
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <ellipse cx="12" cy="7" rx="4" ry="5" />
                <path d="M12 12v9M7 15h10" strokeLinecap="round" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-wide">{t('app.title')}</span>
              <span className="block text-xs text-lapis-200">{t('app.subtitle')}</span>
            </span>
          </Link>

          <form onSubmit={submitSearch} className="order-last min-w-full flex-1 md:order-none md:min-w-0">
            <div className="relative">
              <svg
                viewBox="0 0 20 20"
                className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-lapis-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="M14 14l4 4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                aria-label={t('nav.search')}
                className="w-full rounded-lg border border-lapis-600 bg-lapis-950/40 py-2 pe-3 ps-9 text-sm
                           text-white placeholder:text-lapis-300 focus:border-gold-400 focus:outline-none
                           focus:ring-1 focus:ring-gold-400"
              />
            </div>
          </form>

          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={backup}
              title={t('action.backup')}
              className="rounded-lg p-2 text-lapis-100 transition hover:bg-lapis-700 hover:text-white"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.5 13v2.5a1 1 0 001 1h11a1 1 0 001-1V13" strokeLinecap="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 rounded-lg border border-lapis-500 bg-lapis-700/60 px-3 py-2
                         text-sm font-semibold transition hover:border-gold-400 hover:bg-lapis-700"
              aria-label={lang === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="10" cy="10" r="7.25" />
                <path d="M2.75 10h14.5M10 2.75c1.9 2 2.9 4.5 2.9 7.25s-1 5.25-2.9 7.25c-1.9-2-2.9-4.5-2.9-7.25S8.1 4.75 10 2.75z" />
              </svg>
              {t('common.language')}
            </button>
          </div>
        </div>

        {crumbs && crumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="border-t border-lapis-700/60 bg-lapis-900/60 px-6 py-2"
          >
            <ol className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 text-sm">
              {crumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 && <Chevron rtl={isRtl} />}
                  {crumb.to && index < crumbs.length - 1 ? (
                    <Link to={crumb.to} className="text-lapis-200 transition hover:text-gold-400 hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-white">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8">{children}</main>

      <footer className="no-print border-t border-sand-300 bg-sand-50 px-6 py-4">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 text-xs text-sand-600">
          <span>{t('app.museum')} — {t('app.subtitle')}</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.archive.revealDataFolder()}
              className="transition hover:text-lapis-700 hover:underline"
            >
              {t('action.dataFolder')}
            </button>
            {version && <span>{t('common.version')} {version}</span>}
          </div>
        </div>
      </footer>
    </div>
  );
}
