// خواندن بدنه درخواست با سقف اندازه.
//
// بدون سقف، `for await` روی بدنه هر اندازه‌ای در حافظه جمع می‌کند —
// یک درخواست بزرگ کافی است سرور را از حافظه بیندازد.

export class BodyTooLargeError extends Error {
  constructor(maxBytes) {
    super(`بدنه درخواست از ${maxBytes} بایت بیشتر است`);
    this.status = 413;
  }
}

export async function readBody(stream, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    if (total > maxBytes) throw new BodyTooLargeError(maxBytes);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
