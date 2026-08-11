import { useEffect, useState } from 'react';
import { CONDITIONS, Modal } from './ui';
import { useToast } from './Toast';
import { useLang } from '../i18n/LanguageContext';
import type { ArchiveItem, Category, ConditionGrade, ItemInput, MaterialType } from '@shared/types';
import type { TranslationKey } from '../i18n/translations';

const EMPTY: ItemInput = {
  typeId: 0,
  accessionNo: '',
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  descriptionAr: '',
  creatorEn: '',
  creatorAr: '',
  originEn: '',
  originAr: '',
  dateText: '',
  year: null,
  periodEn: '',
  periodAr: '',
  language: '',
  condition: 'good',
  dimensions: '',
  materialEn: '',
  materialAr: '',
  quantity: 1,
  locationEn: '',
  locationAr: '',
  acquisitionEn: '',
  acquisitionAr: '',
  acquisitionDate: '',
  notesEn: '',
  notesAr: '',
};

function toInput(item: ArchiveItem): ItemInput {
  const { ...rest } = item;
  return {
    typeId: rest.typeId,
    accessionNo: rest.accessionNo,
    titleEn: rest.titleEn,
    titleAr: rest.titleAr,
    descriptionEn: rest.descriptionEn,
    descriptionAr: rest.descriptionAr,
    creatorEn: rest.creatorEn,
    creatorAr: rest.creatorAr,
    originEn: rest.originEn,
    originAr: rest.originAr,
    dateText: rest.dateText,
    year: rest.year,
    periodEn: rest.periodEn,
    periodAr: rest.periodAr,
    language: rest.language,
    condition: rest.condition,
    dimensions: rest.dimensions,
    materialEn: rest.materialEn,
    materialAr: rest.materialAr,
    quantity: rest.quantity,
    locationEn: rest.locationEn,
    locationAr: rest.locationAr,
    acquisitionEn: rest.acquisitionEn,
    acquisitionAr: rest.acquisitionAr,
    acquisitionDate: rest.acquisitionDate,
    notesEn: rest.notesEn,
    notesAr: rest.notesAr,
  };
}

/** A field captured in both languages, each half locked to its own direction. */
function BilingualField({
  label,
  valueEn,
  valueAr,
  onEn,
  onAr,
  multiline = false,
  rows = 3,
}: {
  label: string;
  valueEn: string;
  valueAr: string;
  onEn: (v: string) => void;
  onAr: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const { t } = useLang();
  const Tag = multiline ? 'textarea' : 'input';

  return (
    <fieldset className="sm:col-span-2">
      <legend className="label">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Tag
            className="input"
            dir="ltr"
            rows={multiline ? rows : undefined}
            value={valueEn}
            placeholder={t('field.english')}
            onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onEn(e.target.value)}
          />
          <span className="mt-1 block text-[11px] text-sand-500">{t('field.english')}</span>
        </div>
        <div>
          <Tag
            className="input font-arabic"
            dir="rtl"
            rows={multiline ? rows : undefined}
            value={valueAr}
            placeholder={t('field.arabic')}
            onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onAr(e.target.value)}
          />
          <span className="mt-1 block text-[11px] text-sand-500">{t('field.arabic')}</span>
        </div>
      </div>
    </fieldset>
  );
}

export function ItemForm({
  open,
  item,
  defaultTypeId,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: ArchiveItem | null;
  defaultTypeId: number;
  onClose: () => void;
  onSaved: (item: ArchiveItem) => void;
}) {
  const { t, pick } = useLang();
  const toast = useToast();

  const [form, setForm] = useState<ItemInput>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ItemInput>(key: K, value: ItemInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Load the taxonomy once, then seed the form each time the dialog opens.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      const cats = await window.archive.categories.list();
      if (cancelled) return;
      setCategories(cats);

      const initial = item ? toInput(item) : { ...EMPTY, typeId: defaultTypeId };
      setForm(initial);
      setErrors([]);

      // Work out which category owns the selected type so the two selects agree.
      const perCategory = await Promise.all(
        cats.map(async (c) => ({ id: c.id, types: await window.archive.types.list(c.id) })),
      );
      if (cancelled) return;

      const owner =
        perCategory.find((entry) => entry.types.some((mt) => mt.id === initial.typeId)) ??
        perCategory[0];

      setCategoryId(owner?.id ?? 0);
      setTypes(owner?.types ?? []);

      if (!initial.typeId && owner?.types[0]) {
        setForm((f) => ({ ...f, typeId: owner.types[0].id }));
      }
    })().catch((error) => {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, defaultTypeId]);

  const changeCategory = async (nextId: number) => {
    setCategoryId(nextId);
    const nextTypes = await window.archive.types.list(nextId);
    setTypes(nextTypes);
    if (nextTypes[0]) set('typeId', nextTypes[0].id);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found: string[] = [];
    if (!form.titleEn.trim() && !form.titleAr.trim()) found.push(t('form.titleRequired'));
    if (!form.typeId) found.push(t('form.typeRequired'));

    setErrors(found);
    if (found.length > 0) return;

    setSaving(true);
    try {
      const saved = item
        ? await window.archive.items.update(item.id, form)
        : await window.archive.items.create(form);
      onSaved(saved);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.error');
      setErrors([message]);
      toast.show(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? t('form.editTitle') : t('form.addTitle')} wide>
      <form onSubmit={submit}>
        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <ul className="list-inside list-disc space-y-1">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="form-category">
                {t('field.category')}
              </label>
              <select
                id="form-category"
                className="input"
                value={categoryId}
                onChange={(e) => changeCategory(Number(e.target.value))}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {pick(c.nameEn, c.nameAr)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="form-type">
                {t('field.type')} <span className="text-red-600">*</span>
              </label>
              <select
                id="form-type"
                className="input"
                value={form.typeId}
                onChange={(e) => set('typeId', Number(e.target.value))}
              >
                {types.map((mt) => (
                  <option key={mt.id} value={mt.id}>
                    {pick(mt.nameEn, mt.nameAr)}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="form-accession">
                {t('field.accessionNo')}
              </label>
              <input
                id="form-accession"
                className="input font-mono"
                dir="ltr"
                value={form.accessionNo}
                placeholder={t('field.autoGenerated')}
                onChange={(e) => set('accessionNo', e.target.value)}
              />
            </div>

            <BilingualField
              label={`${t('field.title')} *`}
              valueEn={form.titleEn}
              valueAr={form.titleAr}
              onEn={(v) => set('titleEn', v)}
              onAr={(v) => set('titleAr', v)}
            />

            <BilingualField
              label={t('field.description')}
              valueEn={form.descriptionEn}
              valueAr={form.descriptionAr}
              onEn={(v) => set('descriptionEn', v)}
              onAr={(v) => set('descriptionAr', v)}
              multiline
              rows={4}
            />

            <BilingualField
              label={t('field.creator')}
              valueEn={form.creatorEn}
              valueAr={form.creatorAr}
              onEn={(v) => set('creatorEn', v)}
              onAr={(v) => set('creatorAr', v)}
            />

            <BilingualField
              label={t('field.origin')}
              valueEn={form.originEn}
              valueAr={form.originAr}
              onEn={(v) => set('originEn', v)}
              onAr={(v) => set('originAr', v)}
            />

            <div>
              <label className="label" htmlFor="form-date">
                {t('field.date')}
              </label>
              <input
                id="form-date"
                className="input"
                value={form.dateText}
                onChange={(e) => set('dateText', e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="form-year">
                {t('field.year')}
              </label>
              <input
                id="form-year"
                type="number"
                className="input"
                dir="ltr"
                value={form.year ?? ''}
                onChange={(e) => set('year', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>

            <BilingualField
              label={t('field.period')}
              valueEn={form.periodEn}
              valueAr={form.periodAr}
              onEn={(v) => set('periodEn', v)}
              onAr={(v) => set('periodAr', v)}
            />

            <div>
              <label className="label" htmlFor="form-language">
                {t('field.language')}
              </label>
              <input
                id="form-language"
                className="input"
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="form-condition">
                {t('field.condition')}
              </label>
              <select
                id="form-condition"
                className="input"
                value={form.condition}
                onChange={(e) => set('condition', e.target.value as ConditionGrade)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {t(`condition.${c}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="form-dimensions">
                {t('field.dimensions')}
              </label>
              <input
                id="form-dimensions"
                className="input"
                value={form.dimensions}
                onChange={(e) => set('dimensions', e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="form-quantity">
                {t('field.quantity')}
              </label>
              <input
                id="form-quantity"
                type="number"
                min={1}
                className="input"
                dir="ltr"
                value={form.quantity}
                onChange={(e) => set('quantity', Math.max(1, Number(e.target.value) || 1))}
              />
            </div>

            <BilingualField
              label={t('field.material')}
              valueEn={form.materialEn}
              valueAr={form.materialAr}
              onEn={(v) => set('materialEn', v)}
              onAr={(v) => set('materialAr', v)}
            />

            <BilingualField
              label={t('field.location')}
              valueEn={form.locationEn}
              valueAr={form.locationAr}
              onEn={(v) => set('locationEn', v)}
              onAr={(v) => set('locationAr', v)}
            />

            <BilingualField
              label={t('field.acquisition')}
              valueEn={form.acquisitionEn}
              valueAr={form.acquisitionAr}
              onEn={(v) => set('acquisitionEn', v)}
              onAr={(v) => set('acquisitionAr', v)}
            />

            <div>
              <label className="label" htmlFor="form-acq-date">
                {t('field.acquisitionDate')}
              </label>
              <input
                id="form-acq-date"
                type="date"
                className="input"
                dir="ltr"
                value={form.acquisitionDate}
                onChange={(e) => set('acquisitionDate', e.target.value)}
              />
            </div>

            <BilingualField
              label={t('field.notes')}
              valueEn={form.notesEn}
              valueAr={form.notesAr}
              onEn={(v) => set('notesEn', v)}
              onAr={(v) => set('notesAr', v)}
              multiline
            />
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-sand-200 bg-sand-50 px-6 py-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('action.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {t('action.save')}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
