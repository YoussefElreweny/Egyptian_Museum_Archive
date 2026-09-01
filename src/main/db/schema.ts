import type Database from 'better-sqlite3';
import { TAXONOMY } from '../../shared/taxonomy';

/**
 * Schema version. Bump when adding a migration below; `migrate()` replays
 * every migration whose version exceeds the database's current user_version.
 */
export const SCHEMA_VERSION = 2;

const V1 = `
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name_en     TEXT NOT NULL,
  name_ar     TEXT NOT NULL,
  ordinal_ar  TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS material_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,
  name_en     TEXT NOT NULL,
  name_ar     TEXT NOT NULL,
  example_en  TEXT NOT NULL DEFAULT '',
  example_ar  TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_types_category ON material_types(category_id);

CREATE TABLE IF NOT EXISTS items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id          INTEGER NOT NULL REFERENCES material_types(id) ON DELETE RESTRICT,
  accession_no     TEXT NOT NULL UNIQUE,
  title_en         TEXT NOT NULL DEFAULT '',
  title_ar         TEXT NOT NULL DEFAULT '',
  description_en   TEXT NOT NULL DEFAULT '',
  description_ar   TEXT NOT NULL DEFAULT '',
  creator_en       TEXT NOT NULL DEFAULT '',
  creator_ar       TEXT NOT NULL DEFAULT '',
  origin_en        TEXT NOT NULL DEFAULT '',
  origin_ar        TEXT NOT NULL DEFAULT '',
  date_text        TEXT NOT NULL DEFAULT '',
  year             INTEGER,
  period_en        TEXT NOT NULL DEFAULT '',
  period_ar        TEXT NOT NULL DEFAULT '',
  language         TEXT NOT NULL DEFAULT '',
  condition        TEXT NOT NULL DEFAULT 'good',
  dimensions       TEXT NOT NULL DEFAULT '',
  material_en      TEXT NOT NULL DEFAULT '',
  material_ar      TEXT NOT NULL DEFAULT '',
  quantity         INTEGER NOT NULL DEFAULT 1,
  location_en      TEXT NOT NULL DEFAULT '',
  location_ar      TEXT NOT NULL DEFAULT '',
  acquisition_en   TEXT NOT NULL DEFAULT '',
  acquisition_ar   TEXT NOT NULL DEFAULT '',
  acquisition_date TEXT NOT NULL DEFAULT '',
  notes_en         TEXT NOT NULL DEFAULT '',
  notes_ar         TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type_id);
CREATE INDEX IF NOT EXISTS idx_items_year ON items(year);
CREATE INDEX IF NOT EXISTS idx_items_condition ON items(condition);

CREATE TABLE IF NOT EXISTS item_photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  caption_en  TEXT NOT NULL DEFAULT '',
  caption_ar  TEXT NOT NULL DEFAULT '',
  is_primary  INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_photos_item ON item_photos(item_id);

-- Full-text index over every searchable bilingual field. Kept in sync by the
-- triggers below so search never drifts from the items table.
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  accession_no, title_en, title_ar, description_en, description_ar,
  creator_en, creator_ar, origin_en, origin_ar, notes_en, notes_ar,
  content='items', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS items_fts_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, accession_no, title_en, title_ar, description_en,
    description_ar, creator_en, creator_ar, origin_en, origin_ar, notes_en, notes_ar)
  VALUES (new.id, new.accession_no, new.title_en, new.title_ar, new.description_en,
    new.description_ar, new.creator_en, new.creator_ar, new.origin_en, new.origin_ar,
    new.notes_en, new.notes_ar);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, accession_no, title_en, title_ar, description_en,
    description_ar, creator_en, creator_ar, origin_en, origin_ar, notes_en, notes_ar)
  VALUES ('delete', old.id, old.accession_no, old.title_en, old.title_ar, old.description_en,
    old.description_ar, old.creator_en, old.creator_ar, old.origin_en, old.origin_ar,
    old.notes_en, old.notes_ar);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, accession_no, title_en, title_ar, description_en,
    description_ar, creator_en, creator_ar, origin_en, origin_ar, notes_en, notes_ar)
  VALUES ('delete', old.id, old.accession_no, old.title_en, old.title_ar, old.description_en,
    old.description_ar, old.creator_en, old.creator_ar, old.origin_en, old.origin_ar,
    old.notes_en, old.notes_ar);
  INSERT INTO items_fts(rowid, accession_no, title_en, title_ar, description_en,
    description_ar, creator_en, creator_ar, origin_en, origin_ar, notes_en, notes_ar)
  VALUES (new.id, new.accession_no, new.title_en, new.title_ar, new.description_en,
    new.description_ar, new.creator_en, new.creator_ar, new.origin_en, new.origin_ar,
    new.notes_en, new.notes_ar);
END;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/**
 * Adds the previous numbers an item carried under earlier cataloguing systems.
 *
 * They live in their own table because a record can carry several, each from a
 * different era or registrar. `items.previous_numbers` is a denormalised copy
 * of the same values, maintained by the repository, so the existing full-text
 * index over `items` can search them — the FTS table is rebuilt here to pick
 * up the new column.
 */
const V2 = `
ALTER TABLE items ADD COLUMN previous_numbers TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS item_previous_numbers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  value       TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_prev_numbers_item ON item_previous_numbers(item_id);

DROP TRIGGER IF EXISTS items_fts_ai;
DROP TRIGGER IF EXISTS items_fts_ad;
DROP TRIGGER IF EXISTS items_fts_au;
DROP TABLE IF EXISTS items_fts;

CREATE VIRTUAL TABLE items_fts USING fts5(
  accession_no, previous_numbers, title_en, title_ar, description_en, description_ar,
  creator_en, creator_ar, origin_en, origin_ar, notes_en, notes_ar,
  content='items', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER items_fts_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, accession_no, previous_numbers, title_en, title_ar,
    description_en, description_ar, creator_en, creator_ar, origin_en, origin_ar,
    notes_en, notes_ar)
  VALUES (new.id, new.accession_no, new.previous_numbers, new.title_en, new.title_ar,
    new.description_en, new.description_ar, new.creator_en, new.creator_ar,
    new.origin_en, new.origin_ar, new.notes_en, new.notes_ar);
END;

CREATE TRIGGER items_fts_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, accession_no, previous_numbers, title_en,
    title_ar, description_en, description_ar, creator_en, creator_ar, origin_en,
    origin_ar, notes_en, notes_ar)
  VALUES ('delete', old.id, old.accession_no, old.previous_numbers, old.title_en,
    old.title_ar, old.description_en, old.description_ar, old.creator_en,
    old.creator_ar, old.origin_en, old.origin_ar, old.notes_en, old.notes_ar);
END;

CREATE TRIGGER items_fts_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, accession_no, previous_numbers, title_en,
    title_ar, description_en, description_ar, creator_en, creator_ar, origin_en,
    origin_ar, notes_en, notes_ar)
  VALUES ('delete', old.id, old.accession_no, old.previous_numbers, old.title_en,
    old.title_ar, old.description_en, old.description_ar, old.creator_en,
    old.creator_ar, old.origin_en, old.origin_ar, old.notes_en, old.notes_ar);
  INSERT INTO items_fts(rowid, accession_no, previous_numbers, title_en, title_ar,
    description_en, description_ar, creator_en, creator_ar, origin_en, origin_ar,
    notes_en, notes_ar)
  VALUES (new.id, new.accession_no, new.previous_numbers, new.title_en, new.title_ar,
    new.description_en, new.description_ar, new.creator_en, new.creator_ar,
    new.origin_en, new.origin_ar, new.notes_en, new.notes_ar);
END;

INSERT INTO items_fts(items_fts) VALUES('rebuild');
`;

export const MIGRATIONS: { version: number; sql: string }[] = [
  { version: 1, sql: V1 },
  { version: 2, sql: V2 },
];

export function migrate(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const current = db.pragma('user_version', { simple: true }) as number;

  for (const { version, sql } of MIGRATIONS) {
    if (version > current) {
      // One transaction per migration: a half-applied V2 would leave the
      // database without a search index.
      db.exec('BEGIN');
      try {
        db.exec(sql);
        db.pragma(`user_version = ${version}`);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
  }
}

/**
 * Insert the museum's taxonomy, or update it in place if the wording changed.
 * Runs on every launch and never deletes a category or type, so archived items
 * can't be orphaned by a taxonomy edit.
 */
export function seedTaxonomy(db: Database.Database): void {
  const upsertCategory = db.prepare(`
    INSERT INTO categories (slug, name_en, name_ar, ordinal_ar, icon, order_index)
    VALUES (@slug, @nameEn, @nameAr, @ordinalAr, @icon, @orderIndex)
    ON CONFLICT(slug) DO UPDATE SET
      name_en = excluded.name_en, name_ar = excluded.name_ar,
      ordinal_ar = excluded.ordinal_ar, icon = excluded.icon,
      order_index = excluded.order_index
  `);

  const upsertType = db.prepare(`
    INSERT INTO material_types (category_id, slug, name_en, name_ar, example_en, example_ar, order_index)
    VALUES (@categoryId, @slug, @nameEn, @nameAr, @exampleEn, @exampleAr, @orderIndex)
    ON CONFLICT(slug) DO UPDATE SET
      category_id = excluded.category_id,
      name_en = excluded.name_en, name_ar = excluded.name_ar,
      example_en = excluded.example_en, example_ar = excluded.example_ar,
      order_index = excluded.order_index
  `);

  const categoryIdBySlug = db.prepare('SELECT id FROM categories WHERE slug = ?');

  db.transaction(() => {
    TAXONOMY.forEach((category, ci) => {
      upsertCategory.run({
        slug: category.slug,
        nameEn: category.nameEn,
        nameAr: category.nameAr,
        ordinalAr: category.ordinalAr,
        icon: category.icon,
        orderIndex: ci,
      });

      const row = categoryIdBySlug.get(category.slug) as { id: number };

      category.types.forEach((type, ti) => {
        upsertType.run({
          categoryId: row.id,
          slug: type.slug,
          nameEn: type.nameEn,
          nameAr: type.nameAr,
          exampleEn: type.exampleEn,
          exampleAr: type.exampleAr,
          orderIndex: ti,
        });
      });
    });
  })();
}
