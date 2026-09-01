# Installing on macOS — دليل التثبيت على ماك

## Which file to download — أي ملف تختار

| Your Mac | File |
|----------|------|
| Apple Silicon (M1, M2, M3, M4) | `EgyptianMuseumArchive-<version>-arm64.dmg` |
| Intel | `EgyptianMuseumArchive-<version>-x64.dmg` |

To check: **Apple menu  → About This Mac**. If *Chip* says "Apple M…", take
the arm64 file; if *Processor* says "Intel", take the x64 file.

للتحقق: قائمة أبل ← حول هذا الماك. إذا ظهر "Apple M" اختر ملف arm64، وإذا ظهر
"Intel" اختر ملف x64.

## Installing — التثبيت

1. Open the `.dmg` file.
2. Drag **Egyptian Museum Archive** onto the **Applications** folder.
3. Eject the disk image.

١. افتح ملف `.dmg`
٢. اسحب أيقونة التطبيق إلى مجلد **Applications**
٣. أخرج صورة القرص

## First launch — التشغيل لأول مرة

The application is not signed with an Apple certificate, so macOS blocks it the
first time and shows a message saying it "cannot be opened" or "Apple could not
verify it is free of malware". **This is expected.** It happens to every
application distributed outside the App Store without a paid Apple Developer
certificate. Do this once:

هذا التطبيق غير موقَّع بشهادة أبل، لذلك يمنعه النظام في المرة الأولى ويعرض رسالة
تحذير. **هذا متوقع**، ويحدث مع أي تطبيق يُوزَّع خارج متجر أبل بدون شهادة مطوّر
مدفوعة. اتبع الخطوات التالية مرة واحدة فقط:

1. Try to open the application normally (double-click it in Applications).
   The warning appears — click **Done** or **OK**.
2. Open **System Settings → Privacy & Security**.
3. Scroll down. There is a line saying *"Egyptian Museum Archive was blocked…"*
   with an **Open Anyway** button. Click it.
4. Confirm with **Open**, and enter the Mac's password if asked.

١. حاول فتح التطبيق بالنقر المزدوج، ثم أغلق رسالة التحذير
٢. افتح **إعدادات النظام ← الخصوصية والأمان**
٣. انزل للأسفل، ستجد سطراً يذكر التطبيق وبجانبه زر **Open Anyway** — اضغط عليه
٤. أكّد بالضغط على **Open** وأدخل كلمة مرور الجهاز إذا طُلبت

The application opens normally from then on — this is only needed once.

بعدها يفتح التطبيق بشكل طبيعي، ولا حاجة لتكرار هذه الخطوات.

### If Open Anyway does not appear — إذا لم يظهر الزر

Open **Terminal** (Applications → Utilities) and run:

```bash
xattr -dr com.apple.quarantine "/Applications/Egyptian Museum Archive.app"
```

Then open the application normally.

## Where the data is kept — أين تُحفظ البيانات

```
~/Library/Application Support/egyptian-museum-archive/archive-data/
```

This folder holds `archive.db` (the catalogue) and `media` (the photographs).
The **Data folder** link at the bottom of the application window opens it.

يحتوي هذا المجلد على قاعدة البيانات والصور. يمكن فتحه من رابط **مجلد البيانات**
أسفل نافذة التطبيق.

**Back it up regularly.** The application has a backup button in the header
(the download arrow) that saves the whole catalogue to a file of your choosing.

**احرص على أخذ نسخة احتياطية بانتظام** باستخدام زر النسخ الاحتياطي في أعلى النافذة.

## Updating — التحديث

Installing a newer version over the old one **keeps all catalogued records and
photographs** — the data is stored outside the application. Drag the new version
into Applications and choose *Replace*.

Take a backup before updating anyway, as a precaution.

تثبيت نسخة أحدث **لا يؤثر على السجلات والصور المحفوظة**، لأن البيانات مخزّنة خارج
التطبيق. مع ذلك يُفضَّل أخذ نسخة احتياطية قبل التحديث.

Do not install an **older** version over a newer one — an older build will not
understand a database that a newer one has upgraded.

لا تُثبّت نسخة **أقدم** فوق نسخة أحدث.
