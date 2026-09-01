import { useState } from 'react';
import { ConfirmDialog } from './ui';
import { useToast } from './Toast';
import { useLang } from '../i18n/LanguageContext';
import type { ArchiveItem } from '@shared/types';

/**
 * The QR code attached to a record. The department generates these in their own
 * tool with whatever data they choose; the app stores and displays the image and
 * does not decode or generate it.
 */
export function QrCard({ item, onChanged }: { item: ArchiveItem; onChanged: () => void }) {
  const { t } = useLang();
  const toast = useToast();

  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const attach = async () => {
    setBusy(true);
    try {
      const fileName = await window.archive.qr.set(item.id);
      if (fileName) {
        toast.show(t('qr.attached'));
        onChanged();
      }
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await window.archive.qr.clear(item.id);
      toast.show(t('qr.removed'));
      onChanged();
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  return (
    <section className="card overflow-hidden">
      <h3 className="border-b border-sand-200 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-lapis-800">
        {t('qr.title')}
      </h3>

      <div className="flex items-center justify-center bg-sand-50 p-5">
        {item.qrFileName ? (
          // White plate behind the code: a QR needs a light quiet zone to scan
          // reliably, and the card background is tinted.
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <img
              src={window.archive.photos.url(item.qrFileName)}
              alt={t('qr.title')}
              className="h-40 w-40 object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-sand-400">
            <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 21h1M21 14h-1" strokeLinecap="round" />
            </svg>
            <p className="text-sm">{t('qr.none')}</p>
            <p className="max-w-[14rem] text-center text-xs text-sand-500">{t('qr.hint')}</p>
          </div>
        )}
      </div>

      <div className="no-print flex flex-wrap gap-2 border-t border-sand-200 p-3">
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={attach} disabled={busy}>
          {item.qrFileName ? t('qr.replace') : t('qr.add')}
        </button>
        {item.qrFileName && (
          <button
            type="button"
            className="btn-danger py-1.5 text-xs"
            onClick={() => setConfirmRemove(true)}
          >
            {t('qr.remove')}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title={t('confirm.removeQrTitle')}
        body={t('confirm.removeQrBody')}
        confirmLabel={t('action.delete')}
        cancelLabel={t('action.cancel')}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          remove();
        }}
      />
    </section>
  );
}
