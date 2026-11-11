(() => {
  'use strict';

  const STORE_KEY = 'spend.notes.v1';
  const THEME_KEY = 'spend.theme';
  const MAX_INT_DIGITS = 5;

  const $ = (s) => document.querySelector(s);
  const els = {
    list: $('#list'), empty: $('#empty'), count: $('#count'),
    summaryTotal: $('#summaryTotal'), summarySub: $('#summarySub'),
    entryOverlay: $('#entryOverlay'), entryTitle: $('#entryTitle'), entryDate: $('#entryDate'),
    amount: $('#amountDisplay'), desc: $('#descInput'), chips: $('#chips'),
    keypad: $('#keypad'), save: $('#saveBtn'), del: $('#deleteNoteBtn'),
    exportOverlay: $('#exportOverlay'), preview: $('#exportPreview'),
    confirmOverlay: $('#confirmOverlay'), confirmText: $('#confirmText'),
    toast: $('#toast'), toastText: $('#toastText'), toastAction: $('#toastAction'),
    themeMeta: document.querySelector('meta[name="theme-color"]'),
  };

  /* ══════════ STOCKAGE ══════════ */
  // Une note = { id, cents (entier), desc, date (ISO) }
  let notes = load();

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((n) => n && Number.isInteger(n.cents) && n.date) : [];
    } catch (e) { return []; }
  }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(notes)); }
    catch (e) { toast('Impossible de sauvegarder sur cet appareil'); }
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ══════════ FORMATAGE ══════════ */
  const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const fmt = (cents) => euro.format(cents / 100).replace(/ /g, ' ');
  const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dayYearFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fullFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function dayLabel(d) {
    const now = new Date();
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (dayKey(d) === dayKey(now)) return "Aujourd'hui";
    if (dayKey(d) === dayKey(y)) return 'Hier';
    return cap((d.getFullYear() === now.getFullYear() ? dayFmt : dayYearFmt).format(d));
  }

  /* ══════════ RENDU ══════════ */
  function render() {
    const sorted = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date));
    els.count.textContent = notes.length;
    els.empty.hidden = notes.length > 0;
    $('#resetBtn').hidden = notes.length === 0;

    // Résumé du mois en cours
    const now = new Date();
    const month = notes.filter((n) => { const d = new Date(n.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const monthTotal = month.reduce((s, n) => s + n.cents, 0);
    $('#summaryLabel').textContent = cap(monthFmt.format(now));
    els.summaryTotal.textContent = fmt(monthTotal);
    els.summarySub.textContent = month.length === 0 ? 'Aucune dépense ce mois-ci'
      : `${month.length} dépense${month.length > 1 ? 's' : ''}`;

    // Groupes par jour
    const groups = [];
    for (const n of sorted) {
      const d = new Date(n.date);
      const k = dayKey(d);
      let g = groups[groups.length - 1];
      if (!g || g.key !== k) { g = { key: k, date: d, items: [], total: 0 }; groups.push(g); }
      g.items.push(n); g.total += n.cents;
    }

    els.list.innerHTML = groups.map((g) => `
      <div class="group">
        <div class="group-head"><span>${esc(dayLabel(g.date))}</span><b>${fmt(g.total)}</b></div>
        <div class="group-card glass">
          ${g.items.map((n) => `
            <button class="item" data-id="${n.id}">
              <span class="item-icon">${esc((n.desc || '€').trim().charAt(0).toUpperCase() || '€')}</span>
              <span class="item-main">
                <span class="item-desc${n.desc ? '' : ' none'}">${n.desc ? esc(n.desc) : 'Sans description'}</span>
                <span class="item-time">${timeFmt.format(new Date(n.date))}</span>
              </span>
              <span class="item-amount">${fmt(n.cents)}</span>
            </button>`).join('')}
        </div>
      </div>`).join('');
  }

  els.list.addEventListener('click', (e) => {
    const btn = e.target.closest('.item');
    if (btn) openEntry(btn.dataset.id);
  });

  /* ══════════ OVERLAYS ══════════ */
  let openCount = 0;
  function openOverlay(o) {
    o.classList.add('open'); o.setAttribute('aria-hidden', 'false');
    openCount++; document.body.classList.add('locked');
  }
  function closeOverlay(o) {
    if (!o.classList.contains('open')) return;
    o.classList.remove('open'); o.setAttribute('aria-hidden', 'true');
    openCount = Math.max(0, openCount - 1);
    if (!openCount) document.body.classList.remove('locked');
    if (o === els.entryOverlay) els.desc.blur();
  }
  document.querySelectorAll('.overlay').forEach((o) => {
    o.addEventListener('click', (e) => {
      if (e.target === o || e.target.closest('[data-close]')) closeOverlay(o);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.overlay.open').forEach(closeOverlay);
  });

  /* ══════════ SAISIE ══════════ */
  let amt = '';        // chaîne brute : "12", "12.", "12.5", "12.50"
  let editingId = null;

  function centsFromAmt() {
    if (!amt) return 0;
    const [i, f = ''] = amt.split('.');
    return parseInt(i || '0', 10) * 100 + parseInt((f + '00').slice(0, 2), 10);
  }
  function amtFromCents(c) {
    const i = Math.floor(c / 100), f = c % 100;
    return f === 0 ? String(i) : `${i}.${String(f).padStart(2, '0')}`;
  }

  function renderAmount() {
    const [i, f] = amt.split('.');
    const intPart = (i || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const intHtml = amt ? intPart : `<span class="ghost">0</span>`;
    let decHtml;
    if (f === undefined) decHtml = `<span class="ghost">,00</span>`;
    else decHtml = `,${f}<span class="ghost">${'0'.repeat(2 - f.length)}</span>`;
    els.amount.innerHTML = `${intHtml}${decHtml}<span class="cur">€</span>`;
    // ajuste la taille si le montant est long
    const len = intPart.length + 3;
    els.amount.style.fontSize = len > 9 ? '44px' : '';
    els.save.disabled = centsFromAmt() === 0;
  }

  function shake() {
    els.amount.classList.remove('shake'); void els.amount.offsetWidth; els.amount.classList.add('shake');
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function press(k) {
    if (k === 'back') { amt = amt.slice(0, -1); if (amt === '0') amt = ''; }
    else if (k === '.') {
      if (amt.includes('.')) return shake();
      amt = (amt || '0') + '.';
    } else {
      const [i, f] = amt.split('.');
      if (f !== undefined) { if (f.length >= 2) return shake(); amt += k; }
      else {
        if ((i || '').length >= MAX_INT_DIGITS) return shake();
        amt = (amt === '0' || amt === '') ? (k === '0' ? '0' : k) : amt + k;
      }
    }
    renderAmount();
  }

  // Pavé : pointerdown pour la réactivité, sans voler le focus
  let backTimer = null;
  els.keypad.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    e.preventDefault();
    b.classList.add('pressed');
    press(b.dataset.k);
    if (b.dataset.k === 'back') {
      backTimer = setTimeout(() => { amt = ''; renderAmount(); if (navigator.vibrate) navigator.vibrate(15); }, 550);
    }
  });
  const release = () => {
    clearTimeout(backTimer);
    els.keypad.querySelectorAll('.pressed').forEach((b) => b.classList.remove('pressed'));
  };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => els.keypad.addEventListener(ev, release));
  els.keypad.addEventListener('click', (e) => e.preventDefault());

  // Clavier physique (ordinateur)
  document.addEventListener('keydown', (e) => {
    if (!els.entryOverlay.classList.contains('open')) return;
    if (document.activeElement === els.desc) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
    else if (e.key === '.' || e.key === ',') { press('.'); e.preventDefault(); }
    else if (e.key === 'Backspace') { press('back'); e.preventDefault(); }
    else if (e.key === 'Enter') { save(); e.preventDefault(); }
    else if (e.key.length === 1 && /\S/.test(e.key)) { els.desc.focus(); }
  });

  els.desc.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (centsFromAmt() > 0) save(); else { els.desc.blur(); shake(); } }
  });

  function renderChips() {
    // descriptions les plus fréquentes
    const freq = new Map();
    for (const n of notes) {
      const d = (n.desc || '').trim();
      if (!d) continue;
      const k = d.toLowerCase();
      const cur = freq.get(k) || { label: d, count: 0, last: 0 };
      cur.count++; cur.last = Math.max(cur.last, +new Date(n.date));
      freq.set(k, cur);
    }
    const top = [...freq.values()].sort((a, b) => b.count - a.count || b.last - a.last).slice(0, 8);
    els.chips.innerHTML = top.map((c) => `<button class="chip" type="button">${esc(c.label)}</button>`).join('');
  }
  els.chips.addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (c) { els.desc.value = c.textContent; }
  });

  function openEntry(id = null) {
    editingId = id;
    const n = id ? notes.find((x) => x.id === id) : null;
    amt = n ? amtFromCents(n.cents) : '';
    els.desc.value = n ? n.desc : '';
    els.entryTitle.textContent = n ? 'Modifier la dépense' : 'Nouvelle dépense';
    els.entryDate.textContent = n ? `Notée le ${fullFmt.format(new Date(n.date))} à ${timeFmt.format(new Date(n.date))}` : '';
    els.del.hidden = !n;
    els.save.textContent = n ? 'Mettre à jour' : 'Enregistrer';
    renderChips();
    renderAmount();
    openOverlay(els.entryOverlay);
  }

  function save() {
    const cents = centsFromAmt();
    if (!cents) return shake();
    const desc = els.desc.value.trim();
    let id = editingId;
    if (editingId) {
      const n = notes.find((x) => x.id === editingId);
      if (n) { n.cents = cents; n.desc = desc; }
      toast('Dépense mise à jour');
    } else {
      id = uid();
      notes.push({ id, cents, desc, date: new Date().toISOString() });
      toast(`${fmt(cents)} enregistré`);
    }
    persist(); render();
    closeOverlay(els.entryOverlay);
    const el = els.list.querySelector(`[data-id="${id}"]`);
    if (el) el.classList.add('flash');
  }

  els.save.addEventListener('click', save);
  $('#addBtn').addEventListener('click', () => openEntry());

  els.del.addEventListener('click', () => {
    const idx = notes.findIndex((x) => x.id === editingId);
    if (idx < 0) return;
    const [removed] = notes.splice(idx, 1);
    persist(); render();
    closeOverlay(els.entryOverlay);
    toast('Dépense supprimée', () => { notes.push(removed); persist(); render(); });
  });

  /* ══════════ EXPORT ══════════ */
  function buildExport() {
    const sorted = [...notes].sort((a, b) => new Date(a.date) - new Date(b.date));
    const total = sorted.reduce((s, n) => s + n.cents, 0);
    const lines = sorted.map((n) => {
      const d = new Date(n.date);
      return `• ${fmt(n.cents)} — ${n.desc || 'Sans description'} — ${fullFmt.format(d)} ${timeFmt.format(d)}`;
    });
    return [
      `💸 Mes dépenses (${sorted.length})`,
      '',
      ...lines,
      '',
      `Total : ${fmt(total)}`,
    ].join('\n');
  }

  $('#exportBtn').addEventListener('click', () => {
    if (!notes.length) return toast('Aucune dépense à exporter');
    els.preview.textContent = buildExport();
    openOverlay(els.exportOverlay);
  });

  $('#waBtn').addEventListener('click', () => {
    window.location.href = 'https://wa.me/?text=' + encodeURIComponent(buildExport());
  });

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove(); return ok;
    }
  }
  $('#copyBtn').addEventListener('click', async () => {
    const ok = await copyText(buildExport());
    toast(ok ? 'Copié dans le presse-papiers' : 'Copie impossible');
  });

  const shareBtn = $('#shareBtn');
  if (navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', async () => {
      try { await navigator.share({ text: buildExport() }); } catch (e) { /* annulé */ }
    });
  }

  /* ══════════ RESET ══════════ */
  $('#resetBtn').addEventListener('click', () => {
    const total = notes.reduce((s, n) => s + n.cents, 0);
    els.confirmText.textContent = `Les ${notes.length} dépense${notes.length > 1 ? 's' : ''} (${fmt(total)}) seront supprimées.`;
    openOverlay(els.confirmOverlay);
  });
  $('#confirmResetBtn').addEventListener('click', () => {
    const backup = notes;
    notes = []; persist(); render();
    closeOverlay(els.confirmOverlay);
    toast('Liste vidée', () => { notes = backup; persist(); render(); });
  });

  /* ══════════ TOAST ══════════ */
  let toastTimer = null, toastUndo = null;
  function toast(msg, undo = null) {
    els.toastText.textContent = msg;
    toastUndo = undo;
    els.toastAction.hidden = !undo;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.classList.remove('show'); toastUndo = null; }, undo ? 5000 : 2200);
  }
  els.toastAction.addEventListener('click', () => {
    if (toastUndo) toastUndo();
    toastUndo = null;
    els.toast.classList.remove('show');
  });

  /* ══════════ THÈME ══════════ */
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  function getTheme() { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; } }
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    document.querySelectorAll('[data-theme-opt]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeOpt === t)));
    const dark = t === 'dark' || (t === 'auto' && mq.matches);
    els.themeMeta.setAttribute('content', dark ? '#07080f' : '#eef0f8');
  }
  document.querySelectorAll('[data-theme-opt]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.themeOpt;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    applyTheme(t);
  }));
  mq.addEventListener?.('change', () => applyTheme(getTheme()));
  applyTheme(getTheme());

  /* ══════════ INIT ══════════ */
  render();
  // Rafraîchit les libellés "Aujourd'hui / Hier" quand on revient sur l'app
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
