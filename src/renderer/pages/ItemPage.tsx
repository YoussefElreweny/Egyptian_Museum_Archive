import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ItemForm } from '../components/ItemForm';
import { PhotoGallery } from '../components/PhotoGallery';
import { ConditionBadge, ConfirmDialog, EmptyState, Field, SectionCard, Spinner } from '../components/ui';
import { useToast } from '../components/Toast';
import { useLang } from '../i18n/LanguageContext';
import type { ArchiveItem } from '@shared/types';

/** Render a bilingual value as the active language over the other one. */
function Bilingual({ primary, secondary }: { primary: string; secondary: string }) {
  if (!primary && !secondary) return <>—</>;
  return (
    <>
      {/* The block wrapper keeps the page's alignment; <bdi> stays inline so it
          isolates the text's character order without claiming its own line. */}
      <span className="block">
        <bdi>{primary || secondary}</bdi>
      </span>
      {primary && secondary && primary !== secondary && (
        <span className="mt-0.5 block text-xs text-sand-500">
          <bdi>{secondary}</bdi>
        </span>
      )}
    </>
  );
}

export default function ItemPage() {
  const { itemId = '' } = useParams();
  const { t, pick, lang } = useLang();
  const toast = useToast();
  const navigate = useNavigate();

  const [item, setItem] = useState<ArchiveItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const id = Number(itemId);
    if (!Number.isFinite(id)) {
      setItem(null);
      setLoading(false);
      return;
    }
    const found = await window.archive.items.get(id);
    setItem(found);
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    setLoading(true);
    load().catch(() => setLoading(false));
  }, [load]);

  const remove = async () => {
    if (!item) return;
    try {
      await window.archive.items.remove(item.id);
      toast.show(t('toast.deleted'));
      navigate(`/category/${item.categorySlug}/type/${item.typeSlug}`, { replace: true });
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <Spinner />
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('common.notFound') }]}>
        <EmptyState icon="🔎" title={t('common.notFound')} />
      </AppShell>
    );
  }

  const crumbs = [
    { label: t('nav.home'), to: '/' },
    {
      label: pick(item.categoryNameEn, item.categoryNameAr),
      to: `/category/${item.categorySlug}`,
    },
    {
      label: pick(item.typeNameEn, item.typeNameAr),
      to: `/category/${item.categorySlug}/type/${item.typeSlug}`,
    },
    { label: item.accessionNo },
  ];

  const title = pick(item.titleEn, item.titleAr);
  const subtitle = pick(item.titleAr, item.titleEn);

  const dateFormat = (value: string) => {
    if (!value) return '—';
    const parsed = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <AppShell crumbs={crumbs}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="chip bg-lapis-100 font-mono text-lapis-800">{item.accessionNo}</span>
            <ConditionBadge condition={item.condition} />
            <span className="chip bg-sand-200 text-sand-700">
              {pick(item.typeNameEn, item.typeNameAr)}
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-sand-900">
            {title || '—'}
          </h1>
          {subtitle && subtitle !== title && (
            <p className="mt-1 text-lg text-sand-500">{subtitle}</p>
          )}
        </div>

        <div className="no-print flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            {t('action.print')}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            {t('action.edit')}
          </button>
          <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
            {t('action.delete')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <PhotoGallery item={item} onChanged={load} />

          <SectionCard title={t('item.identification')}>
            <dl className="space-y-4">
              <Field label={t('field.accessionNo')} value={<span className="font-mono">{item.accessionNo}</span>} />
              <Field label={t('field.category')} value={pick(item.categoryNameEn, item.categoryNameAr)} />
              <Field label={t('field.type')} value={pick(item.typeNameEn, item.typeNameAr)} />
              <Field
                label={t('field.creator')}
                value={<Bilingual primary={pick(item.creatorEn, item.creatorAr)} secondary={pick(item.creatorAr, item.creatorEn)} />}
              />
              <Field
                label={t('field.origin')}
                value={<Bilingual primary={pick(item.originEn, item.originAr)} secondary={pick(item.originAr, item.originEn)} />}
              />
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title={t('item.description')}>
            <div className="space-y-4">
              <div>
                <p className="label">{t('field.english')}</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-sand-800" dir="ltr">
                  {item.descriptionEn || '—'}
                </p>
              </div>
              <div>
                <p className="label">{t('field.arabic')}</p>
                <p className="whitespace-pre-wrap text-sm leading-loose text-sand-800" dir="rtl">
                  {item.descriptionAr || '—'}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('item.physical')}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label={t('field.date')} value={item.dateText} />
              <Field label={t('field.year')} value={item.year == null ? '—' : String(item.year)} />
              <Field label={t('field.period')} value={pick(item.periodEn, item.periodAr)} />
              <Field label={t('field.language')} value={item.language} />
              <Field label={t('field.dimensions')} value={item.dimensions} />
              <Field label={t('field.quantity')} value={String(item.quantity)} />
              <div className="sm:col-span-2">
                <Field
                  label={t('field.material')}
                  value={<Bilingual primary={pick(item.materialEn, item.materialAr)} secondary={pick(item.materialAr, item.materialEn)} />}
                />
              </div>
            </dl>
          </SectionCard>

          <SectionCard title={t('item.provenance')}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('field.location')}
                value={<Bilingual primary={pick(item.locationEn, item.locationAr)} secondary={pick(item.locationAr, item.locationEn)} />}
              />
              <Field
                label={t('field.acquisition')}
                value={<Bilingual primary={pick(item.acquisitionEn, item.acquisitionAr)} secondary={pick(item.acquisitionAr, item.acquisitionEn)} />}
              />
              <Field label={t('field.acquisitionDate')} value={item.acquisitionDate} />
              <Field label={t('field.condition')} value={<ConditionBadge condition={item.condition} />} />
            </dl>
          </SectionCard>

          {(item.notesEn || item.notesAr) && (
            <SectionCard title={t('item.notes')}>
              <div className="space-y-3">
                {item.notesEn && (
                  <p className="whitespace-pre-wrap text-sm text-sand-800" dir="ltr">
                    {item.notesEn}
                  </p>
                )}
                {item.notesAr && (
                  <p className="whitespace-pre-wrap text-sm leading-loose text-sand-800" dir="rtl">
                    {item.notesAr}
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title={t('item.administrative')}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label={t('field.createdAt')} value={dateFormat(item.createdAt)} />
              <Field label={t('field.updatedAt')} value={dateFormat(item.updatedAt)} />
            </dl>
          </SectionCard>
        </div>
      </div>

      <ItemForm
        open={editing}
        item={item}
        defaultTypeId={item.typeId}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          toast.show(t('toast.saved'));
          load();
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t('confirm.deleteTitle')}
        body={t('confirm.deleteBody')}
        confirmLabel={t('action.delete')}
        cancelLabel={t('action.cancel')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          remove();
        }}
      />
    </AppShell>
  );
}
