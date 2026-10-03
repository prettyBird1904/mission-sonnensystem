/* =========================================================
   Sprachaufnahmen erzeugen: alle festen Texte des Spiels.
   - Hauptweg: ElevenLabs (echt klingende deutsche Sprecher mit Gefühl, Modell „eleven_v4_turbo“). Braucht einen
     Zugangsschlüssel in der Datei  %USERPROFILE%\.elevenlabs-key  (NIE in den Projektordner legen – das Projekt ist öffentlich!).
   - Ohne Schlüssel (oder wenn ElevenLabs scheitert): die kostenlosen Microsoft-Stimmen von Edge (Paket „msedge-tts“).
     Neue Sätze bekommen dann die Ersatzstimme der Figur (Feld „ms“ unten).
   Aufruf mit  --kosten  zeigt nur, wie viele ElevenLabs-Zeichen die neuen Sätze verbrauchen würden.

   Aufruf im Ordner tools:   npm install   und dann   node stimmen.js
   - schreibt audio/v/<schlüssel>.mp3 und js/stimmen.js (Liste aller Aufnahmen; das Spiel spielt sie ab)
   - schon vorhandene Aufnahmen werden nicht neu erzeugt; nicht mehr gebrauchte werden gelöscht
   - nach jeder Textänderung in js/data.js (oder an den unten genannten Stellen im Code) neu laufen lassen
   Der Schlüssel einer Aufnahme ist Stimme + gesprochener Text – berechnet mit denselben Regeln wie im Spiel (js/voice.js).
   ========================================================= */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, ".."), OUT = path.join(ROOT, "audio", "v");
const NAME = "Xaverine"; // Platzhalter für den Namen des Kindes (die Aufnahmen lassen ihn weg)

// Stimmen: wer spricht wie (rate/pitch = Grundtempo und -höhe in %)
// Nur rein deutsche Stimmen: Die „Multilingual“-Stimmen (Seraphina, Florian) sprechen manche Wörter englisch aus („Zerquetscht“).
// Neue Stimme = neuer Schlüssel (Schlüssel + Text ergeben den Dateinamen; Tablets speichern Aufnahmen nach Namen).
// Jeder Bewohner hat einen eigenen Schlüssel (siehe NPC_VOICE in js/voice.js) und möglichst eine eigene Stimme:
// neben den vier deutschen gibt es zwei österreichische (Ingrid, Jonas) und zwei Schweizer (Leni, Jan) – alle sprechen Hochdeutsch.
const VOICES = {
  noraKatja: { name: "de-DE-KatjaNeural", rate: 4, pitch: 2 },     // Flugleiterin Nora, Entdeckungen, Versuche
  radio: { name: "de-DE-ConradNeural", rate: 0 },             // Bodenstation, Funk-Fragen
  erzaehler: { name: "de-DE-ConradNeural", rate: -8, pitch: -6 },  // Erzähler im Intro und im Abschluss-Kino
  lea: { name: "de-DE-AmalaNeural", rate: 0, pitch: -4 },     // Kommandantin Lea (Mond)
  tomJonas: { name: "de-AT-JonasNeural", rate: 2 },           // Ingenieur Tom (Mond)
  maraIngrid: { name: "de-AT-IngridNeural", rate: 0, pitch: -4 }, // Forscherin Mara (Mars) – die Schweizer Leni war schwer zu verstehen
  bennettJan: { name: "de-CH-JanNeural", rate: 0 },           // Techniker Bennett (Mars)
  kofi: { name: "de-DE-KillianNeural", rate: -2, pitch: -8 }, // Forscher Kofi (Merkur)
  saraIngrid: { name: "de-AT-IngridNeural", rate: 2 },        // Pilotin Sara (Venus)
  jana: { name: "de-DE-AmalaNeural", rate: 4, pitch: 3 },     // Astronautin Jana (Erde)
  amala: { name: "de-DE-AmalaNeural", rate: 2 },              // weitere Bewohnerinnen
  killian: { name: "de-DE-KillianNeural", rate: 2 },          // weitere Bewohner
  // ElevenLabs: deutsche Sprecher aus der Stimmen-Bibliothek (el = Stimmen-ID im Konto, ms = Microsoft-Ersatz von oben)
  noraEL: { el: "AnvlJBAqSLDzEevYr9Ap", ms: "noraKatja" },      // Ava – Flugleiterin Nora, Entdeckungen, Versuche
  radioEL: { el: "Rwqd9wksd18jej9ZWfbo", ms: "radio" },         // Christian (lebendig) – Bodenstation, Funk-Fragen
  erzaehlerEL: { el: "kkJxCnlRCckmfFvzDW5Q", ms: "erzaehler", calm: true }, // Alexander – Erzähler im Intro und Abschluss-Kino
  leaEL: { el: "ViKqgJNeCiWZlYgHiAOO", ms: "lea" },             // Annika – Kommandantin Lea (Mond)
  tomEL: { el: "aTTiK3YzK3dXETpuDE2h", ms: "tomJonas" },        // Ben – Ingenieur Tom (Mond)
  maraEL: { el: "dCnu06FiOZma2KVNUoPZ", ms: "maraIngrid" },     // Mila – Forscherin Mara (Mars)
  bennettEL: { el: "FTNCalFNG5bRnkkaP5Ug", ms: "bennettJan" },  // Otto – Techniker Bennett (Mars)
  kofiEL: { el: "qvgnHZ5ufqbaFzs9RP51", ms: "kofi" },           // Christian (warm) – Forscher Kofi (Merkur)
  saraEL: { el: "WHaUUVTDq47Yqc9aDbkH", ms: "saraIngrid" },     // Enniah – Pilotin Sara (Venus)
  janaEL: { el: "uvysWDLbKpA4XvpD3GI6", ms: "jana" },           // Leonie – Astronautin Jana (Erde)
  // Gesprächs-Figuren (crew) – Bibliotheksstimmen müssen nicht im Konto sein (keine Stimmplätze nötig)
  yukiEL: { el: "z0gdR3nhVl1Ig2kiEigL", ms: "amala" },          // Luisa – Geologin Yuki (Mond)
  felixEL: { el: "IWm8DnJ4NGjFI7QAM5lM", ms: "killian" },       // Stephan – Arzt Felix (Mond)
  leoEL: { el: "gGjaVIGkCSfKUIBYtNT2", ms: "killian" },         // Marc – Botaniker Leo (Mars)
  amiraEL: { el: "zKHQdbB8oaQ7roNTiDTK", ms: "amala" },         // Laura – Pilotin Amira (Mars)
  idaEL: { el: "K75lPKuh15SyVhQC1LrE", ms: "amala" },           // Carola – Ingenieurin Ida (Merkur)
  matsEL: { el: "vl67BWhZHh0QyG35TvXt", ms: "killian" },        // Robby – Funker Mats (Merkur)
  linaEL: { el: "lzvBSKYbNWDD0a6BaJSK", ms: "amala" },          // Petra – Robotikerin Lina (Venus)
  eliasEL: { el: "r8MyP4qUsq5WFFSkPdfV", ms: "killian" },       // Johannes – Chemiker Elias (Venus)
  hannaEL: { el: "rKiu7lQ4c5P3az3745s3", ms: "amala" },         // Carla Blum – Biologin Hanna (Erde)
  paulEL: { el: "Fghah4fztZORbiKfIGAs", ms: "killian" }         // Thomas Schendel – Meteorologe Paul (Erde)
};
const EL_MODEL = "eleven_v4_turbo", EL_FORMAT = "mp3_44100_64";
const EL_KEY = (() => { try { return fs.readFileSync(path.join(require("os").homedir(), ".elevenlabs-key"), "utf8").trim(); } catch (e) { return ""; } })();
const msOf = (k) => (VOICES[k].el ? VOICES[k].ms : k); // Microsoft-Stimme einer Figur

// ---------- Spiel-Daten und Vorlese-Regeln laden ----------
const box = { window: {}, document: { addEventListener() {} }, performance: { now: () => 0 }, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8"), box);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/voice.js"), "utf8"), box);
const D = box.window.SPACE_DATA, V = box.window.Voice;
const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)).replace(/\bNoch 1 Entdeckungen\b/g, "Noch 1 Entdeckung").replace(/\bNoch 1 Mess-Tore\b/g, "Noch 1 Mess-Tor").replace(/\bNoch 1 Aufgaben\b/g, "Noch 1 Aufgabe"); // Einzahl wie fmtVars() in surface.js

// ---------- Alle Sätze sammeln (genau so zusammengesetzt wie im Spiel) ----------
const lines = new Map(); // Schlüssel → { said, voice, tags }
function add(text, role, tag, who) {
  if (!text) return;
  const t = fill(text, { name: NAME });
  const said = V._spoken(t, NAME); if (!said) return;
  const h = V._hash(V._key(t, role, who, NAME));
  const e = lines.get(h) || { said, voice: V._voiceOf(role, who), tags: new Set() };
  e.tags.add(tag); lines.set(h, e);
}
const both = (text, tag) => { add(text, "nora", tag); add(text, "radio", tag); }; // Nora oder – ohne Führung – die Bodenstation
const guessedAt = (id) => { const gi = Object.keys(D.surfaces).indexOf(id) % D.guessOk.length; // siehe guessed() in surface.js
  return (t) => [t, `✅ ${D.guessOk[gi]} ` + t, `🤔 ${D.guessNo[gi]} ` + t]; };
const asked = (g, ready) => [`${ready}\n\n🤔 ${g.q}`, ready];                                      // siehe askGuess() in surface.js
const female = (n) => /^(Forscherin|Kommandantin|Pilotin|Astronautin|Technikerin|Ingenieurin)\b/.test(n);
const ART = { sonne: "die Sonne", erde: "die Erde", mond: "der Mond", venus: "die Venus" };      // wie nameOf() in game.js
const nameOf = (id) => ART[id] || D.bodies.find((b) => b.id === id).name;

for (const [id, S] of Object.entries(D.surfaces)) {
  const n = S.discoveries.length, f = (t, v = {}) => fill(t, { anzahl: n, fragen: S.quiz.length, ...v });
  const R = S.radio, nr = S.probe ? "nora" : "radio"; // Sonden: Start und Rückkehr meldet Nora
  const guessed = guessedAt(id);
  add(f(R.start), nr, id); add(f(R.quizDone), nr, id);
  for (let r = 1; r <= n; r++) add(f(R.back, { rest: r }), nr, id);
  for (let r = 1; r < n; r++) add(f(D.radioFound[r] || D.radioFound[D.radioFound.length - 1], { rest: r }), "radio", id); // Zwischenstand (siehe discover)
  if (R.landed) add(f(R.landed), "radio", id); add(f(R.quizIntro), "radio", id); // Funkspruch bei der Landung, Einleitung der Funk-Fragen
  if (R.tooFar) add(f(R.tooFar), "radio", id);
  for (const d of S.discoveries) add(`${d.title}. ${d.text}`, "card", id);
  S.quiz.forEach((q, i) => { // Funk-Fragen (siehe startQuiz in surface.js): je Frage eine andere Rückmeldung
    add(`${q.q} ${q.a.slice(0, -1).join("? ")}? Oder: ${q.a[q.a.length - 1]}?`, "radio", id);
    add(`${D.quizRight[i % D.quizRight.length]} ${q.why}`, "radio", id); add(`${D.quizWrong[i % D.quizRight.length]} ${q.why}`, "radio", id);
  });
  if (S.flight) for (const g of S.flight.gates) add(g, "nora", id);
  const G = S.guide;
  if (G) {
    for (const k of ["hello", "welcome", "wait", "quiz", "home", "alone", "board"]) add(f(G[k]), "nora", id);
    for (const k of Object.keys(G.arrive)) add(f(G.arrive[k]), "nora", id);
    for (const k of G.order) add(f(typeof G.next === "object" ? G.next[k] : G.next, { ziel: S.stations[k].label }), "nora", id); // Überleitung zur nächsten Station
    for (const t of Object.values(G.react || {})) add(f(t), "nora", id);                                                      // Reaktion auf das gerade Entdeckte
  }
  for (const t of S.talks || []) for (const [who, text] of t) { // Gespräche der Crew (siehe updateTalks in surface.js)
    const c = S.crew.find((x) => x.short === who); add(f(text), c.f ? "npcF" : "npcM", id, c.name);
  }
  for (const c of S.npcs || []) {
    const role = female(c.name) ? "npcF" : "npcM";
    for (const t of [c.hello, c.done, ...(c.facts || [])]) add(f(t), role, id, c.name);
    for (const d of S.discoveries) if (S.stations[d.key]) add(f(c.hint, { ziel: S.stations[d.key].label }), role, id, c.name);
  }
  // Versuche und Spiele (Texte unter dem Bild, Sprecherin Nora)
  const say = (t) => add(t, "nora", id), sayAll = (list) => list.forEach(say);
  if (S.fall) sayAll(asked(S.fall.guess, "Hammer und Feder liegen auf dem Tisch. Gleich lässt du beide gleichzeitig los.")); // startFall
  if (S.longJump) for (const k of ["start", "good", "gold", "foul", "noJump", "done", "quit"]) both(S.longJump[k], id);
  if (S.dusk) { sayAll(asked(S.dusk.guess, S.dusk.ready)); sayAll(guessed(S.dusk.end)); }
  if (S.magnet) { sayAll(asked(S.magnet.guess, S.magnet.ready)); say(S.magnet.running); sayAll(guessed(S.magnet.end)); }
  if (S.rover) {
    const T = S.rover;
    for (const k of [T.keys, T.keysTouch]) say(`${T.start} (${k})`);
    T.sample.forEach((s) => { say(s); say(`${s}\n\n🎉 ${T.done}`); });
    sayAll([T.dusty, T.clean, T.empty]);
  }
  if (S.iceRun) for (const k of ["start", "melted", "quit"]) both(S.iceRun[k], id);
  if (S.sunScope) sayAll([S.sunScope.aim, S.sunScope.aimTouch, S.sunScope.found, S.sunScope.compare]);
  if (S.impact) { sayAll(asked(S.impact.guess, S.impact.ready)); say(S.impact.running); sayAll(guessed(S.impact.end)); }
  if (S.drone) sayAll([S.drone.rising, S.drone.top]);
  if (S.curling) {
    const T = S.curling;
    sayAll([T.aim, T.aimTouch, T.power, T.slide, T.r3, T.r2, T.r1, T.short, T.long]);
    for (const r of [T.r3, T.r2, T.r1]) say(r + " " + T.fact);
  }
  if (S.signal) { sayAll(asked(S.signal.guess, S.signal.ready)); sayAll(guessed(S.signal.end)); }
  if (S.radar) for (const k of ["start", "hot", "quit"]) both(S.radar[k], id);
  if (S.heat) { sayAll(asked(S.heat.guess, S.heat.intro)); sayAll(guessed(S.heat.offText)); say(S.heat.onText); }
  if (S.press) { sayAll(asked(S.press.guess, S.press.ready)); say(S.press.running); sayAll(guessed(S.press.end)); }
  if (S.safari) { both(S.safari.start, id); both(S.safari.tip, id); for (const t of Object.values(S.safari.says)) both(t, id); }
  if (S.day) { sayAll(asked(S.day.guess, S.day.ready)); sayAll(guessed(S.day.end)); }
  if (S.air) { sayAll(asked(S.air.guess, S.air.intro)); sayAll(guessed(S.air.offText)); say(S.air.onText); }
  // Extras (siehe showWeigh und startSizes in surface.js): Waage für jedes einstellbare Gewicht, dazu die Erklärung
  const kgOn = (kg) => (kg * S.gravity / 9.81).toFixed(1).replace(".", ",").replace(/,0$/, ""); // wie moonKg()
  if (S.weigh) { for (let kg = 20; kg <= 60; kg += 5) say(fill(S.weigh.text, { erde: kg, mond: kgOn(kg) })); say(S.weigh.why); }
  if (S.sizes) say(S.sizes.text);
}
// Ergebnis der Funk-Fragen (für alle gleich)
for (let r = 0; r <= 3; r++) add(fill(r === 3 ? D.quizEnd.all : r ? D.quizEnd.some : D.quizEnd.none, { r, n: 3 }), "radio", "common"); // wie startQuiz() in surface.js
for (const t of D.quizOrder) add(t, "radio", "common");   // „Erste Frage:“ … „Und die letzte Frage:“
add(D.quizAgain, "radio", "common");                       // Funk-Fragen nochmal (aus „Meine Entdeckungen“)
add(D.radioQuizOpen, "radio", "common"); add(D.radioQuizOpen, "nora", "common"); // fertiger Ort, Fragen noch offen (bei Sonden spricht Nora)
// Probe in der Hilfe
add("Hallo {name}! Ich bin Nora, deine Flugleiterin. Bist du bereit für das nächste Abenteuer?", "nora", "common");

// Nora im All (siehe noraSay/noraMission in game.js)
const NS = D.noraSpace;
for (const k of ["first", "back", "done", "allDone", "returned", "order", "arrow"]) add(NS[k], "nora", "space");
D.missions.forEach((m, i) => {
  if (m.done) add(m.done, "nora", "space"); // eigener Satz, wenn diese Mission geschafft ist
  const text = fill(NS.mission, { nr: i + 1, text: m.brief || m.text });
  for (const steer of [NS.steerKey, NS.steerTouch]) add(text.replace("{steer}", steer), "nora", "space");
  add(fill(NS.goal, { text: m.text }), "nora", "space");
  add(fill(NS.tip, { hint: m.hint }), "nora", "space");
});
for (const b of D.bodies) {
  for (const a of [NS.sightKey, NS.sightTouch]) add(fill(NS.sight, { ziel: nameOf(b.id), aktion: a }), "nora", "space");
  add(fill(["Gesteinsplanet", "Mond der Erde"].includes(b.kind) ? NS.other : NS.otherProbe, { ziel: nameOf(b.id) }), "nora", "space"); // wie CAN_LAND in game.js
}
for (let p = 0; p < 3; p++) add(fill(NS.notDone, { p, n: 3 }), "nora", "space");

// Intro (Erzähler und Nora) – Texte stehen in js/intro.js
const intro = fs.readFileSync(path.join(ROOT, "js/intro.js"), "utf8");
const arr = (name) => vm.runInNewContext("(" + intro.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n  \\]);`))[1] + ")");
for (const [, , t] of arr("CAPTIONS")) add(t, "narrator", "intro");
for (const [, , t] of arr("NORA")) add(t, "nora", "intro");
// Abschluss-Kino – Texte stehen in js/outro.js
const outro = fs.readFileSync(path.join(ROOT, "js/outro.js"), "utf8");
const arrO = (name) => vm.runInNewContext("(" + outro.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n  \\]);`))[1] + ")");
for (const [, , t] of arrO("OUTRO_CAPTIONS")) add(t, "narrator", "intro");
for (const [, , t] of arrO("OUTRO_NORA")) add(t, "nora", "intro");

// Ein Satz an mehreren Orten → „common“ (wird gleich am Anfang geladen)
for (const e of lines.values()) e.tag = e.tags.size > 1 ? "common" : [...e.tags][0];

// ---------- Aufnehmen ----------
// ElevenLabs: kurze Regieanweisungen vor passenden Sätzen – das Modell spricht sie nicht mit, sondern spielt sie
// (getestet: [excited] [whispers] [sighs] [curious] [surprised] [happy] [sympathetic] werden befolgt, nicht vorgelesen)
function emotion(said, voice) {
  if (VOICES[voice].calm) return said; // der Erzähler bleibt ruhig
  const npc = /^(lea|tom|mara|bennett|kofi|sara|jana|yuki|felix|leo|amira|ida|mats|lina|elias|hanna|paul)EL$/.test(voice);
  return (said.match(/[^.!?]+[.!?]*\s*/g) || [said]).map((s, i) => {
    const t = s.trim();
    let tag = null;
    if (/^(Psst|Pst)\b/i.test(t)) tag = "whispers";
    else if (/^(Wow|Juhu|Hurra|Volltreffer|Wahnsinn|Hui|Über die goldene Linie)\b/.test(t)) tag = "excited";
    else if (/^(Unglaublich|Verrückt|Stell dir vor|Kaum zu glauben|So riesig|Was für ein|Wie weit)\b/.test(t)) tag = "amazed";
    else if (/^(Ich glaube, das war|Alle \d+ Fragen richtig|Respekt|Stark|Du hast alles entdeckt|Alles entdeckt\?|Ganz außen angekommen|Heil durch)/.test(t)) tag = i % 2 ? "impressed" : "proud";
    else if (/^(Genau|Stimmt|Richtig)[!,]/.test(t) || /^(Super|Toll|Klasse|Prima|Spitze|Bravo|Perfekt|Geschafft|Gefunden|Gut gemacht|Gut getippt|Du hast es geahnt|Stimmt genau|Das Eis ist angekommen)\b/.test(t)) tag = "happy"; // „Genau hier …“ ist keine Antwort
    else if (/^(Puh|Gerade noch|Dein Hitzeschild hat gehalten)\b/.test(t)) tag = "relieved";
    else if (/^(Oh nein|Oje|Hoppla|Schade|Mist)\b/.test(t)) tag = "sighs";
    else if (/^(Nicht ganz|Knapp daneben|Hm, leider|Diesmal hat's nicht|Gar nicht so einfach|Hättest du's gedacht)\b/.test(t)) tag = "sympathetic";
    else if (/^(Weißt du|Was glaubst du|Was meinst du|Was denkst du|Rate mal|Schau mal|Sieh mal|Was fällt wohl|Hörst du)\b/.test(t)) tag = "curious";
    else if (/^(Ein Reh|Ein Fuchs|Huch|Bumm|Überraschung|Achtung, Eisbrocken|Siehst du's)\b/.test(t)) tag = "surprised";
    else if (/^(Bist du bereit|Und jetzt wird's|Jetzt wird's|Und zum Schluss|Zum Schluss lassen|Jetzt darfst du|Jetzt geht's)\b/.test(t)) tag = "playfully";
    else if (/^(Ab zur Rakete|Einsteigen bitte|Komm, die Rakete|Willkommen zu Hause|Zu Hause war's)/.test(t)) tag = "warmly";
    else if (i === 0 && /^(Hallo|Hi)\b/.test(t) && (npc || /hier ist die Bodenstation/.test(said))) tag = npc ? "happy" : "warmly"; // Begrüßungen
    else if (npc && /^(Igitt|Ach|Na gut|Kleiner Scherz|Das stimmt gar nicht|Oh, hallo|Echt\?)/.test(t)) tag = /^(Igitt)/.test(t) ? "sighs" : /^(Ach|Na gut)/.test(t) ? "sighs" : "playfully"; // Gesprächs-Gefühle
    return tag ? `[${tag}] ${s}` : s;
  }).join("").trim();
}
async function elRecord(e) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[e.voice].el}?output_format=${EL_FORMAT}`, {
    method: "POST", headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: emotion(e.said, e.voice), model_id: EL_MODEL, language_code: "de" }) });
  if (!r.ok) { const t = await r.text(); const err = new Error(r.status + " " + t.slice(0, 200)); err.status = r.status; throw err; }
  return Buffer.from(await r.arrayBuffer());
}
// Microsoft: etwas Gefühl über Tempo und Tonhöhe – begeisterte Sätze schneller und heller, „Psst“ leiser und langsamer
function prosody(e) {
  const v = VOICES[msOf(e.voice)], s = e.said;
  let rate = v.rate || 0, pitch = v.pitch || 0, volume = 0;
  if (/^(Wow|Juhu|Super|Toll|Klasse|Prima|Fantastisch|Geschafft|Hurra|Spitze|Volltreffer|Gefunden|Da ist|Da sind|Saubergepustet|Zerquetscht|Eingeschlagen|Verglüht|Angekommen|Richtig)/.test(s) || (s.match(/!/g) || []).length >= 2) { rate += 4; pitch += 3; }
  if (/^(Psst|Pst)/.test(s)) { rate -= 8; volume -= 15; }
  if (/^(Puh|Oh nein|Hoppla|Brr|Nicht ganz)/.test(s)) rate -= 3;
  const sign = (x) => (x >= 0 ? "+" : "") + x;
  return { rate: sign(rate) + "%", pitch: sign(pitch) + "%", volume: sign(volume) + "%" };
}
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const MAN_F = path.join(__dirname, "stimmen-el.json"); let man = {}; try { man = JSON.parse(fs.readFileSync(MAN_F, "utf8")); } catch (e) { /* noch keine */ }
  const changed = ([h, e]) => EL_KEY && VOICES[e.voice].el && man[h] != null && man[h] !== emotion(e.said, e.voice); // anderes Gefühl als bei der Aufnahme
  const todo = [...lines].filter((x) => !fs.existsSync(path.join(OUT, x[0] + ".mp3")) || changed(x));
  console.log(`${lines.size} Sätze, davon ${todo.length} neu aufzunehmen`);
  const elTodo = EL_KEY ? todo.filter(([, e]) => VOICES[e.voice].el) : [];
  const elChars = elTodo.reduce((n, [, e]) => n + emotion(e.said, e.voice).length, 0);
  if (elTodo.length) console.log(`ElevenLabs: ${elTodo.length} Sätze, ${elChars} Zeichen (${EL_MODEL})`);
  if (process.argv.includes("--kosten")) { if (process.argv.includes("--tags")) for (const [h, e] of elTodo) console.log(h, e.voice, emotion(e.said, e.voice)); return; }
  // ElevenLabs zuerst (höchstens 3 gleichzeitig); was dort scheitert, nimmt danach die Microsoft-Stimme
  if (elTodo.length) {
    let next = 0, doneN = 0, stop = false;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (!stop && next < elTodo.length) {
        const [h, e] = elTodo[next++];
        for (let attempt = 1; ; attempt++) {
          try { const buf = await elRecord(e); if (buf.length < 1500) throw new Error("zu kurz"); fs.writeFileSync(path.join(OUT, h + ".mp3"), buf); man[h] = emotion(e.said, e.voice); break; }
          catch (err) {
            if (err.status === 401 || err.status === 402 || /quota|credits/i.test(err.message)) { console.log("  ElevenLabs gestoppt:", err.message); stop = true; break; }
            if (attempt >= 4) { console.log(`  ElevenLabs-FEHLER bei „${e.said.slice(0, 60)}“: ${err.message}`); break; }
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }
        if (++doneN % 25 === 0) console.log(`  ElevenLabs ${doneN}/${elTodo.length}`);
      }
    }));
  }
  if (elTodo.length) { for (const h of Object.keys(man)) if (!lines.has(h)) delete man[h]; fs.writeFileSync(MAN_F, JSON.stringify(man, null, 0).replace(/","/g, "\",\n\"")); }
  const rest = todo.filter(([h]) => !fs.existsSync(path.join(OUT, h + ".mp3")));
  if (rest.length) console.log(`Microsoft-Stimmen: ${rest.length} Sätze`);
  if (rest.length) {
    const todo = rest;
    const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
    const byVoice = {};
    for (const [h, e] of todo) (byVoice[e.voice] = byVoice[e.voice] || []).push([h, e]);
    let doneN = 0;
    const record = async (voiceKey, list) => {
      let tts = null;
      const open = async () => { tts = new MsEdgeTTS(); await tts.setMetadata(VOICES[msOf(voiceKey)].name, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3); };
      for (const [h, e] of list) {
        for (let attempt = 1; ; attempt++) {
          try {
            if (!tts) await open();
            const { audioStream } = tts.toStream(xml(e.said), prosody(e));
            const chunks = [];
            await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error("Zeitüberschreitung")), 45000);
              audioStream.on("data", (c) => chunks.push(c)); audioStream.on("end", () => { clearTimeout(to); res(); }); audioStream.on("error", (err) => { clearTimeout(to); rej(err); }); });
            const buf = Buffer.concat(chunks);
            if (buf.length < 1500) throw new Error("zu kurz");
            fs.writeFileSync(path.join(OUT, h + ".mp3"), buf);
            break;
          } catch (err) {
            try { tts && tts.close(); } catch (e2) { /* egal */ } tts = null;
            if (attempt >= 4) { console.log(`  FEHLER bei „${e.said.slice(0, 60)}“: ${err.message}`); break; }
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
        if (++doneN % 25 === 0) console.log(`  ${doneN}/${todo.length}`);
      }
      try { tts && tts.close(); } catch (e) { /* egal */ }
    };
    // mehrere Verbindungen gleichzeitig (höchstens 6), damit es nicht zu lange dauert
    const jobs = [];
    for (const [k, list] of Object.entries(byVoice)) for (let i = 0; i < list.length; i += 45) jobs.push([k, list.slice(i, i + 45)]);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(6, jobs.length) }, async () => { while (next < jobs.length) { const [k, list] = jobs[next++]; await record(k, list); } }));
  }
  // Liste fürs Spiel; nicht mehr gebrauchte Aufnahmen löschen
  const have = {}; let bytes = 0;
  for (const [h, e] of lines) { const f = path.join(OUT, h + ".mp3"); if (fs.existsSync(f)) { have[h] = e.tag; bytes += fs.statSync(f).size; } }
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".mp3") && !lines.has(f.slice(0, -4))) fs.unlinkSync(path.join(OUT, f));
  const body = Object.keys(have).sort().map((h) => `"${h}":"${have[h]}"`).join(",");
  fs.writeFileSync(path.join(ROOT, "js/stimmen.js"), "/* Sprachaufnahmen (erzeugt von tools/stimmen.js – nicht von Hand ändern): Schlüssel → Ort, an dem sie gebraucht werden */\nwindow.VOICE_CLIPS = {" + body + "};\n");
  console.log(`fertig: ${Object.keys(have).length} von ${lines.size} Aufnahmen, ${(bytes / 1048576).toFixed(1)} MB`);
  if (process.argv.includes("--liste")) for (const [h, e] of lines) console.log(h, e.voice, e.tag, e.said);
}
main().catch((e) => { console.error(e); process.exit(1); });
