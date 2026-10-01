/* =========================================================
   Vorlesen: Texte mit der natürlichsten Stimme, die das Gerät kennt (Web Speech API, keine Dateien, funktioniert offline
   mit den Stimmen des Geräts).
   - Nora (Flugleiterin) spricht mit einer Frauenstimme, die Bodenstation mit einer Männerstimme, der Erzähler im Intro ruhig.
   - Am natürlichsten klingen die neuronalen Stimmen in Microsoft Edge („… Online (Natural)“) und auf dem iPad die
     „Premium“- bzw. „Erweitert“-Stimmen (Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch).
   - Lebendiger: Jeder Satz bekommt seine eigene Betonung – Ausrufe heller und schneller, Fragen gehen hoch, „Psst“ leise.
   ========================================================= */
window.Voice = (function () {
  const synth = window.speechSynthesis, OK = !!(synth && window.SpeechSynthesisUtterance);
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* egal */ } };
  let enabled = get("ms-vorlesen") !== "0";
  let voices = [], nora = null, radio = null, failed = new Set();
  let cur = null, seq = 0, last = { text: "", at: 0 }, keep = [], later = 0;

  // Frauen- und Männerstimmen an ihren Namen erkennen (Edge, Windows, Chrome, iPad, Android)
  const FEMALE = /katja|amala|seraphina|louisa|hedda|anna|helena|petra|marlene|vicki|sandy|shelley|grandma|ingrid|leni|gisela|elke|klara|maja|tanja|sabine|claudia|steffi|google deutsch|female|frau/i;
  const MALE = /conrad|florian|killian|stefan|markus|yannick|martin|hans|jonas|\bjan\b|eddy|reed|rocko|grandpa|ralf|bernd|christoph|kasper|klaus|dieter|thomas|\bmale\b|mann/i;
  // Wie natürlich klingt eine Stimme? (neuronale und Premium-Stimmen zuerst)
  function quality(v) {
    const n = v.name || "";
    let q = /natural|neural/i.test(n) ? 100 : /premium/i.test(n) ? 95 : /online/i.test(n) ? 90 : /enhanced|erweitert|verbessert|siri/i.test(n) ? 80 : /google/i.test(n) ? 60 : 30;
    if (/^de[-_]de/i.test(v.lang || "")) q += 6;
    if (failed.has(n)) q -= 300;
    return q;
  }
  const natural = (v) => !!v && /natural|neural|online/i.test(v.name);
  function choose() {
    if (!OK) return;
    voices = synth.getVoices().filter((v) => /^de/i.test(v.lang || ""));
    const want = get("ms-stimme");
    nora = voices.find((v) => v.name === want && !failed.has(v.name)) // Wahl der Lehrkraft – sonst die beste Frauenstimme
      || voices.slice().sort((a, b) => quality(b) + (FEMALE.test(b.name) ? 50 : 0) - quality(a) - (FEMALE.test(a.name) ? 50 : 0))[0] || null;
    radio = voices.filter((v) => MALE.test(v.name) && v !== nora).sort((a, b) => quality(b) - quality(a))[0] || null;
    if (radio && nora && quality(radio) < quality(nora) - 35) radio = null; // keine gute Männerstimme: Noras Stimme, nur tiefer
  }
  if (OK) { choose(); if (synth.addEventListener) synth.addEventListener("voiceschanged", choose); else synth.onvoiceschanged = choose; }

  // Was nicht vorgelesen werden soll (Emojis, Pfeile) – und was anders klingen muss (°C, km/h, −, ½ …)
  function speakable(t) {
    return String(t || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu, " ")
      .replace(/(\d)\s*½/g, "$1 einhalb").replace(/½/g, "einhalb")
      .replace(/[−-]\s?(\d)/g, (m, d, i, s) => (i > 0 && /\w/.test(s[i - 1]) ? m : "minus " + d))
      .replace(/(\d)\s*°C/g, "$1 Grad").replace(/°C/g, "Grad")
      .replace(/km\/h/g, "Kilometer pro Stunde").replace(/(\d)\s*km\b/g, "$1 Kilometer").replace(/(\d)\s*kg\b/g, "$1 Kilo").replace(/(\d)\s*m\b/g, "$1 Meter")
      .replace(/\bMio\./g, "Millionen").replace(/\bMrd\./g, "Milliarden").replace(/\bz\. ?B\./g, "zum Beispiel").replace(/\bca\./g, "circa")
      .replace(/[„“"«»]/g, "").replace(/\s*[–—·]\s*/g, ", ").replace(/…/g, ", ").replace(/\.\s*\./g, ".")
      .replace(/\s+([,.!?])/g, "$1").replace(/,{2,}/g, ",").replace(/,([.!?])/g, "$1")
      .replace(/^[\s,]+/, "").replace(/[\s,]+$/, "").replace(/\s{2,}/g, " ").trim();
  }
  const sentences = (t) => (t.match(/[^.!?]+[.!?]*/g) || [t]).map((s) => s.trim()).filter((s) => /[a-zäöüß0-9]/i.test(s));
  // Rollen: Stimme, Grund-Betonung und Vorrang (wer wen unterbrechen darf)
  const ROLE = {
    nora: { prio: 2, pitch: 1.06, rate: 1 }, radio: { prio: 2, pitch: 0.94, rate: 1 }, card: { prio: 3, pitch: 1.04, rate: 0.97 },
    narrator: { prio: 2, pitch: 0.88, rate: 0.9 }, npcF: { prio: 1, pitch: 1.16, rate: 1.02 }, npcM: { prio: 1, pitch: 0.9, rate: 1 }
  };
  // Betonung pro Satz: so klingt es nach Gefühl statt nach Vorlesen
  function tune(u, s, base, nat) {
    let rate = base.rate, pitch = base.pitch, vol = 1;
    if (/!$/.test(s)) { rate += 0.05; pitch += 0.07; }
    else if (/\?$/.test(s)) pitch += 0.05;
    if (/^(wow|juhu|super|toll|klasse|prima|fantastisch|geschafft|hurra|spitze|bravo|da ist|da sind|gefunden|richtig|volltreffer)/i.test(s)) { pitch += 0.09; rate += 0.03; }
    if (/^(psst|pst)/i.test(s)) { rate -= 0.14; vol = 0.75; }
    if (/^(puh|oh|oje|hoppla|achtung|vorsicht|brr|nicht ganz)/i.test(s)) rate -= 0.05;
    if (nat) pitch = 1 + (pitch - 1) * 0.5; // neuronale Stimmen betonen selbst – nur leicht nachhelfen
    else rate *= 0.95;                       // einfache Stimmen etwas langsamer: klingt weniger gehetzt
    u.rate = Math.max(0.6, Math.min(1.4, rate)); u.pitch = Math.max(0.5, Math.min(1.6, pitch)); u.volume = vol;
  }

  function on() { return OK && enabled && (!window.Sound || Sound.enabled); }
  // Text vorlesen. role: nora | radio | card | narrator | npcF | npcM · opt.queue = hinten anstellen statt unterbrechen · opt.modal = gehört zu einem Fenster
  function say(text, role = "nora", opt = {}) {
    if (!on()) return 0;
    const clean = speakable(text);
    if (!clean) return 0;
    const now = performance.now();
    if (last.text && last.text.startsWith(clean) && now - last.at < 25000) return cur ? cur.id : 0; // eben schon gesagt (z. B. derselbe Text ohne die Frage)
    const R = ROLE[role] || ROLE.nora;
    if (cur && synth.speaking && now < cur.until && cur.prio > R.prio && !opt.queue) return 0; // Wichtigeres läuft gerade (z. B. eine Entdeckung)
    const male = role === "radio" || role === "narrator" || role === "npcM";
    const v = male ? radio || nora : nora;
    const nat = natural(v), base = { ...R };
    if (male && !radio) base.pitch -= 0.14; // dieselbe Stimme wie Nora – tiefer, damit man die beiden unterscheidet
    const parts = nat && clean.length < 260 ? [clean] : sentences(clean);
    // until: spätestens dann gilt der Text als fertig (falls ein Browser das Ende nie meldet)
    const id = ++seq, job = { id, prio: R.prio, left: parts.length, modal: !!opt.modal, until: now + (clean.length / 10 + 4) * 1000 * (opt.queue ? 2 : 1) };
    const run = () => {
      if (!opt.queue) cur = job;
      parts.forEach((s) => {
        const u = new SpeechSynthesisUtterance(s);
        if (v) u.voice = v; u.lang = v ? v.lang : "de-DE";
        tune(u, s, base, nat);
        u.onend = () => { job.left--; if (cur === job && job.left <= 0) cur = null; keep = keep.filter((x) => x !== u); };
        u.onerror = (e) => {
          job.left--; if (cur === job && job.left <= 0) cur = null;
          if (v && e && e.error && !/interrupted|canceled/.test(e.error)) { failed.add(v.name); choose(); } // z. B. Online-Stimme ohne Internet → nächste Stimme
        };
        keep.push(u); // sonst räumt Chrome die Äußerung manchmal zu früh weg (dann kommt kein „Ende“)
        synth.speak(u);
      });
    };
    if (!opt.queue) clearTimeout(later);
    if (!opt.queue && (synth.speaking || synth.pending)) { synth.cancel(); cur = job; later = setTimeout(run, 60); } // Chrome verschluckt sonst das Sprechen direkt nach cancel()
    else run();
    if (opt.queue && !cur) cur = job;
    last = { text: clean, at: now };
    return id;
  }
  function stop(id) {
    if (!OK) return;
    if (id && (!cur || cur.id !== id)) return;
    clearTimeout(later); synth.cancel(); cur = null; keep = [];
  }
  // Sprechblasen bleiben stehen, solange ihr Text noch vorgelesen wird
  const speaking = (id) => !!(OK && id && cur && cur.id === id && performance.now() < cur.until && (synth.speaking || synth.pending));
  function stopModal() { if (cur && cur.modal) stop(); }
  // Auf dem iPad darf erst nach einer Berührung gesprochen werden: einmal leise „freischalten“
  let unlocked = false;
  function unlock() {
    if (!OK || unlocked) return; unlocked = true;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); } catch (e) { /* egal */ }
  }
  function toggle() { enabled = !enabled; set("ms-vorlesen", enabled ? "1" : "0"); if (!enabled) stop(); return enabled; }
  function list() { choose(); return voices.map((v) => ({ name: v.name, lang: v.lang, q: quality(v), nora: v === nora })).sort((a, b) => b.q - a.q); }
  function setVoice(name) { set("ms-stimme", name || ""); choose(); }
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });

  return {
    say, stop, speaking, stopModal, unlock, toggle, list, setVoice, speakable,
    get enabled() { return enabled; }, get supported() { return OK; },
    get voiceName() { return nora ? nora.name : ""; }, get natural() { return natural(nora); }
  };
})();
