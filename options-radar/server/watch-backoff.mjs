// فاصله بعدی حلقه دیده‌بان.
//
// بدون عقب‌نشینی، اگر بالادست قطع باشد، حلقه هر `watchIntervalSec` دوباره
// می‌کوبد و هر بار `retries` تلاش می‌کند — یک قطعی طولانی به کوبش پیاپی
// تبدیل می‌شود. با شکست پیاپی، فاصله نمایی رشد می‌کند تا سقف؛ با اولین
// موفقیت (`failStreak = 0`) به فاصله عادی برمی‌گردد.

export const WATCH_BACKOFF_CAP_SEC = 120;

export function nextWatchDelaySec(watchIntervalSec, failStreak, capSec = WATCH_BACKOFF_CAP_SEC) {
  const base = Math.max(2, watchIntervalSec);
  return failStreak > 0 ? Math.min(capSec, base * 2 ** failStreak) : base;
}
