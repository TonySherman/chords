/* Plucked-string synth (Karplus–Strong) for chord playback via Web Audio. */
(function () {
  let ctx = null;
  const cache = new Map();
  let master = null;
  let pianoBus = null;

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.9;
      // gentle body/tone shaping
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 20; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
      pianoBus = ctx.createBiquadFilter();
      pianoBus.type = 'lowpass'; pianoBus.frequency.value = 2600; pianoBus.Q.value = 0.6;
      const warmth = ctx.createBiquadFilter();
      warmth.type = 'lowshelf'; warmth.frequency.value = 260; warmth.gain.value = 4;
      pianoBus.connect(warmth); warmth.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Generate a Karplus–Strong buffer for a midi note
  function bufferFor(midi) {
    if (cache.has(midi)) return cache.get(midi);
    const c = ensure();
    const sr = c.sampleRate;
    const dur = 2.6;
    const n = Math.floor(sr * dur);
    const buf = c.createBuffer(1, n, sr);
    const out = buf.getChannelData(0);
    const freq = midiToFreq(midi);
    const period = sr / freq;
    const N = Math.floor(period);
    const frac = period - N; // fractional delay for tuning
    const delay = new Float32Array(N + 1);
    // Excitation: noise burst, slightly low-passed for a warmer pick
    let last = 0;
    for (let i = 0; i <= N; i++) {
      const r = Math.random() * 2 - 1;
      last = 0.6 * r + 0.4 * last;
      delay[i] = last;
    }
    // Damping depends on pitch: higher strings decay a little faster
    const decay = 0.996 + Math.min(0.0035, 30 / (freq * freq)) ;
    const brightness = 0.5;
    let idx = 0;
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const cur = delay[idx];
      const nextIdx = (idx + 1) % (N + 1);
      const next = delay[nextIdx];
      // fractional interpolation between two consecutive samples in the loop
      const y = cur * (1 - frac) + next * frac;
      // two-point average lowpass with decay factor (string loss)
      const v = decay * (brightness * y + (1 - brightness) * prev);
      prev = y;
      delay[idx] = v;
      out[i] = y;
      idx = nextIdx;
    }
    // normalise and add a soft fade at the tail
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
    const g = peak > 0 ? 0.8 / peak : 1;
    const fadeStart = Math.floor(n * 0.7);
    for (let i = 0; i < n; i++) {
      let a = g;
      if (i > fadeStart) a *= 1 - (i - fadeStart) / (n - fadeStart);
      out[i] *= a;
    }
    cache.set(midi, buf);
    return buf;
  }

  // Piano-like tone rendered into a buffer (cached per pitch). Warm rather than bright:
  // strong fundamental with a slightly detuned unison partner (like a piano's 2-3 strings per note),
  // upper partials that are quiet and die quickly, so the note darkens as it decays.
  const pianoCache = new Map();
  function pianoBufferFor(midi) {
    if (pianoCache.has(midi)) return pianoCache.get(midi);
    const c = ensure();
    const sr = c.sampleRate, dur = 3.2, n = Math.floor(sr * dur);
    const buf = c.createBuffer(1, n, sr);
    const out = buf.getChannelData(0);
    const f0 = midiToFreq(midi);
    const rel = (midi - 60) / 24; // -1 (C2) .. +1 (C6)
    // amplitudes fall off steeply; high notes get even fewer partials
    const partials = [1, 0.42, 0.18, 0.08, 0.035, 0.015].map((a, k) => a * (k === 0 ? 1 : Math.max(0.15, 1 - Math.max(0, rel) * 0.5)));
    const baseDecay = 0.55 + Math.max(0, rel) * 0.9; // low notes ring longer
    const decays = partials.map((_, k) => baseDecay * (1 + k * 1.6));
    const detune = 1.0012; // unison string detune
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      for (let k = 0; k < partials.length; k++) {
        const fk = f0 * (k + 1) * (1 + 0.0003 * k * k);
        if (fk > sr / 2) break;
        const env = Math.exp(-decays[k] * t);
        if (k === 0) v += partials[0] * env * (0.6 * Math.sin(2 * Math.PI * fk * t) + 0.4 * Math.sin(2 * Math.PI * fk * detune * t + 0.3));
        else v += partials[k] * env * Math.sin(2 * Math.PI * fk * t);
      }
      // hammer: 6 ms attack, slight initial thump
      const att = t < 0.006 ? t / 0.006 : 1;
      out[i] = v * att * 0.55;
    }
    const fadeStart = Math.floor(n * 0.7);
    for (let i = fadeStart; i < n; i++) out[i] *= 1 - (i - fadeStart) / (n - fadeStart);
    pianoCache.set(midi, buf);
    return buf;
  }

  function pluck(midi, when, gain = 1, instrument = 'guitar') {
    const c = ensure();
    const src = c.createBufferSource();
    src.buffer = instrument === 'piano' ? pianoBufferFor(midi) : bufferFor(midi);
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(g); g.connect(instrument === 'piano' ? pianoBus : master);
    src.start(when);
  }

  /** Strum a set of midi notes (low->high). mode: 'strum' | 'arpeggio' | 'down' */
  function play(midis, mode = 'strum', instrument = 'guitar') {
    const c = ensure();
    const notes = midis.filter(m => m != null);
    const t0 = c.currentTime + 0.02;
    const gap = mode === 'arpeggio' ? 0.28 : instrument === 'piano' ? 0.012 : 0.035;
    notes.forEach((m, i) => {
      // lower strings a touch louder for body
      const gain = 0.9 - (i / Math.max(1, notes.length - 1)) * 0.25;
      pluck(m, t0 + i * gap, gain, instrument);
    });
    return notes.length * gap + 1.5;
  }

  /** Play a sequence of chords (array of midi arrays) at an interval in seconds */
  function playSequence(list, interval = 1.2, onStep, instrument = 'guitar') {
    const c = ensure();
    let i = 0;
    const timers = [];
    const step = () => {
      if (i >= list.length) return;
      play(list[i], 'strum', instrument);
      if (onStep) onStep(i);
      i++;
      if (i < list.length) timers.push(setTimeout(step, interval * 1000));
      else timers.push(setTimeout(() => onStep && onStep(-1), interval * 1000));
    };
    step();
    return () => timers.forEach(clearTimeout);
  }

  window.Sound = { play, playSequence, ensure, available: !!(window.AudioContext || window.webkitAudioContext) };
})();
