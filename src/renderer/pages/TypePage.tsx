import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ItemForm } from '../components/ItemForm';
import { CONDITIONS, ConditionBadge, EmptyState, Spinner, Thumb } from '../components/ui';
import { useToast } from '../components/Toast';
import { useLang } from '../i18n/LanguageContext';
import type { ArchiveItem, Category, ConditionGrade, ItemQuery, MaterialType } from '@shared/types';
import type { TranslationKey } from '../i18n/translations';

const PAGE_SIZE = 50;

export default function TypePage() {
  const { categorySlug = '', typeSlug = '' } = useParams();
  const { t, pick, n } = useLang();
  const toast = useToast();
  const navigate = useNavigate();

  const [category, setCategory] = useState<Category | null>(null);
  const [type, setType] = useState<MaterialType | null>(null);
  const [items, setItems] = useState<ArchiveItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const [sortBy, setSortBy] = useState<NonNullable<ItemQuery['sortBy']>>('accession');
  const [sortDir, setSortDir] = useState<NonNullable<ItemQuery['sortDir']>>('asc');
  const [condition, setCondition] = useState<ConditionGrade | ''>('');
  const [formOpen, setFormOpen] = useState(false);

  const buildQuery = useCallback(
    (typeId: number): ItemQuery => ({
      typeId,
      condition,
      sortBy,
      sortDir,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [condition, sortBy, sortDir, page],
  );

  const load = useCallback(async () => {
    const [cat, mt] = await Promise.all([
      window.archive.categories.get(categorySlug),
      window.archive.types.get(typeSlug),
    ]);
    setCategory(cat);
    setType(mt);

    if (!mt) {
      setItems([]);
      return;
    }

    const result = await window.archive.items.list(buildQuery(mt.id));
    setItems(result.rows);
    setTotal(result.total);
  }, [categorySlug, typeSlug, buildQuery]);

  useEffect(() => {
    setItems(null);
    load().catch((error) => {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
      setItems([]);
    });
    // `toast` and `t` are stable enough that re-running on them would only
    // duplicate fetches; the query inputs are what matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // A filter change invalidates the current page offset.
  useEffect(() => setPage(0), [condition, sortBy, sortDir, typeSlug]);

  const exportCsv = async () => {
    if (!type) return;
    try {
      const path = await window.archive.exportItems({ ...buildQuery(type.id), limit: 100000 }, 'en');
      if (path) toast.show(`${t('toast.exported')} ${path}`);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  const crumbs = [
    { label: t('nav.home'), to: '/' },
    {
      label: category ? pick(category.nameEn, category.nameAr) : '…',
      to: `/category/${categorySlug}`,
    },
    { label: type ? pick(type.nameEn, type.nameAr) : '…' },
  ];

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <AppShell crumbs={crumbs}>
      {items === null ? (
        <Spinner />
      ) : !type ? (
        <EmptyState icon="🔎" title={t('common.notFound')} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-sand-900">
                {pick(type.nameEn, type.nameAr)}
              </h1>
              <p className="mt-1 text-lg text-sand-500">{pick(type.nameAr, type.nameEn)}</p>
              <p className="mt-3 text-sm text-sand-600">
                <span className="font-medium text-sand-700">{t('category.example')}:</span>{' '}
                {pick(type.exampleEn, type.exampleAr)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary no-print" onClick={exportCsv}>
                {t('action.export')}
              </button>
              <button type="button" className="btn-primary no-print" onClick={() => setFormOpen(true)}>
                <span aria-hidden="true">+</span> {t('action.add')}
              </button>
            </div>
          </div>

          <div className="no-print mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-sand-200 bg-white px-4 py-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-sand-600">{t('table.sortBy')}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="input w-auto py-1.5"
              >
                <option value="accession">{t('sort.accession')}</option>
                <option value="title">{t('sort.title')}</option>
                <option value="year">{t('sort.year')}</option>
                <option value="updated">{t('sort.updated')}</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="btn-secondary py-1.5"
              aria-label="Toggle sort direction"
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>

            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-sand-600">{t('field.condition')}</span>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ConditionGrade | '')}
                className="input w-auto py-1.5"
              >
                <option value="">{t('table.all')}</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {t(`condition.${c}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </label>

            <span className="ms-auto text-sm text-sand-500">
              {t('table.showing')} {n(items.length)} {t('table.of')} {n(total)}
            </span>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon="📭"
              title={t('table.empty')}
              hint={t('table.emptyHint')}
              action={
                <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
                  {t('action.add')}
                </button>
              }
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead>
                    <tr className="border-b border-sand-200 bg-sand-50 text-start">
                      <th className="w-16 px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-sand-600">
                        {t('table.no')}
                      </th>
                      <th className="w-24 px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-sand-600">
                        {t('table.photo')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-sand-600">
                        {t('table.accession')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-sand-600">
                        {t('field.previousNo')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-sand-600">
                        {t('table.title')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-sand-600">
                        {t('table.date')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-sand-600">
                        {t('table.condition')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-sand-600">
                        {t('table.location')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={item.id}
                        onClick={() => navigate(`/item/${item.id}`)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/item/${item.id}`);
                          }
                        }}
                        className="cursor-pointer border-b border-sand-100 transition last:border-0 hover:bg-lapis-50/60 focus:bg-lapis-50"
                      >
                        <td className="px-4 py-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lapis-100 font-mono text-xs font-bold text-lapis-800">
                            {n(page * PAGE_SIZE + index + 1)}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Thumb fileName={item.primaryPhoto} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand-700">
                          <bdi>{item.accessionNo}</bdi>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand-600">
                          <bdi>{item.previousNumbersText || '—'}</bdi>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/item/${item.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block font-medium text-sand-900 hover:text-lapis-700 hover:underline"
                          >
                            <bdi>{pick(item.titleEn, item.titleAr) || '—'}</bdi>
                          </Link>
                          <p className="mt-0.5 line-clamp-1 text-xs text-sand-500">
                            <bdi>{pick(item.titleAr, item.titleEn)}</bdi>
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sand-700">
                          <bdi>{item.dateText || '—'}</bdi>
                        </td>
                        <td className="px-4 py-3">
                          <ConditionBadge condition={item.condition} />
                        </td>
                        <td className="px-4 py-3 text-xs text-sand-600">
                          <bdi>{pick(item.locationEn, item.locationAr) || '—'}</bdi>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {lastPage > 0 && (
                <div className="no-print flex items-center justify-between border-t border-sand-200 bg-sand-50 px-4 py-3 text-sm">
                  <button
                    type="button"
                    className="btn-secondary py-1.5"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    ‹
                  </button>
                  <span className="text-sand-600">
                    {n(page + 1)} / {n(lastPage + 1)}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary py-1.5"
                    disabled={page >= lastPage}
                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          )}

          <ItemForm
            open={formOpen}
            item={null}
            defaultTypeId={type.id}
            onClose={() => setFormOpen(false)}
            onSaved={(saved) => {
              setFormOpen(false);
              toast.show(t('toast.saved'));
              navigate(`/item/${saved.id}`);
            }}
          />
        </>
      )}
    </AppShell>
  );
}
