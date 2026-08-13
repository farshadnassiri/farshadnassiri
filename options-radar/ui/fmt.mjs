// قالب‌بندی عدد — یک منبع، برای کل رابط.
//
// همه عددها فارسی نوشته می‌شوند: رقم فارسی، جداکننده هزارگان «٬»، اعشار «٫»،
// و منفی با نشانه ریاضی «−» نه خط تیره.
//
// چرا با دست و نه با toLocaleString('fa-IR'):
//
//   ۱. آن تابع پیش از عدد منفی یک نشانه نامرئی (U+200E) می‌گذارد. داخل SVG
//      و داخل ویژگی‌های HTML این نشانه دردسر می‌شود و در آزمون هم دیده
//      نمی‌شود ولی مقایسه رشته را می‌شکند.
//   ۲. خروجی‌اش به نسخه ICU مرورگر بند است. همان کد روی دو مرورگر دو جور
//      درمی‌آید و آزمون واحد چیزی را قفل نمی‌کند.
//
// پس در انگلیسی قالب می‌دهیم — که رفتارش تعریف‌شده است — و بعد نویسه‌ها را
// برمی‌گردانیم. تبدیل، تابع خالص است و آزمون‌پذیر.

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** هر رشته‌ای را فارسی‌نویس می‌کند: رقم، جداکننده، اعشار، منفی. */
export function faNum(s) {
  return String(s)
    .replace(/[0-9]/g, (d) => FA_DIGITS[+d])
    .replace(/,/g, '٬')
    .replace(/\./g, '٫')
    .replace(/-/g, '−');
}

/** فقط رقم‌ها را برمی‌گرداند و به جداکننده دست نمی‌زند. برای متن آمیخته. */
export function faDigits(s) {
  return String(s).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

/** برعکس — برای خواندن ورودی کاربر که ممکن است فارسی تایپ کند. */
export function toEnDigits(s) {
  return String(s)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/٬/g, '')
    .replace(/٫/g, '.')
    .replace(/−/g, '-');
}

const grouped = (v) => faNum(Math.round(v).toLocaleString('en-US'));

export const fmt = {
  money: (v) => (Number.isFinite(v) ? grouped(v)
    : v === Infinity ? '∞' : v === -Infinity ? '−∞' : '—'),
  pct: (v) => (Number.isFinite(v) ? faNum(v.toFixed(2)) : '—'),
  num: (v) => (Number.isFinite(v)
    ? (Math.abs(v) >= 1000 ? grouped(v) : faNum(Math.abs(v) < 1 ? v.toFixed(4) : v.toFixed(2)))
    : '—'),
  int: (v) => (Number.isFinite(v) ? grouped(v) : '—'),
  text: (v) => (v == null ? '—' : faDigits(String(v))),
  list: (v) => (Array.isArray(v)
    ? (v.length ? v.map((x) => (typeof x === 'number' ? grouped(x) : faDigits(x))).join(' , ') : '—')
    : faDigits(String(v ?? '—'))),
};

/**
 * عدد کوتاه محور نمودار: هزار و میلیون و میلیارد.
 *
 * پسوند فارسی است ولی داخل SVG می‌نشیند، جایی که جهت‌دهی دوسویه دردسر
 * می‌سازد. قاعده «‎.payoff text» جهت را چپ‌به‌راست و جداشده می‌گیرد تا هم
 * نشانه منفی سر جایش بماند و هم حرف فارسی وارونه نشود.
 */
export function axisNum(v) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return faNum((v / 1e9).toFixed(a >= 1e10 ? 0 : 1)) + ' میلیارد';
  if (a >= 1e6) return faNum((v / 1e6).toFixed(a >= 1e7 ? 0 : 1)) + ' م';
  if (a >= 1e4) return faNum(Math.round(v / 1e3).toString()) + ' هزار';
  return fmt.money(v);
}

/** فاصله زمانی تا الان، به فارسی خوانا. */
export function faAgo(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 10) return 'همین الان';
  if (s < 60) return `${faDigits(s)} ثانیه پیش`;
  const m = Math.round(s / 60);
  if (m < 60) return `${faDigits(m)} دقیقه پیش`;
  const h = Math.round(m / 60);
  if (h < 24) return `${faDigits(h)} ساعت پیش`;
  return `${faDigits(Math.round(h / 24))} روز پیش`;
}

/** ساعت دیواری، برای «آخرین دریافت». */
export function faClock(d = new Date()) {
  const p = (n) => faDigits(String(n).padStart(2, '0'));
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
