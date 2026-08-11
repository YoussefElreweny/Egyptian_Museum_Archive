import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLang } from '../i18n/LanguageContext';
import type { ConditionGrade } from '@shared/types';
import type { TranslationKey } from '../i18n/translations';

export function Spinner({ label }: { label?: string }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-sand-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sand-300 border-t-lapis-600" />
      <p className="text-sm">{label ?? t('common.loading')}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-sand-300 bg-sand-50/60 px-6 py-20 text-center">
      <span className="text-4xl opacity-60">{icon}</span>
      <h3 className="text-lg font-semibold text-sand-800">{title}</h3>
      {hint && <p className="max-w-sm text-sm text-sand-600">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

const CONDITION_STYLES: Record<ConditionGrade, string> = {
  excellent: 'bg-emerald-100 text-emerald-800',
  good: 'bg-lapis-100 text-lapis-800',
  fair: 'bg-amber-100 text-amber-800',
  poor: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export const CONDITIONS: ConditionGrade[] = ['excellent', 'good', 'fair', 'poor', 'critical'];

export function ConditionBadge({ condition }: { condition: ConditionGrade }) {
  const { t } = useLang();
  const style = CONDITION_STYLES[condition] ?? CONDITION_STYLES.good;
  return <span className={`chip ${style}`}>{t(`condition.${condition}` as TranslationKey)}</span>;
}

/** Generic image glyph, shown wherever an item has no photograph yet. */
export function PhotoPlaceholder({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
      <circle cx="7" cy="8" r="1.2" />
      <path d="M3 14l4.5-4 3 2.5L14 9l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Square thumbnail for list and table rows, falling back to the placeholder. */
export function Thumb({
  fileName,
  size = 'h-12 w-12',
  iconSize = 'h-5 w-5',
}: {
  fileName?: string | null;
  size?: string;
  iconSize?: string;
}) {
  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-lg bg-sand-100`}>
      {fileName ? (
        <img src={window.archive.photos.url(fileName)} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sand-400">
          <PhotoPlaceholder className={iconSize} />
        </div>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-sand-900/40 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-4 w-full rounded-xl bg-white shadow-card-hover ${wide ? 'max-w-5xl' : 'max-w-lg'}`}
      >
        <header className="flex items-center justify-between border-b border-sand-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-sand-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-sand-500 transition hover:bg-sand-100 hover:text-sand-800"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="px-6 py-5">
        <p className="text-sm leading-relaxed text-sand-700">{body}</p>
      </div>
      <footer className="flex justify-end gap-2 border-t border-sand-200 px-6 py-4">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="btn bg-red-600 text-white hover:bg-red-700"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </footer>
    </Modal>
  );
}

/**
 * A labelled read-only field on the item profile. The value goes inside `<bdi>`
 * so a Latin value such as "24 × 17 cm, 312 folios" keeps its own character
 * order in an Arabic layout — without `dir="auto"`, which would also flip the
 * value's alignment away from its label.
 */
export function Field({ label, value }: { label: string; value: ReactNode }) {
  const isEmpty = value == null || value === '' || value === '—';
  const content = isEmpty ? '—' : value;

  // Only plain text is wrapped here. Composite values (badges, the bilingual
  // pair) carry their own isolation, and nesting blocks inside an inline <bdi>
  // would strip them of the page's alignment.
  const isPlainText = typeof content === 'string' || typeof content === 'number';

  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={`text-sm ${isEmpty ? 'text-sand-400' : 'text-sand-900'}`}>
        {isPlainText ? <bdi>{content}</bdi> : content}
      </dd>
    </div>
  );
}

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="mb-4 border-b border-sand-200 pb-2 text-sm font-semibold uppercase tracking-wide text-lapis-800">
        {title}
      </h3>
      {children}
    </section>
  );
}
