// خواندن بدنه درخواست با سقف اندازه.
//
// بدون سقف، PUT با بدنه‌ای هرچه‌قدر بزرگ تا ته در حافظه جمع می‌شود.
// source هر چیزی است که for-await رویش کار کند — درخواست HTTP واقعی یا
// آرایه‌ای از تکه در آزمون.

export const MAX_BODY_BYTES = 512 * 1024;

export class BodyTooLargeError extends Error {}

export async function readBody(source, maxBytes = MAX_BODY_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const c of source) {
    total += c.length;
    if (total > maxBytes) {
      throw new BodyTooLargeError(`بدنه درخواست بزرگ‌تر از سقف ${maxBytes} بایتی است`);
    }
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}
