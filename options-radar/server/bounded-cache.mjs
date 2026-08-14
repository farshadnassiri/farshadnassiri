// نگاشت با سقف اندازه — کهنه‌ترین ورودی وقتی سقف رد شود حذف می‌شود.
//
// `cache` قبلاً یک `Map` ساده بود که فقط با `DELETE /api/cache` خالی
// می‌شد؛ ورودی منقضی هرگز حذف نمی‌شد. در یک نشست طولانی با نمادهای زیاد،
// بی‌نهایت رشد می‌کرد. ترتیب درج در `Map` نگه داشته می‌شود، پس حذف از سر
// همان کهنه‌ترین کلید است.

export class BoundedCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  get(key) { return this.map.get(key); }

  set(key, value) {
    this.map.delete(key); // دوباره‌نویسی، کلید را به انتهای ترتیب درج می‌برد
    this.map.set(key, value);
    while (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }

  get size() { return this.map.size; }

  clear() { this.map.clear(); }
}
