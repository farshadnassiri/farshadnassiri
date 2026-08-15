// اتصال امنِ یک مسیر درخواستی به زیرِ یک ریشه.
//
// `startsWith` روی رشته کافی نیست: /x/options-radar-private/ هم با ریشه
// /x/options-radar شروع می‌شود. باید با path.relative سنجید که نتیجه از
// ریشه بیرون نزده باشد.

import path from 'node:path';

export function safeJoin(root, pathname) {
  const file = path.join(root, pathname);
  const rel = path.relative(root, file);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return file;
}
