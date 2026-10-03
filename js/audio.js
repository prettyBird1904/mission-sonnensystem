/* =========================================================
   Sound: alles per Web Audio synthetisiert (keine Dateien)
   ========================================================= */
window.Sound = (function () {
  let ctx = null, master = null, engineOsc = null, engineGain = null, engineFilter = null;
  let enabled = true, engineLevel = -1, windGain = null, windFilter = null, windLevel = -1, noiseBuf = null;
  let amb = null; // Hintergrundgeräusche der Landeorte (siehe ambience)

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
      noiseBuf = buf;
      engineOsc = ctx.createBufferSource();
      engineOsc.buffer = buf; engineOsc.loop = true;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = "lowpass"; engineFilter.frequency.value = 300;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineFilter).connect(engineGain).connect(master);
      engineOsc.start();
      // Wind (z. B. auf dem Mars): dasselbe Rauschen, aber hell gefiltert und leise
      const windSrc = ctx.createBufferSource(); windSrc.buffer = buf; windSrc.loop = true; windSrc.playbackRate.value = 0.7;
      windFilter = ctx.createBiquadFilter(); windFilter.type = "bandpass"; windFilter.frequency.value = 500; windFilter.Q.value = 0.8;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      windSrc.connect(windFilter).connect(windGain).connect(master);
      windSrc.start();
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
    unlock() { if (ensure() && ctx.state !== "running" && ctx.state !== "closed") { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } }, // auch „interrupted“
    context() { return ensure() ? ctx : null; }, // für die Sprachaufnahmen (js/voice.js)
    get _amb() { return amb; }, // für Tests (Lautstärke messen)
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      if (!enabled && engineGain) { engineGain.gain.cancelScheduledValues(0); engineGain.gain.value = 0; engineLevel = -1; }
      if (!enabled && windGain) { windGain.gain.cancelScheduledValues(0); windGain.gain.value = 0; windLevel = -1; }
      return enabled;
    },
    engine(level) {
      if (!ctx || !enabled) return;
      // Nicht jedes Bild neue Befehle planen – die sammeln sich sonst an und bremsen mit der Zeit
      if (Math.abs(level - engineLevel) < 0.03) return;
      engineLevel = level;
      const t = ctx.currentTime;
      engineGain.gain.cancelScheduledValues(t);
      engineFilter.frequency.cancelScheduledValues(t);
      engineGain.gain.setTargetAtTime(level * 0.35, t, 0.15);
      engineFilter.frequency.setTargetAtTime(200 + level * 700, t, 0.2);
    },
    // Windrauschen 0 … 1 (Böen: einfach öfter mit anderem Wert aufrufen)
    wind(level) {
      if (!ctx || !enabled) return;
      if (Math.abs(level - windLevel) < 0.02) return;
      windLevel = level;
      const t = ctx.currentTime;
      windGain.gain.cancelScheduledValues(t); windFilter.frequency.cancelScheduledValues(t);
      windGain.gain.setTargetAtTime(level * 0.22, t, 0.6);
      windFilter.frequency.setTargetAtTime(350 + level * 500, t, 0.8);
    },
    // ---------- Hintergrundgeräusche an den Landeorten ----------
    // Bewusst sehr leise und weich: nur tiefe Frequenzen (kein Zischen), ein langes Rauschen ohne hörbare Wiederholung,
    // langsame Böen, und alles wird leiser, sobald jemand spricht.
    // levels = { wind, hum, water, lava } jeweils 0 … 1 (fehlend = 0); null = alles aus
    ambience(levels, duck = false) {
      if (!ctx || ctx.state !== "running") return;
      if (!amb) {
        const len = ctx.sampleRate * 9, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
        let brown = 0; for (let i = 0; i < len; i++) { brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = brown * 3.5; } // „braunes“ Rauschen: weich und dumpf
        const fade = ctx.sampleRate * 0.5; for (let i = 0; i < fade; i++) { const k = i / fade; d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k; } // nahtlose Schleife
        const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(master);
        const chan = (type, freq, q, rate) => {
          const src = ctx.createBufferSource(); src.buffer = b; src.loop = true; src.playbackRate.value = rate; src.loopStart = 0; src.start(0, Math.random() * 8);
          const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
          const g = ctx.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(bus);
          return { f, g, last: -1 };
        };
        amb = { bus, wind: chan("lowpass", 380, 0.4, 1), water: chan("bandpass", 520, 0.9, 1.3), lava: chan("lowpass", 120, 0.7, 0.8), hum: chan("lowpass", 170, 0.5, 0.6), busLast: -1 };
        // Brummen des Lebenserhaltungs-Systems im Raumanzug: dazu zwei sehr leise tiefe Töne
        for (const fr of [58, 117]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = fr; g.gain.value = 0.18; o.connect(g).connect(amb.hum.g); o.start(); }
      }
      const t = ctx.currentTime, L = levels || {}, on = enabled && !!levels;
      const vol = on ? (duck ? 0.35 : 1) : 0;
      if (Math.abs(vol - amb.busLast) > 0.01) { amb.busLast = vol; amb.bus.gain.cancelScheduledValues(t); amb.bus.gain.setTargetAtTime(vol, t, vol < 0.5 ? 0.25 : 1.2); }
      const MAX = { wind: 0.12, water: 0.09, lava: 0.1, hum: 0.06 }; // gemessen: Sprache ca. 20–30 dB lauter als der Hintergrund
      for (const k of ["wind", "water", "lava", "hum"]) {
        const v = Math.max(0, Math.min(1, L[k] || 0)), c = amb[k];
        if (Math.abs(v - c.last) < 0.02) continue; c.last = v;
        c.g.gain.cancelScheduledValues(t); c.g.gain.setTargetAtTime(v * MAX[k], t, 1.5);
        if (k === "wind") { c.f.frequency.cancelScheduledValues(t); c.f.frequency.setTargetAtTime(260 + v * 260, t, 2); } // stärkere Böe = etwas heller, aber nie zischend
      }
    },
    // Vogelstimme: zwei, drei kurze Pfiffe (leise, zufällig verschieden)
    bird(vol = 1) {
      if (!enabled || !ctx || ctx.state !== "running") return;
      const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3), t0 = ctx.currentTime;
      for (let i = 0; i < n; i++) {
        const t = t0 + i * (0.11 + Math.random() * 0.06), o = ctx.createOscillator(), g = ctx.createGain(), f = base * (0.9 + Math.random() * 0.25);
        o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.35 : 0.75), t + 0.08);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.028 * vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(g).connect(master); o.start(t); o.stop(t + 0.1);
      }
    },
    // Lava-Blubbern: tiefes, weiches „Plopp“
    bubble(vol = 1) {
      if (!enabled || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = 70 + Math.random() * 60;
      o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.2);
    },
    click() { tone(660, 0.08, "triangle", 0.15); },
    ping(f = 880) { tone(f, 0.11, "sine", 0.16); }, // Radar-Piepen
    // Kamera-Auslöser: zwei kurze, helle Rauschklicks
    shutter() {
      if (!enabled || !ensure()) return;
      const t = ctx.currentTime;
      for (const [d, v] of [[0, 0.5], [0.08, 0.32]]) {
        const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        n.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 2400;
        g.gain.setValueAtTime(v, t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
        n.connect(f).connect(g).connect(master); n.start(t + d, Math.random()); n.stop(t + d + 0.07);
      }
    },
    collect() { tone(988, 0.12, "sine", 0.2); tone(1319, 0.2, "sine", 0.2, 0.07); },
    correct() { [523, 659, 784].forEach((f, i) => tone(f, 0.25, "triangle", 0.22, i * 0.09)); },
    wrong() { tone(220, 0.3, "sawtooth", 0.12, 0, 150); },
    arrive() { tone(392, 0.5, "sine", 0.18, 0, 784); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.7 : 0.18, "triangle", 0.22, i * 0.12)); },
    whoosh() { tone(180, 0.6, "sawtooth", 0.06, 0, 900); },
    land() { tone(110, 0.45, "sine", 0.3, 0, 45); tone(70, 0.6, "triangle", 0.2, 0.03, 40); },
    // Filmmusik fürs Intro: alles wird ab jetzt (Sekunde 0) im Voraus geplant; stop() blendet alles aus
    cinematic() {
      if (!enabled || !ensure()) return null;
      if (ctx.state === "suspended") ctx.resume();
      const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
      const t0 = ctx.currentTime + 0.05, at = (s) => t0 + s;
      const env = (g, s, dur, vol, att, rel) => {
        g.gain.setValueAtTime(0.0001, at(s));
        g.gain.exponentialRampToValueAtTime(vol, at(s) + att);
        g.gain.setValueAtTime(vol, at(s) + Math.max(att, dur - rel));
        g.gain.exponentialRampToValueAtTime(0.0001, at(s) + dur);
      };
      const noise = (s, dur) => { const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true; n.start(at(s)); n.stop(at(s) + dur + 0.1); return n; };
      return {
        // weicher Klangteppich aus leicht verstimmten Sägezähnen hinter einem Tiefpass (wird langsam heller)
        pad(freqs, s, dur, vol = 0.04, bright = 900) {
          const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 0.6;
          f.frequency.setValueAtTime(bright * 0.45, at(s)); f.frequency.linearRampToValueAtTime(bright, at(s) + dur * 0.7);
          const g = ctx.createGain(), fade = Math.min(2.4, dur * 0.4); env(g, s, dur, vol, fade, fade);
          f.connect(g).connect(bus);
          for (const fr of freqs) for (const d of [-7, 7]) {
            const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.detune.value = d;
            o.connect(f); o.start(at(s)); o.stop(at(s) + dur + 0.1);
          }
        },
        // heller Glockenton (mit leiser Oktave darüber)
        bell(fr, s, vol = 0.1) {
          for (const [m, v] of [[1, vol], [2, vol * 0.3], [3, vol * 0.08]]) {
            const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = fr * m;
            g.gain.setValueAtTime(0.0001, at(s)); g.gain.exponentialRampToValueAtTime(v, at(s) + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at(s) + 2.4 / m);
            o.connect(g).connect(bus); o.start(at(s)); o.stop(at(s) + 2.5);
          }
        },
        // tiefer Donnerschlag
        boom(s, vol = 0.5) {
          const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine";
          o.frequency.setValueAtTime(95, at(s)); o.frequency.exponentialRampToValueAtTime(26, at(s) + 2.2);
          env(g, s, 2.4, vol, 0.02, 2); o.connect(g).connect(bus); o.start(at(s)); o.stop(at(s) + 2.5);
          const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500;
          const gn = ctx.createGain(); env(gn, s, 1.6, vol * 0.5, 0.01, 1.4);
          noise(s, 1.6).connect(f).connect(gn).connect(bus);
        },
        // anschwellendes Rauschen vor dem Start
        riser(s, dur, vol = 0.1) {
          const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2;
          f.frequency.setValueAtTime(250, at(s)); f.frequency.exponentialRampToValueAtTime(3800, at(s) + dur);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at(s)); g.gain.exponentialRampToValueAtTime(vol, at(s) + dur); g.gain.exponentialRampToValueAtTime(0.0001, at(s) + dur + 0.3);
          noise(s, dur + 0.3).connect(f).connect(g).connect(bus);
        },
        // Triebwerksgrollen beim Abheben
        rumble(s, dur, vol = 0.35) {
          const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 170;
          const g = ctx.createGain(); env(g, s, dur, vol, 0.3, Math.min(2, dur * 0.5));
          noise(s, dur).connect(f).connect(g).connect(bus);
        },
        beep(fr, s, vol = 0.14) {
          const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = fr;
          env(g, s, 0.3, vol, 0.01, 0.25); o.connect(g).connect(bus); o.start(at(s)); o.stop(at(s) + 0.35);
        },
        stop(fade = 0.6) {
          const t = ctx.currentTime;
          bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0, t + fade);
          setTimeout(() => bus.disconnect(), fade * 1000 + 300);
        }
      };
    }
  };
})();
