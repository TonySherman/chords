/* Music theory helpers and chord-type metadata for Chordbook */
(function () {
  const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  // The dataset keys: C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B
  const DATA_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11 };
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
  const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

  // Chord-type metadata. label = short symbol appended to root; name = spoken name;
  // iv = intervals in semitones from the root; group = browse grouping; alias = extra search spellings.
  const TYPES = {
    major: { label: '', name: 'Major', iv: [0, 4, 7], group: 'Essentials', alias: ['maj', 'major', 'M', ''] , formula: '1 3 5' },
    minor: { label: 'm', name: 'Minor', iv: [0, 3, 7], group: 'Essentials', alias: ['m', 'min', 'minor', '-'], formula: '1 ♭3 5' },
    '7': { label: '7', name: 'Dominant 7th', iv: [0, 4, 7, 10], group: 'Essentials', alias: ['7', 'dom7', 'dominant7', 'seven', 'seventh'], formula: '1 3 5 ♭7' },
    m7: { label: 'm7', name: 'Minor 7th', iv: [0, 3, 7, 10], group: 'Essentials', alias: ['m7', 'min7', 'minor7', '-7', 'mi7'], formula: '1 ♭3 5 ♭7' },
    maj7: { label: 'maj7', name: 'Major 7th', iv: [0, 4, 7, 11], group: 'Essentials', alias: ['maj7', 'major7', 'M7', 'Δ', 'Δ7', 'ma7'], formula: '1 3 5 7' },
    '5': { label: '5', name: 'Power chord', iv: [0, 7], group: 'Essentials', alias: ['5', 'power', 'powerchord', 'no3'], formula: '1 5' },
    sus2: { label: 'sus2', name: 'Suspended 2nd', iv: [0, 2, 7], group: 'Suspended & add', alias: ['sus2', 'suspended2', '2'], formula: '1 2 5' },
    sus4: { label: 'sus4', name: 'Suspended 4th', iv: [0, 5, 7], group: 'Suspended & add', alias: ['sus4', 'sus', 'suspended4', 'suspended', '4'], formula: '1 4 5' },
    '7sus4': { label: '7sus4', name: 'Dominant 7th suspended 4th', iv: [0, 5, 7, 10], group: 'Suspended & add', alias: ['7sus4', '7sus', 'sus7'], formula: '1 4 5 ♭7' },
    add9: { label: 'add9', name: 'Added 9th', iv: [0, 4, 7, 14], group: 'Suspended & add', alias: ['add9', 'add2', 'added9', '2'], formula: '1 3 5 9' },
    madd9: { label: 'madd9', name: 'Minor added 9th', iv: [0, 3, 7, 14], group: 'Suspended & add', alias: ['madd9', 'minadd9', 'madd2', 'm(add9)'], formula: '1 ♭3 5 9' },
    '6': { label: '6', name: 'Major 6th', iv: [0, 4, 7, 9], group: 'Sixths', alias: ['6', 'maj6', 'major6', 'sixth', 'add6'], formula: '1 3 5 6' },
    m6: { label: 'm6', name: 'Minor 6th', iv: [0, 3, 7, 9], group: 'Sixths', alias: ['m6', 'min6', 'minor6', '-6'], formula: '1 ♭3 5 6' },
    '69': { label: '6/9', name: 'Six-nine', iv: [0, 4, 7, 9, 14], group: 'Sixths', alias: ['69', '6/9', '6add9', 'sixnine'], formula: '1 3 5 6 9' },
    m69: { label: 'm6/9', name: 'Minor six-nine', iv: [0, 3, 7, 9, 14], group: 'Sixths', alias: ['m69', 'm6/9', 'min69', 'm6add9'], formula: '1 ♭3 5 6 9' },
    dim: { label: 'dim', name: 'Diminished', iv: [0, 3, 6], group: 'Diminished & augmented', alias: ['dim', 'diminished', '°', 'o', 'mb5', 'm(b5)'], formula: '1 ♭3 ♭5' },
    dim7: { label: 'dim7', name: 'Diminished 7th', iv: [0, 3, 6, 9], group: 'Diminished & augmented', alias: ['dim7', 'diminished7', '°7', 'o7'], formula: '1 ♭3 ♭5 ♭♭7' },
    m7b5: { label: 'm7♭5', name: 'Half-diminished (m7♭5)', iv: [0, 3, 6, 10], group: 'Diminished & augmented', alias: ['m7b5', 'm7♭5', 'halfdim', 'halfdiminished', 'ø', 'ø7', 'min7b5', '-7b5'], formula: '1 ♭3 ♭5 ♭7' },
    aug: { label: 'aug', name: 'Augmented', iv: [0, 4, 8], group: 'Diminished & augmented', alias: ['aug', 'augmented', '+', '#5', '(#5)'], formula: '1 3 ♯5' },
    aug7: { label: 'aug7', name: 'Augmented 7th', iv: [0, 4, 8, 10], group: 'Diminished & augmented', alias: ['aug7', '7#5', '7+', '+7', '7aug', '7♯5'], formula: '1 3 ♯5 ♭7' },
    aug9: { label: 'aug9', name: 'Augmented 9th', iv: [0, 4, 8, 10, 14], group: 'Diminished & augmented', alias: ['aug9', '9#5', '9+', '+9', '9♯5'], formula: '1 3 ♯5 ♭7 9' },
    '9': { label: '9', name: 'Dominant 9th', iv: [0, 4, 7, 10, 14], group: 'Extended', alias: ['9', 'dom9', 'ninth'], formula: '1 3 5 ♭7 9' },
    m9: { label: 'm9', name: 'Minor 9th', iv: [0, 3, 7, 10, 14], group: 'Extended', alias: ['m9', 'min9', 'minor9', '-9'], formula: '1 ♭3 5 ♭7 9' },
    maj9: { label: 'maj9', name: 'Major 9th', iv: [0, 4, 7, 11, 14], group: 'Extended', alias: ['maj9', 'major9', 'M9', 'Δ9'], formula: '1 3 5 7 9' },
    '11': { label: '11', name: 'Dominant 11th', iv: [0, 4, 7, 10, 14, 17], group: 'Extended', alias: ['11', 'dom11', 'eleventh'], formula: '1 3 5 ♭7 9 11' },
    m11: { label: 'm11', name: 'Minor 11th', iv: [0, 3, 7, 10, 14, 17], group: 'Extended', alias: ['m11', 'min11', 'minor11', '-11'], formula: '1 ♭3 5 ♭7 9 11' },
    maj11: { label: 'maj11', name: 'Major 11th', iv: [0, 4, 7, 11, 14, 17], group: 'Extended', alias: ['maj11', 'major11', 'M11'], formula: '1 3 5 7 9 11' },
    '13': { label: '13', name: 'Dominant 13th', iv: [0, 4, 7, 10, 14, 21], group: 'Extended', alias: ['13', 'dom13', 'thirteenth'], formula: '1 3 5 ♭7 9 13' },
    maj13: { label: 'maj13', name: 'Major 13th', iv: [0, 4, 7, 11, 14, 21], group: 'Extended', alias: ['maj13', 'major13', 'M13'], formula: '1 3 5 7 9 13' },
    mmaj7: { label: 'm(maj7)', name: 'Minor-major 7th', iv: [0, 3, 7, 11], group: 'Extended', alias: ['mmaj7', 'm(maj7)', 'minmaj7', 'mM7', '-Δ7', 'mmajor7'], formula: '1 ♭3 5 7' },
    mmaj9: { label: 'm(maj9)', name: 'Minor-major 9th', iv: [0, 3, 7, 11, 14], group: 'Extended', alias: ['mmaj9', 'm(maj9)', 'minmaj9', 'mM9'], formula: '1 ♭3 5 7 9' },
    mmaj11: { label: 'm(maj11)', name: 'Minor-major 11th', iv: [0, 3, 7, 11, 14, 17], group: 'Extended', alias: ['mmaj11', 'm(maj11)', 'minmaj11', 'mM11'], formula: '1 ♭3 5 7 9 11' },
    '7b5': { label: '7♭5', name: 'Dominant 7th flat 5', iv: [0, 4, 6, 10], group: 'Altered', alias: ['7b5', '7♭5', '7-5', 'dom7b5'], formula: '1 3 ♭5 ♭7' },
    '7b9': { label: '7♭9', name: 'Dominant 7th flat 9', iv: [0, 4, 7, 10, 13], group: 'Altered', alias: ['7b9', '7♭9', '7-9'], formula: '1 3 5 ♭7 ♭9' },
    '7#9': { label: '7♯9', name: 'Dominant 7th sharp 9 (Hendrix chord)', iv: [0, 4, 7, 10, 15], group: 'Altered', alias: ['7#9', '7♯9', '7+9', 'hendrix'], formula: '1 3 5 ♭7 ♯9' },
    '9b5': { label: '9♭5', name: 'Dominant 9th flat 5', iv: [0, 4, 6, 10, 14], group: 'Altered', alias: ['9b5', '9♭5', '9-5'], formula: '1 3 ♭5 ♭7 9' },
    '9#11': { label: '9♯11', name: 'Dominant 9th sharp 11', iv: [0, 4, 7, 10, 14, 18], group: 'Altered', alias: ['9#11', '9♯11', '9+11'], formula: '1 3 5 ♭7 9 ♯11' },
    maj7b5: { label: 'maj7♭5', name: 'Major 7th flat 5', iv: [0, 4, 6, 11], group: 'Altered', alias: ['maj7b5', 'maj7♭5', 'M7b5'], formula: '1 3 ♭5 7' },
    'maj7#5': { label: 'maj7♯5', name: 'Major 7th sharp 5', iv: [0, 4, 8, 11], group: 'Altered', alias: ['maj7#5', 'maj7♯5', 'maj7+5', 'M7#5', 'augmaj7'], formula: '1 3 ♯5 7' },
    mmaj7b5: { label: 'm(maj7)♭5', name: 'Minor-major 7th flat 5', iv: [0, 3, 6, 11], group: 'Altered', alias: ['mmaj7b5', 'm(maj7)b5', 'minmaj7b5'], formula: '1 ♭3 ♭5 7' },
  };

  const GROUP_ORDER = ['Essentials', 'Suspended & add', 'Sixths', 'Diminished & augmented', 'Extended', 'Altered', 'Slash chords'];
  const GROUP_BLURB = {
    'Essentials': 'The chords every guitarist learns first.',
    'Suspended & add': 'Open, airy colours that resolve nicely to the plain chord.',
    'Sixths': 'Sweet, jazzy and great for endings.',
    'Diminished & augmented': 'Tension chords that love to move somewhere.',
    'Extended': 'Richer jazz, soul and R&B voicings.',
    'Altered': 'Spicy dominant colours for blues and jazz.',
    'Slash chords': 'Familiar shapes with a different bass note.',
  };

  function isSlash(suffix) { return suffix.includes('/'); }

  // Parse a slash suffix like "/E" or "m/B" into { quality: 'major'|'minor', bass: 'E' }
  function parseSlash(suffix) {
    const i = suffix.indexOf('/');
    const q = suffix.slice(0, i) === 'm' ? 'minor' : 'major';
    return { quality: q, bass: suffix.slice(i + 1) };
  }

  function typeInfo(suffix) {
    if (TYPES[suffix]) return TYPES[suffix];
    if (isSlash(suffix)) {
      const { quality, bass } = parseSlash(suffix);
      const base = TYPES[quality];
      return { label: (quality === 'minor' ? 'm' : '') + '/' + bass, name: base.name + ' over ' + bass, iv: base.iv, group: 'Slash chords', alias: [suffix], formula: base.formula + ' (bass ' + bass + ')', slashBass: bass };
    }
    return { label: suffix, name: suffix, iv: [0], group: 'Other', alias: [suffix], formula: '' };
  }

  function pc(note) { return PC[note]; }
  function noteName(pcNum, useFlats) { return (useFlats ? FLATS : SHARPS)[((pcNum % 12) + 12) % 12]; }
  // Choose sharps or flats to spell a chord: keys with flats in the data (Eb, Ab, Bb, F) spell flat.
  function prefersFlats(root) { return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].includes(root); }

  function chordNotes(root, suffix) {
    const info = typeInfo(suffix);
    const r = pc(root);
    const flats = prefersFlats(root);
    return info.iv.map(i => noteName(r + i, flats));
  }

  // Display symbol like "C#m7" or "Bb/D"
  function chordSymbol(root, suffix) {
    return root + typeInfo(suffix).label;
  }
  function chordLongName(root, suffix) {
    return root + ' ' + typeInfo(suffix).name;
  }

  // Convert voicing (relative frets + baseFret) to absolute frets per string
  function absFrets(v) {
    return v.f.map(f => (f < 0 ? -1 : f === 0 ? 0 : f + v.b - 1));
  }
  function voicingMidi(v) {
    return absFrets(v).map((f, i) => (f < 0 ? null : OPEN_MIDI[i] + f));
  }
  function voicingNoteNames(v, root) {
    const flats = prefersFlats(root);
    return voicingMidi(v).map(m => (m == null ? null : noteName(m, flats)));
  }
  function voicingTags(v) {
    const tags = [];
    const abs = absFrets(v);
    const played = abs.filter(f => f >= 0);
    const fretted = played.filter(f => f > 0);
    if (v.r && v.r.length) tags.push('Barre');
    if (played.some(f => f === 0) && v.b === 1) tags.push('Open');
    if (fretted.length && Math.max(...fretted) - Math.min(...fretted) >= 4) tags.push('Stretch');
    const fingers = new Set(v.g.filter(g => g > 0));
    if (played.length <= 3) tags.push('Compact');
    if (fingers.size <= 2 && !tags.includes('Barre')) tags.push('Easy');
    if (v.b > 1) tags.push(ordinal(v.b) + ' fret');
    return tags;
  }
  function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  // Enharmonic normalisation: any user root spelling -> dataset key
  function toDataKey(rootSpelling) {
    const p = PC[rootSpelling];
    if (p == null) return null;
    return DATA_KEYS[p];
  }

  // Identify chords from a set of pitch classes (bass pc optional). Returns ranked candidates.
  function identify(pcs, bassPc) {
    const set = new Set(pcs.map(x => ((x % 12) + 12) % 12));
    if (set.size === 0) return [];
    const results = [];
    for (let r = 0; r < 12; r++) {
      for (const suffix in TYPES) {
        const iv = TYPES[suffix].iv.map(i => (r + i) % 12);
        const tpl = new Set(iv);
        let matched = 0;
        for (const x of set) if (tpl.has(x)) matched++;
        const extra = set.size - matched; // notes played that are not in the chord
        const missing = tpl.size - matched; // chord tones not played
        if (extra > 0) continue;
        // allow a missing 5th on big chords, or missing root in extended chords is too loose; keep it simple:
        if (missing > 1) continue;
        if (missing === 1 && tpl.size <= 3) continue;
        if (missing === 1 && !tpl.has((r + 7) % 12)) continue;
        // when missing 1, only allow the 5th to be the missing note
        if (missing === 1) {
          const fifth = (r + 7) % 12;
          if (set.has(fifth)) continue;
        }
        let score = 100 - missing * 20 - TYPES[suffix].iv.length;
        if (bassPc != null && bassPc === r) score += 15;
        if (suffix === 'major' || suffix === 'minor') score += 6;
        if (suffix === '7' || suffix === 'm7' || suffix === 'maj7') score += 3;
        const root = DATA_KEYS[r];
        let symbol = chordSymbol(root, suffix);
        if (bassPc != null && bassPc !== r) symbol += '/' + noteName(bassPc, prefersFlats(root));
        results.push({ root, suffix, symbol, score, missing });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  window.Theory = { SHARPS, FLATS, DATA_KEYS, PC, OPEN_MIDI, STRING_NAMES, TYPES, GROUP_ORDER, GROUP_BLURB, typeInfo, isSlash, parseSlash, pc, noteName, prefersFlats, chordNotes, chordSymbol, chordLongName, absFrets, voicingMidi, voicingNoteNames, voicingTags, toDataKey, identify, ordinal };
})();
