// نگه‌داری کش با سقف.
//
// کش فقط با DELETE /api/cache دستی خالی می‌شد؛ ورودی منقضی هرگز حذف
// نمی‌شد و در اجرای طولانی برای هر نماد تازه فقط رشد می‌کرد. دو تابع خالص
// این‌جا هستند تا سرور دوره‌ای صدایشان بزند.

/** ورودی‌های منقضی‌شده را حذف می‌کند. entry باید { at, ttlSec } داشته باشد. */
export function pruneExpired(cache, now) {
  let removed = 0;
  for (const [key, entry] of cache) {
    if (now - entry.at >= entry.ttlSec * 1000) {
      cache.delete(key);
      removed += 1;
    }
  }
  return removed;
}

/** اگر از سقف گذشت، قدیمی‌ترین ورودی‌ها (ترتیب درج Map) حذف می‌شوند. */
export function enforceMaxSize(cache, maxSize) {
  let removed = 0;
  while (cache.size > maxSize) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
    removed += 1;
  }
  return removed;
}
