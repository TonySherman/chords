/* SVG chord diagram renderer. Pure function: voicing + options -> SVG markup string. */
(function () {
  const T = window.Theory;

  /**
   * render(voicing, opts)
   * voicing: { f:[6 rel frets], g:[6 fingers], b:baseFret, r:[barre frets] }
   * opts: { lefty, labels: 'fingers'|'notes'|'none', root, size: 'lg'|'sm', title }
   */
  function render(v, opts = {}) {
    const lefty = !!opts.lefty;
    const labels = opts.labels || 'fingers';
    const small = opts.size === 'sm';
    const frets = v.f.slice();
    const fingers = (v.g || []).slice();
    const noteNames = opts.root ? T.voicingNoteNames(v, opts.root) : [];
    const abs = T.absFrets(v);

    // Number of frets to draw: at least 4, more if the shape needs it
    const maxRel = Math.max(1, ...frets.filter(x => x > 0));
    const nFrets = Math.max(4, maxRel);

    // Geometry
    const W = 200, padL = 30, padR = 30, top = 44, fretH = 34, stringGap = 28;
    const H = top + fretH * nFrets + 34;
    const x0 = padL, x1 = padL + stringGap * 5;
    const xs = i => (lefty ? x1 - i * stringGap : x0 + i * stringGap); // string i (0 = low E)
    const fy = rel => top + fretH * (rel - 0.5); // centre of fret space rel (1-based)

    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="chord-svg${small ? ' chord-svg-sm' : ''}" role="img" aria-label="${esc(opts.title || 'Chord diagram')}">`);

    // Nut or base fret label
    const showNut = v.b === 1;
    if (showNut) {
      parts.push(`<rect class="cd-nut" x="${x0 - 1.5}" y="${top - 5}" width="${x1 - x0 + 3}" height="6" rx="2"/>`);
    } else {
      parts.push(`<line class="cd-fret" x1="${x0}" y1="${top}" x2="${x1}" y2="${top}"/>`);
      const lx = lefty ? x1 + 18 : x0 - 18;
      parts.push(`<text class="cd-basefret" x="${lx}" y="${fy(1) + 5}" text-anchor="middle">${v.b}fr</text>`);
    }
    // Frets
    for (let i = 1; i <= nFrets; i++) {
      const y = top + fretH * i;
      parts.push(`<line class="cd-fret" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>`);
    }
    // Strings (thicker for low strings)
    for (let s = 0; s < 6; s++) {
      const w = 1 + (5 - s) * 0.35;
      parts.push(`<line class="cd-string" x1="${xs(s)}" y1="${top}" x2="${xs(s)}" y2="${top + fretH * nFrets}" stroke-width="${w.toFixed(2)}"/>`);
    }
    // Barres
    const barres = v.r || [];
    for (const bf of barres) {
      const idx = [];
      frets.forEach((f, i) => { if (f === bf) idx.push(i); });
      if (idx.length < 2) continue;
      const a = Math.min(...idx), b = Math.max(...idx);
      const xa = Math.min(xs(a), xs(b)), xb = Math.max(xs(a), xs(b));
      parts.push(`<rect class="cd-barre" x="${xa - 11}" y="${fy(bf) - 11}" width="${xb - xa + 22}" height="22" rx="11"/>`);
    }
    // Markers above the nut and dots
    for (let s = 0; s < 6; s++) {
      const f = frets[s];
      const x = xs(s);
      if (f < 0) {
        parts.push(`<g class="cd-mute" transform="translate(${x} ${top - 20})"><line x1="-6" y1="-6" x2="6" y2="6"/><line x1="6" y1="-6" x2="-6" y2="6"/></g>`);
      } else if (f === 0) {
        parts.push(`<circle class="cd-open" cx="${x}" cy="${top - 20}" r="6.5"/>`);
      } else {
        const inBarre = barres.includes(f);
        const y = fy(f);
        parts.push(`<circle class="cd-dot${inBarre ? ' cd-dot-barre' : ''}" cx="${x}" cy="${y}" r="11.5"/>`);
        let label = '';
        if (labels === 'fingers' && fingers[s] > 0) label = String(fingers[s]);
        if (labels === 'notes' && noteNames[s]) label = noteNames[s];
        if (label) parts.push(`<text class="cd-dot-label" x="${x}" y="${y + 4.5}" text-anchor="middle">${esc(label)}</text>`);
      }
    }
    // Note names (or string names) under the diagram
    const by = top + fretH * nFrets + 22;
    for (let s = 0; s < 6; s++) {
      const x = xs(s);
      const f = frets[s];
      let txt = '';
      if (f < 0) txt = '';
      else txt = noteNames[s] || T.STRING_NAMES[s];
      if (opts.hideNotes) txt = '';
      if (txt) {
        const isRoot = opts.root && noteNames[s] && T.pc(noteNames[s]) === T.pc(opts.root);
        parts.push(`<text class="cd-note${isRoot ? ' cd-note-root' : ''}" x="${x}" y="${by}" text-anchor="middle">${esc(txt)}</text>`);
      }
    }
    parts.push('</svg>');
    return parts.join('');
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  window.Diagram = { render };
})();
