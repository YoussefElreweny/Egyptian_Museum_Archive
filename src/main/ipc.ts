import { BrowserWindow, dialog, ipcMain, shell, app } from 'electron';
import { copyFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getPaths, getRepo } from './db';
import { IPC } from '../shared/ipc';
import type { AppInfo } from '../shared/ipc';
import type { ArchiveItem, ItemInput, ItemQuery, Lang, Result } from '../shared/types';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff'];

/** Wrap a handler so any thrown error reaches the renderer as `{ok:false}`. */
function handle<T>(channel: string, fn: (...args: never[]) => T): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<Result<Awaited<T>>> => {
    try {
      const data = await (fn as (...a: unknown[]) => T)(...args);
      return { ok: true, data: data as Awaited<T> };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ipc] ${channel} failed:`, message);
      return { ok: false, error: message };
    }
  });
}

/** Delete a media file, ignoring the case where it is already gone. */
function removeMedia(fileName: string): void {
  try {
    unlinkSync(join(getPaths().mediaDir, fileName));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.warn(`[media] could not delete ${fileName}:`, error);
    }
  }
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function itemsToCsv(rows: ArchiveItem[]): string {
  const headers = [
    'Accession No',
    'Title (EN)',
    'Title (AR)',
    'Category (EN)',
    'Category (AR)',
    'Type (EN)',
    'Type (AR)',
    'Date',
    'Year',
    'Period (EN)',
    'Period (AR)',
    'Creator (EN)',
    'Creator (AR)',
    'Origin (EN)',
    'Origin (AR)',
    'Language',
    'Condition',
    'Dimensions',
    'Material (EN)',
    'Material (AR)',
    'Quantity',
    'Location (EN)',
    'Location (AR)',
    'Acquisition (EN)',
    'Acquisition (AR)',
    'Acquisition Date',
    'Description (EN)',
    'Description (AR)',
    'Notes (EN)',
    'Notes (AR)',
    'Created',
    'Updated',
  ];

  const lines = [headers.join(',')];

  for (const r of rows) {
    lines.push(
      [
        r.accessionNo,
        r.titleEn,
        r.titleAr,
        r.categoryNameEn,
        r.categoryNameAr,
        r.typeNameEn,
        r.typeNameAr,
        r.dateText,
        r.year,
        r.periodEn,
        r.periodAr,
        r.creatorEn,
        r.creatorAr,
        r.originEn,
        r.originAr,
        r.language,
        r.condition,
        r.dimensions,
        r.materialEn,
        r.materialAr,
        r.quantity,
        r.locationEn,
        r.locationAr,
        r.acquisitionEn,
        r.acquisitionAr,
        r.acquisitionDate,
        r.descriptionEn,
        r.descriptionAr,
        r.notesEn,
        r.notesAr,
        r.createdAt,
        r.updatedAt,
      ]
        .map(csvCell)
        .join(','),
    );
  }

  return lines.join('\r\n');
}

export function registerIpcHandlers(): void {
  const repo = () => getRepo();

  /* --- Taxonomy --- */
  handle(IPC.categoriesList, () => repo().listCategories());
  handle(IPC.categoryGet, (slug: string) => repo().getCategory(slug));
  handle(IPC.typesList, (categoryId: number) => repo().listTypes(categoryId));
  handle(IPC.typeGet, (slug: string) => repo().getType(slug));

  /* --- Items --- */
  handle(IPC.itemsList, (query: ItemQuery) => repo().listItems(query));
  handle(IPC.itemGet, (id: number) => repo().getItem(id));
  handle(IPC.itemCreate, (input: ItemInput) => repo().createItem(input));
  handle(IPC.itemUpdate, (id: number, input: ItemInput) => repo().updateItem(id, input));
  handle(IPC.itemNextAccession, (typeId: number) => repo().nextAccessionNo(typeId));

  handle(IPC.itemDelete, (id: number) => {
    const orphaned = repo().deleteItem(id);
    orphaned.forEach(removeMedia);
    return true;
  });

  /* --- Photos --- */

  // Opens a picker, copies the chosen images into the managed media folder
  // under generated names, and records them against the item. Copying (rather
  // than referencing the original path) keeps the archive self-contained.
  handle(IPC.photoAdd, async (itemId: number) => {
    const window = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(window!, {
      title: 'Select photographs',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }],
    });

    if (result.canceled || result.filePaths.length === 0) return [];

    const { mediaDir } = getPaths();
    const added = [];

    for (const sourcePath of result.filePaths) {
      const ext = extname(sourcePath).toLowerCase() || '.jpg';
      const fileName = `${randomUUID()}${ext}`;
      copyFileSync(sourcePath, join(mediaDir, fileName));
      added.push(repo().addPhoto(itemId, fileName, basename(sourcePath), ''));
    }

    return added;
  });

  handle(IPC.photoDelete, (photoId: number) => {
    const fileName = repo().deletePhoto(photoId);
    if (fileName) removeMedia(fileName);
    return true;
  });

  handle(IPC.photoSetPrimary, (photoId: number) => {
    repo().setPrimaryPhoto(photoId);
    return true;
  });

  /* --- Dashboard & settings --- */
  handle(IPC.statsGet, () => repo().stats());
  handle(IPC.settingGet, (key: string) => repo().getSetting(key));
  handle(IPC.settingSet, (key: string, value: string) => {
    repo().setSetting(key, value);
    return true;
  });

  /* --- Export & backup --- */

  handle(IPC.exportItems, async (query: ItemQuery, lang: Lang) => {
    const { rows } = repo().listItems({ ...query, limit: 100000, offset: 0 });
    const window = BrowserWindow.getFocusedWindow();

    const stamp = new Date().toISOString().slice(0, 10);
    const result = await dialog.showSaveDialog(window!, {
      title: lang === 'ar' ? 'تصدير السجلات' : 'Export records',
      defaultPath: `archive-export-${stamp}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });

    if (result.canceled || !result.filePath) return null;

    // UTF-8 BOM so Excel on Windows renders the Arabic columns correctly.
    writeFileSync(result.filePath, '﻿' + itemsToCsv(rows), 'utf8');
    return result.filePath;
  });

  handle(IPC.backupDatabase, async () => {
    const window = BrowserWindow.getFocusedWindow();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    const result = await dialog.showSaveDialog(window!, {
      title: 'Back up archive database',
      defaultPath: `archive-backup-${stamp}.db`,
      filters: [{ name: 'SQLite database', extensions: ['db'] }],
    });

    if (result.canceled || !result.filePath) return null;

    copyFileSync(getPaths().dbFile, result.filePath);
    return result.filePath;
  });

  handle(IPC.revealDataFolder, () => {
    shell.openPath(getPaths().dataDir);
    return true;
  });

  handle(
    IPC.appInfo,
    (): AppInfo => ({
      version: app.getVersion(),
      dataDir: getPaths().dataDir,
      dbFile: getPaths().dbFile,
      platform: process.platform,
    }),
  );
}
