// ابزار خالص روی یک سری نمونه {S, v} — نه مخصوص یک استراتژی خاص.

/**
 * نقاط تغییر علامت یک سری {S, v}. مرز تصمیم نمودار تفاضل از همین می‌آید.
 *
 * اگر نمونه‌ای دقیقاً روی صفر بیفتد — با قیمت پایه رند و بازه نمونه‌برداری
 * رند، بعید نیست — شرط `a<0 && b>0` هیچ‌کدام از دو زوج مجاورش را نمی‌گیرد
 * و آن مرز تصمیم گم می‌شود؛ پس صفر دقیق جدا بررسی می‌شود.
 */
export function zeroCrossings(points, val) {
  const cross = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const av = val(a), bv = val(b);
    if (!Number.isFinite(av) || !Number.isFinite(bv)) continue;
    if (av === 0) { cross.push(a.S); continue; }
    if ((av < 0 && bv > 0) || (av > 0 && bv < 0)) {
      const t = -av / (bv - av);
      cross.push(a.S + t * (b.S - a.S));
    }
  }
  const last = points[points.length - 1];
  if (last && val(last) === 0) cross.push(last.S);
  return cross;
}
