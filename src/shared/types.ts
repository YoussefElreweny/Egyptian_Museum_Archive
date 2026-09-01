/**
 * Shared domain types. Imported by the Electron main process, the preload
 * bridge and the React renderer, so this file must stay free of any
 * Node- or DOM-specific imports.
 */

export type Lang = 'en' | 'ar';

/** One of the seven top-level archive material categories. */
export interface Category {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  /** Arabic ordinal used by the source document: أولاً، ثانياً ... */
  ordinalAr: string;
  icon: string;
  orderIndex: number;
  /** Populated by listCategories() for the home screen counters. */
  typeCount?: number;
  itemCount?: number;
}

/** A material type inside a category, e.g. Manuscripts inside Paper Materials. */
export interface MaterialType {
  id: number;
  categoryId: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  /** The illustrative example given in the museum's source document. */
  exampleEn: string;
  exampleAr: string;
  orderIndex: number;
  itemCount?: number;
}

/** A photograph attached to an archive item. */
export interface ItemPhoto {
  id: number;
  itemId: number;
  /** File name relative to the media directory, e.g. "a1b2c3.jpg". */
  fileName: string;
  captionEn: string;
  captionAr: string;
  isPrimary: boolean;
  orderIndex: number;
}

export type ConditionGrade = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * A number this object was catalogued under before the current system — an
 * earlier register, a previous registrar's numbering, a transferred collection.
 * A record can carry several, so they are kept as rows rather than one field.
 */
export interface PreviousNumber {
  id: number;
  itemId: number;
  value: string;
  /** Where the number came from, e.g. "Old register, 1975". */
  note: string;
  orderIndex: number;
}

/** What the form submits: the stored rows are replaced with this list. */
export interface PreviousNumberInput {
  value: string;
  note: string;
}

/** A single catalogued object in the archive. */
export interface ArchiveItem {
  id: number;
  typeId: number;
  /** Museum accession / registration number, unique across the archive. */
  accessionNo: string;
  previousNumbers: PreviousNumberInput[];
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  creatorEn: string;
  creatorAr: string;
  originEn: string;
  originAr: string;
  /** Free text so imprecise dates such as "circa 1920" remain expressible. */
  dateText: string;
  /** Numeric year used for sorting and range filters; null when unknown. */
  year: number | null;
  periodEn: string;
  periodAr: string;
  language: string;
  condition: ConditionGrade;
  dimensions: string;
  materialEn: string;
  materialAr: string;
  quantity: number;
  /** Physical shelf/box location inside the archive store. */
  locationEn: string;
  locationAr: string;
  acquisitionEn: string;
  acquisitionAr: string;
  acquisitionDate: string;
  notesEn: string;
  notesAr: string;
  createdAt: string;
  updatedAt: string;
  /**
   * File name of the QR code image in the media folder, or '' when none is
   * attached. The department generates these externally; the app only stores
   * and displays the image.
   */
  qrFileName: string;
  photos?: ItemPhoto[];
  /** The stored rows, with ids; present on getItem, absent on list queries. */
  previousNumberRows?: PreviousNumber[];
  /** Denormalised "1234; 5678" copy, always present, used by lists and search. */
  previousNumbersText: string;
  /** Denormalised for list and search screens. */
  primaryPhoto?: string | null;
  typeNameEn?: string;
  typeNameAr?: string;
  typeSlug?: string;
  categoryId?: number;
  categoryNameEn?: string;
  categoryNameAr?: string;
  categorySlug?: string;
}

/** Payload accepted by createItem / updateItem. */
export type ItemInput = Omit<
  ArchiveItem,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'photos'
  | 'qrFileName'
  | 'previousNumberRows'
  | 'previousNumbersText'
  | 'primaryPhoto'
  | 'typeNameEn'
  | 'typeNameAr'
  | 'typeSlug'
  | 'categoryId'
  | 'categoryNameEn'
  | 'categoryNameAr'
  | 'categorySlug'
>;

export interface ItemQuery {
  typeId?: number;
  categoryId?: number;
  search?: string;
  condition?: ConditionGrade | '';
  sortBy?: 'accession' | 'title' | 'year' | 'updated';
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ItemPage {
  rows: ArchiveItem[];
  total: number;
}

export interface ArchiveStats {
  totalItems: number;
  totalPhotos: number;
  totalCategories: number;
  totalTypes: number;
  byCondition: { condition: ConditionGrade; count: number }[];
  recentItems: ArchiveItem[];
}

/** Uniform result wrapper so IPC failures surface as data, not exceptions. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
