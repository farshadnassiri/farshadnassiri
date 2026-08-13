// فاصله بعدی حلقه دیده‌بان.
//
// بدون عقب‌نشینی، اگر بالادست قطع باشد حلقه هر watchIntervalSec دوباره
// می‌کوبد و هر بار retries تلاش می‌کند — فشار مضاعف روی سرویسی که همین
// الان جواب نمی‌دهد. با خطای پیاپی، فاصله تصاعدی رشد می‌کند تا سقفی مشخص؛
// اولین موفقیت فوری آن را به فاصله عادی برمی‌گرداند.

export const WATCH_BACKOFF_MAX_SEC = 60;

export function nextWatchDelay(baseSec, consecutiveFails, maxSec = WATCH_BACKOFF_MAX_SEC) {
  const base = Math.max(2, baseSec);
  if (consecutiveFails <= 0) return base;
  return Math.min(base * 2 ** consecutiveFails, maxSec);
}
