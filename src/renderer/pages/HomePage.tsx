import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Spinner, Thumb } from '../components/ui';
import { useLang } from '../i18n/LanguageContext';
import type { ArchiveStats, Category } from '@shared/types';

/** Accent stripe per category so the seven cards stay distinguishable. */
const ACCENTS = [
  'from-amber-500 to-amber-600',
  'from-sky-500 to-sky-600',
  'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600',
  'from-teal-500 to-teal-600',
  'from-fuchsia-500 to-fuchsia-600',
  'from-orange-500 to-orange-600',
];

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="card px-5 py-4">
      <div className="text-2xl font-bold text-lapis-800">{value}</div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-sand-600">{label}</div>
    </div>
  );
}

export default function HomePage() {
  const { t, pick, n, lang } = useLang();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [stats, setStats] = useState<ArchiveStats | null>(null);

  useEffect(() => {
    Promise.all([window.archive.categories.list(), window.archive.stats()])
      .then(([cats, s]) => {
        setCategories(cats);
        setStats(s);
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <AppShell>
      {categories === null ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-sand-900">{t('home.heading')}</h1>
              <p className="mt-2 max-w-2xl text-sand-600">{t('home.intro')}</p>
            </div>

            {stats && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile value={n(stats.totalItems)} label={t('home.stats.items')} />
                <StatTile value={n(stats.totalCategories)} label={t('home.stats.categories')} />
                <StatTile value={n(stats.totalTypes)} label={t('home.stats.types')} />
                <StatTile value={n(stats.totalPhotos)} label={t('home.stats.photos')} />
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className="card-interactive group flex flex-col overflow-hidden focus-visible:ring-2"
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${ACCENTS[index % ACCENTS.length]}`} />

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="text-4xl transition group-hover:scale-110" aria-hidden="true">
                      {category.icon}
                    </span>
                    <span className="chip bg-sand-100 font-mono text-sand-600">
                      {lang === 'ar' ? category.ordinalAr : String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold leading-snug text-sand-900 group-hover:text-lapis-800">
                    {pick(category.nameEn, category.nameAr)}
                  </h2>

                  <p className="mt-1 text-sm text-sand-500">
                    {pick(category.nameAr, category.nameEn)}
                  </p>

                  <div className="mt-auto flex items-center gap-4 pt-5 text-xs font-medium text-sand-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-lapis-500" />
                      {n(category.typeCount ?? 0)} {t('category.typeCount')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                      {n(category.itemCount ?? 0)} {t('category.itemCount')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {stats && stats.recentItems.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 text-lg font-semibold text-sand-800">{t('home.recent')}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.recentItems.map((item) => (
                  <Link
                    key={item.id}
                    to={`/item/${item.id}`}
                    className="card-interactive flex items-center gap-4 p-3"
                  >
                    <Thumb fileName={item.primaryPhoto} size="h-14 w-14" iconSize="h-6 w-6" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-sand-900">
                        <bdi>{pick(item.titleEn, item.titleAr)}</bdi>
                      </p>
                      <p className="truncate text-xs text-sand-500">
                        <bdi>{pick(item.typeNameEn, item.typeNameAr)}</bdi>
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-sand-400">
                        <bdi>{item.accessionNo}</bdi>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
