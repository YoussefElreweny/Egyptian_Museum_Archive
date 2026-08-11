/// <reference types="vite/client" />

import type { ArchiveApi } from '../preload/preload';

declare global {
  interface Window {
    archive: ArchiveApi;
  }
}

export {};
