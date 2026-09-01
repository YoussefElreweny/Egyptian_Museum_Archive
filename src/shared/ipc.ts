/** Channel names shared by the main process, the preload bridge and the renderer. */
export const IPC = {
  categoriesList: 'categories:list',
  categoryGet: 'category:get',
  typesList: 'types:list',
  typeGet: 'type:get',

  itemsList: 'items:list',
  itemGet: 'item:get',
  itemCreate: 'item:create',
  itemUpdate: 'item:update',
  itemDelete: 'item:delete',
  itemNextAccession: 'item:nextAccession',

  photoAdd: 'photo:add',
  photoDelete: 'photo:delete',
  photoSetPrimary: 'photo:setPrimary',

  qrSet: 'qr:set',
  qrClear: 'qr:clear',

  statsGet: 'stats:get',
  settingGet: 'setting:get',
  settingSet: 'setting:set',

  exportItems: 'export:items',
  backupDatabase: 'backup:database',
  revealDataFolder: 'app:revealDataFolder',
  appInfo: 'app:info',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

export interface AppInfo {
  version: string;
  dataDir: string;
  dbFile: string;
  platform: string;
}
