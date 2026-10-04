/* =========================================================
   Vorlesen mit echter Stimme
   1. Aufnahmen: Alle festen Texte sind vorab aufgenommen (audio/v/*.mp3, Liste in js/stimmen.js, erzeugt mit tools/stimmen.js) –
      mit deutschen ElevenLabs-Sprechern (mit Gefühl): jede Figur hat ihre eigene Stimme (siehe VOICES in tools/stimmen.js).
      So klingt es auf jedem Gerät gleich – wie ein echter Mensch.
   2. Abgespielt wird über Web Audio; ist der Ton dort angehalten (z. B. vom Browser), über ein Audio-Element.
   3. Es gibt keine Computerstimme: Fehlt eine Aufnahme oder lädt sie nicht (schlechtes Netz), bleibt es still – der Text steht ja da.
      Eine Aufpasser-Uhr sorgt dafür, dass ein hängender Satz nie den Rest blockiert (sonst wartet Nora ewig).
   Den Namen des Kindes kennen die Aufnahmen nicht: Er steht im Text, wird aber nicht mitgesprochen.
   ========================================================= */
window.Voice = (function () {
  const CLIPS = window.VOICE_CLIPS || {}, CLIP_DIR = "audio/v/", HAS_CLIPS = Object.keys(CLIPS).length > 0;
  const OK = HAS_CLIPS;
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
  // Neuer Schlüssel = neue Dateinamen (Tablets speichern Aufnahmen nach Namen) – darum bei jedem Stimmenwechsel ändern
  const NPC_VOICE = { "Kommandantin Lea": "leaEL", "Ingenieur Tom": "tomEL", "Forscherin Mara": "maraEL", "Techniker Bennett": "bennettEL",
    "Forscher Kofi": "kofiEL", "Pilotin Sara": "saraEL", "Astronautin Jana": "janaEL",
    // Gesprächs-Figuren (crew)
    "Geologin Yuki": "yukiEL", "Arzt Felix": "felixEL", "Botaniker Leo": "leoEL", "Pilotin Amira": "amiraEL", "Ingenieurin Ida": "idaEL",
    "Funker Mats": "matsEL", "Robotikerin Lina": "linaEL", "Chemiker Elias": "eliasEL", "Biologin Hanna": "hannaEL", "Meteorologe Paul": "paulEL" };
  function voiceOf(role, who) {
    if (role === "radio") return "radioEL";
    if (role === "narrator") return "erzaehlerEL";
    if (role === "npcF" || role === "npcM") return NPC_VOICE[who] || (role === "npcF" ? "amala" : "killian");
    return "noraEL"; // Nora, Entdeckungskarten, Versuche
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
  const LOAD_MS = 7000; // so lange darf das Laden einer Aufnahme dauern (Handy-Netz) – danach gilt sie als nicht geladen
  function load(h) {
    if (buffers.has(h)) { const p = buffers.get(h); buffers.delete(h); buffers.set(h, p); return p; }
    const ctx = audio(); if (!ctx) return Promise.reject(new Error("kein Audio"));
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const p = new Promise((res, rej) => {
      const to = setTimeout(() => { rej(new Error("zu langsam")); if (ctrl) ctrl.abort(); }, LOAD_MS); // hängt das Netz, nicht ewig warten
      fetch(CLIP_DIR + h + ".mp3", ctrl ? { signal: ctrl.signal } : undefined).then((r) => { if (!r.ok) throw new Error("fehlt"); return r.arrayBuffer(); })
        .then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)))
        .then((buf) => { clearTimeout(to); res(buf); }, (e) => { clearTimeout(to); rej(e); });
    });
    buffers.set(h, p); p.catch(() => { if (buffers.get(h) === p) buffers.delete(h); });
    while (buffers.size > 12) buffers.delete(buffers.keys().next().value);
    return p;
  }

  // Rollen: Vorrang (wer wen unterbrechen darf)
  const ROLE = { nora: { prio: 2 }, radio: { prio: 2 }, card: { prio: 3 }, narrator: { prio: 2 }, npcF: { prio: 1 }, npcM: { prio: 1 } };

  // ---------- Ablauf: immer nur ein Text auf einmal; Intro-Sätze stellen sich hinten an ----------
  let cur = null, queue = [], seq = 0, last = { text: "", at: 0 }, watch = 0;
  function on() { return OK && enabled && (!window.Sound || Sound.enabled); }
  // text = ein Text oder mehrere Teile (werden nacheinander gesprochen) · role: nora | radio | card | narrator | npcF | npcM
  // opt.who = Name des Bewohners · opt.queue = hinten anstellen statt unterbrechen · opt.modal = gehört zu einem Fenster
  // opt.polite = wartet, bis ein Bewohner ausgeredet hat (Nora unterwegs, Bodenstation) · Bewohner selbst warten kurz, wenn Wichtigeres läuft
  // Ohne Aufnahme bleibt ein Text stumm (Rückgabe 0 wie bei „Vorlesen aus“) – eine Computerstimme gibt es nicht.
  function say(text, role = "nora", opt = {}) {
    if (!on()) return 0;
    const parts = (Array.isArray(text) ? text : [text]).filter((t) => t && spoken(t, childName));
    if (!parts.length) return 0;
    const said = parts.map((t) => spoken(t, childName)).join(" ");
    const now = performance.now();
    if (last.text && last.text.startsWith(said) && now - last.at < 25000) return cur ? cur.id : 0; // eben schon gesagt (z. B. derselbe Text ohne die Frage)
    const prio = (ROLE[role] || ROLE.nora).prio;
    const npc = role === "npcF" || role === "npcM", talking = !!cur;
    if (talking && !opt.queue && cur.prio > prio && !npc) return 0; // Wichtigeres läuft gerade (z. B. eine Entdeckung)
    const all = parts.map((t) => clipOf(t, role, opt.who)), clips = all.filter(Boolean);
    if (TEST && clips.length < all.length) (window.__voiceMiss = window.__voiceMiss || []).push(role + (opt.who ? " " + opt.who : "") + ": " + said);
    if (!clips.length) return 0;
    const job = { id: ++seq, prio, role, who: opt.who, modal: !!opt.modal, text: said, clips, i: 0, gen: 0, fails: 0, deadline: 0 };
    last = { text: said, at: now };
    if (opt.queue && cur) { queue.push(job); return job.id; }
    if (talking && npc && cur.prio >= prio) { queue = queue.filter((j) => !j.npcWait); job.npcWait = true; job.expire = now + 6000; queue.push(job); return job.id; } // Bewohner warten kurz, bis das Wichtigere vorbei ist
    if (talking && opt.polite && (cur.role === "npcF" || cur.role === "npcM")) { // Nora und Bodenstation lassen Bewohner ausreden – es wartet immer nur der neueste Satz
      queue = queue.filter((j) => !j.polite); job.polite = true; job.expire = now + 15000; queue.push(job); return job.id;
    }
    halt(); start(job);
    return job.id;
  }
  function start(job) {
    cur = job;
    if (!watch && typeof setInterval === "function") watch = setInterval(watchdog, 400);
    playClip(job, 0);
  }
  function done(job) {
    if (cur !== job) return; cur = null;
    let next; while ((next = queue.shift()) && next.expire && performance.now() > next.expire); // zu lange gewartet: nicht mehr passend
    if (next) start(next);
  }
  // Teil i abspielen – über Web Audio, oder (Ton gerade angehalten) über ein Audio-Element
  const stale = (job, g) => cur !== job || job.gen !== g;
  function playClip(job, i) {
    if (cur !== job) return;
    if (i >= job.clips.length) { done(job); return; }
    job.i = i; const g = ++job.gen;
    if (!job.fails) job.deadline = performance.now() + LOAD_MS + 1500; // bis dahin muss die Aufnahme geladen sein und laufen (neue Versuche verlängern das nicht)
    if (!audio()) { viaElement(job, i, g); return; }
    if (live()) { viaWebAudio(job, i, g); return; }
    wake(); // Ton angehalten: aufwecken und kurz warten – klappt das nicht, über ein Audio-Element
    const t0 = performance.now();
    const check = () => { if (stale(job, g)) return; if (live()) viaWebAudio(job, i, g); else if (performance.now() - t0 > 700) viaElement(job, i, g); else setTimeout(check, 50); };
    check();
  }
  function nextClip(job, i) { job.fails = 0; job.stall = 0; playClip(job, i + 1); }
  function viaWebAudio(job, i, g) {
    load(job.clips[i]).then((buf) => {
      if (stale(job, g)) return;
      if (!live()) { wake(); viaElement(job, i, g); return; }
      const s = ac.createBufferSource(); s.buffer = buf; s.connect(out);
      s.onended = () => { if (job.src === s) { job.src = null; nextClip(job, i); } };
      job.src = s; job.deadline = performance.now() + buf.duration * 1000 + 2000;
      s.start();
    }).catch(() => { if (!stale(job, g)) failed(job, i, g); });
  }
  function viaElement(job, i, g) {
    let el;
    try { el = new Audio(CLIP_DIR + job.clips[i] + ".mp3"); } catch (e) { failed(job, i, g); return; }
    el.onended = () => { if (job.el === el) { job.el = null; nextClip(job, i); } };
    el.onerror = () => { if (job.el === el) failed(job, i, g); };
    el.onplaying = () => { if (job.el === el) job.deadline = performance.now() + (el.duration > 0 && isFinite(el.duration) ? el.duration * 1000 : 20000) + 2000; };
    job.el = el;
    const p = el.play(); if (p && p.catch) p.catch(() => { if (job.el === el) failed(job, i, g); });
    if (TEST) window.__voiceElement = (window.__voiceElement || 0) + 1;
  }
  // Nicht geladen oder nicht abspielbar: kurz warten und nochmal (eine Berührung weckt den Ton) – nach drei Versuchen diesen Teil auslassen
  function failed(job, i, g) {
    if (stale(job, g)) return;
    quiet(job);
    if (++job.fails >= 3) { skipped(job); nextClip(job, i); return; }
    setTimeout(() => { if (!stale(job, g)) playClip(job, i); }, 700);
  }
  function skipped(job) { if (TEST) (window.__voiceSkip = window.__voiceSkip || []).push(job.role + ": " + job.text.slice(0, 60)); }
  function quiet(job) { // laufende Aufnahme des Satzes anhalten (ohne „zu Ende“ auszulösen)
    if (job.src) { const s = job.src; job.src = null; s.onended = null; try { s.stop(); } catch (e) { /* schon zu Ende */ } }
    if (job.el) { const el = job.el; job.el = null; el.onended = el.onerror = el.onplaying = null; try { el.pause(); } catch (e) { /* egal */ } }
  }
  // Aufpasser: Hängt ein Satz (Netz weg, Ton angehalten, kein „zu Ende“), geht es nach der Frist weiter – sonst warten alle anderen ewig
  function watchdog() {
    const job = cur; if (!job) return;
    if (job.src && !live()) { // Ton mittendrin angehalten: kurz Geduld, eine Berührung weckt ihn wieder
      wake(); job.stall = (job.stall || 0) + 400;
      if (job.stall < 8000) { job.deadline += 400; return; }
    }
    if (performance.now() < job.deadline) return;
    quiet(job); skipped(job); nextClip(job, job.i);
  }
  function halt() { // alles verstummen lassen
    queue = [];
    if (cur) quiet(cur);
    cur = null;
  }
  function stop(id) {
    if (!OK) return;
    if (id && (!cur || cur.id !== id)) { queue = queue.filter((j) => j.id !== id); return; }
    halt();
  }
  // Sprechblasen bleiben stehen, solange ihr Text noch gesprochen wird
  const busy = () => !!cur; // spricht gerade jemand? (Hintergrundgeräusche werden dann leiser) – der Aufpasser sorgt dafür, dass das nie hängen bleibt
  const speaking = (id) => !!(id && ((cur && cur.id === id) || queue.some((j) => j.id === id)));
  function stopModal() { queue = queue.filter((j) => !j.modal); if (cur && cur.modal) halt(); } // Fenster zu: auch wartende Sätze dazu verwerfen
  // Aufnahmen eines Ortes schon im Hintergrund laden (dann gibt es keine Pause vor dem Sprechen)
  const fetched = new Set();
  function prefetch(tag) {
    if (!HAS_CLIPS || !on()) return;
    const list = Object.keys(CLIPS).filter((h) => CLIPS[h] === tag && !fetched.has(h));
    let i = 0;
    const next = () => { if (i >= list.length) return; const h = list[i++]; fetched.add(h); fetch(CLIP_DIR + h + ".mp3").catch(() => fetched.delete(h)).then(next); };
    for (let k = 0; k < 3; k++) next();
  }
  // Auf dem iPad darf erst nach einer Berührung gesprochen werden: den Ton dabei aufwecken
  function unlock() { wake(); }
  function toggle() { enabled = !enabled; set("ms-vorlesen", enabled ? "1" : "0"); if (!enabled) halt(); return enabled; }
  document.addEventListener("visibilitychange", () => { if (document.hidden) halt(); else wake(); });
  // Jede Berührung, jeder Klick, jede Taste weckt den Ton wieder auf (Browser halten ihn manchmal an, z. B. nach dem Sperren oder Kopfhörer-Wechsel)
  if (typeof window !== "undefined" && window.addEventListener) for (const ev of ["pointerdown", "touchend", "keydown", "click"]) window.addEventListener(ev, wake, { capture: true, passive: true });

  return {
    say, stop, speaking, busy, stopModal, prefetch, unlock, toggle, speakable,
    currentId: () => (cur ? cur.id : 0), // wessen Satz gerade läuft (Gespräche: Sprechblase umschalten)
    setName(n) { childName = n || ""; },
    get enabled() { return enabled; }, get supported() { return OK; }, get recorded() { return HAS_CLIPS; },
    // für tools/stimmen.js (Aufnahmen erzeugen) und Tests
    _spoken: spoken, _key: keyOf, _hash: hashOf, _voiceOf: voiceOf, _hasClip: (text, role, who) => !!clipOf(text, role, who)
  };
})();
