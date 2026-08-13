// پوسته برنامه — مدیر تب و نوار سلامت.
//
// قاعده تب تنبل: ماژول هر تب فقط لحظه اولین کلیک وارد می‌شود و اشتراک
// عکس لحظه‌ای هم فقط برای تب باز برقرار می‌شود. تب بسته، هیچ هزینه‌ای ندارد.

import { fmt, faDigits, faAgo, faClock } from '/ui/fmt.mjs';
import { defaults } from '/core/settings.mjs';
import { CATALOG, GROUPS as SGROUPS } from '/strategies/catalog.mjs';

export const state = {
  settings: defaults(),
  watch: { at: null, rows: [], byKey: new Map() },
  stream: null,
  subscribers: new Set(),
  // وضعیت اتصال جریان، برای نوار وضعیت. «آخرین دریافت» ساعت دیواری مرورگر
  // است نه زمان سرور، چون همان چیزی است که کاربر می‌خواهد بداند: از کی تا
  // حالا چیزی تازه نیامده.
  link: { status: 'idle', since: Date.now(), lastData: null, drops: 0 },
};

// ————————————————————————————————— تنظیمات —————————————————————————————————

export async function loadSettings() {
  try {
    const r = await fetch('/api/settings');
    state.settings = await r.json();
  } catch { /* پیش‌فرض می‌ماند */ }
  return state.settings;
}

export async function putSettings(next) {
  const r = await fetch('/api/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  });
  if (!r.ok) throw new Error('ذخیره نشد');
  state.settings = await r.json();
  return state.settings;
}

// ————————————————————————————————— اشتراک عکس لحظه‌ای —————————————————————————————————
// یک اتصال پایدار برای کل برنامه. سرور بار اول کل عکس و بعد فقط ردیف تغییرکرده
// می‌فرستد، پس مرورگر هیچ‌وقت پشت یک درخواست شبکه منتظر نمی‌ماند.

const rowKey = (r) => `${r.insCode_C ?? ''}|${r.insCode_P ?? ''}`;

export function subscribeWatch(fn) {
  state.subscribers.add(fn);
  openStream();
  if (state.watch.rows.length) fn(state.watch);
  return () => state.subscribers.delete(fn);
}

function setLink(status) {
  if (state.link.status === status) return;
  if (status === 'down' && state.link.status === 'live') state.link.drops += 1;
  state.link.status = status;
  state.link.since = Date.now();
  paintLink();
}

function openStream() {
  if (state.stream) return;
  const es = new EventSource('/api/stream');
  state.stream = es;
  setLink('connecting');
  es.addEventListener('open', () => setLink('live'));
  es.addEventListener('watch', (e) => {
    setLink('live');
    state.link.lastData = Date.now();
    const msg = JSON.parse(e.data);
    if (msg.full) {
      state.watch.byKey = new Map(msg.rows.map((r) => [rowKey(r), r]));
    } else {
      for (const r of msg.rows) state.watch.byKey.set(rowKey(r), r);
    }
    state.watch.at = msg.at;
    state.watch.rows = [...state.watch.byKey.values()];
    state.watch.changed = msg.full ? null : msg.rows.length;
    for (const fn of state.subscribers) { try { fn(state.watch); } catch (err) { console.error(err); } }
  });
  es.addEventListener('trouble', (e) => console.warn('دریافت داده:', JSON.parse(e.data).message));
  // مرورگر خودش دوباره وصل می‌شود؛ کار ما فقط این است که قطعی را پنهان نکنیم
  es.onerror = () => setLink(es.readyState === 2 ? 'down' : 'connecting');
}

// ————————————————————————————————— نوار سلامت —————————————————————————————————

const el = (id) => document.getElementById(id);
let lastReq = null;

const LINK_TEXT = {
  idle: ['بی‌اتصال', 'idle'],
  connecting: ['در حال اتصال', 'wait'],
  live: ['متصل', 'open'],
  down: ['قطع', 'down'],
};

/**
 * وضعیت اتصال و تازگی داده.
 *
 * جدا از tickHealth است چون منبعش فرق می‌کند: این یکی از جریان مرورگر
 * می‌آید و باید فوری عوض شود، آن یکی هر چند ثانیه از سرور پرسیده می‌شود.
 * قبلاً هیچ‌کدام از این دو نشان داده نمی‌شد و «سن عکس» تنها سرنخ بود — که
 * وقتی اتصال می‌افتاد، بی‌حرکت می‌ماند و چیزی لو نمی‌داد.
 */
function paintLink() {
  const pill = el('h-link');
  if (!pill) return;
  const [text, cls] = LINK_TEXT[state.link.status] || LINK_TEXT.idle;
  pill.textContent = text;
  pill.className = `pill link ${cls}`;

  const fresh = el('h-fresh');
  if (!fresh) return;
  const t = state.link.lastData;
  if (!t) {
    fresh.textContent = '—';
    fresh.removeAttribute('data-stale');
    el('h-fresh-wrap').title = 'هنوز داده‌ای نرسیده';
    return;
  }
  const age = Date.now() - t;
  fresh.textContent = faClock(new Date(t));
  // بیش از دو دقیقه سکوت، در ساعت بازار یعنی یک جای کار می‌لنگد
  fresh.toggleAttribute('data-stale', age > 120000);
  el('h-fresh-wrap').title = `${faAgo(age)} — ${faClock(new Date(t))}`;
}
setInterval(paintLink, 1000);

async function tickHealth() {
  try {
    const h = await (await fetch('/api/health')).json();
    const m = el('h-market');
    const open = h.market?.open;
    m.textContent = open ? 'بازار باز' : (h.market?.why || 'متوقف');
    m.className = `pill ${open ? 'open' : 'shut'}`;

    el('h-rows').textContent = h.watchRows ? fmt.int(h.watchRows) : '—';

    // خطا فقط وقتی دیده می‌شود که وجود داشته باشد. صفرِ همیشگی، جای نوار را
    // می‌گرفت و چشم به آن عادت می‌کرد.
    const errWrap = el('h-err-wrap');
    errWrap.toggleAttribute('hidden', !h.errors);
    el('h-err').textContent = fmt.int(h.errors);
    errWrap.title = h.lastError || 'خطایی ثبت نشده';

    // ——— شمارنده‌های فنی ———
    const per = lastReq == null ? 0 : h.requests - lastReq;
    lastReq = h.requests;
    el('d-req').textContent = `${fmt.int(h.requests)}${per ? ` (+${faDigits(per)})` : ''}`;

    const total = h.requests + h.cacheHits;
    el('d-cache').textContent = total > 0 ? `${faDigits(Math.round((h.cacheHits / total) * 100))}٪` : '—';
    el('d-ms').textContent = h.avgUpstreamMs ? `${faDigits(h.avgUpstreamMs)} ms` : '—';
    el('d-age').textContent = h.watchAgeSec == null ? '—' : `${faDigits(h.watchAgeSec)} ثانیه`;
    el('d-drops').textContent = faDigits(state.link.drops);
    el('d-err').textContent = h.lastError || 'هیچ';
  } catch {
    const m = el('h-market');
    m.textContent = 'سرور در دسترس نیست';
    m.className = 'pill down';
    setLink('down');
  }
}

// ————————————————————————————————— تب‌ها —————————————————————————————————

const TABS = [
  { id: 'settings', title: 'تنظیمات', section: 'پایه', mod: '/ui/tabs/settings.mjs', phase: 1 },
  { id: 'engine', title: 'موتور و نمودار بازده', section: 'پایه', mod: '/ui/tabs/engine.mjs', phase: 2 },
  { id: 'chain', title: 'دیده‌بان زنجیره اختیار', section: 'پایه', mod: '/ui/tabs/chain.mjs', phase: 3 },
  { id: 'top', title: 'برترین موقعیت‌ها', section: 'پایه', mod: '/ui/tabs/top.mjs', phase: 3 },
];

// تب هر استراتژی از همان فهرست ساخته می‌شود و همه یک ماژول دارند. این نتیجه
// مستقیم آن تصمیم معماری است: چون هیچ استراتژی محاسبه‌گر جدا ندارد، هیچ تبی
// هم رابط جدا لازم ندارد.
for (const [key, label] of Object.entries(SGROUPS)) {
  for (const d of CATALOG.filter((s) => s.group === key)) {
    TABS.push({
      id: d.id, title: d.name, section: label, phase: d.phase, def: d,
      mod: '/ui/tabs/strategy.mjs',
    });
  }
}
TABS.push({ id: 'positions', title: 'موقعیت‌های من', section: 'موقعیت من', phase: 7, mod: '/ui/tabs/positions.mjs' });
TABS.push({ id: 'roll', title: 'تحلیل رول', section: 'موقعیت من', phase: 7, mod: '/ui/tabs/roll.mjs' });

// ————————————————————————————————— فهرست کناری —————————————————————————————————
//
// سی‌وچهار تب در یک ستون، بدون کمک، یعنی پیمایش. سه چیز آن را قابل استفاده
// می‌کند: جست‌وجو که فهرست را کوتاه می‌کند، بخش‌های تاشو که آنچه امروز کار
// نداری را جمع می‌کند، و برچسب جهت هر استراتژی که بدون باز کردن تب می‌گوید
// صعودی است یا نزولی یا خنثی.
//
// حالت تاشو در حافظه مرورگر می‌ماند، وگرنه هر بار باز کردن صفحه از نو
// همان کار دستی را می‌خواهد.

const FOLD_KEY = 'rail:folded';
const loadFolded = () => {
  try { return new Set(JSON.parse(localStorage.getItem(FOLD_KEY) || '[]')); }
  catch { return new Set(); }
};
const folded = loadFolded();
const saveFolded = () => {
  try { localStorage.setItem(FOLD_KEY, JSON.stringify([...folded])); } catch { /* بی‌اهمیت */ }
};

/** جهت هر استراتژی، برای برچسب رنگی کنار نامش. */
function dirTone(def) {
  const d = String(def?.dir || '');
  if (/صعودی/.test(d)) return ['صعودی', 'up'];
  if (/نزولی/.test(d)) return ['نزولی', 'down'];
  if (/خنثی|بی‌جهت/.test(d)) return ['خنثی', 'flat'];
  if (/تلاطم/.test(d)) return ['تلاطم', 'vol'];
  return [null, null];
}

const norm = (s) => String(s || '').replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک').replace(/‌/g, ' ').trim();

let railQuery = '';
let railActiveId = null; // آیتم برجسته با صفحه‌کلید، جدا از تب باز (aria-current)

/** برجستگی صفحه‌کلید را روی دکمه‌ی متناظر می‌گذارد و در دید نگه می‌دارد. */
function setRailActive(id) {
  railActiveId = id;
  for (const b of el('rail-list').querySelectorAll('.tab-btn')) {
    b.setAttribute('data-kbd-active', b.dataset.tab === id ? '1' : '0');
  }
  if (id) el('rail-list').querySelector(`.tab-btn[data-tab="${id}"]`)?.scrollIntoView({ block: 'nearest' });
}

function buildRail() {
  const list = el('rail-list');
  const sections = [...new Set(TABS.map((t) => t.section))];
  const q = norm(railQuery).toLowerCase();

  const matches = (t) => {
    if (!q) return true;
    const hay = norm(`${t.title} ${t.section} ${t.def?.dir || ''} ${t.def?.note || ''}`).toLowerCase();
    return hay.includes(q);
  };

  let shown = 0;
  list.innerHTML = '';
  for (const sec of sections) {
    const tabs = TABS.filter((x) => x.section === sec && matches(x));
    if (!tabs.length) continue;
    shown += tabs.length;

    // جست‌وجو، تاشدگی را موقتاً باز می‌کند — وگرنه نتیجه پیدا شده پنهان می‌ماند
    const isFolded = !q && folded.has(sec);

    const grp = document.createElement('section');
    grp.className = 'rail-group';
    grp.dataset.folded = isFolded ? '1' : '0';

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'rail-head';
    head.setAttribute('aria-expanded', isFolded ? 'false' : 'true');
    head.innerHTML = `<span class="caret" aria-hidden="true"></span>
      <span class="rail-head-name">${sec}</span>
      <span class="rail-head-n">${faDigits(tabs.length)}</span>`;
    head.addEventListener('click', () => {
      if (folded.has(sec)) folded.delete(sec); else folded.add(sec);
      saveFolded();
      buildRail();
    });
    grp.appendChild(head);

    const items = document.createElement('div');
    items.className = 'rail-items';
    for (const t of tabs) {
      const b = document.createElement('button');
      b.className = 'tab-btn';
      b.type = 'button';
      b.dataset.tab = t.id;
      b.dataset.locked = t.mod ? '0' : '1';
      b.setAttribute('aria-current', current === t.id ? 'true' : 'false');
      const infeasible = t.def && !t.def.feasible;
      b.title = infeasible ? t.def.infeasibleWhy : (t.def?.note || t.def?.dir || t.title);
      const [tone, cls] = dirTone(t.def);
      // دو سطر: نام بالا، و زیرش برچسب‌های کوتاه.
      b.innerHTML = `
        <span class="tab-main">
          <span class="tab-name">${t.title}</span>
          ${infeasible ? '<span class="tab-flag" title="اجرا در تابلو ممکن نیست">⃰</span>' : ''}
        </span>
        <span class="tab-meta">
          ${tone ? `<span class="tone ${cls}">${tone}</span>` : ''}
          ${t.def?.legs?.length ? `<span class="phase">${faDigits(t.def.legs.length)} پا</span>` : ''}
        </span>`;
      b.addEventListener('click', () => open(t.id));
      items.appendChild(b);
    }
    grp.appendChild(items);
    list.appendChild(grp);
  }

  if (!shown) {
    list.innerHTML = '<p class="rail-none">چیزی پیدا نشد.</p>';
  }
  el('rail-count').textContent = q
    ? `${faDigits(shown)} از ${faDigits(TABS.length)}`
    : `${faDigits(TABS.length)} تب`;

  // اگر آیتم برجسته با فیلتر تازه دیگر دیده نیست، برجستگی به اولی برمی‌گردد
  const visibleIds = [...list.querySelectorAll('.tab-btn')].map((b) => b.dataset.tab);
  if (!visibleIds.includes(railActiveId)) railActiveId = visibleIds[0] || null;
  setRailActive(railActiveId);
}

let current = null;
let disposer = null;

async function open(id) {
  const t = TABS.find((x) => x.id === id);
  if (!t || current === id) return;
  if (disposer) { try { disposer(); } catch {} disposer = null; }
  current = id;
  for (const b of document.querySelectorAll('.tab-btn')) {
    b.setAttribute('aria-current', b.dataset.tab === id ? 'true' : 'false');
  }
  const stage = el('stage');
  stage.innerHTML = '<div class="empty"><p>در حال باز کردن…</p></div>';
  location.hash = id;

  try {
    const mod = t.mod ? await import(t.mod) : await import('/ui/tabs/soon.mjs');
    stage.innerHTML = '';
    disposer = await mod.mount(stage, { tab: t, state, api: { loadSettings, putSettings, subscribeWatch } });
  } catch (e) {
    stage.innerHTML = `<div class="card"><h3>تب باز نشد</h3><p class="note">${e.message}</p></div>`;
    console.error(e);
  }
}

// ————————————————————————————————— پوسته —————————————————————————————————

function applyTheme(name) {
  document.body.dataset.theme = name;
  localStorage.setItem('theme', name);
}
el('theme-btn').addEventListener('click', () => {
  applyTheme(document.body.dataset.theme === 'ledger' ? 'board' : 'ledger');
});

el('detail-btn').addEventListener('click', (e) => {
  const panel = el('health-detail');
  const open = panel.hasAttribute('hidden');
  panel.toggleAttribute('hidden', !open);
  e.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
});

el('rail-q').addEventListener('input', (e) => {
  railQuery = e.target.value;
  buildRail();
});

// میان‌بر صفحه‌کلید: بالا و پایین بین تب‌های فیلترشده، اینتر همان یکی را باز
// می‌کند. آیتم برجسته با شناسه نگه داشته می‌شود نه اندیس، چون فهرست با هر
// تایپ از نو ساخته می‌شود.
el('rail-q').addEventListener('keydown', (e) => {
  const visible = [...el('rail-list').querySelectorAll('.tab-btn')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!visible.length) return;
    let idx = visible.findIndex((b) => b.dataset.tab === railActiveId);
    idx = e.key === 'ArrowDown'
      ? Math.min(idx < 0 ? 0 : idx + 1, visible.length - 1)
      : Math.max(idx < 0 ? visible.length - 1 : idx - 1, 0);
    setRailActive(visible[idx].dataset.tab);
    return;
  }
  if (e.key !== 'Enter') return;
  const target = visible.find((b) => b.dataset.tab === railActiveId) || visible[0];
  if (target) open(target.dataset.tab);
});

// `/` یا Ctrl+K نشانگر را داخل جست‌وجوی فهرست می‌برد، هرجای صفحه که باشی —
// جز وقتی همین حالا داخل یک ورودی دیگر تایپ می‌کنی، وگرنه «/» در آن ورودی
// نوشته نمی‌شود.
document.addEventListener('keydown', (e) => {
  const isCombo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
  if (!isCombo && e.key !== '/') return;
  const t = document.activeElement;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (e.key === '/' && typing) return;
  e.preventDefault();
  const q = el('rail-q');
  q.focus();
  q.select();
});

// ————————————————————————————————— شروع —————————————————————————————————

applyTheme(localStorage.getItem('theme') || 'ledger');
buildRail();
await loadSettings();
applyTheme(localStorage.getItem('theme') || state.settings.theme || 'ledger');
tickHealth();
setInterval(tickHealth, 3000);

const hash = location.hash.replace('#', '');
if (hash && TABS.some((t) => t.id === hash)) open(hash);
