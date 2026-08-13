// مسیر امن برای سرو فایل ایستا.
//
// مقایسه رشته‌ای startsWith کافی نیست: پوشه هم‌نام‌شروع کنار ریشه هم رد
// می‌شود، چون "/x/options-radar-private" با رشته "/x/options-radar" شروع
// می‌شود. باید با path.relative سنجید که مسیر واقعاً زیر ریشه است.

import path from 'node:path';

export function resolveSafe(root, pathname) {
  const rel = pathname === '/' ? '/ui/index.html' : pathname;
  const file = path.join(root, rel);
  const fromRoot = path.relative(root, file);
  if (fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) return null;
  return file;
}
