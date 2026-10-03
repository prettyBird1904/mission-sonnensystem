/* =========================================================
   Vorlesen mit echter Stimme
   1. Aufnahmen: Alle festen Texte sind vorab mit natürlichen, neuronalen Stimmen aufgenommen (audio/v/*.mp3,
      Liste in js/stimmen.js, erzeugt mit tools/stimmen.js). So klingt es auf jedem Gerät gleich – wie ein echter Mensch.
      Nur rein deutschsprachige Stimmen: Nora = Katja, Bodenstation und Erzähler = Conrad, die Bewohner haben je eine eigene Stimme
      (aus Deutschland, Österreich und der Schweiz – siehe tools/stimmen.js).
   2. Abgespielt wird über Web Audio; ist der Ton dort angehalten (z. B. vom Browser), über ein Audio-Element.
   3. Nur wenn eine Aufnahme fehlt oder gar nicht lädt, liest die Stimme des Geräts vor (Web Speech API).
   Den Namen des Kindes kennen die Aufnahmen nicht: Er steht im Text, wird aber nicht mitgesprochen.
   ========================================================= */
window.Voice = (function () {
  const synth = window.speechSynthesis, TTS = !!(synth && window.SpeechSynthesisUtterance);
  const CLIPS = window.VOICE_CLIPS || {}, CLIP_DIR = "audio/v/", HAS_CLIPS = Object.keys(CLIPS).length > 0;
  const OK = TTS || HAS_CLIPS;
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* egal */ } };
  let enabled = get("ms-vorlesen") !== "0";
  const TEST = typeof location !== "undefined" && /[?&]test/.test(location.search); // Tests: fehlende Aufnahmen mitschreiben (window.__voiceMiss)
  let childName = "";

  // ---------- Text so aufbereiten, wie er gesprochen wird ----------
  // Emojis und Pfeile weg, Einheiten ausgeschrieben (°C, km/h, −, ½ …)
  function speakable(t) {
    return String(t || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu, " ")
      .replace(/(\d)\s*½/g, "$1 einhalb").replace(/½/g, "einhalb")
      .replace(/[−-]\s?(\d)/g, (m, d, i, s) => (i > 0 && /\w/.test(s[i - 1]) ? m : "minus " + d))
      .replace(/(\d)\s*°C/g, "$1 Grad").replace(/°C/g, "Grad")
      .replace(/km\/h/g, "Kilometer pro Stunde").replace(/(\d)\s*km\b/g, "$1 Kilometer").replace(/(\d)\s*kg\b/g, "$1 Kilo").replace(/(\d)\s*m\b/g, "$1 Meter")
      .replace(/\bMio\./g, "Millionen").replace(/\bMrd\./g, "Milliarden").replace(/\bz\. ?B\./g, "zum Beispiel").replace(/\bca\./g, "circa")
      .replace(/\b([A-ZÄÖÜ]{3,})\b/g, (w) => (/^(NASA|ESA|ISS)$/.test(w) ? w : w[0] + w.slice(1).toLowerCase())) // „ALLE“ nicht buchstabieren
      .replace(/[„“"«»]/g, "").replace(/\s*[–—·]\s*/g, ", ").replace(/…/g, ", ").replace(/\.\s*\./g, ".").replace(/([!?])\s*\./g, "$1").replace(/\s=\s/g, " ist ")
      .replace(/\s+([,.!?])/g, "$1").replace(/,{2,}/g, ",").replace(/,([.!?])/g, "$1")
      .replace(/^[\s,]+/, "").replace(/[\s,]+$/, "").replace(/\s{2,}/g, " ").trim();
  }
  // Den Namen des Kindes aus dem gesprochenen Text nehmen („Super, Emil! Weiter …“ → „Super! Weiter …“)
  function dropName(t, name) {
    name = (name || "").trim();
    if (name) { // nur ganze Wörter (aus „Bennett“ wird bei einem Kind namens Ben nichts weggenommen)
      const L = /[A-Za-zÄÖÜäöüß0-9]/; let out = "", i = 0;
      for (;;) {
        const j = t.indexOf(name, i); if (j < 0) { out += t.slice(i); break; }
        const a = t[j - 1], b = t[j + name.length];
        out += t.slice(i, j) + ((a && L.test(a)) || (b && L.test(b)) ? name : "§N§"); i = j + name.length;
      }
      t = out;
    }
    return t.replace(/([.!?]\s+)§N§,\s*/g, "$1").replace(/^§N§,\s*/, "").replace(/\s+§N§,/g, ",").replace(/,\s*§N§(?=[!?.:;])/g, "")
      .replace(/\s+§N§(?=[!?.:;,])/g, "").replace(/§N§/g, "").replace(/,\s*,/g, ",")
      .replace(/(^|[.!?]\s+)([a-zäöü])/g, (m, a, c) => a + c.toUpperCase()).replace(/\s+([,.!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
  }
  const spoken = (text, name) => dropName(speakable(text), name);

  // ---------- Aufnahmen: wer spricht mit welcher Stimme (siehe tools/stimmen.js) ----------
  const NPC_VOICE = { "Kommandantin Lea": "lea", "Ingenieur Tom": "tomJonas", "Forscherin Mara": "maraIngrid", "Techniker Bennett": "bennettJan",
    "Forscher Kofi": "kofi", "Pilotin Sara": "saraIngrid", "Astronautin Jana": "jana" };
  function voiceOf(role, who) {
    if (role === "radio") return "radio";
    if (role === "narrator") return "erzaehler";
    if (role === "npcF" || role === "npcM") return NPC_VOICE[who] || (role === "npcF" ? "amala" : "killian");
    return "noraKatja"; // Nora, Entdeckungskarten, Versuche (neuer Schlüssel = neue Dateinamen, damit Tablets nicht die alten Aufnahmen aus dem Speicher nehmen)
  }
  const keyOf = (text, role, who, name) => voiceOf(role, who) + "|" + spoken(text, name).toLowerCase().replace(/[^a-z0-9äöüß]+/g, " ").trim();
  function hashOf(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ("0000000" + h.toString(16)).slice(-8); }
  const clipOf = (text, role, who) => { const h = hashOf(keyOf(text, role, who, childName)); return CLIPS[h] ? h : null; };

  // ---------- Abspielen über Web Audio (dieselbe Audio-Verbindung wie die Spielgeräusche – auf dem iPad schon freigeschaltet) ----------
  let ac = null, out = null;
  function audio() {
    if (!ac && window.Sound && Sound.context) { ac = Sound.context(); if (ac) { out = ac.createGain(); out.gain.value = 1; out.connect(ac.destination); } }
    return ac;
  }
  const live = () => !!(ac && ac.state === "running");
  function wake() { const ctx = audio(); if (ctx && ctx.state !== "running" && ctx.state !== "closed") { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* egal */ } } }
  const buffers = new Map(); // die zuletzt gebrauchten Aufnahmen, fertig entpackt
  function load(h) {
    if (buffers.has(h)) { const p = buffers.get(h); buffers.delete(h); buffers.set(h, p); return p; }
    const ctx = audio(); if (!ctx) return Promise.reject(new Error("kein Audio"));
    const p = fetch(CLIP_DIR + h + ".mp3").then((r) => { if (!r.ok) throw new Error("fehlt"); return r.arrayBuffer(); })
      .then((b) => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)));
    buffers.set(h, p); p.catch(() => buffers.delete(h));
    while (buffers.size > 12) buffers.delete(buffers.keys().next().value);
    return p;
  }

  // ---------- Gerätestimme (nur, wenn eine Aufnahme fehlt) ----------
  let voices = [], devNora = null, devMale = null, failed = new Set();
  const FEMALE = /katja|amala|seraphina|louisa|hedda|anna|helena|petra|marlene|vicki|sandy|shelley|grandma|ingrid|leni|gisela|elke|klara|maja|tanja|sabine|claudia|steffi|google deutsch|female|frau/i;
  const MALE = /conrad|florian|killian|stefan|markus|yannick|martin|hans|jonas|\bjan\b|eddy|reed|rocko|grandpa|ralf|bernd|christoph|kasper|klaus|dieter|thomas|\bmale\b|mann/i;
  function quality(v) {
    const n = v.name || "";
    let q = /natural|neural/i.test(n) ? 100 : /premium/i.test(n) ? 95 : /online/i.test(n) ? 90 : /enhanced|erweitert|verbessert|siri/i.test(n) ? 80 : /google/i.test(n) ? 60 : 30;
    if (/^de[-_]de/i.test(v.lang || "")) q += 6;
    if (failed.has(n)) q -= 300;
    return q;
  }
  const natural = (v) => !!v && /natural|neural|online/i.test(v.name);
  function choose() {
    if (!TTS) return;
    voices = synth.getVoices().filter((v) => /^de/i.test(v.lang || ""));
    const want = get("ms-stimme");
    devNora = voices.find((v) => v.name === want && !failed.has(v.name))
      || voices.slice().sort((a, b) => quality(b) + (FEMALE.test(b.name) ? 50 : 0) - quality(a) - (FEMALE.test(a.name) ? 50 : 0))[0] || null;
    devMale = voices.filter((v) => MALE.test(v.name) && v !== devNora).sort((a, b) => quality(b) - quality(a))[0] || null;
    if (devMale && devNora && quality(devMale) < quality(devNora) - 35) devMale = null; // keine gute Männerstimme: Noras Stimme, nur tiefer
  }
  if (TTS) { choose(); if (synth.addEventListener) synth.addEventListener("voiceschanged", choose); else synth.onvoiceschanged = choose; }
  // Rollen: Vorrang (wer wen unterbrechen darf) und Betonung der Gerätestimme
  const ROLE = {
    nora: { prio: 2, pitch: 1.06, rate: 1 }, radio: { prio: 2, pitch: 0.94, rate: 1 }, card: { prio: 3, pitch: 1.04, rate: 0.97 },
    narrator: { prio: 2, pitch: 0.88, rate: 0.9 }, npcF: { prio: 1, pitch: 1.16, rate: 1.02 }, npcM: { prio: 1, pitch: 0.9, rate: 1 }
  };
  const sentences = (t) => (t.match(/[^.!?]+[.!?]*/g) || [t]).map((s) => s.trim()).filter((s) => /[a-zäöüß0-9]/i.test(s));
  function tune(u, s, base, nat) { // Betonung pro Satz: Ausrufe heller, Fragen gehen hoch, „Psst“ leise
    let rate = base.rate, pitch = base.pitch, vol = 1;
    if (/!$/.test(s)) { rate += 0.05; pitch += 0.07; } else if (/\?$/.test(s)) pitch += 0.05;
    if (/^(wow|juhu|super|toll|klasse|prima|fantastisch|geschafft|hurra|spitze|bravo|da ist|da sind|gefunden|richtig|volltreffer)/i.test(s)) { pitch += 0.09; rate += 0.03; }
    if (/^(psst|pst)/i.test(s)) { rate -= 0.14; vol = 0.75; }
    if (/^(puh|oh|oje|hoppla|achtung|vorsicht|brr|nicht ganz)/i.test(s)) rate -= 0.05;
    if (nat) pitch = 1 + (pitch - 1) * 0.5; else rate *= 0.95;
    u.rate = Math.max(0.6, Math.min(1.4, rate)); u.pitch = Math.max(0.5, Math.min(1.6, pitch)); u.volume = vol;
  }
  let lastCancel = -1e9;
  function speakTTS(job) {
    if (!TTS) { done(job); return; }
    const male = job.role === "radio" || job.role === "narrator" || job.role === "npcM";
    const v = male ? devMale || devNora : devNora, nat = natural(v), base = { ...(ROLE[job.role] || ROLE.nora) };
    if (male && !devMale) base.pitch -= 0.14;
    const parts = nat && job.text.length < 260 ? [job.text] : sentences(job.text);
    let left = parts.length;
    const go = () => {
      if (cur !== job) return;
      parts.forEach((s) => {
        const u = new SpeechSynthesisUtterance(s);
        if (v) u.voice = v; u.lang = v ? v.lang : "de-DE";
        tune(u, s, base, nat);
        const end = () => { if (--left <= 0) done(job); };
        u.onend = end;
        u.onerror = (e) => { if (v && e && e.error && !/interrupted|canceled/.test(e.error)) { failed.add(v.name); choose(); } end(); };
        job.utt = (job.utt || []).concat(u); // sonst räumt Chrome die Äußerung manchmal zu früh weg (dann kommt kein „Ende“)
        synth.speak(u);
      });
    };
    if (performance.now() - lastCancel < 80) setTimeout(go, 70); else go(); // Chrome verschluckt sonst das Sprechen direkt nach cancel()
  }

  // ---------- Ablauf: immer nur ein Text auf einmal; Intro-Sätze stellen sich hinten an ----------
  let cur = null, queue = [], seq = 0, last = { text: "", at: 0 };
  function on() { return OK && enabled && (!window.Sound || Sound.enabled); }
  // text = ein Text oder mehrere Teile (werden nacheinander gesprochen) · role: nora | radio | card | narrator | npcF | npcM
  // opt.who = Name des Bewohners · opt.queue = hinten anstellen statt unterbrechen · opt.modal = gehört zu einem Fenster
  // opt.polite = wartet, bis ein Bewohner ausgeredet hat (Nora unterwegs, Bodenstation) · Bewohner selbst warten kurz, wenn Wichtigeres läuft
  function say(text, role = "nora", opt = {}) {
    if (!on()) return 0;
    const parts = (Array.isArray(text) ? text : [text]).filter((t) => t && spoken(t, childName));
    if (!parts.length) return 0;
    const said = parts.map((t) => spoken(t, childName)).join(" ");
    const now = performance.now();
    if (last.text && last.text.startsWith(said) && now - last.at < 25000) return cur ? cur.id : 0; // eben schon gesagt (z. B. derselbe Text ohne die Frage)
    const prio = (ROLE[role] || ROLE.nora).prio;
    const npc = role === "npcF" || role === "npcM", talking = cur && now < cur.until;
    if (talking && !opt.queue && cur.prio > prio && !npc) return 0; // Wichtigeres läuft gerade (z. B. eine Entdeckung)
    const clips = HAS_CLIPS ? parts.map((t) => clipOf(t, role, opt.who)) : [];
    const job = { id: ++seq, prio, role, who: opt.who, modal: !!opt.modal, text: said, clips: clips.length && clips.every(Boolean) ? clips : null, until: 0 };
    if (HAS_CLIPS && !job.clips && TEST) (window.__voiceMiss = window.__voiceMiss || []).push(role + (opt.who ? " " + opt.who : "") + ": " + said);
    last = { text: said, at: now };
    if (opt.queue && cur) { queue.push(job); return job.id; }
    if (talking && npc && cur.prio > prio) { queue = queue.filter((j) => !j.npcWait); job.npcWait = true; job.expire = now + 6000; queue.push(job); return job.id; } // Bewohner warten kurz, bis das Wichtigere vorbei ist
    if (talking && opt.polite && (cur.role === "npcF" || cur.role === "npcM")) { // Nora und Bodenstation lassen Bewohner ausreden – es wartet immer nur der neueste Satz
      queue = queue.filter((j) => !j.polite); job.polite = true; job.expire = now + 15000; queue.push(job); return job.id;
    }
    halt(); start(job);
    return job.id;
  }
  function start(job) {
    cur = job; job.until = performance.now() + (job.text.length / 9 + 6) * 1000; // spätestens dann gilt der Text als fertig
    if (!job.clips) { speakTTS(job); return; }
    if (!audio()) { playElement(job, 0); return; }
    if (live()) { playClips(job, 0); return; }
    // Ton angehalten: aufwecken und kurz warten – klappt das nicht, die Aufnahme über ein Audio-Element abspielen
    wake();
    const t0 = performance.now();
    const check = () => { if (cur !== job) return; if (live()) playClips(job, 0); else if (performance.now() - t0 > 600) playElement(job, 0); else setTimeout(check, 50); };
    check();
  }
  function done(job) {
    if (cur !== job) return; cur = null;
    let next; while ((next = queue.shift()) && next.expire && performance.now() > next.expire); // zu lange gewartet: nicht mehr passend
    if (next) start(next);
  }
  function playClips(job, i, retry) {
    if (cur !== job) return;
    if (i >= job.clips.length) { done(job); return; }
    if (!live()) { wake(); playElement(job, i); return; } // Ton zwischendurch angehalten
    load(job.clips[i]).then((buf) => {
      if (cur !== job) return;
      const s = ac.createBufferSource(); s.buffer = buf; s.connect(out);
      s.onended = () => { if (job.src === s) { job.src = null; playClips(job, i + 1); } };
      job.src = s; s.start();
    }).catch(() => { // nicht geladen: noch einmal versuchen, dann über das Audio-Element (das holt die Datei selbst)
      if (cur !== job) return;
      if (!retry) setTimeout(() => playClips(job, i, true), 400); else playElement(job, i);
    });
  }
  // Ersatzweg: <audio> spielt die Aufnahme auch, wenn Web Audio nicht läuft. Erst wenn auch das scheitert: Gerätestimme.
  function playElement(job, i) {
    if (cur !== job) return;
    if (i >= job.clips.length) { done(job); return; }
    let el;
    try { el = new Audio(CLIP_DIR + job.clips[i] + ".mp3"); } catch (e) { el = null; }
    if (!el) { speakTTS(job); return; }
    let over = false;
    const fail = () => { if (over || cur !== job || job.el !== el) return; over = true; job.el = null; speakTTS(job); };
    el.onended = () => { if (over || job.el !== el) return; over = true; job.el = null; playClips(job, i + 1); };
    el.onerror = fail;
    job.el = el;
    const p = el.play(); if (p && p.catch) p.catch(fail);
    if (TEST) window.__voiceElement = (window.__voiceElement || 0) + 1;
  }
  function halt() { // alles verstummen lassen
    queue = [];
    if (cur && cur.src) { const s = cur.src; cur.src = null; try { s.stop(); } catch (e) { /* schon zu Ende */ } }
    if (cur && cur.el) { const el = cur.el; cur.el = null; try { el.pause(); } catch (e) { /* egal */ } }
    cur = null;
    if (TTS && (synth.speaking || synth.pending)) { synth.cancel(); lastCancel = performance.now(); }
  }
  function stop(id) {
    if (!OK) return;
    if (id && (!cur || cur.id !== id)) { queue = queue.filter((j) => j.id !== id); return; }
    halt();
  }
  // Sprechblasen bleiben stehen, solange ihr Text noch gesprochen wird
  const busy = () => !!(cur && performance.now() < cur.until); // spricht gerade jemand? (Hintergrundgeräusche werden dann leiser)
  const speaking = (id) => !!(id && ((cur && cur.id === id && performance.now() < cur.until) || queue.some((j) => j.id === id)));
  function stopModal() { if (cur && cur.modal) halt(); }
  // Aufnahmen eines Ortes schon im Hintergrund laden (dann gibt es keine Pause vor dem Sprechen)
  const fetched = new Set();
  function prefetch(tag) {
    if (!HAS_CLIPS || !on()) return;
    const list = Object.keys(CLIPS).filter((h) => CLIPS[h] === tag && !fetched.has(h));
    let i = 0;
    const next = () => { if (i >= list.length) return; const h = list[i++]; fetched.add(h); fetch(CLIP_DIR + h + ".mp3").catch(() => fetched.delete(h)).then(next); };
    for (let k = 0; k < 3; k++) next();
  }
  // Auf dem iPad darf erst nach einer Berührung gesprochen werden: einmal leise „freischalten“
  let unlocked = false;
  function unlock() {
    wake();
    if (!TTS || unlocked) return; unlocked = true;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); } catch (e) { /* egal */ }
  }
  function toggle() { enabled = !enabled; set("ms-vorlesen", enabled ? "1" : "0"); if (!enabled) halt(); return enabled; }
  function list() { choose(); return voices.map((v) => ({ name: v.name, lang: v.lang, q: quality(v), nora: v === devNora })).sort((a, b) => b.q - a.q); }
  function setVoice(name) { set("ms-stimme", name || ""); choose(); }
  document.addEventListener("visibilitychange", () => { if (document.hidden) halt(); else wake(); });
  // Jede Berührung, jeder Klick, jede Taste weckt den Ton wieder auf (Browser halten ihn manchmal an, z. B. nach dem Sperren oder Kopfhörer-Wechsel)
  if (typeof window !== "undefined" && window.addEventListener) for (const ev of ["pointerdown", "touchend", "keydown", "click"]) window.addEventListener(ev, wake, { capture: true, passive: true });

  return {
    say, stop, speaking, busy, stopModal, prefetch, unlock, toggle, list, setVoice, speakable,
    setName(n) { childName = n || ""; },
    get enabled() { return enabled; }, get supported() { return OK; }, get recorded() { return HAS_CLIPS; },
    get voiceName() { return devNora ? devNora.name : ""; },
    // für tools/stimmen.js (Aufnahmen erzeugen) und Tests
    _spoken: spoken, _key: keyOf, _hash: hashOf, _voiceOf: voiceOf, _hasClip: (text, role, who) => !!clipOf(text, role, who)
  };
})();
