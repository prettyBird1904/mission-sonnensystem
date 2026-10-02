/* =========================================================
   Abschluss-Kino: nach der letzten Mission (gut eine halbe Minute)
   1. „Mission erfüllt!“ – die eigene Rakete fliegt durchs All
   2. Rückflug an allen Planeten vorbei, von Pluto bis zur Erde – jeder bekommt einen goldenen Haken
   3. Ankunft zu Hause: Nora gratuliert
   4. Feuerwerk um die Erde, Titel „Weltraum-Profi!“ – danach die Urkunde
   Nutzt dieselbe Kino-Bühne wie das Intro (#intro, Musik über Sound.cinematic, Vorlesen über Voice).
   ========================================================= */
window.Outro = (function () {
  const V = THREE.Vector3;
  let W, T, st = null;

  // ---------- Zeitplan (Sekunden) ----------
  const T_TOUR = 5, T_HOME = 23, T_PARTY = 31.5, T_END = 38;
  const OUTRO_CAPTIONS = [
    [0.8, 4.4, "Mission erfüllt!", "big"],
    [5.6, 9.6, "Du bist bis zum kleinen Pluto geflogen …"],
    [10.0, 14.0, "… hast mit deinen Sonden die Riesenplaneten erforscht …"],
    [14.4, 18.4, "… bist auf dem Mond und auf dem Mars gelandet …"],
    [18.8, 22.6, "… und weißt jetzt so viel über unser Sonnensystem!"]
  ];
  const OUTRO_NORA = [
    [23.6, 27.4, "Hier spricht Nora: Willkommen zu Hause, {name}!"],
    [27.6, 31.6, "Du hast alle Missionen geschafft. Ich bin so stolz auf dich!"]
  ];
  // Reihe der Himmelskörper (wie im Intro): id, Position x, Größe
  const ROW = [
    ["merkur", 32, 1], ["venus", 44, 1], ["erde", 58, 1], ["mars", 71, 1], ["jupiter", 96, 0.85],
    ["saturn", 128, 0.8], ["uranus", 154, 0.9], ["neptun", 172, 0.9], ["pluto", 186, 1.2]
  ];
  const EARTH_X = 58, START_X = 206;

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const own = [], mk = (x) => { own.push(x); return x; };

  // ---------- Bühne (gleiche Klassen wie das Intro) ----------
  function buildOverlay() {
    const o = document.createElement("div");
    o.id = "intro"; o.className = "outro";
    o.innerHTML = `
      <div class="in-bar top"></div><div class="in-bar bottom"></div>
      <div class="in-labels"></div>
      <div class="in-caption"></div>
      <div class="in-radio"><div class="in-radio-head"><span class="in-wave"><i></i><i></i><i></i></span>🎧 Flugleiterin Nora</div><div class="in-radio-text"></div></div>
      <div class="in-title"><div class="t1">Du bist jetzt</div><div class="t2">Weltraum-Profi!</div><div class="t3"></div></div>
      <div class="in-flash"></div><div class="in-fade"></div>
      <button class="in-skip">Überspringen ⏭</button>`;
    document.body.appendChild(o);
    const q = (s) => o.querySelector(s);
    return { root: o, caption: q(".in-caption"), labels: q(".in-labels"), radio: q(".in-radio"), radioText: q(".in-radio-text"),
      title: q(".in-title"), t3: q(".in-title .t3"), flash: q(".in-flash"), fade: q(".in-fade"), skip: q(".in-skip") };
  }
  function showCaption(text, big) {
    const c = st.ui.caption;
    c.className = "in-caption" + (big ? " big" : ""); c.textContent = "";
    text.split(" ").forEach((w, i) => {
      const s = document.createElement("span"); s.textContent = w; s.style.animationDelay = (i * 0.14).toFixed(2) + "s";
      c.appendChild(s); c.appendChild(document.createTextNode(" "));
    });
    void c.offsetWidth; c.classList.add("show");
  }
  const hideCaption = () => st.ui.caption.classList.add("out");
  function glowSprite(inner, outer, size) {
    const s = new THREE.Sprite(mk(new THREE.SpriteMaterial({ map: mk(T.glowTexture(inner, outer)), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true })));
    s.scale.setScalar(size); return s;
  }

  // ---------- Szene: das Sonnensystem in einer Reihe, die eigene Rakete, Feuerwerk ----------
  function build(color) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const bg = new THREE.Mesh(mk(new THREE.SphereGeometry(2400, 32, 16)), mk(new THREE.MeshBasicMaterial({ map: W.bg.material.map, side: THREE.BackSide, depthWrite: false, toneMapped: false, transparent: true, opacity: 0.8 })));
    scene.add(bg);
    const n = W.lite ? 2500 : 5000, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 1200 + Math.random() * 800, s = Math.sqrt(1 - u * u); pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3); }
    const sg = mk(new THREE.BufferGeometry()); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(sg, mk(new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, map: st.dot, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }))));
    scene.add(new THREE.AmbientLight(0x6070a0, 0.35));
    const light = new THREE.PointLight(0xfff1dd, 1.8, 0); scene.add(light);
    const sun = new THREE.Group(); sun.add(W.bodies.sonne.mesh.clone()); sun.add(glowSprite("rgba(255,240,200,1)", "rgba(255,170,60,0.55)", 75)); scene.add(sun);
    const planets = ROW.map(([id, x, size]) => {
      const b = W.bodies[id].data, holder = new THREE.Group(); holder.add(W.bodies[id].group.children[0].clone());
      holder.position.set(x, 0, 0); holder.scale.setScalar(size); scene.add(holder);
      const label = document.createElement("div"); label.className = "in-label"; label.textContent = "✓ " + b.name; st.ui.labels.appendChild(label);
      return { id, x, r: b.radius * size, holder, label };
    });
    const moon = new THREE.Group(); moon.add(W.bodies.mond.group.children[0].clone()); scene.add(moon);
    // die eigene Rakete (Spitze zeigt Richtung Sonne, also −x)
    const rocket = W.makeRocket(color); rocket.scale.setScalar(1.4); rocket.rotation.y = Math.PI / 2; rocket.userData.flame.visible = true; scene.add(rocket);
    // Feuerwerk: Funken in Kugeln, die nacheinander aufgehen
    const sparkMat = (c) => mk(new THREE.SpriteMaterial({ map: mk(T.glowTexture(c, "rgba(0,0,0,0)")), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
    const cols = ["rgba(255,220,120,1)", "rgba(255,120,200,1)", "rgba(140,200,255,1)", "rgba(170,255,170,1)", "rgba(255,170,90,1)", "rgba(210,160,255,1)"];
    const bursts = [];
    for (let i = 0; i < (W.lite ? 6 : 9); i++) {
      const mat = sparkMat(cols[i % cols.length]), g = new THREE.Group(), dirs = [];
      for (let k = 0; k < 26; k++) { const s = new THREE.Sprite(mat); s.scale.setScalar(0.5); g.add(s); dirs.push(new V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 2)); }
      const a = (i / 9) * Math.PI * 2;
      g.position.set(EARTH_X + Math.cos(a) * 7, 2.5 + Math.sin(a * 1.7) * 3.5, Math.sin(a) * 4 - 2); g.visible = false; scene.add(g);
      bursts.push({ g, dirs, mat, t: T_PARTY + 0.3 + i * 0.55 });
    }
    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 6000);
    return { scene, camera, light, sun, planets, moon, rocket, bursts };
  }

  // Wo die Reise gerade ist (x-Position entlang der Reihe): von hinter Pluto bis zur Erde
  const tourX = (t) => { const k = seg(t, T_TOUR - 1, T_HOME + 0.5); return START_X + (EARTH_X - START_X) * k * k * (3 - 2 * k); }; // gleichmäßiger Vorbeiflug
  const P = new V(), L = new V();
  function update3d(S, t, dt) {
    const x = tourX(t);
    // Größe der Umgebung: je näher ein großer Planet, desto weiter weg die Kamera
    let r = 2; for (const p of S.planets) r = Math.max(r, p.r * Math.max(0, 1 - Math.abs(p.x - x) / 18));
    // 1) Start: die Rakete fliegt von hinten durchs Bild
    const k1 = seg(t, 0, T_TOUR);
    const rx = START_X + 30 - 34 * ease(k1) + (x - START_X), ry = 1.2 + Math.sin(t * 1.3) * 0.25;
    S.rocket.position.set(Math.max(x - 4.5, rx), ry, 2.5 + r * 1.15); // an großen Planeten außen vorbei
    S.rocket.rotation.z = Math.sin(t * 0.9) * 0.08;
    S.rocket.userData.flame.scale.setScalar(1.2 + Math.random() * 0.4);
    // Kamera: neben und etwas hinter der Rakete, Blick nach vorn an ihr vorbei auf die Planeten
    const d = 9 + r * 2.4, home = seg(t, T_HOME - 1, T_HOME + 3);
    P.set(x + 7 - 3 * home, 3 + r * 0.8 + 1.5 * home, d + 6 * home);
    L.set(x - 7 + 7 * home, 0.6, 0);
    const w0 = 1 - seg(t, T_TOUR - 1.5, T_TOUR + 0.5); // Anfang: der Rakete hinterher, dann weich in die Reise überblenden
    if (w0 > 0) { const k = ease(seg(t, 0, T_TOUR)); P.lerp(new V(START_X + 16 - 9 * k, 4 - k, 12), w0); L.lerp(new V(START_X - 4 * k, 1, 0), w0); }
    if (t > T_PARTY - 1) { const k = ease(seg(t, T_PARTY - 1, T_PARTY + 3)); P.lerp(new V(EARTH_X + 2, 3.5, 24), k); L.lerp(new V(EARTH_X, 2, 0), k); }
    S.camera.position.copy(P); S.camera.lookAt(L);
    // Planeten drehen sich, der Mond kreist, goldene Haken erscheinen beim Vorbeiflug
    const c = S.camera, w = innerWidth, h = innerHeight, v = new V();
    for (const p of S.planets) {
      p.holder.children[0].rotation.y += dt * 0.25;
      const vis = t > T_TOUR && Math.abs(p.x - x) < 16 && t < T_PARTY; // goldener Haken, während man vorbeifliegt
      p.label.classList.toggle("on", vis); p.label.style.color = "#fde68a"; p.label.style.borderColor = "rgba(251,191,36,.7)";
      if (!vis) continue;
      v.set(p.x, p.r * 1.3 + 1.2, 0).project(c);
      if (v.z > 1) { p.label.classList.remove("on"); continue; }
      p.label.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    }
    const ma = 2.2 + t * 0.12; S.moon.position.set(EARTH_X + Math.cos(ma) * 8, 0.6, Math.sin(ma) * 8); S.moon.rotation.y += dt * 0.1;
    // Feuerwerk
    for (const b of S.bursts) {
      const k = (t - b.t) / 1.8;
      b.g.visible = k > 0 && k < 1;
      if (!b.g.visible) continue;
      const e = 1 - Math.pow(1 - k, 3);
      b.g.children.forEach((s, i) => { s.position.copy(b.dirs[i]).multiplyScalar(e); s.position.y -= k * k * 1.2; s.scale.setScalar(0.55 * (1 - k * 0.6)); });
      b.mat.opacity = 1 - k;
    }
  }

  // ---------- Musik: triumphal, warm ----------
  function score(m) {
    if (!m) return;
    const ch = (...n) => n.map(midi);
    m.pad(ch(38, 45, 50, 54, 57), 0, 5.5, 0.045, 1600);                 // D-Dur: geschafft!
    [74, 78, 81, 86].forEach((n, i) => m.bell(midi(n), 0.8 + i * 0.16, 0.11));
    m.pad(ch(43, 50, 55, 59, 62), T_TOUR, 6, 0.04, 1300);               // G-Dur: auf dem Heimweg
    m.pad(ch(40, 47, 52, 55, 59), T_TOUR + 5.5, 6, 0.04, 1200);         // e-Moll: ein bisschen Abschied
    m.pad(ch(45, 52, 57, 61, 64), T_TOUR + 11, 7.5, 0.045, 1500);       // A-Dur: Spannung vor der Ankunft
    ROW.slice().reverse().forEach((r, i) => m.bell(midi([86, 84, 83, 81, 79, 78, 76, 74, 74][i]), T_TOUR + 0.8 + i * 1.95, 0.06));
    m.pad(ch(38, 45, 50, 54, 57, 62), T_HOME, 8.5, 0.05, 1800);          // D-Dur: zu Hause
    m.riser(T_PARTY - 2, 2, 0.08);
    m.boom(T_PARTY, 0.4);
    m.pad(ch(38, 45, 50, 54, 57, 62, 66), T_PARTY, T_END - T_PARTY + 0.5, 0.055, 2400);
    for (let i = 0; i < 9; i++) m.bell(midi([86, 90, 93, 98, 93, 90, 86, 93, 98][i]), T_PARTY + 0.3 + i * 0.55, 0.08); // Funken
  }

  // ---------- Ablauf ----------
  function play(opts) {
    W = opts.world; T = window.Textures;
    st = { t: 0, name: opts.name, done: opts.onDone, captionOn: -1, noraI: -1, ended: false };
    st.dot = mk(T.dotTexture());
    st.ui = buildOverlay();
    st.ui.t3.textContent = `${opts.name}, du hast das Sonnensystem erforscht!`;
    st.S = build(opts.color);
    st.music = Sound.cinematic(); score(st.music);
    st.ui.skip.onclick = () => finish(true);
    st.key = (e) => { if (e.key === "Escape") finish(true); };
    window.addEventListener("keydown", st.key);
    requestAnimationFrame(() => st.ui.root.classList.add("on"));
    Outro.active = true;
    update(0);
  }
  function update(dt) {
    if (!st || st.ended) return;
    const t = (st.t += dt), S = st.S, ui = st.ui;
    Outro.scene = S.scene; Outro.camera = S.camera;
    if (Math.abs(S.camera.aspect - innerWidth / innerHeight) > 0.001) { S.camera.aspect = innerWidth / innerHeight; S.camera.updateProjectionMatrix(); }
    update3d(S, t, dt);
    const cap = OUTRO_CAPTIONS.findIndex(([a, b]) => t >= a && t < b);
    if (cap !== st.captionOn) {
      if (cap >= 0) { const txt = OUTRO_CAPTIONS[cap][2]; showCaption(txt, OUTRO_CAPTIONS[cap][3] === "big"); Voice.say(txt, "narrator", { queue: true }); } else hideCaption();
      st.captionOn = cap;
    }
    if (cap >= 0 && t > OUTRO_CAPTIONS[cap][1] - 0.6) hideCaption();
    const ni = OUTRO_NORA.findIndex(([a, b]) => t >= a && t < b);
    ui.radio.classList.toggle("on", t >= OUTRO_NORA[0][0] - 0.3 && t < T_PARTY);
    if (ni >= 0) {
      const txt = OUTRO_NORA[ni][2].replace("{name}", st.name), n = Math.min(txt.length, Math.floor((t - OUTRO_NORA[ni][0]) * 34)), shown = txt.slice(0, n);
      if (ui.radioText.textContent !== shown) ui.radioText.textContent = shown;
      ui.radio.classList.toggle("talking", n < txt.length);
      if (ni !== st.noraI) { st.noraI = ni; Sound.click(); Voice.say(txt, "nora", { queue: true }); }
    }
    ui.title.classList.toggle("on", t >= T_PARTY + 0.6);
    ui.flash.style.opacity = (t >= T_PARTY ? 0.7 * (1 - seg(t, T_PARTY, T_PARTY + 1.2)) : 0).toFixed(3);
    const black = Math.max(1 - seg(t, 0, 0.6), seg(t, T_END - 0.7, T_END));
    ui.fade.style.opacity = black.toFixed(3);
    if (t >= T_END) finish(false);
  }
  function finish(skipped) {
    if (!st || st.ended) return;
    st.ended = true;
    window.removeEventListener("keydown", st.key);
    if (skipped) Voice.stop();
    if (st.music) st.music.stop(skipped ? 0.5 : 1.2);
    const ui = st.ui, done = st.done;
    ui.fade.style.transition = "opacity .45s"; ui.fade.style.opacity = "1";
    setTimeout(() => {
      Outro.active = false; Outro.scene = Outro.camera = null;
      for (const x of own) x.dispose && x.dispose();
      own.length = 0; st = null;
      done && done();
      ui.title.classList.remove("on"); ui.radio.classList.remove("on"); ui.root.classList.remove("on");
      ui.fade.style.transition = "opacity 1.2s"; ui.fade.style.opacity = "0";
      setTimeout(() => ui.root.remove(), 1300);
    }, skipped ? 480 : 60);
  }

  return { play, update, active: false, scene: null, camera: null, time: () => (st ? st.t : -1) };
})();
