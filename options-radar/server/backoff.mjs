// عقب‌نشینی نمایی با سقف، برای حلقه‌هایی که با خطای پیاپی روبه‌رو می‌شوند.
//
// بدون این، حلقه دیده‌بان روی قطعی بالادست هر بار با همان فاصله ثابت
// دوباره می‌کوبد — نه فقط بی‌فایده، بلکه خودش می‌تواند مانع برگشت سرویس شود.

export function nextDelaySec(consecutiveFails, baseSec, maxSec) {
  if (consecutiveFails <= 0) return baseSec;
  return Math.min(baseSec * 2 ** consecutiveFails, maxSec);
}
