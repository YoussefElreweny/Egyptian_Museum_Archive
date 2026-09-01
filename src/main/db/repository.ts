import type Database from 'better-sqlite3';
import type {
  ArchiveItem,
  ArchiveStats,
  Category,
  ConditionGrade,
  ItemInput,
  ItemPage,
  ItemPhoto,
  ItemQuery,
  MaterialType,
  PreviousNumber,
  PreviousNumberInput,
} from '../../shared/types';
import { CATEGORY_CODES } from '../../shared/taxonomy';

/* ------------------------------------------------------------------ *
 * Row mappers
 * ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number => (v == null ? 0 : Number(v));

function toCategory(r: Row): Category {
  return {
    id: num(r.id),
    slug: str(r.slug),
    nameEn: str(r.name_en),
    nameAr: str(r.name_ar),
    ordinalAr: str(r.ordinal_ar),
    icon: str(r.icon),
    orderIndex: num(r.order_index),
    typeCount: r.type_count == null ? undefined : num(r.type_count),
    itemCount: r.item_count == null ? undefined : num(r.item_count),
  };
}

function toType(r: Row): MaterialType {
  return {
    id: num(r.id),
    categoryId: num(r.category_id),
    slug: str(r.slug),
    nameEn: str(r.name_en),
    nameAr: str(r.name_ar),
    exampleEn: str(r.example_en),
    exampleAr: str(r.example_ar),
    orderIndex: num(r.order_index),
    itemCount: r.item_count == null ? undefined : num(r.item_count),
  };
}

function toPhoto(r: Row): ItemPhoto {
  return {
    id: num(r.id),
    itemId: num(r.item_id),
    fileName: str(r.file_name),
    captionEn: str(r.caption_en),
    captionAr: str(r.caption_ar),
    isPrimary: num(r.is_primary) === 1,
    orderIndex: num(r.order_index),
  };
}

function toPreviousNumber(r: Row): PreviousNumber {
  return {
    id: num(r.id),
    itemId: num(r.item_id),
    value: str(r.value),
    note: str(r.note),
    orderIndex: num(r.order_index),
  };
}

/** Separator used in the denormalised `items.previous_numbers` column. */
const PREV_SEPARATOR = '; ';

/**
 * Drop blank entries and collapse whitespace, so the form can submit empty rows
 * freely and the stored list stays clean.
 */
export function normalisePreviousNumbers(input: PreviousNumberInput[]): PreviousNumberInput[] {
  return (input ?? [])
    .map((p) => ({ value: (p.value ?? '').trim(), note: (p.note ?? '').trim() }))
    .filter((p) => p.value.length > 0);
}

function toItem(r: Row): ArchiveItem {
  return {
    id: num(r.id),
    typeId: num(r.type_id),
    accessionNo: str(r.accession_no),
    previousNumbers: [],
    previousNumbersText: str(r.previous_numbers),
    titleEn: str(r.title_en),
    titleAr: str(r.title_ar),
    descriptionEn: str(r.description_en),
    descriptionAr: str(r.description_ar),
    creatorEn: str(r.creator_en),
    creatorAr: str(r.creator_ar),
    originEn: str(r.origin_en),
    originAr: str(r.origin_ar),
    dateText: str(r.date_text),
    year: r.year == null ? null : Number(r.year),
    periodEn: str(r.period_en),
    periodAr: str(r.period_ar),
    language: str(r.language),
    condition: (str(r.condition) || 'good') as ConditionGrade,
    dimensions: str(r.dimensions),
    materialEn: str(r.material_en),
    materialAr: str(r.material_ar),
    quantity: r.quantity == null ? 1 : Number(r.quantity),
    locationEn: str(r.location_en),
    locationAr: str(r.location_ar),
    acquisitionEn: str(r.acquisition_en),
    acquisitionAr: str(r.acquisition_ar),
    acquisitionDate: str(r.acquisition_date),
    notesEn: str(r.notes_en),
    notesAr: str(r.notes_ar),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
    qrFileName: str(r.qr_file_name),
    primaryPhoto: r.primary_photo == null ? null : String(r.primary_photo),
    typeNameEn: r.type_name_en == null ? undefined : String(r.type_name_en),
    typeNameAr: r.type_name_ar == null ? undefined : String(r.type_name_ar),
    typeSlug: r.type_slug == null ? undefined : String(r.type_slug),
    categoryId: r.category_id == null ? undefined : Number(r.category_id),
    categoryNameEn: r.category_name_en == null ? undefined : String(r.category_name_en),
    categoryNameAr: r.category_name_ar == null ? undefined : String(r.category_name_ar),
    categorySlug: r.category_slug == null ? undefined : String(r.category_slug),
  };
}

/** Columns every item query selects, including the joined labels. */
const ITEM_SELECT = `
  SELECT i.*,
         t.name_en  AS type_name_en,
         t.name_ar  AS type_name_ar,
         t.slug     AS type_slug,
         c.id       AS category_id,
         c.name_en  AS category_name_en,
         c.name_ar  AS category_name_ar,
         c.slug     AS category_slug,
         (SELECT p.file_name FROM item_photos p
           WHERE p.item_id = i.id
           ORDER BY p.is_primary DESC, p.order_index ASC, p.id ASC
           LIMIT 1) AS primary_photo
    FROM items i
    JOIN material_types t ON t.id = i.type_id
    JOIN categories c     ON c.id = t.category_id
`;

/**
 * Turn user input into a safe FTS5 MATCH expression. Every token is quoted so
 * that characters with meaning in FTS syntax (", *, :, -, NEAR) are treated as
 * literal text, then given a prefix wildcard for as-you-type searching.
 */
export function toFtsQuery(input: string): string {
  const tokens = input
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/"/g, ''))
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return '';
  return tokens.map((t) => `"${t}"*`).join(' ');
}

/* ------------------------------------------------------------------ *
 * Repository
 * ------------------------------------------------------------------ */

export class ArchiveRepository {
  constructor(private db: Database.Database) {}

  /* --- Categories & types --- */

  listCategories(): Category[] {
    const rows = this.db
      .prepare(
        `SELECT c.*,
                (SELECT COUNT(*) FROM material_types t WHERE t.category_id = c.id) AS type_count,
                (SELECT COUNT(*) FROM items i
                   JOIN material_types t2 ON t2.id = i.type_id
                  WHERE t2.category_id = c.id) AS item_count
           FROM categories c
          ORDER BY c.order_index ASC`,
      )
      .all() as Row[];
    return rows.map(toCategory);
  }

  getCategory(slug: string): Category | null {
    const row = this.db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug) as
      | Row
      | undefined;
    return row ? toCategory(row) : null;
  }

  listTypes(categoryId: number): MaterialType[] {
    const rows = this.db
      .prepare(
        `SELECT t.*,
                (SELECT COUNT(*) FROM items i WHERE i.type_id = t.id) AS item_count
           FROM material_types t
          WHERE t.category_id = ?
          ORDER BY t.order_index ASC`,
      )
      .all(categoryId) as Row[];
    return rows.map(toType);
  }

  getType(slug: string): MaterialType | null {
    const row = this.db
      .prepare(
        `SELECT t.*, (SELECT COUNT(*) FROM items i WHERE i.type_id = t.id) AS item_count
           FROM material_types t WHERE t.slug = ?`,
      )
      .get(slug) as Row | undefined;
    return row ? toType(row) : null;
  }

  /* --- Items --- */

  listItems(query: ItemQuery = {}): ItemPage {
    const {
      typeId,
      categoryId,
      search = '',
      condition = '',
      sortBy = 'accession',
      sortDir = 'asc',
      limit = 100,
      offset = 0,
    } = query;

    const where: string[] = [];
    const params: Record<string, unknown> = {};

    if (typeId) {
      where.push('i.type_id = @typeId');
      params.typeId = typeId;
    }
    if (categoryId) {
      where.push('c.id = @categoryId');
      params.categoryId = categoryId;
    }
    if (condition) {
      where.push('i.condition = @condition');
      params.condition = condition;
    }

    const fts = toFtsQuery(search);
    if (fts) {
      where.push('i.id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH @fts)');
      params.fts = fts;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Whitelisted so the sort key can never be injected.
    const sortColumn = {
      accession: 'i.accession_no',
      title: 'i.title_en',
      year: 'i.year',
      updated: 'i.updated_at',
    }[sortBy];
    const dir = sortDir === 'desc' ? 'DESC' : 'ASC';

    const total = (
      this.db
        .prepare(
          `SELECT COUNT(*) AS n FROM items i
             JOIN material_types t ON t.id = i.type_id
             JOIN categories c ON c.id = t.category_id ${whereSql}`,
        )
        .get(params) as { n: number }
    ).n;

    const rows = this.db
      .prepare(
        `${ITEM_SELECT} ${whereSql}
          ORDER BY ${sortColumn} ${dir} NULLS LAST, i.id ASC
          LIMIT @limit OFFSET @offset`,
      )
      .all({ ...params, limit, offset }) as Row[];

    return { rows: rows.map(toItem), total };
  }

  getItem(id: number): ArchiveItem | null {
    const row = this.db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id) as Row | undefined;
    if (!row) return null;

    const item = toItem(row);
    item.photos = this.listPhotos(id);
    item.previousNumberRows = this.listPreviousNumbers(id);
    item.previousNumbers = item.previousNumberRows.map((p) => ({ value: p.value, note: p.note }));
    return item;
  }

  createItem(input: ItemInput): ArchiveItem {
    // The row and its previous numbers are written together, so a failure in
    // either leaves no half-catalogued record behind.
    const newId = this.db.transaction(() => {
      const accessionNo = input.accessionNo?.trim() || this.nextAccessionNo(input.typeId);

      const info = this.db
      .prepare(
        `INSERT INTO items (
           type_id, accession_no, title_en, title_ar, description_en, description_ar,
           creator_en, creator_ar, origin_en, origin_ar, date_text, year,
           period_en, period_ar, language, condition, dimensions,
           material_en, material_ar, quantity, location_en, location_ar,
           acquisition_en, acquisition_ar, acquisition_date, notes_en, notes_ar
         ) VALUES (
           @typeId, @accessionNo, @titleEn, @titleAr, @descriptionEn, @descriptionAr,
           @creatorEn, @creatorAr, @originEn, @originAr, @dateText, @year,
           @periodEn, @periodAr, @language, @condition, @dimensions,
           @materialEn, @materialAr, @quantity, @locationEn, @locationAr,
           @acquisitionEn, @acquisitionAr, @acquisitionDate, @notesEn, @notesAr
         )`,
      )
      .run(this.bindItem({ ...input, accessionNo }));

      const id = Number(info.lastInsertRowid);
      this.replacePreviousNumbers(id, input.previousNumbers);
      return id;
    })();

    return this.getItem(newId)!;
  }

  updateItem(id: number, input: ItemInput): ArchiveItem {
    this.db.transaction(() => {
      this.db
      .prepare(
        `UPDATE items SET
           type_id = @typeId, accession_no = @accessionNo,
           title_en = @titleEn, title_ar = @titleAr,
           description_en = @descriptionEn, description_ar = @descriptionAr,
           creator_en = @creatorEn, creator_ar = @creatorAr,
           origin_en = @originEn, origin_ar = @originAr,
           date_text = @dateText, year = @year,
           period_en = @periodEn, period_ar = @periodAr,
           language = @language, condition = @condition, dimensions = @dimensions,
           material_en = @materialEn, material_ar = @materialAr, quantity = @quantity,
           location_en = @locationEn, location_ar = @locationAr,
           acquisition_en = @acquisitionEn, acquisition_ar = @acquisitionAr,
           acquisition_date = @acquisitionDate,
           notes_en = @notesEn, notes_ar = @notesAr,
           updated_at = datetime('now')
         WHERE id = @id`,
      )
      .run({ ...this.bindItem(input), id });

      this.replacePreviousNumbers(id, input.previousNumbers);
    })();

    const item = this.getItem(id);
    if (!item) throw new Error(`Item ${id} not found`);
    return item;
  }

  /** Returns the media file names that the caller should unlink from disk. */
  deleteItem(id: number): string[] {
    const files = this.listPhotos(id).map((p) => p.fileName);

    const item = this.db.prepare('SELECT qr_file_name FROM items WHERE id = ?').get(id) as
      | { qr_file_name: string }
      | undefined;
    if (item?.qr_file_name) files.push(item.qr_file_name);

    this.db.prepare('DELETE FROM items WHERE id = ?').run(id);
    return files;
  }

  /* --- QR code --- */

  /**
   * Attach a QR image, returning the file name it replaced so the caller can
   * remove the old image from the media folder.
   */
  setQrImage(itemId: number, fileName: string): string {
    const previous = this.qrImage(itemId);
    this.db
      .prepare("UPDATE items SET qr_file_name = ?, updated_at = datetime('now') WHERE id = ?")
      .run(fileName, itemId);
    return previous;
  }

  /** Detach the QR image, returning the file name that is now orphaned. */
  clearQrImage(itemId: number): string {
    const previous = this.qrImage(itemId);
    this.db
      .prepare("UPDATE items SET qr_file_name = '', updated_at = datetime('now') WHERE id = ?")
      .run(itemId);
    return previous;
  }

  qrImage(itemId: number): string {
    const row = this.db.prepare('SELECT qr_file_name FROM items WHERE id = ?').get(itemId) as
      | { qr_file_name: string }
      | undefined;
    return row?.qr_file_name ?? '';
  }

  /* --- Previous numbers --- */

  listPreviousNumbers(itemId: number): PreviousNumber[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM item_previous_numbers WHERE item_id = ?
          ORDER BY order_index ASC, id ASC`,
      )
      .all(itemId) as Row[];
    return rows.map(toPreviousNumber);
  }

  /**
   * Replace an item's previous numbers wholesale — the form always submits the
   * complete list, so diffing individual rows would buy nothing.
   *
   * Writing `items.previous_numbers` in the same breath keeps the denormalised
   * copy honest and fires the FTS update trigger, which is what makes the
   * numbers searchable.
   */
  private replacePreviousNumbers(itemId: number, input: PreviousNumberInput[]): void {
    const entries = normalisePreviousNumbers(input);

    this.db.prepare('DELETE FROM item_previous_numbers WHERE item_id = ?').run(itemId);

    const insert = this.db.prepare(
      `INSERT INTO item_previous_numbers (item_id, value, note, order_index)
       VALUES (?, ?, ?, ?)`,
    );
    entries.forEach((entry, index) => insert.run(itemId, entry.value, entry.note, index));

    this.db
      .prepare('UPDATE items SET previous_numbers = ? WHERE id = ?')
      .run(entries.map((e) => e.value).join(PREV_SEPARATOR), itemId);
  }

  private bindItem(input: ItemInput): Record<string, unknown> {
    return {
      typeId: input.typeId,
      accessionNo: input.accessionNo,
      titleEn: input.titleEn ?? '',
      titleAr: input.titleAr ?? '',
      descriptionEn: input.descriptionEn ?? '',
      descriptionAr: input.descriptionAr ?? '',
      creatorEn: input.creatorEn ?? '',
      creatorAr: input.creatorAr ?? '',
      originEn: input.originEn ?? '',
      originAr: input.originAr ?? '',
      dateText: input.dateText ?? '',
      year: input.year == null || Number.isNaN(input.year) ? null : input.year,
      periodEn: input.periodEn ?? '',
      periodAr: input.periodAr ?? '',
      language: input.language ?? '',
      condition: input.condition ?? 'good',
      dimensions: input.dimensions ?? '',
      materialEn: input.materialEn ?? '',
      materialAr: input.materialAr ?? '',
      quantity: input.quantity ?? 1,
      locationEn: input.locationEn ?? '',
      locationAr: input.locationAr ?? '',
      acquisitionEn: input.acquisitionEn ?? '',
      acquisitionAr: input.acquisitionAr ?? '',
      acquisitionDate: input.acquisitionDate ?? '',
      notesEn: input.notesEn ?? '',
      notesAr: input.notesAr ?? '',
    };
  }

  /**
   * Mint the next accession number for a type, e.g. PM-MANUSCRIPTS-0007.
   * Numbering is per material type and fills gaps only at the tail, so a
   * deleted record never causes a number to be reissued while higher ones
   * exist.
   */
  nextAccessionNo(typeId: number): string {
    const row = this.db
      .prepare(
        `SELECT t.slug AS type_slug, c.slug AS category_slug
           FROM material_types t JOIN categories c ON c.id = t.category_id
          WHERE t.id = ?`,
      )
      .get(typeId) as { type_slug: string; category_slug: string } | undefined;

    if (!row) throw new Error(`Unknown material type: ${typeId}`);

    const code = CATEGORY_CODES[row.category_slug] ?? 'XX';
    const typeCode = row.type_slug.toUpperCase();
    const prefix = `${code}-${typeCode}-`;

    const last = this.db
      .prepare(
        `SELECT accession_no FROM items
          WHERE accession_no LIKE ? || '%'
          ORDER BY LENGTH(accession_no) DESC, accession_no DESC LIMIT 1`,
      )
      .get(prefix) as { accession_no: string } | undefined;

    const lastNum = last ? parseInt(last.accession_no.slice(prefix.length), 10) || 0 : 0;
    return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
  }

  /* --- Photos --- */

  listPhotos(itemId: number): ItemPhoto[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM item_photos WHERE item_id = ?
          ORDER BY is_primary DESC, order_index ASC, id ASC`,
      )
      .all(itemId) as Row[];
    return rows.map(toPhoto);
  }

  addPhoto(itemId: number, fileName: string, captionEn = '', captionAr = ''): ItemPhoto {
    const count = (
      this.db.prepare('SELECT COUNT(*) AS n FROM item_photos WHERE item_id = ?').get(itemId) as {
        n: number;
      }
    ).n;

    const info = this.db
      .prepare(
        `INSERT INTO item_photos (item_id, file_name, caption_en, caption_ar, is_primary, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(itemId, fileName, captionEn, captionAr, count === 0 ? 1 : 0, count);

    return this.listPhotos(itemId).find((p) => p.id === Number(info.lastInsertRowid))!;
  }

  /** Returns the file name so the caller can unlink it from the media folder. */
  deletePhoto(photoId: number): string | null {
    const row = this.db.prepare('SELECT * FROM item_photos WHERE id = ?').get(photoId) as
      | Row
      | undefined;
    if (!row) return null;

    const photo = toPhoto(row);
    this.db.prepare('DELETE FROM item_photos WHERE id = ?').run(photoId);

    // If the primary was removed, promote the next photo so the item keeps a
    // thumbnail in list views.
    if (photo.isPrimary) {
      const next = this.db
        .prepare('SELECT id FROM item_photos WHERE item_id = ? ORDER BY order_index, id LIMIT 1')
        .get(photo.itemId) as { id: number } | undefined;
      if (next) {
        this.db.prepare('UPDATE item_photos SET is_primary = 1 WHERE id = ?').run(next.id);
      }
    }
    return photo.fileName;
  }

  setPrimaryPhoto(photoId: number): void {
    const row = this.db.prepare('SELECT item_id FROM item_photos WHERE id = ?').get(photoId) as
      | { item_id: number }
      | undefined;
    if (!row) return;

    this.db.transaction(() => {
      this.db.prepare('UPDATE item_photos SET is_primary = 0 WHERE item_id = ?').run(row.item_id);
      this.db.prepare('UPDATE item_photos SET is_primary = 1 WHERE id = ?').run(photoId);
    })();
  }

  /* --- Dashboard --- */

  stats(): ArchiveStats {
    const one = (sql: string) => (this.db.prepare(sql).get() as { n: number }).n;

    const byCondition = this.db
      .prepare('SELECT condition, COUNT(*) AS count FROM items GROUP BY condition')
      .all() as { condition: ConditionGrade; count: number }[];

    const recent = this.db
      .prepare(`${ITEM_SELECT} ORDER BY i.updated_at DESC, i.id DESC LIMIT 6`)
      .all() as Row[];

    return {
      totalItems: one('SELECT COUNT(*) AS n FROM items'),
      totalPhotos: one('SELECT COUNT(*) AS n FROM item_photos'),
      totalCategories: one('SELECT COUNT(*) AS n FROM categories'),
      totalTypes: one('SELECT COUNT(*) AS n FROM material_types'),
      byCondition,
      recentItems: recent.map(toItem),
    };
  }

  /* --- Settings --- */

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row ? row.value : null;
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value);
  }
}
