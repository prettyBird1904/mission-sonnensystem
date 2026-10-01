/* =========================================================
   Sound: alles per Web Audio synthetisiert (keine Dateien)
   ========================================================= */
window.Sound = (function () {
  let ctx = null, master = null, engineOsc = null, engineGain = null, engineFilter = null;
  let enabled = true, engineLevel = -1, windGain = null, windFilter = null, windLevel = -1, noiseBuf = null;

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
    unlock() { if (ensure() && ctx.state === "suspended") ctx.resume(); },
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
