// خواندن بدنه درخواست با سقف اندازه.
//
// بدون سقف، `PUT /api/settings` و `PUT /api/positions` تا هر اندازه‌ای در
// حافظه جمع می‌کردند. اینجا با هر تکه، اندازه جمعی سنجیده می‌شود و پیش از
// رسیدن به `JSON.parse`، عبور از سقف خطا می‌دهد.

export const MAX_BODY_BYTES = 512 * 1024;

export class BodyTooLargeError extends Error {
  constructor(limitBytes) {
    super(`بدنه درخواست از سقف ${limitBytes.toLocaleString()} بایت فراتر رفت`);
    this.name = 'BodyTooLargeError';
  }
}

export async function readBody(req, limitBytes = MAX_BODY_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const c of req) {
    total += c.length;
    if (total > limitBytes) throw new BodyTooLargeError(limitBytes);
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}
