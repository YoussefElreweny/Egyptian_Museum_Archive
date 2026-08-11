/**
 * The archive classification supplied by the Egyptian Museum (Tahrir),
 * Archive Department: seven categories of archival material, each with its
 * material types and the illustrative example printed in the source document
 * ("أمثلة على أنواع المواد الأرشيفية").
 *
 * This is the authoritative taxonomy — the database is seeded from it and
 * re-synced on every launch, so correcting a name here corrects the app.
 */

export interface SeedType {
  slug: string;
  nameEn: string;
  nameAr: string;
  exampleEn: string;
  exampleAr: string;
}

export interface SeedCategory {
  slug: string;
  nameEn: string;
  nameAr: string;
  ordinalAr: string;
  icon: string;
  types: SeedType[];
}

export const TAXONOMY: SeedCategory[] = [
  {
    slug: 'paper',
    nameEn: 'Paper Materials',
    nameAr: 'المواد الورقية',
    ordinalAr: 'أولاً',
    icon: '📜',
    types: [
      {
        slug: 'official-documents',
        nameEn: 'Official Documents',
        nameAr: 'الوثائق الرسمية',
        exampleEn: 'A ministerial decree issued by the Ministry of Culture',
        exampleAr: 'قرار وزاري صادر من وزارة الثقافة',
      },
      {
        slug: 'correspondence',
        nameEn: 'Correspondence',
        nameAr: 'المراسلات',
        exampleEn: 'A letter between an institution director and a member of staff',
        exampleAr: 'خطاب بين مدير مؤسسة وأحد الموظفين',
      },
      {
        slug: 'registers',
        nameEn: 'Registers',
        nameAr: 'السجلات',
        exampleEn: 'A birth register or an attendance and departure register',
        exampleAr: 'سجل المواليد أو سجل الحضور والانصراف',
      },
      {
        slug: 'maps',
        nameEn: 'Maps',
        nameAr: 'الخرائط',
        exampleEn: 'An archaeological map of a historical site',
        exampleAr: 'خريطة أثرية لموقع تاريخي',
      },
      {
        slug: 'manuscripts',
        nameEn: 'Manuscripts',
        nameAr: 'المخطوطات',
        exampleEn: 'An old Quranic manuscript',
        exampleAr: 'مخطوطة قرآنية قديمة',
      },
      {
        slug: 'newspapers',
        nameEn: 'Newspapers and Press',
        nameAr: 'الجرائد والصحف',
        exampleEn: 'An old issue of Al-Ahram newspaper',
        exampleAr: 'عدد قديم من جريدة الأهرام',
      },
      {
        slug: 'magazines',
        nameEn: 'Magazines',
        nameAr: 'المجلات',
        exampleEn: 'A cultural magazine published in the 1960s',
        exampleAr: 'مجلة ثقافية صادرة في الستينيات',
      },
      {
        slug: 'books',
        nameEn: 'Books',
        nameAr: 'الكتب',
        exampleEn: 'A history book printed in 1920',
        exampleAr: 'كتاب تاريخ مطبوع عام 1920',
      },
      {
        slug: 'reports',
        nameEn: 'Reports',
        nameAr: 'التقارير',
        exampleEn: 'An annual report of a governmental institution',
        exampleAr: 'تقرير سنوي لمؤسسة حكومية',
      },
      {
        slug: 'contracts',
        nameEn: 'Contracts and Agreements',
        nameAr: 'العقود والاتفاقيات',
        exampleEn: 'A sale contract or a cooperation agreement',
        exampleAr: 'عقد بيع أو اتفاقية تعاون',
      },
    ],
  },
  {
    slug: 'photographic',
    nameEn: 'Photographic and Visual Materials',
    nameAr: 'المواد الفوتوغرافية والبصرية',
    ordinalAr: 'ثانياً',
    icon: '📷',
    types: [
      {
        slug: 'photographs',
        nameEn: 'Photographs',
        nameAr: 'الصور الفوتوغرافية',
        exampleEn: 'A historical photograph of the inauguration of a national project',
        exampleAr: 'صورة تاريخية لافتتاح مشروع قومي',
      },
      {
        slug: 'films',
        nameEn: 'Cinematic Films',
        nameAr: 'الأفلام السينمائية',
        exampleEn: 'A documentary film about Egyptian civilisation',
        exampleAr: 'فيلم وثائقي عن الحضارة المصرية',
      },
      {
        slug: 'slides',
        nameEn: 'Slides',
        nameAr: 'الشرائح',
        exampleEn: 'Educational slides for university lectures',
        exampleAr: 'شرائح تعليمية لمحاضرات جامعية',
      },
      {
        slug: 'negatives',
        nameEn: 'Negatives',
        nameAr: 'النيجاتيف',
        exampleEn: 'Negative film used in photography',
        exampleAr: 'أفلام نيجاتيف للتصوير الفوتوغرافي',
      },
      {
        slug: 'microfilm',
        nameEn: 'Microfilm',
        nameAr: 'الميكروفيلم',
        exampleEn: 'Miniaturised copies of old newspapers',
        exampleAr: 'نسخ مصغرة من الصحف القديمة',
      },
    ],
  },
  {
    slug: 'audio',
    nameEn: 'Audio Materials',
    nameAr: 'المواد السمعية',
    ordinalAr: 'ثالثاً',
    icon: '🎙️',
    types: [
      {
        slug: 'audio-recordings',
        nameEn: 'Audio Recordings',
        nameAr: 'التسجيلات الصوتية',
        exampleEn: 'A recording of an official speech by a head of state',
        exampleAr: 'تسجيل خطاب رسمي لرئيس دولة',
      },
      {
        slug: 'audio-tapes',
        nameEn: 'Audio Tapes',
        nameAr: 'الأشرطة السمعية',
        exampleEn: 'A cassette containing a historical interview',
        exampleAr: 'كاسيت يحتوي على مقابلة تاريخية',
      },
      {
        slug: 'phonograph-discs',
        nameEn: 'Phonograph Discs',
        nameAr: 'الأسطوانات الصوتية',
        exampleEn: 'An old musical record',
        exampleAr: 'أسطوانة موسيقية قديمة',
      },
    ],
  },
  {
    slug: 'audio-visual',
    nameEn: 'Audio-Visual Materials',
    nameAr: 'المواد السمعية البصرية',
    ordinalAr: 'رابعاً',
    icon: '🎬',
    types: [
      {
        slug: 'video-recordings',
        nameEn: 'Video Recordings',
        nameAr: 'تسجيلات الفيديو',
        exampleEn: 'A video of a national celebration',
        exampleAr: 'فيديو لاحتفال وطني',
      },
      {
        slug: 'video-tapes',
        nameEn: 'Video Tapes',
        nameAr: 'الأشرطة المرئية',
        exampleEn: 'A VHS tape of an old television programme',
        exampleAr: 'شريط VHS لبرنامج تلفزيوني قديم',
      },
      {
        slug: 'digital-video',
        nameEn: 'Digital Video Files',
        nameAr: 'الملفات المرئية الرقمية',
        exampleEn: 'An MP4 file of a scientific lecture',
        exampleAr: 'ملف MP4 لمحاضرة علمية',
      },
    ],
  },
  {
    slug: 'digital',
    nameEn: 'Digital and Electronic Materials',
    nameAr: 'المواد الرقمية والإلكترونية',
    ordinalAr: 'خامساً',
    icon: '💾',
    types: [
      {
        slug: 'email',
        nameEn: 'Email',
        nameAr: 'البريد الإلكتروني',
        exampleEn: 'An official email message',
        exampleAr: 'رسالة بريد إلكتروني رسمية',
      },
      {
        slug: 'databases',
        nameEn: 'Databases',
        nameAr: 'قواعد البيانات',
        exampleEn: 'The staff database',
        exampleAr: 'قاعدة بيانات الموظفين',
      },
      {
        slug: 'digital-files',
        nameEn: 'Digital Files',
        nameAr: 'الملفات الرقمية',
        exampleEn: 'A PDF file of an archival report',
        exampleAr: 'ملف PDF لتقرير أرشيفي',
      },
      {
        slug: 'websites',
        nameEn: 'Websites',
        nameAr: 'المواقع الإلكترونية',
        exampleEn: 'The website of a cultural institution',
        exampleAr: 'موقع إلكتروني لمؤسسة ثقافية',
      },
      {
        slug: 'digital-images',
        nameEn: 'Digital Images',
        nameAr: 'الصور الرقمية',
        exampleEn: 'Optically scanned images of documents',
        exampleAr: 'صور ممسوحة ضوئياً لوثائق',
      },
      {
        slug: 'digital-recordings',
        nameEn: 'Digital Recordings',
        nameAr: 'التسجيلات الرقمية',
        exampleEn: 'An audio recording saved in MP3 format',
        exampleAr: 'تسجيل صوتي محفوظ بصيغة MP3',
      },
    ],
  },
  {
    slug: 'artistic',
    nameEn: 'Artistic and Special Materials',
    nameAr: 'المواد الفنية والخاصة',
    ordinalAr: 'سادساً',
    icon: '🖼️',
    types: [
      {
        slug: 'engineering-drawings',
        nameEn: 'Engineering Drawings',
        nameAr: 'الرسومات الهندسية',
        exampleEn: 'An architectural design for a historic building',
        exampleAr: 'تصميم معماري لمبنى أثري',
      },
      {
        slug: 'paintings',
        nameEn: 'Paintings',
        nameAr: 'اللوحات الفنية',
        exampleEn: 'A historical oil painting',
        exampleAr: 'لوحة زيتية تاريخية',
      },
      {
        slug: 'seals-stamps',
        nameEn: 'Seals and Stamps',
        nameAr: 'الأختام والطوابع',
        exampleEn: 'An official seal of a government bureau',
        exampleAr: 'ختم رسمي لديوان حكومي',
      },
      {
        slug: 'coins-medals',
        nameEn: 'Coins and Medals',
        nameAr: 'العملات والميداليات',
        exampleEn: 'A commemorative coin or an honorary medal',
        exampleAr: 'عملة تذكارية أو ميدالية تكريم',
      },
      {
        slug: 'posters',
        nameEn: 'Posters and Advertisements',
        nameAr: 'الملصقات والإعلانات',
        exampleEn: 'A promotional poster for a cultural event',
        exampleAr: 'ملصق دعائي لفعالية ثقافية',
      },
    ],
  },
  {
    slug: 'three-dimensional',
    nameEn: 'Three-Dimensional Materials',
    nameAr: 'المواد ثلاثية الأبعاد',
    ordinalAr: 'سابعاً',
    icon: '🏺',
    types: [
      {
        slug: 'artifacts',
        nameEn: 'Artifacts',
        nameAr: 'القطع الأثرية',
        exampleEn: 'An ancient pottery vessel',
        exampleAr: 'إناء فخاري أثري',
      },
      {
        slug: 'models',
        nameEn: 'Models and Mockups',
        nameAr: 'النماذج والمجسمات',
        exampleEn: 'A scale model of an ancient temple',
        exampleAr: 'مجسم لمعبد أثري',
      },
      {
        slug: 'historical-tools',
        nameEn: 'Historical Tools',
        nameAr: 'الأدوات التاريخية',
        exampleEn: 'An old typewriter',
        exampleAr: 'آلة كاتبة قديمة',
      },
    ],
  },
];

/** Two-letter prefix per category, used to mint accession numbers. */
export const CATEGORY_CODES: Record<string, string> = {
  paper: 'PM',
  photographic: 'PV',
  audio: 'AU',
  'audio-visual': 'AV',
  digital: 'DE',
  artistic: 'AS',
  'three-dimensional': 'TD',
};
