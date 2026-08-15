// پاک‌سازی دوره‌ای کش.
//
// یک نشانه‌گر یک‌بار خوانده و دیگر هرگز پرس‌وجو نشود، در `cache` می‌ماند —
// ورودی منقضی فقط وقتی حذف می‌شد که دوباره همان نشانه پرس‌وجو شود. بدون
// پاک‌سازی دوره‌ای، کش برای هر نشانه‌ای که در طول عمر سرور دیده شده رشد
// می‌کند و هرگز کوچک نمی‌شود.

export function sweepExpired(cache, now) {
  let removed = 0;
  for (const [key, entry] of cache) {
    if (now - entry.at > entry.ttlSec * 1000) {
      cache.delete(key);
      removed += 1;
    }
  }
  return removed;
}
