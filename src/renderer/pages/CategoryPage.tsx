import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { EmptyState, Spinner } from '../components/ui';
import { useLang } from '../i18n/LanguageContext';
import type { Category, MaterialType } from '@shared/types';

export default function CategoryPage() {
  const { categorySlug = '' } = useParams();
  const { t, pick, n } = useLang();

  const [category, setCategory] = useState<Category | null>(null);
  const [types, setTypes] = useState<MaterialType[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTypes(null);

    window.archive.categories
      .get(categorySlug)
      .then(async (cat) => {
        if (cancelled) return;
        setCategory(cat);
        setTypes(cat ? await window.archive.types.list(cat.id) : []);
      })
      .catch(() => {
        if (!cancelled) setTypes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  const crumbs = [
    { label: t('nav.home'), to: '/' },
    { label: category ? pick(category.nameEn, category.nameAr) : '…' },
  ];

  return (
    <AppShell crumbs={crumbs}>
      {types === null ? (
        <Spinner />
      ) : !category ? (
        <EmptyState icon="🔎" title={t('common.notFound')} />
      ) : (
        <>
          <div className="mb-8 flex items-start gap-5">
            <span className="text-5xl" aria-hidden="true">
              {category.icon}
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-sand-900">
                {pick(category.nameEn, category.nameAr)}
              </h1>
              <p className="mt-1 text-lg text-sand-500">{pick(category.nameAr, category.nameEn)}</p>
              <p className="mt-3 max-w-2xl text-sm text-sand-600">{t('category.intro')}</p>
            </div>
          </div>

          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-sand-600">
            {t('category.types')} · {n(types.length)}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((type, index) => (
              <Link
                key={type.id}
                to={`/category/${category.slug}/type/${type.slug}`}
                className="card-interactive group flex flex-col p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lapis-100 font-mono text-xs font-bold text-lapis-800">
                    {n(index + 1)}
                  </span>
                  <span className="chip bg-gold-400/15 text-gold-600">
                    {n(type.itemCount ?? 0)} {t('category.itemCount')}
                  </span>
                </div>

                <h3 className="text-base font-bold leading-snug text-sand-900 group-hover:text-lapis-800">
                  {pick(type.nameEn, type.nameAr)}
                </h3>
                <p className="mt-0.5 text-sm text-sand-500">{pick(type.nameAr, type.nameEn)}</p>

                <div className="mt-4 border-t border-sand-200 pt-3">
                  <p className="label mb-0.5">{t('category.example')}</p>
                  <p className="text-xs leading-relaxed text-sand-600">
                    {pick(type.exampleEn, type.exampleAr)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
