/* =========================================================
   Sound: alles per Web Audio synthetisiert (keine Dateien)
   ========================================================= */
window.Sound = (function () {
  let ctx = null, master = null, engineOsc = null, engineGain = null, engineFilter = null;
  let enabled = true;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Triebwerks-Brummen: gefiltertes Rauschen
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      engineOsc = ctx.createBufferSource();
      engineOsc.buffer = buf; engineOsc.loop = true;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = "lowpass"; engineFilter.frequency.value = 300;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineFilter).connect(engineGain).connect(master);
      engineOsc.start();
      return true;
    } catch (e) { return false; }
  }

  function tone(freq, dur, type = "sine", vol = 0.25, delay = 0, slideTo = null) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  return {
    unlock() { if (ensure() && ctx.state === "suspended") ctx.resume(); },
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      if (!enabled && engineGain) engineGain.gain.value = 0;
      return enabled;
    },
    engine(level) {
      if (!ctx || !enabled) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(level * 0.35, t, 0.15);
      engineFilter.frequency.setTargetAtTime(200 + level * 700, t, 0.2);
    },
    click() { tone(660, 0.08, "triangle", 0.15); },
    collect() { tone(988, 0.12, "sine", 0.2); tone(1319, 0.2, "sine", 0.2, 0.07); },
    correct() { [523, 659, 784].forEach((f, i) => tone(f, 0.25, "triangle", 0.22, i * 0.09)); },
    wrong() { tone(220, 0.3, "sawtooth", 0.12, 0, 150); },
    arrive() { tone(392, 0.5, "sine", 0.18, 0, 784); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.7 : 0.18, "triangle", 0.22, i * 0.12)); },
    whoosh() { tone(180, 0.6, "sawtooth", 0.06, 0, 900); }
  };
})();
