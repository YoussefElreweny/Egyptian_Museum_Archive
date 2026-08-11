import { useState } from 'react';
import { ConfirmDialog, PhotoPlaceholder } from './ui';
import { useToast } from './Toast';
import { useLang } from '../i18n/LanguageContext';
import type { ArchiveItem } from '@shared/types';

export function PhotoGallery({ item, onChanged }: { item: ArchiveItem; onChanged: () => void }) {
  const { t } = useLang();
  const toast = useToast();

  const photos = item.photos ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const active = photos[Math.min(activeIndex, photos.length - 1)];

  const addPhotos = async () => {
    setBusy(true);
    try {
      const added = await window.archive.photos.add(item.id);
      if (added.length > 0) {
        toast.show(t('toast.photosAdded'));
        onChanged();
      }
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (photoId: number) => {
    try {
      await window.archive.photos.remove(photoId);
      setActiveIndex(0);
      onChanged();
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  const makePrimary = async (photoId: number) => {
    try {
      await window.archive.photos.setPrimary(photoId);
      onChanged();
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('toast.error'), 'error');
    }
  };

  return (
    <section className="card overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-sand-100">
        {active ? (
          <img
            src={window.archive.photos.url(active.fileName)}
            alt={active.captionEn || active.captionAr || ''}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sand-400">
            <PhotoPlaceholder className="h-12 w-12" />
            <p className="text-sm">{t('item.noPhoto')}</p>
          </div>
        )}

        {active?.isPrimary && (
          <span className="chip absolute top-3 start-3 bg-gold-500 text-white shadow">
            {t('item.primary')}
          </span>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-sand-200 bg-sand-50 p-3">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition ${
                index === activeIndex ? 'border-lapis-600' : 'border-transparent hover:border-sand-300'
              }`}
            >
              <img
                src={window.archive.photos.url(photo.fileName)}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="no-print flex flex-wrap gap-2 border-t border-sand-200 p-3">
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={addPhotos} disabled={busy}>
          {t('item.addPhoto')}
        </button>
        {active && !active.isPrimary && (
          <button
            type="button"
            className="btn-secondary py-1.5 text-xs"
            onClick={() => makePrimary(active.id)}
          >
            {t('item.setPrimary')}
          </button>
        )}
        {active && (
          <button
            type="button"
            className="btn-danger py-1.5 text-xs"
            onClick={() => setPendingDelete(active.id)}
          >
            {t('item.removePhoto')}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('confirm.deletePhotoTitle')}
        body={t('confirm.deletePhotoBody')}
        confirmLabel={t('action.delete')}
        cancelLabel={t('action.cancel')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const id = pendingDelete;
          setPendingDelete(null);
          if (id !== null) removePhoto(id);
        }}
      />
    </section>
  );
}
