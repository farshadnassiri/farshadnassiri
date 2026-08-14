// مسیر امن برای سرو فایل ایستا.
//
// `startsWith` روی رشته مرز نمی‌گیرد: اگر ریشه ‎/x/options-radar‎ باشد،
// پوشه هم‌نام‌شروع کنار آن یعنی ‎/x/options-radar-private/‎ هم رشته‌اش
// با ریشه شروع می‌شود و رد نمی‌شد. `path.relative` این خلط را ندارد —
// اگر نتیجه با `..‎` شروع شود، مسیر واقعاً بیرون ریشه است.

import path from 'node:path';

export function safeStaticPath(root, pathname, indexFile = '/ui/index.html') {
  const rel = pathname === '/' ? indexFile : pathname;
  const file = path.join(root, rel);
  const relFromRoot = path.relative(root, file);
  if (relFromRoot === '..' || relFromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relFromRoot)) {
    return null;
  }
  return file;
}
