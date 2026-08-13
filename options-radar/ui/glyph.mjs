// نشان استراتژی — نمای کوچک شکل بازده، برای فهرست کناری.
//
// چرا شکل و نه آیکون: سی‌ویک استراتژی داریم و اسم‌ها شبیه هم‌اند. «کندور
// آهنی» و «پروانه آهنی» را از روی متن باید خواند، ولی از روی شکل بازده در
// یک نگاه می‌شود تفکیک کرد. شکل، همان چیزی است که استراتژی را تعریف می‌کند.
//
// نشان از موتور واقعی می‌آید نه از تصویر آماده: پاها با قیمت اعمال نرمال
// حول صد ساخته می‌شوند، با بلک-شولز قیمت می‌خورند، و از همان تابع تکه‌ای-خطی
// عبور می‌کنند که ستون‌های جدول از آن بیرون می‌آید. پس اگر روزی موتور عوض
// شود، نشان هم با آن عوض می‌شود و دروغ نمی‌گوید.

import { buildLegs } from '/strategies/catalog.mjs';
import { grossCash, analyzePayoff } from '/core/payoff.mjs';
import { analyzeMixed, isSingleExpiry } from '/core/mixed.mjs';
import { bsPrice } from '/core/bs.mjs';

const W = 34;
const H = 16;
const SPOT = 100;
const SIGMA = 0.5;

const cache = new Map();

/** قیمت نظری هر پا، تا جریان نقد ورود واقعی باشد و شکل جابه‌جا نشود. */
function priceLegs(legs) {
  for (const l of legs) {
    if (l.kind === 'underlying') { l.price = SPOT; continue; }
    l.price = bsPrice(l.kind, SPOT, l.strike, Math.max(l.days, 1) / 365, 0.3, 0, SIGMA);
  }
  return legs;
}

/**
 * نشان یک استراتژی، به صورت SVG درون‌خطی.
 * اگر استراتژی از موتور رد نشود، رشته خالی برمی‌گردد و فهرست بدون نشان
 * می‌ماند — نشان، تزئین است و نباید هیچ‌وقت تب را از کار بیندازد.
 */
export function strategyGlyph(def) {
  if (!def || !def.legs?.length) return '';
  if (cache.has(def.id)) return cache.get(def.id);

  let out = '';
  try {
    const step = 14;
    const base = SPOT - ((def.strikes - 1) / 2) * step;
    const strikes = Array.from({ length: def.strikes }, (_, i) => base + i * step);
    const legs = priceLegs(buildLegs(def, { strikes, size: 1, days: [30, 60] }));
    const net = -grossCash(legs);

    const an = isSingleExpiry(legs)
      ? analyzePayoff(legs, net, {})
      : analyzeMixed(legs, net, { spot: SPOT, sigma: SIGMA });

    // پنجره‌ای که همه شکستگی‌ها را بگیرد، با کمی حاشیه
    const lo = Math.max(1, strikes[0] - step * 1.6);
    const hi = strikes[strikes.length - 1] + step * 1.6;

    const N = 48;
    const xs = [];
    for (let i = 0; i <= N; i++) xs.push(lo + ((hi - lo) * i) / N);
    // خودِ قیمت‌های اعمال هم باید نمونه شوند، وگرنه گوشه‌ها گرد می‌شوند
    for (const k of strikes) if (k > lo && k < hi) xs.push(k, k + 1e-6);
    xs.sort((a, b) => a - b);

    const pts = xs.map((S) => ({ S, v: an.at(S) })).filter((p) => Number.isFinite(p.v));
    if (pts.length < 2) return cacheAnd(def.id, '');

    let vLo = Infinity, vHi = -Infinity;
    for (const p of pts) { if (p.v < vLo) vLo = p.v; if (p.v > vHi) vHi = p.v; }
    const span = vHi - vLo;

    // جعبه‌اسپرد و تبدیل و برگردان بازده صاف دارند — این خاصیت تعریفی‌شان
    // است، نه نبود داده. خط صاف باید کشیده شود، وگرنه دقیقاً همان سه
    // استراتژی که شکل‌شان گویاست، بی‌نشان می‌مانند.
    const flat = !(span > 0);
    const X = (S) => ((S - lo) / (hi - lo)) * (W - 2) + 1;
    const Y = (v) => (flat ? H / 2 : H - 1.5 - ((v - vLo) / span) * (H - 3));
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.S).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
    const zero = !flat && vLo <= 0 && vHi >= 0 ? Y(0) : null;

    out = `<svg class="glyph" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">`
      + (zero == null ? '' : `<line class="g-zero" x1="0" y1="${zero.toFixed(1)}" x2="${W}" y2="${zero.toFixed(1)}"/>`)
      + `<path class="g-line" d="${d}"/></svg>`;
  } catch {
    out = ''; // استراتژی‌ای که موتور نمی‌پذیرد، فقط بی‌نشان می‌ماند
  }
  return cacheAnd(def.id, out);
}

function cacheAnd(id, v) { cache.set(id, v); return v; }
