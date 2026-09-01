import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc';
import type { AppInfo } from '../shared/ipc';
import type {
  ArchiveItem,
  ArchiveStats,
  Category,
  ItemInput,
  ItemPage,
  ItemPhoto,
  ItemQuery,
  Lang,
  MaterialType,
  Result,
} from '../shared/types';

/**
 * Unwrap the `Result` envelope used by the main process: successful calls
 * resolve to their payload, failures reject with the original message so the
 * renderer can handle them with ordinary try/catch.
 */
async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as Result<T>;
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

const api = {
  categories: {
    list: () => call<Category[]>(IPC.categoriesList),
    get: (slug: string) => call<Category | null>(IPC.categoryGet, slug),
  },
  types: {
    list: (categoryId: number) => call<MaterialType[]>(IPC.typesList, categoryId),
    get: (slug: string) => call<MaterialType | null>(IPC.typeGet, slug),
  },
  items: {
    list: (query: ItemQuery) => call<ItemPage>(IPC.itemsList, query),
    get: (id: number) => call<ArchiveItem | null>(IPC.itemGet, id),
    create: (input: ItemInput) => call<ArchiveItem>(IPC.itemCreate, input),
    update: (id: number, input: ItemInput) => call<ArchiveItem>(IPC.itemUpdate, id, input),
    remove: (id: number) => call<boolean>(IPC.itemDelete, id),
    nextAccession: (typeId: number) => call<string>(IPC.itemNextAccession, typeId),
  },
  photos: {
    add: (itemId: number) => call<ItemPhoto[]>(IPC.photoAdd, itemId),
    remove: (photoId: number) => call<boolean>(IPC.photoDelete, photoId),
    setPrimary: (photoId: number) => call<boolean>(IPC.photoSetPrimary, photoId),
    /** Build a renderable URL for a stored media file name. */
    url: (fileName: string) => `archive-media://media/${encodeURIComponent(fileName)}`,
  },
  qr: {
    /** Opens a picker and attaches the chosen image; resolves null if cancelled. */
    set: (itemId: number) => call<string | null>(IPC.qrSet, itemId),
    clear: (itemId: number) => call<boolean>(IPC.qrClear, itemId),
  },
  stats: () => call<ArchiveStats>(IPC.statsGet),
  settings: {
    get: (key: string) => call<string | null>(IPC.settingGet, key),
    set: (key: string, value: string) => call<boolean>(IPC.settingSet, key, value),
  },
  exportItems: (query: ItemQuery, lang: Lang) => call<string | null>(IPC.exportItems, query, lang),
  backupDatabase: () => call<string | null>(IPC.backupDatabase),
  revealDataFolder: () => call<boolean>(IPC.revealDataFolder),
  appInfo: () => call<AppInfo>(IPC.appInfo),
};

export type ArchiveApi = typeof api;

contextBridge.exposeInMainWorld('archive', api);
