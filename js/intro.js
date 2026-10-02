/* =========================================================
   Intro: kleines Kino beim ersten Start (knapp eine Minute)
   1. Staub und Gas – die Sonne entzündet sich
   2. Die Planeten entstehen, einer nach dem anderen
   3. Flug zur Erde – „Du, {name}.“
   4. Nachts an der Startrampe: Flugleiterin Nora erklärt die Mission
   5. Countdown, Start – „Mission Sonnensystem“
   Nutzt den Renderer des Spiels (kein zweites WebGL) und die Planeten aus der Spielwelt.
   ========================================================= */
window.Intro = (function () {
  const V = THREE.Vector3;
  let W, T, st = null;

  // ---------- Zeitplan (Sekunden) ----------
  const T_IGNITE = 7.4;                 // die Sonne entzündet sich
  const T_PLANETS = 11.4, P_STEP = 0.9; // Planet i erscheint bei T_PLANETS + i·P_STEP
  const T_WIDE = 18.8;                  // Kamera fährt zurück: alle Planeten im Bild
  const T_EARTH = 21;                   // Flug zur Erde
  const T_PAD = 31;                     // Schnitt zur Startrampe
  const T_COUNT = 45.5;                 // Countdown 3 · 2 · 1
  const T_LIFT = 48.1;                  // Zündung
  const T_FLASH = 50.6;                 // weißer Blitz, Titel
  const T_END = 54.4;

  const CAPTIONS = [
    [0.6, 3.6, "Vor 4,6 Milliarden Jahren …"],
    [3.9, 7.1, "… gab es hier nur Staub und Gas."],
    [7.9, 11.0, "Dann erwachte ein Stern: unsere Sonne."],
    [11.8, 15.4, "Um sie herum entstanden die Planeten."],
    [15.8, 19.6, "Und ganz am Rand: der kleine Pluto."],
    [21.6, 24.6, "Auf einem kleinen, blauen Planeten …"],
    [24.9, 28.0, "… schaut jemand zu den Sternen hinauf."],
    [28.3, 30.5, "Das bist du, {name}!", "big"]
  ];
  const NORA = [
    [31.4, 34.6, "Hier spricht Flugleiterin Nora. Hallo, {name}!"],
    [34.8, 42.6, "Deine Mission: Erkunde das Sonnensystem! Lande auf fremden Welten und steuere Sonden durch Stürme."],
    [42.8, 47.4, "Das Weltall wartet auf dich. Bist du bereit?"]
  ];
  const PLANETS = [ // id, Position x, Größe im Intro
    ["merkur", 32, 1], ["venus", 44, 1], ["erde", 58, 1], ["mars", 71, 1], ["jupiter", 96, 0.85],
    ["saturn", 128, 0.8], ["uranus", 154, 0.9], ["neptun", 172, 0.9], ["pluto", 186, 1.2]
  ];

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const back = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2)); // mit Überschwung
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- Bühne: HTML-Ebene über dem Bild ----------
  function buildOverlay() {
    const o = document.createElement("div");
    o.id = "intro";
    o.innerHTML = `
      <div class="in-bar top"></div><div class="in-bar bottom"></div>
      <div class="in-labels"></div>
      <div class="in-caption"></div>
      <div class="in-radio"><div class="in-radio-head"><span class="in-wave"><i></i><i></i><i></i></span>🎧 Flugleiterin Nora</div><div class="in-radio-text"></div></div>
      <div class="in-count"></div>
      <div class="in-title"><div class="t1">Mission</div><div class="t2">Sonnensystem</div><div class="t3"></div></div>
      <div class="in-flash"></div><div class="in-fade"></div>
      <button class="in-skip">Überspringen ⏭</button>`;
    document.body.appendChild(o);
    const q = (s) => o.querySelector(s);
    return { root: o, caption: q(".in-caption"), labels: q(".in-labels"), radio: q(".in-radio"), radioText: q(".in-radio-text"),
      count: q(".in-count"), title: q(".in-title"), t3: q(".in-title .t3"), flash: q(".in-flash"), fade: q(".in-fade"), skip: q(".in-skip") };
  }
  function showCaption(text, big) {
    const c = st.ui.caption;
    c.className = "in-caption" + (big ? " big" : "");
    c.textContent = "";
    text.split(" ").forEach((w, i) => { // Wort für Wort einblenden
      const s = document.createElement("span"); s.textContent = w; s.style.animationDelay = (i * 0.14).toFixed(2) + "s";
      c.appendChild(s); c.appendChild(document.createTextNode(" "));
    });
    void c.offsetWidth; c.classList.add("show");
  }
  function hideCaption() { st.ui.caption.classList.add("out"); }

  // ---------- Szene 1–3: Weltraum ----------
  const own = []; // selbst erzeugte Geometrien/Materialien/Texturen (geteilte aus der Spielwelt bleiben unangetastet)
  const mk = (x) => { own.push(x); return x; };

  function starField(n, rMin, rMax) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin), s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
      const b = 0.55 + Math.random() * 0.45, warm = Math.random();
      col.set([b * (warm > 0.8 ? 1 : 0.85), b * 0.9, b * (warm < 0.3 ? 1 : 0.85)], i * 3);
    }
    const geo = mk(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, mk(new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, map: st.dot, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
  }
  function glowSprite(inner, outer, size) {
    const s = new THREE.Sprite(mk(new THREE.SpriteMaterial({ map: mk(T.glowTexture(inner, outer)), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true })));
    s.scale.setScalar(size); return s;
  }
  // Kopie eines Himmelskörpers aus der Spielwelt (teilt Geometrie und Material)
  const copyBody = (id) => W.bodies[id].group.children[0].clone();

  function buildSpace() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const bg = new THREE.Mesh(mk(new THREE.SphereGeometry(2400, 32, 16)), mk(new THREE.MeshBasicMaterial({ map: W.bg.material.map, side: THREE.BackSide, depthWrite: false, toneMapped: false, transparent: true, opacity: 0 })));
    scene.add(bg);
    const stars = starField(W.lite ? 2500 : 5000, 1200, 2000); scene.add(stars);
    scene.add(new THREE.AmbientLight(0x6070a0, 0.3));
    const light = new THREE.PointLight(0xfff1dd, 0, 0); scene.add(light);

    // Urwolke: eine flache, rotierende Scheibe aus Staub, die in die Mitte stürzt
    const n = W.lite ? 2200 : 4200, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 14 + Math.pow(Math.random(), 0.7) * 150, a = Math.random() * Math.PI * 2 + r * 0.035; // leichte Spiralarme
      pos.set([Math.cos(a) * r, (Math.random() - 0.5) * (2 + r * 0.05), Math.sin(a) * r], i * 3);
      const k = 1 - r / 170, warm = 0.3 + 0.7 * k, m = Math.random();
      if (m < 0.35) col.set([0.45 * warm + 0.1, 0.3 * warm, 0.75 * warm + 0.1], i * 3);      // violett
      else if (m < 0.5) col.set([0.25 * warm, 0.45 * warm, 0.8 * warm], i * 3);             // blau
      else col.set([warm, warm * 0.58, warm * 0.3], i * 3);                                  // glühend orange
    }
    const dgeo = mk(new THREE.BufferGeometry());
    dgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); dgeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const disk = new THREE.Points(dgeo, mk(new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: true, map: st.dot, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
    scene.add(disk);
    // große, weiche Nebelschwaden in der Scheibe
    const clouds = [];
    for (let i = 0; i < 16; i++) {
      const warm = i % 3 === 0, s = glowSprite(warm ? "rgba(255,150,80,0.55)" : "rgba(150,90,255,0.5)", warm ? "rgba(200,80,40,0.18)" : "rgba(70,60,200,0.16)", 50 + Math.random() * 70);
      const r = 25 + Math.random() * 110, a = Math.random() * Math.PI * 2;
      s.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 6, Math.sin(a) * r); s.material.opacity = 0; disk.add(s); clouds.push(s);
    }
    const core = glowSprite("rgba(255,230,190,1)", "rgba(255,140,60,0.5)", 1); scene.add(core); // der Kern glimmt schon vor der Zündung

    // Sonne
    const sun = new THREE.Group(); scene.add(sun);
    sun.add(W.bodies.sonne.mesh.clone());
    const g1 = glowSprite("rgba(255,240,200,1)", "rgba(255,170,60,0.55)", 75), g2 = glowSprite("rgba(255,200,120,0.6)", "rgba(255,120,40,0.18)", 160);
    sun.add(g1, g2); sun.scale.setScalar(0.001);
    const shock = new THREE.Mesh(mk(new THREE.RingGeometry(0.975, 1, 128)), mk(new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    shock.rotation.x = -Math.PI / 2; scene.add(shock);

    // Planeten mit Umlaufbahn und Namensschild
    const planets = PLANETS.map(([id, x, size], i) => {
      const b = W.bodies[id].data, holder = new THREE.Group(), body = copyBody(id);
      holder.add(body); holder.position.set(x, 0, 0); holder.scale.setScalar(0.001); holder.visible = false; scene.add(holder);
      const pts = []; for (let k = 0; k <= 200; k++) { const a = (k / 200) * Math.PI * 2; pts.push(new V(Math.cos(a) * x, 0, Math.sin(a) * x)); }
      const orbit = new THREE.Line(mk(new THREE.BufferGeometry().setFromPoints(pts)), mk(new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0 })));
      scene.add(orbit);
      const pop = glowSprite("rgba(255,255,255,1)", "rgba(160,200,255,0.5)", 1); pop.position.copy(holder.position); pop.visible = false; scene.add(pop);
      const label = document.createElement("div"); label.className = "in-label"; label.textContent = b.name; st.ui.labels.appendChild(label);
      return { id, x, r: b.radius * size, size, t: T_PLANETS + i * P_STEP, holder, orbit, pop, label };
    });
    const earth = planets[2];
    const moon = new THREE.Group(); moon.add(copyBody("mond")); moon.visible = false; scene.add(moon);

    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 6000);
    return { scene, camera, bg, stars, light, disk, clouds, core, sun, g1, g2, shock, planets, earth, moon };
  }

  // Kamera im Weltraum: mehrere Einstellungen, weich ineinander übergeblendet
  const P = new V(), L = new V(), P2 = new V(), L2 = new V();
  function spaceCamera(S, t) {
    // 1) Blick schräg von oben auf die Urwolke, langsam heranfahren
    let e = ease(seg(t, 0, T_IGNITE + 3));
    P.set(-20 * e, 70 - 34 * e, 190 - 85 * e); L.set(0, 0, 0);
    // 2) den entstehenden Planeten folgen
    const w2 = ease(seg(t, T_PLANETS - 0.9, T_PLANETS + 0.3));
    if (w2 > 0) {
      let lx = S.planets[0].x, d = 26;
      for (let i = 1; i < S.planets.length; i++) {
        const p = S.planets[i], k = ease(seg(t, p.t - 0.55, p.t + 0.25));
        lx += (p.x - lx) * k; d += (18 + p.r * 3.4 - d) * k;
      }
      P2.set(lx - d * 0.55, d * 0.42, d); L2.set(lx + 4, 0, 0);
      P.lerp(P2, w2); L.lerp(L2, w2);
    }
    // 3) zurückfahren: das ganze Sonnensystem
    const w3 = ease(seg(t, T_WIDE, T_EARTH + 0.6));
    if (w3 > 0) { P2.set(96, 95, 250); L2.set(96, 0, 0); P.lerp(P2, w3); L.lerp(L2, w3); }
    // 4) Anflug auf die Erde (mit dem Mond im Vordergrund)
    const w4 = ease(seg(t, T_EARTH + 0.6, T_EARTH + 7.5));
    if (w4 > 0) {
      const ex = S.earth.x, drift = seg(t, T_EARTH + 7.5, T_PAD);
      P2.set(ex - 6.5 + drift * 1.2, 2.2 - drift * 0.4, 10.5 - drift * 1.6); L2.set(ex + 0.6, 0.2, 0);
      P.lerp(P2, w4); L.lerp(L2, w4);
    }
    // Beben bei der Zündung
    const shake = Math.max(0, 1 - (t - T_IGNITE) / 1.4) * (t > T_IGNITE ? 1.6 : 0);
    S.camera.position.set(P.x + (Math.random() - 0.5) * shake, P.y + (Math.random() - 0.5) * shake, P.z);
    S.camera.lookAt(L);
  }

  function updateSpace(S, t, dt) {
    const fadeIn = seg(t, 0.2, 4);
    S.stars.material.opacity = fadeIn * 0.9;
    S.bg.material.opacity = seg(t, 1, 9) * 0.85;
    // Urwolke dreht sich und stürzt zusammen
    S.disk.rotation.y += dt * (0.08 + 0.5 * seg(t, 3, T_IGNITE));
    const fall = ease(seg(t, 4, T_IGNITE + 0.3));
    S.disk.scale.set(1 - 0.92 * fall, 1 - 0.6 * fall, 1 - 0.92 * fall);
    const dO = Math.min(seg(t, 0.4, 3.5), 1 - seg(t, T_IGNITE, T_IGNITE + 0.7));
    S.disk.material.opacity = dO * 0.8;
    for (const c of S.clouds) c.material.opacity = dO * 0.45;
    S.core.scale.setScalar(4 + 26 * seg(t, 2.5, T_IGNITE) + Math.sin(t * 9) * 1.5 * seg(t, 5, T_IGNITE));
    S.core.material.opacity = seg(t, 1.5, 4) * (1 - seg(t, T_IGNITE + 0.2, T_IGNITE + 1));
    // Zündung
    const sIn = back(seg(t, T_IGNITE, T_IGNITE + 1.3));
    S.sun.scale.setScalar(Math.max(0.001, sIn));
    S.sun.rotation.y += dt * 0.05;
    const pulse = 1 + Math.sin(t * 2.2) * 0.03;
    S.g1.scale.setScalar(75 * pulse); S.g2.scale.setScalar(160 * (1 + 0.6 * (1 - seg(t, T_IGNITE, T_IGNITE + 2.5))));
    S.light.intensity = 1.8 * seg(t, T_IGNITE, T_IGNITE + 0.8);
    const sw = seg(t, T_IGNITE, T_IGNITE + 2.2);
    S.shock.scale.setScalar(20 + sw * 260); S.shock.material.opacity = sw > 0 && sw < 1 ? (1 - sw) * 0.55 : 0;
    // Planeten erscheinen
    for (const p of S.planets) {
      const k = seg(t, p.t, p.t + 0.85);
      p.holder.visible = k > 0;
      const away = p === S.earth ? 0 : ease(seg(t, T_EARTH + 1.2, T_EARTH + 3.6)); // Fokus auf die Erde
      p.holder.scale.setScalar(Math.max(0.001, back(k) * p.size * (1 - away)));
      if (away >= 1) p.holder.visible = false;
      p.holder.children[0].rotation.y += dt * 0.25;
      p.orbit.material.opacity = 0.2 * seg(t, p.t, p.t + 1.2) * (1 - 0.6 * seg(t, T_EARTH + 3, T_EARTH + 6));
      const pk = seg(t, p.t, p.t + 0.7);
      p.pop.visible = pk > 0 && pk < 1;
      p.pop.scale.setScalar(p.r * (2 + 9 * pk)); p.pop.material.opacity = (1 - pk) * 0.9;
    }
    // Mond kreist um die Erde, sobald wir hinfliegen
    const e = S.earth;
    S.moon.visible = t > T_EARTH;
    const ma = 2.2 + (t - T_EARTH) * 0.09;
    S.moon.position.set(e.x + Math.cos(ma) * 8, 0.6, Math.sin(ma) * 8);
    S.moon.rotation.y += dt * 0.1;
    spaceCamera(S, t);
    // Namensschilder
    const c = S.camera, w = innerWidth, h = innerHeight, v = new V();
    for (const p of S.planets) {
      const vis = t > p.t + 0.35 && t < T_EARTH + 1.5;
      p.label.classList.toggle("on", vis);
      if (!vis) continue;
      v.set(p.x, p.r * 1.25 + 1.2, 0).project(c);
      if (v.z > 1) { p.label.classList.remove("on"); continue; }
      p.label.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    }
  }

  // ---------- Szene 4–5: nachts an der Startrampe ----------
  function bannerTex(name) {
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 256;
    const c = cv.getContext("2d");
    const gr = c.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, "#1e1b4b"); gr.addColorStop(1, "#312e81");
    c.fillStyle = gr; c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = "#fbbf24"; c.lineWidth = 10; c.strokeRect(8, 8, 1008, 240);
    c.fillStyle = "#fbbf24"; c.font = "600 54px Fredoka, sans-serif"; c.textAlign = "center"; c.fillText("MISSION", 512, 92);
    c.fillStyle = "#ffffff"; let fs = 104; c.font = `700 ${fs}px Fredoka, sans-serif`;
    const nm = name.toUpperCase();
    while (c.measureText(nm).width > 940 && fs > 40) { fs -= 6; c.font = `700 ${fs}px Fredoka, sans-serif`; }
    c.fillText(nm, 512, 200);
    const tex = mk(new THREE.CanvasTexture(cv)); tex.encoding = THREE.sRGBEncoding; return tex;
  }
  function buildPad(color, name) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05081a);
    scene.fog = new THREE.Fog(0x070b1f, 120, 520);
    const bg = new THREE.Mesh(mk(new THREE.SphereGeometry(900, 32, 16)), mk(new THREE.MeshBasicMaterial({ map: W.bg.material.map, side: THREE.BackSide, depthWrite: false, toneMapped: false, fog: false, transparent: true, opacity: 0.75 })));
    scene.add(bg);
    const stars = starField(W.lite ? 1200 : 2400, 600, 850); stars.material.opacity = 0.9; stars.material.fog = false; scene.add(stars);
    scene.add(new THREE.HemisphereLight(0x6d7fd6, 0x10131f, 0.35));
    const moonLight = new THREE.DirectionalLight(0xb9c8ff, 0.7); moonLight.position.set(-150, 120, -200); scene.add(moonLight);
    // der Mond am Nachthimmel
    const moon = copyBody("mond"); moon.scale.setScalar(16); moon.position.set(-170, 105, -330); scene.add(moon);
    const moonGlow = glowSprite("rgba(220,230,255,0.55)", "rgba(150,170,255,0.12)", 120); moonGlow.position.copy(moon.position); moonGlow.material.fog = false; scene.add(moonGlow);

    const ground = new THREE.Mesh(mk(new THREE.CircleGeometry(600, 64)), mk(new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 1 })));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const concrete = mk(new THREE.MeshStandardMaterial({ color: 0x5b6274, roughness: 0.9 }));
    const pad = new THREE.Mesh(mk(new THREE.CylinderGeometry(8, 9, 1.2, 40)), concrete); pad.position.y = 0.6; scene.add(pad);
    const ringMat = mk(new THREE.MeshBasicMaterial({ color: 0xfbbf24, toneMapped: false }));
    const ring = new THREE.Mesh(mk(new THREE.TorusGeometry(7.4, 0.08, 6, 64)), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 1.22; scene.add(ring);

    // Startturm aus rotem Stahlgitter mit Versorgungsarm
    const steel = mk(new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.6, metalness: 0.4 }));
    const tower = new THREE.Group(); tower.position.set(-7, 1.2, -1); scene.add(tower);
    const colGeo = mk(new THREE.BoxGeometry(0.3, 26, 0.3)), barGeo = mk(new THREE.BoxGeometry(3, 0.18, 0.18));
    for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) { const c = new THREE.Mesh(colGeo, steel); c.position.set(x, 13, z); tower.add(c); }
    for (let y = 1.5; y < 26; y += 2.6) for (const [x, z, r] of [[0, -1.5, 0], [0, 1.5, 0], [-1.5, 0, Math.PI / 2], [1.5, 0, Math.PI / 2]]) {
      const b = new THREE.Mesh(barGeo, steel); b.position.set(x, y, z); b.rotation.y = r; tower.add(b);
    }
    const arm = new THREE.Mesh(mk(new THREE.BoxGeometry(5.2, 0.5, 0.9)), steel); arm.position.set(3.6, 15, 0); tower.add(arm);
    const lampMat = mk(new THREE.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false }));
    const lamp = new THREE.Mesh(mk(new THREE.SphereGeometry(0.35, 12, 8)), lampMat); lamp.position.set(0, 26.4, 0); tower.add(lamp);
    const banner = new THREE.Mesh(mk(new THREE.PlaneGeometry(8, 2)), mk(new THREE.MeshBasicMaterial({ map: bannerTex(name), toneMapped: false })));
    banner.position.set(0, 10, 1.75); tower.add(banner);

    // die Rakete in der gewählten Farbe, Spitze nach oben
    const rocket = W.makeRocket(color);
    rocket.scale.setScalar(6); rocket.rotation.x = Math.PI / 2; rocket.position.y = 1.2 + 0.85 * 6;
    rocket.userData.flame.visible = false; scene.add(rocket);
    const rocketY = rocket.position.y;

    // Scheinwerfer mit sichtbaren Lichtkegeln
    for (const [x, z] of [[18, 10], [-16, 14], [14, -16]]) {
      const pole = new THREE.Mesh(mk(new THREE.CylinderGeometry(0.15, 0.2, 4, 8)), concrete); pole.position.set(x, 2, z); scene.add(pole);
      const spot = new THREE.SpotLight(0xdfe8ff, 1.6, 90, 0.32, 0.6, 1.2); spot.position.set(x, 4.2, z); spot.target.position.set(0, 9, 0);
      scene.add(spot, spot.target);
      const glow = glowSprite("rgba(230,240,255,0.9)", "rgba(150,180,255,0.25)", 5); glow.position.set(x, 4.3, z); scene.add(glow); // Scheinwerfer leuchtet
    }
    const engineLight = new THREE.PointLight(0xffa04a, 0, 60, 1.5); engineLight.position.set(0, 1, 0); scene.add(engineLight);
    const blaze = glowSprite("rgba(255,250,220,1)", "rgba(255,150,40,0.75)", 16); blaze.visible = false; scene.add(blaze);

    // Rauchwolken beim Start
    const smokeMat = mk(new THREE.SpriteMaterial({ map: mk(T.glowTexture("rgba(225,225,235,0.95)", "rgba(170,170,185,0.55)")), transparent: true, depthWrite: false }));
    const smoke = [];
    for (let i = 0; i < (W.lite ? 40 : 80); i++) { const s = new THREE.Sprite(smokeMat.clone()); own.push(s.material); s.visible = false; s.userData = { life: 0, v: new V() }; scene.add(s); smoke.push(s); }
    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);
    return { scene, camera, rocket, rocketY, lamp, engineLight, blaze, smoke, smokeI: 0 };
  }

  function updatePad(S, t, dt) {
    const k = t - T_PAD;
    S.lamp.visible = Math.sin(t * 4) > 0;
    // Start: Flamme, Licht, Rauch, Rakete steigt immer schneller
    const lift = Math.max(0, t - T_LIFT - 0.5), fire = t > T_LIFT;
    const fl = S.rocket.userData.flame;
    fl.visible = fire;
    if (fire) fl.scale.set(2.2 + Math.random() * 0.5, 2.2 + Math.random() * 0.5, 3.4 + Math.random() * 1.2);
    S.blaze.visible = fire;
    if (fire) { S.blaze.position.set(0, S.rocket.position.y - 6.5, 0); S.blaze.scale.setScalar(14 + Math.random() * 5); }
    S.rocket.position.y = S.rocketY + 0.5 * 7 * lift * lift;
    S.engineLight.intensity = fire ? 3 + Math.random() * 1.5 : 0;
    S.engineLight.position.y = S.rocket.position.y - 5;
    if (fire && S.rocket.position.y < S.rocketY + 30) {
      for (let n = 0; n < 3; n++) {
        const s = S.smoke[S.smokeI]; S.smokeI = (S.smokeI + 1) % S.smoke.length;
        const a = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 10;
        s.position.set(Math.cos(a) * 2, 1.5 + Math.random(), Math.sin(a) * 2);
        s.userData.v.set(Math.cos(a) * sp, 0.6 + Math.random() * 2, Math.sin(a) * sp);
        s.userData.life = 0; s.visible = true;
      }
    }
    for (const s of S.smoke) {
      if (!s.visible) continue;
      const u = s.userData; u.life += dt;
      s.position.addScaledVector(u.v, dt); u.v.multiplyScalar(1 - dt * 0.9);
      s.scale.setScalar(3 + u.life * 9);
      s.material.opacity = Math.max(0, 0.75 - u.life * 0.2);
      if (u.life > 3.8) s.visible = false;
    }
    // Kamera: tief unten, langsam um die Rakete herum, beim Start nach oben schwenken
    const e = ease(seg(k, 0, T_COUNT - T_PAD));
    const a = 0.6 - 0.4 * e, dist = 40 - 8 * e + 6 * seg(t, T_LIFT, T_FLASH);
    const cy = 2.5 + 2.5 * e;
    const look = new V(0, 7.5 + 1.5 * e, 0);
    if (t > T_LIFT) look.y = Math.max(look.y, S.rocket.position.y + 2);
    const shake = t > T_LIFT ? 0.45 * (1 - seg(t, T_LIFT + 2, T_FLASH + 1)) : 0;
    S.camera.position.set(Math.sin(a) * dist + (Math.random() - 0.5) * shake, cy + (Math.random() - 0.5) * shake, Math.cos(a) * dist);
    S.camera.lookAt(look);
  }

  // ---------- Musik ----------
  function scoreMusic(m) {
    if (!m) return;
    const ch = (...n) => n.map(midi);
    m.pad(ch(38, 45, 50, 53), 0, 7.8, 0.035, 450);            // d-Moll: dunkel, geheimnisvoll
    m.riser(4.4, T_IGNITE - 4.4, 0.06);
    m.boom(T_IGNITE, 0.55);
    [81, 86, 89, 93].forEach((n, i) => m.bell(midi(n), T_IGNITE + 0.1 + i * 0.07, 0.07));
    m.pad(ch(34, 41, 46, 50, 53), T_IGNITE - 0.4, 8, 0.04, 1000); // B-Dur: das Licht ist da
    PLANETS.forEach((p, i) => m.bell(midi([77, 79, 81, 84, 86, 89, 91, 93, 96][i]), T_PLANETS + i * P_STEP, 0.09));
    m.pad(ch(41, 48, 53, 57, 60), 15, 7.2, 0.042, 1300);       // F-Dur: weit und staunend
    m.pad(ch(43, 50, 55, 58), T_EARTH + 0.6, 4.8, 0.04, 900);  // g-Moll: ein bisschen Gänsehaut
    m.pad(ch(46, 53, 58, 62), T_EARTH + 4.8, 5.6, 0.045, 1100);
    m.bell(midi(81), 28.3, 0.08); m.bell(midi(86), 28.5, 0.07); // „Du, {name}.“
    m.pad(ch(41, 48, 53, 57), T_PAD, 6, 0.04, 1000);           // an der Startrampe: warm, hoffnungsvoll
    m.pad(ch(34, 46, 50, 53), T_PAD + 5.5, 5.8, 0.042, 1200);
    m.pad(ch(36, 43, 48, 52, 55), T_PAD + 10.8, T_LIFT - T_PAD - 10.6, 0.046, 1700); // C-Dur: Spannung
    m.riser(T_COUNT - 1.5, T_LIFT - T_COUNT + 1.5, 0.12);
    [0, 1, 2].forEach((i) => m.beep(midi(81), T_COUNT + i, 0.13));
    m.boom(T_LIFT, 0.6); m.rumble(T_LIFT, T_END - T_LIFT, 0.32);
    m.pad(ch(38, 45, 50, 54, 57, 62), T_LIFT + 0.1, T_END - T_LIFT + 0.4, 0.055, 2200); // D-Dur: Aufbruch!
    [74, 78, 81, 86].forEach((n, i) => m.bell(midi(n), T_FLASH + 0.15 + i * 0.16, 0.12));
    m.bell(midi(90), T_FLASH + 0.9, 0.1);
  }

  // ---------- Ablauf ----------
  function play(opts) {
    W = opts.world; T = window.Textures;
    st = { t: 0, name: opts.name, done: opts.onDone, captionI: 0, captionOn: -1, noraI: -1, countShown: "", ended: false };
    st.dot = mk(T.dotTexture());
    st.ui = buildOverlay();
    st.ui.t3.textContent = `Deine Reise beginnt, ${opts.name}!`;
    st.space = buildSpace();
    st.pad = buildPad(opts.color, opts.name);
    st.music = Sound.cinematic();
    scoreMusic(st.music);
    st.ui.skip.onclick = () => finish(true);
    st.key = (e) => { if (e.key === "Escape") finish(true); };
    window.addEventListener("keydown", st.key);
    requestAnimationFrame(() => st.ui.root.classList.add("on")); // Kino-Balken fahren ein
    Intro.active = true;
    update(0);
  }

  function update(dt) {
    if (!st || st.ended) return;
    const t = (st.t += dt);
    const S = t < T_PAD ? st.space : st.pad;
    Intro.scene = S.scene; Intro.camera = S.camera;
    if (Math.abs(S.camera.aspect - innerWidth / innerHeight) > 0.001) { S.camera.aspect = innerWidth / innerHeight; S.camera.updateProjectionMatrix(); }
    if (S === st.space) updateSpace(S, t, dt); else updatePad(S, t, dt);

    // Texte im Weltraum
    const name = st.name, ui = st.ui;
    const cap = CAPTIONS.findIndex(([a, b]) => t >= a && t < b);
    if (cap !== st.captionOn) {
      if (cap >= 0) { const txt = CAPTIONS[cap][2].replace("{name}", name); showCaption(txt, CAPTIONS[cap][3] === "big"); Voice.say(txt, "narrator", { queue: true }); } else hideCaption();
      st.captionOn = cap;
    }
    if (cap >= 0 && t > CAPTIONS[cap][1] - 0.6) hideCaption();
    // Nora funkt (Schreibmaschine)
    const ni = NORA.findIndex(([a, b]) => t >= a && t < b);
    ui.radio.classList.toggle("on", t >= NORA[0][0] - 0.3 && t < T_LIFT + 0.3);
    if (ni >= 0) {
      const txt = NORA[ni][2].replace("{name}", name), n = Math.min(txt.length, Math.floor((t - NORA[ni][0]) * 34));
      const shown = txt.slice(0, n);
      if (ui.radioText.textContent !== shown) ui.radioText.textContent = shown;
      ui.radio.classList.toggle("talking", n < txt.length);
      if (ni !== st.noraI) { st.noraI = ni; Sound.click(); Voice.say(txt, "nora", { queue: true }); }
    }
    // Countdown
    let cd = "", ph = 0; // ph = wie weit die aktuelle Zahl schon ist (0 … 1)
    if (t >= T_COUNT && t < T_LIFT) { cd = String(3 - Math.floor(t - T_COUNT)); ph = (t - T_COUNT) % 1; }
    else if (t >= T_LIFT && t < T_LIFT + 1.4) { cd = "START!"; ph = (t - T_LIFT) / 1.4; }
    if (cd !== st.countShown) { st.countShown = cd; ui.count.textContent = cd; ui.count.classList.toggle("go", cd === "START!"); }
    // groß hereinfallen, kurz stehen, kleiner werdend verblassen
    const cIn = seg(ph, 0, 0.18), cOut = seg(ph, 0.75, 1);
    ui.count.style.opacity = cd ? (Math.min(cIn, 1 - cOut)).toFixed(3) : "0";
    ui.count.style.transform = `translateY(-58%) scale(${(1.8 - 0.8 * ease(cIn) - 0.15 * cOut).toFixed(3)})`;
    // Blitze, Titel, Abblende
    const flash = Math.max(t >= T_IGNITE ? 1 - seg(t, T_IGNITE, T_IGNITE + 1.3) : 0, t >= T_FLASH ? 1 - seg(t, T_FLASH, T_FLASH + 1.6) : 0);
    ui.flash.style.opacity = flash.toFixed(3);
    ui.title.classList.toggle("on", t >= T_FLASH + 0.2);
    let black = 1 - seg(t, 0, 0.6);                                   // am Anfang aus dem Schwarz
    black = Math.max(black, seg(t, T_PAD - 0.7, T_PAD) * (1 - seg(t, T_PAD, T_PAD + 0.9))); // Schnitt zur Startrampe
    black = Math.max(black, seg(t, T_END - 0.7, T_END));             // Ende
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
      Intro.active = false; Intro.scene = Intro.camera = null;
      // nur selbst erzeugte Dinge aufräumen – Planeten, Mond und Sonne teilen sich Geometrie und Material mit der Spielwelt
      for (const x of own) x.dispose && x.dispose();
      own.length = 0;
      st = null;
      done && done();
      ui.title.classList.remove("on"); ui.radio.classList.remove("on"); ui.root.classList.remove("on");
      ui.fade.style.transition = "opacity 1.2s"; ui.fade.style.opacity = "0";
      setTimeout(() => ui.root.remove(), 1300);
    }, skipped ? 480 : 60);
  }

  return { play, update, active: false, scene: null, camera: null, time: () => (st ? st.t : -1) };
})();
