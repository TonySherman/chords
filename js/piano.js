/* Piano mode: keyboard SVG renderer and inversion-based voicing generator. */
(function () {
  const T = window.Theory;
  const BLACK = new Set([1, 3, 6, 8, 10]);
  const WHITE_INDEX = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 }; // pitch class -> white key index within octave

  // Suggested right-hand fingerings by chord size and inversion (index = inversion number)
  const FINGERINGS = {
    2: [[1, 5], [1, 5]],
    3: [[1, 3, 5], [1, 2, 5], [1, 3, 5]],
    4: [[1, 2, 3, 5], [1, 2, 4, 5], [1, 2, 3, 5], [1, 2, 4, 5]],
  };

  /**
   * voicings(root, suffix) -> [{ midi:[...], name, short, inversion, fingers:[...]|null, bass }]
   * Root position sits in the octave starting at middle C (C4 = 60).
   */
  function voicings(root, suffix) {
    const info = T.typeInfo(suffix);
    const rootPc = T.pc(root);
    const rootMidi = 60 + rootPc; // C4..B4
    const base = info.iv.map(i => rootMidi + i);
    const out = [];
    const n = base.length;
    // keep chord notes within a sensible span: fold intervals >= 19 semitones down an octave for compact position
    const compact = base.map(m => (m - rootMidi >= 19 ? m - 12 : m)).sort((a, b) => a - b);
    const isSlash = !!info.slashBass;
    const bassMidi = isSlash ? 48 + T.pc(info.slashBass) : null; // C3 octave
    const ordinal = ['Root position', '1st inversion', '2nd inversion', '3rd inversion', '4th inversion', '5th inversion'];
    const shorts = ['Root', '1st inv', '2nd inv', '3rd inv', '4th inv', '5th inv'];
    const maxInv = Math.min(n, 4);
    let notes = compact.slice();
    for (let inv = 0; inv < maxInv; inv++) {
      if (inv > 0) {
        // move the lowest note up an octave
        const low = notes.shift();
        notes.push(low + 12);
        notes.sort((a, b) => a - b);
      }
      // keep everything inside C4..C6 for readability
      while (notes[notes.length - 1] > 84) notes = notes.map(m => m - 12);
      const fingers = (FINGERINGS[n] || [])[inv] || null;
      out.push({ midi: isSlash ? [bassMidi, ...notes] : notes.slice(), name: ordinal[inv] + (isSlash ? ' + bass' : ''), short: shorts[inv], inversion: inv, fingers, bass: isSlash ? bassMidi : notes[0], lh: isSlash ? [bassMidi] : [] });
    }
    // Two-hand voicing: left hand plays the root (and fifth for big chords) an octave below
    const lhRoot = rootMidi - 12;
    const lh = n >= 4 ? [lhRoot, lhRoot + 7] : [lhRoot];
    const rh = out[0].midi.filter(m => !(isSlash && m === bassMidi));
    if (!isSlash) out.push({ midi: [...lh, ...rh], name: 'Two hands (bass + chord)', short: 'Two hands', inversion: 0, fingers: FINGERINGS[n] ? FINGERINGS[n][0] : null, bass: lhRoot, lh });
    return out;
  }

  /**
   * render(voicing, opts) -> SVG string. voicing.midi are absolute MIDI notes.
   * opts: { root, labels: 'fingers'|'notes'|'none', size: 'sm'|'lg', title, hideNotes, tappable, range:[lo,hi] }
   */
  function render(v, opts = {}) {
    const small = opts.size === 'sm';
    const labels = opts.labels || 'fingers';
    const midi = v.midi.slice().sort((a, b) => a - b);
    // Key range: whole octaves covering the notes, at least two octaves
    let lo = opts.range ? opts.range[0] : Math.floor(Math.min(...midi) / 12) * 12;
    let hi = opts.range ? opts.range[1] : Math.ceil((Math.max(...midi) + 1) / 12) * 12 - 1;
    if (!opts.range && hi - lo < 23) hi = lo + 23;
    const whiteW = 24, whiteH = small ? 80 : 118, blackW = 14, blackH = small ? 50 : 74;
    const whites = [];
    for (let m = lo; m <= hi; m++) if (!BLACK.has(m % 12)) whites.push(m);
    const W = whites.length * whiteW + 2, H = whiteH + (opts.hideNotes ? 8 : 26);
    const xOfWhite = m => whites.indexOf(m) * whiteW + 1;
    const set = new Map(midi.map((m, i) => [m, i]));
    const rootPc = opts.root != null ? T.pc(opts.root) : null;
    const flats = opts.root ? T.prefersFlats(opts.root) : false;
    const lhSet = new Set(v.lh || []);
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="piano-svg${small ? ' piano-svg-sm' : ''}" role="img" aria-label="${esc(opts.title || 'Piano chord diagram')}">`];
    // white keys
    for (const m of whites) {
      const x = xOfWhite(m);
      const on = set.has(m);
      const cls = on ? (m % 12 === rootPc ? ' on root' : ' on') + (lhSet.has(m) ? ' lh' : '') : '';
      parts.push(`<rect class="pk-white${cls}" x="${x}" y="1" width="${whiteW - 1}" height="${whiteH}" rx="3"${opts.tappable ? ` data-m="${m}"` : ''}/>`);
      if (m % 12 === 0 && !opts.hideNotes) parts.push(`<text class="pk-octave" x="${x + whiteW / 2}" y="${whiteH + 18}" text-anchor="middle">C${Math.floor(m / 12) - 1}</text>`);
    }
    // black keys
    for (let m = lo; m <= hi; m++) {
      if (!BLACK.has(m % 12)) continue;
      const prevWhite = m - 1;
      if (!whites.includes(prevWhite)) continue;
      const x = xOfWhite(prevWhite) + whiteW - blackW / 2 - 0.5;
      const on = set.has(m);
      const cls = on ? (m % 12 === rootPc ? ' on root' : ' on') + (lhSet.has(m) ? ' lh' : '') : '';
      parts.push(`<rect class="pk-black${cls}" x="${x}" y="1" width="${blackW}" height="${blackH}" rx="2"${opts.tappable ? ` data-m="${m}"` : ''}/>`);
    }
    // labels on pressed keys
    for (const m of midi) {
      const black = BLACK.has(m % 12);
      const x = black ? xOfWhite(m - 1) + whiteW - 0.5 : xOfWhite(m) + (whiteW - 1) / 2;
      const y = black ? blackH - 10 : whiteH - 12;
      let label = '';
      const idx = set.get(m);
      if (labels === 'fingers' && v.fingers && !lhSet.has(m)) { const rh = midi.filter(n => !lhSet.has(n)); const fi = rh.indexOf(m); if (fi >= 0 && v.fingers[fi] != null) label = String(v.fingers[fi]); }
      if (labels === 'notes') label = T.noteName(m, flats);
      if (labels === 'fingers' && lhSet.has(m)) label = 'L';
      if (label) parts.push(`<text class="pk-label${black ? ' on-black' : ''}" x="${x}" y="${y}" text-anchor="middle">${esc(label)}</text>`);
      void idx;
    }
    parts.push('</svg>');
    return parts.join('');
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  window.Piano = { voicings, render, BLACK };
})();
