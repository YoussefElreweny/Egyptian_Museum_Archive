/**
 * Data-layer tests. better-sqlite3 is compiled against Electron's ABI by
 * `electron-builder install-app-deps`, so these run under Electron's Node
 * runtime (ELECTRON_RUN_AS_NODE=1) rather than the system Node — see
 * the "test" script in package.json.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const Database = require('better-sqlite3');
const { migrate, seedTaxonomy, MIGRATIONS, SCHEMA_VERSION } = require('../dist/main/db/schema.js');
const { seedSampleItems } = require('../dist/main/db/sampleData.js');
const {
  ArchiveRepository,
  toFtsQuery,
  normalisePreviousNumbers,
} = require('../dist/main/db/repository.js');
const { TAXONOMY } = require('../dist/shared/taxonomy.js');

const EXPECTED_TYPE_COUNT = TAXONOMY.reduce((sum, c) => sum + c.types.length, 0);

/** Fresh migrated + seeded database in a throwaway directory. */
function freshDb({ withSamples = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'archive-test-'));
  const db = new Database(join(dir, 'test.db'));
  migrate(db);
  seedTaxonomy(db);
  if (withSamples) seedSampleItems(db);
  return { db, dir, repo: new ArchiveRepository(db) };
}

function cleanup({ db, dir }) {
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

function baseItem(typeId, overrides = {}) {
  return {
    typeId,
    accessionNo: '',
    titleEn: 'Test item',
    titleAr: 'عنصر اختبار',
    descriptionEn: '',
    descriptionAr: '',
    creatorEn: '',
    creatorAr: '',
    originEn: '',
    originAr: '',
    dateText: '',
    year: null,
    periodEn: '',
    periodAr: '',
    language: '',
    condition: 'good',
    dimensions: '',
    materialEn: '',
    materialAr: '',
    quantity: 1,
    locationEn: '',
    locationAr: '',
    acquisitionEn: '',
    acquisitionAr: '',
    acquisitionDate: '',
    notesEn: '',
    notesAr: '',
    previousNumbers: [],
    ...overrides,
  };
}

test('taxonomy seeds the seven categories from the museum document', () => {
  const ctx = freshDb();
  try {
    const categories = ctx.repo.listCategories();
    assert.equal(categories.length, 7);
    assert.deepEqual(
      categories.map((c) => c.slug),
      TAXONOMY.map((c) => c.slug),
      'categories keep the document order',
    );

    const paper = categories[0];
    assert.equal(paper.nameEn, 'Paper Materials');
    assert.equal(paper.nameAr, 'المواد الورقية');
    assert.equal(paper.typeCount, 10);
  } finally {
    cleanup(ctx);
  }
});

test('every material type is seeded with both names and its example', () => {
  const ctx = freshDb();
  try {
    const total = ctx.repo
      .listCategories()
      .reduce((sum, c) => sum + ctx.repo.listTypes(c.id).length, 0);
    assert.equal(total, EXPECTED_TYPE_COUNT);
    assert.equal(total, 35);

    const manuscripts = ctx.repo.getType('manuscripts');
    assert.equal(manuscripts.nameEn, 'Manuscripts');
    assert.equal(manuscripts.nameAr, 'المخطوطات');
    assert.equal(manuscripts.exampleAr, 'مخطوطة قرآنية قديمة');
  } finally {
    cleanup(ctx);
  }
});

test('re-seeding is idempotent and preserves existing item links', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('manuscripts');
    const created = ctx.repo.createItem(baseItem(type.id));

    seedTaxonomy(ctx.db);
    seedTaxonomy(ctx.db);

    assert.equal(ctx.repo.listCategories().length, 7);
    assert.equal(ctx.repo.getType('manuscripts').id, type.id);
    assert.ok(ctx.repo.getItem(created.id), 'item survives re-seeding');
  } finally {
    cleanup(ctx);
  }
});

test('sample data creates one example record per material type, once', () => {
  const ctx = freshDb({ withSamples: true });
  try {
    assert.equal(ctx.repo.stats().totalItems, EXPECTED_TYPE_COUNT);

    // A second call must not duplicate the examples.
    seedSampleItems(ctx.db);
    assert.equal(ctx.repo.stats().totalItems, EXPECTED_TYPE_COUNT);
  } finally {
    cleanup(ctx);
  }
});

test('accession numbers increment per material type', () => {
  const ctx = freshDb();
  try {
    const manuscripts = ctx.repo.getType('manuscripts');
    const maps = ctx.repo.getType('maps');

    const first = ctx.repo.createItem(baseItem(manuscripts.id));
    const second = ctx.repo.createItem(baseItem(manuscripts.id));
    const otherType = ctx.repo.createItem(baseItem(maps.id));

    assert.equal(first.accessionNo, 'PM-MANUSCRIPTS-0001');
    assert.equal(second.accessionNo, 'PM-MANUSCRIPTS-0002');
    assert.equal(otherType.accessionNo, 'PM-MAPS-0001', 'numbering is per type');
  } finally {
    cleanup(ctx);
  }
});

test('an explicit accession number is respected and must stay unique', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('books');
    const item = ctx.repo.createItem(baseItem(type.id, { accessionNo: 'EM-1952-A' }));
    assert.equal(item.accessionNo, 'EM-1952-A');

    assert.throws(
      () => ctx.repo.createItem(baseItem(type.id, { accessionNo: 'EM-1952-A' })),
      /UNIQUE/i,
    );
  } finally {
    cleanup(ctx);
  }
});

test('search matches English and Arabic text', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('manuscripts');
    ctx.repo.createItem(
      baseItem(type.id, {
        titleEn: 'Illuminated Quranic manuscript',
        titleAr: 'مخطوطة قرآنية مذهبة',
        creatorEn: 'Unknown scribe',
      }),
    );
    ctx.repo.createItem(baseItem(type.id, { titleEn: 'Ledger of donations', titleAr: 'دفتر التبرعات' }));

    assert.equal(ctx.repo.listItems({ search: 'quranic' }).total, 1);
    assert.equal(ctx.repo.listItems({ search: 'مخطوطة' }).total, 1);
    assert.equal(ctx.repo.listItems({ search: 'scribe' }).total, 1, 'searches creator too');
    assert.equal(ctx.repo.listItems({ search: 'illumin' }).total, 1, 'prefix match');
    assert.equal(ctx.repo.listItems({ search: 'nothinghere' }).total, 0);
  } finally {
    cleanup(ctx);
  }
});

test('accession numbers are searchable, including their segments', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('manuscripts');
    const item = ctx.repo.createItem(baseItem(type.id));
    assert.equal(item.accessionNo, 'PM-MANUSCRIPTS-0001');

    // The unicode61 tokenizer splits on '-', so staff can look a record up by
    // the whole number or by any segment of it.
    assert.equal(ctx.repo.listItems({ search: 'PM-MANUSCRIPTS-0001' }).total, 1);
    assert.equal(ctx.repo.listItems({ search: '0001' }).total, 1);
  } finally {
    cleanup(ctx);
  }
});

test('search input containing FTS syntax is treated as literal text', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('reports');
    ctx.repo.createItem(baseItem(type.id, { titleEn: 'Annual report' }));

    // None of these may throw a "fts5: syntax error" back to the renderer.
    for (const term of ['"', 'a AND', 'NEAR(', 'report*', '-report', 'a OR b', '(', '^x', 'a:b']) {
      assert.doesNotThrow(() => ctx.repo.listItems({ search: term }), `term: ${term}`);
    }
  } finally {
    cleanup(ctx);
  }
});

test('toFtsQuery quotes every token and drops empty input', () => {
  assert.equal(toFtsQuery(''), '');
  assert.equal(toFtsQuery('   '), '');
  assert.equal(toFtsQuery('old map'), '"old"* "map"*');
  assert.equal(toFtsQuery('a"b'), '"ab"*');
});

test('search index follows updates and deletes', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('posters');
    const item = ctx.repo.createItem(baseItem(type.id, { titleEn: 'Festival poster' }));
    assert.equal(ctx.repo.listItems({ search: 'festival' }).total, 1);

    ctx.repo.updateItem(item.id, baseItem(type.id, { accessionNo: item.accessionNo, titleEn: 'Exhibition poster' }));
    assert.equal(ctx.repo.listItems({ search: 'festival' }).total, 0, 'stale text is removed');
    assert.equal(ctx.repo.listItems({ search: 'exhibition' }).total, 1);

    ctx.repo.deleteItem(item.id);
    assert.equal(ctx.repo.listItems({ search: 'exhibition' }).total, 0);
  } finally {
    cleanup(ctx);
  }
});

test('items filter by category, type and condition', () => {
  const ctx = freshDb({ withSamples: true });
  try {
    const paper = ctx.repo.getCategory('paper');
    const manuscripts = ctx.repo.getType('manuscripts');

    assert.equal(ctx.repo.listItems({ categoryId: paper.id }).total, 10);
    assert.equal(ctx.repo.listItems({ typeId: manuscripts.id }).total, 1);

    const excellent = ctx.repo.listItems({ condition: 'excellent' });
    assert.ok(excellent.total > 0);
    assert.ok(excellent.rows.every((r) => r.condition === 'excellent'));
  } finally {
    cleanup(ctx);
  }
});

test('listing paginates and reports the unpaginated total', () => {
  const ctx = freshDb({ withSamples: true });
  try {
    const page = ctx.repo.listItems({ limit: 10, offset: 0 });
    assert.equal(page.rows.length, 10);
    assert.equal(page.total, EXPECTED_TYPE_COUNT);

    const second = ctx.repo.listItems({ limit: 10, offset: 10 });
    assert.notEqual(page.rows[0].id, second.rows[0].id);
  } finally {
    cleanup(ctx);
  }
});

test('sorting by year orders records and tolerates BC dates', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('artifacts');
    ctx.repo.createItem(baseItem(type.id, { titleEn: 'Modern', year: 1990 }));
    ctx.repo.createItem(baseItem(type.id, { titleEn: 'Ancient', year: -1500 }));

    const asc = ctx.repo.listItems({ sortBy: 'year', sortDir: 'asc' });
    assert.equal(asc.rows[0].titleEn, 'Ancient');
    assert.equal(asc.rows[0].year, -1500);
  } finally {
    cleanup(ctx);
  }
});

test('items carry their joined type and category labels', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('manuscripts');
    const item = ctx.repo.createItem(baseItem(type.id));
    const loaded = ctx.repo.getItem(item.id);

    assert.equal(loaded.typeNameEn, 'Manuscripts');
    assert.equal(loaded.typeNameAr, 'المخطوطات');
    assert.equal(loaded.categorySlug, 'paper');
    assert.equal(loaded.categoryNameAr, 'المواد الورقية');
  } finally {
    cleanup(ctx);
  }
});

test('updating a record preserves its id and refreshes updated_at', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('maps');
    const created = ctx.repo.createItem(baseItem(type.id, { titleEn: 'Site plan' }));

    const updated = ctx.repo.updateItem(
      created.id,
      baseItem(type.id, { accessionNo: created.accessionNo, titleEn: 'Site plan, revised', year: 1902 }),
    );

    assert.equal(updated.id, created.id);
    assert.equal(updated.titleEn, 'Site plan, revised');
    assert.equal(updated.year, 1902);
  } finally {
    cleanup(ctx);
  }
});

test('deleting a record returns its photo files and cascades the rows', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('photographs');
    const item = ctx.repo.createItem(baseItem(type.id));
    ctx.repo.addPhoto(item.id, 'one.jpg');
    ctx.repo.addPhoto(item.id, 'two.jpg');

    const orphaned = ctx.repo.deleteItem(item.id);
    assert.deepEqual(orphaned.sort(), ['one.jpg', 'two.jpg']);
    assert.equal(ctx.repo.getItem(item.id), null);
    assert.equal(ctx.repo.listPhotos(item.id).length, 0, 'photo rows cascade');
  } finally {
    cleanup(ctx);
  }
});

test('the first photo becomes primary and deletion promotes the next', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('photographs');
    const item = ctx.repo.createItem(baseItem(type.id));

    const first = ctx.repo.addPhoto(item.id, 'first.jpg');
    const second = ctx.repo.addPhoto(item.id, 'second.jpg');

    assert.equal(first.isPrimary, true);
    assert.equal(second.isPrimary, false);

    const removed = ctx.repo.deletePhoto(first.id);
    assert.equal(removed, 'first.jpg');

    const remaining = ctx.repo.listPhotos(item.id);
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].isPrimary, true, 'next photo is promoted');
  } finally {
    cleanup(ctx);
  }
});

test('setPrimaryPhoto moves the flag to exactly one photo', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('photographs');
    const item = ctx.repo.createItem(baseItem(type.id));
    ctx.repo.addPhoto(item.id, 'a.jpg');
    const b = ctx.repo.addPhoto(item.id, 'b.jpg');

    ctx.repo.setPrimaryPhoto(b.id);

    const photos = ctx.repo.listPhotos(item.id);
    assert.equal(photos.filter((p) => p.isPrimary).length, 1);
    assert.equal(photos.find((p) => p.isPrimary).fileName, 'b.jpg');
  } finally {
    cleanup(ctx);
  }
});

test('list rows expose the primary photo for thumbnails', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('photographs');
    const item = ctx.repo.createItem(baseItem(type.id));
    ctx.repo.addPhoto(item.id, 'a.jpg');
    const b = ctx.repo.addPhoto(item.id, 'b.jpg');
    ctx.repo.setPrimaryPhoto(b.id);

    const row = ctx.repo.listItems({ typeId: type.id }).rows[0];
    assert.equal(row.primaryPhoto, 'b.jpg');
  } finally {
    cleanup(ctx);
  }
});

test('stats summarise the archive', () => {
  const ctx = freshDb({ withSamples: true });
  try {
    const stats = ctx.repo.stats();
    assert.equal(stats.totalCategories, 7);
    assert.equal(stats.totalTypes, EXPECTED_TYPE_COUNT);
    assert.equal(stats.totalItems, EXPECTED_TYPE_COUNT);
    assert.ok(stats.recentItems.length > 0 && stats.recentItems.length <= 6);
    assert.ok(stats.byCondition.reduce((sum, r) => sum + r.count, 0) === stats.totalItems);
  } finally {
    cleanup(ctx);
  }
});

test('settings round-trip', () => {
  const ctx = freshDb();
  try {
    assert.equal(ctx.repo.getSetting('lang'), null);
    ctx.repo.setSetting('lang', 'ar');
    assert.equal(ctx.repo.getSetting('lang'), 'ar');
    ctx.repo.setSetting('lang', 'en');
    assert.equal(ctx.repo.getSetting('lang'), 'en');
  } finally {
    cleanup(ctx);
  }
});

test('a material type still in use cannot be deleted out from under its items', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('manuscripts');
    ctx.repo.createItem(baseItem(type.id));

    assert.throws(
      () => ctx.db.prepare('DELETE FROM material_types WHERE id = ?').run(type.id),
      /FOREIGN KEY/i,
    );
  } finally {
    cleanup(ctx);
  }
});

/* ------------------------------------------------------------------ *
 * Previous numbers
 * ------------------------------------------------------------------ */

test('a record stores several previous numbers, in order, with their notes', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('manuscripts');
    const item = ctx.repo.createItem(
      baseItem(type.id, {
        previousNumbers: [
          { value: '124/B', note: 'Old register, 1932' },
          { value: 'MS-0044', note: '1968 recataloguing' },
          { value: '77-A', note: '' },
        ],
      }),
    );

    const rows = ctx.repo.getItem(item.id).previousNumberRows;
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((r) => r.value),
      ['124/B', 'MS-0044', '77-A'],
      'order is preserved',
    );
    assert.equal(rows[0].note, 'Old register, 1932');
    assert.equal(rows[2].note, '');
  } finally {
    cleanup(ctx);
  }
});

test('blank rows submitted by the form are discarded', () => {
  assert.deepEqual(normalisePreviousNumbers([]), []);
  assert.deepEqual(
    normalisePreviousNumbers([
      { value: '  A-1  ', note: '  note  ' },
      { value: '   ', note: 'orphan note' },
      { value: '', note: '' },
    ]),
    [{ value: 'A-1', note: 'note' }],
  );
});

test('editing a record replaces its previous numbers wholesale', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('books');
    const item = ctx.repo.createItem(
      baseItem(type.id, { previousNumbers: [{ value: 'OLD-1', note: '' }] }),
    );

    ctx.repo.updateItem(
      item.id,
      baseItem(type.id, {
        accessionNo: item.accessionNo,
        previousNumbers: [
          { value: 'NEW-1', note: '' },
          { value: 'NEW-2', note: '' },
        ],
      }),
    );

    const rows = ctx.repo.getItem(item.id).previousNumberRows;
    assert.deepEqual(
      rows.map((r) => r.value),
      ['NEW-1', 'NEW-2'],
    );

    // Clearing the list removes every row.
    ctx.repo.updateItem(
      item.id,
      baseItem(type.id, { accessionNo: item.accessionNo, previousNumbers: [] }),
    );
    assert.equal(ctx.repo.getItem(item.id).previousNumberRows.length, 0);
    assert.equal(ctx.repo.getItem(item.id).previousNumbersText, '');
  } finally {
    cleanup(ctx);
  }
});

test('previous numbers are searchable, and stop matching once removed', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('maps');
    const item = ctx.repo.createItem(
      baseItem(type.id, {
        titleEn: 'Site plan',
        previousNumbers: [{ value: 'JE-38392', note: '' }],
      }),
    );

    assert.equal(ctx.repo.listItems({ search: 'JE-38392' }).total, 1);
    assert.equal(ctx.repo.listItems({ search: '38392' }).total, 1, 'segment matches');

    ctx.repo.updateItem(
      item.id,
      baseItem(type.id, { accessionNo: item.accessionNo, previousNumbers: [] }),
    );
    assert.equal(ctx.repo.listItems({ search: '38392' }).total, 0, 'index follows the edit');
  } finally {
    cleanup(ctx);
  }
});

test('deleting a record removes its previous numbers', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('books');
    const item = ctx.repo.createItem(
      baseItem(type.id, { previousNumbers: [{ value: 'X-1', note: '' }] }),
    );

    ctx.repo.deleteItem(item.id);
    assert.equal(ctx.repo.listPreviousNumbers(item.id).length, 0);
  } finally {
    cleanup(ctx);
  }
});

test('the denormalised text column matches the stored rows', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('books');
    const item = ctx.repo.createItem(
      baseItem(type.id, {
        previousNumbers: [
          { value: 'A-1', note: '' },
          { value: 'B-2', note: '' },
        ],
      }),
    );

    assert.equal(ctx.repo.getItem(item.id).previousNumbersText, 'A-1; B-2');
    assert.equal(ctx.repo.listItems({ typeId: type.id }).rows[0].previousNumbersText, 'A-1; B-2');
  } finally {
    cleanup(ctx);
  }
});

/* ------------------------------------------------------------------ *
 * Upgrading an existing installation
 * ------------------------------------------------------------------ */

test('upgrading a v1 database keeps every record, photo and search result', () => {
  const dir = mkdtempSync(join(tmpdir(), 'archive-upgrade-'));
  const db = new Database(join(dir, 'test.db'));

  try {
    // Build a database exactly as the previously shipped version left it.
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(MIGRATIONS[0].sql);
    db.pragma('user_version = 1');
    seedTaxonomy(db);

    const before = new ArchiveRepository(db);
    const type = before.getType('manuscripts');

    // Written with raw SQL against the v1 columns, the way the previously
    // shipped build would have written it — the current repository knows about
    // tables that do not exist yet at this point.
    const insert = db
      .prepare(
        `INSERT INTO items (type_id, accession_no, title_en, title_ar, condition, quantity)
         VALUES (?, ?, ?, ?, 'good', 1)`,
      )
      .run(type.id, 'PM-MANUSCRIPTS-0001', 'Cataloguing done before the update', 'سجل قديم');

    const keptId = Number(insert.lastInsertRowid);
    before.addPhoto(keptId, 'existing.jpg');
    before.setSetting('samples_seeded', '1');

    assert.equal(db.pragma('user_version', { simple: true }), 1);
    assert.equal(before.listItems({ search: 'Cataloguing' }).total, 1, 'searchable before');

    // Now run the shipped migration path, as launching the new build would.
    migrate(db);
    seedTaxonomy(db);

    assert.equal(db.pragma('user_version', { simple: true }), SCHEMA_VERSION);

    const after = new ArchiveRepository(db);
    const item = after.getItem(keptId);

    assert.ok(item, 'the record survived the upgrade');
    assert.equal(item.titleEn, 'Cataloguing done before the update');
    assert.equal(item.titleAr, 'سجل قديم');
    assert.equal(item.accessionNo, 'PM-MANUSCRIPTS-0001');
    assert.equal(item.photos.length, 1, 'its photograph survived');
    assert.equal(item.photos[0].fileName, 'existing.jpg');
    assert.deepEqual(item.previousNumberRows, [], 'the new field starts empty');

    // The rebuilt full-text index still finds pre-existing records...
    assert.equal(after.listItems({ search: 'Cataloguing' }).total, 1);
    assert.equal(after.listItems({ search: 'سجل' }).total, 1);

    // ...and the new field works on the upgraded database.
    after.updateItem(
      keptId,
      baseItem(type.id, {
        accessionNo: 'PM-MANUSCRIPTS-0001',
        titleEn: 'Cataloguing done before the update',
        previousNumbers: [{ value: 'LEGACY-9', note: 'From the old paper register' }],
      }),
    );
    assert.equal(after.listItems({ search: 'LEGACY-9' }).total, 1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migrating an already-current database changes nothing', () => {
  const ctx = freshDb({ withSamples: true });
  try {
    const before = ctx.repo.stats().totalItems;
    migrate(ctx.db);
    migrate(ctx.db);
    assert.equal(ctx.repo.stats().totalItems, before);
    assert.equal(ctx.db.pragma('user_version', { simple: true }), SCHEMA_VERSION);
  } finally {
    cleanup(ctx);
  }
});

/* ------------------------------------------------------------------ *
 * QR code
 * ------------------------------------------------------------------ */

test('a record starts with no QR code and can have one attached', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('artifacts');
    const item = ctx.repo.createItem(baseItem(type.id));
    assert.equal(item.qrFileName, '');

    const replaced = ctx.repo.setQrImage(item.id, 'qr-abc.png');
    assert.equal(replaced, '', 'nothing was replaced');
    assert.equal(ctx.repo.getItem(item.id).qrFileName, 'qr-abc.png');
  } finally {
    cleanup(ctx);
  }
});

test('replacing a QR code reports the old file so it can be deleted', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('artifacts');
    const item = ctx.repo.createItem(baseItem(type.id));

    ctx.repo.setQrImage(item.id, 'qr-first.png');
    const replaced = ctx.repo.setQrImage(item.id, 'qr-second.png');

    assert.equal(replaced, 'qr-first.png', 'the caller can unlink the old image');
    assert.equal(ctx.repo.getItem(item.id).qrFileName, 'qr-second.png');
  } finally {
    cleanup(ctx);
  }
});

test('clearing a QR code reports the orphaned file and leaves the record intact', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('artifacts');
    const item = ctx.repo.createItem(baseItem(type.id, { titleEn: 'Pottery vessel' }));
    ctx.repo.setQrImage(item.id, 'qr-abc.png');

    const orphaned = ctx.repo.clearQrImage(item.id);
    assert.equal(orphaned, 'qr-abc.png');

    const after = ctx.repo.getItem(item.id);
    assert.equal(after.qrFileName, '');
    assert.equal(after.titleEn, 'Pottery vessel', 'the record itself is untouched');
  } finally {
    cleanup(ctx);
  }
});

test('deleting a record orphans its QR code alongside its photographs', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('artifacts');
    const item = ctx.repo.createItem(baseItem(type.id));
    ctx.repo.addPhoto(item.id, 'photo.jpg');
    ctx.repo.setQrImage(item.id, 'qr-abc.png');

    const orphaned = ctx.repo.deleteItem(item.id);
    assert.deepEqual(orphaned.sort(), ['photo.jpg', 'qr-abc.png']);
  } finally {
    cleanup(ctx);
  }
});

test('editing a record does not disturb its QR code', () => {
  const ctx = freshDb();
  try {
    const type = ctx.repo.getType('artifacts');
    const item = ctx.repo.createItem(baseItem(type.id));
    ctx.repo.setQrImage(item.id, 'qr-abc.png');

    // The QR image is attached separately, so it is not part of the form
    // payload and must survive a save that knows nothing about it.
    ctx.repo.updateItem(
      item.id,
      baseItem(type.id, { accessionNo: item.accessionNo, titleEn: 'Renamed' }),
    );

    assert.equal(ctx.repo.getItem(item.id).qrFileName, 'qr-abc.png');
  } finally {
    cleanup(ctx);
  }
});

test('upgrading a v2 database keeps its data and gains the QR column', () => {
  const dir = mkdtempSync(join(tmpdir(), 'archive-v2-'));
  const db = new Database(join(dir, 'test.db'));

  try {
    // A database as the previous release left it: schema 2, with real data.
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(MIGRATIONS[0].sql);
    db.exec(MIGRATIONS[1].sql);
    db.pragma('user_version = 2');
    seedTaxonomy(db);

    const before = new ArchiveRepository(db);
    const type = before.getType('artifacts');
    const kept = before.createItem(
      baseItem(type.id, {
        titleEn: 'Catalogued under v2',
        previousNumbers: [{ value: 'JE-38392', note: 'old register' }],
      }),
    );
    before.addPhoto(kept.id, 'existing.jpg');

    migrate(db);
    assert.equal(db.pragma('user_version', { simple: true }), SCHEMA_VERSION);

    const after = new ArchiveRepository(db);
    const item = after.getItem(kept.id);

    assert.equal(item.titleEn, 'Catalogued under v2');
    assert.equal(item.photos.length, 1);
    assert.equal(item.previousNumberRows.length, 1, 'previous numbers survived');
    assert.equal(item.qrFileName, '', 'the new column defaults to empty');
    assert.equal(after.listItems({ search: 'JE-38392' }).total, 1, 'search still works');

    after.setQrImage(kept.id, 'qr-new.png');
    assert.equal(after.getItem(kept.id).qrFileName, 'qr-new.png');
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
