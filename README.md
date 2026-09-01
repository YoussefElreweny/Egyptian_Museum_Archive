# Egyptian Museum Archive

A bilingual (English / Arabic) desktop application for the Archive Department of
the Egyptian Museum, Tahrir. It catalogues archival holdings according to the
department's own classification document — seven categories of archival material
covering thirty-five material types.

## Navigation

The application is built around four levels, each one drilling into the last:

```
Home                 Seven category cards (Paper Materials, Photographic … )
  └── Category       The material types inside it, with the department's example
        └── Type     A numbered table of catalogued records (1, 2, 3 …)
              └── Item   The full catalogue record: photographs and metadata
```

A global search box in the header cuts across all four levels, and a language
button switches the entire interface — including layout direction — between
English and Arabic.

## The classification

| # | Category | الفئة | Types |
|---|----------|-------|-------|
| 1 | Paper Materials | المواد الورقية | 10 |
| 2 | Photographic and Visual Materials | المواد الفوتوغرافية والبصرية | 5 |
| 3 | Audio Materials | المواد السمعية | 3 |
| 4 | Audio-Visual Materials | المواد السمعية البصرية | 3 |
| 5 | Digital and Electronic Materials | المواد الرقمية والإلكترونية | 6 |
| 6 | Artistic and Special Materials | المواد الفنية والخاصة | 5 |
| 7 | Three-Dimensional Materials | المواد ثلاثية الأبعاد | 3 |

The taxonomy lives in `src/shared/taxonomy.ts`. It is the single source of
truth: the database is seeded from it and re-synced on every launch, so
correcting a name or example there corrects it throughout the application.
Re-syncing never deletes a category or type, so catalogued records can't be
orphaned by an edit to the taxonomy.

## Features

- **Bilingual records, not just a bilingual interface.** Every catalogue field
  is stored in both languages (`title_en` / `title_ar` and so on). Switching
  language switches the record content too, falling back to the other language
  where a translation hasn't been entered yet.
- **Right-to-left layout.** Arabic mode mirrors the whole interface. Latin
  values such as `24 × 17 cm, 312 folios` are isolated with `<bdi>` so they keep
  their character order without breaking alignment.
- **Full cataloguing.** Add, edit and delete records across 27 metadata fields —
  identification, description, physical details, provenance and storage.
- **Photographs.** Attach multiple images per record; the app copies them into
  its own media folder so the archive stays self-contained. One is designated
  the main image and appears as the thumbnail in list views.
- **Accession numbers.** Generated per material type in the form
  `PM-MANUSCRIPTS-0001`, or entered by hand when the department already has a
  number for the object.
- **Previous numbers.** A record can carry any number of earlier catalogue
  numbers, each with a note saying where it came from ("Old register, 1932").
  They are searchable, shown in the record list, and included in CSV exports.
- **Search.** SQLite FTS5 across titles, descriptions, creators, origins, notes,
  accession numbers and previous numbers, in both languages, with prefix
  matching.
- **Export and backup.** Any filtered list exports to CSV (UTF-8 with BOM, so
  Excel on Windows renders Arabic correctly), and the database can be backed up
  to a single file at any time.
- **Printing.** The catalogue record page is print-styled for a clean paper
  copy.

## Architecture

```
src/
├── shared/          Types, IPC channel names, and the taxonomy.
│                    Imported by all three processes; no Node or DOM imports.
├── main/            Electron main process — owns the database and the filesystem.
│   ├── main.ts      Window, menu, and the archive-media:// protocol handler.
│   ├── ipc.ts       Request handlers; every one returns a Result envelope.
│   └── db/
│       ├── schema.ts       Migrations, FTS5 triggers, taxonomy seeding.
│       ├── repository.ts   All SQL. The only place queries are written.
│       ├── sampleData.ts   Example records, seeded once on a new database.
│       └── index.ts        Connection lifecycle.
├── preload/         contextBridge surface. Unwraps Result into resolve/reject.
└── renderer/        React UI. Reaches the database only through window.archive.
    ├── i18n/        Translation dictionary and the language context.
    ├── components/  AppShell, ItemForm, PhotoGallery, shared UI.
    └── pages/       The four navigation levels, plus search.
```

**Process boundaries.** The renderer runs with `contextIsolation` and without
Node integration; it never touches SQLite or the filesystem directly. Everything
goes through the typed preload bridge. Main-process handlers wrap results in a
`Result<T>` envelope so a failed query arrives as data rather than an unhandled
rejection, and the preload layer converts that back into a normal promise
rejection for the UI.

**Photographs** are served over a dedicated `archive-media://` scheme rather
than `file://`, with the handler confining reads to the media directory — a
request that tries to escape it with `..` gets a 403.

**Search input** is escaped before it reaches FTS5: each token is quoted and
given a prefix wildcard, so characters with meaning in FTS syntax (`"`, `*`,
`NEAR`, `-`) are treated as literal text and can't produce a syntax error.

## Releasing

`.github/workflows/build.yml` builds the Windows and macOS installers on GitHub's
own runners, so no local Windows machine is needed. Each run typechecks, runs the
test suite, and only then packages.

To cut a release:

```bash
npm version 1.1.0 -m 'Release %s'   # bumps package.json and tags
git push --follow-tags
```

The tag triggers the workflow; when it finishes, the installers are attached to
the GitHub Release for that tag, ready to hand to the department.

To test a build without releasing, run the workflow manually from the repository's
**Actions** tab — the installers appear as downloadable artifacts on the run,
kept for 30 days, and no release is created.

### Code signing

Neither installer is code-signed. Windows SmartScreen will warn on first run
("Windows protected your PC" — *More info* → *Run anyway*), and macOS requires
right-click → *Open*. Signing needs paid certificates: an Authenticode
certificate for Windows, an Apple Developer ID plus notarisation for macOS. If
the museum's IT policy blocks unsigned installers, that is the fix. Both are
configured through electron-builder once the certificates exist.

## Updating an installed copy

The database lives outside the application, so installing a newer build over an
older one keeps every record and photograph. Schema changes are handled by
numbered migrations in `src/main/db/schema.ts`: on launch the app compares the
database's `user_version` against the migrations it ships with and applies only
the missing ones, inside a transaction each.

Adding the previous-numbers field, for instance, was migration 2 — an existing
v1 database gains the new table and a rebuilt search index without losing
anything. That path is covered by a test (*"upgrading a v1 database keeps every
record, photo and search result"*), so the guarantee is checked rather than
assumed.

Advise the department to use **Back up database** before an update anyway. It is
one click and copies the whole catalogue to a file of their choosing.

## Data location

The database and photographs live outside the application folder, so
reinstalling or upgrading the app never touches the archive:

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\egyptian-museum-archive\archive-data\` |
| macOS | `~/Library/Application Support/egyptian-museum-archive/archive-data/` |
| Linux | `~/.config/egyptian-museum-archive/archive-data/` |

That folder holds `archive.db` and a `media/` directory. **Back up the whole
folder** — the database alone doesn't contain the images. The *Data folder* link
in the application footer opens it directly.

## Development

```bash
npm install        # also rebuilds better-sqlite3 against Electron's ABI
npm run dev        # Vite dev server + Electron with hot reload
npm run typecheck  # both tsconfigs
npm test           # data-layer tests
npm run build      # compile main, preload and renderer into dist/
```

### Packaging

`npm run dist` builds for whichever platform you are on. To be explicit:

| Command | Output | Must run on |
|---------|--------|-------------|
| `npm run dist:win` | `release/EgyptianMuseumArchive-Setup-1.0.0.exe` | Windows |
| `npm run dist:mac` | `release/Egyptian Museum Archive-1.0.0.dmg` | macOS |
| `npm run dist:linux` | `release/Egyptian Museum Archive-1.0.0.AppImage` | Linux |

Each target must be built on its own platform: electron-builder needs the
platform's native tooling, and the app contains a native SQLite module that has
to be compiled for the target. If you do not have a machine for a given
platform, use the release workflow below — GitHub builds each one on its own
runner.

The Windows build is an NSIS installer that lets the user choose the install
directory and creates desktop and Start Menu shortcuts.

The macOS build is **unsigned** (`identity: null`), which is fine for testing
but means Gatekeeper will refuse to open it on first launch. Right-click the
app and choose *Open*, then confirm. Distributing it properly to other Macs
would need an Apple Developer ID certificate and notarisation.

### Tests

`npm test` runs the data-layer suite: taxonomy seeding, accession numbering,
FTS escaping and index maintenance, filtering, pagination, photo primary-image
promotion, and foreign-key protection of in-use material types.

`better-sqlite3` is compiled against Electron's ABI by
`electron-builder install-app-deps`, so the suite runs under Electron's Node
runtime (`ELECTRON_RUN_AS_NODE=1`) rather than the system Node. Running
`node --test` directly will fail to load the native module.

## First run

A new database is seeded with one example record per material type, taken from
the examples in the department's classification document. They are marked as
example records in their notes and can be edited or deleted as real cataloguing
begins. The seeding runs only on a brand-new database, so it can never overwrite
real work.
