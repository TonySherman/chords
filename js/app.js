/* Chordbook main application: routing, views and state */
(function () {
  const T = window.Theory;
  const DATA = window.CHORD_DATA;
  const VID = window.VIDEOS || { chords: {}, families: {}, general: null };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const main = $('#main');

  /* ---------- persistence ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cb.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('cb.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const settings = Object.assign({ theme: 'auto', lefty: false, labels: 'fingers', sound: true, flats: 'auto' }, store.get('settings', {}));
  let favorites = store.get('favorites', []);
  let recents = store.get('recents', []);
  let progression = store.get('progression', []);
  const saveSettings = () => store.set('settings', settings);

  /* ---------- icons ---------- */
  const I = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
    heartFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 7 5.5Z"/></svg>',
    arp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17h4l3-10 3 6 2-3h4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
    yt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6.5v11l9-5.5-9-5.5Z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>',
    guitar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m20 4-6 6"/><path d="M9 11a5 5 0 0 0-5 5c0 2.5 2 4 4.5 4a5 5 0 0 0 3.5-1.5c1-1 1-2.5 2.5-3.5s2.5-1.5 2.5-3-1-3-3-3-3 2-3.5 3"/></svg>',
  };

  /* ---------- helpers ---------- */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const key = (r, s) => r + '|' + s;
  const href = (r, s, i) => `#/chord/${encodeURIComponent(r)}/${encodeURIComponent(s)}${i != null ? '/' + (i + 1) : ''}`;
  const symHtml = (r, s) => esc(T.chordSymbol(r, s)).replace(/#/g, '♯').replace(/([A-G])b(?![a-z0-9])/g, '$1♭');
  const rootHtml = r => esc(r).replace('#', '♯').replace(/b$/, '♭');
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1800);
  }
  function voicings(r, s) { return (DATA[r] && DATA[r][s]) || []; }
  function chordExists(r, s) { return voicings(r, s).length > 0; }
  function suffixesFor(root) {
    const all = Object.keys(DATA[root] || {});
    const order = T.TYPE_ORDER;
    return all.sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      const ga = T.GROUP_ORDER.indexOf(T.typeInfo(a).group), gb = T.GROUP_ORDER.indexOf(T.typeInfo(b).group);
      if (ga !== gb) return ga - gb;
      if (ia !== ib) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      return a.localeCompare(b);
    });
  }
  function diagramOpts(root, extra = {}) {
    return Object.assign({ lefty: settings.lefty, labels: settings.labels, root }, extra);
  }
  function cardHtml(r, s, opts = {}) {
    const v = voicings(r, s)[opts.vi || 0];
    if (!v) return '';
    const info = T.typeInfo(s);
    return `<a class="chord-card${opts.selected ? ' selected' : ''}" href="${href(r, s, opts.vi)}" data-key="${esc(key(r, s))}">
      ${opts.badge ? `<span class="badge">${esc(opts.badge)}</span>` : ''}
      ${window.Diagram.render(v, diagramOpts(r, { size: 'sm', title: T.chordLongName(r, s), hideNotes: true }))}
      <div class="name">${symHtml(r, s)}</div>
      <div class="meta">${esc(opts.meta != null ? opts.meta : info.name)}</div></a>`;
  }
  function pushRecent(r, s) {
    const k = key(r, s);
    recents = [k, ...recents.filter(x => x !== k)].slice(0, 12);
    store.set('recents', recents);
  }
  const isFav = (r, s) => favorites.includes(key(r, s));
  function toggleFav(r, s) {
    const k = key(r, s);
    favorites = isFav(r, s) ? favorites.filter(x => x !== k) : [k, ...favorites];
    store.set('favorites', favorites);
    toast(isFav(r, s) ? 'Saved to favourites' : 'Removed from favourites');
  }
  function haptic() { if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* noop */ } } }

  /* ---------- theme ---------- */
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  function applyTheme() {
    let t = settings.theme;
    if (t === 'auto') t = mq.matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    $('meta[name=theme-color]').setAttribute('content', t === 'light' ? '#f6f1e8' : '#14110f');
  }
  mq.addEventListener && mq.addEventListener('change', applyTheme);
  applyTheme();

  /* ---------- search ---------- */
  const WORDS = [
    [/\bminor\b|\bmin\b/g, 'm'], [/\bmajor\b|\bmaj\b/g, 'maj'], [/\bseventh\b|\bseven\b/g, '7'], [/\bninth\b|\bnine\b/g, '9'], [/\bsixth\b|\bsix\b/g, '6'],
    [/\beleventh\b|\beleven\b/g, '11'], [/\bthirteenth\b|\bthirteen\b/g, '13'], [/\bsharp\b/g, '#'], [/\bflat\b/g, 'b'], [/\bdiminished\b/g, 'dim'], [/\baugmented\b/g, 'aug'],
    [/\bsuspended\b/g, 'sus'], [/\bpower( chord)?\b/g, '5'], [/\bhalf[- ]?dim(inished)?\b/g, 'm7b5'], [/\bdominant\b/g, ''], [/\bchords?\b/g, ''], [/\bover\b/g, '/'], [/\badded\b/g, 'add'],
    [/\bmajorseven\b/g, 'maj7'], [/hendrix/g, '7#9'],
  ];
  const aliasIndex = (() => {
    const idx = new Map();
    for (const s in T.TYPES) for (const a of T.TYPES[s].alias) idx.set(norm(a), s);
    idx.set('maj', 'major'); idx.set('major', 'major');
    return idx;
  })();
  function norm(s) { return String(s).toLowerCase().replace(/[\s()]/g, '').replace(/♯/g, '#').replace(/♭/g, 'b').replace(/°/g, 'dim').replace(/ø/g, 'm7b5').replace(/Δ/g, 'maj').replace(/\+/g, 'aug'); }
  function search(q) {
    let s = q.toLowerCase().trim();
    if (!s) return [];
    for (const [re, rep] of WORDS) s = s.replace(re, rep);
    s = norm(s);
    const results = [];
    const m = s.match(/^([a-g])(#|b)?/);
    if (m) {
      let root = m[1].toUpperCase() + (m[2] || '');
      const dk = T.toDataKey(root);
      let rest = s.slice(m[0].length);
      if (dk) {
        // slash chord?
        let bass = null;
        const sm = rest.match(/^(m)?\/([a-g])(#|b)?$/);
        if (sm) { bass = T.pc(sm[2].toUpperCase() + (sm[3] || '')); rest = sm[1] || ''; }
        const sufs = suffixesFor(dk);
        if (bass != null) {
          for (const sf of sufs) if (T.isSlash(sf)) { const p = T.parseSlash(sf); if (T.pc(p.bass) === bass && ((rest === 'm') === (p.quality === 'minor'))) results.push({ root: dk, suffix: sf, score: 100 }); }
          if (!results.length) { // fall back to the plain chord
            results.push({ root: dk, suffix: rest === 'm' ? 'minor' : 'major', score: 60, note: 'No slash voicing in library' });
          }
          return results;
        }
        const exact = aliasIndex.get(rest);
        if (rest === '') {
          for (const sf of sufs) results.push({ root: dk, suffix: sf, score: sf === 'major' ? 100 : sf === 'minor' ? 90 : 50 - sufs.indexOf(sf) * 0.1 });
        } else {
          for (const sf of sufs) {
            const info = T.typeInfo(sf);
            const names = info.alias.map(norm).concat([norm(info.label), norm(sf)]);
            let sc = 0;
            if (exact === sf || names.includes(rest)) sc = 100;
            else if (names.some(n => n.startsWith(rest))) sc = 70;
            else if (names.some(n => n.includes(rest) && rest.length > 1)) sc = 40;
            else if (norm(info.name).includes(rest) && rest.length > 2) sc = 35;
            if (sc) results.push({ root: dk, suffix: sf, score: sc });
          }
        }
      }
    }
    if (!results.length) {
      // No root: match type name across all roots
      for (const sf of T.TYPE_ORDER) {
        const info = T.TYPES[sf];
        const names = info.alias.map(norm).concat([norm(info.label), norm(info.name), norm(sf)]);
        let sc = 0;
        if (names.includes(s)) sc = 90; else if (names.some(n => n && n.startsWith(s))) sc = 60; else if (norm(info.name).includes(s) && s.length > 2) sc = 40;
        if (sc) for (const r of T.DATA_KEYS) if (chordExists(r, sf)) results.push({ root: r, suffix: sf, score: sc - T.DATA_KEYS.indexOf(r) * 0.01 });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 48);
  }

  /* ---------- router ---------- */
  function parseHash() {
    const h = (location.hash || '#/').replace(/^#/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const params = new URLSearchParams(qs || '');
    return { parts, params, path };
  }
  let currentPath = null;
  function navigate(hash) { location.hash = hash; }
  function route() {
    const { parts, params, path } = parseHash();
    const view = parts[0] || 'home';
    const samePath = currentPath === path;
    currentPath = path;
    // nav highlighting
    const navKey = view === 'chord' || view === 'root' || view === 'type' || view === 'search' ? 'home' : view;
    $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === navKey));
    if (view !== 'search') { $('#searchInput').value = ''; $('#searchClear').hidden = true; }
    switch (view) {
      case 'home': renderHome(); break;
      case 'root': renderRoot(parts[1]); break;
      case 'type': renderType(parts[1]); break;
      case 'chord': renderChord(parts[1], parts[2], parseInt(parts[3] || '1', 10) - 1); break;
      case 'search': renderSearch(params.get('q') || ''); break;
      case 'finder': renderFinder(); break;
      case 'progression': renderProgression(); break;
      case 'favorites': renderFavorites(); break;
      case 'settings': renderSettings(); break;
      default: renderHome();
    }
    if (!samePath) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------- views ---------- */
  const COMMON = [['C', 'major'], ['D', 'major'], ['E', 'major'], ['G', 'major'], ['A', 'major'], ['A', 'minor'], ['E', 'minor'], ['D', 'minor'], ['F', 'major'], ['B', '7'], ['E', '7'], ['A', '7'], ['D', '7'], ['G', '7'], ['C', 'maj7'], ['F', 'maj7'], ['A', 'm7'], ['E', 'm7'], ['D', 'sus2'], ['A', 'sus2'], ['C', 'add9'], ['B', 'minor'], ['F#', 'minor'], ['Bb', 'major']];

  function renderHome() {
    const recentHtml = recents.length ? `<section class="section"><div class="section-head"><h2>Recently viewed</h2><button class="link" id="clearRecents">Clear</button></div>
      <div class="hscroll">${recents.map(k => { const [r, s] = k.split('|'); return `<a class="chip" href="${href(r, s)}">${symHtml(r, s)}</a>`; }).join('')}</div></section>` : '';
    main.innerHTML = `<div class="view">
      <div class="hero"><h1 class="display">Chord<span>book</span></h1><p>Every guitar chord, every variation. Tap a root note or search above.</p></div>
      <div id="installSlot"></div>
      ${recentHtml}
      <section class="section"><div class="section-head"><h2>Pick a root</h2></div>
        <div class="roots">${T.DATA_KEYS.map(r => `<a class="root-btn" href="#/root/${encodeURIComponent(r)}">${rootHtml(r)}${enh(r)}</a>`).join('')}</div></section>
      <section class="section"><div class="section-head"><h2>Start here</h2><span class="blurb" style="margin:0">The first chords everyone learns</span></div>
        <div class="card-grid">${COMMON.slice(0, 12).map(([r, s]) => cardHtml(r, s)).join('')}</div>
        <div class="chips" style="margin-top:10px">${COMMON.slice(12).map(([r, s]) => `<a class="chip" href="${href(r, s)}">${symHtml(r, s)}</a>`).join('')}</div></section>
      <section class="section"><div class="section-head"><h2>Browse by type</h2></div>
        <div class="type-list">${T.GROUP_ORDER.map(g => {
          const types = T.TYPE_ORDER.filter(s => T.TYPES[s].group === g);
          if (g === 'Slash chords') return `<a class="type-row" href="#/type/slash"><span class="sym">C/E</span><span class="desc"><b>${g}</b>${T.GROUP_BLURB[g]}</span>${I.chev}</a>`;
          return `<div class="section" style="margin-top:8px"><div class="blurb"><b style="color:var(--text)">${g}</b> · ${T.GROUP_BLURB[g]}</div>
            <div class="chips">${types.map(s => `<a class="chip" href="#/type/${encodeURIComponent(s)}">${T.TYPES[s].label ? esc(T.TYPES[s].label) : 'Major'}<span class="sub">${esc(T.TYPES[s].name.replace(/\s*\(.*\)/, ''))}</span></a>`).join('')}</div></div>`;
        }).join('')}</div></section>
    </div>`;
    const cr = $('#clearRecents'); if (cr) cr.onclick = () => { recents = []; store.set('recents', []); renderHome(); };
    renderInstallBanner();
  }
  function enh(r) { const alt = { 'C#': 'Db', 'Eb': 'D#', 'F#': 'Gb', 'Ab': 'G#', 'Bb': 'A#' }[r]; return alt ? `<small>${rootHtml(alt)}</small>` : ''; }

  function renderRoot(root) {
    const dk = T.toDataKey(root);
    if (!dk) return renderHome();
    const sufs = suffixesFor(dk);
    const groups = {};
    for (const s of sufs) (groups[T.typeInfo(s).group] = groups[T.typeInfo(s).group] || []).push(s);
    main.innerHTML = `<div class="view">
      <div class="back-row"><button id="back">${I.back}Home</button></div>
      <div class="detail-head"><div><h1 class="chord-title display">${rootHtml(dk)}${enh(dk) ? `<span class="sfx" style="color:var(--muted)"> / ${rootHtml({ 'C#': 'Db', 'Eb': 'D#', 'F#': 'Gb', 'Ab': 'G#', 'Bb': 'A#' }[dk])}</span>` : ''}</h1><div class="detail-sub">${sufs.length} chord types · ${sufs.reduce((n, s) => n + voicings(dk, s).length, 0)} voicings</div></div></div>
      <div class="hscroll" style="margin-top:12px">${T.DATA_KEYS.map(r => `<a class="chip${r === dk ? ' selected' : ''}" href="#/root/${encodeURIComponent(r)}">${rootHtml(r)}</a>`).join('')}</div>
      ${T.GROUP_ORDER.filter(g => groups[g]).map(g => `<section class="section"><div class="section-head"><h2>${g}</h2></div><p class="blurb">${T.GROUP_BLURB[g]}</p>
        <div class="card-grid">${groups[g].map(s => cardHtml(dk, s)).join('')}</div></section>`).join('')}
    </div>`;
    $('#back').onclick = () => navigate('#/');
  }

  function renderType(suffix) {
    const isSlash = suffix === 'slash';
    const info = isSlash ? null : T.typeInfo(suffix);
    if (!isSlash && !T.TYPES[suffix]) return renderHome();
    let cards;
    if (isSlash) {
      cards = [];
      for (const r of T.DATA_KEYS) for (const s of suffixesFor(r)) if (T.isSlash(s)) cards.push(cardHtml(r, s));
    } else {
      cards = T.DATA_KEYS.filter(r => chordExists(r, suffix)).map(r => cardHtml(r, suffix));
    }
    main.innerHTML = `<div class="view">
      <div class="back-row"><button id="back">${I.back}Home</button></div>
      <div class="detail-head"><div><h1 class="chord-title display" style="font-size:clamp(34px,9vw,48px)">${isSlash ? 'Slash chords' : esc(info.name)}</h1>
      <div class="detail-sub">${isSlash ? T.GROUP_BLURB['Slash chords'] : `Formula: ${esc(info.formula)} · ${esc(info.group)}`}</div></div></div>
      ${isSlash ? '' : `<div class="hscroll" style="margin-top:12px">${T.TYPE_ORDER.filter(s => T.TYPES[s].group === info.group).map(s => `<a class="chip${s === suffix ? ' selected' : ''}" href="#/type/${encodeURIComponent(s)}">${T.TYPES[s].label ? esc(T.TYPES[s].label) : 'Major'}</a>`).join('')}</div>`}
      <section class="section"><div class="card-grid">${cards.join('')}</div></section>
    </div>`;
    $('#back').onclick = () => navigate('#/');
  }

  function renderSearch(q) {
    const input = $('#searchInput');
    if (input.value !== q) input.value = q;
    $('#searchClear').hidden = !q;
    const res = search(q);
    if (!q) {
      main.innerHTML = `<div class="view"><div class="empty">${I.search}<b>Search any chord</b>Try “Am7”, “F sharp minor”, “Csus4”, “power chord” or “D/F#”.</div>
        <section class="section"><div class="section-head"><h2>Popular searches</h2></div><div class="chips">${['Am7', 'F#m', 'Cadd9', 'Bm', 'G/B', 'E7#9', 'Dsus4', 'Bb', 'Fmaj7', 'C#m7', 'Asus2', 'power chord'].map(x => `<a class="chip" href="#/search?q=${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div></section></div>`;
      return;
    }
    if (!res.length) {
      main.innerHTML = `<div class="view"><div class="empty">${I.guitar}<b>No chords match “${esc(q)}”</b>Check the spelling, or try a root note like “E” or a type like “sus4”.</div></div>`;
      return;
    }
    const best = res[0];
    main.innerHTML = `<div class="view">
      <div class="section-head" style="margin-top:14px"><h2>${res.length} result${res.length === 1 ? '' : 's'} for “${esc(q)}”</h2></div>
      ${best.note ? `<p class="blurb">${esc(best.note)} — showing the closest chord.</p>` : ''}
      <div class="card-grid">${res.map((x, i) => cardHtml(x.root, x.suffix, { badge: i === 0 && x.score >= 100 ? 'Best match' : null })).join('')}</div>
    </div>`;
  }

  /* ---- chord detail ---- */
  let playingTimer = null;
  function renderChord(root, suffix, vi) {
    const dk = T.toDataKey(root) || root;
    const vs = voicings(dk, suffix);
    if (!vs.length) { main.innerHTML = `<div class="view"><div class="empty">${I.guitar}<b>Chord not found</b><a href="#/">Back to the library</a></div></div>`; return; }
    if (!(vi >= 0 && vi < vs.length)) vi = 0;
    pushRecent(dk, suffix);
    const info = T.typeInfo(suffix);
    const notes = T.chordNotes(dk, suffix);
    const degrees = info.formula.split(' ');
    const sufs = suffixesFor(dk);
    const sameType = T.DATA_KEYS.filter(r => r !== dk && chordExists(r, suffix));
    const video = findVideo(dk, suffix);
    main.innerHTML = `<div class="view" id="chordView">
      <div class="back-row"><button id="back">${I.back}Back</button></div>
      <div class="detail-head">
        <div><h1 class="chord-title display">${rootHtml(dk)}<span class="sfx">${esc(info.label).replace(/#/g, '♯')}</span></h1>
          <div class="detail-sub">${esc(T.chordLongName(dk, suffix))} · ${vs.length} voicing${vs.length === 1 ? '' : 's'}</div></div>
        <div class="detail-actions">
          <button class="icon-btn${isFav(dk, suffix) ? ' active' : ''}" id="favBtn" aria-label="Save to favourites" aria-pressed="${isFav(dk, suffix)}">${isFav(dk, suffix) ? I.heartFill : I.heart}</button>
          <button class="icon-btn" id="shareBtn" aria-label="Share chord">${I.share}</button>
        </div>
      </div>
      <div class="carousel" id="carousel">${vs.map((v, i) => `<div class="voicing-card" data-i="${i}">
          <div class="voicing-top"><span class="idx">Voicing ${i + 1} of ${vs.length}</span><span class="tags">${T.voicingTags(v).map(t => `<span class="tag${t === 'Open' || t === 'Easy' ? ' accent' : ''}">${esc(t)}</span>`).join('')}</span></div>
          ${window.Diagram.render(v, diagramOpts(dk, { title: T.chordLongName(dk, suffix) + ' voicing ' + (i + 1) }))}
        </div>`).join('')}</div>
      <div class="dots" id="dots">${vs.map((_, i) => `<button aria-label="Voicing ${i + 1}" data-i="${i}" class="${i === vi ? 'on' : ''}"></button>`).join('')}</div>
      <div class="play-row">
        <button class="btn primary" id="playBtn">${I.play}Play</button>
        <button class="btn" id="arpBtn">${I.arp}Arpeggio</button>
        <button class="btn small" id="addProgBtn" aria-label="Add to progression">${I.plus}</button>
      </div>
      <section class="section">
        <div class="info-grid">
          <div class="info" style="grid-column:1/-1"><div class="k">Notes</div><div class="notes-row">${notes.map((n, i) => `<span class="note-pill${i === 0 ? ' root' : ''}">${rootHtml(n)}<small>${esc(degrees[i] || '')}</small></span>`).join('')}</div></div>
          <div class="info"><div class="k">Formula</div><div class="v">${esc(info.formula)}</div></div>
          <div class="info"><div class="k">Type</div><div class="v">${esc(info.name)}</div></div>
          <div class="info" style="grid-column:1/-1"><div class="k">This voicing</div><div class="v" id="voicingNotes"></div></div>
        </div>
      </section>
      ${vs.length > 1 ? `<section class="section"><div class="section-head"><h2>All voicings</h2></div><div class="thumbs" id="thumbs">${vs.map((v, i) => `<button class="thumb${i === vi ? ' on' : ''}" data-i="${i}">${window.Diagram.render(v, diagramOpts(dk, { size: 'sm', hideNotes: true, labels: 'none' }))}<div class="lbl">${v.b > 1 ? v.b + 'fr' : 'Open'}</div></button>`).join('')}</div></section>` : ''}
      <section class="section" id="videoSection">${videoHtml(video, dk, suffix)}</section>
      <section class="section"><div class="section-head"><h2>${rootHtml(dk)} chords</h2><a href="#/root/${encodeURIComponent(dk)}">See all</a></div>
        <div class="hscroll">${sufs.filter(s => s !== suffix).slice(0, 14).map(s => `<a class="chip" href="${href(dk, s)}">${symHtml(dk, s)}</a>`).join('')}</div></section>
      ${sameType.length ? `<section class="section"><div class="section-head"><h2>Other ${esc(info.name)} chords</h2>${T.TYPES[suffix] ? `<a href="#/type/${encodeURIComponent(suffix)}">See all</a>` : ''}</div>
        <div class="hscroll">${sameType.map(r => `<a class="chip" href="${href(r, suffix)}">${symHtml(r, suffix)}</a>`).join('')}</div></section>` : ''}
    </div>`;

    const carousel = $('#carousel');
    const cards = $$('.voicing-card', carousel);
    let current = vi;
    const setCurrent = (i, updateHash = true) => {
      current = i;
      $$('#dots button').forEach((d, j) => d.classList.toggle('on', j === i));
      $$('#thumbs .thumb').forEach((d, j) => d.classList.toggle('on', j === i));
      const v = vs[i];
      const nn = T.voicingNoteNames(v, dk);
      $('#voicingNotes').innerHTML = nn.map((n, s) => n == null ? `<span style="color:var(--faint)">×</span>` : `<span class="${T.pc(n) === T.pc(dk) ? 'root' : ''}">${rootHtml(n)}</span>`).join(' <span style="color:var(--faint)">·</span> ') +
        `<div style="font-size:13px;color:var(--muted);font-weight:500;margin-top:4px">${v.b > 1 ? `Starts at the ${T.ordinal(v.b)} fret` : 'Open position'}${v.r && v.r.length ? ' · barre with finger 1' : ''} · low to high string</div>`;
      if (updateHash) history.replaceState(null, '', href(dk, suffix, i));
    };
    const scrollTo = (i, smooth = true) => { cards[i].scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', inline: 'center', block: 'nearest' }); };
    // Position the initial voicing without animating the page
    if (vi > 0) { carousel.scrollLeft = cards[vi].offsetLeft - carousel.offsetLeft - (carousel.clientWidth - cards[vi].clientWidth) / 2; }
    setCurrent(vi, false);
    let scrollT;
    carousel.addEventListener('scroll', () => {
      clearTimeout(scrollT);
      scrollT = setTimeout(() => {
        const center = carousel.scrollLeft + carousel.clientWidth / 2;
        let best = 0, bd = Infinity;
        cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - center); if (d < bd) { bd = d; best = i; } });
        if (best !== current) { setCurrent(best); haptic(); }
      }, 60);
    }, { passive: true });
    $$('#dots button').forEach(b => b.onclick = () => scrollTo(+b.dataset.i));
    $$('#thumbs .thumb').forEach(b => b.onclick = () => { scrollTo(+b.dataset.i); $('#carousel').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $('#back').onclick = () => { if (history.length > 1) history.back(); else navigate('#/'); };
    $('#favBtn').onclick = () => { toggleFav(dk, suffix); const on = isFav(dk, suffix); $('#favBtn').classList.toggle('active', on); $('#favBtn').innerHTML = on ? I.heartFill : I.heart; $('#favBtn').setAttribute('aria-pressed', on); haptic(); };
    $('#shareBtn').onclick = () => shareChord(dk, suffix, current);
    const play = mode => {
      if (!settings.sound) { toast('Sound is turned off in Settings'); return; }
      if (!window.Sound.available) { toast('Audio is not supported here'); return; }
      const v = vs[current];
      window.Sound.play(T.voicingMidi(v), mode);
      const btn = mode === 'arpeggio' ? $('#arpBtn') : $('#playBtn');
      btn.classList.remove('playing'); void btn.offsetWidth; btn.classList.add('playing');
      haptic();
    };
    $('#playBtn').onclick = () => play('strum');
    $('#arpBtn').onclick = () => play('arpeggio');
    $('#addProgBtn').onclick = () => { progression.push({ root: dk, suffix, vi: current }); store.set('progression', progression); toast(`Added ${T.chordSymbol(dk, suffix)} to progression`); haptic(); };
    // Tap the diagram to hear it
    cards.forEach((c, i) => c.querySelector('svg').addEventListener('click', () => { if (i === current) play('strum'); }));
    wireVideo();
  }

  function shareChord(root, suffix, vi) {
    const url = location.origin + location.pathname + href(root, suffix, vi);
    const title = `${T.chordSymbol(root, suffix)} guitar chord`;
    if (navigator.share) navigator.share({ title, text: `${T.chordLongName(root, suffix)} on Chordbook`, url }).catch(() => { /* cancelled */ });
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link copied'));
  }

  /* ---- video ---- */
  const FAMILY_OF = { major: 'open', minor: 'open', '7': 'seventh', m7: 'minor7', maj7: 'major7', '5': 'power', sus2: 'sus', sus4: 'sus', '7sus4': 'sus', add9: 'add9', madd9: 'add9', '6': 'sixth', m6: 'sixth', '69': 'sixth', m69: 'sixth', dim: 'dim', dim7: 'dim', m7b5: 'dim', aug: 'aug', aug7: 'aug', aug9: 'aug', '9': 'ninth', m9: 'ninth', maj9: 'ninth', '11': 'extended', m11: 'extended', maj11: 'extended', '13': 'extended', maj13: 'extended', mmaj7: 'extended', mmaj9: 'extended', mmaj11: 'extended', '7b5': 'altered', '7b9': 'altered', '7#9': 'altered', '9b5': 'altered', '9#11': 'altered', maj7b5: 'altered', 'maj7#5': 'altered', mmaj7b5: 'altered' };
  function findVideo(root, suffix) {
    const exact = VID.chords[key(root, suffix)];
    if (exact) return Object.assign({ level: 'exact' }, exact);
    let fam = T.isSlash(suffix) ? 'slash' : FAMILY_OF[suffix];
    // Barre-only roots for major/minor -> barre chord lesson
    if ((suffix === 'major' || suffix === 'minor') && !['C', 'D', 'E', 'G', 'A', 'F'].includes(root) && VID.families.barre) fam = 'barre';
    if (fam && VID.families[fam]) return Object.assign({ level: 'family' }, VID.families[fam]);
    if (VID.general) return Object.assign({ level: 'general' }, VID.general);
    return null;
  }
  function videoHtml(video, root, suffix) {
    const sym = T.chordSymbol(root, suffix);
    const q = encodeURIComponent(`JustinGuitar ${sym} chord`);
    if (!video) return `<div class="section-head"><h2>Learn it with JustinGuitar</h2></div>
      <div class="video-card"><div class="video-meta"><div class="t">No dedicated lesson found for ${symHtml(root, suffix)}.</div><div class="a">Search JustinGuitar’s channel on YouTube instead.</div>
      <div class="links"><a class="chip accent" target="_blank" rel="noopener" href="https://www.youtube.com/@JustinGuitar/search?query=${encodeURIComponent(sym + ' chord')}">${I.yt} Search on YouTube</a></div></div></div>`;
    const isShort = !!video.short;
    const label = video.level === 'exact' ? (isShort ? 'YouTube Short · this chord' : 'Full lesson · this chord') : video.level === 'family' ? (isShort ? 'YouTube Short · related lesson' : 'Related lesson') : 'Suggested lesson';
    return `<div class="section-head"><h2>Learn it with JustinGuitar</h2></div>
      <div class="video-card">
        <div class="video-frame${isShort ? ' short' : ''}" id="videoFrame" data-id="${esc(video.id)}">
          <img src="https://i.ytimg.com/vi/${esc(video.id)}/${isShort ? 'oar2' : 'hqdefault'}.jpg" alt="" loading="lazy" onerror="this.src='https://i.ytimg.com/vi/${esc(video.id)}/hqdefault.jpg';this.onerror=null">
          <button class="playbtn" aria-label="Play video"><span>${I.yt}</span></button>
        </div>
        <div class="video-meta">
          <span class="video-pill">${label}</span>
          <div class="t">${esc(video.title)}</div>
          <div class="a">Video by <a href="https://www.youtube.com/@JustinGuitar" target="_blank" rel="noopener">JustinGuitar</a> (Justin Sandercoe) on YouTube. Embedded with attribution; all rights belong to the creator.</div>
          <div class="links">
            <a class="chip" target="_blank" rel="noopener" href="https://www.youtube.com/${isShort ? 'shorts/' : 'watch?v='}${esc(video.id)}">${I.ext} Open on YouTube</a>
            <a class="chip" target="_blank" rel="noopener" href="https://www.justinguitar.com/chords">${I.ext} JustinGuitar chord library</a>
          </div>
        </div>
      </div>`;
  }
  function wireVideo() {
    const f = $('#videoFrame'); if (!f) return;
    f.querySelector('.playbtn').onclick = () => {
      const id = f.dataset.id;
      f.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1&rel=0" title="JustinGuitar lesson" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    };
  }

  /* ---- favourites ---- */
  function renderFavorites() {
    main.innerHTML = `<div class="view">
      <div class="hero"><h1 class="display" style="font-size:34px">Saved chords</h1><p>Tap the heart on any chord to keep it here.</p></div>
      ${favorites.length ? `<section class="section"><div class="card-grid">${favorites.map(k => { const [r, s] = k.split('|'); return cardHtml(r, s); }).join('')}</div></section>`
        : `<div class="empty">${I.heart}<b>Nothing saved yet</b>Your favourite chords will show up here, ready for practice.</div>`}
    </div>`;
  }

  /* ---- progression ---- */
  let stopSeq = null;
  function renderProgression() {
    const bpm = store.get('bpm', 80);
    if (stopSeq) { stopSeq(); stopSeq = null; }
    const items = progression.map((p, i) => {
      const v = voicings(p.root, p.suffix)[p.vi] || voicings(p.root, p.suffix)[0];
      return `<div class="prog-item" data-i="${i}"><button class="rm" aria-label="Remove">×</button>${cardHtml(p.root, p.suffix, { vi: v ? Math.min(p.vi || 0, voicings(p.root, p.suffix).length - 1) : 0, meta: v && v.b > 1 ? T.ordinal(v.b) + ' fret' : 'Open position' })}</div>`;
    }).join('');
    main.innerHTML = `<div class="view">
      <div class="hero"><h1 class="display" style="font-size:34px">Progression</h1><p>Build a chord sequence, hear it strummed, transpose it to any key.</p></div>
      <section class="section">
        <div class="search-wrap"><svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input class="search-input" id="progSearch" placeholder="Add a chord, e.g. G, Em, Cadd9" aria-label="Add a chord" autocapitalize="off" autocorrect="off"></div>
        <div class="chips" id="progSuggest" style="margin-top:10px"></div>
      </section>
      <section class="section">
        <div class="prog-strip" id="progStrip">${items}${progression.length ? '' : `<div class="prog-add">Add chords above</div>`}</div>
        ${progression.length ? `<div class="control-row">
          <button class="btn primary" id="progPlay" style="flex:none;min-width:120px">${I.play}Play</button>
          <div class="stepper" aria-label="Tempo"><button id="bpmDown" aria-label="Slower">−</button><span id="bpmVal">${bpm} bpm</span><button id="bpmUp" aria-label="Faster">+</button></div>
          <div class="stepper" aria-label="Transpose"><button id="trDown" aria-label="Transpose down">♭</button><span>Transpose</span><button id="trUp" aria-label="Transpose up">♯</button></div>
          <button class="icon-btn" id="progClear" aria-label="Clear progression">${I.trash}</button>
        </div>
        <p class="blurb" style="margin-top:12px">Tip: tap a chord in the strip to open it and pick a different voicing, then add it again.</p>` : ''}
      </section>
      <section class="section"><div class="section-head"><h2>Common progressions</h2></div>
        <div class="chips">${[['I–V–vi–IV in G', [['G', 'major'], ['D', 'major'], ['E', 'minor'], ['C', 'major']]], ['I–IV–V in A', [['A', 'major'], ['D', 'major'], ['E', 'major']]], ['12-bar blues in E', [['E', '7'], ['A', '7'], ['B', '7']]], ['vi–IV–I–V in C', [['A', 'minor'], ['F', 'major'], ['C', 'major'], ['G', 'major']]], ['ii–V–I in C', [['D', 'm7'], ['G', '7'], ['C', 'maj7']]]].map(([n, ch], i) => `<button class="chip" data-preset="${i}">${esc(n)}</button>`).join('')}</div></section>
    </div>`;
    const presets = [[['G', 'major'], ['D', 'major'], ['E', 'minor'], ['C', 'major']], [['A', 'major'], ['D', 'major'], ['E', 'major']], [['E', '7'], ['A', '7'], ['B', '7']], [['A', 'minor'], ['F', 'major'], ['C', 'major'], ['G', 'major']], [['D', 'm7'], ['G', '7'], ['C', 'maj7']]];
    $$('[data-preset]').forEach(b => b.onclick = () => { progression = presets[+b.dataset.preset].map(([r, s]) => ({ root: r, suffix: s, vi: 0 })); store.set('progression', progression); renderProgression(); });
    const ps = $('#progSearch'), sug = $('#progSuggest');
    ps.oninput = () => {
      const res = search(ps.value).slice(0, 10);
      sug.innerHTML = res.map(x => `<button class="chip" data-r="${esc(x.root)}" data-s="${esc(x.suffix)}">${I.plus}${symHtml(x.root, x.suffix)}</button>`).join('');
      $$('button', sug).forEach(b => b.onclick = () => { progression.push({ root: b.dataset.r, suffix: b.dataset.s, vi: 0 }); store.set('progression', progression); ps.value = ''; renderProgression(); $('#progSearch').focus(); haptic(); });
    };
    ps.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const b = $('button', sug); if (b) b.click(); } };
    $$('.prog-item .rm').forEach(b => b.onclick = e => { e.preventDefault(); const i = +b.parentElement.dataset.i; progression.splice(i, 1); store.set('progression', progression); renderProgression(); });
    if (progression.length) {
      const setBpm = v => { const b = Math.max(40, Math.min(200, v)); store.set('bpm', b); $('#bpmVal').textContent = b + ' bpm'; };
      $('#bpmDown').onclick = () => setBpm(store.get('bpm', 80) - 5);
      $('#bpmUp').onclick = () => setBpm(store.get('bpm', 80) + 5);
      const transpose = n => { progression = progression.map(p => { const r = T.DATA_KEYS[(T.pc(p.root) + n + 12) % 12]; return chordExists(r, p.suffix) ? { root: r, suffix: p.suffix, vi: 0 } : p; }); store.set('progression', progression); renderProgression(); haptic(); };
      $('#trDown').onclick = () => transpose(-1);
      $('#trUp').onclick = () => transpose(1);
      $('#progClear').onclick = () => { if (confirm('Clear the whole progression?')) { progression = []; store.set('progression', []); renderProgression(); } };
      $('#progPlay').onclick = () => {
        if (stopSeq) { stopSeq(); stopSeq = null; $('#progPlay').innerHTML = I.play + 'Play'; $$('.prog-item').forEach(x => x.classList.remove('now')); return; }
        if (!settings.sound) { toast('Sound is turned off in Settings'); return; }
        const interval = 60 / store.get('bpm', 80) * 4; // one bar per chord
        const list = progression.map(p => { const vs = voicings(p.root, p.suffix); return T.voicingMidi(vs[Math.min(p.vi || 0, vs.length - 1)]); });
        $('#progPlay').innerHTML = I.play + 'Stop';
        stopSeq = window.Sound.playSequence(list, interval, i => {
          $$('.prog-item').forEach((x, j) => x.classList.toggle('now', j === i));
          if (i >= 0) { const el = $$('.prog-item')[i]; el && el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }
          if (i === -1) { stopSeq = null; const b = $('#progPlay'); if (b) b.innerHTML = I.play + 'Play'; }
        });
      };
    }
  }

  /* ---- finder (reverse lookup) ---- */
  const finderState = { frets: [-1, -1, -1, -1, -1, -1] };
  function renderFinder() {
    main.innerHTML = `<div class="view">
      <div class="hero"><h1 class="display" style="font-size:34px">Chord finder</h1><p>Tap where your fingers are and we’ll name the chord. Tap a string’s ✕ to mute it, or the circle for an open string.</p></div>
      <section class="section"><div class="fretboard-wrap" id="fbWrap"></div>
        <div class="control-row"><button class="btn small" id="fbPlay">${I.play}Play</button><button class="btn small" id="fbClear">${I.trash}Clear</button>
          <span class="blurb" style="margin:0 0 0 auto" id="fbNotes"></span></div>
      </section>
      <section class="section"><div class="section-head"><h2>Matches</h2></div><div class="results" id="fbResults"></div></section>
    </div>`;
    drawFretboard();
    $('#fbClear').onclick = () => { finderState.frets = [-1, -1, -1, -1, -1, -1]; drawFretboard(); };
    $('#fbPlay').onclick = () => { const m = finderMidi(); if (m.filter(x => x != null).length) window.Sound.play(m, 'strum'); };
  }
  function finderMidi() { return finderState.frets.map((f, i) => (f < 0 ? null : T.OPEN_MIDI[i] + f)); }
  function drawFretboard() {
    const NF = 12, cellW = 46, cellH = 30, left = 100, top = 16;
    const W = left + cellW * NF + 14, H = top + cellH * 6 + 22;
    const lefty = settings.lefty;
    const sy = i => top + cellH * (lefty ? i : 5 - i) + cellH / 2; // string i (0 = low E) - low E at bottom for right-handed
    let s = `<svg class="fretboard" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W, 640)}px">`;
    // inlays
    for (const f of [3, 5, 7, 9, 12]) { const x = left + cellW * (f - 0.5); const y = top + cellH * 3; s += f === 12 ? `<circle class="fb-inlay" cx="${x}" cy="${y - cellH}" r="6"/><circle class="fb-inlay" cx="${x}" cy="${y + cellH}" r="6"/>` : `<circle class="fb-inlay" cx="${x}" cy="${y}" r="6"/>`; }
    // frets
    s += `<rect class="fb-nut" x="${left - 4}" y="${top}" width="6" height="${cellH * 6}" rx="2"/>`;
    for (let f = 1; f <= NF; f++) { const x = left + cellW * f; s += `<line class="fb-fret" x1="${x}" y1="${top}" x2="${x}" y2="${top + cellH * 6}"/>`; s += `<text class="fb-num" x="${x - cellW / 2}" y="${H - 6}" text-anchor="middle">${f}</text>`; }
    // strings
    for (let i = 0; i < 6; i++) { const y = sy(i); s += `<line class="fb-string" x1="${left}" y1="${y}" x2="${left + cellW * NF}" y2="${y}" stroke-width="${(1 + (5 - i) * 0.4).toFixed(1)}"/>`; }
    // cells and markers
    for (let i = 0; i < 6; i++) {
      const y = sy(i); const cur = finderState.frets[i];
      // mute toggle and open toggle
      s += `<g class="fb-cell" data-s="${i}" data-f="-1"><rect x="24" y="${y - cellH / 2}" width="28" height="${cellH}" class="fb-cell"/><g class="fb-mute" transform="translate(38 ${y})" opacity="${cur === -1 ? 1 : 0.35}"><line x1="-5" y1="-5" x2="5" y2="5"/><line x1="5" y1="-5" x2="-5" y2="5"/></g></g>`;
      s += `<g class="fb-cell" data-s="${i}" data-f="0"><rect x="56" y="${y - cellH / 2}" width="36" height="${cellH}" class="fb-cell"/><circle class="fb-open" cx="74" cy="${y}" r="7" opacity="${cur === 0 ? 1 : 0.35}"/>${cur === 0 ? `<circle class="fb-dot" cx="74" cy="${y}" r="7"/>` : ''}</g>`;
      for (let f = 1; f <= NF; f++) {
        const x = left + cellW * (f - 0.5);
        s += `<rect class="fb-cell" data-s="${i}" data-f="${f}" x="${left + cellW * (f - 1)}" y="${y - cellH / 2}" width="${cellW}" height="${cellH}"/>`;
        if (cur === f) s += `<circle class="fb-dot" cx="${x}" cy="${y}" r="11"/><text class="fb-dot-label" x="${x}" y="${y + 4}" text-anchor="middle">${T.noteName(T.OPEN_MIDI[i] + f, false)}</text>`;
      }
      s += `<text class="fb-num" x="12" y="${y + 4}" text-anchor="middle" style="font-weight:700;pointer-events:none">${T.STRING_NAMES[i]}</text>`;
    }
    s += '</svg>';
    const wrap = $('#fbWrap'); wrap.innerHTML = s;
    $$('.fb-cell', wrap).forEach(el => el.addEventListener('click', () => {
      const i = +el.dataset.s, f = +el.dataset.f;
      finderState.frets[i] = finderState.frets[i] === f && f > 0 ? -1 : f;
      drawFretboard(); haptic();
      if (settings.sound && f >= 0) window.Sound.play([T.OPEN_MIDI[i] + f]);
    }));
    updateFinderResults();
  }
  function updateFinderResults() {
    const midi = finderMidi().filter(x => x != null);
    const out = $('#fbResults');
    $('#fbNotes').textContent = midi.length ? midi.map(m => T.noteName(m, false)).join(' · ') : '';
    if (midi.length < 2) { out.innerHTML = `<div class="empty" style="padding:20px">${I.guitar}<b>Pick at least two notes</b>Then we’ll suggest chord names.</div>`; return; }
    const pcs = midi.map(m => m % 12);
    const bass = Math.min(...midi) % 12;
    const res = T.identify(pcs, bass).slice(0, 8);
    if (!res.length) { out.innerHTML = `<div class="empty" style="padding:20px"><b>No standard chord matches</b>Try adding or removing a note.</div>`; return; }
    out.innerHTML = res.map((r, i) => {
      const exists = chordExists(r.root, r.suffix);
      const inner = `<span class="sym">${esc(r.symbol).replace(/#/g, '♯')}</span><span class="n">${esc(T.typeInfo(r.suffix).name)}${r.missing ? ' · no 5th' : ''}</span>${exists ? I.chev : ''}`;
      return exists ? `<a class="result-row${i === 0 ? ' best' : ''}" href="${href(r.root, r.suffix)}">${inner}</a>` : `<div class="result-row${i === 0 ? ' best' : ''}">${inner}</div>`;
    }).join('');
  }

  /* ---- settings ---- */
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; renderInstallBanner(); });
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  function renderInstallBanner() {
    const slot = $('#installSlot'); if (!slot || isStandalone() || store.get('installDismissed', false)) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    if (!deferredInstall && !ios) return;
    slot.innerHTML = `<div class="install">${I.download}<div class="txt"><b>Add Chordbook to your home screen</b>${ios ? 'Tap Share, then “Add to Home Screen” for the full-screen, offline app.' : 'Works offline and opens full-screen like a native app.'}</div>
      ${deferredInstall ? `<button class="btn small primary" id="installBtn">Install</button>` : ''}<button class="icon-btn plain" id="installDismiss" aria-label="Dismiss">✕</button></div>`;
    const ib = $('#installBtn'); if (ib) ib.onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; slot.innerHTML = ''; };
    $('#installDismiss').onclick = () => { store.set('installDismissed', true); slot.innerHTML = ''; };
  }
  function renderSettings() {
    const seg = (id, opts, val) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<button data-v="${v}" class="${v === val ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    main.innerHTML = `<div class="view">
      <div class="hero"><h1 class="display" style="font-size:34px">Settings</h1><p>Make Chordbook yours.</p></div>
      <section class="section settings-list">
        <div class="setting"><div class="row"><div><div class="k">Appearance</div><div class="d">Auto follows your device.</div></div>${seg('segTheme', [['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']], settings.theme)}</div></div>
        <div class="setting"><div class="row"><div><div class="k">Left-handed</div><div class="d">Mirror every diagram and the finder fretboard.</div></div><button class="switch${settings.lefty ? ' on' : ''}" id="swLefty" role="switch" aria-checked="${settings.lefty}" aria-label="Left-handed"></button></div></div>
        <div class="setting"><div class="row"><div><div class="k">Dot labels</div><div class="d">Show finger numbers or note names on the dots.</div></div>${seg('segLabels', [['fingers', 'Fingers'], ['notes', 'Notes'], ['none', 'None']], settings.labels)}</div></div>
        <div class="setting"><div class="row"><div><div class="k">Sound</div><div class="d">Strum chords with the built-in string synth.</div></div><button class="switch${settings.sound ? ' on' : ''}" id="swSound" role="switch" aria-checked="${settings.sound}" aria-label="Sound"></button></div></div>
        <div class="setting"><div class="row"><div><div class="k">Preview</div><div class="d">How your diagrams will look.</div></div></div><div style="max-width:200px;margin:8px auto 0" id="previewDiagram">${window.Diagram.render(voicings('C', 'major')[0], diagramOpts('C'))}</div></div>
        ${!isStandalone() ? `<div class="setting"><div class="row"><div><div class="k">Install the app</div><div class="d">${deferredInstall ? 'Add Chordbook to your home screen for offline use.' : 'On iPhone: Share → Add to Home Screen. On Android/desktop: use your browser’s Install option.'}</div></div>${deferredInstall ? `<button class="btn small primary" id="installBtn2">Install</button>` : ''}</div></div>` : ''}
        <div class="setting"><div class="row"><div><div class="k">Reset</div><div class="d">Clear favourites, recents and progression.</div></div><button class="btn small" id="resetBtn">Reset</button></div></div>
        <div class="setting about"><b style="color:var(--text)">About Chordbook</b><br>A free, open guitar chord chart that works offline. ${Object.values(DATA).reduce((n, r) => n + Object.values(r).reduce((m, v) => m + v.length, 0), 0)} voicings across ${Object.values(DATA).reduce((n, r) => n + Object.keys(r).length, 0)} chords.<br><br>
          Chord voicing data adapted from <a href="https://github.com/tombatossals/chords-db" target="_blank" rel="noopener">chords-db</a> (MIT licence, © David Rubert), with power chords added.<br>
          Video lessons are by <a href="https://www.justinguitar.com" target="_blank" rel="noopener">JustinGuitar</a> (Justin Sandercoe), embedded from YouTube with attribution. Chordbook is not affiliated with JustinGuitar.<br>
          Diagrams and sounds are generated in your browser. Nothing is tracked.<br><br><span style="color:var(--faint)">Version ${APP_VERSION}</span></div>
      </section></div>`;
    $$('#segTheme button').forEach(b => b.onclick = () => { settings.theme = b.dataset.v; saveSettings(); applyTheme(); renderSettings(); });
    $$('#segLabels button').forEach(b => b.onclick = () => { settings.labels = b.dataset.v; saveSettings(); renderSettings(); });
    $('#swLefty').onclick = () => { settings.lefty = !settings.lefty; saveSettings(); renderSettings(); };
    $('#swSound').onclick = () => { settings.sound = !settings.sound; saveSettings(); renderSettings(); };
    const ib = $('#installBtn2'); if (ib) ib.onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; renderSettings(); };
    $('#resetBtn').onclick = () => { if (confirm('Reset favourites, recents and progression?')) { favorites = []; recents = []; progression = []; store.set('favorites', []); store.set('recents', []); store.set('progression', []); toast('Reset done'); } };
  }
  const APP_VERSION = '0.9.0';

  /* ---------- search box wiring ---------- */
  const si = $('#searchInput');
  let searchT;
  si.addEventListener('input', () => {
    $('#searchClear').hidden = !si.value;
    clearTimeout(searchT);
    searchT = setTimeout(() => {
      const q = si.value.trim();
      const target = q ? `#/search?q=${encodeURIComponent(q)}` : '#/search';
      if (location.hash.startsWith('#/search')) history.replaceState(null, '', target); else location.hash = target;
      renderSearch(q);
      // re-focus in case route() cleared
      si.focus();
    }, 120);
  });
  si.addEventListener('focus', () => { if (!location.hash.startsWith('#/search')) { location.hash = '#/search'; setTimeout(() => si.focus(), 0); } });
  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const res = search(si.value);
    if (res.length && res[0].score >= 100) navigate(href(res[0].root, res[0].suffix));
    si.blur();
  });
  $('#searchClear').onclick = () => { si.value = ''; $('#searchClear').hidden = true; renderSearch(''); si.focus(); };
  window.addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', window.scrollY > 8), { passive: true });

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ }));
  }

  route();
})();
