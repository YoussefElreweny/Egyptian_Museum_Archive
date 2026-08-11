import { app, BrowserWindow, Menu, protocol, shell } from 'electron';
import { join, normalize, sep } from 'node:path';
import { readFile } from 'node:fs/promises';
import { closeDatabase, getPaths, initDatabase } from './db';
import { registerIpcHandlers } from './ipc';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Item photographs live outside the app bundle, so they are served through a
 * dedicated scheme instead of file:// — that keeps the renderer sandboxed and
 * confines reads to the media folder.
 */
protocol.registerSchemesAsPrivileged([
  { scheme: 'archive-media', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let mainWindow: BrowserWindow | null = null;

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
};

function registerMediaProtocol(): void {
  const { mediaDir } = getPaths();
  const root = normalize(mediaDir.endsWith(sep) ? mediaDir : mediaDir + sep);

  protocol.handle('archive-media', async (request) => {
    try {
      const name = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, ''));
      const target = normalize(join(root, name));

      // Reject anything that escapes the media folder via .. or absolute paths.
      if (!target.startsWith(root)) {
        return new Response('Forbidden', { status: 403 });
      }

      const data = await readFile(target);
      const ext = target.slice(target.lastIndexOf('.')).toLowerCase();

      return new Response(new Uint8Array(data), {
        status: 200,
        headers: { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#f3ece0',
    title: 'Egyptian Museum Archive',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.maximize();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // External links open in the user's browser, never inside the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Data Folder',
          click: () => shell.openPath(getPaths().dataDir),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggleDevTools' as const }] : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Egyptian Museum Archive',
          click: () => shell.openExternal('https://egyptianmuseumcairo.eg'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// A single instance keeps one writer on the SQLite file.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    initDatabase(join(app.getPath('userData'), 'archive-data'));
    registerMediaProtocol();
    registerIpcHandlers();
    buildMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('will-quit', closeDatabase);
}
