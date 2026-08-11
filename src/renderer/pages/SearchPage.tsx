import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ConditionBadge, EmptyState, Spinner, Thumb } from '../components/ui';
import { useLang } from '../i18n/LanguageContext';
import type { ArchiveItem } from '@shared/types';

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const { t, pick, n } = useLang();

  const [items, setItems] = useState<ArchiveItem[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItems(null);

    window.archive.items
      .list({ search: query, limit: 200, sortBy: 'accession', sortDir: 'asc' })
      .then((page) => {
        if (cancelled) return;
        setItems(page.rows);
        setTotal(page.total);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const crumbs = [
    { label: t('nav.home'), to: '/' },
    { label: `${t('search.heading')}: ${query}` },
  ];

  return (
    <AppShell crumbs={crumbs}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-sand-900">{t('search.heading')}</h1>
        <p className="mt-2 text-sand-600">
          {t('search.for')} <span className="font-semibold text-sand-900">“{query}”</span>
          {items && ` — ${n(total)}`}
        </p>
      </div>

      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon="🔍" title={t('search.none')} hint={t('search.noneHint')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} to={`/item/${item.id}`} className="card-interactive flex gap-4 p-4">
              <Thumb fileName={item.primaryPhoto} size="h-20 w-20" iconSize="h-7 w-7" />

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] text-sand-500">
                  <bdi>{item.accessionNo}</bdi>
                </p>
                <h2 className="mt-0.5 line-clamp-2 font-semibold leading-snug text-sand-900">
                  <bdi>{pick(item.titleEn, item.titleAr)}</bdi>
                </h2>
                <p className="mt-1 truncate text-xs text-sand-500">
                  <bdi>{pick(item.categoryNameEn, item.categoryNameAr)}</bdi> ·{' '}
                  <bdi>{pick(item.typeNameEn, item.typeNameAr)}</bdi>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <ConditionBadge condition={item.condition} />
                  {item.dateText && (
                    <span className="text-xs text-sand-500">
                      <bdi>{item.dateText}</bdi>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
