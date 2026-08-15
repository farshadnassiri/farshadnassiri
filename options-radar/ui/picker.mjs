// انتخابگر نماد پایه.
//
// انتخاب کاملاً انتخابی است. جعبه جست‌وجو فقط فهرست را کوتاه می‌کند و
// ورودی محاسبه نیست — چیزی که تایپ می‌کنی هیچ‌وقت مستقیم به موتور نمی‌رود.

import { fmt, normFa } from '/ui/fmt.mjs';

const KEY = 'picker.selected';

// حافظه خصوصی/محدودشده مرورگر localStorage را قفل یا پرتاب‌گر می‌کند —
// table.mjs و رول تاشدگی فهرست کناری (app.mjs) از قبل همین نگهبان را
// دارند؛ اینجا نبود، پس یک محیط محدود می‌توانست خودِ انتخابگر نماد را
// همان لحظه بارگذاری از کار بیندازد.
function loadSelected() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); }
  catch { return new Set(); }
}
function saveSelected(selected) {
  try { localStorage.setItem(KEY, JSON.stringify([...selected])); } catch { /* حافظه پر یا قفل */ }
}

export function makePicker(host, opts = {}) {
  let list = [];
  let selected = loadSelected();
  let filter = '';
  // کدام پیش‌تنظیم آخرین‌بار زده شده — بقیه دکمه‌های تعاملی برنامه (چیپ
  // سررسید زنجیره، چیپ نمای استراتژی، ...) همه aria-pressed دارند، این
  // چهارتا نداشتند. با اولین ویرایش دستی (تیک زدن یک ردیف) پاک می‌شود،
  // چون انتخاب دیگر دقیقاً همان پیش‌تنظیم نیست.
  let activePreset = null;

  host.innerHTML = `
    <div class="picker">
      <div class="picker-tools">
        <!-- placeholder به‌تنهایی نام دسترس‌پذیر قابل‌اتکا نیست — با شروع تایپ
             ناپدید می‌شود؛ #rail-q (index.html) از قبل کنار placeholder
             aria-label هم دارد، این ورودی جا مانده بود (دور ۷۴). -->
        <input type="search" id="pk-q" placeholder="کوتاه کردن فهرست" aria-label="کوتاه کردن فهرست نمادها">
        <button class="ghost" data-pre="all">همه</button>
        <button class="ghost" data-pre="liquid">پرمعامله</button>
        <button class="ghost" data-pre="quoted">دارای مظنه</button>
        <button class="ghost" data-pre="none">هیچ</button>
      </div>
      <div class="picker-list" id="pk-list"></div>
      <div class="picker-sum" id="pk-sum"></div>
    </div>`;

  const listHost = host.querySelector('#pk-list');
  const sum = host.querySelector('#pk-sum');
  const q = host.querySelector('#pk-q');

  const save = () => saveSelected(selected);

  function render() {
    // نیم‌فاصله/حرف عربی (ي/ك) رایج در نام رسمی نمادها هم باید پیدا شود،
    // حتی اگر کاربر شکل دیگرش را تایپ کند — همان قاعده جست‌وجوی فهرست
    // کناری تب‌ها.
    const nq = filter ? normFa(filter) : '';
    const shown = nq
      ? list.filter((u) => normFa(u.name).includes(nq) || normFa(u.ins).includes(nq))
      : list;
    listHost.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const u of shown.slice(0, 400)) {
      const row = document.createElement('label');
      row.className = 'picker-row';
      row.setAttribute('aria-selected', selected.has(u.ins) ? 'true' : 'false');
      row.innerHTML = `
        <input type="checkbox" ${selected.has(u.ins) ? 'checked' : ''}>
        <span>${u.name || u.ins}</span>
        <span class="m">${fmt.int(u.contracts)} قرارداد</span>
        <span class="m">${fmt.int(u.quoted)} مظنه</span>
        <span class="m">${u.last ? fmt.money(u.last) : '—'}</span>`;
      row.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) selected.add(u.ins); else selected.delete(u.ins);
        row.setAttribute('aria-selected', e.target.checked ? 'true' : 'false');
        activePreset = null;
        syncPresetButtons();
        save(); summary(); opts.onChange?.([...selected]);
      });
      frag.appendChild(row);
    }
    listHost.appendChild(frag);
    if (!shown.length) listHost.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:12.5px">نمادی با این نام در دیده‌بان نیست.</div>';
    summary();
  }

  function summary() {
    const picked = list.filter((u) => selected.has(u.ins));
    const contracts = picked.reduce((a, u) => a + u.contracts, 0);
    sum.textContent = selected.size
      ? `${fmt.int(picked.length)} نماد انتخاب شده — ${fmt.int(contracts)} قرارداد در دامنه اسکن`
      : 'هیچ نمادی انتخاب نشده. تا انتخاب نکنی، اسکنی انجام نمی‌شود.';
  }

  function syncPresetButtons() {
    for (const b of host.querySelectorAll('[data-pre]')) {
      b.setAttribute('aria-pressed', b.dataset.pre === activePreset ? 'true' : 'false');
    }
  }

  /** انتخابی که هر پیش‌تنظیم روی فهرست جاری می‌سازد — بدون اثر جانبی، برای اجرا و برای راستی‌آزمایی. */
  function computePreset(kind) {
    if (kind === 'none') return new Set();
    if (kind === 'all') return new Set(list.map((u) => u.ins));
    if (kind === 'liquid') return new Set(list.slice(0, 12).map((u) => u.ins));
    if (kind === 'quoted') return new Set(list.filter((u) => u.quoted >= 4).map((u) => u.ins));
    return null;
  }
  const setsEqual = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

  function preset(kind) {
    const next = computePreset(kind);
    if (!next) return;
    selected = next;
    activePreset = kind;
    syncPresetButtons();
    save(); render(); opts.onChange?.([...selected]);
  }

  for (const b of host.querySelectorAll('[data-pre]')) {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => preset(b.dataset.pre));
  }
  q.addEventListener('input', () => { filter = q.value.trim(); render(); });

  return {
    setList(next) {
      list = next;
      // نمادهایی که دیگر در دیده‌بان نیستند از انتخاب بیرون می‌روند
      const live = new Set(list.map((u) => u.ins));
      for (const k of [...selected]) if (!live.has(k)) selected.delete(k);
      // «دارای مظنه» و «پرمعامله» روی داده زنده تعریف می‌شوند: هر تیک دیده‌بان
      // مظنه و حجم را عوض می‌کند، پس همان فهرست انتخاب‌شده دیگر با تعریف
      // پیش‌تنظیم یکی نیست. اگر دکمه هنوز پررنگ (aria-pressed) بماند، دروغ
      // می‌گوید — انگار انتخاب هنوز زنده دنبال تعریف می‌رود، در حالی که یک
      // عکس لحظه‌ای منجمد از لحظه کلیک است.
      if (activePreset && !setsEqual(selected, computePreset(activePreset) || new Set())) activePreset = null;
      syncPresetButtons();
      render();
    },
    selected: () => [...selected],
    count: () => selected.size,
  };
}
