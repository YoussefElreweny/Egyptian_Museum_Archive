import BetterSqlite3 from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { migrate, seedTaxonomy } from './schema';
import { seedSampleItems } from './sampleData';
import { ArchiveRepository } from './repository';

let db: BetterSqlite3.Database | null = null;
let repo: ArchiveRepository | null = null;

export interface DbPaths {
  /** Directory holding archive.db and the media folder. */
  dataDir: string;
  dbFile: string;
  mediaDir: string;
}

let paths: DbPaths | null = null;

export function initDatabase(dataDir: string): { repo: ArchiveRepository; paths: DbPaths } {
  const dbFile = join(dataDir, 'archive.db');
  const mediaDir = join(dataDir, 'media');

  mkdirSync(dirname(dbFile), { recursive: true });
  mkdirSync(mediaDir, { recursive: true });

  const isNew = !existsSync(dbFile);

  db = new BetterSqlite3(dbFile);
  migrate(db);
  seedTaxonomy(db);
  if (isNew) seedSampleItems(db);

  repo = new ArchiveRepository(db);
  paths = { dataDir, dbFile, mediaDir };

  return { repo, paths };
}

export function getRepo(): ArchiveRepository {
  if (!repo) throw new Error('Database not initialised');
  return repo;
}

export function getPaths(): DbPaths {
  if (!paths) throw new Error('Database not initialised');
  return paths;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    repo = null;
  }
}

export { ArchiveRepository };
