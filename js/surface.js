/* =========================================================
   Aussteigen & erkunden: als Astronaut über einen Himmelskörper laufen
   und die Lerninhalte selbst entdecken (bisher: Mond).
   ========================================================= */
window.Surface = (function () {
  const D = window.SPACE_DATA;
  const V = THREE.Vector3;
  const $ = (id) => document.getElementById(id);
  const S = { active: false, scene: null, camera: null };
  const worlds = {};          // fertig gebaute Welten (schneller Wiedereinstieg)
  let G = null, W = null, UI = null;
  let world = null, cfg = null, bodyId = null, onExit = null, astronautModel = null;
  let site = null;            // Besonderheiten des aktuellen Ortes (siehe SITES ganz unten)
  let sharedAstronaut = null;
  const isTouch = () => document.documentElement.classList.contains("touch-ui");

  S.supports = (id) => !!(D.surfaces && D.surfaces[id]);

  // ---------- kleines 2D-Rauschen für die Landschaft ----------
  function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm2(x, y) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += noise2(x * f, y * f) * a; a *= 0.5; f *= 2.1; } return s; }
  // Kachelbares Rauschen: wiederholt sich nach p Gitterzellen – so zeigen gekachelte Texturen keine Nähte
  function noise2p(x, y, p) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, w = (n) => ((n % p) + p) % p;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(w(xi), w(yi)), b = hash2(w(xi + 1), w(yi)), c = hash2(w(xi), w(yi + 1)), d = hash2(w(xi + 1), w(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm2p(x, y, p) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += noise2p(x * f, y * f, p * f) * a; a *= 0.5; f *= 2; } return s; }
  const smooth =(e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const angleLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

  // ---------- Aufbau des Mondes ----------
  // Richtung ZUR Sonne: tief am Himmel → lange, deutliche Schatten
  const SUN_DIR = new V(-1, 0.32, -0.55).normalize();
  // Mond: Die Rakete landet auf der Ebene vor einem großen Krater. Im Westen die Apollo-Landestelle, auf dem Kraterrand
  // die Aussichtsplattform und die Funkstation, unten im Krater der Mondstein – die Mondbasis steht östlich am Rand.
  const MOON_CRATER = [-20, 78, 36, 9];
  const MOON_LAYOUT = {
    rocket: [0, 0], spawn: [-6.9, 4], // Start neben der Leiter (siehe HATCH), aber außer Reichweite von „Einsteigen“
    fallversuch: [-24, 10], himmel: [-7.4, 44.2], apollo: [-34, 16], boulder: [-46, 26], waage: [14, 12], spiegel: [-27.5, 29],
    wegweiser: [-10, 8], mondstein: [-20, 78], // mondstein liegt unten im großen Krater
    station: [44, 46], antenne: [11.3, 60], meet: [22, 26],
    route: {
      wegweiser: [[-7.5, 6.5]], waage: [[2, 8], [10, 6.5], [16.5, 7.5]], fallversuch: [[2, 9], [-14, 11], [-21.5, 12.6]], apollo: [[-21, 18], [-24, 21.5]],
      spiegel: [[-24.5, 27]], temperatur: [[-31.5, 30.5]], himmel: [[-20, 37], [-4, 38.5]], mondstein: [[-10, 50], [-14, 62], [-17, 72.5]],
      antenne: [[-8, 74], [2, 66], [8, 63.5]], wand: [[18, 56], [28, 50], [41, 41.5]], rakete: [[30, 36], [10, 12], [-4, 5]]
    }
  };
  const SHADOW_DIR = new V(-SUN_DIR.x, 0, -SUN_DIR.z).normalize(); // Schatten fallen weg von der Sonne
  // Mondgraben um den Mondstein: 2,3 m tief, steile Wände; der Mondstein liegt auf der Insel in der Mitte.
  // Hinüber kommt man nur mit Anlauf (Mond-Schwerkraft!) – wer hineinfällt, läuft über die Rampe wieder hinaus.
  const MOAT_R = [2.5, 2.8, 4.6, 4.9], MOAT_DEPTH = 2.3, MOAT_RAMP = Math.atan2(5.5, -3);
  function moonMoatK(x, z) { // 0 = kein Graben … 1 = Grabenboden
    const [cx, cz] = MOON_LAYOUT.mondstein, dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz);
    if (r > 9.5) return 0;
    const a = Math.atan2(dz, dx), da = Math.abs(Math.atan2(Math.sin(a - MOAT_RAMP), Math.cos(a - MOAT_RAMP)));
    const outer = da < 0.32 ? smooth(MOAT_R[2], 9.2, r) : smooth(MOAT_R[2], MOAT_R[3], r);
    return 1 - Math.max(smooth(MOAT_R[1], MOAT_R[0], r), outer);
  }

  // Gelände: sanfte Hügel, Krater [x, z, Radius, Tiefe], ebene Plätze [x, z, Radius, Höhe] für Rakete und Stationen
  // extra(x, z): zusätzliche Formen (Sanddünen, Hochebenen, Schluchten …) – die ebenen Plätze bleiben trotzdem eben.
  // Höhe eines ebenen Platzes: weggelassen = 0 · "auto" = so hoch, wie das Gelände in seiner Mitte ohnehin ist · Zahl = genau diese Höhe
  // bumps = sanfte Hügel ohne Ebenen dazwischen: [x, z, Radius, Höhe] (negativ = Mulde)
  function makeHeight(craters, flats, seed = 0, extra = null, bumps = []) {
    const raw = (x, z) => {
      let h = (fbm2(x * 0.02 + seed, z * 0.02) - 0.5) * 6 + (fbm2(x * 0.12 + 7 + seed, z * 0.12) - 0.5) * 0.8;
      if (extra) h += extra(x, z);
      for (const [cx, cz, r, d] of craters) {
        const q = Math.hypot(x - cx, z - cz) / r;
        if (q < 1.7) { if (q < 1) h -= d * (1 - q * q); h += d * 0.45 * Math.exp(-Math.pow((q - 1) / 0.22, 2)); }
      }
      for (const [bx, bz, r, b] of bumps) h += b * smooth(r, 0, Math.hypot(x - bx, z - bz));
      return h;
    };
    const levels = flats.map(([fx, fz, , lv]) => (lv === "auto" ? raw(fx, fz) : lv || 0));
    return function height(x, z) {
      let h = raw(x, z);
      flats.forEach(([fx, fz, r, , bw = 10], i) => {
        const dd = Math.hypot(x - fx, z - fz);
        if (dd < r + bw) h = levels[i] + (h - levels[i]) * smooth(r, r + bw, dd);
      });
      const edge = Math.hypot(x, z);
      h += smooth(170, 260, edge) * 30 * (0.6 + fbm2(x * 0.03, z * 0.03)); // Hügelkette am Rand
      return h;
    };
  }

  let regolithCanvas = null;
  function regolithTexture() {
    if (!regolithCanvas) { // nahtlos kachelbar (20 Rauschzellen je Kachel), damit man auf dem Boden kein Gitter sieht
      const cv = document.createElement("canvas"); cv.width = cv.height = 256;
      const ctx = cv.getContext("2d"), img = ctx.createImageData(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const n = fbm2p(x * 20 / 256, y * 20 / 256, 20) * 0.6 + hash2(x, y) * 0.4;
        const v = 120 + n * 90, k = (y * 256 + x) * 4;
        img.data[k] = img.data[k + 1] = v; img.data[k + 2] = v + 4; img.data[k + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      regolithCanvas = cv;
    }
    const t = new THREE.CanvasTexture(regolithCanvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 70); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    return t;
  }

  function flagTexture() {
    const cv = document.createElement("canvas"); cv.width = 190; cv.height = 100;
    const x = cv.getContext("2d");
    for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? "#ffffff" : "#b22234"; x.fillRect(0, (i * 100) / 13, 190, 100 / 13 + 1); }
    x.fillStyle = "#3c3b6e"; x.fillRect(0, 0, 76, 54);
    x.fillStyle = "#fff";
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { x.beginPath(); x.arc(7 + c * 12.5, 6 + r * 10.5, 1.8, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
  }

  function footprintTexture() {
    const cv = document.createElement("canvas"); cv.width = 64; cv.height = 128;
    const x = cv.getContext("2d");
    x.fillStyle = "rgba(40,40,44,0.75)";
    x.beginPath(); x.ellipse(32, 64, 22, 56, 0, 0, 7); x.fill();
    x.strokeStyle = "rgba(15,15,18,0.8)"; x.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const y = 20 + i * 10.5; x.beginPath(); x.moveTo(14, y); x.lineTo(50, y); x.stroke(); }
    return new THREE.CanvasTexture(cv);
  }

  function glowTexture(inner, outer) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const x = cv.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(0.3, outer); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }

  function makeAstronaut(accent) {
    const g = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.7 });
    const grey = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.6 });
    const acc = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), roughness: 0.5 });
    const visor = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.9, roughness: 0.15, emissive: 0x3a2a00 });
    const add = (m, x, y, z, parent = g) => { m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
    // Rumpf, Rucksack, Helm (Blickrichtung = +Z)
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.29, 0.72, 16), suit), 0, 1.08, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.1, 16), acc), 0, 1.2, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.26), suit), 0, 1.13, -0.3);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.03), acc), 0, 1.2, 0.32); // Brust-Steuerteil
    add(new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18), suit), 0, 1.66, 0);
    const vis = new THREE.Mesh(new THREE.SphereGeometry(0.275, 24, 16, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.3, Math.PI * 0.38), visor); // Mitte bei +Z = vorn
    vis.rotation.y = 0; add(vis, 0, 1.66, 0.01);
    // Arme & Beine an Gelenken (damit sie schwingen können)
    const limb = (x, y, len, r, mat) => {
      const pivot = new THREE.Group(); pivot.position.set(x, y, 0); g.add(pivot);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, len, 12), mat);
      m.position.y = -len / 2; m.castShadow = true; pivot.add(m);
      return pivot;
    };
    const armL = limb(0.42, 1.38, 0.62, 0.1, suit), armR = limb(-0.42, 1.38, 0.62, 0.1, suit);
    const legL = limb(0.15, 0.74, 0.7, 0.13, suit), legR = limb(-0.15, 0.74, 0.7, 0.13, suit);
    [armL, armR].forEach((a) => { const glove = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), grey); glove.position.y = -0.66; a.add(glove); });
    [legL, legR].forEach((l) => { const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.34), grey); boot.position.set(0, -0.72, 0.05); boot.castShadow = true; l.add(boot); });
    g.userData = { armL, armR, legL, legR };
    return g;
  }

  // ---------- Realistischer Astronaut (glTF-Modell mit Skelett) ----------
  // „Rigged Astronaut“ von J-Toastie (Poly Pizza, CC BY 3.0). Das Modell liegt als Base64 in models/astronaut.js,
  // damit es auch per Doppelklick (file://) und offline funktioniert. Bewegungen berechnen wir selbst am Skelett.
  let modelPromise = null;
  function loadScript(src) {
    return new Promise((res, rej) => { const el = document.createElement("script"); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); });
  }
  function loadAstronautModel() {
    if (modelPromise) return modelPromise;
    modelPromise = (async () => {
      if (!THREE.GLTFLoader) await loadScript("lib/GLTFLoader.js");
      if (!window.ASTRONAUT_GLB) await loadScript("models/astronaut.js");
      const bin = atob(window.ASTRONAUT_GLB), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return await new Promise((res, rej) => new THREE.GLTFLoader().parse(buf.buffer, "", res, rej));
    })().catch((e) => { console.warn("Astronauten-Modell nicht geladen – nehme einfaches Modell", e); return null; });
    return modelPromise;
  }

  // Weitere Astronauten (Mitbewohner der Stationen): Das Modell wird dafür einfach noch einmal eingelesen
  async function loadExtraAstronaut() {
    if (!(await loadAstronautModel())) return null;
    const bin = atob(window.ASTRONAUT_GLB), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Promise((res) => new THREE.GLTFLoader().parse(buf.buffer, "", res, () => res(null)));
  }

  // ---------- Fertige 3D-Modelle: „Space Kit“ von Kenney (CC0), eingebettet in models/spacekit.js ----------
  let kitPromise = null;
  const KIT = {};
  function loadKit() {
    if (kitPromise) return kitPromise;
    kitPromise = (async () => {
      if (!THREE.GLTFLoader) await loadScript("lib/GLTFLoader.js");
      if (!window.SPACEKIT) await loadScript("models/spacekit.js");
      const loader = new THREE.GLTFLoader();
      await Promise.all(Object.entries(window.SPACEKIT).map(([name, b64]) => new Promise((res) => {
        const bin = atob(b64), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        loader.parse(buf.buffer, "", (g) => {
          // Mitte unten auf den Nullpunkt legen, damit man die Modelle einfach auf den Boden stellen kann
          const root = g.scene; root.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new V());
          root.position.set(-c.x, -box.min.y, -c.z);
          const holder = new THREE.Group(); holder.add(root);
          holder.traverse((o) => {
            if (!o.isMesh) return;
            o.castShadow = o.receiveShadow = true;
            // ohne Umgebungs-Spiegelung wirken metallische Flächen fast schwarz → matter machen
            o.material.metalness = Math.min(o.material.metalness, 0.2); o.material.roughness = Math.max(o.material.roughness, 0.55);
            if (/^(rock|meteor)/.test(name) && !o.material.userData.dimmed) { o.material.color.multiplyScalar(0.72); o.material.userData.dimmed = true; } // Felsen etwas dunkler, passend zum Boden
          });
          KIT[name] = holder; res();
        }, () => res());
      })));
      return KIT;
    })().catch((e) => { console.warn("Modelle nicht geladen", e); return KIT; });
    return kitPromise;
  }
  // ---------- Echte NASA-Modelle (NASA 3D Resources): Rover Perseverance, Hubschrauber Ingenuity ----------
  // Sie sind groß und Draco-komprimiert, darum werden sie erst beim ersten Besuch als Datei geladen (danach offline im Speicher).
  const NASA = {};
  const NASA_FILES = { ingenuity: 1.8, perseverance: 3.0 }; // Zielbreite in Metern
  let nasaLoader = null;
  async function loadNasa(names) {
    const todo = names.filter((n) => !(n in NASA));
    if (!todo.length) return;
    if (!THREE.GLTFLoader) await loadScript("lib/GLTFLoader.js");
    if (!THREE.DRACOLoader) await loadScript("lib/DRACOLoader.js");
    if (!nasaLoader) {
      const draco = new THREE.DRACOLoader(); draco.setDecoderPath("lib/draco/");
      nasaLoader = new THREE.GLTFLoader(); nasaLoader.setDRACOLoader(draco);
    }
    await Promise.all(todo.map((name) => new Promise((res) => {
      nasaLoader.load(`models/nasa/${name}.glb`, (g) => {
        const root = g.scene;
        root.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = o.receiveShadow = true;
          const m = o.material;
          // Glas-Effekte der Vorlage brauchen einen teuren Extra-Durchgang – durch einfache Durchsichtigkeit ersetzen
          if (m.transmission > 0) m.transmission = 0; // (sonst wäre z. B. die ganze Habitat-Hülle durchsichtig)
          if (m.clearcoat) m.clearcoat = 0;
          if (m.sheen) m.sheen = 0;
          m.metalness = Math.min(m.metalness, 0.6);
        });
        NASA[name] = g.scene; res();
      }, undefined, () => { NASA[name] = null; res(); }); // ohne Netz oder per Doppelklick geöffnet: dann eben ohne
    })));
  }
  // Mehrere NASA-Teile, die zusammengehören (gleicher Nullpunkt), als ein Objekt: Mitte unten auf 0, gewünschte Breite in Metern
  function nasaModel(parts, width) {
    const g = new THREE.Group(), inner = new THREE.Group();
    for (const p of parts) if (NASA[p]) inner.add(NASA[p].clone());
    if (!inner.children.length) return null;
    g.add(inner); inner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner), size = box.getSize(new V()), c = box.getCenter(new V());
    const k = width / Math.max(size.x, size.z);
    inner.scale.setScalar(k); inner.position.set(-c.x * k, -box.min.y * k, -c.z * k);
    return g;
  }

  // Kopie eines Modells in der gewünschten Größe (Kenney: 1 Einheit ≈ 1 Rasterfeld). Fehlt es, gibt es eine leere Gruppe.
  function kit(name, scale = 4) {
    const src = KIT[name], g = src ? src.clone() : new THREE.Group();
    g.scale.setScalar(scale);
    return g;
  }

  const BONES = {
    hips: "Hips", spine: "Spine", spine2: "Spine2", head: "Head",
    armL: "LeftArm", armR: "RightArm", foreL: "LeftForeArm", foreR: "RightForeArm",
    legL: "LeftUpLeg", legR: "RightUpLeg", kneeL: "LeftLeg", kneeR: "RightLeg"
  };
  function makeModelAstronaut(gltf, accent) {
    const root = gltf.scene;
    const g = new THREE.Group();
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new V());
    const k = 1.85 / size.y; // echte Größe: ca. 1,85 m im Anzug
    root.scale.setScalar(k);
    root.position.y = -box.min.y * k;
    g.add(root);
    const rig = { bones: {}, rest: {} };
    root.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
      if (o.isBone) {
        const short = o.name.replace(/^mixamorig:?/, "");
        for (const [key, name] of Object.entries(BONES)) if (short === name) { rig.bones[key] = o; rig.rest[key] = o.quaternion.clone(); }
      }
      if (o.material && o.material.name === "white") {
        // Anzugstoff: leicht warmes Weiß, matt (wie der echte „Beta-Stoff“ der Apollo-Anzüge)
        o.material.color.set(0xefede6); o.material.roughness = 0.85; o.material.metalness = 0;
      }
      if (o.material && o.material.name === "gray") {
        // Ringe an Schultern, Handgelenken, Knien & Taille → Akzentfarbe (Farbe der eigenen Rakete)
        o.material.roughness = 0.55; rig.accent = o.material;
      }
      if (o.material && /transparent|mask/i.test(o.material.name)) {
        // Goldenes Helmvisier: spiegelnd wie bei echten Raumanzügen
        o.material = new THREE.MeshStandardMaterial({ color: 0xd9a520, metalness: 0.95, roughness: 0.12, emissive: 0x2a1c00 });
      }
    });
    paintSuit(g, rig, accent);
    addSuitParts(g, rig);
    g.userData = { rig };
    return g;
  }

  // Farben nach dem Vorbild der Apollo-Anzüge (z. B. Buzz Aldrin, 1969):
  // gebrochenes Weiß mit Stoff-Falten, dunkle Handschuhe & Stiefel, grauer Mondstaub an den Beinen,
  // farbige Streifen an Oberarmen, Oberschenkeln und Helm (bei Apollo: rot für den Kommandanten).
  function paintSuit(g, rig, accent) {
    const C = (h) => new THREE.Color(h);
    const BASE = C(0xccc6b8), DUST = C(0x66625b), GLOVE = C(0x303236), BOOT = C(0x46474c), SOLE = C(0x222327), RING = C(0x8e9196);
    const tmpC = new THREE.Color();
    g.updateMatrixWorld(true);
    rig.accentVerts = [];
    const whiteMats = new Set();
    g.traverse((o) => {
      if (!o.isSkinnedMesh || !o.material) return;
      if (o.material.name === "gray") { paintGray(o); return; }
      if (o.material.name !== "white") return;
      whiteMats.add(o.material);
      const pos = o.geometry.attributes.position, n = pos.count;
      const col = new Float32Array(n * 3), acc = [];
      const v = new V();
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); // T-Pose, Meter, Blick +Z
        const x = v.x, y = v.y, z = v.z, ax = Math.abs(x);
        // Stoff-Falten: leichte Helligkeitsschwankung
        const fold = 0.8 + 0.2 * noise2(x * 22 + z * 9, y * 22 - z * 7);
        tmpC.copy(BASE).multiplyScalar(fold);
        let isAcc = false;
        if (ax > 0.7 && y > 1.2) tmpC.copy(GLOVE).multiplyScalar(0.9 + 0.2 * fold - 0.1);           // Handschuhe
        else if (y < 0.035) tmpC.copy(SOLE);                                                          // Sohlen
        else if (y < 0.16) tmpC.copy(BOOT).lerp(DUST, 0.35 * fold);                                   // Stiefel, verstaubt
        else {
          if (y < 0.75) tmpC.lerp(DUST, smooth(0.75, 0.15, y) * 0.85);                               // Mondstaub an den Beinen
          if (y > 0.4 && y < 0.58 && z > 0.05) tmpC.lerp(DUST, 0.35);                                 // Knie (vom Hinknien)
          if (y > 1.3 && ax > 0.44 && ax < 0.5) isAcc = true;                                         // Streifen Oberarm
          if (y > 0.6 && y < 0.66 && ax > 0.03 && ax < 0.24) isAcc = true;                            // Streifen Oberschenkel
          if (o.name.startsWith("Helmet") && ax < 0.028 && y > 1.72) isAcc = true;                    // Streifen Helm
        }
        if (isAcc) acc.push(i);
        tmpC.convertSRGBToLinear(); // Vertex-Farben rechnet three.js linear
        col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
      }
      const attr = new THREE.BufferAttribute(col, 3);
      o.geometry.setAttribute("color", attr);
      rig.accentVerts.push({ attr, idx: acc });
    });
    whiteMats.forEach((m) => { m.vertexColors = true; m.color.set(0xffffff); m.roughness = 0.9; m.metalness = 0; m.needsUpdate = true; });
    setSuitAccent(rig, accent);
  }
  // Grauer Modellteil: Hände → dunkle Handschuhe, Rest → metallische Gelenkringe
  function paintGray(o) {
    const pos = o.geometry.attributes.position, n = pos.count, col = new Float32Array(n * 3), v = new V();
    const GLOVE = new THREE.Color(0x303236).convertSRGBToLinear(), RING = new THREE.Color(0x8e9196).convertSRGBToLinear();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      const c = Math.abs(v.x) > 0.66 && v.y > 1.2 ? GLOVE : RING;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    o.geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
    o.material.vertexColors = true; o.material.color.set(0xffffff); o.material.metalness = 0.45; o.material.roughness = 0.45; o.material.needsUpdate = true;
  }
  function setSuitAccent(rig, accent) {
    const c = new THREE.Color(accent).convertSRGBToLinear();
    for (const { attr, idx } of rig.accentVerts || []) {
      for (const i of idx) attr.setXYZ(i, c.r, c.g, c.b);
      attr.needsUpdate = true;
    }
  }

  // Anbauteile an Knochen hängen (bewegen sich mit): Steuerbox, Schlauchanschlüsse, Flagge
  function attachToBone(g, bone, mesh, pos, quat) {
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert();
    mesh.position.copy(pos).applyMatrix4(inv);
    const bq = new THREE.Quaternion(); bone.getWorldQuaternion(bq);
    mesh.quaternion.copy(bq.invert().multiply(quat || new THREE.Quaternion()));
    const bs = new V(); bone.getWorldScale(bs);
    mesh.scale.set(1 / bs.x, 1 / bs.y, 1 / bs.z);
    mesh.castShadow = true;
    bone.add(mesh);
  }
  function addSuitParts(g, rig) {
    const chest = rig.bones.spine2 || rig.bones.spine;
    if (chest) {
      // Steuerbox auf der Brust (bei Apollo: „Remote Control Unit“)
      const box = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.07), new THREE.MeshStandardMaterial({ color: 0xa9adb2, metalness: 0.7, roughness: 0.35 }));
      box.add(body);
      const knobMat = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.5 });
      for (const [kx, ky] of [[-0.06, 0.02], [0, 0.02], [0.06, 0.02], [-0.03, -0.03], [0.03, -0.03]]) {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10), knobMat);
        knob.rotation.x = Math.PI / 2; knob.position.set(kx, ky, 0.04); box.add(knob);
      }
      attachToBone(g, chest, box, new V(0, 1.24, 0.225));
      // Rote und blaue Sauerstoff-Anschlüsse (typisch für die Apollo-Anzüge)
      for (const [cx, color] of [[0.075, 0xc62828], [-0.075, 0x1e5bb8]]) {
        const con = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.05, 16), new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.4 }));
        attachToBone(g, rig.bones.spine || chest, con, new V(cx, 1.04, 0.2), new THREE.Quaternion().setFromAxisAngle(new V(1, 0, 0), Math.PI / 2));
      }
    }
    if (rig.bones.armL) {
      // US-Flagge am linken Oberarm (wie bei den Apollo-Astronauten)
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.07), new THREE.MeshStandardMaterial({ map: flagTexture(), roughness: 0.9, side: THREE.DoubleSide }));
      attachToBone(g, rig.bones.armL, patch, new V(0.36, 1.535, 0.0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2)));
    }
  }

  // Pose am Skelett: Winkel relativ zur Ruhehaltung (T-Pose) in Bone-Achsen
  const qa = new THREE.Quaternion(), AX = { x: new V(1, 0, 0), y: new V(0, 1, 0), z: new V(0, 0, 1) };
  function setBone(rig, key, rx, ry, rz) {
    const b = rig.bones[key]; if (!b) return;
    b.quaternion.copy(rig.rest[key]);
    if (rx) b.quaternion.multiply(qa.setFromAxisAngle(AX.x, rx));
    if (ry) b.quaternion.multiply(qa.setFromAxisAngle(AX.y, ry));
    if (rz) b.quaternion.multiply(qa.setFromAxisAngle(AX.z, rz));
  }
  // Achsen dieses Mixamo-Skeletts (im Browser nachgemessen, Blickrichtung +Z):
  //   Arme senken: +X (beide) · Arme nach vorn: links +Z, rechts −Z · Beine nach vorn: +X
  //   Knie beugen: −X · Ellbogen beugen: links +Z, rechts −Z · Oberkörper vorbeugen: −X
  // fwd = Arm nach vorn drehen, down = absenken, swing = (bei hängendem Arm) um die Querachse der Schulter vor/zurück schwingen
  const ARM_SIDE = { armL: -1, armR: 1 }; // ausgemessen: so schwingt „vor“ wirklich nach vorn
  function setArm(rig, key, fwd, down, swing = 0) {
    const b = rig.bones[key]; if (!b) return;
    b.quaternion.copy(rig.rest[key]).multiply(qa.setFromAxisAngle(AX.z, fwd));
    if (swing) b.quaternion.multiply(qa.setFromAxisAngle(AX.y, swing * ARM_SIDE[key]));
    b.quaternion.multiply(qa.setFromAxisAngle(AX.x, down));
  }
  const POSE = {};
  // Bewegungen nach Vorbild der Apollo-Filme: „Lope“ = gleitender Galopp mit kurzer Schwebephase,
  // Oberkörper leicht vorgebeugt, Arme angewinkelt vor dem Körper (der Anzug ist steif).
  function poseRig(rig, st) {
    const breathe = Math.sin(st.t * 1.4) * 0.015;
    let legL = 0, legR = 0, kneeL = 0, kneeR = 0, down = 1.3, fwd = 0.08, elbow = 0.3, lean = breathe, downL = null, downR = null;
    let swingL = 0, swingR = 0, twist = 0, elbowL = null, elbowR = null; // Armschwung (vor = positiv), Ellbogen einzeln, Drehung des Oberkörpers
    if (st.mode === "climb") {
      // Leiter hochsteigen: Hände und Füße greifen abwechselnd nach oben
      const s = Math.sin(st.phase);
      legL = 0.75 + 0.4 * s; legR = 0.75 - 0.4 * s;
      kneeL = -(0.95 + 0.45 * s); kneeR = -(0.95 - 0.45 * s);
      fwd = 1.3; elbow = 0.5; lean -= 0.06;
      downL = -0.15 - 0.35 * s; downR = -0.15 + 0.35 * s;
    } else if (st.mode === "run") {
      // Laufen: Beine weit vor und zurück, das schwingende Bein beugt das Knie, die Arme schwingen gegengleich (angewinkelt)
      const k = Math.max(0.35, Math.min(1, st.speed)), s = Math.sin(st.phase), c = Math.cos(st.phase);
      legL = s * (0.32 + 0.36 * k); legR = -legL;
      kneeL = -(0.12 + Math.max(0, c) * (0.6 + 0.7 * k)); kneeR = -(0.12 + Math.max(0, -c) * (0.6 + 0.7 * k));
      const sw = 0.6 + 0.4 * k, fs = (x) => (x > 0 ? x * 0.45 : x); // nach vorn schwingt der Arm weniger weit als nach hinten
      swingL = fs(-s * sw); swingR = fs(s * sw); fwd = 0.08;
      down = 1.36; elbow = 0.95 + 0.25 * k; elbowL = elbow + 0.15 * Math.max(0, swingL); elbowR = elbow + 0.15 * Math.max(0, swingR);
      lean -= 0.1 + 0.12 * k; twist = 0.12 * s * k;
    } else if (st.mode === "lope") {
      lean -= 0.2 * st.speed;
      down = 1.18; fwd = 0.25; elbow = 0.8;
      const sa = Math.sin(st.phase); swingL = 0.22 * sa; swingR = -0.22 * sa; // die Arme pendeln mit
      if (st.air) {
        const f = st.airP;                    // 0 → 1 über die Flugphase
        legL = 0.5 - 0.15 * f;  kneeL = -0.15;           // vorderes Bein streckt sich zur Landung
        legR = -0.35 + 0.1 * f; kneeR = -0.6 + 0.2 * f;  // hinteres Bein angewinkelt
        fwd += 0.05 * Math.sin(f * Math.PI);
      } else {
        const c = Math.min(1, st.contact / 0.18);
        legL = 0.35 - 0.45 * c; legR = -0.25 + 0.55 * c;  // Körper schwingt über das Standbein
        const squat = Math.sin(c * Math.PI) * 0.45;       // Abfedern
        kneeL = -squat; kneeR = -squat - 0.2 * (1 - c);
      }
    } else if (st.mode === "walk") {
      // Gehen (st.speed: 1 = zügig, 1,6 m/s): Schrittlänge passt zum Tempo, das Knie beugt sich beim Durchschwingen,
      // der Arm der anderen Seite schwingt mit
      const k = Math.max(0.3, Math.min(1, st.speed)), s = Math.sin(st.phase), c = Math.cos(st.phase);
      legL = s * (0.2 + 0.26 * k); legR = -legL;
      kneeL = -(0.05 + Math.max(0, c) * (0.35 + 0.3 * k)); kneeR = -(0.05 + Math.max(0, -c) * (0.35 + 0.3 * k));
      const sw = 0.2 + 0.3 * k; swingL = -s * sw; swingR = s * sw; fwd = 0.06;
      down = 1.35; elbow = 0.3 + 0.15 * k; lean -= 0.05 * k; twist = 0.07 * s * k;
    } else if (st.mode === "jump") {
      legL = 0.25; legR = 0.1; kneeL = -0.45; kneeR = -0.35;
      down = 0.85; fwd = 0.45; elbow = 0.6; lean -= 0.05;
    }
    if (st.hold) { down = 0.25; fwd = 1.35; elbow = 0.2; } // beide Arme waagerecht nach vorn
    if (st.work) { lean -= 0.35; fwd = 0.9; down = 0.7; elbow = 0.9 + 0.25 * Math.sin(st.t * 3); } // vorgebeugt, arbeitet mit den Händen
    setBone(rig, "legL", legL, 0, 0); setBone(rig, "legR", legR, 0, 0);
    setBone(rig, "kneeL", kneeL, 0, 0); setBone(rig, "kneeR", kneeR, 0, 0);
    setArm(rig, "armL", fwd, downL == null ? down : downL, swingL); setArm(rig, "armR", -fwd, downR == null ? down : downR, swingR);
    setBone(rig, "foreL", 0, 0, elbowL == null ? elbow : elbowL); setBone(rig, "foreR", 0, 0, -(elbowR == null ? elbow : elbowR));
    setBone(rig, "spine", lean, twist, 0);
    if (st.wave) { // rechten Arm hoch und winken
      setArm(rig, "armR", -0.35, -1.2);
      setBone(rig, "foreR", 0, 0, -(0.45 + 0.45 * Math.sin(st.t * 9)));
    }
  }

  function makeLander() {
    const g = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a73a, metalness: 0.75, roughness: 0.35 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.7, 8), gold);
    body.position.y = 2.3; body.castShadow = true; g.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2, 0.25, 8), metal);
    top.position.y = 3.25; g.add(top);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4, fx = Math.cos(a) * 3.4, fz = Math.sin(a) * 3.4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 8), metal);
      leg.position.set(fx * 0.72, 1.3, fz * 0.72);
      leg.lookAt(fx * 0.35, 3, fz * 0.35); leg.rotateX(Math.PI / 2);
      leg.castShadow = true; g.add(leg);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16), metal);
      pad.position.set(fx, 0.05, fz); g.add(pad);
    }
    // Leiter
    for (let i = 0; i < 7; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), metal);
      rung.position.set(2.15, 0.3 + i * 0.3, 0); rung.rotation.y = Math.PI / 2; g.add(rung);
    }
    return g;
  }

  // Einstieg der eigenen Rakete: Leiter und offene Luke (lokal +Z zeigt von der Rakete weg).
  // Sitzt genau zwischen zwei Flossen auf der Sonnenseite (nicht im Schatten der Rakete).
  const HATCH = { a: -Math.PI / 3, x: Math.sin(-Math.PI / 3), z: Math.cos(-Math.PI / 3), y: 3.75 };
  // Rakete als Hindernis: ein Kreis, der auch die Flossen umfasst (die Rakete steht auf ihnen, siehe World.makeRocket) –
  // ein glatter Kreis, damit man beim Vorbeilaufen außen herum gleitet und nicht zwischen Rumpf und Flosse hängen bleibt
  const ROCKET_COLLIDERS = [[0, 0, 2.45]];
  function makeHatch() {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.4 });
    // Offene Luke: aus der Kabine scheint warmes Licht
    const door = new THREE.Mesh(new THREE.CylinderGeometry(1.47, 1.41, 1.9, 12, 1, true, -0.36, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, emissive: 0xfcd34d, emissiveIntensity: 0.9, roughness: 0.6, side: THREE.DoubleSide }));
    door.position.y = HATCH.y + 0.95; g.add(door);
    const step = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.5), metal);
    step.position.set(0, HATCH.y - 0.03, 1.62); step.castShadow = true; g.add(step);
    for (const x of [-0.3, 0.3]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, HATCH.y, 6), metal);
      rail.position.set(x, HATCH.y / 2, 1.8); rail.castShadow = true; g.add(rail);
    }
    for (let y = 0.35; y < HATCH.y; y += 0.34) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.05), metal);
      rung.position.set(0, y, 1.8); g.add(rung);
    }
    g.userData = { door };
    return g;
  }

  function makeFlag() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.7, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    pole.position.y = 1.35; pole.castShadow = true; g.add(pole);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.35, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    rod.rotation.z = Math.PI / 2; rod.position.set(0.67, 2.62, 0); g.add(rod);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85), new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.9 }));
    cloth.position.set(0.68, 2.18, 0); cloth.castShadow = true; g.add(cloth);
    return g;
  }

  function makeTelescope(earthDir) {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5, metalness: 0.4 });
    const white = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), dark);
      leg.position.set(Math.cos(a) * 0.35, 0.7, Math.sin(a) * 0.35); leg.rotation.set(-Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25); // unten auseinander, oben zusammen
      leg.castShadow = true; g.add(leg);
    }
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.3, 16), white);
    tube.position.y = 1.5; tube.castShadow = true;
    tube.quaternion.setFromUnitVectors(new V(0, 1, 0), earthDir.clone().normalize());
    g.add(tube);
    return g;
  }

  // Waage: Trittfläche und Anzeige dahinter (lokal +Z = Blickrichtung des Astronauten, dort steht die Kamera)
  const WEIGH_DIR = new V(SUN_DIR.x, 0, SUN_DIR.z).normalize(); // zur Sonne hin, damit der Astronaut von vorn beleuchtet ist
  function makeScale() {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xaab2bd, metalness: 0.6, roughness: 0.4 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 1.1), metal);
    plate.position.y = 0.03; plate.receiveShadow = true; g.add(plate);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8), metal);
    pole.position.set(0, 1.25, -0.95); pole.castShadow = true; g.add(pole);
    const cv = document.createElement("canvas"); cv.width = 384; cv.height = 160;
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const display = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.62), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    display.position.set(0, 2.55, -0.9); g.add(display);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.72, 0.06), metal);
    back.position.set(0, 2.55, -0.94); back.castShadow = true; g.add(back);
    // Auch von hinten lesbar – je nachdem, von wo man auf die Waage zuläuft
    const display2 = display.clone(); display2.position.z = -0.98; display2.rotation.y = Math.PI; g.add(display2);
    g.userData.show = (text) => {
      const x = cv.getContext("2d");
      x.fillStyle = "#06121c"; x.fillRect(0, 0, 384, 160);
      x.fillStyle = "#5eead4"; x.font = "bold 96px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(text, 192, 86);
      tex.needsUpdate = true;
    };
    g.userData.show("0,0 kg");
    return g;
  }

  // Fundstücke: Laser-Spiegel (steht wirklich seit Apollo 11 auf dem Mond), Wegweiser, Antenne, Mondstein
  function makeReflector() {
    const g = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.6, roughness: 0.4 });
    const panel = new THREE.Group(); panel.position.y = 0.45; panel.rotation.x = -0.9; // schräg nach oben, zur Erde
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.08), frame); box.castShadow = true; panel.add(box);
    const glass = new THREE.MeshStandardMaterial({ color: 0xdbeafe, metalness: 1, roughness: 0.12, emissive: 0x1e3a5f });
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), glass);
      m.position.set(-0.26 + i * 0.13, -0.26 + j * 0.13, 0.042); panel.add(m);
    }
    g.add(panel);
    for (const x of [-0.3, 0.3]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), frame); leg.position.set(x, 0.2, -0.15); g.add(leg); }
    return g;
  }
  function makeSignpost(title, sub) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8), new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.5, roughness: 0.4 }));
    pole.position.y = 1.15; pole.castShadow = true; g.add(pole);
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 160;
    const x = cv.getContext("2d");
    x.fillStyle = "#1d4ed8"; x.fillRect(0, 0, 512, 160);
    x.strokeStyle = "#fff"; x.lineWidth = 8; x.strokeRect(8, 8, 496, 144);
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "bold 58px sans-serif"; x.fillText(title, 256, 54);
    x.font = "bold 44px sans-serif"; x.fillText(sub, 256, 112);
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
    for (const r of [0, Math.PI]) { // beidseitig lesbar
      const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), mat);
      board.position.set(0, 2.0, r ? -0.03 : 0.03); board.rotation.y = r; board.castShadow = true; g.add(board);
    }
    return g;
  }
  function makeAntenna(earthDir) {
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.5, side: THREE.DoubleSide });
    const dark = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.5, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 8), dark);
    pole.position.y = 0.8; pole.castShadow = true; g.add(pole);
    // Schüssel: offene Seite zeigt genau zur Erde
    const head = new THREE.Group(); head.position.y = 1.7;
    head.quaternion.setFromUnitVectors(new V(0, -1, 0), earthDir.clone().normalize());
    const dish = dishCap(PROBE_M, 0.9, 0.75);
    dish.position.y = -0.75; head.add(dish);
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), dark);
    feed.position.y = -0.2; head.add(feed);
    g.add(head);
    return g;
  }
  function makeMoonRock() {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9, flatShading: true }));
    m.scale.set(1.2, 0.8, 1); m.rotation.set(0.4, 0.8, 0.2); m.castShadow = true;
    return m;
  }

  // ---------- Mondstation „Wusstest du?“ ----------
  // Kuppel, Wohnmodul und Sonnensegel – davor eine Wand mit einer Tafel pro Entdeckung.
  // Die Tafeln zeigen erst dann etwas, wenn das Kind die Entdeckung selbst gemacht hat (lokal: Vorderseite = −Z).
  function wrapText(x, text, maxW) {
    const lines = []; let line = "";
    for (const w of text.split(" ")) {
      const t = line ? line + " " + w : w;
      if (line && x.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function drawPanel(cv, d, found) {
    const x = cv.getContext("2d"), W2 = cv.width, H2 = cv.height;
    x.fillStyle = found ? "#0b2a4a" : "#111827"; x.fillRect(0, 0, W2, H2);
    x.strokeStyle = found ? "#fcd34d" : "#374151"; x.lineWidth = 8; x.strokeRect(4, 4, W2 - 8, H2 - 8);
    x.textBaseline = "alphabetic";
    if (!found) {
      x.textAlign = "center"; x.fillStyle = "#4b5563";
      x.font = "bold 130px sans-serif"; x.fillText("?", W2 / 2, 150);
      x.font = "26px sans-serif"; x.fillText("Noch nicht entdeckt", W2 / 2, 210);
      return;
    }
    // Nur Bild und Überschrift – groß genug, um sie im Vorbeilaufen zu erkennen. Den Text dazu gibt es per Knopf an der Wand.
    x.textAlign = "center";
    x.font = "96px sans-serif"; x.fillStyle = "#fff"; x.fillText(d.icon, W2 / 2, 112);
    x.font = "bold 46px sans-serif"; x.fillStyle = "#fde68a";
    const lines = wrapText(x, d.title, W2 - 40).slice(0, 2);
    lines.forEach((l, i) => x.fillText(l, W2 / 2, (lines.length > 1 ? 172 : 196) + i * 50));
  }
  // ---------- Marskolonie hinter der Tafelwand (lokal: Vorderseite = −Z) ----------
  // Runde, bunte Bauten statt grauer Kisten: eine große Glaskuppel mit Garten, zwei Wohntürme mit leuchtenden
  // Bullaugen und Luftschleuse, Verbindungsröhren, Gewächshaus, drehende Antennenschüssel, Sonnenkollektoren, Kisten, Lampen.
  const srgb = (h) => new THREE.Color(h).convertSRGBToLinear(); // Farben wie im Malprogramm (sonst wirken sie blass)
  // Farbwelt je Ort: Spiegelung (Himmel oben, Horizont, Boden), zwei Akzentfarben (a, b) und die Farbe der Außenhaut
  const PAL = {
    mars:   { env: [0xf0d2ae, 0xdca679, 0x6e3a24], a: 0xc84a12, b: 0x0d9488, hull: "#f5f2ec" },
    mond:   { env: [0x0a0b10, 0x3a3a3e, 0x8a8883], a: 0x1d4ed8, b: 0xf59e0b, hull: "#eef0f3" },
    merkur: { env: [0x07070a, 0x4a4540, 0x8f877c], a: 0xb45309, b: 0x475569, hull: "#f4f1ea" },
    venus:  { env: [0xe8b25a, 0xc98a3a, 0x4a3420], a: 0x7c2d12, b: 0x0f766e, hull: "#d9d4c7" },
    erde:   { env: [0x9fd0f5, 0xd8ecf8, 0x4f7a3a], a: 0x2563eb, b: 0x16a34a, hull: "#fafaf7" },
    pluto:  { env: [0x05070d, 0x2b3550, 0xb8b0a4], a: 0x6d28d9, b: 0xf59e0b, hull: "#eef2f7" }
  };
  const envCache = {};
  function envFor(key) { // weiche Spiegelung von Himmel und Boden – ohne sie wirken glatte Flächen stumpf
    if (envCache[key]) return envCache[key];
    const [ct, ch, cb] = PAL[key].env;
    const s = new THREE.Scene(), geo = new THREE.SphereGeometry(10, 32, 16), p = geo.attributes.position, col = [];
    const top = new THREE.Color(ct), hor = new THREE.Color(ch), bot = new THREE.Color(cb), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 10;
      if (y > 0) c.copy(hor).lerp(top, Math.min(1, y * 1.5)); else c.copy(hor).lerp(bot, Math.min(1, -y * 4));
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 4) }));
    sun.position.copy(SUN_DIR).multiplyScalar(9); s.add(sun);
    const pm = new THREE.PMREMGenerator(W.renderer);
    envCache[key] = pm.fromScene(s, 0.02).texture; pm.dispose();
    return envCache[key];
  }  function canvasTex(w, h, draw) {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    draw(cv.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    return t;
  }
  // Außenhaut: helle Platten mit feinen Fugen und Nieten, damit die Wände nicht wie glattes Plastik aussehen
  function hullTex(rx, ry, base = "#f5f2ec") {
    const t = canvasTex(256, 256, (x) => {
      x.fillStyle = base; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { // Platten leicht unterschiedlich hell
        x.fillStyle = `rgba(0,0,0,${0.015 + ((i * 7 + j * 3) % 5) * 0.01})`; x.fillRect(i * 64 + (j ? 32 : 0), j * 128, 64, 128);
      }
      x.strokeStyle = "rgba(60,50,40,0.28)"; x.lineWidth = 2;
      for (let j = 0; j <= 2; j++) { x.beginPath(); x.moveTo(0, j * 128); x.lineTo(256, j * 128); x.stroke(); }
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const px = i * 64 + (j ? 32 : 0); x.beginPath(); x.moveTo(px, j * 128); x.lineTo(px, j * 128 + 128); x.stroke(); }
      x.fillStyle = "rgba(60,50,40,0.3)";
      for (let i = 0; i < 16; i++) for (const y of [6, 122, 134, 250]) { x.beginPath(); x.arc(i * 16 + 8, y, 1.6, 0, 7); x.fill(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    return t;
  }
  // Materialien eines Ortes. orange/teal heißen so wegen des Mars – gemeint sind Akzentfarbe a und b der Farbwelt.
  const matCache = {};
  function colonyMats(key = "mars") {
    if (matCache[key]) return matCache[key];
    const P = PAL[key], env = envFor(key);
    const std = (o) => new THREE.MeshStandardMaterial({ envMap: env, envMapIntensity: 0.9, ...o });
    return (matCache[key] = {
      env, std, P, key,
      hull: (rx, ry) => std({ map: hullTex(rx, ry, P.hull), roughness: 0.42, metalness: 0.05 }),
      orange: std({ color: srgb(P.a), roughness: 0.4, envMapIntensity: 0.4 }), teal: std({ color: srgb(P.b), roughness: 0.38, envMapIntensity: 0.45 }),
      metal: std({ color: srgb(0x3b4553), roughness: 0.32, metalness: 0.75 }), steel: std({ color: srgb(0xc7cdd6), roughness: 0.28, metalness: 0.85 }),
      glow: new THREE.MeshStandardMaterial({ color: srgb(0x2a1600), emissive: srgb(0xffc46b), emissiveIntensity: 1.4 }),
      glowBlue: new THREE.MeshStandardMaterial({ color: srgb(0x06202e), emissive: srgb(0x7dd3fc), emissiveIntensity: 1.1 }),
      glass: std({ color: srgb(0xcfeeff), transparent: true, opacity: 0.12, roughness: 0.03, metalness: 0.5, envMapIntensity: 1, depthWrite: false })
    });
  }
  const put = (parent, m, x, y, z, shadow = true) => { m.position.set(x, y, z); m.castShadow = shadow; parent.add(m); return m; };
  const blinkLamp = (parent, color, x, y, z) => put(parent, new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color, toneMapped: false })), x, y, z, false);

  function buildMarsCamp(g, add) {
    const M = colonyMats();
    g.userData.turn = [];
    // große Glaskuppel mit Garten in der Mitte, dahinter und daneben der Rest
    const [DX, DZ] = MARS_DOME, R = MARS_DOME[2];
    colonyDome(g, M, DX, DZ, R);
    const mods = [[-MARS_TOWER[0], MARS_TOWER[1], "WOHNEN", "#c84a12", "🛏️"], [MARS_TOWER[0], MARS_TOWER[1], "LABOR", "#0d9488", "🔬"]];
    for (const [x, z, label, color, icon] of mods) {
      const face = Math.atan2(x * 0.35 - x, -6 - z); // schaut schräg zum Platz vor der Tafelwand
      g.userData.blink.push(colonyTower(g, M, x, z, TOWER_R, 4.6, face, label, color, icon));
      colonyTube(g, M, DX, DZ, R - 0.3, x, z, 3.2);
    }
    // Vordächer an den Türmen: links der Gesundheits-Check mit der Waage, rechts das Proben-Labor mit dem Magnet-Versuch
    healthCorner(colonyAwning(g, M, -MARS_TOWER[0], MARS_TOWER[1], WEIGH_DIR, TOWER_R, "❤️ GESUNDHEITS-CHECK", "#c84a12"), M, TOWER_R);
    labCorner(colonyAwning(g, M, MARS_TOWER[0], MARS_TOWER[1], LAB_DIR, TOWER_R, "🔬 PROBEN-LABOR", "#0d9488"), M, TOWER_R);
    colonyMoxie(g, M, -17.5, 24.5, Math.atan2(-16.5, -8.5));
    g.userData.turn.push(colonyDish(g, M, 15, 25));
    colonyPanels(g, M, [[21, 3.5, -0.5], [23.3, 7.5, -0.5], [25.6, 11.5, -0.5]]);
    // Kisten, Lampen und eine Flagge – kleine Dinge, die das Lager bewohnt wirken lassen
    for (const [x, z, s, c, r, y] of [[-22.8, 21.2, 1.1, M.orange, 0.3, 0], [-21.4, 19.9, 0.9, M.teal, -0.2, 0], [-22.7, 21.1, 0.8, M.teal, 0.9, 1.1],
      [20, 17.5, 1.1, M.orange, 0.6, 0], [18.8, 18.9, 0.8, M.teal, 0.1, 0]]) colonyCrate(g, M, x, z, s, c, r, y);
    for (const [x, z] of [[-9.5, 3], [9.5, 3]]) colonyLamp(g, M, x, z);
    colonyFlag(g, M, -8.4, 5.5);
  }
  const TOWER_R = 3.4, LAB_DIR = new V(-0.968, 0, -0.25).normalize(); // Richtung vom Labor-Turm zum Vordach
  // Hindernisse der Kolonie (Weltkoordinaten)
  const MARS_DOME = [0, 20, 9], MARS_TOWER = [16, 12]; // Kuppel (x, z, Radius), rechter Turm (der linke gespiegelt)
  function marsCampColliders([sx, sz]) {
    const [DX, DZ, R] = MARS_DOME, [TX, TZ] = MARS_TOWER;
    const c = [[sx + DX, sz + DZ, R + 0.4], [sx - TX, sz + TZ, TOWER_R + 1.5], [sx + TX, sz + TZ, TOWER_R + 1.5], [sx - 17.5, sz + 24.5, 1.7], [sx - 15.7, sz + 25.4, 1.7],
      [sx + 15, sz + 25, 1.4], [sx + 21, sz + 3.5, 0.6], [sx + 23.3, sz + 7.5, 0.6], [sx + 25.6, sz + 11.5, 0.6],
      [sx - 22.3, sz + 20.7, 1.3], [sx + 19.5, sz + 18.2, 1.2], [sx - 8.4, sz + 5.5, 0.25]];
    for (const [x, z] of [[-9.5, 3], [9.5, 3]]) c.push([sx + x, sz + z, 0.3]);
    for (const [tx, d] of [[-TX, WEIGH_DIR], [TX, LAB_DIR]]) { // Stützen der Vordächer
      const px = -d.z, pz = d.x, zz = TOWER_R + 2.95;
      for (const s of [-1.75, 1.75]) c.push([sx + tx + d.x * zz + px * s, sz + TZ + d.z * zz + pz * s, 0.25]);
    }
    for (const e of [-1, 1]) { // Luftschleusen und Röhren
      const x = e * TX, z = TZ, face = Math.atan2(x * 0.35 - x, -6 - z);
      c.push([sx + x + Math.sin(face) * 4.3, sz + z + Math.cos(face) * 4.3, 1.3]);
      for (const f of [0.55, 0.7, 0.85]) c.push([sx + DX + (x - DX) * f, sz + DZ + (z - DZ) * f, 1.2]);
    }
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx + x, sz + 0.1, 1]); // Tafelwand
    return c;
  }
  // Glaskuppel: Streben im Dreiecksmuster, oranger Sockel, drinnen Wiese, Bäume, Blumen, ein Teich und warmes Licht
  function colonyDome(g, M, cx, cz, R) {
    const d = new THREE.Group(); d.position.set(cx, 0, cz); g.add(d);
    const H = 3.4; // Sockelring, auf dem die Kuppel sitzt – so ragt sie über die Tafelwand hinaus
    put(d, new THREE.Mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.5, H, 64), M.hull(14, 1)), 0, H / 2, 0).receiveShadow = true;
    put(d, new THREE.Mesh(new THREE.CylinderGeometry(R + 0.33, R + 0.33, 0.3, 64, 1, true), M.orange), 0, H - 0.2, 0, false);
    put(d, new THREE.Mesh(new THREE.CylinderGeometry(R + 0.5, R + 0.55, 0.3, 64, 1, true), M.teal), 0, 0.2, 0, false);
    const pane = new THREE.CircleGeometry(0.34, 20), ring = new THREE.TorusGeometry(0.36, 0.07, 8, 20);
    const skip = [Math.PI, Math.atan2(MARS_TOWER[0] - cx, MARS_TOWER[1] - cz), Math.atan2(-MARS_TOWER[0] - cx, MARS_TOWER[1] - cz)];
    for (let i = 0; i < 28; i++) { // Fensterreihe im Sockel (nicht dort, wo Tür und Röhren sind)
      const a = (i / 28) * Math.PI * 2;
      if (skip.some((s) => Math.abs(Math.atan2(Math.sin(a - s), Math.cos(a - s))) < 0.3)) continue;
      const px = Math.sin(a) * (R + 0.42), pz = Math.cos(a) * (R + 0.42);
      put(d, new THREE.Mesh(pane, M.glow), px, 1.4, pz, false).rotation.y = a;
      put(d, new THREE.Mesh(ring, M.metal), px, 1.4, pz, false).rotation.y = a;
    }
    const glass = put(d, new THREE.Mesh(new THREE.SphereGeometry(R, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.glass), 0, H, 0, false);
    glass.renderOrder = 2;
    // Streben: Ringe in mehreren Höhen, dazwischen Diagonalen (wie eine echte Gitterkuppel)
    const rings = 5, n = 22, pts = [];
    for (let k = 0; k <= rings; k++) {
      const el = (k / (rings + 1)) * Math.PI / 2, row = [];
      for (let i = 0; i < n; i++) { const a = ((i + (k % 2) * 0.5) / n) * Math.PI * 2; row.push(new V(Math.cos(el) * Math.sin(a) * R, H + Math.sin(el) * R, Math.cos(el) * Math.cos(a) * R)); }
      pts.push(row);
    }
    const top = new V(0, H + R, 0), edges = [];
    for (let k = 0; k <= rings; k++) for (let i = 0; i < n; i++) {
      const a = pts[k][i];
      edges.push([a, pts[k][(i + 1) % n]]);
      if (k < rings) { edges.push([a, pts[k + 1][i]]); edges.push([a, pts[k + 1][(i + n - 1 + (k % 2) * 2) % n]]); }
      else edges.push([a, top]);
    }
    const bar = new THREE.CylinderGeometry(0.08, 0.08, 1, 6), inst = new THREE.InstancedMesh(bar, M.steel, edges.length);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new V(0, 1, 0), sc = new V(), mid = new V();
    edges.forEach(([a, b], i) => {
      const dv = b.clone().sub(a); q.setFromUnitVectors(up, dv.clone().normalize()); sc.set(1, dv.length(), 1);
      mx.compose(mid.copy(a).add(b).multiplyScalar(0.5), q, sc); inst.setMatrixAt(i, mx);
    });
    inst.castShadow = true; d.add(inst);
    put(d, new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10), M.orange), 0, H + R, 0); // Kappe oben
    g.userData.blink.push(blinkLamp(d, 0xff3b30, 0, H + R + 0.6, 0));
    // Drinnen: Pflanzenregale unter rosa-lila LED-Lampen (so wachsen Pflanzen auch ohne viel Sonne – wie im Test-Gewächshaus EDEN ISS)
    const y0 = H + 0.02;
    put(d, new THREE.Mesh(new THREE.CircleGeometry(R - 0.05, 48), M.std({ color: srgb(0xd6d3d1), roughness: 0.7 })), 0, y0, 0, false).rotation.x = -Math.PI / 2;
    const white = M.std({ color: srgb(0xf1f5f9), roughness: 0.5 }), led = new THREE.MeshBasicMaterial({ color: srgb(0xff4fd8), toneMapped: false });
    const rows = [-4.8, -1.6, 1.6, 4.8].map((z) => [z, Math.sqrt(R * R - z * z) - 1.6]);
    const count = rows.reduce((s, [, h]) => s + 3 * Math.floor((2 * h) / 0.42), 0);
    const plants = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), count);
    const pm = new THREE.Matrix4(), greens = [0x3f9e3a, 0x58b947, 0x2f7d32, 0x7cc242].map(srgb), tomato = srgb(0xef4444);
    let pi = 0;
    for (const [z, half] of rows) {
      for (const x of [-half, half]) put(d, new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.6, 0.7), white), x, y0 + 1.3, z);
      [0.45, 1.2, 1.95].forEach((sy, j) => {
        put(d, new THREE.Mesh(new THREE.BoxGeometry(2 * half, 0.07, 0.7), white), 0, y0 + sy, z);
        put(d, new THREE.Mesh(new THREE.BoxGeometry(2 * half, 0.04, 0.12), led), 0, y0 + sy + 0.62, z, false);
        const k = Math.floor((2 * half) / 0.42);
        for (let i = 0; i < k; i++) {
          const x = -half + 0.21 + i * 0.42, s = 0.8 + hash2(i, j + z) * 0.4;
          pm.makeScale(s, s * 0.65, s).setPosition(x, y0 + sy + 0.16, z); plants.setMatrixAt(pi, pm);
          plants.setColorAt(pi, j === 2 && i % 3 === 0 ? tomato : greens[(i + j) % 4]); pi++;
        }
      });
    }
    plants.castShadow = false; d.add(plants);
    const glow = new THREE.PointLight(0xff7ad9, 0.7, R * 1.6, 1.5); glow.position.set(0, H + 3, 0); d.add(glow);
    const signArc = 0.5; // Schild über dem Eingang
    put(d, new THREE.Mesh(new THREE.CylinderGeometry(R + 0.36, R + 0.36, 0.6, 24, 1, true, Math.PI - signArc / 2, signArc), signMat("🌱 GEWÄCHSHAUS", "#15803d", 512, 90, 52)), 0, 2.75, 0, false);
    // Eingang zur Tafelwand hin
    const door = new THREE.Group(); door.position.set(0, 0, -R - 0.2); d.add(door);
    put(door, new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 1.4), M.hull(2, 1)), 0, 1.25, 0);
    put(door, new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.25, 1.45), M.orange), 0, 2.5, 0);
    put(door, new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2), M.glowBlue), 0, 1.05, -0.71, false).rotation.y = Math.PI;
  }
  // Wohnturm: runde Wand mit Plattenmuster, farbige Streifen, leuchtende Bullaugen, Kuppeldach, Luftschleuse mit Rundtür und Namensschild
  function colonyTower(g, M, x, z, r, h, face, label, color, icon) {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = face; g.add(t);
    const accent = M.std({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.38, envMapIntensity: 0.45 });
    put(t, new THREE.Mesh(new THREE.CylinderGeometry(r + 0.2, r + 0.45, 0.5, 48), M.metal), 0, 0.25, 0);
    put(t, new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), M.hull(8, 2)), 0, 0.5 + h / 2, 0).receiveShadow = true;
    put(t, new THREE.Mesh(new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.45, 48, 1, true), accent), 0, 1.75, 0, false);
    // Schutzwall aus Marsboden rund um den Turm: dicker Boden hält Strahlung aus dem All ab
    const berm = put(t, new THREE.Mesh(new THREE.CylinderGeometry(r + 0.12, r + 1.5, 1.2, 48, 3), new THREE.MeshStandardMaterial({ color: 0x8e4c30, map: regolithTexture(), roughness: 1 })), 0, 0.6, 0);
    berm.receiveShadow = true;
    put(t, new THREE.Mesh(new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.18, 48, 1, true), accent), 0, h + 0.2, 0, false);
    const roof = put(t, new THREE.Mesh(new THREE.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.hull(8, 1)), 0, h + 0.5, 0);
    roof.scale.y = 0.5;
    // Bullaugen rundherum
    const wy = 0.5 + h * 0.68, ring = new THREE.TorusGeometry(0.44, 0.08, 8, 24), pane = new THREE.CircleGeometry(0.42, 24);
    for (let i = 0; i < 9; i++) {
      const a = (i - 4) * 0.62; if (i === 4) continue; // vorne ist das Schild
      const px = Math.sin(a) * (r + 0.02), pz = Math.cos(a) * (r + 0.02);
      put(t, new THREE.Mesh(pane, M.glow), px, wy, pz, false).rotation.y = a;
      put(t, new THREE.Mesh(ring, M.metal), px, wy, pz, false).rotation.y = a;
    }
    // Namensschild, gebogen wie die Wand
    const sign = canvasTex(512, 128, (c) => {
      c.fillStyle = color; c.fillRect(0, 0, 512, 128);
      c.fillStyle = "#fff"; c.font = "bold 76px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(`${icon} ${label}`, 256, 68);
    });
    const arc = 0.9;
    put(t, new THREE.Mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.75, 32, 1, true, -arc / 2, arc), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.5 })), 0, wy + 0.05, 0, false);
    // Luftschleuse: kurze Röhre nach vorn mit runder Tür (gelb-schwarzer Rand, Fenster in der Mitte)
    const lock = new THREE.Group(); lock.position.set(0, 0, r - 0.2); t.add(lock);
    const tube = put(lock, new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.6, 32), M.hull(3, 1)), 0, 1.35, 0.8); tube.rotation.x = Math.PI / 2;
    put(lock, new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.14, 10, 32), accent), 0, 1.35, 1.6);
    const hatch = canvasTex(256, 256, (c) => {
      c.fillStyle = "#1f2937"; c.beginPath(); c.arc(128, 128, 128, 0, 7); c.fill();
      for (let i = 0; i < 20; i++) { c.fillStyle = i % 2 ? "#111" : "#facc15"; c.beginPath(); c.moveTo(128, 128); c.arc(128, 128, 126, i * Math.PI / 10, (i + 1) * Math.PI / 10); c.fill(); }
      c.fillStyle = "#4b5563"; c.beginPath(); c.arc(128, 128, 104, 0, 7); c.fill();
      c.strokeStyle = "#9ca3af"; c.lineWidth = 6; c.beginPath(); c.arc(128, 128, 76, 0, 7); c.stroke();
      c.fillStyle = "#7dd3fc"; c.beginPath(); c.arc(128, 104, 30, 0, 7); c.fill();
      c.fillStyle = "#e5e7eb"; c.fillRect(88, 160, 80, 12);
    });
    put(lock, new THREE.Mesh(new THREE.CircleGeometry(1.02, 32), new THREE.MeshStandardMaterial({ map: hatch, roughness: 0.5, metalness: 0.2 })), 0, 1.35, 1.62, false);
    put(lock, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 1), M.metal), 0, 0.09, 2.1); // Stufe
    const green = blinkLamp(lock, 0x4ade80, 0, 2.75, 1.45);
    // Dach: kleine Antenne mit rotem Licht
    put(t, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), M.steel), 0.8, h + 0.5 + r * 0.45 + 0.6, 0);
    blinkLamp(t, 0xff3b30, 0.8, h + 0.5 + r * 0.45 + 1.45, 0);
    return green;
  }
  // Verbindungsröhre zwischen Kuppel und Turm mit Ringen und kleinen Fenstern
  function colonyTube(g, M, ax, az, ra, bx, bz, rb) {
    const dir = new V(bx - ax, 0, bz - az), len = dir.length(); dir.normalize();
    const a = new V(ax, 1.5, az).addScaledVector(dir, ra), b = new V(bx, 1.5, bz).addScaledVector(dir, -rb), L = a.distanceTo(b);
    const t = new THREE.Group(); t.position.copy(a).add(b).multiplyScalar(0.5); t.rotation.y = Math.atan2(dir.x, dir.z); g.add(t);
    const body = put(t, new THREE.Mesh(new THREE.CylinderGeometry(1, 1, L + 0.6, 32), M.hull(4, 1)), 0, 0, 0); body.rotation.x = Math.PI / 2;
    const ring = new THREE.TorusGeometry(1.06, 0.1, 8, 32);
    for (let i = 0; i < 4; i++) put(t, new THREE.Mesh(ring, M.orange), 0, 0, -L / 2 + (i + 0.5) * (L / 4), false);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { // Fensterreihe links und rechts
      const w = put(t, new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), M.glow), side * 1.01, 0.25, -L / 2 + (i + 1) * (L / 4), false);
      w.rotation.y = side * Math.PI / 2;
    }
    for (const f of [-0.35, 0.35]) put(t, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 0.4), M.metal), 0, -1.2, f * L); // Stützen
    return len;
  }

  // Große Antennenschüssel, die sich langsam dreht (liefert den drehenden Kopf zurück)
  function colonyDish(g, M, x, z) {
    const base = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 1, 24), M.hull(3, 0.5)), x, 0.5, z);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 3, 16), M.steel), x, 2.5, z);
    const head = new THREE.Group(); head.position.set(x, 4, z); head.scale.setScalar(1.35); g.add(head);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.8), M.orange), 0, 0, 0);
    const tilt = new THREE.Group(); tilt.rotation.x = -0.75; head.add(tilt);
    const white = M.std({ color: srgb(0xf8fafc), roughness: 0.35, side: THREE.DoubleSide });
    // Kugelkappe umgedreht: Rand bei y = 0, tiefste Stelle 0,56 m darunter – die Schüssel öffnet nach oben
    put(tilt, dishCap(M, 3, 0.62), 0, 2.44, 0).rotation.x = Math.PI;
    const up = new V(0, 1, 0), tip = new V(0, 1.15, 0);
    for (let i = 0; i < 3; i++) { // drei Streben vom Rand zum Empfänger
      const a = i * Math.PI * 2 / 3, foot = new V(Math.sin(a) * 1.6, -0.08, Math.cos(a) * 1.6), dv = tip.clone().sub(foot);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, dv.length(), 5), M.steel);
      s.position.copy(foot).addScaledVector(dv, 0.5); s.quaternion.setFromUnitVectors(up, dv.normalize()); tilt.add(s);
    }
    put(tilt, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.45, 12), M.metal), 0, 1.3, 0);
    g.userData.blink.push(blinkLamp(tilt, 0xff3b30, 0, 1.65, 0));
    base.receiveShadow = true;
    return head;
  }
  function colonyPanels(g, M, spots) {
    const cells = canvasTex(256, 128, (c) => {
      c.fillStyle = "#0f2a6b"; c.fillRect(0, 0, 256, 128);
      const grd = c.createLinearGradient(0, 0, 256, 128); grd.addColorStop(0, "rgba(120,170,255,0.25)"); grd.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = grd; c.fillRect(0, 0, 256, 128);
      c.strokeStyle = "#c7d2fe"; c.lineWidth = 2;
      for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, 128); c.stroke(); }
      for (let j = 0; j <= 4; j++) { c.beginPath(); c.moveTo(0, j * 32); c.lineTo(256, j * 32); c.stroke(); }
    });
    const cellMat = M.std({ map: cells, roughness: 0.2, metalness: 0.4, envMapIntensity: 1.3 });
    for (const [x, z, ry] of spots) {
      const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
      put(p, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 8), M.steel), 0, 0.7, 0);
      const panel = new THREE.Group(); panel.position.y = 1.45; panel.rotation.x = -0.7; p.add(panel);
      put(panel, new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.6), M.steel), 0, 0, 0);
      put(panel, new THREE.Mesh(new THREE.PlaneGeometry(2.45, 1.45), cellMat), 0, 0.045, 0, false).rotation.x = -Math.PI / 2;
    }
  }
  // Kiste mit abgerundeten Kanten und Streifen
  function colonyCrate(g, M, x, z, s, mat, ry, y) {
    const shape = new THREE.Shape(), r = 0.12, w = 1, h = 1;
    shape.moveTo(-w / 2 + r, -h / 2); shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.84, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3, curveSegments: 4 });
    geo.translate(0, 0, -0.42);
    const c = new THREE.Group(); c.position.set(x, y, z); c.rotation.y = ry; c.scale.setScalar(s); g.add(c);
    put(c, new THREE.Mesh(geo, mat), 0, 0.56, 0).receiveShadow = true;
    for (const dx of [-0.3, 0.3]) put(c, new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.06, 1.08), M.metal), dx, 0.56, 0, false);
  }
  function colonyLamp(g, M, x, z) {
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.6, 8), M.metal), x, 1.3, z);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), new THREE.MeshBasicMaterial({ color: srgb(0xffe2a8), toneMapped: false })), x, 2.75, z, false);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.2, 0.12, 16), M.metal), x, 2.98, z);
  }
  function colonyFlag(g, M, x, z) {
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 8), M.steel), x, 2.1, z);
    const tex = canvasTex(256, 160, (c) => {
      c.fillStyle = "#f97316"; c.fillRect(0, 0, 256, 160);
      c.fillStyle = "#0fa3a3"; c.fillRect(0, 110, 256, 50);
      c.fillStyle = "#fff"; c.beginPath(); c.arc(92, 62, 34, 0, 7); c.fill();
      c.fillStyle = "#c2410c"; c.beginPath(); c.arc(92, 62, 26, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.font = "bold 40px sans-serif"; c.textBaseline = "middle"; c.fillText("★", 150, 62);
    });
    const flag = put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1, 8, 1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 })), x + 0.82, 3.6, z, false);
    const p = flag.geometry.attributes.position; // leicht gewellt
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + 0.8) * 3) * 0.08 * (p.getX(i) + 0.8));
    flag.geometry.computeVertexNormals();
  }

  const CAMPS = { mars: buildMarsCamp, mond: buildMoonCamp, merkur: buildMercCamp, venus: buildVenusCamp, pluto: buildPlutoCamp, erde: buildEarthCamp };
  const CAMP_COLLIDERS = { mars: marsCampColliders, mond: moonCampColliders, merkur: mercCampColliders, venus: venusCampColliders, pluto: plutoCampColliders, erde: earthCampColliders };
  function makeStation(discoveries, name, style = "") {
    const g = new THREE.Group();
    const hull = new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.6, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.5, metalness: 0.4 });
    const lit = new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: 0xfde68a, emissiveIntensity: 0.8 });
    const add = (m, x, y, z, shadow = true) => { m.position.set(x, y, z); m.castShadow = shadow; g.add(m); return m; };
    g.userData.blink = [];
    if (CAMPS[style]) CAMPS[style](g, add, hull, dark, lit);
    else {
      // Kuppel hinter der Wand
      add(new THREE.Mesh(new THREE.SphereGeometry(6, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), hull), 0, 0, 7.5).receiveShadow = true;
      add(new THREE.Mesh(new THREE.CylinderGeometry(6.15, 6.3, 0.5, 32), dark), 0, 0.25, 7.5, false);
      // Wohnmodul: liegende Röhre mit leuchtenden Fenstern
      add(new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 20), hull), -10.5, 2, 6.5).rotation.z = Math.PI / 2;
      for (const e of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(2, 20, 12), hull), -10.5 + e * 4, 2, 6.5);
      for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), lit), -13.2 + i * 1.8, 2.3, 4.49, false).rotation.y = Math.PI;
      // Sonnensegel
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), dark), 11, 1.5, 6);
      const sail = add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.08, 2.4), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.25 })), 11, 3.1, 6);
      sail.rotation.x = -0.9; // zur Sonne geneigt
    }
    // Wand mit Schild
    if (CAMPS[style]) { // Tafelwand passend zur Station: helle Platten, farbiger Rahmen
      const M = colonyMats(style);
      add(new THREE.Mesh(new THREE.BoxGeometry(15.6, 3.7, 0.3), M.hull(6, 1.5)), 0, 1.85, 0).receiveShadow = true;
      for (const [w, h, x, y] of [[16, 0.25, 0, 3.75], [16, 0.25, 0, 0.1], [0.25, 3.9, -7.9, 1.9], [0.25, 3.9, 7.9, 1.9]]) add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.42), M.orange), x, y, 0);
    } else add(new THREE.Mesh(new THREE.BoxGeometry(15.6, 3.7, 0.3), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 })), 0, 1.85, 0).receiveShadow = true;
    for (const px of [-4.6, 4.6]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 8), dark), px, 4.2, 0);
    const sv = document.createElement("canvas"); sv.width = 1024; sv.height = 200;
    const sx = sv.getContext("2d");
    sx.fillStyle = "#7c3aed"; sx.fillRect(0, 0, 1024, 200);
    sx.strokeStyle = "#fde68a"; sx.lineWidth = 10; sx.strokeRect(8, 8, 1008, 184);
    sx.fillStyle = "#fff"; sx.textAlign = "center"; sx.textBaseline = "middle";
    sx.font = "bold 110px sans-serif"; sx.fillText("Wusstest du?", 512, 86);
    sx.font = "bold 34px sans-serif"; sx.fillStyle = "#fde68a"; sx.fillText(`${name.toUpperCase()} · DEINE ENTDECKUNGEN`, 512, 166);
    const signTex = new THREE.CanvasTexture(sv); signTex.encoding = THREE.sRGBEncoding; signTex.anisotropy = 4;
    add(new THREE.Mesh(new THREE.BoxGeometry(10.4, 2.2, 0.12), dark), 0, 5.4, 0);
    add(new THREE.Mesh(new THREE.PlaneGeometry(10.2, 2), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })), 0, 5.4, -0.07, false).rotation.y = Math.PI;
    // Tafeln: obere Reihe die ersten fünf, untere Reihe die nächsten fünf (von vorn gelesen: links → rechts)
    const one = discoveries.length <= 5; // eine Reihe: größer und mittig
    const panels = discoveries.map((d, i) => {
      const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256;
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      add(new THREE.Mesh(new THREE.PlaneGeometry(one ? 2.9 : 2.8, one ? 1.45 : 1.4), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })),
        (one ? (discoveries.length - 1) / 2 - i : 2 - (i % 5)) * 3, one ? 1.95 : i < 5 ? 2.75 : 1.15, -0.16, false).rotation.y = Math.PI;
      return { d, cv, tex, state: null };
    });
    g.userData.refresh = (found) => {
      for (const p of panels) {
        const on = !!found[p.d.key];
        if (p.state === on) continue;
        p.state = on; drawPanel(p.cv, p.d, on); p.tex.needsUpdate = true;
      }
    };
    return g;
  }

  function makeTable() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.5, roughness: 0.4 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.8), mat); top.position.y = 1; top.castShadow = true; g.add(top);
    for (const [x, z] of [[-0.6, -0.33], [0.6, -0.33], [-0.6, 0.33], [0.6, 0.33]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), mat); l.position.set(x, 0.5, z); g.add(l);
    }
    return g;
  }

  function makeHammer() {
    const g = new THREE.Group();
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
    g.add(h);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.07), new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.8, roughness: 0.3 }));
    head.position.y = 0.2; g.add(head);
    return g;
  }
  function makeFeather() {
    const g = new THREE.Group();
    const vane = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 1 }));
    vane.scale.set(0.5, 2.6, 0.12); vane.position.y = 0.12; g.add(vane);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 4), new THREE.MeshStandardMaterial({ color: 0xd6d3d1 }));
    stem.position.y = 0.08; g.add(stem);
    return g;
  }

  // Markierung einer Station: leuchtender Bodenring, ein sanfter Lichtkegel und darüber ein schwebendes Hologramm-Symbol
  // (statt der früheren 30 m hohen Lichtsäulen). setIcon(symbol, farbe) zeichnet das Hologramm neu.
  function makeMarker() {
    const g = new THREE.Group();
    const add = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false };
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 48), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, opacity: 0.75, ...add }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, opacity: 0.1, ...add }));
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.05; g.add(pad);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 1.05, 2.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, opacity: 0.16, ...add }));
    beam.position.y = 1.3; g.add(beam);
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const tex = new THREE.CanvasTexture(cv);
    const holo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, toneMapped: false, fog: false }));
    holo.position.y = 2.9; g.add(holo);
    let drawn = "";
    const setIcon = (icon, color) => {
      const k = icon + color; if (k === drawn) return; drawn = k;
      const x = cv.getContext("2d"), c = "#" + new THREE.Color(color).getHexString();
      x.clearRect(0, 0, 128, 128);
      const gr = x.createRadialGradient(64, 64, 8, 64, 64, 60);
      gr.addColorStop(0, "rgba(10,20,40,0.75)"); gr.addColorStop(0.8, "rgba(10,20,40,0.55)"); gr.addColorStop(1, "rgba(10,20,40,0)");
      x.fillStyle = gr; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill();
      x.strokeStyle = c; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 54, 0, 7); x.stroke();
      x.fillStyle = c; // für Zeichen wie ✓ (Emojis bringen ihre eigenen Farben mit)
      x.font = "bold 64px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(icon, 64, 70);
      tex.needsUpdate = true;
    };
    g.userData = { beam, ring, pad, holo, setIcon, phase: Math.random() * 6, inside: false };
    return g;
  }
  // Hologramme schweben leicht auf und ab und werden in der Ferne etwas größer, damit man sie auch von weitem findet
  function animateMarkers(elapsed) {
    const c = world.camera;
    for (const st of Object.values(world.stations)) {
      const m = st.marker; if (!m.visible) continue;
      const u = m.userData, d = c.position.distanceTo(m.position);
      const inside = Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z) < st.zone;
      if (inside !== u.inside) {
        u.inside = inside;
        u.ring.material.color.setHex(inside ? 0xfde68a : 0x7dd3fc); u.pad.material.color.setHex(inside ? 0xfde68a : 0x7dd3fc);
        u.pad.material.opacity = inside ? 0.28 : 0.1; u.beam.material.color.setHex(inside ? 0xfde68a : 0x7dd3fc);
      }
      u.ring.scale.setScalar((u.ringK || 1) * (inside ? 1 + Math.sin(elapsed * 6) * 0.04 : 1));
      u.holo.position.y = 2.9 + Math.sin(elapsed * 2 + u.phase) * 0.15;
      u.holo.scale.setScalar(Math.min(4, 1.3 + d * 0.022) / m.scale.x);
    }
  }
  // Symbol für eine Station: Rakete, geheimnisvolles Fundstück oder das Symbol der Entdeckung
  function stationIcon(key) {
    const sc = cfg.stations[key], d = cfg.discoveries.find((x) => x.key === key);
    if (sc.home) return "🚀";
    if (sc.small && !foundMap()[key]) return "✨";
    return d ? d.icon : "🔍";
  }

  // ---------- Gemeinsamer Aufbau für jeden Ort: Boden, Steine, Licht, Himmel, Rakete, Astronaut ----------
  // P beschreibt den Ort: height(x,z), sky/fog, ground/tint(x,z), rock, keepFree, ambient, hemi, sun, stars, sunSize, dust
  function buildBase(P) {
    const FAST = W.fast, height = P.height;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(P.sky);
    if (P.fog) scene.fog = new THREE.Fog(P.sky, P.fog[0], P.fog[1]); // Dunst in der Luft (nur wo es Luft gibt)
    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 3000);

    // Boden
    const SIZE = 560, SEG = FAST ? 140 : 220;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, height(x, z));
      cols.set(P.tint(x, z), i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: regolithTexture(), color: P.ground, vertexColors: true, roughness: 1, metalness: 0 }));
    ground.receiveShadow = true;
    scene.add(ground);

    // Steine
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: P.rock, roughness: 1, flatShading: true }), FAST ? 140 : 280);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V(), p = new V(), e = new THREE.Euler();
    let placed = 0, tries = 0;
    const keepFree = [[0, 0, 12], ...P.keepFree];
    while (placed < rocks.count && tries++ < 5000) {
      const x = (hash2(tries, 1.3) - 0.5) * 300, z = (hash2(tries, 7.7) - 0.5) * 300;
      if (keepFree.some(([fx, fz, r]) => Math.hypot(x - fx, z - fz) < r)) continue;
      const s = 0.15 + Math.pow(hash2(tries, 3.1), 3) * 1.3;
      p.set(x, height(x, z) + s * 0.3, z); e.set(hash2(tries, 4) * 6, hash2(tries, 5) * 6, 0); q.setFromEuler(e);
      sc.set(s, s * (0.5 + hash2(tries, 9) * 0.5), s); mtx.compose(p, q, sc);
      rocks.setMatrixAt(placed++, mtx);
    }
    rocks.count = placed; rocks.castShadow = true; rocks.receiveShadow = true;
    scene.add(rocks);

    // Licht: Sonne plus Umgebungslicht (ohne Luft fast keins – dann sind Schatten tiefschwarz)
    const ambient = new THREE.AmbientLight(P.ambient[0], P.ambient[1]), hemi = new THREE.HemisphereLight(P.hemi[0], P.hemi[1], P.hemi[2]);
    scene.add(ambient, hemi);
    const sun = new THREE.DirectionalLight(P.sun[0], P.sun[1]);
    sun.castShadow = true;
    const shadowRes = FAST || W.lite ? 1024 : 2048; // Tablets/Surface: sparsamer
    sun.shadow.mapSize.set(shadowRes, shadowRes);
    Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 260 });
    sun.shadow.bias = -0.0015;
    scene.add(sun, sun.target);

    // Himmel: Sterne (nur wo keine Luft sie überstrahlt) und Sonne
    const n = FAST ? 1500 : 3000, sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 0.95 + 0.05, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      sp.set([r * Math.cos(th) * 1400, u * 1400, r * Math.sin(th) * 1400], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0.85, fog: false }));
    stars.visible = P.stars;
    scene.add(stars);
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,245,1)", "rgba(255,240,200,0.5)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    sunGlow.position.copy(SUN_DIR).multiplyScalar(1200); sunGlow.scale.set(P.sunSize, P.sunSize, 1);
    scene.add(sunGlow);

    // Eigene Rakete mit Leiter und Luke
    const on = (obj, x, z, lift = 0) => { obj.position.set(x, height(x, z) + lift, z); scene.add(obj); return obj; };
    const rocket = W.makeRocket(G.state.color);
    rocket.scale.setScalar(4.6); rocket.rotation.x = Math.PI / 2;
    rocket.userData.flame.visible = false;
    rocket.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    on(rocket, 0, 0, 0.95 * 4.6);
    const hatch = on(makeHatch(), 0, 0);
    hatch.rotation.y = HATCH.a;

    // Eigene Fußabdrücke (Pool)
    const fpMat = new THREE.MeshBasicMaterial({ map: footprintTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const fpGeo = new THREE.PlaneGeometry(0.3, 0.6); fpGeo.rotateX(-Math.PI / 2);
    const myPrints = [];
    for (let i = 0; i < 160; i++) { const m = new THREE.Mesh(fpGeo, fpMat); m.visible = false; scene.add(m); myPrints.push(m); }

    // Es gibt nur EINEN Astronauten für alle Orte (das Modell lässt sich nicht kopieren) – S.enter stellt ihn in die jeweilige Szene
    if (!sharedAstronaut) sharedAstronaut = astronautModel ? makeModelAstronaut(astronautModel, G.state.color) : makeAstronaut(G.state.color);
    const astronaut = sharedAstronaut;

    // Staubkörner
    const dustMat = new THREE.SpriteMaterial({ map: glowTexture(P.dust[0], P.dust[1]), transparent: true, depthWrite: false });
    const dust = [];
    for (let i = 0; i < 120; i++) { const s = new THREE.Sprite(dustMat.clone()); s.visible = false; s.userData = { life: 0, v: new V() }; scene.add(s); dust.push(s); }

    return { scene, camera, height, on, sun, sunBase: P.sun[1], sunGlow, ambient, hemi, stars, rocket, rocketY: rocket.position.y, hatch, hatchY: hatch.position.y,
      fpGeo, fpMat, astronaut, myPrints, printIdx: 0, dust, dustIdx: 0 };
  }

  // Markierungen (Lichtsäulen) für die Stationen eines Ortes; offsets verschiebt einzelne Säulen neben ihr Objekt
  function addMarkers(B, stationPos, offsets = {}) {
    const stations = {};
    for (const [key, [x, z]] of Object.entries(stationPos)) {
      if (!cfg.stations[key]) continue; // keine Station mehr – das Ausstellungsstück bleibt als Kulisse stehen
      const [ox, oz] = offsets[key] || [0, 0];
      const mk = B.on(makeMarker(), x + ox, z + oz);
      if (cfg.stations[key].small) mk.scale.setScalar(0.7); // Fundstück: nur ein kleines Licht
      if (cfg.stations[key].info) mk.visible = false;              // Tafelwand: keine Entdeckung, also kein Licht
      const sc = cfg.stations[key];
      const zone = sc.info ? (sc.reach || 3.2) : sc.zone || (sc.small ? 1.3 : 1.7);
      stations[key] = { marker: mk, x: mk.position.x, z: mk.position.z, zone };
    }
    return stations;
  }
  // Tafelwand der Station als Kette aus Kreis-Hindernissen, dazu Kuppel, Wohnmodul und Mast des Sonnensegels
  function stationColliders([sx0, sz0]) {
    const c = [[sx0, sz0 + 7.5, 6.4], [sx0 - 13, sz0 + 6.5, 2.4], [sx0 - 8.5, sz0 + 6.5, 2.4], [sx0 + 11, sz0 + 6, 0.5]];
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx0 + x, sz0 + 0.1, 1]);
    return c;
  }

  // =========================================================
  //  Gemeinsames Leben an allen Orten: blinkende Lichter, drehende Teile, Mitbewohner
  // =========================================================
  // world.blink = [Lampe, …] · world.spin = [[Objekt, Achse "x"|"y"|"z", Tempo], …] · world.anim = [fn(dt, elapsed), …]
  function updateLife(dt, elapsed, busy) {
    if (world.blink) world.blink.forEach((m, i) => { m.visible = ((elapsed * 0.9 + i * 0.37) % 1) < 0.45; });
    if (world.spin) for (const [o, ax, v] of world.spin) o.rotation[ax] += v * dt;
    if (world.anim) for (const fn of world.anim) fn(dt, elapsed);
    if (world.npcs) updateNpcs(dt, elapsed, busy);
  }
  // Schild auf zwei Pfosten, von beiden Seiten lesbar (vorn = +Z)
  function makeSignBoard(M, text, color, w = 2.2, h = 0.45) {
    const g = new THREE.Group();
    for (const x of [-w * 0.42, w * 0.42]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), M.steel), x, 0.7, 0);
    for (const r of [0, Math.PI]) put(g, new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMat(text, color, 640, Math.round(640 * h / w), Math.round(640 * h / w * 0.55))), 0, 1.2, r ? -0.02 : 0.02, false).rotation.y = r;
    return g;
  }
  // Gedenktafel auf einem schrägen Pult (vorn = +Z)
  function makePlaque(M, lines, color = "#1f2937") {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), M.metal), 0, 0.45, 0);
    const tex = canvasTex(512, 320, (c) => {
      c.fillStyle = color; c.fillRect(0, 0, 512, 320);
      c.strokeStyle = "#d4af37"; c.lineWidth = 10; c.strokeRect(10, 10, 492, 300);
      c.fillStyle = "#f5e6b3"; c.textAlign = "center"; c.textBaseline = "middle";
      lines.forEach(([t, s], i) => { c.font = `bold ${s}px serif`; c.fillText(t, 256, 70 + i * (240 / lines.length)); });
    });
    const plate = put(g, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.06), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.5 })), 0, 1.05, 0);
    plate.rotation.x = -0.6;
    return g;
  }
  // Wegweiser mit Pfeil-Brettern in verschiedene Richtungen: arms = [[Text, Richtung (Winkel), Farbe], …]
  function makeSignTree(M, arms) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 8), M.steel), 0, 1.7, 0);
    const shape = new THREE.Shape(); shape.moveTo(0, -0.17); shape.lineTo(1.85, -0.17); shape.lineTo(2.1, 0); shape.lineTo(1.85, 0.17); shape.lineTo(0, 0.17); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }); geo.translate(0.1, 0, -0.03);
    arms.forEach(([text, ang, color], i) => {
      const arm = new THREE.Group(); arm.position.y = 3.05 - i * 0.48; arm.rotation.y = ang - Math.PI / 2; g.add(arm);
      put(arm, new THREE.Mesh(geo, M.std({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.5, envMapIntensity: 0.4 })), 0, 0, 0);
      const tex = signTex(text, color, 512, 90, 44);
      for (const s of [1, -1]) {
        const p = put(arm, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.3), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })), 1.0, 0, s * 0.035, false);
        if (s < 0) p.rotation.y = Math.PI; // Rückseite ebenfalls lesbar
      }
    });
    return g;
  }
  // Goldfolie (Wärmeschutz von Raumfahrzeugen), leicht zerknittert
  let foilTexCache = null;
  function foilTex() {
    if (foilTexCache) return foilTexCache;
    const t = canvasTex(256, 256, (c) => {
      c.fillStyle = "#c9972e"; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 90; i++) {
        const x = hash2(i, 1) * 256, y = hash2(i, 2) * 256, r = 10 + hash2(i, 3) * 30, l = hash2(i, 4);
        c.fillStyle = l > 0.5 ? `rgba(255,236,160,${0.15 + l * 0.25})` : `rgba(110,70,10,${0.1 + l * 0.3})`;
        c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) c.lineTo(x + Math.cos(k * 1.7 + l * 6) * r, y + Math.sin(k * 1.7 + l * 6) * r); c.fill();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; foilTexCache = t;
    return t;
  }

  // =========================================================
  //  Mondbasis (nach Ideen von ESA und NASA): Kuppeln aus gedrucktem Mondstaub, aufblasbare Module darunter,
  //  senkrechte Solartürme (am Südpol steht die Sonne immer tief), Mondauto, Frachtlander, 3D-Drucker, der eine neue Kuppel baut
  // =========================================================
  // Gedruckte Kuppel: grobe Zellen wie ein Bienenwabenmuster aus Mondstaub
  let regTexCache = null;
  function regolithShellTex() {
    if (regTexCache) return regTexCache;
    const t = canvasTex(256, 256, (c) => {
      c.fillStyle = "#8f8c86"; c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) { const n = hash2(x * 0.37, y * 0.51); c.fillStyle = `rgba(${n > 0.5 ? 255 : 0},${n > 0.5 ? 255 : 0},${n > 0.5 ? 255 : 0},${Math.abs(n - 0.5) * 0.12})`; c.fillRect(x, y, 2, 2); }
      c.strokeStyle = "rgba(40,38,36,0.35)"; c.lineWidth = 3; // Druckschichten
      for (let y = 8; y < 256; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
      c.strokeStyle = "rgba(230,228,222,0.18)"; c.lineWidth = 2;
      for (let y = 10; y < 256; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 5); regTexCache = t;
    return t;
  }
  // Kuppel (lokal: Eingang nach +Z) mit weißem Eingangsmodul, farbigem Ring und Tür
  function moonDome(g, M, x, z, r, face, label) {
    const d = new THREE.Group(); d.position.set(x, 0, z); d.rotation.y = face; g.add(d);
    const shell = put(d, new THREE.Mesh(new THREE.SphereGeometry(r, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: regolithShellTex(), roughness: 1 })), 0, 0, 0);
    shell.scale.y = 0.78; shell.receiveShadow = true;
    const tube = put(d, new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 3.2, 28), M.hull(3, 1)), 0, 1.35, r - 0.3); tube.rotation.x = Math.PI / 2;
    put(d, new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.12, 8, 28), M.orange), 0, 1.35, r + 0.6, false);
    put(d, new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.16, 10, 28), M.teal), 0, 1.35, r + 1.3);
    put(d, new THREE.Mesh(new THREE.CircleGeometry(1.25, 28), M.metal), 0, 1.35, r + 1.31, false);
    put(d, new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), M.glow), 0, 1.75, r + 1.32, false);
    put(d, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1), M.metal), 0, 0.08, r + 1.8);
    put(d, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), signMat(label, "#1d4ed8", 640, 120, 56)), 0, 2.98, r + 0.9, false);
    return d;
  }
  // Senkrechter Solarturm: das Paneel dreht sich langsam mit der tief stehenden Sonne
  function moonSolarTower(M, h = 9) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h, 10), M.steel), 0, h / 2, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.4, 16), M.metal), 0, 0.2, 0);
    const head = new THREE.Group(); head.position.y = h * 0.62; g.add(head);
    const cell = marsCellMat(M);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(2.4, h * 0.62, 0.08), M.steel), 0, 0, 0.1);
    for (const s of [1, -1]) put(head, new THREE.Mesh(new THREE.PlaneGeometry(2.3, h * 0.6), cell), 0, 0, 0.1 + s * 0.045, false).rotation.y = s > 0 ? 0 : Math.PI;
    blinkLamp(g, 0xff3b30, 0, h + 0.2, 0);
    g.userData.head = head;
    return g;
  }
  // Mondauto (wie das neue Mond-Fahrzeug der NASA): offenes Gestell, vier Drahtgitter-Räder, zwei Sitze, Antenne
  function moonBuggy(M) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 3.2), M.steel), 0, 0.75, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.08, 3.25), M.orange), 0, 0.84, 0, false);
    for (const [x, z] of [[-1.05, -1.15], [1.05, -1.15], [-1.05, 1.15], [1.05, 1.15]]) {
      const w = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 10, 20), M.std({ color: srgb(0x9ca3af), roughness: 0.6, metalness: 0.6 })), x, 0.48, z); w.rotation.y = Math.PI / 2;
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.95), M.hull(1, 1)), x, 0.95, z, false); // Kotflügel
    }
    for (const z of [-0.2, 0.7]) {
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.55), M.teal), (z > 0 ? -0.45 : -0.45), 1.0, z);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.55), M.teal), 0.45, 1.0, z);
    }
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.1), M.metal), 0, 1.2, -1.2);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), M.steel), 0.7, 1.5, -1.3);
    const dish = put(g, dishCap(M, 0.4, 0.9), 0.7, 2.1, -1.3);
    dish.rotation.x = -0.9;
    return g;
  }
  // Frachtlander: achteckiger Körper in Goldfolie auf vier Beinen, Kisten obendrauf, Kran und Leiter (vorn = +Z)
  function makeCargoLander(M) {
    const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ map: foilTex(), color: 0xffffff, roughness: 0.3, metalness: 0.75, envMap: M.env, envMapIntensity: 1.2 });
    const body = put(g, new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2.2, 8), gold), 0, 3.2, 0); body.rotation.y = Math.PI / 8;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.2, 8), M.hull(2, 1)), 0, 4.4, 0).rotation.y = Math.PI / 8;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.95, 1.1, 20, 1, true), M.metal), 0, 1.6, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      pipeSeg(g, M, new V(x * 1.4, 2.6, z * 1.4), new V(x * 3, 0.15, z * 3), 0.1);
      pipeSeg(g, M, new V(x * 1.5, 3.6, z * 1.5), new V(x * 2.4, 1.2, z * 2.4), 0.05);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 16), M.steel), x * 3, 0.06, z * 3);
    }
    for (const [x, z, s, m] of [[-0.8, -0.6, 1, M.orange], [0.5, -0.7, 0.8, M.teal], [0.2, 0.7, 0.9, M.hull(1, 1)]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.8, s), m), x, 4.5 + s * 0.4, z);
    const crane = new THREE.Group(); crane.position.set(-1.3, 4.5, 1.2); g.add(crane);
    put(crane, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), M.orange), 0, 0.9, 0);
    pipeSeg(crane, M, new V(0, 1.8, 0), new V(0, 1.6, 2.2), 0.06, M.orange);
    pipeSeg(crane, M, new V(0, 1.6, 2.2), new V(0, 0.4, 2.2), 0.01, M.metal);
    for (let i = 0; i < 7; i++) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), M.steel), 1.55, 0.4 + i * 0.5, 1.7, false).rotation.y = -Math.PI / 4;
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), signMat("📦 FRACHT", "#1d4ed8", 480, 108, 60)), 0, 3.2, 2.12, false);
    g.userData.crane = crane;
    return g;
  }
  // Aussichtsplattform „Erdblick“: runde Plattform mit Geländer, Treppe und Bank (vorn = +Z = Treppe)
  function makeViewDeck(M, lift) {
    const g = new THREE.Group(), R = 2.7;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.16, 32), M.hull(4, 1)), 0, lift - 0.08, 0).receiveShadow = true;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.12, 32, 1, true), M.orange), 0, lift - 0.1, 0, false);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, lift, 8), M.steel), Math.sin(a) * (R - 0.5), lift / 2, Math.cos(a) * (R - 0.5)); }
    let last = null; // Geländer, vorn offen für die Treppe
    for (let i = 1; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, top = new V(Math.sin(a) * (R - 0.08), lift + 1, Math.cos(a) * (R - 0.08));
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), M.steel), top.x, lift + 0.5, top.z, false);
      if (last) pipeSeg(g, M, last, top, 0.04, M.teal);
      last = top;
    }
    for (let i = 0; i < 3; i++) put(g, new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.4), M.metal), 0, (lift / 3) * (i + 0.5), R + 0.3 + (2 - i) * 0.4);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.4), M.teal), -1.3, lift + 0.45, -1.2).rotation.y = 0.8; // Bank
    return g;
  }
  // 3D-Drucker, der gerade eine neue Kuppel aus Mondstaub druckt (lokal: Mitte der Kuppel = 0)
  function moonPrinter(g, M, x, z, r) {
    const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
    const done = 0.95; // so weit ist die Kuppel schon gedruckt (Winkel vom Boden aus)
    const part = put(p, new THREE.Mesh(new THREE.SphereGeometry(r, 48, 12, 0, Math.PI * 2, Math.PI / 2 - done, done), new THREE.MeshStandardMaterial({ map: regolithShellTex(), roughness: 1, side: THREE.DoubleSide })), 0, 0, 0);
    part.scale.y = 0.78;
    const H = r * 0.78 + 1.6, S = r + 1.3;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(p, new THREE.Mesh(new THREE.BoxGeometry(0.3, H, 0.3), M.teal), a * S, H / 2, b * S);
    for (const b of [-1, 1]) put(p, new THREE.Mesh(new THREE.BoxGeometry(2 * S + 0.3, 0.3, 0.3), M.teal), 0, H, b * S);
    const bridge = new THREE.Group(); bridge.position.y = H; p.add(bridge);
    put(bridge, new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 2 * S + 0.3), M.metal), 0, 0.3, 0);
    const head = new THREE.Group(); bridge.add(head);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), M.hull(1, 1)), 0, 0.1, 0);
    const nozzle = put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.6, 8), M.metal), 0, -0.9, 0);
    const tip = put(head, new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: srgb(0xffa24a), toneMapped: false })), 0, -1.75, 0, false);
    const topY = r * 0.78 * Math.sin(done);
    return (dt, t) => { // Druckkopf fährt die Kante der Kuppel ab
      const a = t * 0.35, rr = r * Math.cos(done) * 0.98;
      bridge.position.x = Math.cos(a) * rr; head.position.z = Math.sin(a) * rr;
      head.position.y = topY - H + 1.75;
      tip.visible = Math.sin(t * 20) > -0.3;
    };
  }

  function buildMoonCamp(g, add) {
    const M = colonyMats("mond");
    g.userData.turn = []; g.userData.anim = [];
    moonDome(g, M, -13, 13, 6.5, Math.atan2(4, -13), "🏠 WOHNKUPPEL");
    moonDome(g, M, 11, 14, 5.5, Math.atan2(-3, -14), "🔬 LABOR");
    moonDome(g, M, 0, 26, 7, Math.PI + 0.1, "🌱 GEWÄCHSHAUS");
    // Verbindungsgänge (halb im Boden, mit Mondstaub bedeckt)
    const tunnel = (ax, az, bx, bz) => {
      const d = new V(bx - ax, 0, bz - az), L = d.length(), geo = new THREE.CylinderGeometry(1.4, 1.4, L, 20, 1, false, 0, Math.PI);
      geo.rotateZ(Math.PI / 2); // liegende Halbröhre entlang X, Rundung oben
      put(g, new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: regolithShellTex(), roughness: 1 })), (ax + bx) / 2, 0, (az + bz) / 2).rotation.y = Math.atan2(-d.z, d.x);
    };
    tunnel(-8, 17, -4, 22); tunnel(7, 18, 4, 22);
    g.userData.anim.push(moonPrinter(g, M, 21, 28, 5));
    for (const [x, z, h] of [[-23, 3, 9], [-26.5, 10, 10], [-24, 18, 9]]) { const t = moonSolarTower(M, h); t.position.set(x, 0, z); g.add(t); g.userData.turn.push(t.userData.head); g.userData.blink.push(t.children[t.children.length - 1]); }
    for (const [x, z, s, c, r, y] of [[16, 3, 1.1, M.orange, 0.3, 0], [17.2, 4.3, 0.9, M.teal, -0.2, 0], [16.1, 3.1, 0.8, M.hull(1, 1), 0.9, 1.1]]) colonyCrate(g, M, x, z, s, c, r, y);
    for (const [x, z] of [[-9.5, 3], [9.5, 3]]) colonyLamp(g, M, x, z);
  }
  function moonCampColliders([sx, sz]) {
    const c = [[sx - 13, sz + 13, 6.5], [sx + 11, sz + 14, 5.5], [sx, sz + 26, 7], [sx + 21, sz + 28, 6.6], [sx - 6, sz + 19.5, 1.5], [sx + 5.5, sz + 20, 1.5],
      [sx - 23, sz + 3, 0.8], [sx - 26.5, sz + 10, 0.8], [sx - 24, sz + 18, 0.8], [sx + 16.5, sz + 3.6, 1.3], [sx - 9.5, sz + 3, 0.3], [sx + 9.5, sz + 3, 0.3]];
    for (const [x, z, r, f] of [[-13, 13, 6.5, Math.atan2(4, -13)], [11, 14, 5.5, Math.atan2(-3, -14)]]) c.push([sx + x + Math.sin(f) * (r + 1), sz + z + Math.cos(f) * (r + 1), 1.5]);
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx + x, sz + 0.1, 1]); // Tafelwand
    return c;
  }

  // ---------- Mond ----------
  function buildMoon() {
    const L = { ...MOON_LAYOUT };
    L.shadowSpot = [L.boulder[0] + SHADOW_DIR.x * 12, L.boulder[1] + SHADOW_DIR.z * 12];
    const craters = [MOON_CRATER, [60, -20, 14, 2.2], [-60, -6, 10, 1.6], [70, 110, 18, 2.6], [-80, 40, 12, 1.8], [90, 70, 9, 1.4],
      [-30, -40, 16, 2.4], [40, -70, 11, 1.8], [-95, -30, 20, 3], [0, -95, 13, 2], [100, 10, 8, 1.2], [25, -30, 6, 0.9]];
    const flats = [[0, 0, 11], [...L.fallversuch, 5], [...L.himmel, 4, "auto", 3], [...L.apollo, 10], [...L.boulder, 7], [...L.shadowSpot, 6], [...L.waage, 9], [...L.station, 20, "auto"], [L.station[0], L.station[1] + 18, 24, "auto"], [...L.spiegel, 4], [...L.antenne, 5, "auto", 9]];
    const B = buildBase({
      height: makeHeight(craters, flats, 0, (x, z) => -MOAT_DEPTH * moonMoatK(x, z)),
      sky: 0x000000, stars: true, sunSize: 160,
      ground: 0x86837d, rock: 0x6b6863,
      tint: (x, z) => { const m = (0.72 + 0.28 * smooth(0.35, 0.6, fbm2(x * 0.01 + 3, z * 0.01))) * (1 - 0.35 * moonMoatK(x, z)); return [m, m, m * 1.02]; }, // dunklere „Meere“, dunkler Graben
      keepFree: [[...L.fallversuch, 5], [...L.himmel, 6], [...L.apollo, 9], [...L.shadowSpot, 7], [...L.spawn, 4],
        [...L.waage, 8], [...L.wegweiser, 3], [...L.mondstein, 3], [L.station[0], L.station[1] + 2, 18], [L.station[0], L.station[1] + 18, 26], [...L.spiegel, 4], [...L.antenne, 4]],
      // grelle Sonne, kaum Umgebungslicht (auf dem Mond sind Schatten tiefschwarz), bläulicher Erdschein
      ambient: [0x8090b0, 0.16], hemi: [0x5b7bbf, 0x000000, 0.12], sun: [0xfffaf0, 1.9],
      dust: ["rgba(150,146,140,1)", "rgba(130,126,120,0.9)"]
    });
    const { scene, height, on, rocket, fpGeo, fpMat } = B;

    const earthDir = new V(1, 0.62, 0.55).normalize(); // gegenüber der Sonne → fast „volle Erde“
    const erde = W.bodies.erde;
    const earth = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 32), new THREE.MeshStandardMaterial({ map: erde.mesh.material.map, color: 0xb8b8b8, roughness: 0.9 }));
    earth.position.copy(earthDir).multiplyScalar(900);
    earth.rotation.z = 0.4;
    scene.add(earth);
    if (erde.clouds) {
      const cl = new THREE.Mesh(new THREE.SphereGeometry(40.6, 48, 32), new THREE.MeshStandardMaterial({ map: erde.clouds.material.map, transparent: true, depthWrite: false }));
      earth.add(cl);
    }
    const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(110,160,255,0.35)", "rgba(70,130,255,0.08)"), blending: THREE.AdditiveBlending, depthWrite: false }));
    earthGlow.scale.set(100, 100, 1); earth.add(earthGlow);
    // Vergleichs-Mond fürs Fernrohr: so klein sieht der Mond von der Erde aus (Erde vom Mond: 3,67-mal so breit)
    const cmpMoon = new THREE.Mesh(new THREE.SphereGeometry(40 / 3.67, 32, 24), new THREE.MeshStandardMaterial({ map: W.bodies.mond.mesh.material.map, color: 0xb8b8b8, roughness: 1 }));
    const cmpRight = new V().crossVectors(earthDir, new V(0, 1, 0)).normalize(); // im Fernrohr: rechts neben der Erde
    cmpMoon.position.copy(earth.position).addScaledVector(cmpRight, 68);
    cmpMoon.visible = false;
    scene.add(cmpMoon);

    // Objekte
    const M = colonyMats("mond");
    const lander = on(makeLander(), ...L.apollo);
    lander.rotation.y = 0.6;
    const flag = on(makeFlag(), L.apollo[0] + 4.5, L.apollo[1] - 2.5);
    flag.rotation.y = -0.4;
    // Die Landestelle ist ein Denkmal: Absperrung, damit die Fußspuren von 1969 erhalten bleiben, und eine Gedenktafel
    const [ax, az] = L.apollo, ropeTop = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, x = ax + Math.sin(a) * 7, z = az + Math.cos(a) * 7, y = height(x, z);
      put(scene, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 6), M.steel), x, y + 0.45, z);
      ropeTop.push(new V(x, y + 0.85, z));
    }
    ropeTop.forEach((p, i) => pipeSeg(scene, M, p, ropeTop[(i + 1) % ropeTop.length], 0.018, M.orange));
    const plaque = on(makePlaque(M, [["APOLLO 11", 58], ["20. JULI 1969", 40], ["Hier betraten Menschen", 34], ["zum ersten Mal den Mond", 34]]), ax + 5.2, az - 6.2);
    plaque.rotation.y = Math.atan2(-plaque.position.x, -plaque.position.z);

    const boulder = new THREE.Mesh(naturalRockGeo(11, 5), new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 1, vertexColors: true, map: regolithTexture() })); // verwitterter Felsbrocken
    boulder.material.map.repeat.set(3, 3);
    boulder.scale.set(7, 8.5, 6.5); boulder.rotation.set(0.2, 0.7, 0.1);
    boulder.castShadow = true; boulder.receiveShadow = true;
    on(boulder, ...L.boulder, 2.4); // unten im Boden versenkt (der Fels ist unten flach)

    const DECK = 0.9; // Fernrohr auf der Aussichtsplattform „Erdblick“
    const deck = on(makeViewDeck(M, DECK), ...L.himmel);
    deck.rotation.y = Math.atan2(-L.himmel[0], -L.himmel[1]);
    const telescope = on(makeTelescope(earthDir), ...L.himmel, DECK);
    const deckSign = on(makeSignBoard(M, "🌍 ERDBLICK", "#1d4ed8"), L.himmel[0] - 3.4, L.himmel[1] - 2.2);
    deckSign.rotation.y = Math.atan2(-deckSign.position.x, -deckSign.position.z);
    // Frachtlander: Hier wird die Fracht gewogen – und du
    const cargo = on(makeCargoLander(M), L.waage[0] + WEIGH_DIR.x * -5, L.waage[1] + WEIGH_DIR.z * -5);
    cargo.rotation.y = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);
    const scale = on(makeScale(), ...L.waage);
    scale.rotation.y = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);
    const scaleSign = on(makeSignBoard(M, "⚖️ FRACHTWAAGE", "#b45309", 2.2), L.waage[0] + 2.2, L.waage[1] - 1.2);
    scaleSign.rotation.y = Math.atan2(-scaleSign.position.x, -scaleSign.position.z);
    on(makeReflector(), ...L.spiegel).rotation.y = Math.atan2(earthDir.x, earthDir.z);
    { // Schild neben der Absprungstelle (nicht in der Sprungbahn)
      const [cx, cz] = L.mondstein, ax = 3, az = -5.5, d = Math.hypot(ax, az), sx = cx + (ax / d) * 7.5 + (-az / d) * 3.6, sz = cz + (az / d) * 7.5 + (ax / d) * 3.6;
      on(makeSignBoard(M, "🦘 NUR MIT ANLAUF!", "#7c3aed", 2.8), sx, sz).rotation.y = Math.atan2(ax, az);
    }
    const station = on(makeStation(cfg.discoveries, "Mondbasis", "mond"), ...L.station);
    // Laserstrahl zwischen Spiegel und Erde (nur während der Messung sichtbar)
    const laserFrom = new V(L.spiegel[0], height(...L.spiegel) + 0.5, L.spiegel[1]);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 880, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.copy(laserFrom).addScaledVector(earthDir, 440);
    beam.quaternion.setFromUnitVectors(new V(0, 1, 0), earthDir);
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(220,255,220,1)", "rgba(74,222,128,0.7)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    beam.visible = pulse.visible = false;
    scene.add(beam, pulse);
    // Wegweiser mit Pfeilen: zur Erde, zur Sonne, zur Landestelle und zur Basis
    const [wx, wz] = L.wegweiser;
    on(makeSignTree(M, [["🌍 ERDE 384.400 km", Math.atan2(earthDir.x, earthDir.z), "#1d4ed8"], ["👣 APOLLO 11", Math.atan2(ax - wx, az - wz), "#b45309"],
      ["🏠 MONDBASIS", Math.atan2(L.station[0] - wx, L.station[1] - wz), "#0f766e"], ["☀️ SONNE 150 Mio. km", Math.atan2(SUN_DIR.x, SUN_DIR.z), "#ca8a04"]]), wx, wz);
    // Funkstation: Gittermast mit großer Schüssel, die genau zur Erde zeigt
    const [nx, nz] = L.antenne, mast = new THREE.Group(); on(mast, nx, nz);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) pipeSeg(mast, M, new V(x, 0, z), new V(x * 0.3, 3.4, z * 0.3), 0.06, M.steel);
    for (let i = 1; i < 4; i++) put(mast, new THREE.Mesh(new THREE.TorusGeometry(0.6 - i * 0.1, 0.03, 6, 4), M.steel), 0, i * 0.85, 0, false).rotation.set(Math.PI / 2, 0, Math.PI / 4);
    const ant = makeAntenna(earthDir); ant.position.y = 2.2; ant.scale.setScalar(1.5); mast.add(ant);
    put(mast, new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.4), M.hull(1, 1)), 2, 0.7, -1);
    put(mast, new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.2, 1.42), M.orange), 2, 1.2, -1, false);
    const blinkMast = [blinkLamp(mast, 0xff3b30, 0, 3.6, 0)];
    on(makeMoonRock(), ...L.mondstein, 0.18);
    const table = on(makeTable(), ...L.fallversuch);
    const hammer = makeHammer(), feather = makeFeather();
    hammer.scale.setScalar(1.6); feather.scale.setScalar(1.6);
    hammer.rotation.z = Math.PI / 2; feather.rotation.z = Math.PI / 2;
    hammer.position.set(-0.3, 1.06, 0); feather.position.set(0.3, 1.04, 0);
    table.add(hammer, feather);
    const fallPlaque = on(makePlaque(M, [["HAMMER & FEDER", 44], ["Apollo 15 · 1971", 36], ["Dave Scott ließ beide", 30], ["gleichzeitig fallen", 30]]), L.fallversuch[0] - 2, L.fallversuch[1] + 1.6);
    fallPlaque.rotation.y = Math.atan2(-fallPlaque.position.x, -fallPlaque.position.z);
    // Mondauto vor der Basis
    const buggy = on(moonBuggy(M), L.station[0] - 12, L.station[1] - 4); buggy.rotation.y = 0.5;

    // Fußabdrücke von 1969 rund um die Fähre (bleiben, weil es keinen Wind gibt)
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 3.2, r = 4.5 + (i % 7) * 0.9;
      const x = L.apollo[0] + Math.cos(a) * r + ((i % 2) - 0.5) * 0.4, z = L.apollo[1] + Math.sin(a) * r;
      const fp = new THREE.Mesh(fpGeo, fpMat);
      fp.position.set(x, height(x, z) + 0.03, z); fp.rotation.y = -a;
      scene.add(fp);
    }
    // Spuren im Staub: der Rundgang, den Lea mit dem Kind läuft; Felsgruppen
    drawTour(B, L, [176, 174, 168], 1.8);
    on(makeSignBoard(M, "⬇️ IN DEN KRATER", "#1d4ed8", 2.4), -12, 47).rotation.y = Math.atan2(12, -47);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x77767a, roughness: 0.95, vertexColors: true }); rockMat.userData.natural = true;
    const clusters = [[30, 12, 5], [-8, -14, 4], [-56, 46, 5], [64, 14, 5], [-6, 104, 5], [-36, 64, 4]];
    clusters.forEach(([x, z, n], i) => rockCluster(B, x, z, n, rockMat, i * 17 + 3));
    const npcs = addNpcs(B);

    // Markierungen (Lichtsäulen) für die Entdeckungs-Stationen
    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2], // zuerst: die Exponate daneben haben Vorrang
      apollo: L.apollo, himmel: L.himmel, temperatur: L.shadowSpot, fallversuch: L.fallversuch, waage: L.waage,
      spiegel: L.spiegel, wegweiser: L.wegweiser, antenne: L.antenne, mondstein: L.mondstein, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] },
    { apollo: [7, 7], himmel: MARS_SCOPE_DOOR(L.himmel) }); // Landestelle: Kreis außen am Seil · Erdblick: am Fuß der Treppe

    // Einfache Kreis-Hindernisse: [x, z, Radius]
    // Absperrung um die Landestelle von 1969: eine geschlossene Kette, durch die niemand hindurchkommt
    const fence = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; fence.push([L.apollo[0] + Math.sin(a) * 7, L.apollo[1] + Math.cos(a) * 7, 0.85]); }
    const colliders = [...ROCKET_COLLIDERS, [...L.boulder, 6.8], [...L.apollo, 3.2], ...fence, [...L.fallversuch, 1], [...L.himmel, 2.8],
      [...L.spiegel, 0.5], [...L.wegweiser, 0.3], [...L.antenne, 1.2], [L.antenne[0] + 2, L.antenne[1] - 1, 1.1], [...L.mondstein, 0.4],
      [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25], [cargo.position.x, cargo.position.z, 3.6],
      [buggy.position.x, buggy.position.z, 1.8], ...clusters.filter((c) => c[2] >= 5).map(([x, z]) => [x, z, 1.2]), ...npcs.map((n) => n.col),
      ...moonCampColliders(L.station)];

    const craneArm = cargo.userData.crane;
    return { ...B, L, station, laserFrom, beam, pulse, earth, earthDir, cmpMoon, cmpRight, scale, lander, boulder, telescope, table, hammer, feather,
      npcs, blink: [...station.userData.blink, ...blinkMast], spin: station.userData.turn.map((h) => [h, "y", 0.05]),
      anim: [...station.userData.anim, (dt, t) => { craneArm.rotation.y = Math.sin(t * 0.25) * 0.9; }],
      stations, colliders, shadowCasters: [boulder, rocket, lander, station, cargo] };
  }
  // ---------- Zustand beim Erkunden ----------
  const ast = { pos: new V(), vy: 0, onGround: true, heading: 0, speed: 0, phase: 0, jumpBase: 0, maxY: 0, walked: 0, foot: 0 };
  const view = { yaw: 0, height: 3.2, look: new V(), special: null };
  const keys = {}, joy = { x: 0, y: 0 };
  let jumpPressed = false, actionPressed = false;
  let temp = { shown: 120, inShadow: false, shadowTime: 0, sunSeen: false, check: 0 };
  let radioTimer = 0, radioVoice = 0, farWarned = 0, experiment = null, quizDone = false, boarding = null;

  function allQuestions() { return cfg.quiz.map((q) => ({ ...q, own: true })); }
  function fmtVars(t, vars) {
    const std = { name: G.state.name, anzahl: cfg.discoveries.length, fragen: allQuestions().length };
    return t.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : std[k] != null ? std[k] : ""));
  }

  function radio(text, vars, who) {
    const msg = fmtVars(text, vars);
    $("radioText").textContent = msg;
    $("radioHead").textContent = who || "📻 Bodenstation";
    const r = $("radio"); r.classList.remove("hidden"); r.classList.remove("ping"); void r.offsetWidth; r.classList.add("ping");
    radioTimer = 14;
    radioVoice = Voice.say(msg, who && /Nora/.test(who) ? "nora" : "radio");
  }

  function foundMap() { return (G.state.found && G.state.found[bodyId]) || {}; }
  function foundCount() { const f = foundMap(); return cfg.discoveries.filter((d) => f[d.key]).length; }

  function updateCounter() {
    $("discCount").textContent = `${foundCount()}/${cfg.discoveries.length}`;
    if (probe) { refreshGates(); return; }
    world.station.userData.refresh(foundMap()); // Tafeln an der Station
    for (const [key, st] of Object.entries(world.stations)) {
      const home = !!cfg.stations[key].home, done = !!foundMap()[key];
      const color = home ? 0xfbbf24 : done ? 0x4ade80 : cfg.stations[key].small ? 0xfcd34d : 0x7dd3fc;
      st.marker.userData.beam.material.color.set(color);
      st.marker.userData.ring.material.color.set(color);
      st.marker.userData.setIcon(done && !home ? "✓" : stationIcon(key), color);
    }
  }

  // Eine Entdeckung wurde gemacht → Karte zeigen, speichern, Sterne.
  // replay = true: schon Entdecktes darf man sich beliebig oft wieder ansehen (dann ohne neuen Stern).
  function discover(key, vars, replay) {
    const saved = foundMap()[key], known = !!saved;
    if (known && !replay) return;
    const d = cfg.discoveries.find((x) => x.key === key);
    if (!d) return;
    if (known) vars = vars || (typeof saved === "object" ? saved : d.fallback);
    else {
      G.discover(bodyId, key, vars);
      updateCounter();
      Sound.correct(); UI.confetti(90);
    }
    const text = fmtVars(d.text, vars);
    UI.openModal(`
      <div class="discovery">
        <div class="disc-icon">${d.icon}</div>
        <div class="disc-kicker">${known ? "✓ Schon entdeckt – nochmal angesehen" : "Neue Entdeckung! +1 ⭐"}</div>
        <h2>${d.title}</h2>
        ${cardExtra && cardExtra.key === key ? cardExtra.html : d.gallery ? `<div class="gallery" id="discGallery"></div>` : d.photo ? `<img src="img/${d.photo}" alt="" class="disc-photo">` : ""}
        <p>${text}</p>
        <div class="row-gap"><button class="btn primary" id="discOk">Weiter erkunden ▶</button></div>
      </div>`);
    const extra = cardExtra && cardExtra.key === key; cardExtra = null;
    Voice.say(`${d.title}. ${text}`, "card", { modal: true });
    // Echte Fotos zum Durchblättern (aus der früheren Steckbrief-Galerie)
    if (d.gallery && !extra) UI.renderGallery($("discGallery"), (D.photos[bodyId] || []).filter((p) => d.gallery.includes(p.file)), 0, false, true);
    $("discOk").onclick = () => {
      UI.closeModal();
      if (known) return;
      const rest = cfg.discoveries.length - foundCount();
      if (rest === 0 && G.onPlanetDone) G.onPlanetDone(bodyId); // Mission erst jetzt geschafft: alles entdeckt
      if (rest > 0) { if (!(guide && guide.on)) radio(cfg.radio.found, { rest }); } // mit Führung sagt Nora, wohin es weitergeht
      else if (!quizDone) quizSoon();
    };
  }

  // Liste aller Entdeckungen (Tipp auf den Zähler oben rechts): Entdecktes nochmal ansehen, Funk-Fragen wiederholen
  function showFound() {
    if (!S.active || boarding || experiment || view.special) return;
    Sound.click();
    const f = foundMap(), n = cfg.discoveries.length, all = foundCount() >= n;
    UI.openModal(`
      <div class="discovery">
        <div class="disc-kicker">🔍 ${foundCount()} von ${n} entdeckt</div>
        <h2>Meine Entdeckungen</h2>
        <div class="answers">${cfg.discoveries.map((d) => f[d.key]
          ? `<button class="answer" data-key="${d.key}">✓ ${d.icon} ${d.title}</button>`
          : `<button class="answer" disabled style="opacity:.6">○ ❓ ${d.hint || ((cfg.stations || {})[d.key] || {}).hint ? "Tipp: " + (d.hint || cfg.stations[d.key].hint) : "Noch nicht entdeckt"}</button>`).join("")}</div>
        <div class="row-gap">${all ? `<button class="btn ghost" id="foundQuiz">📻 Funk-Fragen nochmal</button>` : ""}<button class="btn primary" id="foundOk">Weiter erkunden ▶</button></div>
      </div>`);
    document.querySelectorAll("#modalContent .answer[data-key]").forEach((b) => b.onclick = () => discover(b.dataset.key, null, true));
    $("foundOk").onclick = () => UI.closeModal();
    if (all) $("foundQuiz").onclick = () => { UI.closeModal(); startQuiz(); };
  }

  // Alles entdeckt: Funk-Fragen ansagen (Nora oder Bodenstation) und kurz danach stellen – erst wenn „Mission geschafft“ vorbei ist
  function quizSoon() {
    if (guide && guide.on && guide.n.obj.visible) guideSay(cfg.guide.quiz); else radio(cfg.radio.allFound);
    setTimeout(() => startQuiz(true), 3600);
  }
  // auto = die Fragen kommen direkt nach der letzten Entdeckung → danach automatisch einsteigen und losfliegen
  function startQuiz(auto) {
    if (!S.active || UI.modalOpen()) { if (S.active) setTimeout(() => startQuiz(auto), 1500); return; }
    // Erst die Fragen zum Erkunden, dann die Fragen aus dem früheren Steckbrief-Quiz – alles per Funk
    const qs = allQuestions(); let i = 0, right = 0, rightOwn = 0;
    const show = () => {
      const q = qs[i];
      UI.openModal(`
        <div class="discovery">
          <div class="disc-kicker">📻 Funkspruch der Bodenstation · Frage ${i + 1} von ${qs.length}</div>
          <h2 style="font-size:24px">${q.q}</h2>
          <div class="answers">${q.a.map((t, k) => `<button class="answer" data-k="${k}">${t}</button>`).join("")}</div>
          <div id="sqAfter"></div>
        </div>`);
      Voice.say(`${q.q} ${q.a.slice(0, -1).join("? ")}? Oder: ${q.a[q.a.length - 1]}?`, "radio", { modal: true });
      document.querySelectorAll("#modalContent .answer").forEach((b) => b.onclick = () => {
        const ok = +b.dataset.k === q.c; if (ok) { right++; if (q.own) rightOwn++; Sound.correct(); } else Sound.wrong();
        document.querySelectorAll("#modalContent .answer").forEach((x) => { x.disabled = true; if (+x.dataset.k === q.c) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        Voice.say(`${ok ? "Richtig! " : "Nicht ganz. "}${q.why}`, "radio", { modal: true });
        $("sqAfter").innerHTML = `<div class="why">${ok ? "✅ Richtig! " : "❌ Nicht ganz. "}${q.why}</div><div class="row-gap"><button class="btn primary" id="sqNext">${i < qs.length - 1 ? "Nächste Frage ▶" : "Ergebnis 🏆"}</button></div>`;
        $("sqNext").onclick = () => { i++; if (i < qs.length) show(); else finish(); };
      });
    };
    const finish = () => {
      quizDone = true;
      G.onSurfaceQuiz(bodyId, rightOwn);
      G.onQuizFinished(bodyId, right - rightOwn);
      UI.openModal(`<div class="discovery center">
        <div class="stars-row">${qs.map((_, k) => `<span class="${k < right ? "" : "off"}">⭐</span>`).join("")}</div>
        <h2>${right} von ${qs.length} richtig</h2><p class="intro">Die Bodenstation ist beeindruckt!</p>
        <div class="row-gap"><button class="btn primary" id="sqClose">${auto ? "🚀 Weiterfliegen" : "👍 Super"}</button></div></div>`);
      if (right === qs.length) { Sound.fanfare(); UI.confetti(); }
      Voice.say(`${right} von ${qs.length} richtig! Die Bodenstation ist beeindruckt!`, "radio", { modal: true });
      $("sqClose").onclick = () => { UI.closeModal(); if (auto) flyHome(); else radio(cfg.radio.quizDone); };
    };
    show();
  }

  function flyHome() {
    if (!S.active || boarding) return;
    if (probe) { exit(); return; }
    $("fade").classList.add("on");
    setTimeout(() => {
      if (!S.active || boarding) { $("fade").classList.remove("on"); return; }
      if (chal) endChallenge();
      if (view.special) { view.special = null; $("scope").classList.add("hidden"); $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping", "driving"); }
      experiment = null; world.astronaut.visible = true; resetJoy();
      const R = 3.4, x = HATCH.x * R, z = HATCH.z * R;
      ast.pos.set(x, world.height(x, z), z); ast.vy = ast.speed = 0; ast.onGround = true; ast.jumping = ast.hopping = false;
      ast.heading = view.yaw = Math.atan2(-HATCH.x, -HATCH.z);
      if (guide) { // Nora steht neben dem Kind und steigt zuerst ein
        const n = guide.n, a = HATCH.a + 0.55, nx = Math.sin(a) * 3.1, nz = Math.cos(a) * 3.1;
        n.obj.visible = true; n.climbY = null; n.talk = 0; n.obj.position.set(nx, world.height(nx, nz), nz);
      }
      const ca = HATCH.a + 0.45;
      world.camera.position.set(Math.sin(ca) * 9.5, world.hatchY + 2.6, Math.cos(ca) * 9.5);
      view.look.set(HATCH.x * 1.6, world.hatchY + 3.3, HATCH.z * 1.6); world.camera.lookAt(view.look);
      startBoarding();
      $("fade").classList.remove("on");
    }, 520);
  }

  // ---------- Eingabe ----------
  let inputReady = false, resetJoy = () => {};
  function setupInput() {
    if (inputReady) return; inputReady = true;
    window.addEventListener("keydown", (e) => {
      if (!S.active || e.target.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
      // Leertaste = springen – nicht aus Versehen den zuletzt getippten Knopf (z. B. „Allein erkunden“) auslösen
      if (k === " " && document.activeElement && document.activeElement.tagName === "BUTTON") document.activeElement.blur();
      keys[k] = true;
      if (k === " " && !e.repeat) jumpPressed = true;
      if (k === "e" && !e.repeat) actionPressed = true;
    });
    window.addEventListener("keyup", (e) => { if (S.active && e.key === " " && e.target.tagName !== "INPUT") e.preventDefault(); keys[e.key.toLowerCase()] = false; });
    window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

    // Joystick
    const pad = $("sJoy"), knob = $("sJoyKnob"); let id = null;
    const move = (e) => {
      const r = pad.getBoundingClientRect();
      let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      joy.x = x; joy.y = y; knob.style.transform = `translate(${x * 38}px, ${y * 38}px)`;
    };
    pad.addEventListener("pointerdown", (e) => { id = e.pointerId; try { pad.setPointerCapture(id); } catch (err) { /* egal */ } move(e); });
    pad.addEventListener("pointermove", (e) => { if (e.pointerId === id) move(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; knob.style.transform = ""; };
    pad.addEventListener("pointerup", end); pad.addEventListener("pointercancel", end);
    // Wird der Joystick ausgeblendet, während ein Finger darauf liegt, kommt kein „losgelassen“ mehr an → von Hand zurücksetzen
    resetJoy = () => { id = null; joy.x = joy.y = 0; knob.style.transform = ""; };
    $("sJump").addEventListener("pointerdown", (e) => { e.preventDefault(); jumpPressed = true; });
    $("surfAction").addEventListener("click", () => { actionPressed = true; });
    $("btnDisc").addEventListener("click", showFound);
    $("btnProbeBack").addEventListener("click", () => { if (probe && !UI.modalOpen()) { Sound.click(); exit(); } });

    // Kamera per Wischen/Ziehen drehen und neigen
    const canvas = $("scene"); let drag = null;
    canvas.addEventListener("pointerdown", (e) => { if (S.active) drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    window.addEventListener("pointermove", (e) => {
      if (!S.active || !drag || drag.id !== e.pointerId) return;
      if (view.special) {
        // Fernrohr schwenken: der Himmel wandert mit dem Finger mit
        const k = 0.52 / innerHeight;
        if (view.special.phase === "aim") { view.special.yaw += (e.clientX - drag.x) * k; view.special.pitch += (e.clientY - drag.y) * k; }
      } else {
        view.yaw -= (e.clientX - drag.x) * 0.006;
        view.height = Math.max(0.8, Math.min(9, view.height + (e.clientY - drag.y) * 0.02));
        view.dragged = 1.5;
      }
      drag.x = e.clientX; drag.y = e.clientY;
    });
    window.addEventListener("pointerup", (e) => { if (drag && drag.id === e.pointerId) drag = null; });
  }

  // ---------- Betreten / Verlassen ----------
  S.init = function (game, worldRef, ui) { G = game; W = worldRef; UI = ui; };

  S.prepare = async function (id) {
    if (worlds[id] || D.surfaces[id].probe) return; // Sonden-Welten sind schnell gebaut und brauchen keinen Astronauten
    astronautModel = await loadAstronautModel();
    await loadKit();
    const nasa = (D.surfaces[id].nasa || []).filter((n) => n !== "perseverance" || !W.fast); // der große Rover nur bei „✨ Schön“
    if (nasa.some((n) => !(n in NASA))) UI.toast("🛰️ Lade die Station …");
    await loadNasa(nasa);
    // Mitbewohner der Station (je ein eigenes Astronauten-Modell)
    npcModels = [];
    for (let i = 0; i < ((D.surfaces[id].npcs || []).length); i++) npcModels.push(await loadExtraAstronaut());
    noraModel = D.surfaces[id].guide ? await loadExtraAstronaut() : null; // Nora steigt mit aus
    bodyId = id; cfg = D.surfaces[id];
    worlds[id] = SITES[id].build();
  };
  let npcModels = [], noraModel = null;

  S.enter = function (id, exitCb) {
    bodyId = id; cfg = D.surfaces[id]; onExit = exitCb; site = SITES[id];
    Voice.prefetch(id);
    if (cfg.probe) { enterProbe(); return; }
    probe = null; $("surfaceHud").classList.remove("probing"); $("suitIcon").textContent = "🌡️";
    if (!worlds[id]) worlds[id] = site.build();
    world = worlds[id];
    S.scene = world.scene; S.camera = world.camera;
    W.renderer.shadowMap.enabled = true;
    W.renderer.shadowMap.type = THREE.PCFShadowMap;
    setupInput();
    S.resize();
    // Astronaut steht neben der Rakete, Blick zu den Stationen
    const [sx, sz] = world.L.spawn;
    ast.pos.set(sx, world.height(sx, sz), sz); ast.vy = 0; ast.onGround = true; ast.heading = 0.3; ast.speed = 0; ast.walked = 0; ast.jumping = ast.hopping = false;
    view.yaw = ast.heading; view.height = 3.2; view.special = null; view.dragged = 0;
    view.look.set(sx, ast.pos.y + 1.3, sz + 3);
    world.camera.position.set(sx - Math.sin(view.yaw) * 7, ast.pos.y + 3.2, sz - Math.cos(view.yaw) * 7);
    temp = { shown: cfg.temp.sun, inShadow: false, shadowTime: 0, sunSeen: true, check: 0 };
    quizDone = (G.state.surfaceQuiz && G.state.surfaceQuiz[id] != null) || false;
    experiment = null; boarding = null; jumpPressed = actionPressed = false;
    world.scene.add(world.astronaut); // holt den Astronauten aus dem zuletzt besuchten Ort hierher
    world.astronaut.visible = true; world.astronaut.scale.setScalar(1);
    world.hatch.userData.door.material.emissiveIntensity = 0.9;
    world.rocket.position.y = world.rocketY; world.hatch.position.y = world.hatchY;
    world.rocket.userData.flame.visible = false;
    for (const [key, st] of Object.entries(world.stations)) st.marker.visible = !cfg.stations[key].info;
    scaleShown = "";
    setSun(0);
    $("scope").classList.add("hidden"); $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping", "driving");
    world.camera.fov = 60; world.camera.updateProjectionMatrix();
    site.reset(); // alles zurückstellen, was nur dieser Ort hat
    const rig = world.astronaut.userData.rig;
    if (rig) setSuitAccent(rig, G.state.color);
    updateCounter();
    buildLabels();
    $("surfaceHud").classList.remove("hidden");
    S.active = true;
    const rest = cfg.discoveries.length - foundCount();
    const first = foundCount() === 0;
    setupGuide();
    if (rest === 0 && !quizDone) setTimeout(() => { if (S.active) quizSoon(); }, 2500);
    else if (!guide || !guide.on) setTimeout(() => { if (S.active) radio(rest === 0 ? cfg.radio.quizDone : first ? cfg.radio.start : cfg.radio.back, { rest }); }, 700);
  };

  function exit() {
    $("guideBtn").classList.add("hidden"); guide = null;
    if (!S.active) return;
    S.active = false; probe = null;
    Sound.engine(0); Sound.wind(0); Voice.stop();
    if (chal) endChallenge();
    compassShown = ""; $("surfCompass").classList.add("hidden");
    $("surfaceHud").classList.add("hidden");
    $("surfLabels").innerHTML = "";
    if (onExit) onExit();
  }
  S.exit = exit;

  S.resize = function () {
    if (!world) return;
    world.camera.aspect = innerWidth / innerHeight;
    world.camera.updateProjectionMatrix();
  };

  // Namensschilder über den Stationen
  const labelEls = {};
  function buildLabels() {
    const host = $("surfLabels"); host.innerHTML = "";
    for (const key of Object.keys(world.stations)) {
      const el = document.createElement("div"); el.className = "label surf-label";
      host.appendChild(el); labelEls[key] = el;
    }
    for (const n of world.npcs || []) { // Sprechblasen der Mitbewohner
      n.el = document.createElement("div"); n.el.className = "label npc-bubble" + (n.isNora ? " nora-bubble" : ""); n.el.style.display = "none";
      host.appendChild(n.el);
    }
  }

  // ---------- pro Bild ----------
  const tmp = new V(), tmp2 = new V(), ray = new THREE.Raycaster();
  // Kamera nicht hinter Wände und in Gebäude stellen: große, feste Teile der Welt (einmal je Ort gesammelt –
  // keine dünnen Masten, keine flachen Dinge, nichts Durchsichtiges)
  const camRay = new THREE.Raycaster(), camHead = new V(), camDir = new V();
  function camBlockers() {
    if (world.camBlock) return world.camBlock;
    const list = [], box = new THREE.Box3(), size = new V();
    world.scene.updateMatrixWorld(true);
    world.scene.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.visible) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || m.userData.noCam) return;
      box.setFromObject(o).getSize(size);
      const wide = Math.max(size.x, size.z);
      if (wide >= 1.5 && wide < 200 && size.y >= 1.8) list.push(o);
    });
    return (world.camBlock = list);
  }
  S.update = function (dt, elapsed) {
    if (!S.active || !world) return;
    if (probe) { updateProbe(dt, elapsed); return; }
    const H = world.height, g = cfg.moveGravity || cfg.gravity;
    const paused = UI.modalOpen();

    // Eingabe → Bewegungsrichtung relativ zur Kamera
    let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x;
    let my = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
    const busy = paused || !!boarding;
    if (view.special) {
      // Im Fernrohr steuern Joystick/Tasten das Fernrohr, „E“ drückt den leuchtenden Knopf
      view.special.ix = mx; view.special.iy = my;
      if (actionPressed) { actionPressed = false; const b = $("scopeBtns").querySelector(".primary"); if (b) b.click(); }
    }
    if (busy || view.special || experiment) { mx = my = 0; jumpPressed = false; }
    const len = Math.hypot(mx, my);
    const fwd = tmp.set(Math.sin(view.yaw), 0, Math.cos(view.yaw));
    const right = tmp2.set(-Math.cos(view.yaw), 0, Math.sin(view.yaw));
    // Apollo-Astronauten liefen im „Lope“ mit etwa 1 bis 2 m/s – fürs Spiel etwas flotter
    const LOPE_SPEED = 3.8;
    const lowG = g < 3; // Mond, Pluto: Hüpf-Galopp wie die Apollo-Astronauten – sonst normales Laufen
    let targetSpeed = 0;
    if (len > 0.12) {
      const mvx = fwd.x * my + right.x * mx, mvz = fwd.z * my + right.z * mx;
      const th = Math.atan2(mvx, mvz);
      // Drehen geht nur mit Bodenkontakt richtig – in der Luft kaum
      ast.heading = angleLerp(ast.heading, th, 1 - Math.exp(-dt * (ast.onGround ? 6 : 1.2)));
      targetSpeed = LOPE_SPEED * Math.min(1, len);
      if (my > -0.3 && !(view.dragged > 0)) view.yaw = angleLerp(view.yaw, ast.heading, 1 - Math.exp(-dt * 1.4));
    }
    view.dragged = Math.max(0, (view.dragged || 0) - dt);
    // Wenig Halt auf dem Mondstaub: beschleunigen/bremsen nur am Boden – und gemächlich
    const grip = site.grip ? site.grip() : 1; // auf glattem Eis rutscht man: langsam anfahren, kaum bremsen
    if (ast.onGround) ast.speed += (targetSpeed - ast.speed) * Math.min(1, dt * grip * (targetSpeed > ast.speed ? (lowG ? 3.0 : 4.2) : 3.4));
    const hx = Math.sin(ast.heading), hz = Math.cos(ast.heading);
    const ox = ast.pos.x, oz = ast.pos.z, oh = H(ox, oz);
    ast.pos.x += hx * ast.speed * dt; ast.pos.z += hz * ast.speed * dt;

    // Hindernisse & Grenze
    if (!boarding) for (const [cx, cz, r] of world.colliders) {
      const dx = ast.pos.x - cx, dz = ast.pos.z - cz, d = Math.hypot(dx, dz), min = r + 0.45;
      if (d < min && d > 0.001) { ast.pos.x = cx + (dx / d) * min; ast.pos.z = cz + (dz / d) * min; }
    }
    // Steilwände (Klippen, Kraterwände) kann man nicht hochlaufen – dafür gibt es Rampen und Wege
    // (Grenze in Höhe pro Meter – gleich bei jeder Bildrate und gleich für Nora, siehe navGrid)
    if (!boarding && ast.onGround && H(ast.pos.x, ast.pos.z) - oh > Math.max(0.015, Math.hypot(ast.pos.x - ox, ast.pos.z - oz) * MAX_SLOPE)) { ast.pos.x = ox; ast.pos.z = oz; ast.speed *= 0.5; }
    const far = Math.hypot(ast.pos.x, ast.pos.z);
    if (far > 150) {
      ast.pos.x *= 150 / far; ast.pos.z *= 150 / far;
      if (elapsed - farWarned > 12) { farWarned = elapsed; radio(cfg.radio.tooFar); }
    }

    // Springen & Lope-Schritte – mit moveGravity (etwas stärker als die echte Mond-Schwerkraft, fühlt sich weniger zäh an)
    const ground = H(ast.pos.x, ast.pos.z);
    // Springen geht auch mitten in einem kleinen Lauf-Hüpfer (sonst wird die Leertaste beim Laufen oft „verschluckt“)
    if (jumpPressed && (ast.onGround || (ast.hopping && ast.pos.y - ground < 0.2))) {
      // Anzug + Rucksack wiegen so viel wie ein Erwachsener → auf dem Mond ca. 45 cm hoch, gut 1 s in der Luft (cfg.jump = Höhe in m)
      ast.vy = Math.sqrt(2 * g * cfg.jump); ast.onGround = false; ast.jumpBase = ast.pos.y; ast.maxY = ast.pos.y; ast.jumping = true; ast.hopping = false;
      ast.jumpFrom = [ast.pos.x, ast.pos.z];
      ast.airT = 0; ast.airDur = 2 * ast.vy / g;
      Sound.whoosh();
      grains(ast.pos, 8, 0.6);
    } else if (lowG && ast.onGround && ast.speed > 0.7 && (ast.contact || 0) > 0.18 && !paused) {
      // Lope-Schritt: ein kleiner, echter Flug – so haben sich die Apollo-Astronauten fortbewegt
      const hop = 0.05 + 0.05 * Math.min(1, ast.speed / LOPE_SPEED);
      ast.vy = Math.sqrt(2 * g * hop); ast.onGround = false; ast.hopping = true;
      ast.airT = 0; ast.airDur = 2 * ast.vy / g;
      grains(tmp.set(ast.pos.x - hx * 0.25, ast.pos.y, ast.pos.z - hz * 0.25), 3, 0.9, -hx, -hz);
    }
    jumpPressed = false;
    if (!ast.onGround) {
      ast.airT += dt;
      ast.vy -= g * dt; ast.pos.y += ast.vy * dt; ast.maxY = Math.max(ast.maxY, ast.pos.y);
      if (ast.pos.y <= ground) {
        ast.pos.y = ground; ast.onGround = true; ast.vy = 0; ast.contact = 0;
        if (ast.hopping) {
          ast.hopping = false;
          footprint(0.17); footprint(-0.17, -0.35);
          grains(ast.pos, 3, 0.5, -hx, -hz);
        }
        if (ast.jumping) {
          ast.jumping = false;
          grains(ast.pos, 14, 0.8);
          footprint(0.17); footprint(-0.17);
          Sound.land();
          // Höhe aus dem Absprung berechnen (gemessen wäre sie auf langsamen Geräten zu klein – die Erde springt nur 11 cm)
          const h = Math.max(ast.maxY - ast.jumpBase, cfg.jump);
          const jump = { hoehe: `${Math.round(h * 100)} Zentimeter`, zeit: Math.max(ast.airT, ast.airDur).toFixed(1).replace(".", ",") };
          const real = Math.abs(ast.pos.y - ast.jumpBase) < Math.max(0.25, cfg.jump * 0.6); // an einem steilen Hang zählt ein Sprung nicht
          const far = Math.hypot(ast.pos.x - ast.jumpFrom[0], ast.pos.z - ast.jumpFrom[1]);
          if (bodyId === "mond" && far > 2.2 && moonMoatK(ast.jumpFrom[0], ast.jumpFrom[1]) < 0.05 && Math.hypot(ast.pos.x - world.L.mondstein[0], ast.pos.z - world.L.mondstein[1]) < MOAT_R[0]) {
            const msg = `🦘 Über den Graben: ${far.toFixed(1).replace(".", ",")} m weit! Auf der Erde wären es nur ${(far * cfg.gravity / 9.81).toFixed(1).replace(".", ",")} m gewesen.`;
            const show = () => (UI.modalOpen() ? setTimeout(show, 500) : UI.toast(msg, "gold")); setTimeout(show, 700); // erst nach der Entdeckungskarte
            Sound.correct();
          } else if (real && (foundMap().sprung || !cfg.discoveries.some((d) => d.key === "sprung"))) UI.toast(`🦘 ${jump.hoehe} hoch · ${jump.zeit} Sekunden in der Luft`, "gold");
          else if (real) discover("sprung", jump);
        }
      }
    } else {
      ast.contact = (ast.contact || 0) + dt;
      ast.pos.y += (ground - ast.pos.y) * Math.min(1, dt * 12);
    }

    // Gehen oder Laufen? (mit etwas Spielraum, damit die Bewegung an der Grenze nicht hin und her springt)
    ast.run = ast.speed > 1.75 || (!!ast.run && ast.speed > 1.45);
    // Gehen und Laufen (ohne Hüpfer): Fußabdrücke nach Strecke, beim Laufen ein wenig Staub
    if (ast.onGround && !ast.hopping && ast.speed > 0.15 && (!lowG || ast.speed <= 0.7)) {
      ast.walked += ast.speed * dt;
      if (ast.walked > (ast.run ? 0.95 : 0.55)) {
        ast.walked = 0; ast.foot = 1 - ast.foot; footprint(ast.foot ? 0.17 : -0.17);
        if (ast.run && bodyId !== "erde") grains(tmp.set(ast.pos.x - hx * 0.2, ast.pos.y, ast.pos.z - hz * 0.2), 2, 0.5, -hx, -hz);
      }
    }

    if (boarding) updateBoarding(dt);

    // Astronaut darstellen
    const a = world.astronaut, u = a.userData;
    const speedFrac = boarding ? 0.8 : Math.min(1, ast.speed / LOPE_SPEED);
    // Schrittfrequenz wie beim echten Gehen (1,6 bis 2 Schritte pro Sekunde) und Laufen (bis gut 3 Schritte pro Sekunde)
    const walkK = Math.min(1, ast.speed / 1.6);
    ast.phase += dt * (boarding ? 6 : lowG ? 1.5 + ast.speed * 3 : ast.run ? 1.4 + ast.speed * 2.3 : Math.PI * (1.4 + 0.4 * walkK));
    const running = !boarding && !lowG && ast.onGround && ast.run && !ast.jumping;
    a.position.set(ast.pos.x, ast.pos.y + (running ? (Math.abs(Math.sin(ast.phase)) - 0.45) * 0.09 * speedFrac : 0), ast.pos.z); // beim Laufen leicht auf und ab
    a.rotation.y = ast.heading;
    const hold = !!(experiment && experiment.t < 0.15);
    if (u.rig) {
      const mode = boarding ? (boarding.phase === "walk" ? "walk" : boarding.phase === "climb" ? "climb" : "stand")
        : ast.jumping ? "jump" : lowG && (ast.hopping || (ast.speed > 0.7 && ast.onGround)) ? "lope" : ast.run ? "run" : ast.speed > 0.15 ? "walk" : "stand";
      poseRig(u.rig, { mode, air: !ast.onGround, airP: ast.airDur ? Math.min(1, ast.airT / ast.airDur) : 0, contact: ast.contact || 0,
        speed: mode === "walk" && !boarding ? walkK : speedFrac, phase: ast.phase, hold, t: elapsed });
    } else {
      const sw = ast.onGround ? Math.sin(ast.phase) * 0.45 * speedFrac : 0.35;
      u.legL.rotation.x = sw; u.legR.rotation.x = ast.onGround ? -sw : -0.2;
      u.armL.rotation.x = -sw * 0.5 - (ast.onGround ? 0 : 0.6); u.armR.rotation.x = sw * 0.5 - (ast.onGround ? 0 : 0.6);
      u.armL.rotation.z = 0.12; u.armR.rotation.z = -0.12;
      if (experiment) { const hd = experiment.t < 0 ? -1.25 : -0.9; u.armL.rotation.x = hd; u.armR.rotation.x = hd; u.armL.rotation.z = 0.3; u.armR.rotation.z = -0.3; }
    }

    // Schatten & Temperatur (Raumanzug-Thermometer): Gebäude und Felsen – und das Gelände selbst (Kraterrand, Hügel)
    temp.check -= dt;
    if (temp.check <= 0) {
      temp.check = 0.2;
      ray.set(tmp.copy(ast.pos).setY(ast.pos.y + 1.2), SUN_DIR);
      ray.far = 200;
      temp.inShadow = ray.intersectObjects(world.shadowCasters, true).length > 0 || terrainShade(tmp, SUN_DIR);
    }
    const target = temp.inShadow ? cfg.temp.shade : cfg.temp.sun;
    temp.shown += (target - temp.shown) * Math.min(1, dt * 1.2);
    if (temp.inShadow) temp.shadowTime += dt; else { temp.shadowTime = 0; temp.sunSeen = true; }
    const ts = world.stations.temperatur;
    if (ts && !cfg.stations.temperatur.action && temp.inShadow && temp.shadowTime > 1.5 && !busy && Math.hypot(ast.pos.x - ts.x, ast.pos.z - ts.z) < ts.zone) discover("temperatur");
    updateChallenge(dt, busy);
    const t = Math.round(temp.shown);
    const tEl = $("suitTemp");
    const tText = (t < 0 ? "−" : "") + Math.abs(t) + " °C";
    if (tEl.textContent !== tText) tEl.textContent = tText;
    $("suit").classList.toggle("cold", t < 0);
    $("suitState").textContent = temp.inShadow ? cfg.temp.shadeText : cfg.temp.sunText;

    // Stationen: Nähe prüfen
    let near = null, nearText = "";
    for (const [key, st] of Object.entries(world.stations)) {
      const sc = cfg.stations[key], d = Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z);
      // Stationen ohne eigene Aktion: nach der Entdeckung kann man sie sich dort nochmal ansehen
      if (sc.auto && d < st.zone && !busy && !view.special && !experiment) discover(key); // Fundstück: in den Kreis treten genügt
      const text = sc.action || (sc.again && foundMap()[key] ? sc.again : "");
      if (text && d < st.zone) { near = key; nearText = text; }
    }
    if (!near && chal && chal.kind === "safari" && !chal.done) { near = "photo"; nearText = cfg.safari.btn; }
    if (guide && !guide.on && !near && Math.hypot(ast.pos.x - guide.n.obj.position.x, ast.pos.z - guide.n.obj.position.z) < 3.2) { near = "guide"; nearText = cfg.guide.again; }
    const act = $("surfAction");
    if (near && !experiment && !view.special && !busy) {
      act.classList.remove("hidden");
      const html = `${nearText} <kbd>E</kbd>`;
      if (act.innerHTML !== html) act.innerHTML = html;
      if (actionPressed) startAction(near);
    } else act.classList.add("hidden");
    actionPressed = false;

    updateGuide(dt, busy);
    site.update(dt, busy, elapsed);
    updateScaleDisplay();
    updateDust(dt);
    radioTimer -= dt; if (radioTimer <= 0) $("radio").classList.add("hidden");

    // Licht folgt dem Astronauten (scharfe Schatten in der Nähe)
    world.sun.target.position.copy(ast.pos);
    world.sun.position.copy(ast.pos).addScaledVector(sunNow, 120);

    if (radioTimer < 1 && Voice.speaking(radioVoice)) radioTimer = 1; // Funkspruch bleibt, solange er vorgelesen wird
    updateCamera(dt);
    updateLabels();
    // Raketen-Markierung erst zeigen, wenn man sich entfernt hat (oder heim soll) – direkt nach der Landung stört sie nur
    const rk = world.stations.rakete;
    if (rk && !boarding && !view.special && !experiment) rk.marker.visible = Math.hypot(ast.pos.x - rk.x, ast.pos.z - rk.z) > 10 || quizDone || (guide && guide.on && guide.key === "rakete");
    animateMarkers(elapsed);
    updateCompass();
  };

  // ---------- Spielaufgaben, bei denen man frei herumläuft (Anzeige oben: #chalHud) ----------
  let chal = null;
  // good = viel ist gut (Batterie, Signal, Fotos: rot → grün); sonst viel ist schlecht (Hitze: grün → rot)
  function chalHud(label, f, info, hot, good) {
    const h = $("chalHud"); h.classList.remove("hidden"); h.classList.toggle("hot", !!hot); h.classList.toggle("good", !!good);
    if ($("chalLabel").textContent !== label) $("chalLabel").textContent = label;
    $("chalFill").style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + "%";
    if ($("chalInfo").textContent !== (info || "")) $("chalInfo").textContent = info || "";
  }
  function endChallenge() { if (chal && chal.kind === "safari") safariUi(false); chal = null; $("chalHud").classList.add("hidden"); }
  function chalSay(text) { if (guide && guide.on && guide.n.obj.visible) guideSay(text); else radio(text); }
  // Erde: Foto-Safari – Lebewesen in die Bildmitte nehmen und fotografieren; fünf verschiedene Arten sind das Ziel
  let cardExtra = null; // Zusatz für die nächste Entdeckungskarte (die Safari-Fotos)
  function startSafari() {
    chal = { kind: "safari", got: {}, list: [], cool: 0, t: 0, lastPhoto: 0, tipped: false, done: false };
    world.stations.wald.marker.visible = false;
    safariUi(true); chalSay(cfg.safari.start); Sound.click();
  }
  function safariUi(on) {
    let vf = $("viewfinder"), pol = $("polaroids");
    if (on && !vf) {
      vf = document.createElement("div"); vf.id = "viewfinder"; vf.className = "viewfinder"; vf.innerHTML = "<i></i><i></i><i></i><i></i><b></b>"; document.body.appendChild(vf);
      pol = document.createElement("div"); pol.id = "polaroids"; pol.className = "polaroids"; document.body.appendChild(pol);
    }
    if (vf) vf.classList.toggle("hidden", !on);
    if (pol) { pol.classList.toggle("hidden", !on); if (on) pol.innerHTML = ""; }
  }
  // Welches Lebewesen ist gerade in der Bildmitte? Noch nicht Fotografiertes hat Vorrang.
  const inside = (o, root) => { for (; o; o = o.parent) if (o === root) return true; return false; };
  function safariAim() {
    const cam = world.camera, p = new V(); let best = null, bs = Infinity, blocked = false;
    const walls = [world.trees, world.station, world.rollRoof, world.jetty].filter(Boolean);
    for (const L of world.life) {
      if (!L.obj.visible) continue;
      L.obj.getWorldPosition(p); p.y += L.h;
      const dist = p.distanceTo(ast.pos); if (dist > (L.far || 18)) continue;
      tmp.copy(p).project(cam); if (tmp.z > 1 || Math.abs(tmp.x) > 0.4 || tmp.y < -0.6 || tmp.y > 0.8) continue;
      const s = Math.hypot(tmp.x, tmp.y * 0.8) + (chal.got[L.kind] ? 2 : 0) + dist * 0.004 + (L.kind === "baum" ? 0.3 : L.kind === "blume" ? 0.12 : 0);
      if (s >= bs) continue;
      // steht etwas davor? (vom Helm des Astronauten aus gesehen; der eigene Baum zählt natürlich nicht)
      const eye = safariEye(), d = p.distanceTo(eye); ray.set(eye, tmp2.copy(p).sub(eye).normalize()); ray.far = d - L.size * 0.4;
      const hit = ray.intersectObjects(walls, true).find((h) => !inside(h.object, L.obj));
      if (hit) { blocked = true; continue; }
      bs = s; best = L;
    }
    return best || (blocked ? "blocked" : null);
  }
  // Bild aus der Szene (Mitte, 4:3) als kleines Foto
  const safariEye = () => new V(ast.pos.x, ast.pos.y + 1.65, ast.pos.z); // Helmkamera
  function snapshot(L) {
    const cam = world.camera, fov = cam.fov, q = cam.quaternion.clone(), at = cam.position.clone(), p = new V();
    L.obj.getWorldPosition(p); p.y += L.h;
    cam.position.copy(safariEye());
    const d = cam.position.distanceTo(p);
    cam.lookAt(p); cam.fov = Math.max(6, Math.min(50, 2 * Math.atan((L.size * 0.75) / d) * 57.3)); cam.updateProjectionMatrix();
    const astro = world.astronaut.visible; world.astronaut.visible = false;
    W.renderer.render(world.scene, cam);
    const src = W.renderer.domElement, cw = src.width, ch = src.height, s = Math.min(cw / 4, ch / 3);
    const cv = document.createElement("canvas"); cv.width = 240; cv.height = 180;
    cv.getContext("2d").drawImage(src, cw / 2 - 2 * s, ch / 2 - 1.5 * s, 4 * s, 3 * s, 0, 0, 240, 180);
    world.astronaut.visible = astro; cam.position.copy(at); cam.fov = fov; cam.quaternion.copy(q); cam.updateProjectionMatrix();
    try { return cv.toDataURL("image/jpeg", 0.82); } catch (e) { return ""; }
  }
  function polaroidHtml(url, text, r) { return `<div class="polaroid" style="--r:${r}deg">${url ? `<img src="${url}" alt="">` : ""}<span>${text}</span></div>`; }
  function takePhoto() {
    const T = cfg.safari, c = chal;
    if (!c || c.kind !== "safari" || c.cool > 0 || c.done) return;
    c.cool = 0.7; Sound.shutter();
    const fl = document.createElement("div"); fl.className = "snap-flash"; document.body.appendChild(fl); setTimeout(() => fl.remove(), 500);
    const hit = safariAim();
    if (!hit || hit === "blocked") { UI.toast(hit ? T.blocked : T.none); return; }
    const [icon, name] = T.kinds[hit.kind];
    if (c.got[hit.kind]) { UI.toast(fmtVars(T.twice, { name: `${icon} ${name}` })); return; }
    const url = snapshot(hit);
    c.got[hit.kind] = url || true; c.list.push(hit.kind); c.lastPhoto = c.t;
    const r = [-4, 3, -2, 4, -3][(c.list.length - 1) % 5];
    $("polaroids").insertAdjacentHTML("beforeend", polaroidHtml(url, `${icon} ${name}`, r));
    Sound.collect(); chalSay(T.says[hit.kind]);
    if (c.list.length >= 5) { // geschafft: kurz die Fotos zeigen, dann die Entdeckung – mit allen fünf Polaroids
      c.done = true; Sound.correct(); UI.confetti(80);
      cardExtra = { key: "wald", html: `<div class="disc-polaroids">${c.list.map((k, i) => polaroidHtml(typeof c.got[k] === "string" ? c.got[k] : "", `${T.kinds[k][0]} ${T.kinds[k][1]}`, [-4, 3, -2, 4, -3][i])).join("")}</div>` };
      setTimeout(() => { if (chal === c) { endChallenge(); world.stations.wald.marker.visible = true; discover("wald"); } }, 1100);
    }
  }
  function updateSafari(dt, busy) {
    const T = cfg.safari, c = chal, n = c.list.length;
    c.cool -= dt; if (!busy) c.t += dt;
    $("viewfinder").classList.toggle("hidden", !!(view.special || experiment || boarding || UI.modalOpen() || c.done));
    chalHud(fmtVars(T.label, { n }), n / 5, [...c.list.map((k) => T.kinds[k][0]), ...Array(Math.max(0, 5 - n)).fill("❓")].join(" "), false, true);
    if (!c.tipped && c.t - c.lastPhoto > 40) { c.tipped = true; chalSay(T.tip); }
  }
  function updateChallenge(dt, busy) {
    if (!chal) return;
    if (chal.kind === "safari") updateSafari(dt, busy);
    else if (chal.kind === "shadow") updateShadowRun(dt, busy);
    else if (chal.kind === "radar") updateRadar(dt, busy);
  }
  // Venus: Radar-Suche nach Venera 13. Signal = wie nah; alle paar Sekunden „wärmer“/„kälter“; nach einer Weile ein Richtungstipp.
  function startRadar() {
    chal = { kind: "radar", cool: 1, beep: 0, last: null, lastAt: 0, t: 0, hint: "" };
    world.stations.venera.marker.visible = false;
    chalSay(cfg.radar.start); Sound.click();
  }
  function updateRadar(dt, busy) {
    const T = cfg.radar, c = chal, [vx, vz] = world.L.venera;
    if (busy) return;
    c.t += dt;
    const d = Math.hypot(ast.pos.x - vx, ast.pos.z - vz), sig = Math.max(0, Math.min(1, 1 - (d - 4) / 55));
    c.cool = Math.max(0, c.cool - dt / 100); // gut anderthalb Minuten Kühlung
    if (c.t > 24) { // Richtungstipp: von wo kommt das Signal (vom Blick der Kamera aus)?
      const rel = angleLerp(0, Math.atan2(vx - ast.pos.x, vz - ast.pos.z) - view.yaw, 1);
      c.hint = fmtVars(T.hint, { dir: T.dirs[((Math.round(-rel / (Math.PI / 4)) % 8) + 8) % 8] });
    }
    chalHud(T.label, sig, fmtVars(T.cool, { n: Math.round(c.cool * 100) }) + (c.hint ? " · " + c.hint : ""), c.cool < 0.25, true);
    c.beep -= dt;
    if (c.beep <= 0) { c.beep = 0.16 + (1 - sig) * 1.3; Sound.ping(520 + sig * 760); } // je näher, desto schneller und höher
    if (c.t - c.lastAt > 5) { // wärmer oder kälter?
      if (c.last != null) { if (d < c.last - 3) UI.toast(T.warmer); else if (d > c.last + 3) UI.toast(T.colder); }
      c.last = d; c.lastAt = c.t;
    }
    if (d < 4.4) { endRadar(true); return; }
    const [rx, rz] = world.L.radar;
    if (c.cool <= 0) { // Kühlung leer: zurück zum Peiler
      Sound.wrong(); chalSay(T.hot);
      const st = world.stations.venera; ast.pos.set(st.x - 1.5, world.height(st.x - 1.5, st.z + 1.5), st.z + 1.5); ast.speed = 0;
      c.cool = 1; c.last = null; c.lastAt = c.t;
      return;
    }
    if (Math.hypot(ast.pos.x - rx, ast.pos.z - rz) > 95) { endRadar(false); chalSay(T.quit); }
  }
  function endRadar(found) {
    endChallenge();
    world.stations.venera.marker.visible = true;
    if (found) { Sound.correct(); UI.confetti(80); UI.toast(cfg.radar.found, "gold"); discover("venera"); }
  }
  // Merkur: Schattenlauf – in der Sonne wird der Anzug heiß, im Schatten kühlt er ab
  function startShadowRun() {
    const run = world.run, T = cfg.shadowRun;
    chal = { kind: "shadow", heat: 0 };
    ast.pos.set(run.S[0], world.height(...run.S), run.S[1]); ast.speed = 0;
    ast.heading = view.yaw = Math.atan2(run.F[0] - run.S[0], run.F[1] - run.S[1]);
    world.finish.visible = true; world.stations.temperatur.marker.visible = false;
    chalSay(T.start); Sound.click();
  }
  function updateShadowRun(dt, busy) {
    const run = world.run, T = cfg.shadowRun;
    if (busy) return;
    chal.heat = Math.max(0, Math.min(1, chal.heat + (temp.inShadow ? -0.32 : 0.42) * dt));
    chalHud(T.label, chal.heat, temp.inShadow ? T.cool : T.sun, chal.heat > 0.7);
    const toGoal = Math.hypot(ast.pos.x - run.F[0], ast.pos.z - run.F[1]);
    if (toGoal < 1.6) { // geschafft: im Schatten des großen Felsens
      endChallenge(); world.finish.visible = false; world.stations.temperatur.marker.visible = true;
      Sound.correct(); UI.confetti(80); discover("temperatur"); return;
    }
    if (chal.heat >= 1) { // zu heiß: zurück zum Start
      Sound.wrong(); chalSay(T.hot);
      chal.heat = 0; ast.pos.set(run.S[0], world.height(...run.S), run.S[1]); ast.speed = 0;
      return;
    }
    // weit weg gelaufen: abbrechen
    const line = Math.hypot(ast.pos.x - (run.S[0] + run.F[0]) / 2, ast.pos.z - (run.S[1] + run.F[1]) / 2);
    if (line > 26) { endChallenge(); world.finish.visible = false; world.stations.temperatur.marker.visible = true; chalSay(T.quit); }
  }
  // Liegt ein Punkt im Schatten des Geländes? In Schritten zur Sonne hin prüfen, ob der Boden höher ist als der Sonnenstrahl
  function terrainShade(p, dir) {
    const H = world.height, hd = Math.hypot(dir.x, dir.z) || 1e-6, rise = dir.y / hd;
    for (let d = 1.5; d < 120; d += d < 20 ? 1 : 2.5) if (H(p.x + (dir.x / hd) * d, p.z + (dir.z / hd) * d) > p.y + d * rise) return true;
    return false;
  }
  function updateCamera(dt) {
    const c = world.camera;
    if (boarding) {
      // Schräg von hinten zuschauen, wie der Astronaut die Leiter hochsteigt
      // … und beim Start ein Stück zurückgehen und der Rakete nachschauen
      const a = HATCH.a + 0.45, launch = boarding.phase === "launch", dist = launch ? 17 : 9.5, g0 = world.hatchY;
      const cx = Math.sin(a) * dist, cz = Math.cos(a) * dist;
      c.position.lerp(tmp.set(cx, Math.max(g0, world.height(cx, cz)) + 2.6, cz), 1 - Math.exp(-dt * 2.5));
      if (launch) view.look.lerp(tmp2.set(0, g0 + 4 + (boarding.rise || 0), 0), 1 - Math.exp(-dt * 3));
      else view.look.lerp(tmp2.set(HATCH.x * 1.6, g0 + 3.3, HATCH.z * 1.6), 1 - Math.exp(-dt * 3));
      c.lookAt(view.look);
      return;
    }
    if (experiment) {
      // Nah heran: von der Seite zuschauen, wie Hammer und Feder fallen
      const hp = world.hammer.position, fp = world.feather.position;
      const mid = tmp2.set((hp.x + fp.x) / 2, experiment.ground + 0.85, (hp.z + fp.z) / 2);
      c.position.lerp(tmp.set(mid.x + experiment.fx * 3.4, experiment.ground + 1.1, mid.z + experiment.fz * 3.4), 1 - Math.exp(-dt * 3));
      view.look.lerp(mid, 1 - Math.exp(-dt * 4));
      c.lookAt(view.look);
      return;
    }
    if (view.special) { view.special.update(dt); return; }
    const dist = view.dist || 7.5;
    const want = tmp.set(ast.pos.x - Math.sin(view.yaw) * dist, ast.pos.y + view.height, ast.pos.z - Math.cos(view.yaw) * dist);
    want.y = Math.max(want.y, world.height(want.x, want.z) + 0.8);
    const rr = Math.hypot(want.x, want.z); // nicht in die Rakete hineinschauen (sie steht bei 0, 0)
    if (rr < 2.6 && want.y < world.rocketY + 11) { const k = 2.6 / (rr || 0.01); want.x *= k; want.z *= k; }
    c.position.lerp(want, 1 - Math.exp(-dt * 5));
    // nicht hinter Wände und in Gebäude: von Kopfhöhe zur Kamera schauen und vor dem ersten festen Teil bleiben
    camHead.set(ast.pos.x, ast.pos.y + 1.5, ast.pos.z);
    camDir.copy(c.position).sub(camHead);
    const camLen = camDir.length();
    if (camLen > 1.1) {
      camRay.set(camHead, camDir.divideScalar(camLen)); camRay.far = camLen;
      const hit = camRay.intersectObjects(camBlockers(), false)[0];
      if (hit) { // näher heran und dafür etwas höher – so schaut man über das Kind hinweg
        const d = Math.max(1, hit.distance - 0.35);
        c.position.copy(camHead).addScaledVector(camDir, d); c.position.y += (camLen - d) * 0.25;
      }
    }
    const lookY = ast.pos.y + 1.3 + Math.max(0, (1.6 - view.height)) * 2.5; // tief = nach oben schauen
    view.look.lerp(tmp2.set(ast.pos.x + Math.sin(view.yaw) * 3, lookY, ast.pos.z + Math.cos(view.yaw) * 3), 1 - Math.exp(-dt * 8));
    c.lookAt(view.look);
    if (Math.abs(c.fov - 60) > 0.1) { c.fov += (60 - c.fov) * Math.min(1, dt * 3); c.updateProjectionMatrix(); }
  }

  function startAction(key) {
    Sound.click();
    if (key === "rakete") { startBoarding(); return; }
    if (key === "wand") { showFound(); return; }
    if (key === "guide") { guideResume(); return; }
    if (key === "photo") { takePhoto(); return; }
    if (!cfg.stations[key].action) { discover(key, null, true); return; }
    if (key === "waage") startWeigh();
    else site.actions[key]();
  }
  // Hammer & Feder: beim ersten Mal erst vermuten lassen (Kamera bleibt stehen, solange die Frage offen ist)
  let fallGuess = null;
  function startFall() {
    const Q = cfg.fall && cfg.fall.guess;
    if (Q && !fallGuess) {
      view.special = { update: () => {} }; ast.speed = 0; resetJoy();
      $("surfaceHud").classList.add("scoping");
      askGuess(Q, "Hammer und Feder liegen auf dem Tisch. Gleich lässt du beide gleichzeitig los.", () => {
        fallGuess = { ok: view.special.guess === Q.c };
        view.special = null; $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping");
        dropFall();
      });
      return;
    }
    dropFall();
  }
  function dropFall() {
    {
      // Der Astronaut hält Hammer und Feder vor sich (wie Dave Scott 1971) und lässt beide gleichzeitig los
      const tb = world.table.position;
      ast.heading = Math.atan2(tb.x - ast.pos.x, tb.z - ast.pos.z) + Math.PI; // Rücken zum Tisch, Blick frei
      const fx = Math.sin(ast.heading), fz = Math.cos(ast.heading), rx = -fz, rz = fx;
      const cx = ast.pos.x + fx * 0.75, cz = ast.pos.z + fz * 0.75;
      const baseY = world.height(cx, cz);
      world.table.remove(world.hammer); world.table.remove(world.feather);
      world.scene.add(world.hammer, world.feather);
      world.hammer.rotation.set(0, ast.heading, 0.1); world.feather.rotation.set(0, ast.heading, -0.1);
      world.hammer.position.set(cx + rx * 0.4, baseY + 1.45, cz + rz * 0.4);
      world.feather.position.set(cx - rx * 0.4, baseY + 1.32, cz - rz * 0.4);
      experiment = { t: -1.0, y0: baseY + 1.12, ground: baseY, landed: false, fx, fz };
      world.stations.fallversuch.marker.visible = false;
    }
  }

  // ---------- Fernrohr: selbst die Erde suchen, Größen vergleichen, „Luft an / Luft aus“ ausprobieren ----------
  const SKY_AIR = new THREE.Color(0x5aa2e8);
  const ARROWS = ["➡️", "↗️", "⬆️", "↖️", "⬅️", "↙️", "⬇️", "↘️"];
  // a = 0: Mond (keine Luft, schwarzer Himmel) … a = 1: mit Luft wie auf der Erde (blauer Himmel, hellere Schatten)
  function applySky(a) {
    world.scene.background.setRGB(0, 0, 0).lerp(SKY_AIR, a);
    world.stars.material.opacity = 0.85 * (1 - a);
    world.ambient.intensity = 0.16 + 0.55 * a; world.hemi.intensity = 0.12 + 0.5 * a;
  }
  // Text und Knöpfe unter dem Fernrohr-Bild: buttons = [[Beschriftung, Funktion, hervorgehoben], …]
  // ---------- Erst vermuten, dann ausprobieren ----------
  // guess = { q, a: [Antworten], c: Nummer der richtigen } aus den Daten. Erst nach dem Tipp startet der Versuch (go).
  function askGuess(guess, ready, go) {
    const sp = view.special;
    if (!guess || sp.guessDone) { scopeSay(ready, [["▶ Los geht's", () => { scopeSay(ready); go(); }, true]]); return; }
    scopeSay(`${ready}\n\n🤔 ${guess.q}`, guess.a.map((txt, i) => [txt, () => { sp.guess = i; sp.guessQ = guess; scopeSay(ready); go(); }, false]));
  }
  // Ergebnis mit Rückmeldung zur Vermutung (nur beim ersten Durchgang)
  function guessed(text) {
    const sp = view.special; if (!sp || !sp.guessQ || sp.guessDone) return text;
    sp.guessDone = true;
    const ok = sp.guess === sp.guessQ.c;
    if (ok) UI.confetti(70);
    return (ok ? "✅ Richtig vermutet! " : "🤔 Gut überlegt – aber schau mal: ") + text;
  }
  function scopeSay(text, buttons) {
    $("scopeText").textContent = text;
    if (text) Voice.say(text, "nora");
    const host = $("scopeBtns"); host.innerHTML = "";
    for (const [label, fn, primary] of buttons || []) {
      const b = document.createElement("button");
      b.className = "btn " + (primary ? "primary" : "ghost"); b.textContent = label;
      b.onclick = () => { Sound.click(); fn(); };
      host.appendChild(b);
    }
    host.classList.toggle("hidden", !host.children.length);
    $("scopeUi").classList.remove("hidden");
  }
  function startScope() {
    const e = world.earthDir, yawE = Math.atan2(e.x, e.z), pitchE = Math.asin(e.y);
    // Das Fernrohr zeigt erst links an der Erde vorbei (rechts stünde der Felsen im Bild) – das Kind muss sie selbst finden
    view.special = { update: updateScope, phase: "aim", t: 0, yawE, pitchE, yaw: yawE + 0.5, pitch: pitchE - 0.2, lock: 0, air: 0, airOn: false, tried: 0, ix: 0, iy: 0, hint: "" };
    radioTimer = 0; $("radio").classList.add("hidden");
    world.telescope.visible = world.astronaut.visible = world.stations.himmel.marker.visible = false;
    $("surfaceHud").classList.add("scoping"); resetJoy(); ast.speed = 0;
    scopeSay(document.documentElement.classList.contains("touch-ui") ? cfg.scope.aimTouch : cfg.scope.aim);
  }
  function scopeCompare() {
    view.special.phase = "compare"; world.cmpMoon.visible = true;
    scopeSay(cfg.scope.compare, [[cfg.scope.next, scopeAir, true]]);
  }
  function scopeAir() {
    view.special.phase = "air"; world.cmpMoon.visible = false;
    scopeSay(cfg.scope.airIntro, [[cfg.scope.airOn, () => setAir(true), true]]);
  }
  function setAir(on) {
    const sp = view.special, T = cfg.scope;
    sp.airOn = on;
    if (on) sp.tried = 1; else if (sp.tried) sp.tried = 2;
    if (on) { Sound.whoosh(); scopeSay(T.airOnText, [[T.airOff, () => setAir(false), true]]); }
    else scopeSay(T.airOffText, [[T.airOn, () => setAir(true)], [T.done, endScope, true]]);
  }
  function endScope() {
    view.special = null;
    applySky(0);
    world.telescope.visible = world.astronaut.visible = world.stations.himmel.marker.visible = true;
    world.cmpMoon.visible = false;
    $("scope").classList.add("hidden"); $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping");
    world.camera.fov = 60; world.camera.updateProjectionMatrix();
    discover("himmel", null, true);
  }
  // Fernrohr selbst schwenken (Joystick, Tasten oder Wischen), bis das Ziel (sp.yawE/pitchE) im Fadenkreuz steht.
  // Liefert true, sobald es eingerastet ist. maxRight = wie weit man rechts am Ziel vorbeischwenken darf (Bogenmaß).
  function aimStep(sp, dt, T, maxRight = 1.1) {
    const c = world.camera;
    sp.yaw -= sp.ix * dt * 0.55; sp.pitch += sp.iy * dt * 0.55;
    if (sp.t > 25) { // die Bodenstation hilft beim Zielen, damit niemand hängen bleibt
      const k = Math.min(1, dt * 0.8);
      sp.yaw += angleLerp(0, sp.yawE - sp.yaw, 1) * k; sp.pitch += (sp.pitchE - sp.pitch) * k;
    }
    // nicht zu weit wegschwenken: höchstens ein Stück links/rechts vom Ziel, nicht unter den Horizont
    const dYaw = Math.max(-1.1, Math.min(maxRight, angleLerp(0, sp.yawE - sp.yaw, 1)));
    sp.yaw = sp.yawE - dYaw;
    sp.pitch = Math.max(0.03, Math.min(1.25, sp.pitch));
    const dPitch = sp.pitchE - sp.pitch;
    const off = Math.hypot(dYaw * Math.cos(sp.pitch), dPitch);
    sp.lock = off < 0.07 ? sp.lock + dt : 0;
    if (sp.t > 8) { // Tipp: Pfeil in Richtung Ziel (Ziel links = größerer Drehwinkel)
      const arrow = off < 0.12 ? "" : ARROWS[(Math.round(Math.atan2(dPitch, -dYaw * Math.cos(sp.pitch)) / (Math.PI / 4)) + 8) % 8];
      if (arrow !== sp.hint) { sp.hint = arrow; $("scopeText").textContent = arrow ? `${T.hint} ${arrow}` : T.almost; }
    }
    const cp = Math.cos(sp.pitch);
    view.look.set(c.position.x + Math.sin(sp.yaw) * cp * 900, c.position.y + Math.sin(sp.pitch) * 900, c.position.z + Math.cos(sp.yaw) * cp * 900);
    return sp.lock > 0.45;
  }
  function updateScope(dt) {
    const c = world.camera, sp = view.special, T = cfg.scope; sp.t += dt;
    const tp = world.telescope.position;
    c.position.lerp(tmp.set(tp.x, tp.y + 1.7, tp.z), 1 - Math.exp(-dt * 4));
    let fov = 30;
    if (sp.phase === "aim") {
      if (aimStep(sp, dt, T, 0.4)) { // nach rechts nur ein kleines Stück: dort stünde der Felsen im Bild
        sp.phase = "zoom"; Sound.correct();
        scopeSay(T.found, [[T.compareBtn, scopeCompare, true]]);
      }
    } else if (sp.phase === "zoom") {
      fov = 10;
      view.look.lerp(world.earth.position, 1 - Math.exp(-dt * 4));
    } else if (sp.phase === "compare") {
      fov = 15;
      view.look.lerp(tmp2.copy(world.earth.position).addScaledVector(world.cmpRight, 19.5), 1 - Math.exp(-dt * 3));
    } else {
      // Ohne Fernrohr: der ganze Himmel über dem Mondhorizont, mit der Erde darin
      fov = 60;
      const p = sp.pitchE * 0.5, cp = Math.cos(p), y = sp.yawE + 0.35; // etwas nach links, weg vom Felsen
      view.look.lerp(tmp2.set(c.position.x + Math.sin(y) * cp * 900, c.position.y + Math.sin(p) * 900, c.position.z + Math.cos(y) * cp * 900), 1 - Math.exp(-dt * 3));
      sp.air += ((sp.airOn ? 1 : 0) - sp.air) * Math.min(1, dt * 2.5);
      applySky(sp.air);
    }
    c.lookAt(view.look);
    if (c.aspect < 1) fov /= c.aspect; // Hochformat: Bildausschnitt an die Breite anpassen
    c.fov += (Math.min(90, fov) - c.fov) * Math.min(1, dt * 2.5); c.updateProjectionMatrix();
    const masked = sp.phase !== "air" && sp.t > 0.5;
    $("scope").classList.toggle("hidden", !masked);
    $("scope").classList.toggle("aim", sp.phase === "aim");
  }

  // ---------- Waage: eigenes Erd-Gewicht einstellen und sehen, was die Waage auf dem Mond anzeigt ----------
  function startWeigh() {
    const st = world.stations.waage;
    view.special = { update: updateWeigh, kg: 30 };
    ast.pos.set(st.x, world.height(st.x, st.z), st.z); ast.speed = ast.vy = 0; resetJoy();
    ast.onGround = true; ast.jumping = ast.hopping = false; // mitten im Hüpfer auf „Waage“ gedrückt → sauber hinstellen
    ast.heading = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);
    radioTimer = 0; $("radio").classList.add("hidden");
    st.marker.visible = false;
    $("surfaceHud").classList.add("scoping");
    Sound.land();
    if (cfg.weigh.guess) { scaleGuessing = true; askGuess(cfg.weigh.guess, "Du stehst auf der Waage. Auf der Erde wiegst du 30 Kilo.", () => { scaleGuessing = false; showWeigh(true); }); }
    else showWeigh();
  }
  function moonKg(kg) { return (kg * cfg.gravity / 9.81).toFixed(1).replace(".", ","); }
  // Die Anzeige reagiert wie eine echte Waage: Sie zeigt nur etwas an, solange der Astronaut auf der Platte steht
  let scaleKg = 30, scaleShown = "", scaleGuessing = false;
  function updateScaleDisplay() {
    const st = world.stations.waage || (world.scale && world.scale.position); if (!st || !world.scale) return;
    const onPlate = ast.onGround && Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z) < 0.6;
    const text = scaleGuessing ? "?? kg" : `${onPlate ? moonKg(scaleKg) : "0,0"} kg`;
    if (text !== scaleShown) { scaleShown = text; world.scale.userData.show(text); }
  }
  function showWeigh(first) {
    const sp = view.special, T = cfg.weigh, mond = moonKg(sp.kg);
    scaleKg = sp.kg;
    const step = (d) => () => { sp.kg = Math.max(20, Math.min(60, sp.kg + d)); showWeigh(); };
    const text = fmtVars(T.text, { erde: sp.kg, mond });
    scopeSay(first ? guessed(text) : text, [[T.less, step(-5)], [T.more, step(5)], [T.done, endWeigh, true]]);
  }
  function endWeigh() {
    const sp = view.special; scaleGuessing = false;
    view.special = null;
    world.stations.waage.marker.visible = true;
    $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping");
    discover("waage", { erde: sp.kg, mond: moonKg(sp.kg) }, true);
  }
  function updateWeigh(dt) {
    const c = world.camera, st = world.stations.waage, y = world.height(st.x, st.z);
    c.position.lerp(tmp.set(st.x + WEIGH_DIR.x * 5, y + 1.9, st.z + WEIGH_DIR.z * 5), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(st.x, y + 1.6, st.z), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
  }

  // ---------- Exponate und Versuche ----------
  // Gemeinsamer Rahmen: Steuerung aus, HUD weg, Text + Knöpfe unten (wie beim Fernrohr).
  // hud = "driving": der Joystick bleibt sichtbar (Rover fernsteuern).
  function enterExhibit(key, state, hud = "scoping") {
    view.special = state; state.key = key; state.ix = state.iy = 0; // Eingabe kommt erst im nächsten Bild
    ast.speed = 0; resetJoy();
    radioTimer = 0; $("radio").classList.add("hidden");
    world.stations[key].marker.visible = false;
    $("surfaceHud").classList.add(hud);
  }
  function leaveExhibit() {
    const key = view.special.key;
    view.special = null;
    world.stations[key].marker.visible = true;
    $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping", "driving");
    discover(key, null, true);
  }
  const sec = (t) => t.toFixed(1).replace(".", ",");

  // Laser-Spiegel: Ein Lichtblitz kommt von der Erde, trifft den Spiegel und fliegt zurück – die Stoppuhr läuft mit (echte 2,6 s)
  const LIGHT_TIME = 1.28; // Sekunden für eine Strecke Erde–Mond
  function startLaser() { enterExhibit("spiegel", { update: updateLaser }); world.astronaut.visible = false; runLaser(); } // freier Blick auf den Spiegel
  function runLaser() {
    const sp = view.special; sp.t = 0; sp.stage = ""; sp.go = false;
    world.beam.visible = world.pulse.visible = false;
    askGuess(cfg.laser.guess, cfg.laser.ready, () => { sp.go = true; sp.t = -0.6; scopeSay(cfg.laser.hin); });
  }
  function updateLaser(dt) {
    const c = world.camera, sp = view.special, T = cfg.laser, e = world.earthDir, M = world.laserFrom;
    // Kamera hinter dem Spiegel: Spiegel unten im Bild, die Erde darüber
    const h = Math.hypot(e.x, e.z), elev = Math.atan2(e.y, h);
    c.position.lerp(tmp.set(M.x - (e.x / h) * 7.5, M.y + 0.9, M.z - (e.z / h) * 7.5), 1 - Math.exp(-dt * 3));
    // Blick halb zwischen Spiegel (unten) und Erde (oben) – beide im Bild
    const pitch = (elev - 0.08) / 2, fov = Math.min(80, Math.max(55, (elev + 0.22) * 57.3 + 14));
    view.look.lerp(tmp2.set(c.position.x + (e.x / h) * Math.cos(pitch) * 10, c.position.y + Math.sin(pitch) * 10, c.position.z + (e.z / h) * Math.cos(pitch) * 10), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    c.fov += (fov - c.fov) * Math.min(1, dt * 3); c.updateProjectionMatrix();
    if (sp.stage === "end" || !sp.go) return;
    sp.t += dt;
    if (sp.t < 0) return;
    const t = Math.min(sp.t, LIGHT_TIME * 2);
    const far = t < LIGHT_TIME ? 880 * (1 - t / LIGHT_TIME) : 880 * (t / LIGHT_TIME - 1); // Abstand des Lichtblitzes vom Spiegel
    world.beam.visible = world.pulse.visible = true;
    world.pulse.position.copy(M).addScaledVector(e, far);
    world.pulse.scale.setScalar(0.7 + far * 0.03);
    let stage = t < LIGHT_TIME ? "hin" : "zurueck";
    if (sp.t >= LIGHT_TIME * 2) stage = "end";
    if (stage !== sp.stage) {
      sp.stage = stage;
      if (stage === "zurueck") { Sound.correct(); grains(M, 6, 0.4); }
      if (stage === "end") { Sound.land(); world.pulse.visible = false; scopeSay(guessed(T.end), [[T.again, runLaser], [T.done, endLaser, true]]); return; }
    }
    const text = `${stage === "hin" ? T.hin : T.zurueck} ⏱️ ${sec(t)} s`;
    if ($("scopeText").textContent !== text) $("scopeText").textContent = text;
  }
  function endLaser() { world.beam.visible = world.pulse.visible = false; world.astronaut.visible = true; leaveExhibit(); }

  // Antenne: Zeit vorspulen – die Sonne wandert in einem Mond-Tag einmal über den Himmel, die Erde bleibt stehen
  const sunNow = SUN_DIR.clone();
  const SUN_AXIS = new V().crossVectors(SUN_DIR, new V(0, 1, 0)).normalize(); // Drehung um diese Achse: die Sonne steigt zuerst höher
  function setSun(angle, axis = SUN_AXIS) {
    sunNow.copy(SUN_DIR).applyAxisAngle(axis, angle);
    world.sunGlow.position.copy(sunNow).multiplyScalar(1200);
    // Unter dem Horizont: Nacht auf dem Mond. Die Erde bleibt hell – sie wird ja weiter von der Sonne beschienen.
    const day = smooth(-0.06, 0.08, sunNow.y);
    world.sun.intensity = world.sunBase * day;
    world.sunGlow.visible = sunNow.y > -0.08;
    if (!world.earth) return;
    const em = world.earth.material;
    if (!em.emissiveMap) { em.emissiveMap = em.map; em.emissive = new THREE.Color(0xffffff); em.needsUpdate = true; }
    em.emissiveIntensity = 0.5 * (1 - day);
  }
  const LAPSE_TIME = 12, MOON_DAYS = 27;
  function startLapse() { enterExhibit("antenne", { update: updateLapse }); runLapse(); }
  function runLapse() {
    const sp = view.special; sp.t = 0; sp.day = 0; sp.running = false;
    askGuess(cfg.lapse.guess, cfg.lapse.ready, () => { sp.running = true; sp.t = 0; scopeSay(cfg.lapse.ready); });
  }
  function updateLapse(dt) {
    const c = world.camera, sp = view.special, T = cfg.lapse, e = world.earthDir, st = world.stations.antenne;
    // Kamera hinter der Antenne: Antenne, Horizont und Erde im Bild
    const h = Math.hypot(e.x, e.z), y = world.height(st.x, st.z);
    c.position.lerp(tmp.set(st.x - (e.x / h) * 8, y + 2.6, st.z - (e.z / h) * 8), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(st.x + (e.x / h) * 30, y + 9, st.z + (e.z / h) * 30), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (!sp.running) return;
    sp.t += dt;
    if (sp.t < 0) return;
    const f = Math.min(1, sp.t / LAPSE_TIME);
    setSun(f * Math.PI * 2);
    if (f >= 1) {
      sp.running = false; setSun(0); Sound.correct();
      scopeSay(guessed(T.end), [[T.again, runLapse], [T.done, leaveExhibit, true]]);
      return;
    }
    const day = 1 + Math.floor(f * MOON_DAYS);
    if (day !== sp.day) {
      sp.day = day;
      $("scopeText").textContent = fmtVars(sunNow.y > 0 ? T.day : T.night, { tag: day, tage: MOON_DAYS });
    }
  }

  function updateExperiment(dt) {
    if (!experiment) return;
    const ex = experiment; ex.t += dt;
    if (ex.t < 0) return; // kurz halten
    const y = Math.max(ex.ground + 0.05, ex.y0 - 0.5 * cfg.gravity * ex.t * ex.t);
    world.hammer.position.y = y + 0.33; world.feather.position.y = y + 0.2; // Unterkante auf dem Boden
    if (!ex.landed && y <= ex.ground + 0.05) {
      ex.landed = true; ex.landedAt = ex.t;
      Sound.land(); puff(world.hammer.position, 3); puff(world.feather.position, 2);
      const g = fallGuess && !fallGuess.told ? (fallGuess.told = true, fallGuess.ok ? "✅ Richtig vermutet! " : "🤔 Überraschung! ") : "";
      if (g.startsWith("✅")) UI.confetti(70);
      UI.toast(`${g}⏱️ Beide nach ${ex.t.toFixed(1).replace(".", ",")} Sekunden unten – gleichzeitig!`, "gold");
    }
    if (ex.landed && ex.t > ex.landedAt + 1.4) {
      experiment = null;
      world.stations.fallversuch.marker.visible = true;
      // Zurück auf den Tisch, damit man den Versuch wiederholen kann
      world.scene.remove(world.hammer, world.feather); world.table.add(world.hammer, world.feather);
      world.hammer.rotation.set(0, 0, Math.PI / 2); world.feather.rotation.set(0, 0, Math.PI / 2);
      world.hammer.position.set(-0.3, 1.06, 0); world.feather.position.set(0.3, 1.04, 0);
      discover("fallversuch", null, true);
    }
  }

  // Einsteigen: zur Leiter gehen, hochklettern, durch die Luke in die Kabine – dann startet die Rakete zurück ins All
  function startBoarding() {
    boarding = { phase: "walk", t: 0, y: ast.pos.y };
    if (guide) guide.n.talk = 0; // alte Sprechblase weg, Nora steigt mit ein
    ast.speed = ast.vy = 0; ast.onGround = true; ast.jumping = ast.hopping = false;
    radioTimer = 0; $("radio").classList.add("hidden");
    world.stations.rakete.marker.visible = false;
  }
  function updateBoarding(dt) {
    const b = boarding, R = 2.05; b.t += dt;
    const nora = guide && guide.n;
    if (nora && nora.obj.visible) { // Nora steigt zuerst ein
      const np = nora.obj.position, ex = HATCH.x * 2.6 - np.x, ez = HATCH.z * 2.6 - np.z, ed = Math.hypot(ex, ez);
      if (ed > 0.2) { const st = Math.min(ed, 2 * dt); np.x += (ex / ed) * st; np.z += (ez / ed) * st; nora.heading = Math.atan2(ex, ez); nora.moving = true; nora.speedNow = 2; }
      else nora.moving = false;
      if (b.phase !== "walk") nora.obj.visible = false;
    }
    if (b.phase === "walk") {
      const dx = HATCH.x * R - ast.pos.x, dz = HATCH.z * R - ast.pos.z, d = Math.hypot(dx, dz), step = 1.3 * dt;
      if (d <= step) { ast.pos.x = HATCH.x * R; ast.pos.z = HATCH.z * R; b.phase = "climb"; b.t = 0; }
      else {
        ast.pos.x += (dx / d) * step; ast.pos.z += (dz / d) * step;
        ast.heading = angleLerp(ast.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 8));
      }
      b.y = world.height(ast.pos.x, ast.pos.z);
    } else {
      ast.heading = angleLerp(ast.heading, Math.atan2(-HATCH.x, -HATCH.z), 1 - Math.exp(-dt * 8)); // Blick zur Rakete
      if (b.phase === "climb") {
        const top = world.hatchY + HATCH.y; // Luke über dem Landeplatz (der kann höher liegen, z. B. Mars-Hochebene)
        b.y = Math.min(top, b.y + 0.95 * dt);
        if (b.y >= top) { b.phase = "enter"; b.t = 0; }
      } else if (b.phase === "enter") {
        const k = Math.min(1, b.t / 0.9), r = R - 1.2 * k;
        ast.pos.x = HATCH.x * r; ast.pos.z = HATCH.z * r;
        world.astronaut.scale.setScalar(1 - 0.25 * k);
        if (k >= 1) {
          // Luke zu: das Licht aus der Kabine verschwindet
          world.astronaut.visible = false;
          world.hatch.userData.door.material.emissiveIntensity = 0;
          Sound.land();
          b.phase = "closed"; b.t = 0;
        }
      } else if (b.phase === "closed") {
        if (b.t > 0.8) { b.phase = "launch"; b.t = 0; world.rocket.userData.flame.visible = true; Sound.engine(1); }
      } else {
        // Start: Triebwerk zündet, Staub fliegt weg, die Rakete hebt immer schneller ab
        const lift = Math.max(0, b.t - 0.6);
        b.rise = 0.5 * 4.5 * lift * lift;
        world.rocket.position.y = world.rocketY + b.rise; world.hatch.position.y = world.hatchY + b.rise;
        world.rocket.userData.flame.scale.setScalar(1.5 + Math.random() * 0.5);
        if (b.rise < 6) grains(tmp.set(0, world.hatchY + 0.1, 0), 4, 2.5);
        if (b.t > 3.8) { exit(); return; }
      }
    }
    ast.pos.y = b.y;
  }
  // Fußabdruck neben dem Astronauten (side = links/rechts, back = Versatz nach hinten)
  function footprint(side, back = 0) {
    if (bodyId === "erde") return; // auf der Wiese bleiben keine Stiefelabdrücke
    const hx = Math.sin(ast.heading), hz = Math.cos(ast.heading);
    const x = ast.pos.x - hz * side + hx * back, z = ast.pos.z + hx * side + hz * back;
    const fp = world.myPrints[world.printIdx]; world.printIdx = (world.printIdx + 1) % world.myPrints.length;
    fp.position.set(x, world.height(x, z) + 0.035, z); fp.rotation.y = ast.heading; fp.visible = true;
  }

  function puff(p, n) { grains(p, n * 2, 0.7); }

  // Mondstaub: Ohne Luft gibt es keine Staubwolken – die Körner fliegen in sauberen Bögen und fallen sofort zurück
  function grains(p, n, power = 1, dirX = 0, dirZ = 0, size = 1) {
    for (let i = 0; i < n; i++) {
      const s = world.dust[world.dustIdx]; world.dustIdx = (world.dustIdx + 1) % world.dust.length;
      s.position.set(p.x + (Math.random() - 0.5) * 0.3, p.y + 0.05, p.z + (Math.random() - 0.5) * 0.3);
      s.userData.v.set((Math.random() - 0.5) * 0.8 * power + dirX * power, (0.4 + Math.random() * 0.9) * power, (Math.random() - 0.5) * 0.8 * power + dirZ * power);
      s.userData.life = 4; s.visible = true;
      s.material.opacity = 0.85; s.scale.setScalar((0.035 + Math.random() * 0.035) * size);
    }
  }
  function updateDust(dt) {
    for (const s of world.dust) {
      if (!s.visible) continue;
      s.userData.life -= dt;
      if (s.userData.life <= 0) { s.visible = false; continue; }
      s.userData.v.y -= cfg.gravity * dt; // keine Luft: nur die Schwerkraft wirkt
      s.position.addScaledVector(s.userData.v, dt);
      if (s.position.y <= world.height(s.position.x, s.position.z)) s.visible = false; // gelandet
    }
  }

  // Kompass oben in der Mitte: zeigt zur nächsten Station, an der es noch etwas zu entdecken gibt
  let compassShown = "";
  function updateCompass() {
    const el = $("surfCompass");
    let best = null, bestD = Infinity;
    if (guide && guide.on && !guide.met) best = null; // die Begleitperson ist auf dem Weg zum Kind – noch kein Pfeil
    else if (guide && guide.on && guide.met) {
      const p = guide.n.obj.position, dg = Math.hypot(p.x - ast.pos.x, p.z - ast.pos.z), st = world.stations[guide.key];
      best = dg > 12 || !st ? { x: p.x, z: p.z } : st; bestD = Math.hypot(best.x - ast.pos.x, best.z - ast.pos.z);
    } else for (const [key, st] of Object.entries(world.stations)) {
      const sc = cfg.stations[key];
      if (sc.info || sc.home || foundMap()[key] || !cfg.discoveries.some((d) => d.key === key)) continue;
      const d = Math.hypot(st.x - ast.pos.x, st.z - ast.pos.z);
      if (d < bestD) { bestD = d; best = st; }
    }
    if (!best || bestD < 5 || view.special || boarding || experiment || chal) { if (compassShown) { compassShown = ""; el.classList.add("hidden"); } return; }
    const dx = best.x - ast.pos.x, dz = best.z - ast.pos.z, sy = Math.sin(view.yaw), cy = Math.cos(view.yaw);
    const ang = Math.atan2(-dx * cy + dz * sy, dx * sy + dz * cy); // 0 = geradeaus, positiv = rechts
    $("compassArrow").style.transform = `rotate(${ang}rad)`;
    const text = `${Math.round(bestD)} m`;
    if (text !== compassShown) { compassShown = text; $("compassText").textContent = text; el.classList.remove("hidden"); }
  }

  function updateLabels() {
    const c = world.camera, w = innerWidth, h = innerHeight;
    for (const [key, st] of Object.entries(world.stations)) {
      const el = labelEls[key]; if (!el) continue;
      tmp.set(st.x, st.marker.position.y + 3.2, st.z).project(c);
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1 || view.special || boarding) { el.style.display = "none"; continue; }
      const sc = cfg.stations[key], home = !!sc.home, done = !!foundMap()[key];
      // Fundstücke verraten sich erst aus der Nähe – und ihren Namen erst, wenn man sie entdeckt hat
      const secret = sc.small && !done;
      if (sc.info || (home && !st.marker.visible)) { el.style.display = "none"; continue; }
      // Namensschilder nur in der Nähe (die Rakete immer) – aus der Ferne helfen Hologramm und Kompass
      if (!home && Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z) > (secret ? 25 : 32)) { el.style.display = "none"; continue; }
      const text = secret ? "✨ Fundstück" : `${home ? "🚀" : done ? "✓" : "🔍"} ${sc.label}`;
      if (el.textContent !== text) el.textContent = text;
      el.classList.toggle("done", done);
      el.classList.toggle("home", home);
      el.style.display = "";
      el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    }
  }

  // =========================================================
  //  Leben auf der Station: Mitbewohner (weitere Astronauten) und ein Raumtransporter, der landet und startet
  // =========================================================
  // cfg.npcs = [{ name, color, path: [[x, z], …], work, hello, hint, done, facts: […] }]
  function addNpcs(B) {
    const list = (cfg.npcs || []).map((c, i) => {
      if (!npcModels[i]) return null;
      const obj = makeModelAstronaut(npcModels[i], c.color);
      const [x, z] = c.path[0];
      obj.position.set(x, B.height(x, z), z);
      B.scene.add(obj);
      return { c, obj, rig: obj.userData.rig, i: 0, wait: 1 + i * 2, heading: 0, phase: 0, col: [x, z, 0.7], talk: 0, cool: 0, waveT: 0, said: 0, el: null };
    }).filter(Boolean);
    if (noraModel) { // Nora, die Co-Pilotin: steht zuerst an der Leiter der Rakete
      const obj = makeModelAstronaut(noraModel, D.nora.color), x = HATCH.x * 2.6, z = HATCH.z * 2.6;
      obj.position.set(x, B.height(x, z), z); B.scene.add(obj);
      list.push({ c: { name: D.nora.name, color: D.nora.color, path: [[x, z]] }, isNora: true, obj, rig: obj.userData.rig, i: 0, wait: 0, heading: 0, phase: 0,
        col: [x, z, 0.7], talk: 0, cool: 0, waveT: 0, said: 0, el: null, climbY: null });
    }
    return list;
  }
  function npcSay(n) {
    const c = n.c, open = cfg.discoveries.filter((d) => !foundMap()[d.key] && world.stations[d.key]);
    let text;
    if (!n.greeted) { text = c.hello; n.greeted = true; }
    else if (!open.length) text = c.done;
    else if (n.said % 2 === 0 || !c.facts) { // abwechselnd: Tipp zur nächsten Station und etwas Wissenswertes
      const d = open.sort((a, b) => Math.hypot(world.stations[a.key].x - ast.pos.x, world.stations[a.key].z - ast.pos.z)
        - Math.hypot(world.stations[b.key].x - ast.pos.x, world.stations[b.key].z - ast.pos.z))[0];
      text = fmtVars(c.hint, { ziel: cfg.stations[d.key].label });
    } else text = c.facts[(n.said >> 1) % c.facts.length];
    n.said++;
    n.el.innerHTML = `<b>${c.name}:</b> ${fmtVars(text)}`;
    n.talk = 7; n.cool = 16; n.waveT = n.greeted && n.said > 1 ? 0 : 2.4;
    n.voice = Voice.say(fmtVars(text), /^(Forscherin|Kommandantin|Pilotin|Astronautin|Technikerin|Ingenieurin)\b/.test(c.name) ? "npcF" : "npcM", { who: c.name });
    Sound.click();
  }
  function updateNpcs(dt, elapsed, busy) {
    const c = world.camera, w = innerWidth, h = innerHeight;
    for (const n of world.npcs) {
      const p = n.obj.position, dx = ast.pos.x - p.x, dz = ast.pos.z - p.z, dist = Math.hypot(dx, dz);
      let moving = false;
      const modal = UI.modalOpen();
      if (!modal || !n.isNora) n.talk -= dt;
      if (n.voice && n.talk < 0.5 && Voice.speaking(n.voice)) n.talk = 0.5; // Blase bleibt, solange gesprochen wird
      if (n.el) n.el.classList.toggle("talking", !!(n.voice && Voice.speaking(n.voice)));
      n.cool -= dt; n.waveT -= dt;
      if (n.guide) moving = !!n.moving;
      else if (n.isNora) { if (dist < 6) n.heading = angleLerp(n.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 5)); }
      else if (dist < 5.5 && !busy) { // stehen bleiben, zum Kind drehen und etwas sagen
        n.heading = angleLerp(n.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 5));
        if (n.cool <= 0 && !UI.modalOpen()) npcSay(n);
      } else if (n.wait > 0) n.wait -= dt;
      else {
        const [tx, tz] = n.c.path[(n.i + 1) % n.c.path.length], ex = tx - p.x, ez = tz - p.z, d = Math.hypot(ex, ez);
        if (d < 0.3) { n.i = (n.i + 1) % n.c.path.length; n.wait = 3 + Math.random() * 5; }
        else {
          moving = true;
          const step = Math.min(d, 1.1 * dt);
          p.x += (ex / d) * step; p.z += (ez / d) * step;
          n.heading = angleLerp(n.heading, Math.atan2(ex, ez), 1 - Math.exp(-dt * 6));
        }
      }
      const climbing = n.climbY != null;
      p.y = climbing ? n.climbY : world.height(p.x, p.z);
      n.obj.rotation.y = n.heading;
      const fast = moving && (n.speedNow || 0) > 1.6; // Nora, wenn sie vorausläuft
      n.phase += dt * (fast ? 1.4 + n.speedNow * 2.3 : moving ? 5.3 : climbing ? 6 : 1.5); // Bewohner gehen gemütlich (1,1 m/s)
      poseRig(n.rig, { mode: climbing ? "climb" : fast ? "run" : moving ? "walk" : "stand", speed: fast ? Math.min(1, n.speedNow / 3.8) : moving ? 0.7 : 0, phase: n.phase, t: elapsed + n.c.path.length,
        air: false, airP: 0, contact: 0, wave: n.waveT > 0, work: !moving && n.c.work && dist > 5.5 });
      n.col[0] = p.x; n.col[1] = p.z;
      // Sprechblase über dem Kopf – immer ganz im Bild (Noras Blase bleibt am Bildrand, auch wenn sie hinter der Kamera ist)
      if (n.talk > 0 && !view.special && n.obj.visible && !modal) {
        tmp.set(p.x, p.y + 2.35, p.z).project(c);
        if (tmp.z < 1 || n.isNora) {
          let x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
          if (tmp.z >= 1) { x = w - x; y = h * 0.3; } // hinter der Kamera: gespiegelt an den Rand
          const bw = Math.min(n.el.offsetWidth || 300, w - 20), bh = n.el.offsetHeight || 80;
          x = Math.max(bw / 2 + 10, Math.min(w - bw / 2 - 10, x)); y = Math.max(bh + 70, Math.min(h - 150, y));
          n.el.style.display = ""; n.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        } else n.el.style.display = "none";
      } else n.el.style.display = "none";
    }
  }

  // =========================================================
  //  Begleitperson: empfängt das Kind an der Rakete und führt es von Mission zu Mission.
  //  cfg.guide = { npc (Index in cfg.npcs), order: [Schlüssel …], hello, welcome, jump, wait, next, arrive: { Schlüssel: Text }, quiz, home, alone, again }
  //  world.L.route[Schlüssel] = Wegpunkte zur Station (der Weg, den die Person läuft); world.L.meet = wo sie zu Beginn herkommt
  // =========================================================
  let guide = null;
  const GUIDE_SPEED = 3.3, MAX_SLOPE = 1.35; // MAX_SLOPE: so steil darf es bergauf gehen (Höhe pro Meter) – für Kind und Nora
  // Steht ein Ausstellungsstück (Hindernis) mitten im Kreis, wird der Kreis größer – sonst bliebe kaum Platz zum Hineintreten
  function fitZones() {
    if (world.zonesFitted) return; world.zonesFitted = true;
    const npcCols = new Set((world.npcs || []).map((n) => n.col));
    for (const [key, st] of Object.entries(world.stations)) {
      const sc = cfg.stations[key]; if (sc.info || sc.zone) continue;
      let need = 0;
      for (const c of world.colliders) {
        if (npcCols.has(c)) continue;
        const dc = Math.hypot(c[0] - st.x, c[1] - st.z);
        if (dc < c[2] + 0.45) need = Math.max(need, c[2] + 0.45 - dc + 0.55);
      }
      if (need > st.zone - 0.15) {
        st.zone = need + 0.15;
        const u = st.marker.userData, k = st.zone / (sc.small ? 1.3 : 1.7);
        u.ring.scale.setScalar(k); u.pad.scale.setScalar(k); u.ringK = k;
      }
    }
  }
  function guideOff() { return !!((G.state.guideOff || {})[bodyId]); }
  function setGuideOff(off) { G.state.guideOff = { ...(G.state.guideOff || {}), [bodyId]: off }; G.save && G.save(); }
  function setupGuide() {
    fitZones();
    guide = null; $("guideBtn").onclick = guideAlone; $("guideBtn").classList.add("hidden");
    const GC = cfg.guide; if (!GC || !world.npcs) return;
    const n = world.npcs.find((x) => x.isNora); if (!n) return;
    navGrid();
    const allDone = foundCount() >= cfg.discoveries.length && quizDone;
    guide = { n, on: !guideOff() && !allDone, key: undefined, pts: [], said: {}, waitCd: 0, met: false, sayCd: 0 };
    n.guide = guide.on; n.obj.visible = true; n.talk = 0; n.climbY = null;
    const lx = HATCH.x * 2.05, lz = HATCH.z * 2.05; // Fuß der Leiter
    n.obj.position.set(HATCH.x * 2.6, world.height(HATCH.x * 2.6, HATCH.z * 2.6), HATCH.z * 2.6);
    n.heading = Math.atan2(world.L.spawn[0] - n.obj.position.x, world.L.spawn[1] - n.obj.position.z);
    if (guide.on) { // Sie klettert hinter dem Kind die Leiter herunter
      const [sx, sz] = world.L.spawn, mx = lx, mz = lz;
      n.obj.position.set(lx, world.hatchY + HATCH.y, lz); n.climbY = world.hatchY + HATCH.y; n.heading = Math.atan2(-HATCH.x, -HATCH.z);
      // Das Kind schaut zur Rakete, damit es sie herunterklettern sieht
      ast.heading = view.yaw = Math.atan2(mx - sx, mz - sz);
      const cp = world.camera.position.set(sx - Math.sin(view.yaw) * 7, ast.pos.y + 3.2, sz - Math.cos(view.yaw) * 7), cr = Math.hypot(cp.x, cp.z);
      if (cr < 2.6) { cp.x *= 2.6 / (cr || 0.01); cp.z *= 2.6 / (cr || 0.01); }
      view.look.set(sx + Math.sin(view.yaw) * 3, ast.pos.y + 1.3, sz + Math.cos(view.yaw) * 3);
      setTimeout(() => { if (S.active && guide && guide.on) guideSay(GC.hello); }, 600);
    }
    updateGuideBtn();
  }
  // Nicht durch Gebäude laufen: aus Hindernissen herausschieben und seitlich daran entlanggleiten (dx, dz = Laufrichtung)
  function guideAvoid(p, dx, dz) {
    for (const col of world.colliders) {
      if (col === guide.n.col) continue;
      const [cx, cz, r] = col, ox = p.x - cx, oz = p.z - cz, d = Math.hypot(ox, oz) || 0.001, min = r + 0.55;
      if (d >= min) continue;
      const nx = ox / d, nz = oz / d;
      let tx = -nz, tz = nx; if (tx * dx + tz * dz < 0) { tx = -tx; tz = -tz; }
      p.x = cx + nx * min + tx * 0.04; p.z = cz + nz * min + tz * 0.04;
    }
  }
  function guideSay(text, vars) {
    if (!guide || !text) return;
    const n = guide.n, msg = fmtVars(text, vars);
    n.cool = 20;
    n.el.textContent = "";
    const b = document.createElement("b"); b.textContent = `🎧 ${n.c.name}: `; n.el.append(b, msg);
    n.talk = Math.min(10, 3 + msg.split(" ").length * 0.38); // lange Sätze bleiben etwas länger stehen
    n.el.classList.remove("pop"); void n.el.offsetWidth; n.el.classList.add("pop");
    n.voice = Voice.say(msg, "nora");
    Sound.click();
  }
  function updateGuideBtn() {
    const b = $("guideBtn");
    if (!guide || !guide.on || probe) { b.classList.add("hidden"); return; }
    b.innerHTML = `🧭 ${guide.n.c.name} führt dich · <b>Allein erkunden ✕</b>`;
    b.classList.remove("hidden");
  }
  function guideAlone() {
    if (!guide || !guide.on) return;
    guide.on = false; guide.n.guide = false; setGuideOff(true);
    guideSay(cfg.guide.alone); updateGuideBtn(); Sound.click();
  }
  function guideResume() {
    if (!guide) return;
    guide.on = true; guide.n.guide = true; guide.key = undefined; guide.met = true; setGuideOff(false);
    updateGuideBtn();
  }
  // Wohin die Person als Nächstes führt: erste offene Entdeckung der Reihenfolge, dann die Funk-Fragen an der Wand, zum Schluss die Rakete
  function guideNextKey() {
    const f = foundMap();
    for (const k of cfg.guide.order) if (!f[k]) return k;
    return "rakete";
  }
  // Wo sie neben der Station stehen bleibt (Ende des Weges oder 2,5 m seitlich vor der Markierung)
  function guideStand(key) {
    const r = world.L.route && world.L.route[key];
    if (r) return r[r.length - 1];
    const st = world.stations[key]; if (!st) return null;
    const p = guide.n.obj.position, dx = st.x - p.x, dz = st.z - p.z, d = Math.hypot(dx, dz) || 1;
    return [st.x - (dx / d) * 2.6 - (dz / d) * 1.4, st.z - (dz / d) * 2.6 + (dx / d) * 1.4];
  }
  // ---------- Wegsuche: Nora läuft nur, wo das Kind auch hinkommt (Hindernisse, Steilwände) ----------
  // Raster (1 m) über dem Gebiet der Führung; frei = kein Hindernis in Reichweite des Anzugs. Bergauf höchstens MAX_SLOPE.
  function navGrid() {
    if (world.nav) return world.nav;
    const L = world.L, pts = [L.spawn, ...Object.values(world.stations).map((st) => [st.x, st.z])];
    for (const r of Object.values(L.route || {})) pts.push(...r);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    x0 = Math.max(-148, Math.floor(x0 - 25)); z0 = Math.max(-148, Math.floor(z0 - 25)); x1 = Math.min(148, Math.ceil(x1 + 25)); z1 = Math.min(148, Math.ceil(z1 + 25));
    const nx = x1 - x0 + 1, nz = z1 - z0 + 1, h = new Float32Array(nx * nz), free = new Uint8Array(nx * nz);
    const npcCols = new Set((world.npcs || []).map((n) => n.col));
    const cols = world.colliders.filter((c) => !npcCols.has(c));
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i, z = z0 + j, k = j * nx + i;
      const H = world.height, hc = (h[k] = H(x, z));
      let ok = Math.hypot(x, z) < 147;
      if (ok) for (const [cx, cz, r] of cols) { const dx = x - cx, dz = z - cz, rr = r + 0.55; if (dx * dx + dz * dz < rr * rr) { ok = false; break; } }
      if (ok) for (const [ox, oz] of [[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5], [0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
        const d = Math.hypot(ox, oz); if (Math.abs(H(x + ox, z + oz) - hc) > d * MAX_SLOPE) { ok = false; break; } // Steilwand in der Nähe
      }
      free[k] = ok ? 1 : 0;
    }
    return (world.nav = { x0, z0, nx, nz, h, free, cols });
  }
  // gerade Linie begehbar? (für das Glätten des Weges)
  function navLine(ax, az, bx, bz) {
    const N = navGrid(), len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 0.2));
    let px = ax, pz = az, ph = world.height(ax, az);
    for (let i = 1; i <= n; i++) {
      const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n, hh = world.height(x, z);
      if (hh - ph > (len / n) * MAX_SLOPE * 0.92) return false;
      for (const [cx, cz, r] of N.cols) { const dx = x - cx, dz = z - cz, rr = r + 0.5; if (dx * dx + dz * dz < rr * rr) return false; }
      px = x; pz = z; ph = hh;
    }
    return true;
  }
  // Weg von a nach b als Liste von Punkten (ohne a); findet keinen Weg → direkt (und world.navMiss zählt mit, für die Tests)
  function navPath(ax, az, bx, bz) {
    const N = navGrid(), { x0, z0, nx, nz, h, free } = N;
    const cell = (x, z) => { const i = Math.round(x - x0), j = Math.round(z - z0); return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : j * nx + i; };
    const nearFree = (k) => {
      if (k < 0) return -1; if (free[k]) return k;
      const i0 = k % nx, j0 = (k / nx) | 0;
      for (let r = 1; r < 10; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = i0 + di, j = j0 + dj; if (i >= 0 && j >= 0 && i < nx && j < nz && free[j * nx + i]) return j * nx + i;
      }
      return -1;
    };
    const s = nearFree(cell(ax, az)), g = nearFree(cell(bx, bz));
    if (s < 0 || g < 0) return [[bx, bz]];
    const gFree = free[cell(bx, bz)] === 1; // Ziel selbst begehbar? (sonst endet der Weg auf dem nächsten begehbaren Punkt)
    if (gFree && navLine(ax, az, bx, bz)) return [[bx, bz]];
    const gi = g % nx, gj = (g / nx) | 0;
    const cost = new Float32Array(nx * nz).fill(Infinity), from = new Int32Array(nx * nz).fill(-1), done = new Uint8Array(nx * nz);
    const heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    cost[s] = 0; push(s, 0);
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false;
    while (heap.length) {
      const [, k] = pop(); if (done[k]) continue; done[k] = 1;
      if (k === g) { found = true; break; }
      const i = k % nx, j = (k / nx) | 0;
      for (const [di, dj, dd] of D) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        const q = jj * nx + ii; if (!free[q] || done[q]) continue;
        if (di && dj && (!free[j * nx + ii] || !free[jj * nx + i])) continue; // keine Abkürzung über Ecken
        const rise = h[q] - h[k]; if (rise > dd * MAX_SLOPE) continue;
        const c = cost[k] + dd + Math.max(0, rise) * 0.6;
        if (c < cost[q]) { cost[q] = c; from[q] = k; push(q, c + Math.hypot(ii - gi, jj - gj)); }
      }
    }
    if (!found) { world.navMiss = (world.navMiss || 0) + 1; return [[bx, bz]]; }
    const cells = []; for (let k = g; k !== -1 && k !== s; k = from[k]) cells.push([x0 + (k % nx), z0 + ((k / nx) | 0)]);
    cells.reverse();
    const lc = cells[cells.length - 1] || [ax, az];
    if (gFree && navLine(lc[0], lc[1], bx, bz)) cells.push([bx, bz]);
    if (!cells.length) return [[bx, bz]];
    // glätten: so weit wie möglich geradeaus gehen
    const out = []; let cx = ax, cz = az, i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !navLine(cx, cz, cells[j][0], cells[j][1])) j--;
      out.push(cells[j]); cx = cells[j][0]; cz = cells[j][1]; i = j + 1;
    }
    return out;
  }
  function guideRoute(key) {
    const r = world.L.route && world.L.route[key], p = guide.n.obj.position;
    let way;
    if (!r) { const st = guideStand(key); way = st ? [st] : []; }
    else { // ab dem Wegpunkt weiterlaufen, der am nächsten liegt (falls die Person schon mittendrin steht)
      let best = 0, bd = Infinity;
      r.forEach(([x, z], i) => { const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = i; } });
      way = r.slice(best).map((q) => [...q]);
    }
    // zwischen den Wegpunkten: ein Weg, den das Kind auch gehen kann
    const out = []; let cx = p.x, cz = p.z;
    for (const q of way) { const seg = navPath(cx, cz, q[0], q[1]); out.push(...seg); const e = seg[seg.length - 1] || q; cx = e[0]; cz = e[1]; }
    return out;
  }
  function updateGuide(dt, busy) {
    if (!guide) return;
    const n = guide.n, GC = cfg.guide, p = n.obj.position;
    guide.waitCd -= dt;
    if (n.climbY != null) { // erst die Leiter herunter
      n.climbY -= 1.5 * dt;
      const g = world.height(p.x, p.z);
      if (n.climbY <= g) { n.climbY = null; p.y = g; }
      return;
    }
    // Im Gespräch: freie Person, die man ansprechen kann
    if (!guide.on) return;
    n.moving = false;
    if (busy || view.special || experiment || boarding || UI.modalOpen()) return;
    const dAst = Math.hypot(ast.pos.x - p.x, ast.pos.z - p.z);
    const key = guideNextKey();
    if (guide.met && key !== guide.key) { // neues Ziel: Bescheid sagen und losgehen
      const first = guide.key === undefined;
      guide.key = key; guide.pts = guideRoute(key); guide.said[key] = false;
      if (key === "rakete") { if (quizDone) guideSay(GC.home); }
      else if (key !== "sprung" && !first) guideSay(GC.next, { ziel: cfg.stations[key].label });
    }
    const face = (x, z) => { n.heading = angleLerp(n.heading, Math.atan2(x - p.x, z - p.z), 1 - Math.exp(-dt * 5)); };
    // Empfang: Sie läuft direkt zum Kind, egal wo es gerade steht – und weicht Gebäuden und der Rakete aus
    if (!guide.met) {
      // Ziel: schräg vor dem Kind (vom Blick der Kamera aus etwas rechts), damit man sie nicht hinter dem Kind versteckt sieht
      const ya = view.yaw - 0.75, gx = ast.pos.x + Math.sin(ya) * 2.8, gz = ast.pos.z + Math.cos(ya) * 2.8;
      const ex = gx - p.x, ez = gz - p.z, dg = Math.hypot(ex, ez);
      if (dg > 0.35 && dAst > 1.6) {
        const step = Math.min(dg, GUIDE_SPEED * 1.25 * dt);
        p.x += (ex / dg) * step; p.z += (ez / dg) * step; n.speedNow = step / Math.max(dt, 1e-3);
        guideAvoid(p, ex / dg, ez / dg);
        if (dg > 2) face(gx, gz); else face(ast.pos.x, ast.pos.z);
        n.moving = true;
        return;
      }
      face(ast.pos.x, ast.pos.z);
      guide.met = true; guide.pts = []; n.waveT = 2.4; guideSay(GC.welcome); guide.waitCd = 6;
      return;
    }
    if (guide.pts.length) {
      if (dAst > 11) { // zu weit zurück: stehen bleiben, umdrehen, winken
        face(ast.pos.x, ast.pos.z);
        if (guide.waitCd <= 0) { guide.waitCd = 12; n.waveT = 2.4; guideSay(GC.wait); }
        return;
      }
      // ohne Halt von Wegpunkt zu Wegpunkt (sonst stockt die Laufbewegung an jedem Punkt für einen Moment)
      let left = GUIDE_SPEED * dt * (dAst < 3 ? 1.2 : 1), moved = 0;
      while (left > 1e-4 && guide.pts.length) {
        const [tx, tz] = guide.pts[0], ex = tx - p.x, ez = tz - p.z, d = Math.hypot(ex, ez);
        if (d < 0.05) { guide.pts.shift(); continue; }
        const step = Math.min(d, left);
        face(tx, tz); // Blickrichtung vor dem Schritt (am Wegpunkt selbst gäbe es keine Richtung)
        p.x += (ex / d) * step; p.z += (ez / d) * step; left -= step; moved += step;
      }
      if (moved > 0) { n.speedNow = moved / Math.max(dt, 1e-3); n.moving = true; }
      return;
    }
    // angekommen
    face(ast.pos.x, ast.pos.z);
    if (dAst < 7 && !guide.said[guide.key] && guide.waitCd <= 0) {
      guide.said[guide.key] = true; guide.waitCd = 4;
      if (guide.key === "wand" && !quizDone) { radio(cfg.radio.allFound); setTimeout(startQuiz, 2500); return; }
      guideSay(guide.key === "sprung" ? GC.jump : (GC.arrive && GC.arrive[guide.key]) || "");
    }
    // Wer nach einer Weile noch nicht gesprungen ist, kennt die Taste vielleicht nicht: Tipp geben
    if (guide.key === "sprung" && guide.said.sprung) {
      guide.jumpWait = (guide.jumpWait || 0) + dt;
      if (guide.jumpWait > 14 && !guide.jumpHint) {
        guide.jumpHint = true;
        guideSay(isTouch() ? "Tipp: Drück unten rechts auf „SPRINGEN“!" : "Tipp: Drück die Leertaste – dann springst du!");
      }
    }
  }

  // Raumtransporter: fliegt heran, landet auf seinem Landeplatz, wartet, startet wieder – und nach einer Pause von vorn
  function makeShuttle(B, pad) {
    const g = makeShuttleModel();
    const glowMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,240,200,1)", "rgba(255,140,40,0.8)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const jets = [];
    for (const [x, y, z, s0] of [[-1.3, 0.5, 0.8, 2.6], [1.3, 0.5, 0.8, 2.6], [-0.75, 1.75, -5.1, 1.8], [0.75, 1.75, -5.1, 1.8]]) {
      const s = new THREE.Sprite(glowMat); s.position.set(x, y, z); s.scale.setScalar(s0); g.add(s); jets.push(s);
    }
    B.scene.add(g);
    const [px, pz] = pad, py = B.height(px, pz);
    return { g, jets, t: 20, pad: new V(px, py + 0.1, pz), from: new V(px - 240, py + 150, pz + 260), to: new V(px + 260, py + 170, pz - 220) };
  }
  // Raumtransporter (vorn = +Z): runder Rumpf mit Cockpitscheibe, Pfeilflügel, Leitwerk, zwei Triebwerke, Landebeine
  function makeShuttleModel() {
    const M = colonyMats(), g = new THREE.Group();
    const body = put(g, new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 6, 10, 32), M.hull(6, 3)), 0, 2, 0); body.rotation.x = Math.PI / 2;
    const cockpit = put(g, new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      M.std({ color: srgb(0x0c2a4a), roughness: 0.08, metalness: 0.7, envMapIntensity: 1.6 })), 0, 2.45, 3.1, false);
    cockpit.scale.set(0.95, 0.55, 1.35); cockpit.rotation.x = 0.35;
    for (const [z, m, w] of [[-0.6, M.orange, 0.55], [0.1, M.teal, 0.2]]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, w, 32, 1, true), m), 0, 2, z, false).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { // Bullaugen
      const w = put(g, new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), M.glow), side * 1.31, 2.25, 1.8 - i * 0.75, false); w.rotation.y = side * Math.PI / 2;
    }
    // Pfeilflügel mit orangen Spitzen
    const wing = new THREE.Shape(); wing.moveTo(0, 1.4); wing.lineTo(4.4, -2.4); wing.lineTo(4.4, -3.3); wing.lineTo(0, -3.1); wing.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wing, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
    wingGeo.rotateX(Math.PI / 2);
    const tipGeo = new THREE.BoxGeometry(0.25, 0.3, 1.2);
    for (const side of [-1, 1]) {
      const w = put(g, new THREE.Mesh(wingGeo, M.hull(2, 2)), 0, 1.45, 0); w.scale.x = side;
      put(g, new THREE.Mesh(tipGeo, M.orange), side * 4.4, 1.42, -2.85);
    }
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(1.9, 0); fin.lineTo(0.3, 2.2); fin.lineTo(-0.5, 2.2); fin.closePath();
    const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
    finGeo.rotateY(-Math.PI / 2); finGeo.translate(0.07, 0, 0); // oben nach hinten gepfeilt
    put(g, new THREE.Mesh(finGeo, M.orange), 0, 3.05, -3.6);
    for (const x of [-0.75, 0.75]) { // Triebwerke hinten
      const e = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.4, 20), M.metal), x, 1.75, -4.4); e.rotation.x = Math.PI / 2;
      put(g, new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshStandardMaterial({ color: srgb(0x1f2937), emissive: srgb(0xf97316), emissiveIntensity: 0.35 })), x, 1.75, -5.11, false).rotation.y = Math.PI;
    }
    for (const [x, z] of [[-1.3, -2], [1.3, -2], [0, 2.8]]) { // Landebeine
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8), M.steel), x * 0.8, 0.6, z);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.1, 16), M.metal), x * 0.8, 0.05, z);
    }
    g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    return g;
  }
  const SHUTTLE_CYCLE = 75;
  function updateShuttle(dt) {
    const s = world.shuttle; if (!s) return;
    s.t = (s.t + dt) % SHUTTLE_CYCLE;
    const t = s.t, g = s.g;
    let flying = true;
    if (t < 14) { // Anflug, zum Schluss langsam aufsetzen
      const k = 1 - Math.pow(1 - t / 14, 2.2);
      g.position.lerpVectors(s.from, s.pad, k);
      g.rotation.y = Math.atan2(s.pad.x - s.from.x, s.pad.z - s.from.z);
      if (t > 12.6 && t < 13.2 && Math.random() < dt * 20) grains(s.pad, 6, 1.6, 0, 0, 3);
    } else if (t < 30) { g.position.copy(s.pad); flying = false; } // gelandet
    else if (t < 42) { // Start: erst senkrecht hoch, dann davon
      const k = (t - 30) / 12, up = Math.min(1, k * 3);
      g.position.set(s.pad.x, s.pad.y + up * 18, s.pad.z).lerp(s.to, Math.max(0, (k - 0.25) / 0.75) ** 2);
      g.rotation.y = Math.atan2(s.to.x - s.pad.x, s.to.z - s.pad.z);
    }
    g.visible = t < 42;
    for (const j of s.jets) { j.visible = flying; j.material.opacity = 0.7 + Math.random() * 0.3; }
  }

  // =========================================================
  //  Mars
  // =========================================================
  // Mars: Die Rakete landet auf einer Hochebene. Von der Kante blickt man hinunter ins Tal mit dem Außenposten;
  // eine Rampe führt im Westen hinab, weiter draußen liegt ein altes Flussdelta (wie im Jezero-Krater, wo Perseverance forscht).
  const MARS_LAYOUT = {
    spawn: [-6.9, 4],
    // Waage und Magnet-Versuch stehen unter den Vordächern der beiden Türme (Station bei z = 56)
    waage: [-MARS_TOWER[0] + WEIGH_DIR.x * (TOWER_R + 2.8), 56 + MARS_TOWER[1] + WEIGH_DIR.z * (TOWER_R + 2.8)],
    rost: [MARS_TOWER[0] + LAB_DIR.x * (TOWER_R + 2.8), 56 + MARS_TOWER[1] + LAB_DIR.z * (TOWER_R + 2.8)],
    monde: [-12, 12], vulkan: [24, 6], rover: [-22, 44], roverStart: [-27, 50], roverZiel: [-54, 72],
    eis: [30, 46], wegweiser: [8, 5], teufel: [-48, 40],
    station: [0, 56], abend: [-28, 6], pad: [-34, 74], // Landeplatz des Raumtransporters
    meet: [-24, 12], // hier kommt Mia zu Beginn her
    // Weg der Führung (Wegpunkte bis zum Standplatz neben der Station)
    route: {
      wegweiser: [[5, 2.5]], vulkan: [[14, 3], [20.5, 2.6]], monde: [[8, 8], [-4, 8.6]], abend: [[-16, 5], [-23, 3.5]],
      rover: [[-33, 9], [-37, 16], [-37, 34], [-31, 40], [-25.5, 41]], teufel: [[-36, 40]], waage: [[-30, 52], [-25.5, 60.5]],
      rost: [[-12, 50], [2, 59], [6.5, 63.2]], eis: [[16, 56], [25, 47], [26.2, 43.2]], wand: [[14, 48], [3.5, 49.5]],
      rakete: [[-12, 49], [-31, 40], [-37, 34], [-37, 16], [-30, 8], [-5, 4.5]]
    }
  };
  // Hochebene mit gezackter Kante (ca. 8 m hoch), im Westen eine sanfte Rampe ins Tal
  function marsPlateau(x, z) {
    const edge = 22 + Math.sin(x * 0.06) * 3 + Math.sin(x * 0.17 + 1) * 1.2;
    let s = smooth(edge + 2.5, edge - 2.5, z);
    const ramp = smooth(7, 3, Math.abs(x + 37));
    return (s * (1 - ramp) + smooth(36, 10, z) * ramp) * 8;
  }
  // Rover steht schräg in seiner Garage – das Kind muss beim Losfahren selbst lenken
  const MARS_ROVER_PARK = Math.atan2(MARS_LAYOUT.roverZiel[0] - MARS_LAYOUT.roverStart[0], MARS_LAYOUT.roverZiel[1] - MARS_LAYOUT.roverStart[1]) + 0.7;
  const MARS_MAST = ([x, z]) => [x - 3.2, z + 5.5];
  const MARS_SCOPE_DOOR = ([x, z]) => { const d = Math.hypot(x, z); return [(-x / d) * 4.2, (-z / d) * 4.2]; }; // Markierung vor der Tür der Sternwarte
  const MARS_SKY = new THREE.Color(0xd2a679), MARS_DUSK = new THREE.Color(0x46587a);
  const PHOBOS_DIR = new V(0.2, 0.6, 1).normalize(), DEIMOS_DIR = new V(-0.75, 0.5, 0.55).normalize();
  const VOLCANO_DIR = new V(1, 0, 0.35).normalize(), VOLCANO_H = 500, REAL_H = 22; // Olympus Mons: 22 km hoch
  const MAGNET_UP = 1.75, MAGNET_DOWN = 1.27;

  // ---------- Berge in der Ferne: als echte, beleuchtete Landschaftsformen (Farben im Gitter, ferner Dunst eingerechnet) ----------
  // Gitter aus Ringen um die Mitte: f(r, a) → [Höhe 0…1, Farbe]; r = 0 (Gipfel) … 1 (Fuß), a = Winkel
  function polarMountain(R, Hh, RINGS, SEG, f) {
    const pos = [], col = [], idx = [];
    for (let i = 0; i <= RINGS; i++) for (let j = 0; j <= SEG; j++) {
      const r = i / RINGS, a = (j / SEG) * Math.PI * 2, [h, c, rr = 1] = f(r, a);
      pos.push(Math.cos(a) * r * R * rr, h * Hh, Math.sin(a) * r * R * rr); col.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) {
      const p = i * (SEG + 1) + j, q = p + SEG + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false }));
    m.userData.farAway = true;
    return m;
  }
  // Olympus Mons: breiter Schildvulkan – Krater (Caldera) oben, Lavarinnen an den Flanken, steile Randstufe am Fuß
  function makeShieldVolcano(R, Hh, haze) {
    const DUST = srgb(0xc58a5e), LAVA = srgb(0x7a3a24), CALD = srgb(0x4e2a1c), CLIFF = srgb(0x6e3826), c = new THREE.Color();
    return polarMountain(R, Hh, 70, 144, (r, a) => {
      const streak = fbm2(Math.cos(a) * 14 + r * 1.2, Math.sin(a) * 14 + r * 2.5); // Lavaströme laufen strahlenförmig hinunter
      let h;
      if (r < 0.06) h = 0.93 + 0.03 * (r / 0.06) ** 2;                 // Boden der Caldera
      else if (r < 0.09) h = 0.96 + 0.04 * smooth(0.06, 0.09, r);       // Kraterrand
      else if (r < 0.78) h = 1 - Math.pow((r - 0.09) / 0.69, 1.6) * 0.76; // breite, flache Flanken
      else if (r < 0.84) h = 0.24 - 0.21 * smooth(0.78, 0.84, r);       // Randstufe (bis zu 6 km hoch)
      else h = 0.03 * (1 - smooth(0.84, 1, r));
      if (r > 0.09 && r < 0.78) h += (streak - 0.5) * 0.025;
      if (r < 0.06) c.copy(CALD);
      else if (r < 0.09) c.copy(DUST).lerp(CALD, 0.25);
      else if (r < 0.78) c.copy(DUST).lerp(LAVA, smooth(0.42, 0.62, streak) * 0.85);
      else if (r < 0.84) { c.copy(CLIFF); c.multiplyScalar(0.85 + 0.15 * Math.sin(h * 80)); } // Gesteinsschichten an der Steilkante
      else c.copy(DUST).lerp(LAVA, 0.25);
      return [h, c.lerp(haze, 0.32)];
    });
  }
  // Felsgipfel mit Graten; snow = Schneegrenze (Anteil der Höhe), rock = Gesteinsfarbe
  function makeRockPeak(R, Hh, rock, snow, haze, seed) {
    const ROCK = srgb(rock), SNOW = srgb(0xf2f6fb), SHADE = srgb(0x2f3440), c = new THREE.Color();
    return polarMountain(R, Hh, 44, 96, (r, a) => {
      const ridge = Math.pow(Math.abs(Math.cos(a * 2 + seed + fbm2(r * 3 + seed, a) * 1.6)), 3); // vier Grate
      const n = fbm2(Math.cos(a) * 5 + seed, Math.sin(a) * 5 + r * 4);
      const h = Math.pow(1 - r, 1.25) * (1 + 0.1 * (n - 0.5)) * (r > 0.98 ? 0 : 1);
      const rr = 1 + 0.22 * (ridge - 0.5) * (1 - r * 0.4);
      const snowy = smooth(snow - 0.06, snow + 0.08, h + (n - 0.5) * 0.16) * (0.55 + 0.45 * ridge);
      c.copy(ROCK).lerp(SHADE, (1 - ridge) * 0.35).lerp(SNOW, snowy);
      return [h, c.lerp(haze, 0.3), rr];
    });
  }
  // Schild über einem Berg: Name und Höhe
  function mountainLabel(name, km) {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 160;
    const x = cv.getContext("2d");
    x.fillStyle = "rgba(15,23,42,0.82)"; x.beginPath(); x.roundRect ? x.roundRect(8, 8, 496, 144, 36) : x.rect(8, 8, 496, 144); x.fill();
    x.strokeStyle = "#fbbf24"; x.lineWidth = 6; x.stroke();
    x.fillStyle = "#ffffff"; x.font = "700 52px Fredoka, sans-serif"; x.textAlign = "center"; x.fillText(name, 256, 76);
    x.fillStyle = "#fde68a"; x.font = "600 40px Nunito, sans-serif"; x.fillText(km, 256, 126);
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthTest: false, transparent: true }));
    sp.renderOrder = 5; sp.visible = false; return sp;
  }

  function makeRover() {
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.5, metalness: 0.2 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.7 });
    const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 2.0), white), 0, 0.8, 0);
    const wheels = [];
    for (const x of [-0.85, 0.85]) for (const z of [-0.85, 0, 0.85]) {
      const w = add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 14), dark), x, 0.28, z);
      w.rotation.z = Math.PI / 2; wheels.push(w);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), dark), x * 0.85, 0.52, z);
    }
    // Mast mit Kamera-Kopf (vorn = +Z) und Roboterarm
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), white), 0.35, 1.5, 0.7);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.26), white), 0.35, 2.05, 0.74);
    add(new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), dark), 0.35, 2.05, 0.875);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), dark), -0.35, 0.75, 1.35);
    g.userData = { wheels, heading: 0, speed: 0 };
    return g;
  }
  function makeHeli() {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xd4a73a, metalness: 0.6, roughness: 0.4 }));
    body.position.y = 0.45; body.castShadow = true; g.add(body);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 5), dark);
      leg.position.set(x * 0.22, 0.22, z * 0.22); leg.rotation.set(z * 0.5, 0, -x * 0.5); g.add(leg);
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), dark); mast.position.y = 0.78; g.add(mast);
    const rotor = new THREE.Group(); rotor.position.y = 0.95;
    for (const [r, y] of [[0, 0], [Math.PI / 2, -0.12]]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.015, 0.09), dark); blade.rotation.y = r; blade.position.y = y; blade.castShadow = true; rotor.add(blade);
    }
    g.add(rotor);
    g.scale.setScalar(1.6);
    g.userData = { rotor };
    return g;
  }
  function makeDrill() {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xaab2bd, metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6), metal);
      leg.position.set(Math.cos(a) * 0.5, 1.05, Math.sin(a) * 0.5); leg.rotation.set(-Math.sin(a) * 0.42, 0, Math.cos(a) * 0.42); leg.castShadow = true; g.add(leg); // unten auseinander, oben zusammen
    }
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }));
    motor.position.y = 2.1; motor.castShadow = true; g.add(motor);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 2.0, 8), new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.8, roughness: 0.3 }));
    rod.position.y = 1.05; g.add(rod);
    const ice = makeIceCrystals(1);
    ice.position.set(-0.45, 0.02, -0.45); ice.visible = false; g.add(ice); // auf der Kamera-Seite des Bohrers
    g.userData = { rod, ice };
    return g;
  }
  // Magnet-Versuch: Schale mit Marsstaub, darüber ein Magnet am Galgen
  function makeMagnetTable() {
    const g = makeTable();
    const metal = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.6, roughness: 0.4 });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.5), metal); tray.position.y = 1.05; g.add(tray);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 10), new THREE.MeshStandardMaterial({ color: 0xa24b2a, roughness: 1 }));
    mound.scale.set(1, 0.3, 0.75); mound.position.y = 1.08; g.add(mound);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), metal); pole.position.set(0, 1.55, -0.35); g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), metal); arm.position.set(0, 2.08, -0.17); g.add(arm);
    const magnet = new THREE.Group(); magnet.position.y = MAGNET_UP;
    const red = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.4 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), red); bar.position.y = 0.12; magnet.add(bar);
    for (const x of [-0.11, 0.11]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), red); leg.position.set(x, 0.02, 0); magnet.add(leg);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), metal); tip.position.set(x, -0.11, 0); magnet.add(tip);
    }
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 4), metal); string.position.y = 0.66; magnet.add(string);
    g.add(magnet);
    // Staubkörner, die zum Magneten springen: Start auf dem Häufchen, Ziel an den Magnet-Polen
    const grainMat = new THREE.MeshStandardMaterial({ color: 0x7a3218, roughness: 1 });
    const grainsM = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.018 + hash2(i, 2) * 0.012, 6, 5), grainMat);
      m.userData = {
        from: new V((hash2(i, 3) - 0.5) * 0.36, 1.13, (hash2(i, 4) - 0.5) * 0.24),
        to: new V((i % 2 ? 0.11 : -0.11) + (hash2(i, 5) - 0.5) * 0.09, MAGNET_DOWN - 0.15 - hash2(i, 6) * 0.05, (hash2(i, 7) - 0.5) * 0.09)
      };
      m.visible = false; g.add(m); grainsM.push(m);
    }
    g.userData = { magnet, grains: grainsM };
    return g;
  }
  function makeDevil(colors) {
    const g = new THREE.Group(), mat = new THREE.SpriteMaterial({ map: glowTexture(colors[0], colors[1]), transparent: true, opacity: 0.32, depthWrite: false });
    const parts = [];
    for (let i = 0; i < 20; i++) { const s = new THREE.Sprite(mat); g.add(s); parts.push(s); }
    g.userData = { parts };
    return g;
  }

  // ---------- Gestaltung: Himmel mit Farbverlauf, Tafelberge, Felsgruppen, Staubschleier, weiche Schatten unter Objekten ----------
  // Himmelskuppel: am Horizont heller und staubiger, oben dunkler. Die Grundfarbe kommt aus material.color.
  function makeSkyDome(horizon = 1.15, zenith = 0.72) {
    const geo = new THREE.SphereGeometry(2400, 32, 16), pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 2400, k = y <= 0 ? horizon : horizon + (zenith - horizon) * Math.pow(y, 0.6);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    m.renderOrder = -1;
    return m;
  }
  // Streifen-Muster für Gesteinsschichten (von unten nach oben)
  function bandTexture(colors, seed) {
    const cv = document.createElement("canvas"); cv.width = 4; cv.height = 256;
    const x = cv.getContext("2d");
    for (let y = 0, i = 0; y < 256; i++) { const h = 8 + hash2(i, seed) * 26; x.fillStyle = colors[i % colors.length]; x.fillRect(0, y, 4, h + 1); y += h; }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
    return t;
  }
  // Tafelberg: zerklüftete Säule mit waagerechten Gesteinsschichten
  function makeButte(r, h, tex, seed) {
    const geo = new THREE.CylinderGeometry(r * 0.78, r, h, 11, 6), p = geo.attributes.position, v = new V();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const a = Math.atan2(v.z, v.x), k = 0.82 + 0.36 * hash2(Math.round(a * 3) + seed, Math.round(v.y / h * 5) + seed);
      p.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, flatShading: true }));
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  // Gruppe unterschiedlich großer Felsen als Blickfang im Vordergrund
  function rockCluster(B, x, z, n, mat, seed) {
    const geo = rockCluster.geo || (rockCluster.geo = new THREE.DodecahedronGeometry(1, 0));
    if (mat.userData.natural) { // natürlich geformte Felsen: verbeulte Kugeln in mehreren Varianten
      const geos = rockCluster.natural || (rockCluster.natural = [0, 1, 2, 3, 4, 5].map(naturalRockGeo));
      for (let i = 0; i < n; i++) {
        const a = hash2(i, seed) * Math.PI * 2, r = hash2(i, seed + 1) * 3.4, s = 0.35 + Math.pow(hash2(i, seed + 2), 2) * 1.9;
        const m = new THREE.Mesh(geos[Math.floor(hash2(i, seed + 7) * geos.length)], mat);
        m.scale.set(s * (0.9 + hash2(i, seed + 3) * 0.5), s * (0.55 + hash2(i, seed + 4) * 0.45), s);
        m.rotation.set(0, hash2(i, seed + 5) * 6, 0);
        m.castShadow = m.receiveShadow = true;
        B.on(m, x + Math.cos(a) * r, z + Math.sin(a) * r, s * 0.1);
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      const a = hash2(i, seed) * Math.PI * 2, r = hash2(i, seed + 1) * 3.2, s = 0.25 + Math.pow(hash2(i, seed + 2), 2) * 1.6;
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(s * (0.8 + hash2(i, seed + 3) * 0.6), s * (0.5 + hash2(i, seed + 4) * 0.5), s);
      m.rotation.set(hash2(i, seed + 5) * 3, hash2(i, seed + 6) * 3, 0);
      m.castShadow = m.receiveShadow = true;
      B.on(m, x + Math.cos(a) * r, z + Math.sin(a) * r, s * 0.25);
    }
  }
  // Natürlicher Fels: Kugel mit Beulen, Kanten und abgeflachter Unterseite; dunklere Flecken per Vertex-Farbe
  // Eiskristalle: durchscheinend und bläulich (k = Größe)
  function makeIceCrystals(k) {
    const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: srgb(0xc6ecff), emissive: srgb(0x38bdf8), emissiveIntensity: 0.25, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82, flatShading: true });
    for (const [x, z, sx, sy, r] of [[0, 0, 0.16, 0.26, 0.2], [0.17, 0.06, 0.11, 0.17, -0.5], [-0.12, 0.12, 0.09, 0.14, 0.9], [0.05, -0.15, 0.1, 0.12, 0.3], [-0.16, -0.08, 0.07, 0.1, 1.4]]) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat); c.scale.set(sx * k, sy * k, sx * k * 0.8); c.position.set(x * k, sy * k * 0.6, z * k); c.rotation.set(0.2, r, 0.15); g.add(c);
    }
    return g;
  }
  // Vulkan auf der Venus: dunkles Basaltgestein, oben ein Krater, an den Flanken glühende Lavaströme
  function makeVenusVolcano(R, Hh) {
    const ROCK = srgb(0x4a3322), ASH = srgb(0x6b4a30), LAVA = srgb(0xff6a1a), c = new THREE.Color();
    const m = polarMountain(R, Hh, 40, 96, (r, a) => {
      const streak = fbm2(Math.cos(a) * 11 + r, Math.sin(a) * 11 + r * 3);
      let h = r < 0.08 ? 0.86 + 0.14 * smooth(0, 0.08, r) : Math.pow(1 - (r - 0.08) / 0.92, 1.4);
      if (r > 0.1) h += (streak - 0.5) * 0.05 * (1 - r);
      c.copy(ROCK).lerp(ASH, smooth(0.3, 0.7, fbm2(a * 3, r * 5)));
      const lava = smooth(0.62, 0.7, streak) * (1 - smooth(0.25, 0.75, r)); // frische Lava nahe am Gipfel
      c.lerp(LAVA, lava);
      return [h, c];
    });
    return m;
  }
  // Kleiner Mond wie eine Kartoffel: unregelmäßig, mit Kratern (big = ein großer Krater wie „Stickney“ auf Phobos)
  function potatoMoonGeo(seed, big) {
    const geo = new THREE.IcosahedronGeometry(1, 4), p = geo.attributes.position, v = new V(), col = new Float32Array(p.count * 3);
    const craters = [];
    for (let i = 0; i < 14; i++) { const d = new V(hash2(i, seed) - 0.5, hash2(i, seed + 1) - 0.5, hash2(i, seed + 2) - 0.5).normalize(); craters.push([d, 0.18 + hash2(i, seed + 3) * 0.25]); }
    if (big) craters.push([new V(1, 0.2, 0.3).normalize(), 0.62]);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      let r = 1 + (fbm2(v.x * 2 + seed, v.y * 2 + v.z * 1.7) - 0.5) * 0.45, shade = 0.8 + 0.25 * fbm2(v.x * 6 + seed, v.z * 6 - v.y * 4);
      for (const [c, cr] of craters) {
        const ang = Math.acos(Math.max(-1, Math.min(1, v.dot(c)))) / cr;
        if (ang < 1.3) { r -= 0.12 * cr * (ang < 1 ? 1 - ang * ang : 0) - 0.05 * cr * Math.exp(-Math.pow((ang - 1) / 0.18, 2)); if (ang < 1) shade *= 0.85; }
      }
      v.multiplyScalar(r); v.x *= 1.35; v.z *= 0.9; // länglich wie eine Kartoffel
      p.setXYZ(i, v.x, v.y, v.z);
      col[i * 3] = shade * 1.04; col[i * 3 + 1] = shade * 0.96; col[i * 3 + 2] = shade * 0.9;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }
  function naturalRockGeo(seed, detail = 3) {
    const geo = new THREE.IcosahedronGeometry(1, detail), p = geo.attributes.position, v = new V(), col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = fbm2(v.x * 1.6 + seed * 3.1, v.z * 1.6 + v.y * 1.3 - seed) - 0.5;
      const facet = (Math.round((v.x + v.y * 0.7) * 2.2 + seed) - Math.round(seed)) * 0.04; // grobe Bruchkanten (ohne die Größe zu ändern)
      v.multiplyScalar(1 + n * 0.55 + facet);
      if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.25; // unten flach, damit er aufliegt
      p.setXYZ(i, v.x, v.y, v.z);
      const k = 0.78 + 0.3 * fbm2(v.x * 3 + seed, v.y * 3 + v.z * 2);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }
  // Weicher dunkler Fleck unter einem Objekt – dann steht es auf dem Boden, statt zu schweben
  function addBlob(B, x, z, r) {
    if (!addBlob.mat) {
      const cv = document.createElement("canvas"); cv.width = cv.height = 64;
      const c = cv.getContext("2d"), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(0.6, "rgba(0,0,0,0.25)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      addBlob.mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
      addBlob.geo = new THREE.CircleGeometry(1, 24); addBlob.geo.rotateX(-Math.PI / 2);
    }
    const m = new THREE.Mesh(addBlob.geo, addBlob.mat); m.scale.setScalar(r);
    B.on(m, x, z, 0.03);
  }
  // Staubschleier tief am Horizont, die langsam vorbeiziehen
  function makeDustVeils(color, n) {
    const g = new THREE.Group(), mat = new THREE.SpriteMaterial({ map: glowTexture(color, "rgba(0,0,0,0)"), transparent: true, opacity: 0.28, depthWrite: false });
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(mat), a = (i / n) * Math.PI * 2 + hash2(i, 9);
      s.position.set(Math.cos(a) * 235, 9 + hash2(i, 4) * 10, Math.sin(a) * 235); s.scale.set(150 + hash2(i, 5) * 90, 26, 1);
      g.add(s);
    }
    return g;
  }
  // Steuerpult: schräges Pult mit leuchtendem Bildschirm
  function makeConsole() {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.5, roughness: 0.45 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.95, 0.7), metal); base.position.y = 0.48; base.castShadow = true; g.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.8), metal); top.position.set(0, 1.0, -0.05); top.rotation.x = -0.45; g.add(top);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false }));
    screen.position.set(0, 1.05, -0.09); screen.rotation.x = -Math.PI / 2 + 0.45 + Math.PI; g.add(screen);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4ade80, toneMapped: false })); lamp.position.set(0.5, 1.1, 0.3); g.add(lamp);
    g.userData.blink = [lamp];
    return g;
  }
  // Steuerpult aus dem Kenney-Kit: Bildschirm-Tisch mit Stuhl und einer blinkenden Lampe
  function makeKitConsole() {
    const g = new THREE.Group();
    g.add(kit("desk_computerScreen", 3.2));
    const chair = kit("desk_chair", 3.2); chair.position.z = 1.3; chair.rotation.y = Math.PI; g.add(chair);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4ade80, toneMapped: false })); lamp.position.set(0.7, 2.1, 0); g.add(lamp);
    g.userData.blink = [lamp];
    return g;
  }
  // Solar-Rover wie „Spirit“ und „Opportunity“ (2004 – 2018), vorn = +Z: ein flaches Solarzellen-Deck aus Mittelteil und fünf Flügeln,
  // darunter der Elektronik-Kasten in Goldfolie, sechs Räder an der Rocker-Bogie-Schwinge, vorn der Kameramast mit zwei „Augen“,
  // hinten die flache Hochgewinn-Antenne und der Stab der Rundstrahl-Antenne, vorn eingeklappt der Roboterarm.
  // userData.cells = Material der Solarzellen (färbt sich bei Staub rotbraun)
  function makeSolarRover(M) {
    const g = new THREE.Group(), cells = marsCellMat(M).clone();
    const gold = new THREE.MeshStandardMaterial({ map: foilTex(), roughness: 0.35, metalness: 0.7 });
    const white = M.std({ color: srgb(0xeef0f2), roughness: 0.5 }), grey = M.std({ color: srgb(0x9aa3ad), roughness: 0.4, metalness: 0.5 });
    const dark = M.std({ color: srgb(0x2b2e34), roughness: 0.8, metalness: 0.2 }), alu = M.std({ color: srgb(0xc3c8cf), roughness: 0.35, metalness: 0.75 });
    const lens = M.std({ color: srgb(0x0f1216), roughness: 0.12, metalness: 0.6 });
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.44, 1.4), gold), 0, 0.8, 0); // Elektronik-Kasten
    // Solarzellen-Deck: alle Teile in einer Ebene, mit schmalen Fugen dazwischen (nichts überlappt)
    const deckY = 1.045;
    for (const [w, d, x, z] of [[1.24, 1.5, 0, -0.03], [0.56, 1.17, -0.9, 0.035], [0.56, 1.17, 0.9, 0.035], [1.2, 0.42, 0, -1.0], [0.46, 0.44, -0.86, -0.83], [0.46, 0.44, 0.86, -0.83]])
      put(g, new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), [white, white, cells, white, white, white]), x, deckY, z);
    // Räder an der Rocker-Bogie-Schwinge: jedes Rad hängt an einem Bein, so fahren die echten Rover über Steine
    const wheels = [], WX = 0.95, WR = 0.22, BX = 0.8;
    for (const s of [-1, 1]) {
      for (const z of [-0.72, 0.02, 0.72]) {
        const w = put(g, new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, 0.18, 20), [dark, alu, alu]), s * WX, WR, z); w.rotation.z = Math.PI / 2; wheels.push(w);
        put(w, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12), grey), 0, 0, 0, false); // Nabe (dreht sich mit)
      }
      const x = s * BX, F = new V(x, 0.62, 0.55), P = new V(x, 0.8, 0.06), Bm = new V(x, 0.52, 0.02), Br = new V(x, 0.52, -0.72);
      pipeSeg(g, M, F, P, 0.035, white); pipeSeg(g, M, P, new V(x, 0.52, -0.35), 0.035, white); // Rocker bis zum Drehpunkt des Bogies
      pipeSeg(g, M, Bm, Br, 0.035, white); // Bogie
      for (const [top, z] of [[F, 0.72], [Bm, 0.02], [Br, -0.72]]) pipeSeg(g, M, top, new V(s * (WX - 0.1), WR, z), 0.03, white); // Beine zu den Naben
      pipeSeg(g, M, P, new V(s * 0.55, 0.8, 0.06), 0.045, grey); // Gelenk am Kasten
    }
    // Kameramast vorn rechts: Kamerakopf mit zwei Panoramakameras („Augen“) und obendrauf die Navigationskamera
    const mx = -0.42, mz = 0.5;
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), grey), mx, deckY + 0.075, mz);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.78, 10), white), mx, deckY + 0.48, mz);
    const head = new THREE.Group(); head.position.set(mx, deckY + 0.92, mz); g.add(head);
    put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), grey), 0, -0.06, 0);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.13), grey), 0, 0.03, 0);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.1), white), 0, 0.12, 0);
    for (const x of [-0.17, 0.17]) put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 14), lens), x, 0.03, 0.075, false).rotation.x = Math.PI / 2;
    // Hochgewinn-Antenne (flache Scheibe zur Erde) und Rundstrahl-Antenne (dünner Stab)
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 8), grey), 0.4, deckY + 0.12, -0.42);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 24), white), 0.4, deckY + 0.24, -0.42).rotation.x = -0.6;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), grey), 0.62, deckY + 0.3, -0.05, false);
    // Roboterarm vorn unter dem Deck eingeklappt, am Ende der Werkzeugkopf
    pipeSeg(g, M, new V(0.3, 0.7, 0.7), new V(0.3, 0.55, 0.95), 0.035, white);
    pipeSeg(g, M, new V(0.3, 0.55, 0.95), new V(-0.1, 0.55, 0.98), 0.03, white);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), grey), -0.16, 0.55, 0.98);
    g.userData = { wheels, heading: 0, speed: 0, cells, clean: cells.color.clone() };
    return g;
  }
  // Rover liegt mit allen Rädern auf dem Gelände: Neigung aus der Bodenhöhe vorn/hinten und links/rechts (sanft nachgeführt)
  function roverTilt(r, heading, dt = 1, half = 0.75, side = 0.95) {
    const H = world.height, p = r.position, u = r.userData, fx = Math.sin(heading), fz = Math.cos(heading);
    const hf = H(p.x + fx * half, p.z + fz * half), hb = H(p.x - fx * half, p.z - fz * half);
    const hl = H(p.x + fz * side, p.z - fx * side), hr = H(p.x - fz * side, p.z + fx * side), k = Math.min(1, dt * 8);
    u.pitch = (u.pitch || 0) + (Math.atan2(hf - hb, 2 * half) - (u.pitch || 0)) * k;
    u.roll = (u.roll || 0) + (Math.atan2(hl - hr, 2 * side) - (u.roll || 0)) * k;
    p.y = (hf + hb + hl + hr) / 4;
    r.rotation.set(-u.pitch, heading, u.roll, "YXZ");
  }
  // Fundstellen der Rover-Expedition: 0 = Kügelchen („Blaubeeren“, entstehen im Wasser), 1 = Schichtgestein (Grund eines Sees), 2 = Gestein für ein Proben-Röhrchen
  function makeSampleRock(i) {
    const g = new THREE.Group();
    if (i === 0) {
      put(g, new THREE.Mesh(naturalRockGeo(61, 3), new THREE.MeshStandardMaterial({ color: 0xc98b5e, roughness: 1, vertexColors: true })), 0, 0.12, 0).scale.set(0.9, 0.25, 0.8);
      const berry = new THREE.MeshStandardMaterial({ color: srgb(0x3e4a5c), roughness: 0.35, metalness: 0.3 });
      for (let k = 0; k < 16; k++) { const a = hash2(k, 3) * 6.3, r = 0.15 + hash2(k, 4) * 0.55; put(g, new THREE.Mesh(new THREE.SphereGeometry(0.06 + hash2(k, 5) * 0.04, 10, 8), berry), Math.cos(a) * r, 0.16 + hash2(k, 6) * 0.05, Math.sin(a) * r); }
    } else if (i === 1) {
      const cols = [0xd9a46c, 0xb8693e, 0xe7c08c, 0xa95a34, 0xd59a63];
      cols.forEach((c, k) => { const s = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.62 - k * 0.07, 0.68 - k * 0.07, 0.17, 9), new THREE.MeshStandardMaterial({ color: srgb(c), roughness: 1, flatShading: true })), 0, 0.085 + k * 0.17, 0); s.rotation.y = k * 0.5; s.rotation.z = 0.05 * (k % 2 ? 1 : -1); });
    } else {
      put(g, new THREE.Mesh(naturalRockGeo(67, 3), new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 1, vertexColors: true })), 0, 0.3, 0).scale.set(0.8, 0.6, 0.7);
      const tube = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 10), new THREE.MeshStandardMaterial({ color: srgb(0xf4f4f5), roughness: 0.25, metalness: 0.6 })), 0.75, 0.05, 0.2); tube.rotation.z = Math.PI / 2;
    }
    return g;
  }
  // die Fundstellen im alten Flussdelta (rund um den hellen Fächer)
  const roverSamples = (L) => [[L.roverZiel[0] + 10, L.roverZiel[1] - 8], [L.roverZiel[0] - 4, L.roverZiel[1] + 9], [L.roverZiel[0] - 10, L.roverZiel[1] - 6]];
  // Rover: fertiges Modell (Kenney), sonst das selbstgebaute
  function makeMarsRover(nasa = true) {
    const real = nasa && nasaModel(["perseverance"], 3.0); // der echte Rover Perseverance
    if (real) { real.userData = { wheels: [], heading: 0, speed: 0 }; return real; }
    if (!KIT.rover) return makeRover();
    const g = new THREE.Group(); g.add(kit("rover", 7));
    g.userData = { wheels: [], heading: 0, speed: 0 };
    return g;
  }
  // Hubschrauber: das echte Modell von Ingenuity (Rotoren drehen sich um die senkrechte Achse), sonst das selbstgebaute
  function makeMarsHeli() {
    const g = nasaModel(["ingenuity"], 2.6); // etwas größer als in echt (1,2 m Rotor), damit man ihn gut sieht
    if (!g) return makeHeli();
    const rotors = [];
    g.traverse((o) => { if (/rotor/i.test(o.name)) rotors.push(o); });
    const q = new THREE.Quaternion(), pw = new THREE.Quaternion();
    g.userData = {
      rotor: new THREE.Object3D(),
      spin(dt) {
        rotors.forEach((r, i) => {
          r.parent.getWorldQuaternion(pw);
          const axis = new V(0, 1, 0).applyQuaternion(pw.invert()).normalize(); // Welt-Senkrechte im Raum des Rotors
          r.quaternion.premultiply(q.setFromAxisAngle(axis, dt * 40 * (i % 2 ? -1 : 1))); // gegenläufig wie beim echten Ingenuity
        });
      }
    };
    return g;
  }
  // Landeplatz für den Hubschrauber: Scheibe mit großem „H“
  function makeHeliPad() {
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const x = cv.getContext("2d");
    x.fillStyle = "#3a3f47"; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
    x.strokeStyle = "#fcd34d"; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.stroke();
    x.fillStyle = "#f8fafc"; x.font = "bold 70px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("H", 64, 68);
    const m = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
    return m;
  }

  // =========================================================
  //  Mars-Außenposten: Gebäude, zu denen die Aufgaben gehören (alles nach echten Raumfahrt-Ideen)
  // =========================================================
  const signTex = (text, bg, w = 512, h = 96, font = 54) => canvasTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.font = `bold ${font}px sans-serif`;
    const tw = c.measureText(text).width; // zu lange Schrift kleiner machen, statt sie am Rand abzuschneiden
    if (tw > w * 0.92) c.font = `bold ${Math.floor(font * (w * 0.92) / tw)}px sans-serif`;
    c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, w / 2, h / 2 + 3);
  });
  const signMat = (text, bg, w, h, font) => new THREE.MeshStandardMaterial({ map: signTex(text, bg, w, h, font), roughness: 0.5 });
  function marsCellMat(M) { // Solarzellen: dunkelblau mit silbernen Linien
    const cells = canvasTex(256, 128, (c) => {
      c.fillStyle = "#0f2a6b"; c.fillRect(0, 0, 256, 128);
      const grd = c.createLinearGradient(0, 0, 256, 128); grd.addColorStop(0, "rgba(120,170,255,0.25)"); grd.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = grd; c.fillRect(0, 0, 256, 128);
      c.strokeStyle = "#c7d2fe"; c.lineWidth = 2;
      for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, 128); c.stroke(); }
      for (let j = 0; j <= 4; j++) { c.beginPath(); c.moveTo(0, j * 32); c.lineTo(256, j * 32); c.stroke(); }
    });
    return M.std({ map: cells, roughness: 0.2, metalness: 0.4, envMapIntensity: 1.3 });
  }
  // Rohr von a nach b (Mittelpunkte), liegt auf kleinen Stützen
  function pipeSeg(parent, M, a, b, r = 0.14, mat = M.steel) {
    const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 12), mat);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V(0, 1, 0), d.normalize()); m.castShadow = true;
    parent.add(m); return m;
  }

  // Sternwarte mit Klappkuppel (lokal: Tür nach +Z). Zum Beobachten klappen beide Schalen nach unten weg – wie bei echten kleinen Sternwarten.
  function makeObservatory(M) {
    const g = new THREE.Group(), R = 2.6, H = 1.45;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.1, H, 40, 1, true), M.std({ map: hullTex(6, 1), roughness: 0.45, side: THREE.DoubleSide })), 0, H / 2, 0).receiveShadow = true;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(R + 0.09, R + 0.09, 0.18, 40, 1, true), M.orange), 0, H - 0.05, 0, false);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(R + 0.15, R + 0.2, 0.25, 40, 1, true), M.teal), 0, 0.12, 0, false);
    put(g, new THREE.Mesh(new THREE.CircleGeometry(R, 40), M.metal), 0, 0.03, 0, false).rotation.x = -Math.PI / 2;
    const door = put(g, new THREE.Mesh(new THREE.BoxGeometry(1, 1.25, 0.2), M.metal), 0, 0.63, R + 0.02);
    put(door, new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), M.glowBlue), 0, 0.3, 0.11, false);
    const board = new THREE.Group(); board.position.set(1.9, 0, R + 1.1); board.rotation.y = -0.35; g.add(board);
    for (const x of [-0.8, 0.8]) put(board, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), M.steel), x, 0.6, 0);
    put(board, new THREE.Mesh(new THREE.PlaneGeometry(2, 0.4), signMat("🔭 STERNWARTE", "#1e3a8a", 512, 96, 52)), 0, 1.05, 0.03, false);
    const shell = M.std({ map: hullTex(4, 2), roughness: 0.4, side: THREE.DoubleSide }), halves = [];
    for (const s of [1, -1]) {
      const pivot = new THREE.Group(); pivot.position.y = H; g.add(pivot);
      const m = new THREE.Mesh(new THREE.SphereGeometry(R - 0.04, 40, 16, s > 0 ? 0 : Math.PI, Math.PI, 0, Math.PI / 2), shell);
      m.castShadow = true; pivot.add(m);
      put(pivot, new THREE.Mesh(new THREE.TorusGeometry(R - 0.04, 0.05, 6, 32, Math.PI), M.orange), 0, 0, 0, false).rotation.y = s > 0 ? 0 : Math.PI; // Kante der Schale
      halves.push({ pivot, s });
    }
    g.userData = { open: 0, target: 0, set(k) { for (const h of halves) h.pivot.rotation.x = h.s * k * Math.PI * 0.49; } };
    return g;
  }
  // Himmelskamera: Kamera auf einer Säule, das Objektiv schaut zur Sonne
  function makeSkyCam(M, dir) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.2, 16), M.steel), 0, 0.6, 0);
    const head = new THREE.Group(); head.position.y = 1.4; head.quaternion.setFromUnitVectors(new V(0, 0, 1), dir.clone().normalize()); g.add(head);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.62), M.hull(1, 1)), 0, 0, 0);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.64), M.orange), 0, 0.15, 0, false);
    put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.3, 20), M.metal), 0, 0, 0.44).rotation.x = Math.PI / 2;
    put(head, new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), M.std({ color: srgb(0x0c2a4a), roughness: 0.05, metalness: 0.8, envMapIntensity: 1.6 })), 0, 0, 0.595, false);
    return g;
  }
  // Wetterstation: hoher Mast mit Windmesser (die Schalen drehen sich), Messkästen, Windfahne und Schild
  function makeWeatherMast(M) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 6, 10), M.steel), 0, 3, 0);
    for (let i = 0; i < 3; i++) { // Abspannseile
      const a = (i / 3) * Math.PI * 2 + 0.4;
      pipeSeg(g, M, new V(Math.sin(a) * 2.2, 0.05, Math.cos(a) * 2.2), new V(0, 4.2, 0), 0.012, M.metal);
    }
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.07), M.steel), 0, 5.2, 0);
    for (const x of [-0.45, 0.45]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.24), M.hull(1, 1)), x, 4.95, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.35), M.hull(1, 1)), 0, 1.4, 0.2);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.37), M.teal), 0, 1.72, 0.2, false);
    const panel = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.6), marsCellMat(M)), 0, 2.3, -0.35); panel.rotation.x = 0.6;
    const cups = new THREE.Group(); cups.position.set(0, 6.1, 0); g.add(cups);
    put(cups, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), M.metal), 0, -0.05, 0);
    const cupGeo = new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, arm = new THREE.Group(); arm.rotation.y = a; cups.add(arm);
      put(arm, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.025), M.steel), 0.25, 0, 0, false);
      put(arm, new THREE.Mesh(cupGeo, M.orange), 0.5, 0, 0, false).rotation.x = Math.PI / 2;
    }
    const vane = new THREE.Group(); vane.position.set(0.55, 5.45, 0); g.add(vane);
    put(vane, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.5), M.orange), 0, 0, -0.2, false);
    put(vane, new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 8), M.metal), 0, 0, 0.12, false).rotation.x = Math.PI / 2;
    for (const r of [0, Math.PI]) put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.36), signMat("🌡️ WETTERSTATION", "#0d9488", 512, 110, 50)), 0, 2.85, r ? -0.08 : 0.08, false).rotation.y = r;
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.44, 0.12), M.metal), 0, 2.85, 0);
    g.userData.spin = cups; g.userData.vane = vane;
    g.userData.lamp = blinkLamp(g, 0xff3b30, 0, 6.3, 0);
    return g;
  }
  // Wasser-Anlage am Bohrer (der Bohrer selbst steht im Nullpunkt): Pumpe, Schlauch und Tank – Eis wird geschmolzen und gereinigt
  function makeWaterPlant(M) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.RingGeometry(0.15, 1.25, 32), M.metal), 0, 0.03, 0, false).rotation.x = -Math.PI / 2;
    const tank = new THREE.Group(); tank.position.set(2.7, 0, 1.7); g.add(tank);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) put(tank, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), M.metal), x, 0.25, z);
    put(tank, new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.4, 32), M.hull(5, 1.5)), 0, 1.7, 0).receiveShadow = true;
    const cap = put(tank, new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.hull(5, 1)), 0, 2.9, 0); cap.scale.y = 0.35;
    const blue = M.std({ color: srgb(0x2563eb), roughness: 0.4, envMapIntensity: 0.45 });
    put(tank, new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.07, 0.3, 32, 1, true), blue), 0, 0.75, 0, false);
    const a = Math.atan2(-1, -1), arc = 1.5; // Schild zur Kamera hin
    put(tank, new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.5, 24, 1, true, a - arc / 2, arc), signMat("💧 WASSER", "#2563eb", 384, 96, 60)), 0, 2.1, 0, false);
    const pump = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.6), M.hull(1, 1)), 1.5, 0.35, -0.5);
    put(pump, new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.12, 0.62), M.teal), 0, 0.3, 0, false);
    put(pump, new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), M.glowBlue), -0.41, 0, 0, false).rotation.y = -Math.PI / 2;
    pipeSeg(g, M, new V(0.35, 0.18, -0.1), new V(1.1, 0.18, -0.45), 0.07, M.orange); // Schlauch vom Bohrer
    pipeSeg(g, M, new V(1.9, 0.5, -0.5), new V(2.3, 0.5, 0.9), 0.1);
    const lamp = new THREE.Group(); lamp.position.set(4.3, 0, -0.3); g.add(lamp);
    put(lamp, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3, 8), M.metal), 0, 1.5, 0);
    put(lamp, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), M.metal), -0.15, 3.05, 0.15).rotation.y = -0.8;
    return g;
  }
  // Rover-Leitstand: Halbröhre mit Fensterreihe (lokal: Fenster nach +Z), Antenne auf dem Dach, Schild
  function makeRoverHut(M) {
    const g = new THREE.Group(), r = 2.1, len = 4.6;
    const body = put(g, new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 32, 1, false, 0, Math.PI), M.hull(6, 2)), 0, 0, 0);
    body.rotation.z = Math.PI / 2; body.receiveShadow = true;
    for (const x of [-1.6, 0, 1.6]) put(g, new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.07, 8, 24, Math.PI), M.orange), x, 0, 0, false).rotation.y = Math.PI / 2;
    for (const x of [-0.8, 0.8]) {
      const w = put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.55), M.glowBlue), x, r * Math.sin(0.65), r * Math.cos(0.65) + 0.01, false); w.rotation.x = -0.65;
    }
    const door = put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.6), M.metal), len / 2 + 0.01, 0.8, 0, false); door.rotation.y = Math.PI / 2;
    blinkLamp(g, 0x4ade80, len / 2 + 0.05, 1.8, 0);
    const sign = put(g, new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), signMat("🤖 ROVER-LEITSTAND", "#c84a12", 640, 120, 58)), 0, 0.55, r * Math.cos(0.27) + 0.03, false);
    sign.rotation.x = -0.27;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), M.steel), -1.2, r + 0.45, 0);
    const dish = put(g, dishCap(M, 0.7, 0.8), -1.2, r + 1.35, 0.1);
    dish.rotation.x = Math.PI + 0.6;
    return g;
  }
  // Rover-Garage: Carport mit Solardach und Ladesäule (lokal: Ausfahrt nach +Z)
  function makeCarport(M) {
    const g = new THREE.Group();
    for (const [x, z] of [[-1.8, -2.4], [1.8, -2.4], [-1.8, 2.4], [1.8, 2.4]]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), M.steel), x, 1.3, z);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.12, 5.1), M.steel), 0, 2.65, 0);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(3.7, 4.9), marsCellMat(M)), 0, 2.72, 0, false).rotation.x = -Math.PI / 2;
    const post = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.25), M.hull(1, 1)), 2.15, 0.55, -1.6);
    put(post, new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.12, 0.27), M.teal), 0, 0.35, 0, false);
    blinkLamp(post, 0x4ade80, 0, 0.62, 0);
    for (const r of [0, Math.PI]) put(g, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.42), signMat("🔌 ROVER-GARAGE", "#0d9488", 512, 96, 50)), 0, 2.35, r ? -2.45 : 2.45, false).rotation.y = r;
    return g;
  }
  // Flugfeld: Lichter rund um den Landeplatz, Ladestation mit Solarzelle, Schild
  function makeFlightField(M) {
    const g = new THREE.Group(), lights = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 10), M.metal), Math.sin(a) * 2.7, 0.08, Math.cos(a) * 2.7);
      lights.push(blinkLamp(g, 0xfbbf24, Math.sin(a) * 2.7, 0.22, Math.cos(a) * 2.7));
    }
    const st = new THREE.Group(); st.position.set(2.2, 0, 4.2); st.rotation.y = 2.6; g.add(st);
    put(st, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.8), M.hull(1, 1)), 0, 0.45, 0);
    put(st, new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.82), M.orange), 0, 0.8, 0, false);
    const sp = put(st, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.9), marsCellMat(M)), 0, 1.3, -0.1); sp.rotation.x = 0.5;
    put(st, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), M.steel), 0, 1.05, 0);
    const sign = new THREE.Group(); sign.position.set(-3.6, 0, 2.2); sign.rotation.y = -0.9; g.add(sign);
    for (const x of [-0.8, 0.8]) put(sign, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), M.steel), x, 0.65, 0);
    for (const r of [0, Math.PI]) put(sign, new THREE.Mesh(new THREE.PlaneGeometry(2, 0.42), signMat("🚁 FLUGFELD", "#c84a12", 512, 110, 56)), 0, 1.1, r ? -0.02 : 0.02, false).rotation.y = r;
    g.userData.lights = lights;
    return g;
  }
  // Anzeigetafel am Raumhafen (vorn = +Z)
  function makeInfoBoard(M, title, lines) {
    const g = new THREE.Group();
    for (const x of [-1.25, 1.25]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 8), M.steel), x, 1.45, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.7, 0.12), M.hull(2, 1)), 0, 2, 0);
    const tex = canvasTex(640, 360, (c) => {
      c.fillStyle = "#0b1b33"; c.fillRect(0, 0, 640, 360);
      c.fillStyle = "#c84a12"; c.fillRect(0, 0, 640, 84);
      c.fillStyle = "#fff"; c.textBaseline = "middle"; c.font = "bold 50px sans-serif"; c.textAlign = "center"; c.fillText(title, 320, 46);
      c.textAlign = "left"; c.font = "bold 40px sans-serif";
      lines.forEach((l, i) => { c.fillStyle = i % 2 ? "#a5f3fc" : "#fde68a"; c.fillText(l, 34, 134 + i * 76); });
    });
    for (const r of [0, Math.PI]) put(g, new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.52), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })), 0, 2, r ? -0.065 : 0.065, false).rotation.y = r;
    return g;
  }
  // Vordach am Turm (Turm-Mitte = Nullpunkt, lokal +Z = nach außen): Dach, farbige Blende mit Schild, zwei Stützen
  function colonyAwning(g, M, tx, tz, dir, r, label, color) {
    const a = new THREE.Group(); a.position.set(tx, 0, tz); a.rotation.y = Math.atan2(dir.x, dir.z); g.add(a);
    const accent = M.std({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.4, envMapIntensity: 0.45 });
    const z0 = r - 0.2, z1 = r + 3.1;
    const roof = put(a, new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.12, z1 - z0), M.hull(2, 2)), 0, 3.1, (z0 + z1) / 2); roof.rotation.x = 0.05;
    put(a, new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.46, 0.12), accent), 0, 2.98, z1);
    put(a, new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.42), signMat(label, color, 640, 80, 52)), 0, 2.98, z1 + 0.065, false);
    for (const x of [-1.75, 1.75]) put(a, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.95, 8), M.steel), x, 1.47, z1 - 0.15);
    return a;
  }
  // Waagen-Ecke am Wohnturm: Arzneischrank mit rotem Kreuz
  function healthCorner(a, M, r) {
    const cab = put(a, new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.4), M.hull(1, 1)), 1.35, 0.65, r + 1.85);
    const red = M.std({ color: srgb(0xdc2626), roughness: 0.4, envMapIntensity: 0.4 });
    put(cab, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.02), red), 0, 0.3, 0.21, false);
    put(cab, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.02), red), 0, 0.3, 0.21, false);
  }
  // Labor-Ecke: Regal mit Probengläsern und ein Mikroskop
  function labCorner(a, M, r) {
    const shelf = new THREE.Group(); shelf.position.set(-1.25, 0, r + 1.9); a.add(shelf);
    for (const x of [-0.38, 0.38]) put(shelf, new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.4), M.steel), x, 0.8, 0);
    const jarCols = [0xc2410c, 0x92400e, 0xfbbf24, 0x7c2d12, 0xe5e7eb].map((c) => M.std({ color: srgb(c), roughness: 0.3 }));
    const jar = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10);
    [0.45, 0.95, 1.45].forEach((y, j) => {
      put(shelf, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.4), M.steel), 0, y, 0, false);
      for (let i = 0; i < 5; i++) put(shelf, new THREE.Mesh(jar, jarCols[(i + j * 2) % 5]), -0.28 + i * 0.14, y + 0.1, 0, false);
    });
  }
  // Sauerstoff-Anlage: macht aus dem Kohlendioxid der Marsluft Sauerstoff (wie das Gerät MOXIE im Rover Perseverance)
  function colonyMoxie(g, M, cx, cz, face) {
    const m = new THREE.Group(); m.position.set(cx, 0, cz); m.rotation.y = face; g.add(m);
    put(m, new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 1.6), M.hull(2, 1)), 0, 0.85, 0).receiveShadow = true;
    put(m, new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.18, 1.62), M.teal), 0, 1.45, 0, false);
    for (const x of [-0.6, 0.6]) {
      put(m, new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), M.metal), x, 0.75, 0.81, false);
      put(m, new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.05, 8, 24), M.steel), x, 0.75, 0.82, false);
    }
    put(m, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.36), signMat("O₂ SAUERSTOFF-ANLAGE", "#0d9488", 640, 104, 50)), 0, 1.45, 0.83, false);
    const blueBand = M.std({ color: srgb(0x2563eb), roughness: 0.4, envMapIntensity: 0.45 });
    for (const [z, y] of [[-1.55, 0.5], [-2.5, 0.5], [-2.02, 1.32]]) {
      const t = put(m, new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.8, 6, 20), M.hull(3, 1)), 0, y, z); t.rotation.z = Math.PI / 2;
      put(m, new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.22, 20, 1, true), blueBand), 0.5, y, z, false).rotation.z = Math.PI / 2;
    }
    for (const x of [-0.8, 0.8]) put(m, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 1.5), M.metal), x, 0.15, -2.02);
    pipeSeg(m, M, new V(-1.2, 1.1, 0), new V(-2.6, 1.1, 0.6), 0.1);
  }
  // Trampelpfade zwischen den Gebäuden: festgefahrener, hellerer Staub mit zwei Reifenspuren
  const pathTexCache = {};
  function marsPathTex([cr, cg, cb] = [214, 150, 108]) {
    const key = `${cr},${cg},${cb}`;
    if (pathTexCache[key]) return pathTexCache[key];
    const t = canvasTex(64, 256, (c) => {
      const img = c.createImageData(64, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
        const u = x / 63, edge = Math.min(1, Math.min(u, 1 - u) / 0.25), n = hash2(x * 1.3, y * 0.7) * 0.15;
        const track = Math.exp(-((u - 0.3) ** 2) / 0.003) + Math.exp(-((u - 0.7) ** 2) / 0.003), i = (y * 64 + x) * 4;
        img.data[i] = cr - track * cr * 0.26 - n * 80; img.data[i + 1] = cg - track * cg * 0.3 - n * 60; img.data[i + 2] = cb - track * cb * 0.32 - n * 40;
        img.data[i + 3] = 235 * edge * (0.8 + n);
      }
      c.putImageData(img, 0, 0);
    });
    t.wrapT = THREE.RepeatWrapping;
    return (pathTexCache[key] = t);
  }
  // Der Rundgang: ein durchgehender Pfad von der Rakete über alle Stationen in der Reihenfolge der Führung
  function drawTour(B, L, col, w = 2) {
    const pts = [[L.spawn[0] + 2, L.spawn[1] + 2]];
    for (const k of [...cfg.guide.order, "wand"]) for (const p of (L.route[k] || [])) pts.push(p);
    makePath(B, pts, w, col);
  }
  function makePath(B, pts, w = 2.2, col) {
    const P = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.8));
      for (let k = 0; k < n; k++) P.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    }
    P.push(pts[pts.length - 1]);
    const pos = [], uv = [], idx = [];
    let dist = 0;
    P.forEach(([x, z], i) => {
      const [px, pz] = P[Math.max(0, i - 1)], [nx, nz] = P[Math.min(P.length - 1, i + 1)];
      let dx = nx - px, dz = nz - pz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      if (i) dist += Math.hypot(x - P[i - 1][0], z - P[i - 1][1]);
      for (const s of [-1, 1]) {
        const vx = x - dz * s * w / 2, vz = z + dx * s * w / 2;
        pos.push(vx, B.height(vx, vz) + 0.05, vz); uv.push(s < 0 ? 0 : 1, dist / 5);
      }
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: marsPathTex(col), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.receiveShadow = true; B.scene.add(m);
    return m;
  }
  // Sanddünen im Westen: lange, geschwungene Kämme
  const DUNE_AT = [-72, 12];
  function duneMask(x, z) { return 1 - smooth(38, 78, Math.hypot(x - DUNE_AT[0], z - DUNE_AT[1])); }
  function marsDunes(x, z) {
    const m = duneMask(x, z); if (m <= 0) return 0;
    const ridge = 0.5 + 0.5 * Math.sin(x * 0.2 + z * 0.07 + fbm2(x * 0.03, z * 0.03) * 4);
    return Math.pow(ridge, 2.4) * 2.4 * m;
  }

  function buildMars() {
    const L = { ...MARS_LAYOUT };
    const rich = !W.fast; // „⚡ Flüssig“: weniger Zierrat
    const craters = [[60, -40, 16, 2], [-75, 65, 14, 1.8], [90, 50, 10, 1.2], [-45, -75, 18, 2.4], [45, 100, 12, 1.6], [70, 5, 6, 0.8]];
    const up = (p, r) => [...p, r, "auto", 3]; // Plätze oben auf der Hochebene: eben, aber auf ihrer Höhe
    const flats = [up([0, 0], 10), [...L.station, 20], [L.station[0], L.station[1] + 16, 26], [...L.waage, 4], up(L.monde, 5), up(L.vulkan, 6), [...L.rover, 7], [...L.roverStart, 5], [...L.eis, 7], [...L.pad, 7], up(L.abend, 5), up(L.wegweiser, 2.5), up(MARS_MAST(L.abend), 2)];
    const dustColors = ["rgba(190,110,70,1)", "rgba(170,95,60,0.9)"];
    const B = buildBase({
      height: makeHeight(craters, flats, 40, (x, z) => marsDunes(x, z) + marsPlateau(x, z)),
      // dünne, staubige Luft: gelbbrauner Himmel, Dunst in der Ferne, keine Sterne am Tag, die Sonne wirkt kleiner als auf der Erde
      sky: MARS_SKY.getHex(), fog: [90, 430], stars: false, sunSize: 105,
      ground: 0xb8623a, rock: 0x7d4a35,
      tint: (x, z) => {
        let m = 0.75 + 0.25 * fbm2(x * 0.015 + 9, z * 0.015), r = m, g = m * 0.95, b = m * 0.9;
        const d = duneMask(x, z); // in den Dünen: feiner, hellerer Sand
        if (d > 0) { r += (1.08 - r) * d; g += (0.86 - g) * d; b += (0.62 - b) * d; }
        const cliff = marsPlateau(x, z); // Gesteinsschichten an der Steilkante
        if (cliff > 0.4 && cliff < 7.6) { const band = 0.82 + 0.18 * Math.sin(cliff * 5.5); r *= band; g *= band * 0.96; b *= band * 0.92; }
        const delta = smooth(30, 12, Math.hypot(x - L.roverZiel[0], z - L.roverZiel[1])); // helles Flussdelta mit Rinnen
        if (delta > 0) { const ch = 0.5 + 0.5 * Math.sin((x - L.roverZiel[0]) * 0.5 + Math.sin(z * 0.2) * 3); r += (1.15 * (0.9 + 0.1 * ch) - r) * delta; g += (0.92 * (0.9 + 0.1 * ch) - g) * delta; b += (0.7 - b) * delta; }
        m = 0.9 + 0.1 * hash2(Math.floor(x * 2), Math.floor(z * 2)); // feine Körnung
        return [r * m, g * m, b * m];
      },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [L.station[0], L.station[1] + 16, 26], [...L.monde, 6], [...L.vulkan, 6], [...L.rover, 8],
        [...L.roverZiel, 3], [...L.eis, 7], [...L.wegweiser, 3], [...L.abend, 6]],
      ambient: [0xffd2a8, 0.5], hemi: [0xe8b98a, 0x6b3a22, 0.35], sun: [0xfff0dc, 1.45],
      dust: dustColors
    });
    const { scene, height, on, rocket } = B;

    // Himmel: die beiden kleinen Monde (kartoffelförmig) und in der Ferne der Olympus Mons
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x6f6157, roughness: 1, vertexColors: true, fog: false });
    const phobos = new THREE.Mesh(potatoMoonGeo(3, true), moonMat); phobos.scale.set(8, 7, 6.5);
    phobos.position.copy(PHOBOS_DIR).multiplyScalar(900);
    const deimos = new THREE.Mesh(potatoMoonGeo(9, false), moonMat); deimos.scale.set(2.8, 2.5, 2.3);
    deimos.position.copy(DEIMOS_DIR).multiplyScalar(900);
    const flat = (c) => new THREE.MeshBasicMaterial({ color: c, fog: false });
    const volcanoAt = VOLCANO_DIR.clone().multiplyScalar(1500), side = new V().crossVectors(VOLCANO_DIR, new V(0, 1, 0));
    const haze = srgb(0xd8ab82); // ferner Staubdunst
    const volcano = makeShieldVolcano(860, VOLCANO_H, haze);
    volcano.position.copy(volcanoAt).setY(-12);
    const volcanoLabel = mountainLabel("Olympus Mons", "22 km hoch"); volcanoLabel.position.copy(volcanoAt).setY(VOLCANO_H + 70); volcanoLabel.scale.set(240, 75, 1);
    // Vergleichsberge im selben Maßstab (erst im Hubschrauber sichtbar)
    const peak = (km, r, rock, snow, shift, seed, name, label) => {
      const hgt = (km / REAL_H) * VOLCANO_H, m = makeRockPeak(r, hgt, rock, snow, haze, seed);
      m.position.copy(volcanoAt).addScaledVector(VOLCANO_DIR, -720).addScaledVector(side, shift).setY(-6);
      const l = mountainLabel(name, label); l.position.copy(m.position).setY(hgt + 34); l.scale.set(120, 38, 1); m.userData.label = l; scene.add(l);
      m.visible = false; return m;
    };
    const everest = peak(8.85, 150, 0x5c5450, 0.42, -190, 1.3, "Mount Everest", "8,8 km");
    const zugspitze = peak(2.96, 70, 0x9c9a94, 0.62, 150, 4.1, "Zugspitze", "3 km");
    scene.add(phobos, deimos, volcano, volcanoLabel, everest, zugspitze);

    // Stationen – jede gehört zu einem Gebäude des Außenpostens
    const M = colonyMats();
    const observatory = on(makeObservatory(M), ...L.monde); // Sternwarte: Tür zur Rakete hin, das Fernrohr steht drinnen
    observatory.rotation.y = Math.atan2(-L.monde[0], -L.monde[1]);
    const telescope = on(makeTelescope(PHOBOS_DIR), ...L.monde);
    const scale = on(makeScale(), ...L.waage); // unter dem Vordach „Gesundheits-Check“ am Wohnturm
    scale.rotation.y = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);
    const heli = on(makeMarsHeli(), ...L.vulkan);
    on(makeHeliPad(), ...L.vulkan, 0.04);
    const field = on(makeFlightField(M), ...L.vulkan);
    const toGoal = Math.atan2(L.roverZiel[0] - L.rover[0], L.roverZiel[1] - L.rover[1]);
    const console_ = on(KIT.desk_computerScreen ? makeKitConsole() : makeConsole(), ...L.rover); // Steuerpult vor dem Leitstand
    console_.rotation.y = toGoal + Math.PI;
    const hut = on(makeRoverHut(M), L.rover[0] + Math.cos(toGoal) * 3.8, L.rover[1] - Math.sin(toGoal) * 3.8); // neben dem Pult (nicht hinter dem Rover, sonst verdeckt er die Kamera), Fenster und Schild zur Rakete hin
    hut.rotation.y = Math.atan2(L.spawn[0] - hut.position.x, L.spawn[1] - hut.position.z);
    const carport = on(makeCarport(M), ...L.roverStart); carport.rotation.y = MARS_ROVER_PARK;
    const rover = on(makeSolarRover(M), ...L.roverStart); // Solar-Rover wie Spirit und Opportunity
    const samples = roverSamples(L).map(([x, z], i) => {
      on(makeSampleRock(i), x, z);
      const mk = makeMarker(); mk.scale.setScalar(0.9);
      mk.userData.beam.material.color.set(0xfcd34d); mk.userData.ring.material.color.set(0xfcd34d); mk.userData.pad.material.color.set(0xfcd34d);
      mk.userData.setIcon("🪨", 0xfcd34d);
      on(mk, x, z); mk.visible = false;
      return { i, x, z, mk, done: false };
    });
    const patrolRover = makeMarsRover(); // der große Rover Perseverance fährt selbst seine Runden (siehe updatePatrol)
    const drill = on(makeDrill(), ...L.eis);
    on(makeWaterPlant(M), ...L.eis);
    const [ex, ez] = L.eis, pipe = new THREE.Group(); scene.add(pipe); // Wasserleitung vom Tank zum Labor-Turm
    const pipePts = [[ex + 3.4, ez + 2.4], [ex + 1, ez + 12], [L.station[0] + MARS_TOWER[0] + 4.6, L.station[1] + MARS_TOWER[1] + 1.4]].map(([x, z]) => new V(x, height(x, z) + 0.45, z));
    for (let i = 0; i < pipePts.length - 1; i++) {
      pipeSeg(pipe, M, pipePts[i], pipePts[i + 1], 0.16);
      const n = Math.floor(pipePts[i].distanceTo(pipePts[i + 1]) / 3);
      for (let k = 1; k <= n; k++) { const p = pipePts[i].clone().lerp(pipePts[i + 1], k / (n + 1)); put(pipe, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.3), M.metal), p.x, p.y - 0.25, p.z); }
    }
    const board = on(makeInfoBoard(M, "RAUMHAFEN MARS", ["☀️ Sonne: 228 Mio. km", "🌍 Erde: 55 – 400 Mio. km", "🚀 Flug zur Erde: 7 Monate"]), ...L.wegweiser);
    board.rotation.y = Math.atan2(L.spawn[0] - L.wegweiser[0], L.spawn[1] - L.wegweiser[1]);
    const devil = on(makeDevil(dustColors), ...L.teufel);
    const station = on(makeStation(cfg.discoveries, "Marsstation", "mars"), ...L.station);
    on(makeSkyCam(M, new V(SUN_DIR.x, 0.12, SUN_DIR.z)), ...L.abend); // Himmelskamera der Wetterstation, schaut zum Sonnenuntergang
    const weather = on(makeWeatherMast(M), ...MARS_MAST(L.abend)); // Mast seitlich, damit er beim Sonnenuntergang nicht im Bild steht
    const magnetTable = on(makeMagnetTable(), ...L.rost); // unter dem Vordach „Proben-Labor“
    magnetTable.rotation.y = Math.atan2(LAB_DIR.x, LAB_DIR.z);
    // Trampelpfad: der Rundgang, den Mia mit dem Kind läuft – über die Hochebene, die Rampe hinab ins Tal, durch den Außenposten
    drawTour(B, L);
    on(makeSignBoard(M, "🏞️ ALTES FLUSSDELTA", "#c84a12", 2.8), L.roverZiel[0] + 6, L.roverZiel[1] - 6).rotation.y = Math.atan2(L.rover[0] - L.roverZiel[0], L.rover[1] - L.roverZiel[1]);
    on(makeSignBoard(M, "⬇️ ZUM AUSSENPOSTEN", "#0d9488", 2.6), -32, 10).rotation.y = Math.atan2(32, -10);
    // Landschaft mit Charakter: Himmelsverlauf, Tafelberge am Horizont, Felsgruppen, Staubschleier, ein Rover auf Patrouille
    const skyDome = makeSkyDome(1.12, 0.74); skyDome.material.color.copy(MARS_SKY); scene.add(skyDome);
    const bands = bandTexture(["#8a4a33", "#9b5a3f", "#7a3f2b", "#a8694a", "#8f5038", "#b37757"], 3); // gedämpfte Rottöne, die im Dunst verschwimmen
    const buttes = [[-150, 120, 34, 42], [175, 95, 26, 30], [135, -165, 40, 36], [-195, -28, 30, 48], [60, 215, 44, 28], [-60, -205, 24, 26]];
    buttes.slice(0, rich ? 6 : 3).forEach(([x, z, r, h], i) => on(makeButte(r, h, bands, i * 7 + 1), x, z, h / 2 - 3));
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a3a26, roughness: 0.95, vertexColors: true });
    rockMat.userData.natural = true;
    const clusters = [[38, 14, 6], [34, 30, 5], [9, -9, 5], [-10, 36, 6], [38, 64, 5], [-46, 58, 6], [12, 30, 4], [-50, 8, 5], [28, -30, 6], [-18, -12, 4]];
    clusters.slice(0, rich ? 10 : 5).forEach(([x, z, n], i) => rockCluster(B, x, z, n, rockMat, i * 13 + 2));
    const veils = rich ? makeDustVeils("rgba(210,150,100,1)", 9) : new THREE.Group(); scene.add(veils);
    const patrol = on(patrolRover, 48, 62);
    const patrolCol = [48, 62, 1.8];
    // Leben: zwei Mitbewohner und ein Raumtransporter mit eigenem Landeplatz
    const npcs = addNpcs(B);
    const landing = makeHeliPad(); landing.scale.setScalar(2.4); on(landing, ...L.pad, 0.05); // Landeplatz des Transporters
    const shuttle = makeShuttle(B, L.pad);
    if (rich && KIT.craterLarge) for (const [x, z, s] of [[40, -12, 9], [-52, 36, 7], [62, 30, 8], [-20, -52, 10], [8, 90, 9]]) on(kit("craterLarge", s), x, z, -0.2);
    for (const [x, z, r] of [[...L.monde, 3.2], [...L.vulkan, 2.3], [...L.rover, 1.1], [...L.eis, 1.6], [...L.wegweiser, 1.2], [...L.abend, 1], [...L.roverStart, 2.8]]) addBlob(B, x, z, r);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, rover: L.rover, rost: L.rost, vulkan: L.vulkan, monde: L.monde, abend: L.abend, eis: L.eis, teufel: L.teufel,
      wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] }, { monde: MARS_SCOPE_DOOR(L.monde) });

    const hutAt = [hut.position.x, hut.position.z], parkP = (x, z) => [L.roverStart[0] + x * Math.cos(MARS_ROVER_PARK) + z * Math.sin(MARS_ROVER_PARK), L.roverStart[1] - x * Math.sin(MARS_ROVER_PARK) + z * Math.cos(MARS_ROVER_PARK)];
    const colliders = [...ROCKET_COLLIDERS, [...L.monde, 2.9], [...L.vulkan, 0.7], [...L.rover, 1], [...L.eis, 0.9], [...L.wegweiser, 0.3], [...hutAt, 2.5],
      [L.eis[0] + 2.7, L.eis[1] + 1.7, 1.3], [L.eis[0] + 1.5, L.eis[1] - 0.5, 0.6], [L.eis[0] + 4.3, L.eis[1] - 0.3, 0.2], [...MARS_MAST(L.abend), 0.3],
      ...[[-1.8, -2.4], [1.8, -2.4], [-1.8, 2.4], [1.8, 2.4]].map(([x, z]) => [...parkP(x, z), 0.2]),
      [...L.rost, 1], [...L.abend, 0.5], [...L.roverZiel, 0.7], [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25],
      ...marsCampColliders(L.station), patrolCol, ...npcs.map((n) => n.col), [...L.pad, 4.5]];
    for (const [x, z, n] of clusters) if (n >= 5) colliders.push([x, z, 1.2]); // die großen Felsgruppen kann man nicht durchlaufen

    return { ...B, L, station, scale, telescope, phobos, deimos, volcano, volcanoLabel, everest, zugspitze, heli, heliY: heli.position.y, rover, samples, drill,
      devil, magnetTable, skyDome, veils, patrol, patrolCol, npcs, shuttle, observatory, weather, blink: [...station.userData.blink, ...console_.userData.blink, ...field.userData.lights, weather.userData.lamp],
      stations, colliders, shadowCasters: [rocket, station] };
  }

  // Himmel und Licht zwischen Mittag (f = 0) und Sonnenuntergang (f = 1): Auf dem Mars wird es abends BLAU um die Sonne
  const DUSK_GLOW = new THREE.Color(0x8fc4ff), WHITE = new THREE.Color(0xffffff);
  function marsSky(f, end = -0.2) {
    sunNow.copy(SUN_DIR).applyAxisAngle(SUN_AXIS, end * f); // Sonne sinkt (end = wie weit, siehe duskEnd)
    world.scene.background.copy(MARS_SKY).lerp(MARS_DUSK, f);
    world.scene.fog.color.copy(world.scene.background);
    world.skyDome.material.color.copy(world.scene.background);
    world.sunGlow.position.copy(sunNow).multiplyScalar(1200);
    world.sunGlow.material.color.copy(WHITE).lerp(DUSK_GLOW, f);
    world.sunGlow.scale.setScalar(105 * (1 + 2.4 * f));
    world.sun.intensity = world.sunBase * (1 - 0.65 * f);
    world.ambient.intensity = 0.5 * (1 - 0.45 * f);
  }

  // --- Rover-Expedition: drei Proben im alten Flussdelta. Die Batterie hält nicht ewig – und nach der ersten Probe legt sich Staub
  //     auf die Solarzellen. Ein Staubteufel pustet sie sauber (genau das hat den echten Rovern Spirit und Opportunity oft geholfen).
  const ROVER_SPEED = 2.8;
  function startRover() {
    const T = cfg.rover;
    enterExhibit("rover", { update: updateRover, phase: "drive", puff: 0, bat: 1, dust: 0, dusty: false, dustAt: -1, got: 0, t: 0, st: 0, ct: 0, farAt: -9, last: null }, "driving");
    const r = world.rover, [x, z] = world.L.roverStart;
    r.position.set(x, world.height(x, z), z);
    r.userData.heading = MARS_ROVER_PARK; // steht schräg in der Garage – das Kind muss selbst lenken
    roverTilt(r, MARS_ROVER_PARK);
    r.userData.speed = 0; r.userData.cells.color.copy(r.userData.clean);
    for (const s of world.samples) { s.done = false; s.mk.visible = true; }
    world.devil.userData.goal = null;
    scopeSay(`${T.start} (${isTouch() ? T.keysTouch : T.keys})`);
    roverHud();
  }
  function roverHud() {
    const sp = view.special, T = cfg.rover;
    chalHud(T.label, sp.bat, fmtVars(T.samples, { n: sp.got }) + (sp.dusty ? " · ☀️ Solarzellen staubig!" : ""), sp.bat < 0.25, true);
  }
  function roverSample(s) {
    const sp = view.special, r = world.rover, T = cfg.rover;
    s.done = true; s.mk.visible = false; sp.got++; sp.last = s;
    sp.phase = "scan"; sp.st = 0; r.userData.speed = 0;
    Sound.collect(); grains(tmp.set(s.x, world.height(s.x, s.z) + 0.3, s.z), 10, 0.6);
    if (sp.got >= 3) { sp.phase = "done"; Sound.correct(); UI.confetti(80); endChallengeHud(); scopeSay(`${T.sample[s.i]}\n\n🎉 ${T.done}`, [[T.doneBtn, endRover, true]]); return; }
    scopeSay(T.sample[s.i]);
    if (sp.got === 1 && sp.dustAt < 0) sp.dustAt = sp.t + 5; // kurz danach: Staub!
  }
  function roverDust() { // Staub auf den Solarzellen – ein Staubteufel zieht heran
    const sp = view.special, r = world.rover, u = r.userData;
    sp.dusty = true; Sound.whoosh();
    scopeSay(cfg.rover.dusty);
    const fx = Math.sin(u.heading), fz = Math.cos(u.heading);
    world.devil.userData.goal = [r.position.x + fx * 13 - fz * 5, r.position.z + fz * 13 + fx * 5];
  }
  function roverClean() { // durch den Staubteufel gefahren: Solarzellen sauber, Batterie lädt
    const sp = view.special, r = world.rover;
    sp.dusty = false; sp.charge = 1.6; Sound.correct();
    grains(r.position, 18, 1.6); grains(tmp.copy(r.position).setY(r.position.y + 1.2), 12, 1.2);
    scopeSay(cfg.rover.clean);
    const [hx, hz] = world.L.teufel; world.devil.userData.goal = [hx, hz]; world.devil.userData.home = true;
  }
  function updateRover(dt) {
    const sp = view.special, r = world.rover, u = r.userData, c = world.camera, T = cfg.rover;
    sp.t += dt;
    if (sp.phase === "drive") {
      u.speed += ((sp.bat > 0 ? sp.iy * ROVER_SPEED : 0) - u.speed) * Math.min(1, dt * 2.5);
      u.heading -= sp.ix * 1.3 * dt * (u.speed < -0.2 ? -1 : 1);
      // Batterie: Fahren kostet Strom, mit Staub auf den Solarzellen viel mehr
      if (sp.charge > 0) { sp.charge -= dt; sp.bat = Math.min(1, sp.bat + dt * 0.9); }
      else sp.bat = Math.max(0, sp.bat - dt * (0.006 + 0.0045 * Math.abs(u.speed)) * (sp.dusty ? 3.2 : 1));
      if (sp.bat <= 0) { sp.phase = "charge"; sp.ct = 0; u.speed = 0; Sound.wrong(); scopeSay(T.empty); }
      for (const s of world.samples) if (!s.done && Math.hypot(r.position.x - s.x, r.position.z - s.z) < 2.6) { roverSample(s); break; }
      if (sp.dustAt > 0 && sp.t > sp.dustAt && !sp.dusty && sp.phase === "drive") { sp.dustAt = 0; roverDust(); }
      if (sp.dusty) {
        const d = world.devil.position;
        if (Math.hypot(r.position.x - d.x, r.position.z - d.z) < 3.6) roverClean();
        else if (!world.devil.userData.goal || Math.hypot(world.devil.userData.goal[0] - r.position.x, world.devil.userData.goal[1] - r.position.z) > 16) { // der Wirbel bleibt in der Nähe
          const fx = Math.sin(u.heading), fz = Math.cos(u.heading);
          world.devil.userData.goal = [r.position.x + fx * 9 - fz * 3, r.position.z + fz * 9 + fx * 3];
        }
      }
    } else if (sp.phase === "charge") { // Batterie leer: in der Sonne laden
      sp.ct += dt; u.speed = 0; sp.bat = Math.min(0.35, (sp.ct / 4) * 0.35);
      if (sp.ct > 4) { sp.phase = "drive"; scopeSay(sp.dusty ? T.dusty : `${T.start} (${isTouch() ? T.keysTouch : T.keys})`); }
    } else if (sp.phase === "scan") { // Roboterarm untersucht die Probe
      sp.st += dt; u.speed *= Math.exp(-dt * 6);
      if (Math.random() < dt * 12 && sp.last) grains(tmp.set(sp.last.x, world.height(sp.last.x, sp.last.z) + 0.25, sp.last.z), 1, 0.4);
      if (sp.st > 1.8) sp.phase = "drive";
    } else u.speed *= Math.exp(-dt * 6);
    // fahren (nur in Funk-Reichweite; Gebäude und große Felsen sind im Weg)
    const nx = r.position.x + Math.sin(u.heading) * u.speed * dt, nz = r.position.z + Math.cos(u.heading) * u.speed * dt;
    if (Math.hypot(nx - world.L.rover[0], nz - world.L.rover[1]) < 75) r.position.set(nx, world.height(nx, nz), nz);
    else if (sp.t - sp.farAt > 6) { sp.farAt = sp.t; UI.toast(T.far); }
    const [sx, sz] = world.L.roverStart;
    for (const [cx, cz, cr] of world.colliders) {
      if (cr < 0.9 || Math.hypot(cx - sx, cz - sz) < 4.5) continue;
      const dx = r.position.x - cx, dz = r.position.z - cz, d = Math.hypot(dx, dz), min = cr + 1.2;
      if (d < min && d > 0.001) { r.position.x = cx + (dx / d) * min; r.position.z = cz + (dz / d) * min; r.position.y = world.height(r.position.x, r.position.z); u.speed *= 0.5; }
    }
    for (const w of u.wheels) w.rotation.x += (u.speed * dt) / 0.25;
    sp.puff -= dt;
    if (Math.abs(u.speed) > 0.6 && sp.puff <= 0) { sp.puff = 0.18; grains(r.position, 2, 0.5, -Math.sin(u.heading), -Math.cos(u.heading)); }
    // Staub färbt die Solarzellen rotbraun
    sp.dust += ((sp.dusty ? 1 : 0) - sp.dust) * Math.min(1, dt * (sp.dusty ? 0.8 : 2.5));
    u.cells.color.copy(u.clean).lerp(ROVER_DUST, sp.dust * 0.85);
    // Fundstellen: Hologramme schweben, aus der Ferne größer
    for (const s of world.samples) if (s.mk.visible) { const h = s.mk.userData.holo; h.position.y = 2.9 + Math.sin(sp.t * 2 + s.i) * 0.15; h.scale.setScalar(Math.min(4, 1.3 + c.position.distanceTo(s.mk.position) * 0.022) / s.mk.scale.x); }
    if (sp.phase !== "done") roverHud();
    roverTilt(r, u.heading, dt);
    const fx = Math.sin(u.heading), fz = Math.cos(u.heading), want = tmp.set(r.position.x - fx * 6.5, r.position.y + 3.4, r.position.z - fz * 6.5);
    const [gx, gz] = world.L.roverStart; // unter dem Dach der Rover-Garage hindurch (sonst sieht man beim Losfahren nur das Dach)
    if (Math.hypot(want.x - gx, want.z - gz) < 4.6) want.y = Math.min(want.y, world.height(gx, gz) + 1.9); // unter dem Schild (ab 2,1 m) durch
    c.position.lerp(want, 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(r.position.x + fx * 3, r.position.y + 1, r.position.z + fz * 3), 1 - Math.exp(-dt * 5));
    c.lookAt(view.look);
  }
  const ROVER_DUST = srgb(0xa0583a);
  function endChallengeHud() { $("chalHud").classList.add("hidden"); }
  function endRover() {
    for (const s of world.samples) s.mk.visible = false;
    endChallengeHud();
    const [hx, hz] = world.L.teufel; world.devil.userData.goal = [hx, hz]; world.devil.userData.home = true;
    leaveExhibit();
  }

  // --- Hubschrauber: aufsteigen, den Olympus Mons sehen und bekannte Berge danebenstellen ---
  function startHeli() {
    enterExhibit("vulkan", { update: updateHeli, t: 0, top: false, seen: {} });
    scopeSay(cfg.heli.rising);
  }
  function heliUi(last) {
    const sp = view.special, T = cfg.heli, both = sp.seen.everest && sp.seen.zugspitze;
    const show = (key) => () => { sp.seen[key] = true; world[key].visible = world[key].userData.label.visible = true; heliUi(key); };
    const btns = [];
    if (!sp.seen.everest) btns.push([T.everestBtn, show("everest"), true]);
    if (!sp.seen.zugspitze) btns.push([T.zugspitzeBtn, show("zugspitze"), !btns.length]);
    if (both) btns.push([T.done, endHeli, true]);
    scopeSay(both ? T.all : last ? T[last] : T.intro, btns);
  }
  function updateHeli(dt) {
    const sp = view.special, c = world.camera, h = world.heli, d = VOLCANO_DIR; sp.t += dt;
    const k = smooth(0.3, 5.5, sp.t), turn = smooth(4.5, 7.5, sp.t); // erst steigen und hinunterschauen, dann zum Vulkan schwenken
    h.position.y = world.heliY + k * 60;
    if (h.userData.spin) h.userData.spin(dt); else h.userData.rotor.rotation.y += dt * 42;
    // Kamera schräg über dem Hubschrauber; die Rakete unten wird immer kleiner
    const back = 4 + 5 * turn;
    c.position.lerp(tmp.set(h.position.x - d.x * back, h.position.y + 3 - 0.6 * turn, h.position.z - d.z * back), 1 - Math.exp(-dt * 4));
    tmp2.set(0, world.rocketY + 3, 0).lerp(tmp.set(d.x * 1500, VOLCANO_H * 0.42, d.z * 1500), turn);
    view.look.lerp(tmp2, 1 - Math.exp(-dt * (turn > 0 && turn < 1 ? 2.5 : 4)));
    c.lookAt(view.look);
    const fov = 58 - 26 * turn;
    c.fov += (fov - c.fov) * Math.min(1, dt * 2.5); c.updateProjectionMatrix();
    world.volcanoLabel.visible = turn > 0.85;
    if (turn >= 1 && !sp.top) { sp.top = true; Sound.correct(); heliUi(); }
  }
  function endHeli() {
    world.everest.visible = world.zugspitze.visible = world.volcanoLabel.visible = false;
    world.everest.userData.label.visible = world.zugspitze.userData.label.visible = false;
    world.heli.position.y = world.heliY;
    leaveExhibit();
  }

  // --- Fernrohr: die beiden Marsmonde finden ---
  function startMoons() {
    const T = cfg.moons;
    world.observatory.userData.target = 1; // Kuppel klappt auf
    startTour("monde", T, [
      { pos: world.phobos.position, fov: 2.4, text: T.phobos },
      { pos: world.deimos.position, fov: 1.15, text: T.deimos, btn: T.deimosBtn, slow: true }
    ], { end: () => { world.observatory.userData.target = 0; } });
  }

  // --- Bohrer: dreimal bohren, dann kommt Eis zum Vorschein ---
  const ROD_Y = 1.05;
  function startEis() {
    enterExhibit("eis", { update: updateEis, depth: 0, spin: 0 });
    world.astronaut.visible = false;
    world.drill.userData.ice.visible = false; world.drill.userData.rod.position.y = ROD_Y;
    eisUi();
  }
  function eisUi() {
    const sp = view.special, T = cfg.drill;
    if (sp.depth >= 3) scopeSay(guessed(T.steps[3]), [[T.done, endEis, true]]);
    else if (sp.depth === 0 && !sp.guessQ) askGuess(T.guess, T.steps[0], drillOnce);
    else scopeSay(T.steps[sp.depth], [[T.drill, drillOnce, true]]);
  }
  function drillOnce() {
    const sp = view.special, p = world.drill.position;
    sp.depth++; sp.spin = 1.3; Sound.land();
    grains(p, 12, 1);
    if (sp.depth >= 3) { Sound.correct(); world.drill.userData.ice.visible = true; world.drill.userData.ice.position.y = 0.1; }
    eisUi();
  }
  function updateEis(dt) {
    const c = world.camera, sp = view.special, p = world.drill.position, u = world.drill.userData;
    c.position.lerp(tmp.set(p.x - 2.6, p.y + 1.7, p.z - 2.6), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(p.x, p.y + 0.8, p.z), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    u.rod.position.y += (ROD_Y - sp.depth * 0.25 - u.rod.position.y) * Math.min(1, dt * 3);
    if (sp.spin > 0) { sp.spin -= dt; u.rod.rotation.y += dt * 26; if (Math.random() < dt * 14) grains(p, 1, 0.8); }
    if (u.ice.visible) { u.ice.position.y += (0.75 - u.ice.position.y) * Math.min(1, dt * 1.5); u.ice.rotation.y += dt * 0.8; }
  }
  function endEis() { world.astronaut.visible = true; leaveExhibit(); }

  // --- Magnet: Warum ist der Mars rot? ---
  function resetMagnet() {
    const u = world.magnetTable.userData;
    u.magnet.position.y = MAGNET_UP;
    for (const m of u.grains) m.visible = false;
  }
  const Y_AXIS = new V(0, 1, 0);
  function startRost() {
    enterExhibit("rost", { update: updateRost, t: 0, run: false });
    world.astronaut.visible = false;
    resetMagnet();
    askGuess(cfg.magnet.guess, cfg.magnet.ready, runRost);
  }
  function runRost() {
    const sp = view.special; sp.t = 0; sp.run = true;
    resetMagnet();
    scopeSay(cfg.magnet.running);
  }
  function updateRost(dt) {
    const c = world.camera, sp = view.special, p = world.magnetTable.position, u = world.magnetTable.userData;
    c.position.lerp(tmp.set(-0.9, 1.75, 2.5).applyAxisAngle(Y_AXIS, world.magnetTable.rotation.y).add(p), 1 - Math.exp(-dt * 3)); // von hinten: so steht der Galgen nicht im Bild
    view.look.lerp(tmp2.set(p.x, p.y + 1.35, p.z), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (!sp.run) return;
    sp.t += dt;
    // Magnet senkt sich, die Körner springen hoch, dann hebt er sie mit an
    const down = smooth(0, 0.8, sp.t) - smooth(2.6, 3.4, sp.t), lift = (1 - down) * (MAGNET_UP - MAGNET_DOWN);
    u.magnet.position.y = MAGNET_UP - down * (MAGNET_UP - MAGNET_DOWN);
    u.grains.forEach((m, i) => {
      const a = Math.max(0, Math.min(1, (sp.t - 0.8 - i * 0.045) / 0.3));
      m.visible = sp.t > 0.8;
      m.position.lerpVectors(m.userData.from, m.userData.to, a * a);
      if (sp.t > 2.6 && a >= 1) m.position.y += lift;
    });
    if (sp.t > 3.6) {
      sp.run = false; Sound.correct();
      scopeSay(guessed(cfg.magnet.end), [[cfg.magnet.again, runRost], [cfg.magnet.done, endRost, true]]);
    }
  }
  function endRost() { world.astronaut.visible = true; leaveExhibit(); }

  // --- Himmelskamera: Zeit vorspulen bis zum (blauen!) Sonnenuntergang ---
  const DUSK_TIME = 7;
  function startAbend() { enterExhibit("abend", { update: updateAbend }); runAbend(); }
  // Wie tief darf die Sonne sinken, ohne hinter Hügeln oder Tafelbergen zu verschwinden? (einmal ausrechnen)
  function duskEnd() {
    if (world.duskEnd != null) return world.duskEnd;
    const st = world.stations.abend, from = new V(st.x, world.height(st.x, st.z) + 2.2, st.z), big = [];
    world.scene.traverse((o) => { if (o.isMesh && o.visible && o !== world.skyDome && !o.userData.farAway) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) > 6) big.push(o); } });
    const r = new THREE.Raycaster(); r.far = 2500; let end = 0;
    for (let a = -0.24; a <= 0; a += 0.01) {
      r.set(from, tmp.copy(SUN_DIR).applyAxisAngle(SUN_AXIS, a));
      if (!r.intersectObjects(big, false).length) { end = Math.min(0, a + 0.05); break; } // ganze Sonnenscheibe frei
    }
    return (world.duskEnd = end);
  }
  function runAbend() {
    const sp = view.special; sp.t = 0; sp.run = false; sp.said = false;
    marsSky(0);
    askGuess(cfg.dusk.guess, cfg.dusk.ready, () => { sp.run = true; sp.t = -0.4; });
  }
  function updateAbend(dt) {
    const c = world.camera, sp = view.special, st = world.stations.abend, y = world.height(st.x, st.z);
    const h = Math.hypot(SUN_DIR.x, SUN_DIR.z), dx = SUN_DIR.x / h, dz = SUN_DIR.z / h;
    c.position.lerp(tmp.set(st.x - dx * 5, y + 2.2, st.z - dz * 5), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.copy(sunNow).multiplyScalar(60).add(tmp.set(st.x - dx * 5, y + 2.2, st.z - dz * 5)), 1 - Math.exp(-dt * 4)); // die Sonne im Blick behalten
    c.lookAt(view.look);
    c.fov += (44 - c.fov) * Math.min(1, dt * 2); c.updateProjectionMatrix();
    if (!sp.run) return;
    sp.t += dt;
    if (sp.t < 0) return;
    if (!sp.said) { sp.said = true; $("scopeText").textContent = cfg.dusk.running; }
    marsSky(smooth(0, DUSK_TIME, sp.t), duskEnd());
    if (sp.t > DUSK_TIME + 0.6) {
      sp.run = false; Sound.correct();
      scopeSay(guessed(cfg.dusk.end), [[cfg.dusk.again, runAbend], [cfg.dusk.done, endAbend, true]]);
    }
  }
  function endAbend() { marsSky(0); leaveExhibit(); }

  // --- Ein zweiter Rover fährt von allein seine Runden neben der Station ---
  function updatePatrol(dt) {
    const r = world.patrol, u = r.userData, cx = 48, cz = 62;
    u.a = (u.a || 0) + dt * 0.1; // etwa 1,3 m/s
    const x = cx + Math.cos(u.a) * 16, z = cz + Math.sin(u.a) * 10;
    const hx = -Math.sin(u.a) * 16, hz = Math.cos(u.a) * 10; // Fahrtrichtung
    r.position.set(x, 0, z); roverTilt(r, Math.atan2(hx, hz), dt, 1.3, 1.2); // folgt dem Gelände
    for (const w of u.wheels) w.rotation.x += dt * 4.5;
    world.patrolCol[0] = x; world.patrolCol[1] = z;
    u.puff = (u.puff || 0) - dt;
    if (u.puff <= 0 && world.camera.position.distanceTo(r.position) < 60) { u.puff = 0.35; grains(r.position, 1, 0.4); }
  }

  // --- Staubteufel: wandert über die Ebene, man muss ihn einholen ---
  function updateDevil(dt, elapsed) {
    const u = world.devil.userData;
    if (u.cx == null) { u.cx = world.L.teufel[0]; u.cz = world.L.teufel[1]; u.amp = 1; }
    if (u.goal) { // zum Ziel gleiten (etwa so schnell wie ein Läufer), unterwegs kleiner tanzen
      const ex = u.goal[0] - u.cx, ez = u.goal[1] - u.cz, d = Math.hypot(ex, ez), step = Math.min(d, (u.home ? 5 : 7) * dt);
      if (d > 0.01) { u.cx += (ex / d) * step; u.cz += (ez / d) * step; }
      u.amp += ((u.home && d < 1 ? 1 : 0.18) - u.amp) * Math.min(1, dt * 1.5);
      if (u.home && d < 0.5 && u.amp > 0.97) { u.goal = null; u.home = false; u.amp = 1; }
    }
    const x = u.cx + 16 * u.amp * Math.sin(elapsed * 0.11), z = u.cz + 12 * u.amp * Math.sin(elapsed * 0.17 + 1), y = world.height(x, z);
    world.devil.position.set(x, y, z);
    world.devil.userData.parts.forEach((s, i) => {
      const hgt = (i / 19) * 7.5, r = 0.2 + hgt * 0.2, a = elapsed * 3.2 + i * 0.95;
      s.position.set(Math.cos(a) * r, hgt + 0.2, Math.sin(a) * r);
      s.scale.setScalar(0.9 + hgt * 0.32);
    });
  }

  // =========================================================
  //  Bausteine, die mehrere Orte benutzen
  // =========================================================
  const endHidden = () => { world.astronaut.visible = true; leaveExhibit(); }; // Exponat beenden, bei dem der Astronaut ausgeblendet war

  // Waage und Station mit Tafelwand hat jeder Ort
  function addCommon(B, L, name, style = "") {
    const scale = B.on(makeScale(), ...L.waage);
    scale.rotation.y = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);
    const station = B.on(makeStation(cfg.discoveries, name, style), ...L.station);
    const colliders = [...ROCKET_COLLIDERS, [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25], ...(CAMP_COLLIDERS[style] || stationColliders)(L.station)];
    return { scale, station, colliders };
  }

  // --- Fernrohr-Tour: das erste Ziel selbst suchen, weitere Ziele per Knopf ---
  // steps = [{ pos, fov, text, btn, slow, enter }] · opts = { end, maxRight }
  function startTour(key, T, steps, opts = {}) {
    const e = tmp.copy(steps[0].pos).sub(world.telescope.position).normalize();
    const yawE = Math.atan2(e.x, e.z), pitchE = Math.asin(e.y);
    enterExhibit(key, { update: updateTour, T, steps, opts, i: -1, t: 0, phase: "aim", yawE, pitchE, yaw: yawE + 0.5, pitch: Math.max(0.05, pitchE - 0.22), lock: 0, hint: "" });
    world.telescope.visible = world.astronaut.visible = false;
    for (const st of Object.values(world.stations)) st.marker.visible = false; // keine Lichtsäule soll im Bild stehen
    scopeSay(isTouch() ? T.aimTouch : T.aim);
  }
  function tourStep(i) {
    const sp = view.special, s = sp.steps[i], next = sp.steps[i + 1];
    sp.i = i; sp.phase = "show";
    if (s.enter) s.enter();
    scopeSay(s.text, next ? [[next.btn, () => tourStep(i + 1), true]] : [[sp.T.done, endTour, true]]);
  }
  function updateTour(dt) {
    const c = world.camera, sp = view.special; sp.t += dt;
    const tp = world.telescope.position;
    c.position.lerp(tmp.set(tp.x, tp.y + 1.7, tp.z), 1 - Math.exp(-dt * 4));
    let fov = 30;
    if (sp.phase === "aim") { if (aimStep(sp, dt, sp.T, sp.opts.maxRight)) { Sound.correct(); tourStep(0); } }
    else { const s = sp.steps[sp.i]; fov = s.fov; view.look.lerp(s.pos, 1 - Math.exp(-dt * (s.slow ? 1.6 : 4))); }
    c.lookAt(view.look);
    if (c.aspect < 1) fov /= c.aspect;
    c.fov += (Math.min(90, fov) - c.fov) * Math.min(1, dt * 2.5); c.updateProjectionMatrix();
    $("scope").classList.toggle("hidden", sp.t < 0.5);
    $("scope").classList.toggle("aim", sp.phase === "aim");
  }
  function endTour() {
    const end = view.special.opts.end;
    world.telescope.visible = world.astronaut.visible = true;
    for (const [key, st] of Object.entries(world.stations)) st.marker.visible = !cfg.stations[key].info;
    $("scope").classList.add("hidden");
    world.camera.fov = 60; world.camera.updateProjectionMatrix();
    if (end) end();
    leaveExhibit();
  }

  // --- Wettrennen um die Sonne: Tischmodell mit der Erde und dem Planeten, auf dem man gerade steht ---
  function makeOrrery(planetId, rP, rE) {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1, 12), dark); foot.position.y = 0.5; foot.castShadow = true; g.add(foot);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.06, 40), dark); disc.position.y = 1; disc.castShadow = true; g.add(disc);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffc83d })); sun.position.y = 1.3; g.add(sun);
    for (const r of [rP, rE]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.012, r + 0.012, 64), new THREE.MeshBasicMaterial({ color: 0x9ca3af, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 1.035; g.add(ring);
    }
    const ball = (id, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ map: W.bodies[id].mesh.material.map, roughness: 0.9 })); g.add(m); return m; };
    g.userData = { earth: ball("erde", 0.13), planet: ball(planetId, 0.1), rP, rE };
    setOrrery(g, 0, 0);
    return g;
  }
  function setOrrery(o, aE, aP) {
    const u = o.userData;
    u.earth.position.set(Math.cos(aE) * u.rE, 1.25, -Math.sin(aE) * u.rE);
    u.planet.position.set(Math.cos(aP) * u.rP, 1.22, -Math.sin(aP) * u.rP);
  }
  const ORRERY_TIME = 12;
  function startOrrery() {
    enterExhibit("jahr", { update: updateOrrery, t: 0, run: false, last: "" });
    world.astronaut.visible = false;
    setOrrery(world.orrery, 0, 0);
    askGuess(cfg.orrery.guess, cfg.orrery.ready, runOrrery);
  }
  function runOrrery() { const sp = view.special; sp.t = 0; sp.run = true; sp.last = ""; scopeSay(""); }
  function updateOrrery(dt) {
    const c = world.camera, sp = view.special, p = world.orrery.position, T = cfg.orrery, O = site.orrery;
    c.position.lerp(tmp.set(p.x, p.y + 4.3, p.z - 3.6), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(p.x, p.y + 1.1, p.z), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (!sp.run) return;
    sp.t += dt;
    const f = Math.min(1, sp.t / ORRERY_TIME);
    setOrrery(world.orrery, f * O.earthLaps * Math.PI * 2, f * O.planetLaps * Math.PI * 2);
    if (f >= 1) {
      sp.run = false; Sound.correct();
      scopeSay(guessed(T.end), [[T.again, runOrrery], [T.done, endHidden, true]]);
      return;
    }
    const text = fmtVars(T.run, O.vars(f));
    if (text !== sp.last) { sp.last = text; $("scopeText").textContent = text; }
  }

  // --- Größenvergleich: Kugeln im selben Maßstab (Erde = 1 m Radius), dazu eine Schätzfrage ---
  function makeSizeRack(ids) {
    const g = new THREE.Group(), gap = 0.4;
    const width = ids.reduce((s, id) => s + (G.bodyById[id].diameterKm / 12742) * 2 + gap, gap);
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 }));
    base.position.y = 0.45; base.castShadow = true; g.add(base);
    let x = width / 2 - gap; // von vorn (−Z) gesehen: links → rechts
    for (const id of ids) {
      const b = G.bodyById[id], r = b.diameterKm / 12742;
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 22), new THREE.MeshStandardMaterial({ map: W.bodies[id].mesh.material.map, roughness: 0.9 }));
      m.position.set(x - r, 0.9 + r, 0); m.castShadow = true; g.add(m);
      const cv = document.createElement("canvas"); cv.width = 256; cv.height = 72;
      const cx = cv.getContext("2d");
      cx.fillStyle = "#fde68a"; cx.font = "bold 46px sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(b.name, 128, 38);
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
      label.position.set(x - r, 0.62, -0.46); label.rotation.y = Math.PI; g.add(label);
      x -= r * 2 + gap;
    }
    g.userData = { width };
    return g;
  }
  // Größenvergleich als Kulisse: seitlich neben der Tafelwand, leicht zum Platz gedreht – so verdeckt er keine Entdeckungs-Tafeln.
  // Gibt das Gestell und seine Hindernis-Kreise zurück.
  function placeSizeRack(B, ids, [sx, sz]) {
    const a = 0.4, rack = B.on(makeSizeRack(ids), sx + 12.5, sz - 3); rack.rotation.y = a;
    const half = rack.userData.width / 2 - 0.6, n = Math.max(1, Math.ceil(half / 1.0)), cols = [];
    for (let i = -n; i <= n; i++) { const s = (i / n) * half; cols.push([rack.position.x + Math.cos(a) * s, rack.position.z - Math.sin(a) * s, 0.75]); }
    return { rack, cols };
  }
  function startGuess() {
    const T = cfg.guess;
    enterExhibit("groesse", { update: updateGuess });
    world.astronaut.visible = false;
    const answer = (i) => () => {
      const ok = i === T.c;
      if (ok) Sound.correct(); else Sound.wrong();
      scopeSay(`${ok ? T.right : T.wrong} ${T.why}`, [[T.done, endHidden, true]]);
    };
    scopeSay(T.q, T.a.map((t, i) => [t, answer(i)]));
  }
  function updateGuess(dt) {
    const c = world.camera, p = world.rack.position, w = world.rack.userData.width;
    c.position.lerp(tmp.set(p.x, p.y + 2.3, p.z - 3.2 - w * 0.8), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(p.x, p.y + 1.7, p.z), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
  }

  // Einfache Raumsonde als Fundstück (Schüssel, Körper, zwei Sonnensegel)
  function makeProbe() {
    const g = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a73a, metalness: 0.7, roughness: 0.35 });
    const white = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.5, side: THREE.DoubleSide });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1, 8), new THREE.MeshStandardMaterial({ color: 0x4b5563 })); stand.position.y = 0.5; g.add(stand);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), gold); body.position.y = 1.2; body.castShadow = true; g.add(body);
    const dish = dishCap(PROBE_M, 0.55, 0.8); dish.rotation.x = Math.PI; dish.position.y = 2.0; g.add(dish);
    for (const x of [-0.85, 0.85]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 0.5), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.25 }));
      panel.position.set(x, 1.2, 0); panel.castShadow = true; g.add(panel);
    }
    return g;
  }
  // Glühend helle Scheibe (Sonne durchs Filter-Fernrohr gesehen)
  function makeSunDisc(size) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    const x = cv.getContext("2d"), gr = x.createRadialGradient(128, 128, 0, 128, 128, 126);
    gr.addColorStop(0, "#fff6c2"); gr.addColorStop(0.7, "#ffb62e"); gr.addColorStop(0.97, "#e8740c"); gr.addColorStop(1, "rgba(232,116,12,0)");
    x.fillStyle = gr; x.beginPath(); x.arc(128, 128, 127, 0, 7); x.fill();
    x.fillStyle = "rgba(90,40,0,0.75)";
    for (const [sx, sy, r] of [[95, 110, 7], [108, 118, 4], [160, 150, 6], [150, 90, 3]]) { x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fill(); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, toneMapped: false, fog: false }));
    s.scale.setScalar(size); s.visible = false;
    return s;
  }

  // =========================================================
  //  Merkur
  // =========================================================
  // =========================================================
  //  Merkur-Forschungsstation: Hinter einem riesigen Sonnenschild liegt sie im Schatten (in der Sonne wären es 430 °C).
  //  Halb eingegrabene Module, weiße Kühlrippen, die Wärme ins All abstrahlen, ein Sonnenturm mit Filter-Fernrohr,
  //  ein Messfeld für Einschläge, die Absturzstelle der Sonde MESSENGER und eine kleine Eis-Sonde im Krater
  // =========================================================
  // Sonnenschild: hohe, leicht gebogene weiße Wand mit Streben (lokal: Sonne kommt von −Z)
  function mercShield(M, len, h) {
    const g = new THREE.Group(), segs = 9, bend = 0.5;
    const white = M.std({ color: srgb(0xf8fafc), roughness: 0.35, metalness: 0.3, envMapIntensity: 1.2, side: THREE.DoubleSide });
    for (let i = 0; i < segs; i++) {
      const a0 = ((i / segs) - 0.5) * bend, a1 = (((i + 1) / segs) - 0.5) * bend, R = len / bend;
      const p0 = new V(Math.sin(a0) * R, 0, R - Math.cos(a0) * R), p1 = new V(Math.sin(a1) * R, 0, R - Math.cos(a1) * R);
      const w = p0.distanceTo(p1), m = put(g, new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, h, 0.25), white), (p0.x + p1.x) / 2, h / 2 + 0.6, (p0.z + p1.z) / 2);
      m.userData.wall = w;
      m.rotation.y = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.35, 0.4), M.orange), m.position.x, h + 0.7, m.position.z, false).rotation.y = m.rotation.y;
      // Stützen auf der Schattenseite
      pipeSeg(g, M, new V(p0.x, 0, p0.z + 3.2), new V(p0.x, h * 0.8, p0.z + 0.2), 0.12, M.teal);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8), M.metal), p0.x, 0.3, p0.z);
    }
    return g;
  }
  // Kühlrippen: eine Reihe dünner weißer Platten auf einem Rohr
  function mercRadiators(M, n = 6) {
    const g = new THREE.Group(), fin = M.std({ color: srgb(0xf1f5f9), roughness: 0.25, metalness: 0.2, envMapIntensity: 1.1 });
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, n * 0.9 + 0.6, 12), M.orange), 0, 0.5, 0).rotation.z = Math.PI / 2;
    for (let i = 0; i < n; i++) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.4, 2.2), fin), (i - (n - 1) / 2) * 0.9, 2.2, 0);
    for (const x of [-(n * 0.45), n * 0.45]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), M.metal), x, 0.45, 0);
    return g;
  }
  // Halb eingegrabenes Modul: Röhre, mit Merkurstaub zugeschüttet, nur die Stirnseite mit Tür schaut heraus (lokal: Tür nach +Z)
  function mercModule(g, M, x, z, face, len, label) {
    const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = face; g.add(m);
    const body = put(m, new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, len, 28), M.hull(6, 2)), 0, 1.2, 0); body.rotation.x = Math.PI / 2;
    const berm = put(m, new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, len - 1.2, 20, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8f877c, map: regolithTexture(), roughness: 1 })), 0, 0, -0.6);
    berm.geometry.rotateZ(Math.PI / 2); berm.rotation.y = Math.PI / 2; berm.scale.set(1, 0.95, 1); berm.receiveShadow = true;
    put(m, new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.14, 10, 28), M.orange), 0, 1.2, len / 2 - 0.3, false);
    put(m, new THREE.Mesh(new THREE.CircleGeometry(2.1, 28), M.hull(2, 2)), 0, 1.2, len / 2 + 0.01, false);
    put(m, new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.9), M.metal), 0, 1.05, len / 2 + 0.03, false);
    put(m, new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.18), M.glow), 0, 2.3, len / 2 + 0.03, false);
    put(m, new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.45), signMat(label, "#b45309", 640, 110, 54)), 0, 2.85, len / 2 + 0.05, false);
    for (const s of [-1, 1]) { const l = new THREE.PointLight(0xffd29a, 0.6, 9, 1.5); l.position.set(s * 1.4, 2.6, len / 2 + 1.2); m.add(l); }
    blinkLamp(m, 0x4ade80, 0, 3.4, len / 2 - 0.2);
    return m;
  }
  // Sonnenturm: runder Turm mit Plattform, oben das Filter-Fernrohr (lokal: Leiter nach +Z)
  function mercSunTower(M, h) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, h, 24), M.hull(4, 2)), 0, h / 2, 0).receiveShadow = true;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.18, 28), M.metal), 0, h, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.35, 24, 1, true), M.orange), 0, 0.9, 0, false);
    let last = null;
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2, top = new V(Math.sin(a) * 1.85, h + 1, Math.cos(a) * 1.85); put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), M.steel), top.x, h + 0.5, top.z, false); if (last) pipeSeg(g, M, last, top, 0.035, M.teal); last = top; }
    // Leiter seitlich (vorn steht das Namensschild)
    const ladder = new THREE.Group(); ladder.rotation.y = -1.25; g.add(ladder);
    for (let i = 0; i < Math.floor(h / 0.4); i++) put(ladder, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), M.steel), 0, 0.3 + i * 0.4, 1.47, false);
    for (const x of [-0.3, 0.3]) put(ladder, new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.05), M.steel), x, h / 2, 1.47, false);
    // Spiegel, der das Sonnenlicht einfängt (wie bei echten Sonnenteleskopen)
    const mirror = new THREE.Group(); mirror.position.set(2.8, 0, -0.8); g.add(mirror);
    put(mirror, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.6, 8), M.steel), 0, 0.8, 0);
    const disc = put(mirror, new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 28), M.std({ color: srgb(0xe2e8f0), metalness: 1, roughness: 0.05, envMapIntensity: 2 })), 0, 1.8, 0);
    disc.rotation.set(0.9, 0.6, 0);
    { // Namensschild als Band um den (nach oben schmaler werdenden) Turm
      const r = (y) => 1.4 - 0.3 * y / h + 0.025, arc = 2.2 / r(2.3);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(r(2.51), r(2.09), 0.42, 32, 1, true, -arc / 2, arc), signMat("☀️ SONNENTURM", "#b45309", 560, 108, 54)), 0, 2.3, 0, false);
    }
    return g;
  }
  // Sonnenschutz-Unterstand: schräges Dach auf vier Stützen (lokal: tiefe Seite zur Sonne = +Z)
  function mercShelter(M) {
    const g = new THREE.Group();
    for (const [x, z, h] of [[-1.9, -1.9, 3.4], [1.9, -1.9, 3.4], [-1.9, 1.9, 2.5], [1.9, 1.9, 2.5]]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 8), M.steel), x, h / 2, z);
    const roof = put(g, new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 4.6), M.std({ color: srgb(0xf8fafc), roughness: 0.3, metalness: 0.3 })), 0, 2.98, 0);
    roof.rotation.x = 0.23;
    put(g, new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.3, 0.12), M.orange), 0, 2.45, 2.35).rotation.x = 0.23;
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.4), signMat("⛱️ SCHATTEN-PLATZ", "#475569", 640, 72, 44)), 0, 3.3, -2.35, false).rotation.y = Math.PI;
    return g;
  }
  // Seismometer: kleine goldene Kuppel auf drei Füßen – spürt, wie der Boden beim Einschlag bebt
  function mercSeismo(M) {
    const g = new THREE.Group();
    const dome = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: foilTex(), roughness: 0.3, metalness: 0.75, envMap: M.env })), 0, 0.15, 0);
    for (let i = 0; i < 3; i++) { const a = i * 2.09; put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), M.metal), Math.sin(a) * 0.35, 0.1, Math.cos(a) * 0.35); }
    blinkLamp(g, 0x4ade80, 0, 0.62, 0).scale.setScalar(0.4);
    return g;
  }
  // MESSENGER: goldener Körper, großer Sonnenschirm vorn, zwei Solarflügel – hier abgestürzt und schief im Krater
  function makeMessenger(M, wrecked) {
    const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ map: foilTex(), roughness: 0.3, metalness: 0.75, envMap: M.env, envMapIntensity: 1.2 });
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.4), gold), 0, 0.8, 0);
    const shade = put(g, new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 6, 1, false, 0, Math.PI), M.std({ color: srgb(0xf5f5f0), roughness: 0.8 })), 0, 0.8, 0.9);
    shade.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    for (const s of [-1, 1]) {
      const p = put(g, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.8), marsCellMat(M)), s * 1.6, 0.8, 0);
      if (wrecked) p.rotation.set(s * 0.5, 0, s * (s > 0 ? 0.7 : -0.3));
    }
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), M.steel), 0, 0.9, -1.4).rotation.x = Math.PI / 2;
    const dish = put(g, dishCap(M, 0.45, 0.9), 0.4, 1.5, -0.3);
    dish.rotation.x = -0.6;
    if (wrecked) { g.rotation.set(0.35, 0.8, -0.25); g.position.y = -0.3; }
    return g;
  }
  // Kleine Eis-Sonde: Kasten auf sechs Rädern, Scheinwerfer, Bohrarm (lokal: vorn = +Z)
  function mercIceProbe(M) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.8), M.hull(1, 1)), 0, 0.65, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 1.82), M.orange), 0, 0.92, 0, false);
    for (const x of [-0.7, 0.7]) for (const z of [-0.65, 0, 0.65]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 14), M.metal), x, 0.25, z).rotation.z = Math.PI / 2;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), M.steel), 0.35, 1.35, -0.6);
    const lamp = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.14), new THREE.MeshBasicMaterial({ color: srgb(0xfff1c2), toneMapped: false })), 0.35, 1.8, -0.55, false);
    const spot = new THREE.SpotLight(0xfff1c2, 1.2, 12, 0.6, 0.5); spot.position.set(0.35, 1.8, -0.5); spot.target.position.set(0, 0, 3); g.add(spot, spot.target);
    pipeSeg(g, M, new V(0, 0.8, 0.9), new V(0, 0.2, 1.5), 0.05, M.teal);
    return g;
  }

  function buildMercCamp(g, add) {
    const M = colonyMats("merkur");
    g.userData.anim = [];
    mercModule(g, M, -12, 12, Math.atan2(5, -12), 10, "🏠 WOHNMODUL");
    mercModule(g, M, 12, 12, Math.atan2(-5, -12), 10, "🔬 LABOR");
    mercModule(g, M, 0, 22, Math.PI, 12, "⚙️ TECHNIK");
    for (const [x, z, r] of [[-22, 20, 0.5], [21, 22, -0.4], [8, 30, 0.2]]) { const rd = mercRadiators(M, 7); rd.position.set(x, 0, z); rd.rotation.y = r; g.add(rd); }
    for (const [x, z, s, c, r, y] of [[16, 3, 1.1, M.orange, 0.3, 0], [17.2, 4.3, 0.9, M.teal, -0.2, 0]]) colonyCrate(g, M, x, z, s, c, r, y);
    for (const [x, z] of [[-9.5, 3], [9.5, 3]]) colonyLamp(g, M, x, z);
  }
  function mercCampColliders([sx, sz]) {
    const c = [[sx - 12, sz + 12, 3.3], [sx + 12, sz + 12, 3.3], [sx, sz + 22, 3.3], [sx, sz + 27, 3.3], [sx - 22, sz + 20, 3.2], [sx + 21, sz + 22, 3.2], [sx + 8, sz + 30, 3.2],
      [sx + 16.5, sz + 3.6, 1.3], [sx - 9.5, sz + 3, 0.3], [sx + 9.5, sz + 3, 0.3]];
    for (const [x, z, f] of [[-12, 12, Math.atan2(5, -12)], [12, 12, Math.atan2(-5, -12)]]) for (const d of [-3, 0, 3]) c.push([sx + x + Math.sin(f) * d, sz + z + Math.cos(f) * d, 3]);
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx + x, sz + 0.1, 1]); // Tafelwand
    return c;
  }

  // Merkur: Die Station liegt unten in einem großen Krater am Pol – dort ist es immer schattig und kühl, im ewigen Schatten liegt Eis.
  // Oben in der glühenden Sonne: Sonnenturm, Absturzstelle von MESSENGER, Schatten-Platz und das Einschlag-Messfeld.
  const MERKUR_CRATER = [0, 72, 40, 10];
  function shadowRunLayout(L) {
    const F = L.shadowSpot, px = SHADOW_DIR.z, pz = -SHADOW_DIR.x, S = [F[0] + px * 28, F[1] + pz * 28];
    const pillars = [0.14, 0.33, 0.52, 0.7].map((k) => [S[0] + (F[0] - S[0]) * k - SHADOW_DIR.x * 3, S[1] + (F[1] - S[1]) * k - SHADOW_DIR.z * 3]);
    return { S, F, pillars };
  }
  const MERKUR_LAYOUT = {
    spawn: [-6.9, 4], waage: [-26, 12], sonne: [-20, 37], boulder: [-42, 40], krater: [30, 44], kraterZiel: [44, 58],
    wegweiser: [8, 4], sonde: [-24, -16], eis: [-26, 70], // Eis im ewigen Schatten am Kraterboden
    station: [0, 66], jahr: [-4, 59], groesse: [8, 59], meet: [-16, 20],
    route: {
      wegweiser: [[5.5, 2.5]], sonde: [[-6, -6], [-19, -13]], waage: [[-24, -4], [-22, 9]], sonne: [[-22, 20], [-16, 33]],
      temperatur: [[-15.5, 23.5]], eis: [[-27, 52], [-23, 66]], jahr: [[-12, 60], [-7, 55]], groesse: [[4, 55]],
      krater: [[14, 56], [24, 45], [27, 41]], wand: [[16, 52], [3, 60]], rakete: [[10, 48], [8, 30], [2, 6]]
    }
  };
  function buildMerkur() {
    const L = { ...MERKUR_LAYOUT };
    L.shadowSpot = [L.boulder[0] + SHADOW_DIR.x * 12, L.boulder[1] + SHADOW_DIR.z * 12];
    const craters = [MERKUR_CRATER, [...L.eis, 6, 1.5], [...L.sonde, 5, 0.9], [70, 10, 16, 2.4], [-70, -30, 18, 2.8], [-85, 60, 14, 2], [60, 95, 12, 1.8], [-20, 105, 10, 1.4],
      [100, -60, 20, 3], [-48, 10, 6, 0.9], [52, 44, 5, 0.8], [0, -80, 14, 2.2], [-100, 10, 9, 1.3], [40, -85, 8, 1.2]];
    const flats = [[0, 0, 11], [...L.station, 20, "auto"], [L.station[0], L.station[1] + 16, 20, "auto"], [...L.waage, 5], [...L.sonne, 4, "auto", 3], [...L.boulder, 7, "auto"], [...L.shadowSpot, 5, "auto"], [...L.krater, 5, "auto"], [...L.kraterZiel, 7, "auto"]];
    const B = buildBase({
      height: makeHeight(craters, flats, 80),
      // keine Luft: schwarzer Himmel – und eine riesige, grelle Sonne (Merkur ist ihr am nächsten)
      sky: 0x000000, stars: true, sunSize: 430,
      ground: 0x8f877c, rock: 0x6a645c,
      tint: (x, z) => { const m = 0.68 + 0.32 * fbm2(x * 0.012 + 5, z * 0.012); return [m, m * 0.97, m * 0.92]; },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [...L.waage, 4], [...L.sonne, 4], [...L.shadowSpot, 7], [...L.krater, 4],
        [...L.kraterZiel, 7], [...L.wegweiser, 3], [...L.sonde, 3], [...L.eis, 4]],
      ambient: [0x9a8f80, 0.14], hemi: [0x80746a, 0x000000, 0.1], sun: [0xfff6e0, 2.4],
      dust: ["rgba(150,142,130,1)", "rgba(130,122,112,0.9)"]
    });
    const { scene, height, on, rocket } = B;
    const common = addCommon(B, L, "Merkurstation", "merkur");
    const M = colonyMats("merkur");
    // Sonnenschutz-Unterstand über der Waage (tiefe Seite zur Sonne)
    const shelter = on(mercShelter(M), ...L.waage); shelter.rotation.y = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);

    const boulder = new THREE.Mesh(naturalRockGeo(23, 5), new THREE.MeshStandardMaterial({ color: 0x86807a, roughness: 1, vertexColors: true, map: regolithTexture() }));
    boulder.material.map.repeat.set(3, 3);
    // Schattenlauf: drei Felsnadeln werfen Schatteninseln über die Strecke, am Ziel ein goldener Kreis im Felsschatten
    const run = shadowRunLayout(L), pillarMat = new THREE.MeshStandardMaterial({ color: 0x7c766f, roughness: 1, vertexColors: true });
    const pillars = run.pillars.map(([x, z], i) => { const p = new THREE.Mesh(naturalRockGeo(40 + i, 4), pillarMat); p.scale.set(2.1, 2.7, 1.9); p.castShadow = p.receiveShadow = true; return on(p, x, z, 1.2); });
    const finish = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.6, 48), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    finish.rotation.x = -Math.PI / 2; on(finish, ...run.F, 0.07); finish.visible = false;
    on(makeSignBoard(M, "☀️ SCHATTENLAUF", "#b45309", 2.6), run.S[0] + 2.2, run.S[1] + 1.2).rotation.y = Math.atan2(run.F[0] - run.S[0], run.F[1] - run.S[1]) + Math.PI;
    boulder.scale.set(7, 8.5, 6.5); boulder.rotation.set(0.2, 0.7, 0.1); boulder.castShadow = boulder.receiveShadow = true;
    on(boulder, ...L.boulder, 2.4); // unten im Boden versenkt (der Fels ist unten flach)

    // Sonne im Filter-Fernrohr: groß, wie sie vom Merkur aussieht – und daneben klein, wie wir sie von der Erde kennen
    const TOWER = 4; // Sonnenturm, oben das Filter-Fernrohr
    const tower = on(mercSunTower(M, TOWER), ...L.sonne); tower.rotation.y = Math.atan2(-L.sonne[0], -L.sonne[1]);
    const telescope = on(makeTelescope(SUN_DIR), ...L.sonne, TOWER + 0.1);
    const sunAt = SUN_DIR.clone().multiplyScalar(1150), side = new V().crossVectors(SUN_DIR, new V(0, 1, 0)).normalize();
    const sunBig = makeSunDisc(52), sunSmall = makeSunDisc(20);
    sunBig.position.copy(sunAt); sunSmall.position.copy(sunAt).addScaledVector(side, -52);
    scene.add(sunBig, sunSmall);

    // Einschlag-Versuch: Brocken aus dem All und der Krater, den er hinterlässt
    const meteor = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 1, flatShading: true }));
    meteor.visible = false; scene.add(meteor);
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const cx = cv.getContext("2d"), gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(20,18,16,0.85)"); gr.addColorStop(0.55, "rgba(40,36,32,0.7)"); gr.addColorStop(0.75, "rgba(190,180,165,0.75)"); gr.addColorStop(1, "rgba(190,180,165,0)");
    cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
    const decal = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    decal.rotation.x = -Math.PI / 2; decal.visible = false;
    on(decal, ...L.kraterZiel, 0.05);
    const [kx, kz] = L.krater, [tx2, tz2] = L.kraterZiel; // Messpult und Messfeld: Seismometer rund um die Einschlagstelle, rot-weiße Stangen
    on(makeConsole(), kx, kz).rotation.y = Math.atan2(kx - tx2, kz - tz2);
    const seismos = [];
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3, s = on(mercSeismo(M), tx2 + Math.sin(a) * 8, tz2 + Math.cos(a) * 8); seismos.push(s); }
    const stripe = canvasTex(32, 128, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "#fff" : "#dc2626"; c.fillRect(0, i * 16, 32, 16); } });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; on(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), new THREE.MeshStandardMaterial({ map: stripe })), tx2 + Math.sin(a) * 5.5, tz2 + Math.cos(a) * 5.5, 1); }
    on(makeSignBoard(M, "☄️ EINSCHLAG-MESSFELD", "#b45309", 2.8), kx + 2.4, kz - 1.2).rotation.y = Math.atan2(-kx, -kz);

    const board = on(makeInfoBoard(M, "MERKUR-STATION", ["☀️ Sonne: 58 Mio. km", "⏱️ Sonnenlicht: 3 Minuten", "🌍 Erde: 77 – 222 Mio. km"]), ...L.wegweiser);
    board.rotation.y = Math.atan2(L.spawn[0] - L.wegweiser[0], L.spawn[1] - L.wegweiser[1]);
    // Absturzstelle der Sonde MESSENGER (2015): kleiner Krater, Trümmer, Gedenktafel
    on(makeMessenger(M, true), ...L.sonde);
    for (let i = 0; i < 7; i++) { const a = hash2(i, 3) * 6.3, r = 1.8 + hash2(i, 4) * 2.5; const d = on(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.2 + hash2(i, 5) * 0.3), i % 2 ? M.steel : marsCellMat(M)), L.sonde[0] + Math.sin(a) * r, L.sonde[1] + Math.cos(a) * r, 0.05); d.rotation.set(hash2(i, 6), a, hash2(i, 7) * 0.5); }
    const mp = on(makePlaque(M, [["MESSENGER", 52], ["2011 – 2015", 40], ["umkreiste den Merkur", 30], ["und stürzte hier ab", 30]]), L.sonde[0] + 3.2, L.sonde[1] + 2.5);
    mp.rotation.y = Math.atan2(-mp.position.x, -mp.position.z);
    const iceProbe = on(mercIceProbe(M), L.eis[0] - 2.5, L.eis[1] - 2); iceProbe.rotation.y = Math.atan2(2.5, 2);
    const shadeSign = on(makeSignBoard(M, "🌡️ SCHATTEN: −180 °C", "#475569", 2.6), L.shadowSpot[0] + 2.5, L.shadowSpot[1] - 2);
    shadeSign.rotation.y = Math.atan2(-shadeSign.position.x, -shadeSign.position.z);
    const ice = makeIceCrystals(2.2); on(ice, ...L.eis, 0.02);
    const orrery = on(makeOrrery("merkur", 0.75, 1.7), ...L.jahr);
    const { rack, cols: rackCols } = placeSizeRack(B, ["mond", "merkur", "erde"], L.station);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, temperatur: run.S, sonne: L.sonne, krater: L.krater, jahr: L.jahr, groesse: L.groesse,
      eis: L.eis, sonde: L.sonde, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] });
    const npcs = addNpcs(B);
    drawTour(B, L, [168, 158, 144], 1.8); // der Rundgang mit Kofi: oben in der Sonne, dann hinab in den schattigen Krater
    on(makeSignBoard(M, "⬇️ ZUR STATION IM KRATER", "#b45309", 3), -30, 46).rotation.y = Math.atan2(30, -46);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7066, roughness: 0.95, vertexColors: true }); rockMat.userData.natural = true;
    const clusters = [[26, 14, 5], [-46, 4, 5], [52, 30, 5], [-6, -24, 4], [24, -22, 4]];
    clusters.forEach(([x, z, n], i) => rockCluster(B, x, z, n, rockMat, i * 19 + 5));
    common.station.updateMatrixWorld(true);
    const wall = [];
    const colliders = [...common.colliders, [...L.boulder, 6.8], [...L.sonne, 1.9], [...L.krater, 1], [...L.wegweiser, 0.3], [...L.sonde, 1.6],
      [...L.eis, 0.5], [iceProbe.position.x, iceProbe.position.z, 1.1], [...L.jahr, 1.2], ...rackCols,
      ...seismos.map((s) => [s.position.x, s.position.z, 0.5]), ...wall, ...npcs.map((n) => n.col), ...run.pillars.map(([x, z]) => [x, z, 1.7]),
      ...clusters.filter((c) => c[2] >= 5).map(([x, z]) => [x, z, 1.2])];

    return { ...B, ...common, L, telescope, sunBig, sunSmall, sunAt, meteor, decal, orrery, rack, stations, colliders, npcs, blink: common.station.userData.blink,
      shadowCasters: [boulder, rocket, common.station, tower, shelter, ...pillars], run, finish };
  }
  function startSunScope() {
    const T = cfg.sunScope, w = world;
    startTour("sonne", T, [
      { pos: w.sunAt, fov: 8, text: T.found, enter: () => { w.sunGlow.visible = false; w.sunBig.visible = true; } },
      { pos: tmp2.copy(w.sunAt).lerp(w.sunSmall.position, 0.5).clone(), fov: 9, text: T.compare, btn: T.compareBtn, enter: () => { w.sunSmall.visible = true; } }
    ], { end: () => { w.sunGlow.visible = true; w.sunBig.visible = w.sunSmall.visible = false; } });
  }
  // --- Einschlag: ein Brocken aus dem All fällt ungebremst herunter ---
  function startMeteor() {
    enterExhibit("krater", { update: updateMeteor, t: 0, run: false });
    askGuess(cfg.impact.guess, cfg.impact.ready, runMeteor);
  }
  function runMeteor() {
    const sp = view.special; sp.t = 0; sp.run = true; sp.hit = false;
    world.meteor.visible = true; world.decal.visible = false;
    scopeSay(cfg.impact.running);
  }
  function updateMeteor(dt) {
    const c = world.camera, sp = view.special, [kx, kz] = world.L.krater, [gx, gz] = world.L.kraterZiel, gy = world.height(gx, gz);
    c.position.lerp(tmp.set(kx + 5, world.height(kx, kz) + 3.2, kz - 7), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(gx, gy + 2.5, gz), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (!sp.run) return;
    sp.t += dt;
    const f = sp.t / 1.4;
    if (f < 1) { world.meteor.position.set(gx - 45 * (1 - f), gy + 80 * (1 - f), gz + 30 * (1 - f)); world.meteor.rotation.x += dt * 6; }
    else if (!sp.hit) {
      sp.hit = true; world.meteor.visible = false; world.decal.visible = true;
      Sound.land(); grains(tmp.set(gx, gy + 0.2, gz), 60, 3.2, 0, 0, 5);
    }
    if (sp.t > 3.4) {
      sp.run = false; Sound.correct();
      scopeSay(guessed(cfg.impact.end), [[cfg.impact.again, runMeteor], [cfg.impact.done, leaveExhibit, true]]);
    }
  }

  // =========================================================
  //  Pluto
  // =========================================================
  // =========================================================
  //  Pluto-Station: Die Sonne ist hier so schwach wie bei uns in der Dämmerung – Strom kommt aus einer „Atom-Batterie“ (wie bei New Horizons).
  //  Gut gedämmte Module in gesteppten Wärmedecken, eine Iglu-Sternwarte aus Wassereis-Blöcken, ein beheizter Pavillon,
  //  ein Drohnen-Landeplatz, eine große Antenne zur Erde, Eisberge am Horizont und blauer Dunst
  // =========================================================
  // Gesteppte Wärmedecke (wie auf Raumsonden)
  let quiltTexCache = null;
  function quiltTex() {
    if (quiltTexCache) return quiltTexCache;
    const t = canvasTex(256, 256, (c) => {
      c.fillStyle = "#e9e6f2"; c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const g = c.createRadialGradient(x * 64 + 32, y * 64 + 32, 4, x * 64 + 32, y * 64 + 32, 44);
        g.addColorStop(0, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(80,70,110,0.28)");
        c.fillStyle = g; c.fillRect(x * 64, y * 64, 64, 64);
      }
      c.strokeStyle = "rgba(90,80,120,0.5)"; c.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, 256); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(256, i * 64); c.stroke(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; quiltTexCache = t;
    return t;
  }
  function quilt(M, rx, ry) { const t = quiltTex().clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return M.std({ map: t, roughness: 0.85 }); }
  // Liegendes, gedämmtes Modul auf Kufen (lokal: Tür nach +Z) mit warmem Licht aus den Fenstern
  function plutoModule(g, M, x, z, face, len, label) {
    const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = face; g.add(m);
    const body = put(m, new THREE.Mesh(new THREE.CapsuleGeometry(2.1, len, 8, 28), quilt(M, 6, 3)), 0, 2.6, 0); body.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      put(m, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, len + 2), M.metal), s * 1.5, 0.15, 0); // Kufen
      for (const dz of [-len / 3, len / 3]) put(m, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), M.metal), s * 1.5, 0.6, dz);
      for (let i = 0; i < 3; i++) { const w = put(m, new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), M.glow), s * 2.09, 2.9, -len / 3 + i * len / 3, false); w.rotation.y = s * Math.PI / 2; }
    }
    put(m, new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.12, 10, 28), M.orange), 0, 2.6, len / 2 - 0.2, false);
    const door = put(m, new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 24), M.teal), 0, 2.2, len / 2 + 2); door.rotation.x = Math.PI / 2;
    put(m, new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), M.glow), 0, 2.2, len / 2 + 2.16, false);
    for (let i = 0; i < 4; i++) put(m, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.35), M.metal), 0, 0.3 + i * 0.45, len / 2 + 2.6 + (3 - i) * 0.35); // Treppe
    put(m, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), signMat(label, "#6d28d9", 600, 112, 54)), 0, 4.5, len / 2 + 1.2, false);
    const l = new THREE.PointLight(0xffc987, 0.9, 12, 1.5); l.position.set(0, 3.5, len / 2 + 3); m.add(l);
    return m;
  }
  // Atom-Batterie (RTG): schwarzer Zylinder mit Kühlrippen, glimmt schwach – liefert Strom auch in der Dunkelheit
  function plutoRTG(M) {
    const g = new THREE.Group(), dark = M.std({ color: srgb(0x1f2230), roughness: 0.5, metalness: 0.6 });
    const glow = new THREE.MeshStandardMaterial({ color: srgb(0x2a0a05), emissive: srgb(0xff5a2a), emissiveIntensity: 0.5 });
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.8, 20), dark), 0, 1.3, 0);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; put(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.5), glow), Math.sin(a) * 0.6, 1.3, Math.cos(a) * 0.6).rotation.y = a; }
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.4, 20), M.metal), 0, 0.2, 0);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.34), signMat("☢️ ATOM-BATTERIE", "#f59e0b", 480, 102, 44)), 0, 2.45, 0.02, false);
    return g;
  }
  // Iglu-Sternwarte: runde Mauer aus Wassereis-Blöcken, oben offen (lokal: Eingang nach +Z)
  function plutoIgloo(M) {
    const g = new THREE.Group(), R = 2.6, rows = 4, ice = M.std({ color: srgb(0xcfe3ff), roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.92, envMapIntensity: 1.3 });
    for (let r = 0; r < rows; r++) {
      const rr = R - r * 0.12, n = 14, h = 0.34;
      for (let i = 0; i < n; i++) {
        const a = ((i + (r % 2) * 0.5) / n) * Math.PI * 2;
        if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.3 && r < 3) continue; // Eingang
        const b = put(g, new THREE.Mesh(new THREE.BoxGeometry(1.08, h - 0.03, 0.45), ice), Math.sin(a) * rr, 0.18 + r * h, Math.cos(a) * rr);
        b.rotation.y = a; b.receiveShadow = true;
      }
    }
    put(g, new THREE.Mesh(new THREE.CircleGeometry(R, 32), M.std({ color: srgb(0xe8edf7), roughness: 0.6 })), 0, 0.02, 0, false).rotation.x = -Math.PI / 2;
    const l = new THREE.PointLight(0x9fc2ff, 0.6, 7, 1.5); l.position.set(0, 1, 0); g.add(l);
    return g;
  }
  // Beheizter Pavillon: Dach mit orange glühenden Heizstrahlern darunter
  function plutoHeatPavilion(M) {
    const g = new THREE.Group();
    for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), M.steel), x, 1.5, z);
    const roof = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.2, 0.9, 6), quilt(M, 3, 1)), 0, 3.4, 0); roof.rotation.y = Math.PI / 6;
    const hot = new THREE.MeshBasicMaterial({ color: srgb(0xff7a2a), toneMapped: false });
    for (const [x, z] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.18), hot), x, 2.9, z, false).rotation.y = z ? Math.PI / 2 : 0;
    const l = new THREE.PointLight(0xff9a50, 1.1, 8, 1.5); l.position.set(0, 2.6, 0); g.add(l);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.42), signMat("🔥 WÄRME-PAVILLON", "#6d28d9", 640, 84, 50)), 0, 3.25, -2.5, false).rotation.y = Math.PI;
    return g;
  }
  // Drohnen-Landeplatz: sechseckige Plattform mit Lichtern und kleiner Garage
  function plutoDronePad(M) {
    const g = new THREE.Group(), lights = [];
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.2, 6), M.metal), 0, 0.1, 0).receiveShadow = true;
    put(g, new THREE.Mesh(new THREE.RingGeometry(1.4, 1.6, 6), new THREE.MeshBasicMaterial({ color: srgb(0xf59e0b), toneMapped: false })), 0, 0.21, 0, false).rotation.x = -Math.PI / 2;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; lights.push(blinkLamp(g, 0x7dd3fc, Math.sin(a) * 2.1, 0.3, Math.cos(a) * 2.1)); }
    const garage = put(g, new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2), quilt(M, 2, 1)), 3.6, 0.8, 0);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), M.metal), 3.6, 0.7, 1.01, false);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.4), signMat("🚁 DROHNEN-START", "#6d28d9", 560, 102, 48)), 3.6, 1.85, 1.02, false);
    g.userData.lights = lights;
    return g;
  }
  // Große Antenne zur Erde: Schüssel auf einem Sockel, daneben die Atom-Batterie
  function plutoDish(M, dir) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 2.2, 16), quilt(M, 2, 1)), 0, 1.1, 0);
    const head = new THREE.Group(); head.position.y = 2.4; head.quaternion.setFromUnitVectors(new V(0, 1, 0), dir.clone().normalize()); g.add(head);
    put(head, dishCap(M, 3, 0.75), 0, -2.2, 0);
    for (let i = 0; i < 3; i++) { const a = i * 2.09; pipeSeg(head, M, new V(Math.sin(a) * 1.9, 0.0, Math.cos(a) * 1.9), new V(0, 1.6, 0), 0.04, M.steel); }
    put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.4, 12), M.orange), 0, 1.7, 0);
    const rtg = plutoRTG(M); rtg.position.set(2.6, 0, 1.6); g.add(rtg);
    return g;
  }
  // Antennenschüssel (Wölbung oben wie eine Kugelkappe, Öffnung nach unten): hellgrau mit dunklem Rand,
  // Halterung hinten und Empfänger in der Mitte – damit sie nicht wie eine weiße Kugel aussieht
  function dishCap(M, R, open) {
    const g = new THREE.Group(), rimR = R * Math.sin(open), rimY = R * Math.cos(open);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 36, 10, 0, Math.PI * 2, 0, open), M.std({ color: srgb(0xd5dbe4), side: THREE.DoubleSide, roughness: 0.55 })));
    const rim = put(g, new THREE.Mesh(new THREE.TorusGeometry(rimR, R * 0.035, 8, 40), M.std({ color: srgb(0x475063), roughness: 0.5, metalness: 0.4 })), 0, rimY, 0);
    rim.rotation.x = Math.PI / 2;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.22, R * 0.18, 16), M.std({ color: srgb(0x6b7280), roughness: 0.5, metalness: 0.5 })), 0, R + R * 0.06, 0); // Halterung hinten
    put(g, new THREE.Mesh(new THREE.ConeGeometry(R * 0.09, R * 0.3, 12), M.std({ color: srgb(0x374151), roughness: 0.5 })), 0, rimY - R * 0.3, 0).rotation.x = Math.PI; // Empfänger
    return g;
  }
  // New Horizons: flacher, dreieckiger Körper in Goldfolie, große weiße Schüssel, schwarze Atom-Batterie an einem Arm
  function makeNewHorizons(M) {
    const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ map: foilTex(), roughness: 0.3, metalness: 0.75, envMap: M.env });
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.2, 8), M.metal), 0, 0.6, 0);
    const body = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 3), gold), 0, 1.5, 0);
    const dish = put(g, dishCap(M, 1.2, 0.7), 0, 1.0, -0.4);
    dish.rotation.x = -Math.PI / 2 - 0.2; dish.position.set(0, 1.6, -1.2);
    pipeSeg(g, M, new V(0.5, 1.5, 0.3), new V(1.4, 1.4, 0.9), 0.05, M.steel);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 12), M.std({ color: srgb(0x1f2230), roughness: 0.5 })), 1.5, 1.4, 1, false).rotation.z = Math.PI / 2;
    return g;
  }

  function buildPlutoCamp(g, add) {
    const M = colonyMats("pluto");
    plutoModule(g, M, -12, 12, Math.atan2(5, -12), 8, "🏠 WOHNMODUL");
    plutoModule(g, M, 12, 12, Math.atan2(-5, -12), 8, "🔬 LABOR");
    const rtg = plutoRTG(M); rtg.position.set(0, 0, 14); g.add(rtg);
    const rtg2 = plutoRTG(M); rtg2.position.set(3, 0, 16); g.add(rtg2);
    // Scheinwerfermasten: Die Sonne ist hier so schwach wie bei uns in der Dämmerung
    for (const [x, z] of [[-20, 2], [20, 3], [0, 24]]) {
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 7, 8), M.steel), x, 3.5, z);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: srgb(0xfff1d0), toneMapped: false })), x, 7, z, false);
      const l = new THREE.PointLight(0xffe7c0, 1.2, 30, 1.2); l.position.set(x, 6.6, z); g.add(l);
    }
    for (const [x, z, s, c, r, y] of [[16, 3, 1.1, M.orange, 0.3, 0], [17.2, 4.3, 0.9, M.teal, -0.2, 0]]) colonyCrate(g, M, x, z, s, c, r, y);
  }
  function plutoCampColliders([sx, sz]) {
    const c = [[sx, sz + 14, 1], [sx + 3, sz + 16, 1], [sx - 20, sz + 2, 0.3], [sx + 20, sz + 3, 0.3], [sx, sz + 24, 0.3], [sx + 16.5, sz + 3.6, 1.3]];
    for (const [x, z, f] of [[-12, 12, Math.atan2(5, -12)], [12, 12, Math.atan2(-5, -12)]]) for (const d of [-4, -1.5, 1.5, 4, 6.8]) c.push([sx + x + Math.sin(f) * d, sz + z + Math.cos(f) * d, 2.5]);
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx + x, sz + 0.1, 1]); // Tafelwand
    return c;
  }

  // Zellmuster auf dem Herz (echte Eis-Zellen, in denen das Stickstoff-Eis langsam umgewälzt wird): 0 = Zellmitte … 1 = Rand
  function heartCells(x, z) {
    const S = 11, cx = Math.floor(x / S), cz = Math.floor(z / S);
    let d1 = 1e9, d2 = 1e9;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const px = (cx + i + hash2(cx + i, cz + j)) * S, pz = (cz + j + hash2(cz + j + 17, cx + i + 5)) * S, d = Math.hypot(x - px, z - pz);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return 1 - smooth(0, 1.6, d2 - d1);
  }
  // Pluto: Die Rakete landet zwischen Eisbergen und dem „Herz“, einer riesigen Ebene aus Stickstoff-Eis. Der Weg führt hinauf
  // auf eine Eis-Terrasse zur Iglu-Sternwarte, hinunter zum Herz (rutschen!), zur Station am Fuß der Berge und über den Grat zurück.
  const PLUTO_LAYOUT = {
    spawn: [-6.9, 4], waage: [12, 16], charon: [32, 30], herz: [28, 54], funk: [-38, 22], wegweiser: [6, 5], sonde: [-20, 6],
    eis: [8, 62], heart: [0, 92], // das „Herz“: eine riesige glatte Eisfläche direkt vor der Station
    station: [-34, 56], jahr: [-40, 49], groesse: [-28, 49], meet: [-14, 24],
    route: {
      wegweiser: [[4, 2.5]], waage: [[8, 9], [15.5, 12]], charon: [[22, 18], [28, 24]], herz: [[30, 40], [25, 49.5]], eis: [[16, 54], [8, 58]],
      jahr: [[-14, 50], [-33, 45], [-40, 45]], groesse: [[-28, 45]], funk: [[-30, 38], [-35, 28], [-34, 19]], sonde: [[-26, 12], [-17, 9]],
      wand: [[-24, 24], [-30, 44], [-31, 51]], rakete: [[-30, 40], [-20, 16], [-4, 5]]
    }
  };
  // Eisberg aus Wassereis (Größe 1, Fuß bei y = 0): zerklüftet, unten grauer Staub, an den Flanken bläuliches Eis, oben Schnee
  function plutoIceMountainGeo(seed) {
    const geo = new THREE.IcosahedronGeometry(1, 3), pos = geo.attributes.position, cols = [];
    const DUST = srgb(0x5b534c), ICE = srgb(0x93abc9), DEEP = srgb(0x667ea2), SNOW = srgb(0xf1f5fb), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y < 0) y *= 0.05; // flacher Fuß
      const n = fbm2(x * 2.4 + seed * 7.3, z * 2.4 + y * 3.1), r = 1 - 0.72 * y; // nach oben spitz zulaufen
      x *= r * (0.75 + 0.55 * n); z *= r * (0.75 + 0.55 * n);
      y *= 0.8 + 0.5 * fbm2(x * 1.6 + seed * 3.1, z * 1.6 - seed);
      pos.setXYZ(i, x, y, z);
      const snow = 0.5 + 0.25 * fbm2(x * 4 + seed, z * 4 - seed);
      c.copy(DUST).lerp(ICE, smooth(0.04, 0.22, y + 0.08 * n)).lerp(DEEP, 0.55 * smooth(0.45, 0.75, fbm2(x * 5 + 9, y * 6 + z * 5)));
      c.lerp(SNOW, smooth(snow - 0.06, snow + 0.06, y));
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    return geo;
  }
  const CHARON_DIR = new V(-0.55, 0.5, 0.65).normalize(), HEART_SIZE = 48;
  // Herzform (von oben gesehen): (x² + y² − 1)³ − x²·y³ ≤ 0
  function inHeart(x, z) {
    const X = (x - PLUTO_LAYOUT.heart[0]) / HEART_SIZE, Y = (z - PLUTO_LAYOUT.heart[1]) / HEART_SIZE, a = X * X + Y * Y - 1;
    return a * a * a - X * X * Y * Y * Y <= 0;
  }
  function makeDrone() {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.5 }));
    body.position.y = 0.55; body.castShadow = true; g.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), dark); eye.position.set(0, 0.38, 0.22); g.add(eye);
    const flames = new THREE.Group();
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.45, 8), dark); leg.position.set(x * 0.38, 0.28, z * 0.38); g.add(leg);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      fl.rotation.x = Math.PI; fl.position.set(x * 0.38, -0.2, z * 0.38); flames.add(fl);
    }
    flames.visible = false; g.add(flames);
    g.scale.setScalar(1.5);
    g.userData = { flames };
    return g;
  }
  function buildPluto() {
    const L = { ...PLUTO_LAYOUT };
    const craters = [[60, 20, 12, 1.6], [-75, -40, 16, 2], [50, -70, 14, 2], [-95, 75, 12, 1.6], [90, -20, 9, 1.2], [-30, -80, 10, 1.4]];
    const flats = [[0, 0, 11], [...L.station, 18], [L.station[0], L.station[1] + 14, 20], [...L.waage, 4], [...L.charon, 5, "auto", 4], [...L.herz, 7], [...L.funk, 5, "auto", 4], [L.heart[0], L.heart[1] + 5, 62]];
    const hills = [[L.charon[0] + 2, L.charon[1] + 2, 18, 6], [L.funk[0] - 3, L.funk[1], 16, 5], [-58, 40, 26, 8]]; // Eis-Terrasse, Grat, Bergfuß
    const B = buildBase({
      height: makeHeight(craters, flats, 120, null, hills),
      // fast keine Luft, schwarzer Himmel – die Sonne ist so weit weg, dass sie nur noch ein sehr heller Stern ist
      sky: 0x000000, stars: true, sunSize: 34,
      ground: 0xa89680, rock: 0x8a7a68,
      tint: (x, z) => { if (inHeart(x, z)) { const e = 1 - 0.3 * heartCells(x, z); return [1.9 * e, 1.9 * e, 1.85 * e]; } const m = 0.42 + 0.28 * fbm2(x * 0.012 + 2, z * 0.012); return [m, m * 0.88, m * 0.76]; },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [...L.waage, 4], [...L.charon, 4], [...L.herz, 4], [...L.funk, 4],
        [...L.wegweiser, 3], [...L.sonde, 3], [L.heart[0], L.heart[1] + 5, 66]],
      ambient: [0x8fa0c0, 0.34], hemi: [0x6f86b8, 0x000000, 0.22], sun: [0xeef2ff, 0.95],
      dust: ["rgba(235,240,250,1)", "rgba(200,210,230,0.9)"]
    });
    const { scene, height, on, rocket } = B;
    const common = addCommon(B, L, "Plutostation", "pluto");
    const M = colonyMats("pluto");

    // Charon: Plutos großer Mond, steht immer an derselben Stelle am Himmel; daneben (nur im Fernrohr) unser Mond zum Vergleich
    const charon = new THREE.Mesh(new THREE.SphereGeometry(30, 40, 28), new THREE.MeshStandardMaterial({ map: W.bodies.mond.mesh.material.map, color: 0x9a948c, roughness: 1 }));
    charon.position.copy(CHARON_DIR).multiplyScalar(900);
    const side = new V().crossVectors(CHARON_DIR, new V(0, 1, 0)).normalize();
    const cmpMoon = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 16), new THREE.MeshStandardMaterial({ map: W.bodies.mond.mesh.material.map, color: 0xd8d8d8, roughness: 1 }));
    cmpMoon.position.copy(charon.position).addScaledVector(side, 46); cmpMoon.visible = false;
    scene.add(charon, cmpMoon);
    const igloo = on(plutoIgloo(M), ...L.charon); // Iglu-Sternwarte aus Wassereis-Blöcken, Eingang zur Rakete
    igloo.rotation.y = Math.atan2(-L.charon[0], -L.charon[1]);
    const telescope = on(makeTelescope(CHARON_DIR), ...L.charon);
    on(makeSignBoard(M, "🔭 IGLU-STERNWARTE", "#6d28d9", 2.6), L.charon[0] - 3.4, L.charon[1] - 2).rotation.y = Math.atan2(-L.charon[0], -L.charon[1]);

    const dronePad = on(plutoDronePad(M), ...L.herz); dronePad.rotation.y = Math.atan2(-L.herz[0], -L.herz[1]);
    const drone = on(makeDrone(), ...L.herz, 0.2);
    // Funk-Antenne zeigt zur Sonne: Von hier aus steht die Erde ganz dicht neben ihr
    on(plutoDish(M, SUN_DIR), ...L.funk); // große Antenne zur Erde (die Erde steht von hier aus ganz dicht neben der Sonne)
    const signalFrom = new V(L.funk[0], height(...L.funk) + 3.2, L.funk[1]);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 880, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.copy(signalFrom).addScaledVector(SUN_DIR, 440);
    beam.quaternion.setFromUnitVectors(new V(0, 1, 0), SUN_DIR);
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(220,255,220,1)", "rgba(74,222,128,0.7)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    beam.visible = pulse.visible = false;
    scene.add(beam, pulse);

    const board = on(makeInfoBoard(M, "PLUTO-STATION", ["☀️ Sonne: 5,9 Mrd. km", "📡 Funk zur Erde: 5½ Std.", "🌡️ −230 °C"]), ...L.wegweiser);
    board.rotation.y = Math.atan2(L.spawn[0] - L.wegweiser[0], L.spawn[1] - L.wegweiser[1]);
    on(makeNewHorizons(M), ...L.sonde).rotation.y = -0.5; // Nachbau als Denkmal
    const np = on(makePlaque(M, [["NEW HORIZONS", 48], ["flog 2015 an Pluto vorbei", 30], ["und schickte die ersten", 30], ["Nahaufnahmen", 30]]), L.sonde[0] + 2.4, L.sonde[1] + 2);
    np.rotation.y = Math.atan2(-np.position.x, -np.position.z);
    on(plutoHeatPavilion(M), ...L.waage).rotation.y = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);
    // Eisberge aus Wassereis am Rand des Herzens und blauer Dunst am Horizont
    const iceMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(plutoIceMountainGeo(i), iceMat); // zerklüftete Gipfel: Staub am Fuß, Eis an den Flanken, Schnee oben
      const sy = 40 + hash2(i, 2) * 34;
      m.scale.set(30 + hash2(i, 1) * 20, sy, 26 + hash2(i, 4) * 18);
      const [px, pz] = [[-80, -14], [-88, 18], [-82, 50], [-94, 82], [-72, 116], [58, -54], [18, -74], [-32, -68], [96, 14]][i].map((v) => v * 1.25);
      m.position.set(px, height(px, pz) - 2, pz); m.rotation.y = hash2(i, 3) * 6.3; scene.add(m);
    }
    const hazeTex = canvasTex(8, 128, (c) => { const gr = c.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(90,150,255,0)"); gr.addColorStop(0.6, "rgba(110,165,255,0.45)"); gr.addColorStop(1, "rgba(150,195,255,0.85)"); c.fillStyle = gr; c.fillRect(0, 0, 8, 128); });
    const haze = new THREE.Mesh(new THREE.CylinderGeometry(430, 430, 70, 48, 1, true), new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false }));
    haze.position.y = 22; scene.add(haze);
    drawTour(B, L, [206, 196, 182], 1.8);
    const npcs = addNpcs(B);
    const orrery = on(makeOrrery("pluto", 1.95, 0.6), ...L.jahr);
    const { rack, cols: rackCols } = placeSizeRack(B, ["pluto", "mond", "erde"], L.station);

    // Eis-Curling: Zielscheibe auf dem Herz, Eisstein und Richtungspfeil
    const lane = curlLane(L), curl = makeCurling();
    curl.target.position.set(lane.tx, height(lane.tx, lane.tz) + 0.04, lane.tz); scene.add(curl.target, curl.stone, curl.arrow);
    curl.stone.visible = curl.arrow.visible = false;
    on(makeSignBoard(M, "🥌 EIS-CURLING", "#0e7490", 2.4), lane.sx - lane.dz * 3, lane.sz + lane.dx * 3).rotation.y = Math.atan2(-lane.dx, -lane.dz);
    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, charon: L.charon, herz: L.herz, funk: L.funk, jahr: L.jahr, groesse: L.groesse,
      eis: L.eis, sonde: L.sonde, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] }, { charon: MARS_SCOPE_DOOR(L.charon) });
    const colliders = [...common.colliders, [...L.charon, 2.9], [...L.herz, 0.7], [L.herz[0] + 3.6 * Math.cos(dronePad.rotation.y), L.herz[1] - 3.6 * Math.sin(dronePad.rotation.y), 1.4], [...L.funk, 1.2], [L.funk[0] + 2.6, L.funk[1] + 1.6, 0.9], [...L.wegweiser, 0.3], [...L.sonde, 1.4], ...npcs.map((n) => n.col),
      [...L.jahr, 1.2], ...rackCols];

    return { ...B, ...common, L, telescope, charon, cmpMoon, drone, droneY: drone.position.y, signalFrom, beam, pulse, orrery, rack, npcs, curl, lane,
      blink: dronePad.userData.lights, stations, colliders, shadowCasters: [rocket, common.station, igloo] };
  }
  // ---------- Eis-Curling: Bahn vom Kreis aus Richtung Herzmitte ----------
  const CURL_LEN = 22, CURL_DECEL = 0.8; // Ziel 22 m entfernt; auf Stickstoff-Eis bremst fast nichts
  function curlLane(L) {
    const [sx, sz] = L.eis, [hx, hz] = L.heart, d = Math.hypot(hx - sx, hz - sz), dx = (hx - sx) / d, dz = (hz - sz) / d;
    return { sx, sz, dx, dz, tx: sx + dx * CURL_LEN, tz: sz + dz * CURL_LEN };
  }
  function makeCurling() {
    // Zielscheibe: blau – weiß – rot (Radien 3,8 / 2,4 / 1,2 m)
    const tex = canvasTex(512, 512, (c) => {
      const ring = (r, col) => { c.fillStyle = col; c.beginPath(); c.arc(256, 256, r, 0, 7); c.fill(); };
      ring(254, "rgba(37,99,235,0.85)"); ring(214, "rgba(240,248,255,0.85)"); ring(160, "rgba(59,130,246,0.85)"); ring(124, "rgba(240,248,255,0.9)"); ring(80, "rgba(220,38,38,0.9)"); ring(28, "rgba(240,248,255,0.95)");
    });
    const target = new THREE.Mesh(new THREE.CircleGeometry(3.8, 48), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.25, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 }));
    target.rotation.x = -Math.PI / 2; target.receiveShadow = true;
    // Eisstein: Granit mit farbigem Griff
    const stone = new THREE.Group();
    const granite = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.26, 0.01), new THREE.Vector2(0.31, 0.06), new THREE.Vector2(0.3, 0.13), new THREE.Vector2(0.24, 0.18), new THREE.Vector2(0, 0.19)], 28),
      new THREE.MeshStandardMaterial({ color: srgb(0x6b7280), roughness: 0.35, metalness: 0.15 }));
    granite.castShadow = true; stone.add(granite);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 8, 32), new THREE.MeshStandardMaterial({ color: srgb(0xfacc15), roughness: 0.4 })); band.rotation.x = Math.PI / 2; band.position.y = 0.11; stone.add(band);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.34), new THREE.MeshStandardMaterial({ color: srgb(0xdc2626), roughness: 0.4 })); handle.position.set(0, 0.24, -0.04); stone.add(handle);
    // Pfeil: Richtung und (Länge, Farbe) Schwung
    const arrow = new THREE.Group(), amat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85, depthWrite: false });
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1), amat); shaft.rotation.x = -Math.PI / 2; shaft.position.z = 0.5; arrow.add(shaft);
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.4, 3), amat); head.rotation.x = -Math.PI / 2; head.rotation.z = Math.PI / 2; head.position.z = 1.1; arrow.add(head);
    arrow.userData = { shaft, head, mat: amat };
    return { target, stone, arrow };
  }
  function startCurling() {
    const ln = world.lane;
    enterExhibit("eis", { update: updateCurling, phase: "aim", aim: (Math.random() - 0.5) * 0.4, t: 0, left: 3, best: 0, v: 0, power: 0 });
    const sp = view.special; sp.x = ln.sx + ln.dx * 1.4; sp.z = ln.sz + ln.dz * 1.4;
    world.curl.stone.visible = world.curl.arrow.visible = true; world.astronaut.visible = false;
    curlAim();
  }
  function curlAim() {
    const sp = view.special, T = cfg.curling, ln = world.lane;
    sp.phase = "aim"; sp.x = ln.sx + ln.dx * 1.4; sp.z = ln.sz + ln.dz * 1.4; sp.v = 0;
    world.curl.arrow.visible = true;
    scopeSay(isTouch() ? T.aimTouch : T.aim, [[T.aimBtn, curlPower, true]]);
  }
  function curlPower() { const sp = view.special; sp.phase = "power"; sp.t = 0; scopeSay(cfg.curling.power, [[cfg.curling.throwBtn, curlThrow, true]]); }
  function curlThrow() {
    const sp = view.special; sp.phase = "slide"; sp.v = 3.2 + sp.power * 5; sp.left--;
    world.curl.arrow.visible = false; Sound.whoosh();
    scopeSay(cfg.curling.slide);
  }
  function curlEnd(success) {
    const sp = view.special;
    world.curl.stone.visible = world.curl.arrow.visible = false; world.astronaut.visible = true;
    if (success) leaveExhibit();
    else { const key = sp.key; view.special = null; world.stations[key].marker.visible = true; $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping", "driving"); }
  }
  function updateCurling(dt) {
    const sp = view.special, c = world.camera, ln = world.lane, T = cfg.curling, st = world.curl.stone, ar = world.curl.arrow;
    if (sp.phase === "aim") sp.aim = Math.max(-0.45, Math.min(0.45, sp.aim - sp.ix * dt * 0.7));
    if (sp.phase === "power") { sp.t += dt; sp.power = 0.5 - 0.5 * Math.cos(sp.t * 2.1); }
    const ca = Math.cos(sp.aim), sa = Math.sin(sp.aim), dx = ln.dx * ca - ln.dz * sa, dz = ln.dz * ca + ln.dx * sa;
    if (sp.phase === "slide") {
      sp.x += dx * sp.v * dt; sp.z += dz * sp.v * dt; sp.v = Math.max(0, sp.v - CURL_DECEL * dt);
      st.rotation.y += dt * sp.v * 0.6; // dreht sich beim Rutschen
      if (sp.v <= 0) { // liegen geblieben: wie nah am Ziel?
        sp.phase = "result";
        const d = Math.hypot(sp.x - ln.tx, sp.z - ln.tz), along = (sp.x - ln.sx) * ln.dx + (sp.z - ln.sz) * ln.dz;
        const pts = d < 1.2 ? 3 : d < 2.4 ? 2 : d < 3.8 ? 1 : 0;
        const first = pts > 0 && !sp.best; sp.best = Math.max(sp.best, pts);
        if (pts) { Sound.correct(); UI.confetti(pts * 40); } else Sound.wrong();
        let text = pts === 3 ? T.r3 : pts === 2 ? T.r2 : pts === 1 ? T.r1 : along < CURL_LEN ? T.short : T.long;
        if (first) text += " " + T.fact;
        const btns = [];
        if (sp.left > 0) btns.push([fmtVars(T.again, { n: sp.left }), curlAim, !sp.best]);
        if (sp.best) btns.push([T.done, () => curlEnd(true), true]);
        if (!sp.best && sp.left <= 0) { sp.left = 3; btns.push([fmtVars(T.again, { n: 3 }), curlAim, true]); }
        if (!sp.best) btns.push([T.quit, () => curlEnd(false)]);
        scopeSay(text, btns);
      }
    }
    st.position.set(sp.x, world.height(sp.x, sp.z) + 0.02, sp.z);
    // Pfeil: zeigt die Richtung; beim Schwung-Holen wächst er und wird von grün über gelb nach rot
    ar.position.set(sp.x, st.position.y + 0.05, sp.z); ar.rotation.y = Math.atan2(dx, dz);
    const len = sp.phase === "power" ? 1 + sp.power * 5 : 2.4;
    ar.userData.shaft.scale.y = len; ar.userData.shaft.position.z = 0.35 + len / 2; ar.userData.head.position.z = 0.45 + len;
    ar.userData.mat.color.setHSL(sp.phase === "power" ? 0.33 * (1 - sp.power) : 0.33, 0.8, 0.5);
    // Kamera hinter dem Stein; beim Rutschen fährt sie mit
    const back = sp.phase === "slide" || sp.phase === "result" ? 6 : 5.5;
    c.position.lerp(tmp.set(sp.x - dx * back, st.position.y + 2.6, sp.z - dz * back), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(sp.x + dx * 8, st.position.y, sp.z + dz * 8), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
  }
  function startCharon() {
    const T = cfg.charon, w = world;
    startTour("charon", T, [
      { pos: w.charon.position, fov: 9, text: T.found },
      { pos: tmp2.copy(w.charon.position).lerp(w.cmpMoon.position, 0.45).clone(), fov: 10, text: T.compare, btn: T.compareBtn, enter: () => { w.cmpMoon.visible = true; } },
      { pos: w.sunGlow.position, fov: 16, text: T.sun, btn: T.sunBtn, slow: true }
    ], { end: () => { w.cmpMoon.visible = false; } });
  }
  // --- Kameradrohne: aufsteigen und das Herz von oben sehen ---
  function startDrone() {
    enterExhibit("herz", { update: updateDrone, t: 0, top: false });
    world.drone.userData.flames.visible = true;
    scopeSay(cfg.drone.rising);
  }
  function updateDrone(dt) {
    const sp = view.special, c = world.camera, d = world.drone, [hx, hz] = world.L.heart; sp.t += dt;
    const k = smooth(0.3, 6, sp.t);
    d.position.y = world.droneY + k * 150;
    d.userData.flames.scale.y = 0.8 + Math.random() * 0.5;
    const dx = hx - d.position.x, dz = hz - d.position.z, h = Math.hypot(dx, dz);
    // erst von hinten zuschauen, oben dann durch die Kamera der Drohne blicken (die Drohne selbst wäre sonst im Bild)
    const back = 5 * (1 - k);
    c.position.lerp(tmp.set(d.position.x - (dx / h) * back, d.position.y + 2.5 - 3.5 * k, d.position.z - (dz / h) * back), 1 - Math.exp(-dt * 4));
    d.visible = k < 0.7;
    // erst der Drohne nachschauen, oben dann hinunter auf das Herz
    tmp2.set(d.position.x + (dx / h) * 12, d.position.y, d.position.z + (dz / h) * 12).lerp(tmp.set(hx, 0, hz + 8), k);
    view.look.lerp(tmp2, 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (k >= 1 && !sp.top) { sp.top = true; Sound.correct(); scopeSay(cfg.drone.top, [[cfg.drone.done, endDrone, true]]); }
  }
  function endDrone() {
    world.drone.position.y = world.droneY; world.drone.userData.flames.visible = false; world.drone.visible = true;
    leaveExhibit();
  }
  // --- Funkspruch zur Erde: Das Licht ist 5½ Stunden unterwegs (hier im Zeitraffer) ---
  const SIGNAL_TIME = 7, SIGNAL_HOURS = 5.5;
  function startSignal() { enterExhibit("funk", { update: updateSignal }); runSignal(); }
  function runSignal() {
    const sp = view.special; sp.t = 0; sp.end = false; sp.last = ""; sp.go = false;
    world.beam.visible = world.pulse.visible = false;
    askGuess(cfg.signal.guess, cfg.signal.ready, () => { sp.go = true; sp.t = -0.4; });
  }
  function updateSignal(dt) {
    const c = world.camera, sp = view.special, T = cfg.signal, M = world.signalFrom, h = Math.hypot(SUN_DIR.x, SUN_DIR.z);
    c.position.lerp(tmp.set(M.x - (SUN_DIR.x / h) * 7, M.y + 1, M.z - (SUN_DIR.z / h) * 7), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.copy(M).addScaledVector(SUN_DIR, 16), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (sp.end || !sp.go) return;
    sp.t += dt;
    if (sp.t < 0) return;
    const f = Math.min(1, sp.t / SIGNAL_TIME), far = 880 * f;
    world.beam.visible = world.pulse.visible = true;
    world.pulse.position.copy(M).addScaledVector(SUN_DIR, far);
    world.pulse.scale.setScalar(0.7 + far * 0.03);
    if (f >= 1) {
      sp.end = true; world.pulse.visible = false; Sound.correct();
      scopeSay(guessed(T.end), [[T.again, runSignal], [T.done, endSignal, true]]);
      return;
    }
    const min = Math.floor((f * SIGNAL_HOURS * 60) / 10) * 10, text = `${T.run} ⏱️ ${Math.floor(min / 60)} Std. ${min % 60} Min.`;
    if (text !== sp.last) { sp.last = text; $("scopeText").textContent = text; }
  }
  function endSignal() { world.beam.visible = world.pulse.visible = false; leaveExhibit(); }

  // Anzeigetafel auf einem Mast (z. B. großes Thermometer), von beiden Seiten lesbar: userData.show(text)
  function makeBoard() {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xaab2bd, metalness: 0.6, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), metal); pole.position.y = 1.2; pole.castShadow = true; g.add(pole);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.06), metal); back.position.y = 2.6; back.castShadow = true; g.add(back);
    const cv = document.createElement("canvas"); cv.width = 448; cv.height = 160;
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false });
    for (const r of [0, Math.PI]) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.68), mat); d.position.set(0, 2.6, r ? -0.035 : 0.035); d.rotation.y = r; g.add(d);
    }
    let shown = "";
    g.userData.show = (text) => {
      if (text === shown) return; shown = text;
      const x = cv.getContext("2d");
      x.fillStyle = "#1a0d06"; x.fillRect(0, 0, 448, 160);
      x.fillStyle = "#fb923c"; x.font = "bold 92px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 224, 86);
      tex.needsUpdate = true;
    };
    return g;
  }
  // Globus auf einem Ständer mit einem roten Fähnchen am Äquator (damit man die Drehung sieht)
  function makeGlobe(id) {
    const g = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 1.1, 10), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 }));
    stand.position.y = 0.55; stand.castShadow = true; g.add(stand);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 22), new THREE.MeshStandardMaterial({ map: W.bodies[id].mesh.material.map, roughness: 0.9 }));
    ball.position.y = 1.65; ball.castShadow = true; g.add(ball);
    // gut sichtbares Fähnchen am Äquator: Stab und rotes Wimpel-Tuch
    const pin = new THREE.Group(); pin.position.z = 0.55; ball.add(pin);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.5, roughness: 0.4 }));
    stick.rotation.x = Math.PI / 2; stick.position.z = 0.2; pin.add(stick);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16), new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide, roughness: 0.8 }));
    cloth.rotation.y = Math.PI / 2; cloth.position.set(0, 0.09, 0.3); pin.add(cloth);
    g.userData = { ball };
    return g;
  }

  // =========================================================
  //  Venus
  // =========================================================
  // =========================================================
  //  Venus: Kein Mensch könnte hier wohnen (465 °C, 90-facher Druck). Unten steht darum nur ein gepanzerter Roboter-Außenposten
  //  aus dicken Druckkugeln – wie bei den echten Venera-Sonden. Die Menschen wohnen hoch oben in den Wolken in einem Luftschiff
  //  (so plant es die NASA-Idee „HAVOC“): Dort, 50 Kilometer hoch, ist es angenehm warm. Ein Wind-Rover (NASA-Idee „AREE“) fährt herum.
  // =========================================================
  // Dunkles Metall mit Nietenreihen
  let rivetTexCache = null;
  function rivetTex() {
    if (rivetTexCache) return rivetTexCache;
    const t = canvasTex(256, 256, (c) => {
      c.fillStyle = "#7d6a55"; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) { c.fillStyle = `rgba(0,0,0,${0.05 + (i % 2) * 0.06})`; c.fillRect(0, i * 64, 256, 64); }
      c.strokeStyle = "rgba(30,20,10,0.5)"; c.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(0, i * 64); c.lineTo(256, i * 64); c.stroke(); }
      c.fillStyle = "rgba(230,210,180,0.55)";
      for (let i = 0; i < 16; i++) for (let j = 0; j <= 4; j++) { c.beginPath(); c.arc(i * 16 + 8, j * 64 + (j ? -6 : 6), 2.4, 0, 7); c.fill(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; rivetTexCache = t;
    return t;
  }
  function venusMetal(M, rx = 6, ry = 3) { const t = rivetTex().clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return M.std({ map: t, roughness: 0.55, metalness: 0.55 }); }
  // Druckkugel auf kurzen Beinen mit kleinen, dicken Fenstern und einem Namensring (lokal: vorn = +Z)
  function venusSphere(g, M, x, z, r, face, label) {
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = face; g.add(s);
    const ball = put(s, new THREE.Mesh(new THREE.SphereGeometry(r, 40, 24), venusMetal(M, 8, 4)), 0, r + 0.8, 0); ball.receiveShadow = true;
    put(s, new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.18, 10, 48), M.orange), 0, r + 0.8, 0, false).rotation.x = Math.PI / 2;
    put(s, new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.12, 10, 40), M.teal), 0, r * 1.69 + 0.8, 0, false).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; pipeSeg(s, M, new V(Math.sin(a) * r * 0.6, r * 0.5 + 0.8, Math.cos(a) * r * 0.6), new V(Math.sin(a) * r * 0.95, 0.1, Math.cos(a) * r * 0.95), 0.2, M.metal); }
    for (const a of [-0.5, 0.5]) { // kleine, dicke Bullaugen
      const px = Math.sin(a) * r * Math.cos(0.25), pz = Math.cos(a) * r * Math.cos(0.25), py = r + 0.8 + r * Math.sin(0.25);
      const w = put(s, new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), M.glow), px * 1.003, py, pz * 1.003, false); w.lookAt(px * 2, py + r * Math.sin(0.25), pz * 2);
      const ring = put(s, new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 8, 20), M.metal), px, py, pz, false); ring.lookAt(px * 2, py + r * Math.sin(0.25), pz * 2);
    }
    // Schleuse vorn: kurzer, dicker Stutzen mit Luke
    const hatch = put(s, new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 1.4, 24), venusMetal(M, 3, 1)), 0, 1.3, r - 0.2); hatch.rotation.x = Math.PI / 2;
    put(s, new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.16, 10, 24), M.orange), 0, 1.3, r + 0.5);
    put(s, new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), M.metal), 0, 1.3, r + 0.52, false);
    put(s, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.42), signMat(label, "#7c2d12", 600, 114, 54)), 0, 2.75, r + 0.3, false);
    return s;
  }
  // Wärmetauscher: Rippenplatten, die dunkelrot glühen
  function venusRadiator(M) {
    const g = new THREE.Group(), hot = new THREE.MeshStandardMaterial({ color: srgb(0x3a1a0a), emissive: srgb(0xff5a1a), emissiveIntensity: 0.35, roughness: 0.6 });
    for (let i = 0; i < 5; i++) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 2.4), hot), (i - 2) * 0.55, 1.4, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 0.3), venusMetal(M, 2, 1)), 0, 0.2, 0);
    return g;
  }
  // Luftschiff (Wolkenstation): langer Rumpf, Gondel, Leitwerk, Propeller
  function venusAirship(M) {
    const g = new THREE.Group(), skin = M.std({ color: srgb(0xe7e0d2), roughness: 0.6 });
    const hull = put(g, new THREE.Mesh(new THREE.SphereGeometry(10, 36, 18), skin), 0, 0, 0, false); hull.scale.set(1, 1, 4);
    for (const [x, y, rz] of [[0, 6.5, 0], [0, -6.5, 0], [6.5, 0, Math.PI / 2], [-6.5, 0, Math.PI / 2]]) {
      const fin = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 9), M.orange), x, y, -32, false); fin.rotation.z = rz;
    }
    put(g, new THREE.Mesh(new THREE.BoxGeometry(4, 3, 12), M.hull(2, 2)), 0, -11, 4, false);
    for (let i = 0; i < 5; i++) put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), M.glow), 2.02, -10.8, -0.5 + i * 2.2, false).rotation.y = Math.PI / 2;
    const props = [];
    for (const x of [-7, 7]) { const p = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), M.metal), x, -5, -20, false); props.push(p); }
    for (let i = 0; i < 7; i++) { const z = -27 + i * 9; put(g, new THREE.Mesh(new THREE.TorusGeometry(10.05 * Math.sqrt(1 - (z / 40) ** 2), 0.25, 6, 40), M.teal), 0, 0, z, false); }
    g.userData.props = props;
    return g;
  }
  // Wind-Rover (NASA-Idee AREE): ohne Elektronik, angetrieben von einem Windrad – der Wind auf der Venus ist langsam, aber kräftig
  function venusWindRover(M) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2.6), venusMetal(M, 2, 1)), 0, 1.1, 0);
    for (const x of [-1.15, 1.15]) for (const z of [-0.9, 0.9]) { const w = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.35, 16), M.metal), x, 0.6, z); w.rotation.z = Math.PI / 2; }
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), M.steel), 0, 2.2, 0);
    const turbine = new THREE.Group(); turbine.position.y = 3.3; g.add(turbine);
    for (let i = 0; i < 3; i++) { const b = put(turbine, new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 16, 1, true, 0, Math.PI), M.std({ color: srgb(0xd4a373), roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide })), 0, 0, 0); b.rotation.y = (i / 3) * Math.PI * 2; b.position.set(Math.sin(b.rotation.y) * 0.3, 0, Math.cos(b.rotation.y) * 0.3); }
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), M.orange), 0, 1.6, 1.1);
    g.userData = { turbine, wheels: [] };
    return g;
  }
  // Venera 13: Landering mit Zacken, Druckkugel, Bremsscheibe und Antenne obendrauf
  // Radar-Peiler: Radarschüssel auf einem Dreibein, davor ein Bildschirm mit Radar-Kreisen (vorn = +Z)
  function makeRadarFinder(M) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; pipeSeg(g, M, new V(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7), new V(0, 1.5, 0), 0.04, M.steel); }
    const head = new THREE.Group(); head.position.y = 1.55; g.add(head);
    put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.3, 10), M.metal), 0, 0.12, 0);
    put(head, dishCap(M, 0.6, 0.85), 0, 0.42, 0.1).rotation.x = -1.15;
    const scr = canvasTex(256, 192, (c) => {
      c.fillStyle = "#03140c"; c.fillRect(0, 0, 256, 192);
      c.strokeStyle = "rgba(74,222,128,0.8)"; c.lineWidth = 3;
      for (const r of [24, 52, 80]) { c.beginPath(); c.arc(128, 96, r, 0, 7); c.stroke(); }
      c.beginPath(); c.moveTo(128, 96); c.lineTo(205, 50); c.stroke();
      c.fillStyle = "#bbf7d0"; c.beginPath(); c.arc(170, 70, 6, 0, 7); c.fill();
    });
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.12), M.hull(1, 1)), 0, 1.05, 0.42).rotation.x = -0.4;
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false })), 0, 1.05, 0.49, false).rotation.x = -0.4;
    g.userData.head = head;
    return g;
  }
  function makeVenera(M) {
    const g = new THREE.Group(), tan = M.std({ color: srgb(0xc9a26b), roughness: 0.5, metalness: 0.5 });
    const ring = put(g, new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.22, 10, 24), tan), 0, 0.25, 0); ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; put(g, new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), tan), Math.sin(a) * 1.2, 0.05, Math.cos(a) * 1.2).rotation.x = Math.PI; }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pipeSeg(g, M, new V(Math.sin(a) * 1.15, 0.3, Math.cos(a) * 1.15), new V(Math.sin(a) * 0.5, 1.1, Math.cos(a) * 0.5), 0.05, M.metal); }
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16), tan), 0, 1.6, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.1, 28), tan), 0, 2.45, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.7, 16), tan), 0, 2.85, 0);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), M.metal), 0, 3.3, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.25), M.metal), 0.7, 1.4, 0.4);
    g.rotation.z = 0.08;
    return g;
  }

  function buildVenusCamp(g, add) {
    const M = colonyMats("venus");
    g.userData.anim = [];
    venusSphere(g, M, -12, 13, 4.2, Math.atan2(5, -12), "⚙️ STEUERUNG");
    venusSphere(g, M, 12, 13, 3.6, Math.atan2(-5, -12), "🧪 MESSLABOR");
    venusSphere(g, M, 0, 24, 5, Math.PI + 0.2, "🔋 ENERGIE");
    // dicke Verbindungsrohre von den vorderen Kugeln zur Energie-Kugel (in 2,4 m Höhe, je ein Stück in die Kugeln hinein)
    for (const [a, b] of VENUS_PIPES) pipeSeg(g, M, new V(a[0], 2.4, a[1]), new V(b[0], 2.4, b[1]), 0.9, venusMetal(M, 3, 1));
    for (const [x, z, r] of [[-22, 6, 0.4], [21, 22, -0.5], [-18, 25, 0.9]]) { const rd = venusRadiator(M); rd.position.set(x, 0, z); rd.rotation.y = r; g.add(rd); }
    for (const [x, z] of [[-9.5, 3], [9.5, 3]]) colonyLamp(g, M, x, z);
  }
  const VENUS_PIPES = [[[-9.8, 15], [-2.5, 21.7]], [[10, 14.8], [2.5, 21.7]]]; // [x, z] relativ zur Station
  function venusCampColliders([sx, sz]) {
    const c = [[sx - 12, sz + 13, 4.6], [sx + 12, sz + 13, 4], [sx, sz + 24, 5.4], [sx - 22, sz + 6, 1.6], [sx + 21, sz + 22, 1.6], [sx - 18, sz + 25, 1.6], [sx - 9.5, sz + 3, 0.3], [sx + 9.5, sz + 3, 0.3]];
    for (const [a, b] of VENUS_PIPES) for (const f of [0.3, 0.5, 0.7]) c.push([sx + a[0] + (b[0] - a[0]) * f, sz + a[1] + (b[1] - a[1]) * f, 1.1]);
    for (const [x, z, r, f] of [[-12, 13, 4.2, Math.atan2(5, -12)], [12, 13, 3.6, Math.atan2(-5, -12)]]) c.push([sx + x + Math.sin(f) * (r + 0.6), sz + z + Math.cos(f) * (r + 0.6), 1.2]);
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx + x, sz + 0.1, 1]); // Tafelwand
    return c;
  }

  // Venus: Man sieht kaum etwas – Leitlichter zeigen den Weg durch den Dunst. Er führt an den Messstationen vorbei,
  // über eine Brücke über einen Lavafluss und hinauf auf einen „Pfannkuchen-Vulkan“ (flache, runde Lava-Kuppel), auf dem der Außenposten steht.
  const VENUS_DOME = [-14, 88, 36, 5];
  const VENUS_LAVA_Z = (x) => 50 + Math.sin(x * 0.08) * 3; // Lavafluss quer zur Route
  const VENUS_LAYOUT = {
    spawn: [-6.9, 4], waage: [24, 10], hitze: [28, 30], druck: [16, 40], abendstern: [6, 66],
    venera: [-36, -26], radar: [9, -4], lava: [4, 50], wegweiser: [8, 5], // Venera 13 steht versteckt im Dunst, gesucht wird vom Radar-Peiler aus
    station: [-14, 74], tag: [-20, 67], groesse: [-8, 67], meet: [20, 24],
    route: {
      wegweiser: [[5.5, 2.5]], venera: [[5.2, 0.2]], waage: [[24, -2], [27.5, 6]], hitze: [[18, 6], [30, 18], [31.5, 26]],
      druck: [[26, 38], [19.5, 43]], lava: [[8, 46], [4, 46.5]], abendstern: [[4, 54], [3.5, 61.5]],
      tag: [[-6, 62], [-14, 61.5]], groesse: [[-6, 62.5]], wand: [[-11, 69]], rakete: [[4, 60], [4, 46], [12, 30], [4, 8], [-4, 5]]
    }
  };
  function venusDome(x, z) { return VENUS_DOME[3] * smooth(VENUS_DOME[2], VENUS_DOME[2] - 8, Math.hypot(x - VENUS_DOME[0], z - VENUS_DOME[1])) - 1.1 * smooth(4, 1.5, Math.abs(z - VENUS_LAVA_Z(x))) * smooth(48, 40, Math.abs(x)); } // Lava fließt in einer Rinne
  const VENUS_SKY = new THREE.Color(0xd9a441), VENUS_CLEAR = new THREE.Color(0x05070f);
  const VENUS_EARTH_DIR = new V(0.35, 0.55, 0.75).normalize();
  function buildVenus() {
    const L = { ...VENUS_LAYOUT };
    const craters = [[70, 30, 14, 1.2], [-80, -50, 18, 1.6], [50, -80, 12, 1.2], [-70, 80, 12, 1]];
    const flats = [[0, 0, 11], [...L.station, 20, VENUS_DOME[3]], [L.station[0], L.station[1] + 16, 22, VENUS_DOME[3]], [...L.waage, 3], [...L.hitze, 5], [...L.druck, 5], [...L.abendstern, 6, VENUS_DOME[3], 4], [...L.venera, 4], [...L.radar, 3], [L.lava[0], 50, 9, 0, 6]];
    const B = buildBase({
      height: makeHeight(craters, flats, 160, venusDome),
      // dichte, giftige Wolken: gelb-oranger Dunst, man sieht kaum 100 Meter weit, die Sonne ist nur ein heller Schein
      sky: VENUS_SKY.getHex(), fog: [18, 190], stars: false, sunSize: 190,
      ground: 0x8a6a48, rock: 0x5a4632,
      tint: (x, z) => { const m = 0.6 + 0.35 * fbm2(x * 0.03 + 4, z * 0.03); return [m, m * 0.92, m * 0.8]; },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [...L.waage, 4], [...L.hitze, 4], [...L.druck, 4], [...L.abendstern, 4],
        [...L.venera, 3], [...L.radar, 3], [...L.lava, 5], [...L.wegweiser, 3], [L.lava[0] - 20, 50, 12], [L.lava[0] + 20, 50, 12]],
      ambient: [0xffc070, 0.75], hemi: [0xffd28a, 0x5a3a1a, 0.4], sun: [0xffe2b0, 0.5],
      dust: ["rgba(200,160,100,1)", "rgba(170,130,80,0.9)"]
    });
    const { scene, on, rocket, height } = B;
    const common = addCommon(B, L, "Venus-Außenposten", "venus");
    const M = colonyMats("venus");

    // Großes Thermometer (Treibhaus-Versuch), schaut zur Sonne hin
    const board = on(makeBoard(), ...L.hitze);
    board.rotation.y = Math.atan2(-SUN_DIR.x, -SUN_DIR.z);
    { // Klima-Messturm um das Thermometer
      const [hx, hz] = L.hitze, t = new THREE.Group(); on(t, hx, hz); t.rotation.y = board.rotation.y;
      for (const [x, z] of [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]]) pipeSeg(t, M, new V(x, 0, z), new V(x * 0.6, 3.6, z * 0.6), 0.06, M.orange);
      put(t, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.1), venusMetal(M, 2, 1)), 0, 3.6, 0);
      put(t, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), M.hull(1, 1)), 0.5, 3.95, 0);
      put(t, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), M.steel), -0.5, 4.2, 0);
      on(makeSignBoard(M, "🌡️ KLIMA-MESSTURM", "#7c2d12", 2.6), hx + 2.4, hz - 1.4).rotation.y = Math.atan2(-hx, -hz);
    }
    // Druck-Versuch: Blechdose unter einer Schutzglocke
    const press = on(makeTable(), ...L.druck);
    const labelTex = canvasTex(256, 128, (c) => { // Etikett einer Konservendose
      c.fillStyle = "#dc2626"; c.fillRect(0, 0, 256, 128); c.fillStyle = "#fef3c7"; c.fillRect(0, 34, 256, 60);
      c.fillStyle = "#b91c1c"; c.font = "bold 40px sans-serif"; c.textAlign = "center"; c.fillText("BOHNEN", 128, 78);
      c.fillStyle = "#fbbf24"; for (let x = 0; x < 256; x += 32) c.fillRect(x, 106, 16, 8);
    });
    const canSide = new THREE.MeshStandardMaterial({ map: labelTex, metalness: 0.3, roughness: 0.45 }), canTop = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.25 });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 24), [canSide, canTop, canTop]);
    can.position.y = 1.2; press.add(can);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide }));
    dome.position.y = 1.03; press.add(dome);
    { // Druck-Prüfstand: schwerer Stahlrahmen mit Druckanzeige
      const steel = venusMetal(M, 1, 2);
      for (const [x, z] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]]) put(press, new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.3, 0.16), steel), x, 1.15, z);
      for (const z of [-0.6, 0.6]) put(press, new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 0.2), M.orange), 0, 2.3, z);
      put(press, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24), M.hull(1, 1)), 0, 2.3, 0.72).rotation.x = Math.PI / 2;
      put(press, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.36), signMat("🥫 DRUCK-PRÜFSTAND · 92 bar", "#7c2d12", 720, 144, 56)), 0, 2.7, 0.62, false);
    }
    // Spezial-Fernrohr, das durch die Wolken schaut: die Erde als blauer Punkt, daneben winzig der Mond
    const telescope = on(makeTelescope(VENUS_EARTH_DIR), ...L.abendstern);
    // Spezial-Fernrohr mit Radar daneben: Radar und Infrarot schauen durch die dichten Wolken (so hat die Sonde Magellan die Venus kartiert)
    const [sx2, sz2] = L.abendstern, radar = new THREE.Group(); on(radar, sx2 + 3.2, sz2 + 1.5);
    put(radar, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.8, 12), venusMetal(M, 1, 1)), 0, 0.9, 0);
    const radarHead = new THREE.Group(); radarHead.position.y = 2; radar.add(radarHead);
    const radarDish = put(radarHead, dishCap(M, 1.4, 0.9), 0, 1.1, 0.4);
    radarDish.rotation.x = -2.2;
    on(makeSignBoard(M, "📡 RADAR & INFRAROT", "#0f766e", 2.6), sx2 - 2.6, sz2 - 1.8).rotation.y = Math.atan2(-sx2, -sz2);
    const dot = (inner, outer, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(inner, outer), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })); s.scale.setScalar(size); s.visible = false; scene.add(s); return s; };
    const earthStar = dot("rgba(200,225,255,1)", "rgba(80,150,255,0.7)", 14), moonStar = dot("rgba(255,255,255,1)", "rgba(200,200,200,0.5)", 4);
    earthStar.position.copy(VENUS_EARTH_DIR).multiplyScalar(900);
    moonStar.position.copy(earthStar.position).addScaledVector(new V().crossVectors(VENUS_EARTH_DIR, new V(0, 1, 0)).normalize(), 12);

    on(makeVenera(M), ...L.venera).rotation.y = 0.9;
    const finder = on(makeRadarFinder(M), ...L.radar); // Radar-Peiler: Startpunkt der Suche
    finder.rotation.y = Math.atan2(L.spawn[0] - L.radar[0], L.spawn[1] - L.radar[1]);
    on(makeSignBoard(M, "📡 RADAR-PEILER", "#0f766e", 2.4), L.radar[0] + 2.2, L.radar[1] + 1.4).rotation.y = Math.atan2(L.spawn[0] - L.radar[0] - 2.2, L.spawn[1] - L.radar[1] - 1.4);
    const vp = on(makePlaque(M, [["VENERA 13", 52], ["1982", 40], ["funkte 2 Stunden lang", 30], ["Fotos zur Erde", 30]]), L.venera[0] + 2.6, L.venera[1] + 2.2);
    vp.rotation.y = Math.atan2(-vp.position.x, -vp.position.z);
    // Lava-Spalte: glühende Risse im dunklen Gestein
    // Lavafluss quer zum Weg – glühende Bahn mit dunkler Kruste, darüber eine Metallbrücke
    const lavaTex = canvasTex(256, 64, (c) => { c.fillStyle = "#ff6a1a"; c.fillRect(0, 0, 256, 64); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(60,20,5,${0.4 + hash2(i, 1) * 0.5})`; c.beginPath(); c.ellipse(hash2(i, 2) * 256, hash2(i, 3) * 64, 6 + hash2(i, 4) * 18, 3 + hash2(i, 5) * 6, 0, 0, 7); c.fill(); } c.fillStyle = "rgba(255,230,120,0.6)"; for (let i = 0; i < 30; i++) c.fillRect(hash2(i, 6) * 256, hash2(i, 7) * 64, 10, 2); });
    lavaTex.wrapS = THREE.RepeatWrapping; lavaTex.repeat.set(8, 1);
    const lavaPts = []; for (let x = -46; x <= 40; x += 2) lavaPts.push([x, VENUS_LAVA_Z(x)]);
    const lavaRiver = makePath(B, lavaPts, 3.4); lavaRiver.material = new THREE.MeshBasicMaterial({ map: lavaTex, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const bridge = new THREE.Group(); on(bridge, L.lava[0], VENUS_LAVA_Z(L.lava[0]), 0.35);
    put(bridge, new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 6), venusMetal(M, 1, 2)), 0, 0, 0);
    for (const s of [-1.25, 1.25]) { put(bridge, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 6), M.orange), s, 0.5, 0); }
    on(makeSignBoard(M, "⚠️ LAVA – NUR ÜBER DIE BRÜCKE!", "#b91c1c", 3.2), L.lava[0] + 4.5, VENUS_LAVA_Z(L.lava[0]) - 4).rotation.y = Math.atan2(-L.lava[0], -L.lava[1]);
    // Leitlichter: alle 7 Meter ein Pfosten mit Lampe links vom Weg – im dichten Dunst sieht man sonst den Weg nicht
    const beacons = [], tour = [[L.spawn[0] + 2, L.spawn[1] + 2]];
    for (const k of [...cfg.guide.order, "wand"]) for (const p of (L.route[k] || [])) tour.push(p);
    const lampMat = new THREE.MeshBasicMaterial({ color: srgb(0xffd28a), toneMapped: false, fog: false });
    let acc = 0;
    for (let i = 0; i < tour.length - 1; i++) {
      const [ax, az] = tour[i], [bx, bz] = tour[i + 1], len = Math.hypot(bx - ax, bz - az);
      for (let s = 7 - acc; s < len; s += 7) {
        const f = s / len, x = ax + (bx - ax) * f + ((bz - az) / len) * 1.7, z = az + (bz - az) * f - ((bx - ax) / len) * 1.7;
        const b = on(new THREE.Group(), x, z);
        put(b, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6), M.metal), 0, 0.6, 0);
        beacons.push(put(b, new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), lampMat), 0, 1.25, 0, false));
        acc = len - s;
      }
      if (len < 7 - acc) acc += len;
    }
    const lavaCol = []; for (let x = -46; x <= 40; x += 2.6) if (Math.abs(x - L.lava[0]) > 1.6) lavaCol.push([x, VENUS_LAVA_Z(x), 1.5]);
    // Vulkan in der Ferne (auf der Venus gibt es Tausende)
    const cone = makeVenusVolcano(85, 42); cone.material.fog = true;
    cone.position.set(L.lava[0] - 110, height(L.lava[0] - 110, L.lava[1] - 90) - 2, L.lava[1] - 90); scene.add(cone);
    const lavaGlow = new THREE.PointLight(0xff6a1a, 1.2, 12, 1.5); lavaGlow.position.set(L.lava[0], height(...L.lava) + 1, L.lava[1]); scene.add(lavaGlow);
    const board2 = on(makeInfoBoard(M, "VENUS-AUSSENPOSTEN", ["☀️ Sonne: 108 Mio. km", "🌍 Erde: 38 – 261 Mio. km", "🌡️ 465 °C · 92-facher Druck"]), ...L.wegweiser);
    board2.rotation.y = Math.atan2(L.spawn[0] - L.wegweiser[0], L.spawn[1] - L.wegweiser[1]);
    // Wolkenstation: Luftschiff hoch oben im Dunst – und ein Wind-Rover, der langsam seine Runden dreht
    const ship = venusAirship(M); ship.scale.setScalar(2.2); scene.add(ship);
    // im dichten Dunst sieht man nur einen dunklen Umriss mit leuchtenden Fenstern
    const ghost = new THREE.MeshBasicMaterial({ color: 0x8a5a24, transparent: true, opacity: 0.45, fog: false, depthWrite: false });
    ship.traverse((o) => { if (o.isMesh) o.material = o.material === M.glow ? new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.8, fog: false }) : ghost; });
    const windRover = on(venusWindRover(M), 44, -8);
    drawTour(B, L, [120, 96, 70], 1.8);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95, vertexColors: true }); rockMat.userData.natural = true;
    const clusters = [[-30, 10, 5], [46, 34, 5], [-12, -24, 4], [30, -24, 4], [-40, 32, 5]];
    clusters.forEach(([x, z, n], i) => rockCluster(B, x, z, n, rockMat, i * 23 + 7));
    const anim = [(dt, t) => { // Luftschiff zieht einen großen Kreis, Propeller drehen sich
      const a = t * 0.015 + 1.2; ship.position.set(Math.cos(a) * 130, 52, 40 + Math.sin(a) * 130); ship.rotation.y = -a + Math.PI;
      for (const p of ship.userData.props) p.rotation.z += dt * 6;
    }, (dt, t) => { // Wind-Rover fährt langsam im Kreis, sein Windrad dreht sich; die Lava flackert
      const a = t * 0.03, x = 44 + Math.cos(a) * 9, z = -8 + Math.sin(a) * 7;
      beacons.forEach((b, i) => { b.scale.setScalar(0.8 + 0.4 * Math.max(0, Math.sin(t * 3 - i * 0.6))); }); // Lauflicht zeigt die Richtung
      windRover.position.set(x, height(x, z), z); windRover.rotation.y = Math.atan2(-Math.sin(a) * 9, Math.cos(a) * 7);
      windRover.userData.turbine.rotation.y += dt * 1.6;
      lavaGlow.intensity = 1 + 0.4 * Math.sin(t * 3.1) * Math.sin(t * 1.7);
    }];
    // Dreh-Vergleich: Erde und Venus als Globen nebeneinander
    const globes = new THREE.Group(), gE = makeGlobe("erde"), gV = makeGlobe("venus");
    gE.position.x = 0.9; gV.position.x = -0.9; globes.add(gE, gV);
    on(globes, ...L.tag);
    const { rack, cols: rackCols } = placeSizeRack(B, ["mond", "venus", "erde"], L.station);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, hitze: L.hitze, druck: L.druck, tag: L.tag, groesse: L.groesse, abendstern: L.abendstern,
      venera: L.radar, lava: L.lava, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] }, { venera: [-2, 1] }); // Kreis vor dem Bildschirm des Peilers
    const npcs = addNpcs(B);
    const colliders = [...common.colliders, [...L.hitze, 1.3], [...L.druck, 1.2], [...L.abendstern, 0.6], [L.abendstern[0] + 3.2, L.abendstern[1] + 1.5, 0.6], [...L.venera, 1.4], [...L.radar, 0.6], [...L.wegweiser, 0.3],
      [...L.tag, 1.5], ...rackCols, ...clusters.filter((c) => c[2] >= 5).map(([x, z]) => [x, z, 1.2]),
      ...lavaCol, ...npcs.map((n) => n.col)];

    return { ...B, ...common, L, board, press, can, dome, telescope, earthStar, moonStar, globeE: gE.userData.ball, globeV: gV.userData.ball, rack, npcs,
      blink: common.station.userData.blink, anim, spin: [[radarHead, "y", 0.25], [finder.userData.head, "y", 1.1]], stations, colliders, shadowCasters: [rocket, common.station] };
  }
  // c = 0: dichte Wolken (so ist die Venus wirklich) … c = 1: Wolken weg – klarer Himmel, die Wärme kann entweichen
  function venusSky(c) {
    const w = world;
    w.scene.background.copy(VENUS_SKY).lerp(VENUS_CLEAR, c);
    w.scene.fog.color.copy(w.scene.background);
    w.scene.fog.near = 18 + c * 400; w.scene.fog.far = 190 + c * 2600;
    w.sunGlow.visible = c > 0.35; w.stars.visible = c > 0.6;
    w.earthStar.visible = w.moonStar.visible = c > 0.6;
    w.ambient.intensity = 0.75 - 0.5 * c; w.hemi.intensity = 0.4 - 0.3 * c;
    w.sun.intensity = 0.5 + 1.5 * c;
    w.board.userData.show(`${Math.round((465 - 415 * c) / 5) * 5} °C`);
  }
  // --- Treibhaus: Wolken wegschieben und zusehen, wie die Temperatur fällt ---
  function startHeat() {
    enterExhibit("hitze", { update: updateHeat, c: 0, clear: false, tried: 0 });
    askGuess(cfg.heat.guess, cfg.heat.intro, () => setClouds(false));
  }
  function setClouds(on) {
    const sp = view.special, T = cfg.heat;
    sp.clear = !on;
    if (!on) sp.tried = 1; else if (sp.tried) sp.tried = 2;
    Sound.whoosh();
    if (!on) scopeSay(guessed(T.offText), [[T.on, () => setClouds(true), true]]);
    else scopeSay(T.onText, [[T.off, () => setClouds(false)], [T.done, () => { venusSky(0); leaveExhibit(); }, true]]);
  }
  function updateHeat(dt) {
    const c = world.camera, sp = view.special, p = world.board.position, h = Math.hypot(SUN_DIR.x, SUN_DIR.z), dx = SUN_DIR.x / h, dz = SUN_DIR.z / h;
    c.position.lerp(tmp.set(p.x - dx * 6.5, p.y + 2.6, p.z - dz * 6.5), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(p.x + dx * 30, p.y + 9, p.z + dz * 30), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    sp.c += ((sp.clear ? 1 : 0) - sp.c) * Math.min(1, dt * 1.4);
    venusSky(sp.c);
  }
  // --- Druck: Blechdose unter der Schutzglocke, Glocke auf → Dose wird zerquetscht ---
  function resetCan() { world.can.scale.set(1, 1, 1); world.can.position.y = 1.2; world.dome.position.y = 1.03; }
  function startPress() {
    enterExhibit("druck", { update: updatePress, t: 0, run: false });
    world.astronaut.visible = false; resetCan();
    askGuess(cfg.press.guess, cfg.press.ready, runPress);
  }
  function runPress() { const sp = view.special; sp.t = 0; sp.run = true; sp.hit = false; resetCan(); scopeSay(cfg.press.running); }
  function updatePress(dt) {
    const c = world.camera, sp = view.special, p = world.press.position;
    c.position.lerp(tmp.set(p.x + 0.8, p.y + 1.7, p.z - 2.3), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(p.x, p.y + 1.25, p.z), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (!sp.run) return;
    sp.t += dt;
    world.dome.position.y = 1.03 + smooth(0, 1, sp.t) * 0.9; // Glocke hebt sich
    const k = smooth(1.1, 1.35, sp.t);                      // … und die Dose gibt schlagartig nach
    world.can.scale.set(1 + 0.25 * k, 1 - 0.78 * k, 1 + 0.25 * k); world.can.position.y = 1.2 - 0.13 * k;
    if (k > 0.5 && !sp.hit) { sp.hit = true; Sound.land(); }
    if (sp.t > 2.4) { sp.run = false; Sound.correct(); scopeSay(guessed(cfg.press.end), [[cfg.press.again, runPress], [cfg.press.done, endHidden, true]]); }
  }
  // --- Dreh-Vergleich: 10 Erdtage lang drehen sich beide Globen ---
  const SPIN_TIME = 12, SPIN_DAYS = 10;
  function startSpin() {
    enterExhibit("tag", { update: updateSpin, t: 0, run: false, last: "" });
    world.astronaut.visible = false;
    askGuess(cfg.spin.guess, cfg.spin.ready, runSpin);
  }
  function runSpin() { const sp = view.special; sp.t = 0; sp.run = true; sp.last = ""; scopeSay(""); }
  function updateSpin(dt) {
    const c = world.camera, sp = view.special, [x, z] = world.L.tag, y = world.height(x, z), T = cfg.spin;
    c.position.lerp(tmp.set(x, y + 2.1, z - 4.4), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(x, y + 1.6, z), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (!sp.run) return;
    sp.t += dt;
    const f = Math.min(1, sp.t / SPIN_TIME), days = f * SPIN_DAYS;
    world.globeE.rotation.y = days * Math.PI * 2;            // Erde: eine Drehung pro Tag
    world.globeV.rotation.y = -(days / 243) * Math.PI * 2;   // Venus: 243 Tage für eine Drehung – und andersherum
    if (f >= 1) { sp.run = false; Sound.correct(); scopeSay(guessed(T.end), [[T.again, runSpin], [T.done, endHidden, true]]); return; }
    const text = fmtVars(T.run, { erde: Math.floor(days) });
    if (text !== sp.last) { sp.last = text; $("scopeText").textContent = text; }
  }
  function startEveningStar() {
    const T = cfg.eveningStar, w = world;
    venusSky(1); // das Spezial-Fernrohr schaut durch die Wolken
    startTour("abendstern", T, [{ pos: w.earthStar.position, fov: 5, text: T.found }], { end: () => venusSky(0) });
  }

  // =========================================================
  //  Erde
  // =========================================================
  // =========================================================
  //  Erde: Raumfahrt-Besucherzentrum im Grünen – Holz, Glas und ein Gründach, eine Volkssternwarte mit Schiebedach,
  //  eine echte Wetterstation (weiße Wetterhütte, Wetterballon), eine Meteoriten-Vitrine, ein Park mit Sonnenuhr,
  //  ein Steg am See mit Enten, Windräder am Horizont und Vögel am Himmel
  // =========================================================
  let woodTexCache = null;
  function woodTex() {
    if (woodTexCache) return woodTexCache;
    const t = canvasTex(256, 256, (c) => {
      c.fillStyle = "#b07a45"; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 16; i++) { c.fillStyle = `rgba(${i % 2 ? 90 : 200},${i % 2 ? 55 : 150},${i % 2 ? 25 : 90},${0.12 + hash2(i, 1) * 0.12})`; c.fillRect(i * 16, 0, 16, 256); }
      c.strokeStyle = "rgba(60,35,15,0.45)"; c.lineWidth = 2;
      for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16, 256); c.stroke(); }
      for (let k = 0; k < 40; k++) { c.strokeStyle = "rgba(80,45,20,0.18)"; c.beginPath(); const x = hash2(k, 2) * 256; c.moveTo(x, hash2(k, 3) * 256); c.lineTo(x + 2, hash2(k, 3) * 256 + 30); c.stroke(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; woodTexCache = t;
    return t;
  }
  function wood(M, rx, ry) { const t = woodTex().clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return M.std({ map: t, roughness: 0.8, envMapIntensity: 0.4 }); }
  // Besucherzentrum: langer Holzbau mit Glasfront und Gründach (lokal: Glasfront nach −Z, zum Platz)
  function earthVisitorCenter(g, M, x, z, w, d, h) {
    const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b);
    put(b, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood(M, w / 4, h / 4)), 0, h / 2, 0).receiveShadow = true;
    const glass = M.std({ color: srgb(0x9fc9e8), roughness: 0.05, metalness: 0.6, envMapIntensity: 1.4 });
    for (let i = 0; i < 5; i++) put(b, new THREE.Mesh(new THREE.PlaneGeometry(w / 5 - 0.6, h - 1.1), glass), -w / 2 + (i + 0.5) * (w / 5), h / 2 - 0.1, -d / 2 - 0.02, false).rotation.y = Math.PI;
    for (let i = 0; i <= 5; i++) put(b, new THREE.Mesh(new THREE.BoxGeometry(0.18, h - 0.9, 0.2), M.metal), -w / 2 + i * (w / 5), h / 2 - 0.1, -d / 2 - 0.08);
    put(b, new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.35, d + 1.2), M.hull(4, 1)), 0, h + 0.15, 0);
    const grass = put(b, new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), new THREE.MeshStandardMaterial({ color: srgb(0x4f9d3f), roughness: 1 })), 0, h + 0.45, 0, false);
    for (let i = 0; i < 18; i++) put(b, new THREE.Mesh(new THREE.SphereGeometry(0.35 + hash2(i, 1) * 0.3, 8, 6), new THREE.MeshStandardMaterial({ color: srgb(i % 3 ? 0x3f8f35 : 0x65b04a), roughness: 1 })), (hash2(i, 2) - 0.5) * w, h + 0.6, (hash2(i, 3) - 0.5) * d, false);
    // Solarzellen auf dem Dach, Vordach am Eingang
    for (let i = 0; i < 3; i++) { const p = put(b, new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.4), marsCellMat(M)), -w / 3 + i * 3, h + 1.1, d / 4); p.rotation.x = -0.5; }
    put(b, new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 2.6), M.hull(2, 1)), w / 2 - 3.5, h - 0.4, -d / 2 - 1.3);
    for (const s of [-1, 1]) put(b, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h - 0.5, 8), M.steel), w / 2 - 3.5 + s * 2.2, (h - 0.5) / 2, -d / 2 - 2.4);
    put(b, new THREE.Mesh(new THREE.PlaneGeometry(6, 0.7), signMat("🚀 RAUMFAHRT-BESUCHERZENTRUM", "#2563eb", 1024, 120, 60)), 0, h - 0.2, -d / 2 - 0.12, false).rotation.y = Math.PI;
    return b;
  }
  // Fahnenmast mit Fahne, die leicht weht
  function earthFlag(M, color) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 6, 8), M.steel), 0, 3, 0);
    const cloth = put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1, 10, 1), new THREE.MeshStandardMaterial({ color: srgb(color), side: THREE.DoubleSide, roughness: 0.8 })), 0.92, 5.3, 0, false);
    g.userData.cloth = cloth;
    return g;
  }
  // Volkssternwarte mit Schiebedach: niedrige Hütte, das Dach rollt zum Beobachten auf Schienen zur Seite (lokal: Tür nach +Z)
  function earthRollRoof(M) {
    const g = new THREE.Group(), W2 = 2.4, D2 = 2.2, H = 1.4;
    for (const [x, z, w, d] of [[0, -D2, W2 * 2, 0.2], [-W2, 0, 0.2, D2 * 2], [W2, 0, 0.2, D2 * 2], [-1.5, D2, 1.8, 0.2], [1.5, D2, 1.8, 0.2]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wood(M, 2, 1)), x, H / 2, z);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(W2 * 2, 0.05, D2 * 2), M.std({ color: srgb(0x8b8f96), roughness: 0.9 })), 0, 0.03, 0, false);
    for (const z of [-D2 - 0.1, D2 + 0.1]) { put(g, new THREE.Mesh(new THREE.BoxGeometry(W2 * 4.2, 0.12, 0.12), M.steel), W2 * 1.1, H + 0.05, z); for (const x of [W2 * 1.7, W2 * 3.1]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.15, H, 0.15), M.steel), x, H / 2, z); }
    const roof = new THREE.Group(); roof.position.y = H + 0.1; g.add(roof);
    const r1 = put(roof, new THREE.Mesh(new THREE.BoxGeometry(W2 * 2 + 0.4, 0.2, D2 * 2 + 0.4), M.hull(3, 2)), 0, 0.5, 0);
    for (const s of [-1, 1]) { const p = put(roof, new THREE.Mesh(new THREE.BoxGeometry(W2 * 2 + 0.4, 0.14, D2 * 1.2), M.orange), 0, 0.85, s * D2 * 0.52); p.rotation.x = -s * 0.5; }
    put(roof, new THREE.Mesh(new THREE.BoxGeometry(W2 * 2 + 0.4, 0.6, D2 * 2 + 0.4), wood(M, 2, 1)), 0, 0.15, 0);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), signMat("🔭 VOLKSSTERNWARTE", "#16a34a", 600, 112, 50)), 0, 1.0, D2 + 0.11, false);
    g.userData = { roof, open: 0, target: 0, set(k) { roof.position.x = k * W2 * 2.1; } };
    return g;
  }
  // Wetterhütte (weiß, mit Lamellen) auf vier Beinen, daneben ein Windmesser – und ein Wetterballon, der immer wieder aufsteigt
  function earthWeather(M) {
    const g = new THREE.Group(), white = M.std({ color: srgb(0xfafafa), roughness: 0.6 });
    for (const [x, z] of [[-0.45, -0.35], [0.45, -0.35], [-0.45, 0.35], [0.45, 0.35]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), white), x, 0.6, z);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.9), white), 0, 1.6, 0);
    for (let i = 0; i < 6; i++) put(g, new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.04, 0.04), M.std({ color: srgb(0xd4d4d4) })), 0, 1.25 + i * 0.13, -0.46, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.1), white), 0, 2.1, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 14), M.steel), 1.4, 0.85, 0.3); // Regenmesser
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), M.steel), 1.4, 0.3, 0.3);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 4, 8), M.steel), -1.4, 2, 0);
    const cups = new THREE.Group(); cups.position.set(-1.4, 4.05, 0); g.add(cups);
    for (let i = 0; i < 3; i++) { const arm = new THREE.Group(); arm.rotation.y = (i / 3) * Math.PI * 2; cups.add(arm); put(arm, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.02), M.steel), 0.2, 0, 0, false); put(arm, new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.orange), 0.4, 0, 0, false).rotation.x = Math.PI / 2; }
    const balloon = new THREE.Group(); g.add(balloon);
    put(balloon, new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 14), M.std({ color: srgb(0xf8fafc), roughness: 0.3 })), 0, 0, 0, false);
    put(balloon, new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2, 4), M.metal), 0, -1.6, 0, false);
    put(balloon, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.15), M.orange), 0, -2.7, 0, false);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.34), signMat("🌦️ WETTERSTATION", "#2563eb", 520, 98, 46)), 0, 2.5, -0.46, false).rotation.y = Math.PI;
    g.userData = { cups, balloon };
    return g;
  }
  // Meteoriten-Vitrine: Glaskasten auf einem Sockel, darin ein echter Brocken aus dem All
  function earthMeteorCase(M) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), wood(M, 1, 1)), 0, 0.5, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.1), M.std({ color: srgb(0xdbeafe), transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.4, envMapIntensity: 1.5, depthWrite: false })), 0, 1.45, 0, false);
    const rock = put(g, new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 1), M.std({ color: srgb(0x3a3430), roughness: 0.6, metalness: 0.5, flatShading: true })), 0, 1.3, 0);
    rock.scale.set(1, 0.75, 0.85);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(1, 0.3), signMat("☄️ METEORIT", "#16a34a", 360, 108, 56)), 0, 0.7, -0.61, false).rotation.y = Math.PI;
    return g;
  }
  // Parkbank
  function earthBench(M) {
    const g = new THREE.Group(), w = wood(M, 1, 0.3);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), w), 0, 0.48, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.06), w), 0, 0.8, 0.24);
    for (const x of [-0.8, 0.8]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.5), M.metal), x, 0.24, 0);
    return g;
  }
  // Windrad mit drei Flügeln (dreht sich)
  function earthTurbine(M, h) {
    const g = new THREE.Group(), white = M.std({ color: srgb(0xf5f5f5), roughness: 0.5 });
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, h, 16), white), 0, h / 2, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(2, 2, 5), white), 0, h, 0.8);
    const rotor = new THREE.Group(); rotor.position.set(0, h, -1.9); g.add(rotor);
    for (let i = 0; i < 3; i++) { const b = new THREE.Group(); b.rotation.z = (i / 3) * Math.PI * 2; rotor.add(b); put(b, new THREE.Mesh(new THREE.BoxGeometry(1.2, h * 0.45, 0.3), white), 0, h * 0.23, 0, false); }
    g.userData.rotor = rotor;
    return g;
  }
  // Ente (sehr einfach): Körper, Kopf, Schnabel
  function earthDuck(M) {
    const g = new THREE.Group(), body = M.std({ color: srgb(0x8b6b4a), roughness: 0.8 });
    const b = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), body), 0, 0.12, 0, false); b.scale.set(0.8, 0.6, 1.2);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), M.std({ color: srgb(0x166534) })), 0, 0.36, 0.26, false);
    put(g, new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), M.std({ color: srgb(0xf59e0b) })), 0, 0.34, 0.42, false).rotation.x = Math.PI / 2;
    return g;
  }
  // ---------- Lebewesen für die Foto-Safari (vorn = +Z) ----------
  // Reh: grast – den Hals senkt es immer wieder zum Gras (userData.neck)
  function earthDeer(M, s = 1) {
    const g = new THREE.Group(), fur = M.std({ color: srgb(0x9c6a3c), roughness: 0.92, envMapIntensity: 0.3 }), pale = M.std({ color: srgb(0xeee0c8), roughness: 0.9, envMapIntensity: 0.3 });
    const dark = M.std({ color: srgb(0x2a1d14), roughness: 0.55 });
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), fur), 0, 0.74, 0).scale.set(0.44, 0.44, 0.95);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), pale), 0, 0.8, -0.44); // heller „Spiegel“ hinten
    for (const [x, z] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.3], [0.12, -0.3]]) {
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.58, 7), fur), x, 0.33, z);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 7), dark), x, 0.03, z);
    }
    const neck = new THREE.Group(); neck.position.set(0, 0.86, 0.36); g.add(neck);
    put(neck, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.44, 9), fur), 0, 0.17, 0.06).rotation.x = 0.45;
    const head = new THREE.Group(); head.position.set(0, 0.38, 0.17); neck.add(head);
    put(head, new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), fur), 0, 0, 0).scale.set(0.85, 0.85, 1.25);
    put(head, new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.17, 9), fur), 0, -0.03, 0.15).rotation.x = Math.PI / 2;
    put(head, new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), dark), 0, -0.03, 0.235, false);
    for (const x of [-1, 1]) {
      put(head, new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), dark), x * 0.066, 0.035, 0.07, false);
      put(head, new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.13, 7), fur), x * 0.075, 0.12, -0.04).rotation.z = -x * 0.45;
    }
    g.scale.setScalar(s);
    g.userData = { neck, seed: Math.random() * 10 };
    return g;
  }
  // Schmetterling: zwei bunte Flügel, die schlagen (userData.wl / wr)
  const wingTexCache = {};
  function wingTex(col) {
    if (wingTexCache[col]) return wingTexCache[col];
    return (wingTexCache[col] = canvasTex(128, 128, (c) => {
      c.clearRect(0, 0, 128, 128);
      const wing = (path) => { c.beginPath(); path(); c.closePath(); c.fillStyle = "#1f1308"; c.fill(); c.save(); c.clip(); c.fillStyle = col; c.translate(-6, 0); path(); c.fill(); c.restore(); };
      wing(() => { c.moveTo(4, 60); c.bezierCurveTo(30, 0, 112, -6, 122, 30); c.bezierCurveTo(124, 52, 80, 66, 4, 64); }); // Vorderflügel
      wing(() => { c.moveTo(4, 66); c.bezierCurveTo(60, 66, 104, 84, 92, 112); c.bezierCurveTo(72, 128, 24, 112, 4, 72); }); // Hinterflügel
      c.fillStyle = "#fff"; for (const [x, y, r] of [[110, 26, 4], [100, 18, 3], [84, 100, 3.5], [70, 108, 3]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    }));
  }
  function earthButterfly(col) {
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ map: wingTex(col), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, toneMapped: false });
    const geo = new THREE.PlaneGeometry(0.4, 0.4); geo.translate(0.2, 0, 0); geo.rotateX(-Math.PI / 2); // Gelenk am Körper, Flügel liegt flach
    const wr = new THREE.Mesh(geo, mat), wl = new THREE.Mesh(geo, mat); wl.scale.x = -1;
    g.add(wr, wl);
    const body = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.26, 6), new THREE.MeshBasicMaterial({ color: 0x1f1308 })), 0, 0, 0, false); body.rotation.x = Math.PI / 2;
    g.userData = { wl, wr, o: Math.random() * 6 };
    return g;
  }
  // große Blume (wie eine Sonnenblume), damit man sie auf dem Foto erkennt
  function earthFlower(M, petal, h) {
    const g = new THREE.Group(), green = M.std({ color: srgb(0x3f8f35), roughness: 0.9, envMapIntensity: 0.3 }), pm = M.std({ color: srgb(petal), roughness: 0.7, envMapIntensity: 0.3 });
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, h, 6), green), 0, h / 2, 0, false);
    for (const s of [-1, 1]) { const l = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), green), s * 0.07, h * 0.45, 0, false); l.scale.set(1.3, 0.2, 0.55); l.rotation.z = s * 0.4; }
    const head = new THREE.Group(); head.position.y = h; head.rotation.x = 0.4; g.add(head);
    put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 14), M.std({ color: srgb(0x5a3410), roughness: 0.9 })), 0, 0, 0, false);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, p = put(head, new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), pm), Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, false); p.scale.set(0.55, 0.25, 1.4); p.rotation.y = Math.PI / 2 - a; }
    return g;
  }
  // Frosch: sitzt am Ufer und hüpft ab und zu
  function earthFrog(M) {
    const g = new THREE.Group(), skin = M.std({ color: srgb(0x4caf50), roughness: 0.45, envMapIntensity: 0.7 }), belly = M.std({ color: srgb(0xd9e8a6), roughness: 0.6 });
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin), 0, 0.1, 0).scale.set(1, 0.62, 1.15);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), belly), 0, 0.07, 0.05, false).scale.set(1, 0.5, 1);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), skin), 0, 0.15, 0.12).scale.set(1.2, 0.7, 1);
    for (const s of [-1, 1]) {
      put(g, new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })), s * 0.075, 0.21, 0.14, false);
      put(g, new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })), s * 0.08, 0.215, 0.18, false);
      put(g, new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), skin), s * 0.15, 0.06, -0.08).scale.set(0.6, 0.5, 1.4); // Hinterbein
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.12, 6), skin), s * 0.11, 0.05, 0.17, false);
    }
    g.scale.setScalar(1.7); g.userData = { seed: Math.random() * 7 };
    return g;
  }
  // Rotkehlchen auf einem Pfosten: dreht den Kopf und hüpft
  function earthRobin(M) {
    const g = new THREE.Group(), brown = M.std({ color: srgb(0x7a5a3a), roughness: 0.8, envMapIntensity: 0.3 }), red = M.std({ color: srgb(0xe8662a), roughness: 0.7, envMapIntensity: 0.3 });
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), brown), 0, 0.1, 0).scale.set(0.85, 0.85, 1.15);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), red), 0, 0.09, 0.045, false);
    const head = new THREE.Group(); head.position.set(0, 0.18, 0.06); g.add(head);
    put(head, new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), brown), 0, 0, 0);
    put(head, new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), red), 0, -0.02, 0.03, false);
    put(head, new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 6), new THREE.MeshStandardMaterial({ color: 0x2b2118 })), 0, 0, 0.07, false).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) put(head, new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 5), new THREE.MeshBasicMaterial({ color: 0x050505 })), s * 0.04, 0.015, 0.035, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.13), brown), 0, 0.1, -0.13).rotation.x = -0.5;
    g.scale.setScalar(2.1); g.userData = { head, seed: Math.random() * 5 };
    return g;
  }
  // Vogelschwarm: kleine V-förmige Vögel, die Kreise ziehen
  function earthBirds(n) {
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0x1f2937, side: THREE.DoubleSide, fog: false });
    const shape = new THREE.BufferGeometry(); shape.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, -0.9, 0.25, -0.3, 0, 0, 0.3, 0, 0, 0, 0.9, 0.25, -0.3, 0, 0, 0.3], 3));
    const birds = [];
    for (let i = 0; i < n; i++) { const b = new THREE.Mesh(shape, mat); b.scale.setScalar(1.4); g.add(b); birds.push({ b, o: hash2(i, 3) * 6, r: 20 + hash2(i, 4) * 14, h: 30 + hash2(i, 5) * 12 }); }
    g.userData.birds = birds;
    return g;
  }

  function buildEarthCamp(g, add) {
    const M = colonyMats("erde");
    earthVisitorCenter(g, M, 0, 12, 26, 9, 5.2);
    for (const [x, c] of [[-15, 0x2563eb], [-17, 0x16a34a], [-19, 0xf59e0b]]) { const f = earthFlag(M, c); f.position.set(x, 0, 4); g.add(f); (g.userData.flags = g.userData.flags || []).push(f.userData.cloth); }
    for (const [x, z] of [[-9.5, 3], [9.5, 3]]) colonyLamp(g, M, x, z);
    for (const [x, z, r] of [[-12, 2, 0.3], [12, 1.5, -0.3]]) { const b = earthBench(M); b.position.set(x, 0, z); b.rotation.y = Math.PI + r; g.add(b); }
    // Blumenbeete vor dem Haus
    const petal = [0xf472b6, 0xfacc15, 0xef4444, 0xa78bfa, 0xffffff].map((c) => new THREE.MeshStandardMaterial({ color: srgb(c), roughness: 0.7 }));
    for (let i = 0; i < 40; i++) put(g, new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), petal[i % 5]), (i < 20 ? -12 : 7) + (i % 20) * 0.28, 0.2, 6.6 + (i % 3) * 0.25, false);
  }
  function earthCampColliders([sx, sz]) {
    const c = [[sx - 15, sz + 4, 0.2], [sx - 17, sz + 4, 0.2], [sx - 19, sz + 4, 0.2], [sx - 9.5, sz + 3, 0.3], [sx + 9.5, sz + 3, 0.3], [sx - 12, sz + 2, 0.9], [sx + 12, sz + 1.5, 0.9]];
    for (let x = -12; x <= 12.1; x += 3) c.push([sx + x, sz + 10, 2.4], [sx + x, sz + 14, 2.4]);
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx + x, sz + 0.1, 1]); // Tafelwand
    return c;
  }

  // Erde: Die Rakete landet auf einer Wiese am See. Ein Rundweg führt links herum am Ufer entlang durch den Wald,
  // hinauf zur Sternwarte auf dem Hügel, zum Besucherzentrum und rechts am Ufer zurück.
  const ERDE_LAYOUT = {
    spawn: [-6.9, 4], waage: [-14, 14], luft: [18, 18], stern: [24, 40], mond: [-30, 68],
    see: [0, 40], wasser: [-17, 38], wald: [-38, 44], wegweiser: [6, 5],
    station: [0, 84], tag: [24, 70], groesse: [0, 77], meet: [16, 26],
    route: {
      wegweiser: [[4, 2.5]], waage: [[-6, 8], [-11, 9]], wasser: [[-18, 24], [-20, 34]], wald: [[-26, 42], [-30, 46]],
      mond: [[-32, 54], [-26.5, 60.5]], groesse: [[-18, 70], [-6, 72], [-3, 73]], tag: [[-30, 56], [-18, 70], [6, 73], [19, 67.5]],
      stern: [[24, 58], [27, 46]], luft: [[24, 30], [21.5, 23.5]], wand: [[24, 40], [20, 62], [4, 78]], rakete: [[14, 62], [24, 40], [16, 10], [-4, 5]]
    }
  };
  const ERDE_SKY = new THREE.Color(0x7ec0ee), ERDE_NIGHT = new THREE.Color(0x04060e), ERDE_DUSK = new THREE.Color(0xf08a3c);
  const ERDE_MOON_DIR = new V(-0.55, 0.5, 0.65).normalize();
  // Sonnenlauf auf der Erde (Sonnenuhr): Die Morgensonne um 9 Uhr ist SUN_DIR (Südost), der Himmelspol steht 50° hoch im Norden.
  // Die Sonne zieht von Osten über Süden nach Westen – so dreht sich der Schatten wie bei einer echten Sonnenuhr.
  const ERDE_SOUTH = (() => { const b = Math.atan2(SUN_DIR.x, SUN_DIR.z) - Math.PI / 4; return new V(Math.sin(b), 0, Math.cos(b)); })();
  const ERDE_POLE = ERDE_SOUTH.clone().multiplyScalar(-Math.cos(0.87)).add(new V(0, Math.sin(0.87), 0)).normalize();
  const erdeSunAt = (hour, out = new V()) => out.copy(SUN_DIR).applyAxisAngle(ERDE_POLE, -(hour - 9) * Math.PI / 12);
  // Sonnenuhr: Steinsockel, Zifferblatt mit Stundenzahlen dort, wohin der Schatten zur jeweiligen Stunde zeigt, dreieckiger Schattenwerfer
  function earthSundial(M) {
    const g = new THREE.Group(), R = 1.15, TOP = 0.46, N = ERDE_SOUTH.clone().negate(), U = new V(0, 1, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.38, 0.44, 40), M.std({ color: srgb(0xb9a382), roughness: 0.9, envMapIntensity: 0.4 })), 0, 0.22, 0).receiveShadow = true; // Sandstein
    const tex = canvasTex(1024, 1024, (c) => {
      const px = (wx) => (wx / R + 1) * 512, pz = (wz) => (wz / R + 1) * 512;
      c.fillStyle = "#c9b48c"; c.fillRect(0, 0, 1024, 1024); // nicht zu hell, sonst sieht man den Schatten kaum
      c.strokeStyle = "#6b4f2a"; c.lineWidth = 12; c.beginPath(); c.arc(512, 512, 494, 0, 7); c.stroke();
      const d = new V(), up = Math.atan2(N.x, -N.z); // Zahlen stehen aufrecht, wenn man von Süden auf die Uhr schaut
      for (let h = 6; h <= 18; h++) {
        erdeSunAt(h, d); if (d.y < 0.03) continue;
        const k = ERDE_POLE.y / d.y, sx = ERDE_POLE.x - k * d.x, sz = ERDE_POLE.z - k * d.z, l = Math.hypot(sx, sz), ux = sx / l, uz = sz / l; // Schattenrichtung des Stabs
        c.strokeStyle = "#4a3418"; c.lineWidth = h % 2 ? 5 : 9;
        c.beginPath(); c.moveTo(px(ux * 0.1), pz(uz * 0.1)); c.lineTo(px(ux * (h % 2 ? 0.7 : 0.76)), pz(uz * (h % 2 ? 0.7 : 0.76))); c.stroke();
        if (h % 2) continue; // Zahlen nur zu den geraden Stunden – sonst stehen sie zu eng
        c.save(); c.translate(px(ux * 0.88), pz(uz * 0.88)); c.rotate(up);
        c.fillStyle = "#2f210d"; c.font = "bold 92px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(h), 0, 0);
        c.restore();
      }
    });
    const face = put(g, new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })), 0, TOP, 0, false);
    face.rotation.x = -Math.PI / 2; face.receiveShadow = true;
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(0.78, 0); fs.lineTo(0.78, 0.78 * Math.tan(0.87)); fs.closePath();
    const gGeo = new THREE.ExtrudeGeometry(fs, { depth: 0.035, bevelEnabled: false }); gGeo.translate(0, 0, -0.0175);
    const gnomon = new THREE.Mesh(gGeo, M.std({ color: srgb(0x9a6b2f), roughness: 0.35, metalness: 0.8 })); // Bronze
    gnomon.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(N, U, N.clone().cross(U)));
    gnomon.position.y = TOP; gnomon.castShadow = true; g.add(gnomon);
    g.name = "sonnenuhr"; g.userData = { face, gnomon };
    return g;
  }
  // Bäume: Nadelbäume mit vielen unregelmäßigen Zweig-Etagen und Laubbäume mit runder, buschiger Krone (Farben im Gitter: innen dunkler)
  const TREE = { geos: {}, mats: null };
  function treeMats() {
    if (TREE.mats) return TREE.mats;
    const bark = new THREE.MeshStandardMaterial({ color: srgb(0x5a3a22), roughness: 1 });
    const leaf = [0x2e6b30, 0x3d7d34, 0x2a5f3a].map((c) => new THREE.MeshStandardMaterial({ color: srgb(c), roughness: 0.95, vertexColors: true }));
    const crown = [0x4f8f3a, 0x5c9a3c, 0x6b9f3a, 0x3f7f3a].map((c) => new THREE.MeshStandardMaterial({ color: srgb(c), roughness: 0.95, vertexColors: true }));
    for (const m of [...leaf, ...crown]) m.userData.noCam = true; // durch Zweige darf die Kamera hindurch (sonst springt sie im Wald ständig)
    return (TREE.mats = { bark, leaf, crown });
  }
  // gezackte Zweig-Etage (Kegel mit ausgefranstem Rand) bzw. buschiger Ballen, jeweils mit dunklerem Inneren
  function treeGeo(kind, v) {
    const key = kind + v; if (TREE.geos[key]) return TREE.geos[key];
    const geo = kind === "tier" ? new THREE.ConeGeometry(1, 1, 14, 3) : new THREE.IcosahedronGeometry(1, 2);
    const p = geo.attributes.position, q = new V(), col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      q.fromBufferAttribute(p, i);
      const a = Math.atan2(q.z, q.x), n = fbm2(q.x * 2.3 + v * 3, q.z * 2.3 + q.y * 2);
      if (kind === "tier") {
        const rim = q.y < -0.3 ? 1 + 0.22 * Math.sin(a * 7 + v) + 0.12 * (n - 0.5) : 1 + 0.1 * (n - 0.5); // Zweigspitzen
        q.x *= rim; q.z *= rim; if (q.y < -0.3) q.y -= 0.12 * Math.abs(Math.sin(a * 7 + v)); // Spitzen hängen leicht
      } else q.multiplyScalar(1 + (n - 0.5) * 0.5);
      p.setXYZ(i, q.x, q.y, q.z);
      const k = kind === "tier" ? 0.62 + 0.45 * (q.y + 0.5) + 0.15 * n : 0.6 + 0.35 * (q.y + 1) / 2 + 0.25 * n;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.min(1.15, k);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return (TREE.geos[key] = geo);
  }
  function makeTree(s, seed = 0) {
    const g = new THREE.Group(), M = treeMats(), v = Math.floor(hash2(seed, 5) * 3), conifer = hash2(seed, 9) < 0.62;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.24 * s, (conifer ? 1.8 : 2.4) * s, 8), M.bark);
    trunk.position.y = (conifer ? 0.9 : 1.2) * s; trunk.castShadow = true; g.add(trunk);
    if (conifer) { // Nadelbaum: 5 Etagen, nach oben kleiner
      const mat = M.leaf[v];
      for (let i = 0; i < 5; i++) {
        const r = (1.55 - i * 0.27) * s, h = (1.35 - i * 0.12) * s, t = new THREE.Mesh(treeGeo("tier", (v + i) % 3), mat);
        t.scale.set(r, h, r); t.position.y = (1.6 + i * 0.72) * s; t.rotation.y = hash2(seed, i) * 6; t.castShadow = i < 2; g.add(t);
      }
    } else { // Laubbaum: ein paar runde Ballen um die Krone
      const mat = M.crown[(v + seed) % 4];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + hash2(seed, i), r = i ? 0.7 * s : 0, b = new THREE.Mesh(treeGeo("ball", (v + i) % 3), mat);
        b.scale.setScalar((i ? 0.95 : 1.35) * s * (0.85 + hash2(seed, i + 7) * 0.3));
        b.position.set(Math.cos(a) * r, (i ? 2.9 : 3.5) * s + hash2(seed, i + 3) * 0.4 * s, Math.sin(a) * r); b.castShadow = i === 0; g.add(b);
      }
    }
    return g;
  }
  function buildErde() {
    const L = { ...ERDE_LAYOUT };
    const craters = [[...L.see, 18, 2.4]]; // die Senke für den See
    const hills = [[L.mond[0], L.mond[1] + 2, 16, 4.5], [L.station[0], L.station[1] + 8, 34, 3]]; // Sternwarten-Hügel und Hügel des Besucherzentrums
    const flats = [[0, 0, 11], [...L.station, 20, "auto"], [L.station[0], L.station[1] + 12, 20, "auto"], [...L.waage, 4], [...L.luft, 5], [...L.stern, 4], [...L.mond, 6.5, "auto", 9], [L.mond[0] + 5, L.mond[1] + 2, 5, "auto", 7], [...L.wald, 9, "auto"], [...L.tag, 6, "auto"]];
    const B = buildBase({
      height: makeHeight(craters, flats, 200, null, hills),
      // Luft: blauer Himmel, leichter Dunst in der Ferne, am Tag keine Sterne
      sky: ERDE_SKY.getHex(), fog: [160, 560], stars: false, sunSize: 150,
      ground: 0x4f9440, rock: 0x7a7a76,
      tint: (x, z) => { const m = 0.75 + 0.3 * fbm2(x * 0.02 + 6, z * 0.02); return [m * 0.95, m, m * 0.85]; },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [...L.waage, 4], [...L.luft, 4], [...L.stern, 4], [...L.mond, 4],
        [...L.see, 20], [...L.wald, 9], [...L.wegweiser, 3]],
      ambient: [0xffffff, 0.55], hemi: [0xbfe3ff, 0x4a7a3a, 0.5], sun: [0xfff4e0, 1.5],
      dust: ["rgba(170,150,110,1)", "rgba(140,125,95,0.9)"]
    });
    const { scene, height, on, rocket } = B;
    const common = addCommon(B, L, "Besucherzentrum", "erde");
    const M = colonyMats("erde");

    // See: flüssiges Wasser gibt es nur auf der Erde
    const water = new THREE.Mesh(new THREE.CircleGeometry(17.5, 48), new THREE.MeshStandardMaterial({ color: 0x2f7fd0, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.88 }));
    water.rotation.x = -Math.PI / 2; water.position.set(L.see[0], -0.7, L.see[1]); water.receiveShadow = true; scene.add(water);
    // Wald
    const trees = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const a = hash2(i, 11) * Math.PI * 2, r = 3.5 + hash2(i, 12) * 7, x = L.wald[0] + Math.cos(a) * r, z = L.wald[1] + Math.sin(a) * r;
      const t = makeTree(0.8 + hash2(i, 13) * 0.7, i * 7 + 1); t.position.set(x, height(x, z), z); trees.add(t);
    }
    for (let i = 0; i < 14; i++) { // einzelne Bäume in der Landschaft
      const x = (hash2(i, 21) - 0.5) * 240, z = (hash2(i, 22) - 0.5) * 240;
      if (Math.hypot(x, z) < 70 || Math.hypot(x - L.see[0], z - L.see[1]) < 22) continue;
      const t = makeTree(0.9 + hash2(i, 23) * 0.8, i * 11 + 3); t.position.set(x, height(x, z), z); trees.add(t);
    }
    scene.add(trees);
    // Wolken
    const clouds = new THREE.Group(), white = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(16 + hash2(i, k) * 12, 10, 8), white); b.scale.y = 0.45; b.position.set((k - 1.5) * 18, hash2(k, i) * 5, (hash2(i + k, 3) - 0.5) * 12); c.add(b); }
      const a = (i / 9) * Math.PI * 2 + hash2(i, 5);
      c.position.set(Math.cos(a) * (350 + hash2(i, 6) * 250), 190 + hash2(i, 7) * 80, Math.sin(a) * (350 + hash2(i, 8) * 250));
      clouds.add(c);
    }
    scene.add(clouds);
    // Der Mond am Taghimmel
    const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 28, 20), new THREE.MeshBasicMaterial({ map: W.bodies.mond.mesh.material.map, color: 0xe8eef8, fog: false, transparent: true, opacity: 0.8 }));
    moon.position.copy(ERDE_MOON_DIR).multiplyScalar(900); scene.add(moon);
    const rollRoof = on(earthRollRoof(M), ...L.mond); // Volkssternwarte: das Dach rollt zum Beobachten zur Seite
    rollRoof.rotation.y = Math.atan2(-L.mond[0], -L.mond[1]);
    const telescope = on(makeTelescope(ERDE_MOON_DIR), ...L.mond);

    // Sternschnuppen-Versuch
    on(earthMeteorCase(M), ...L.stern).rotation.y = Math.atan2(-L.stern[0], -L.stern[1]) + Math.PI; // Meteoriten-Vitrine
    const meteor = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 1, flatShading: true }));
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,225,150,1)", "rgba(255,110,20,0.9)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    meteor.add(fire); meteor.visible = false; scene.add(meteor);
    const weather = on(earthWeather(M), ...L.luft); // Wetterstation beim Luft-Versuch
    weather.rotation.y = Math.atan2(-L.luft[0], -L.luft[1]) + Math.PI;
    const [wx, wz] = L.wegweiser;
    on(makeSignTree(M, [["☀️ SONNE 150 Mio. km", Math.atan2(SUN_DIR.x, SUN_DIR.z), "#ca8a04"], ["🌙 MOND 384.400 km", Math.atan2(ERDE_MOON_DIR.x, ERDE_MOON_DIR.z), "#475569"],
      ["🏛️ BESUCHERZENTRUM", Math.atan2(L.station[0] - wx, L.station[1] - wz), "#2563eb"], ["🦆 SEE", Math.atan2(L.see[0] - wx, L.see[1] - wz), "#16a34a"]]), wx, wz);
    // Sonnenuhr: Der Schatten des Stabs wandert im Lauf des Tages
    on(earthSundial(M), ...L.tag);
    { // Park rund um die Sonnenuhr: Blumenbeet (nach Süden offen, dort steht man), Bänke, zwei Bäume
      const [tx, tz] = L.tag, gap = Math.atan2(-ERDE_SOUTH.z, ERDE_SOUTH.x); // Richtung Süden im Ring (Ring liegt flach, y → −z)
      const bed = on(new THREE.Mesh(new THREE.RingGeometry(1.6, 2.05, 48, 1, gap + 0.55, Math.PI * 2 - 1.1), M.std({ color: srgb(0x5b3a24), roughness: 1 })), tx, tz, 0.03);
      bed.rotation.x = -Math.PI / 2; bed.receiveShadow = true;
      const cols = [0xf472b6, 0xfacc15, 0xef4444, 0xa78bfa, 0xffffff, 0xfb923c];
      for (let i = 0; i < 28; i++) {
        const a = gap + 0.62 + (i / 27) * (Math.PI * 2 - 1.24), r = 1.7 + hash2(i, 41) * 0.25; // a: Winkel im Ring
        const f = earthFlower(M, cols[i % cols.length], 0.28 + hash2(i, 42) * 0.14); f.rotation.y = hash2(i, 43) * 6;
        on(f, tx + Math.cos(a) * r, tz - Math.sin(a) * r);
      }
      for (const [dx, dz, r] of [[-2.6, 1.4, 2.1], [2.4, 2, -2.2]]) on(earthBench(M), tx + dx, tz + dz).rotation.y = r;
      for (const [dx, dz] of [[4, 4], [-4, 4.5]]) { const t = makeTree(0.9, dx > 0 ? 4 : 13); t.position.set(tx + dx, height(tx + dx, tz + dz), tz + dz); trees.add(t); }
    }
    { // Waage mit Schild „So viel wiegst du wirklich“
      on(makeSignBoard(M, "⚖️ WAAGE – WIE SCHWER BIST DU?", "#2563eb", 3.2), L.waage[0] + 2.4, L.waage[1] + 1).rotation.y = Math.atan2(-L.waage[0], -L.waage[1]);
    }
    // Am See: Steg mit Boot und Enten
    const [lx, lz] = L.see, jetty = new THREE.Group(); on(jetty, lx - 16, lz + 2); jetty.rotation.y = Math.PI / 2;
    for (let i = 0; i < 8; i++) put(jetty, new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.6), wood(M, 1, 0.3)), 0, 0.35 - i * 0.02, i * 0.65);
    for (const s of [-0.85, 0.85]) for (let i = 0; i < 3; i++) put(jetty, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2, 8), wood(M, 0.2, 1)), s, -0.3, i * 2.2);
    const boat = new THREE.Group(); scene.add(boat);
    const hull = put(boat, new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.std({ color: srgb(0xf8fafc), side: THREE.DoubleSide })), 0, 0.2, 0);
    hull.scale.set(0.9, 0.5, 2.2);
    put(boat, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), wood(M, 0.2, 1)), 0, 1.7, 0.2);
    const sail = new THREE.BufferGeometry(); sail.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.5, 0.3, 0, 3.1, 0.3, 0, 0.5, -1.6], 3)); sail.computeVertexNormals();
    put(boat, new THREE.Mesh(sail, new THREE.MeshStandardMaterial({ color: srgb(0xef4444), side: THREE.DoubleSide })), 0, 0, 0);
    const ducks = [0, 1, 2, 3].map(() => { const d = earthDuck(M); scene.add(d); return d; });
    // Lebewesen für die Foto-Safari
    const MC = [L.wald[0] + 12, L.wald[1] - 13]; // Blumenwiese zwischen See und Wald
    const flowers = [0xfacc15, 0xf472b6, 0xef4444, 0xa78bfa, 0xfacc15, 0xfb923c, 0xf472b6, 0xffffff, 0xfacc15].map((c, i) => {
      const a = hash2(i, 31) * Math.PI * 2, r = 0.8 + hash2(i, 32) * 2.6, f = earthFlower(M, c, 0.75 + hash2(i, 33) * 0.4);
      f.rotation.y = hash2(i, 34) * 6; return on(f, MC[0] + Math.cos(a) * r, MC[1] + Math.sin(a) * r);
    });
    const flies = ["#f97316", "#3b82f6", "#facc15"].map((c) => { const b = earthButterfly(c); scene.add(b); return b; });
    const doe = on(earthDeer(M), L.wald[0] - 2, L.wald[1] - 14), fawn = on(earthDeer(M, 0.68), L.wald[0] - 0.4, L.wald[1] - 15.6); // auf der Wiese vor dem Wald
    for (const d of [doe, fawn]) d.rotation.y = Math.atan2(MC[0] - d.position.x, MC[1] - d.position.z) + 0.5;
    const frogAt = [L.wasser[0] + 1.6, L.wasser[1] + 0.8], frog = new THREE.Group(), frogY = Math.max(height(...frogAt), -0.62);
    frog.add(earthFrog(M)); frog.position.set(frogAt[0], frogY, frogAt[1]); frog.rotation.y = Math.atan2(-frogAt[0], -frogAt[1]) + Math.PI; scene.add(frog);
    if (height(...frogAt) < -0.62) { const pad = put(frog, new THREE.Mesh(new THREE.CircleGeometry(0.42, 18, 0.3, 5.9), M.std({ color: srgb(0x3f8f35), side: THREE.DoubleSide, roughness: 0.6 })), 0, 0.01, 0, false); pad.rotation.x = -Math.PI / 2; } // Seerosenblatt
    const postAt = [MC[0] + 2.5, MC[1] + 6.5], post = on(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.25, 8), wood(M, 0.3, 1)), ...postAt, 0.62);
    post.castShadow = true;
    const robin = earthRobin(M); robin.position.set(postAt[0], post.position.y + 0.63, postAt[1]); robin.rotation.y = Math.atan2(-postAt[0], -postAt[1]); scene.add(robin);
    // Windräder am Horizont, Vögel am Himmel
    const turbines = [[140, 160], [175, 120], [110, 195]].map(([x, z]) => { const t = earthTurbine(M, 36); t.position.set(x, height(x, z) - 1, z); t.rotation.y = -2.4; scene.add(t); return t; });
    const birds = earthBirds(7); scene.add(birds);
    drawTour(B, L, [200, 192, 172], 1.8); // Rundweg um den See
    const anim = [(dt, t) => {
      const ob = rollRoof.userData; if (ob.open !== ob.target) { ob.open += Math.sign(ob.target - ob.open) * Math.min(Math.abs(ob.target - ob.open), dt * 0.6); ob.set(smooth(0, 1, ob.open)); }
      weather.userData.cups.rotation.y += dt * (4 + 2 * Math.sin(t * 0.4));
      const bt = (t % 40) / 40, bl = weather.userData.balloon; bl.position.set(0.8 + bt * 6, 3.3 + bt * bt * 140, bt * 10); bl.visible = bt < 0.96; // Wetterballon steigt auf
      boat.position.set(lx + Math.cos(t * 0.04) * 8, -0.55 + Math.sin(t * 1.3) * 0.05, lz + Math.sin(t * 0.04) * 6); boat.rotation.y = -t * 0.04; boat.rotation.z = Math.sin(t * 0.9) * 0.05;
      ducks.forEach((d, i) => { const a = t * 0.08 + i * 0.5; d.position.set(lx - 6 + Math.cos(a) * 5 + i * 0.6, -0.62, lz + Math.sin(a) * 4 + i * 0.4); d.rotation.y = -a; });
      for (const tb of turbines) tb.userData.rotor.rotation.z += dt * 0.9;
      for (const d of [doe, fawn]) { const u = d.userData, ph = (t * 0.16 + u.seed) % 1; u.neck.rotation.x = 1.25 * smooth(0.05, 0.15, ph) * (1 - smooth(0.62, 0.72, ph)); } // grasen
      flies.forEach((b, i) => { // Schmetterlinge flattern über der Wiese
        const u = b.userData, a = t * (0.3 + i * 0.05) + u.o, r = 1.4 + i * 0.6, x = MC[0] + Math.cos(a) * r, z = MC[1] + Math.sin(a * 1.3) * r;
        b.position.set(x, height(x, z) + 0.9 + 0.35 * Math.sin(t * 1.7 + u.o) + 0.08 * Math.sin(t * 9 + u.o), z);
        b.rotation.y = Math.atan2(-Math.sin(a) * r, Math.cos(a * 1.3) * r * 1.3);
        const f = 0.85 + Math.sin(t * 15 + u.o) * 0.6; u.wr.rotation.z = f; u.wl.rotation.z = -f;
      });
      { const u = frog.children[0].userData, ph = (t / 6 + u.seed) % 1; frog.children[0].position.y = ph < 0.08 ? Math.sin((ph / 0.08) * Math.PI) * 0.35 : 0; } // Frosch hüpft
      { const u = robin.userData, ph = (t / 4 + u.seed) % 1; u.head.rotation.y = Math.sin(t * 1.3 + u.seed) * 0.8 * (ph > 0.3 ? 1 : 0); robin.position.y = post.position.y + 0.63 + (ph < 0.06 ? Math.sin((ph / 0.06) * Math.PI) * 0.12 : 0); }
      for (const b of birds.userData.birds) { const a = t * 0.18 + b.o; b.b.position.set(Math.cos(a) * b.r + 10, b.h + Math.sin(t * 2 + b.o) * 0.6, 40 + Math.sin(a) * b.r); b.b.rotation.y = -a; b.b.scale.y = 1.4 * (0.6 + 0.4 * Math.sin(t * 8 + b.o)); }
      for (const c of common.station.userData.flags) { const p = c.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.9; p.setZ(i, Math.sin(x * 3 - t * 4) * 0.12 * x); } p.needsUpdate = true; }
    }];
    const { rack, cols: rackCols } = placeSizeRack(B, ["merkur", "mars", "venus", "erde"], L.station);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, luft: L.luft, stern: L.stern, tag: L.tag, groesse: L.groesse, mond: L.mond,
      wasser: L.wasser, wald: L.wald, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] },
      { mond: MARS_SCOPE_DOOR(L.mond), tag: [ERDE_SOUTH.x * 2.6, ERDE_SOUTH.z * 2.6] }); // vor der Sonnenuhr (Süden), nicht auf ihr
    const npcs = addNpcs(B);
    const colliders = [...common.colliders, ...npcs.map((n) => n.col), [...L.luft, 0.9], [L.luft[0] - 1.4, L.luft[1], 0.2], [...L.stern, 0.9], [...L.mond, 3.2], [...L.wegweiser, 0.3], [...L.tag, 1.4],
      ...rackCols];

    // Lebewesen: Art, Objekt, Höhe der Bildmitte, Größe (für das Teleobjektiv), größte Foto-Entfernung
    const life = [...ducks.map((o) => ({ kind: "ente", obj: o, h: 0.3, size: 0.7 })), ...trees.children.map((o) => ({ kind: "baum", obj: o, h: 2.6, size: 5, far: 26 })),
      { kind: "reh", obj: doe, h: 0.85, size: 1.5 }, { kind: "reh", obj: fawn, h: 0.6, size: 1.1 }, ...flies.map((o) => ({ kind: "schmetterling", obj: o, h: 0, size: 0.9 })),
      ...flowers.map((o) => ({ kind: "blume", obj: o, h: 0.85, size: 1 })), { kind: "frosch", obj: frog, h: 0.25, size: 0.7 }, { kind: "vogel", obj: robin, h: 0.25, size: 0.6 },
      ...npcs.map((n) => ({ kind: "mensch", obj: n.obj, h: 1.1, size: 2.2 }))]; // Jana und Nora: Menschen sind auch Lebewesen
    colliders.push([...postAt, 0.2]);
    return { ...B, ...common, L, water, trees, jetty, clouds, cloudMat: white, moon, telescope, meteor, fire, rack, stations, colliders, rollRoof, anim, npcs, life, shadowCasters: [rocket, common.station, trees, rollRoof] };
  }
  // Himmel der Erde: air = wie viel Luft (1 = normal, 0 = keine, wie auf dem Mond); dazu die Tageszeit aus der Sonnenhöhe
  function erdeSky(air) {
    const w = world, e = sunNow.y, day = smooth(-0.08, 0.22, e), dusk = Math.max(0, 1 - Math.abs(e - 0.04) / 0.2);
    const bg = w.scene.background.copy(ERDE_NIGHT).lerp(ERDE_SKY, day).lerp(ERDE_DUSK, dusk * 0.55);
    bg.lerp(ERDE_NIGHT, 1 - air); // ohne Luft: schwarz, sogar am Tag
    w.scene.fog.color.copy(bg);
    w.scene.fog.far = 560 + (1 - air) * 2600;
    const dark = Math.max(1 - day, 1 - air);
    w.stars.visible = dark > 0.35; w.stars.material.opacity = 0.85 * dark;
    w.clouds.visible = air > 0.5;
    w.cloudMat.color.setScalar(0.18 + 0.82 * day); // nachts sind auch die Wolken dunkel
    w.ambient.intensity = (0.12 + 0.43 * air) * (0.25 + 0.75 * day);
    w.hemi.intensity = (0.08 + 0.42 * air) * (0.2 + 0.8 * day);
  }
  // --- Luft an/aus: Was die Lufthülle für uns tut ---
  function startAir() {
    enterExhibit("luft", { update: updateAir, a: 1, on: true, tried: 0 });
    askGuess(cfg.air.guess, cfg.air.intro, () => setEarthAir(false));
  }
  function setEarthAir(on) {
    const sp = view.special, T = cfg.air;
    sp.on = on;
    if (!on) sp.tried = 1; else if (sp.tried) sp.tried = 2;
    Sound.whoosh();
    if (!on) scopeSay(guessed(T.offText), [[T.on, () => setEarthAir(true), true]]);
    else scopeSay(T.onText, [[T.off, () => setEarthAir(false)], [T.done, () => { erdeSky(1); leaveExhibit(); }, true]]);
  }
  function updateAir(dt) {
    const c = world.camera, sp = view.special, [x, z] = world.L.luft, y = world.height(x, z);
    c.position.lerp(tmp.set(x - 5, y + 2.4, z - 6), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(x + 25, y + 12, z + 40), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    sp.a += ((sp.on ? 1 : 0) - sp.a) * Math.min(1, dt * 2);
    erdeSky(sp.a);
  }
  // --- Sternschnuppe: Derselbe Brocken wie auf dem Merkur – aber hier bremst ihn die Luft, er verglüht ---
  function startShooting() {
    enterExhibit("stern", { update: updateShooting, t: 0, run: false });
    askGuess(cfg.shooting.guess, cfg.shooting.ready, runShooting);
  }
  function runShooting() { const sp = view.special; sp.t = 0; sp.run = true; world.meteor.visible = true; scopeSay(cfg.shooting.running); }
  function updateShooting(dt) {
    const c = world.camera, sp = view.special, [x, z] = world.L.stern, y = world.height(x, z);
    c.position.lerp(tmp.set(x - 4, y + 2.2, z - 7), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(x + 14, y + 22, z + 40), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (!sp.run) return;
    sp.t += dt;
    const f = sp.t / 2.2; // Flugbahn quer über den Himmel; bei f = 0,75 ist der Brocken verglüht
    world.meteor.position.set(x + 70 - 95 * f, y + 95 - 70 * f, z + 75 - 35 * f);
    const burn = smooth(0.15, 0.75, f);
    world.meteor.scale.setScalar(Math.max(0.03, 3 * (1 - burn)));
    world.fire.scale.setScalar((1 + 3 * Math.sin(Math.min(1, f / 0.75) * Math.PI)) / Math.max(0.03, 1 - burn)); // Glut um den Brocken (gleicht sein Schrumpfen aus)
    if (f >= 0.78) world.meteor.visible = false;
    if (sp.t > 3) { sp.run = false; Sound.correct(); scopeSay(guessed(cfg.shooting.end), [[cfg.shooting.again, runShooting], [cfg.shooting.done, leaveExhibit, true]]); }
  }
  // --- Sonnenuhr: ein ganzer Tag im Zeitraffer ---
  const DAY_TIME = 18; // Sekunden für 24 Stunden (die Nacht läuft schneller, siehe updateDay)
  function startDay() { enterExhibit("tag", { update: updateDay }); world.astronaut.visible = false; runDay(); } // freier Blick aufs Zifferblatt
  // Deutlicher Schatten des Schattenwerfers auf dem Zifferblatt (zusätzlich zum echten, der bei hellem Tag nur schwach zu sehen ist):
  // das Dreieck des Schattenwerfers, entlang des Sonnenlichts auf das Blatt projiziert und am Rand abgeschnitten
  function dialShadow(on) {
    const dial = world.scene.getObjectByName("sonnenuhr"); if (!dial) return;
    let m = world.dialShadowMesh;
    if (!m) { m = world.dialShadowMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x2b1d0e, transparent: true, opacity: 0.45, depthWrite: false })); m.rotation.x = -Math.PI / 2; dial.add(m); m.position.y = 0.465; }
    const d = sunNow; m.visible = on && d.y > 0.02; if (!m.visible) return;
    const N = ERDE_SOUTH.clone().negate(), h = 0.78 * Math.tan(0.87), k = h / d.y, R = 1.12;
    const A = [0, 0], B = [N.x * 0.78, N.z * 0.78], C = [B[0] - k * d.x, B[1] - k * d.z], pts = [];
    for (const [p, q] of [[A, B], [B, C], [C, A]]) for (let i = 0; i < 24; i++) {
      const t = i / 24, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t, r = Math.hypot(x, z), s = r > R ? R / r : 1;
      pts.push(new THREE.Vector2(x * s, -z * s)); // Kreisrand: nach innen geschoben (die Form ist vom Mittelpunkt aus sternförmig)
    }
    m.geometry.dispose(); m.geometry = new THREE.ShapeGeometry(new THREE.Shape(pts));
  }
  function runDay() { const sp = view.special; sp.t = 0; sp.run = false; sp.last = ""; setSun(0); erdeSky(1); dialShadow(false); askGuess(cfg.day.guess, cfg.day.ready, () => { sp.run = true; sp.t = -0.4; }); }
  function updateDay(dt) {
    const c = world.camera, sp = view.special, [x, z] = world.L.tag, y = world.height(x, z), T = cfg.day, S = ERDE_SOUTH;
    // von Süden schräg von oben auf die Sonnenuhr: der Schatten wandert über die Zahlen, oben sieht man den Himmel
    c.position.lerp(tmp.set(x + S.x * 2.3, y + 2.6, z + S.z * 2.3), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(x - S.x * 0.9, y + 0.15, z - S.z * 0.9), 1 - Math.exp(-dt * 4)); // Zifferblatt in der Bildmitte, über dem Textfeld
    c.lookAt(view.look);
    c.fov += (64 - c.fov) * Math.min(1, dt * 3); c.updateProjectionMatrix();
    if (!sp.run) return;
    sp.t += dt * (sp.t > 0 && sunNow.y < -0.05 ? 2.6 : 1); // die Nacht läuft schneller – am Tag sieht man den Schatten wandern
    if (sp.t < 0) return;
    const f = Math.min(1, sp.t / DAY_TIME);
    setSun(-f * Math.PI * 2, ERDE_POLE); erdeSky(1); // von Osten über Süden nach Westen (siehe erdeSunAt)
    dialShadow(f < 1);
    if (f >= 1) { sp.run = false; setSun(0); erdeSky(1); Sound.correct(); scopeSay(guessed(T.end), [[T.again, runDay], [T.done, endHidden, true]]); return; }
    const hour = Math.floor(9 + f * 24) % 24;
    const text = fmtVars(sunNow.y > 0 ? T.day : T.night, { uhr: hour });
    if (text !== sp.last) { sp.last = text; $("scopeText").textContent = text; }
  }
  function startMoonScope() {
    const T = cfg.moonScope;
    world.rollRoof.userData.target = 1; // Dach der Sternwarte rollt zur Seite
    startTour("mond", T, [{ pos: world.moon.position, fov: 5, text: T.found }], { end: () => { world.rollRoof.userData.target = 0; } });
  }

  // =========================================================
  //  Sonden: Wo man nicht landen kann (Gasriesen, Sonne), steuert das Kind eine Sonde durch leuchtende Mess-Tore.
  //  Jedes Tor ist eine Entdeckung. Funk, Entdeckungskarten, Liste und Funk-Fragen sind dieselben wie beim Astronauten.
  // =========================================================
  let probe = null; // Zustand des laufenden Sondenflugs
  const GATE_R = 4.6, GATE_GAP = 95, PROBE_SPEED = 15, LANE_X = 13, LANE_Y = 7;
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmtInt = (n) => Math.round(n).toLocaleString("de-DE");

  function makeSpaceProbe(shield) {
    const g = new THREE.Group(); // Flugrichtung = +Z
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a73a, metalness: 0.7, roughness: 0.35 });
    const white = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.5, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.1), gold); g.add(body);
    const dish = dishCap(PROBE_M, 0.8, 0.8);
    dish.rotation.x = Math.PI / 2; dish.position.z = -0.25; g.add(dish); // Schüssel zeigt nach hinten – zur Erde
    for (const x of [-1.4, 1.4]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 0.8), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.25 }));
      panel.position.x = x; g.add(panel);
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), white); mast.rotation.x = Math.PI / 2; mast.position.z = 1.1; g.add(mast);
    if (shield) { // Hitzeschild: große helle Scheibe vor der Sonde
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.8 }));
      sh.rotation.x = Math.PI / 2; sh.position.z = 1.2; g.add(sh);
    }
    return g;
  }
  function iconSprite(icon) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const x = cv.getContext("2d"); x.font = "96px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(icon, 64, 70);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, toneMapped: false, fog: false }));
    s.scale.setScalar(3.2);
    return s;
  }
  function makeGate(d) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, fog: false, toneMapped: false }); // kräftige Farbe: blau = offen, grün = entdeckt
    g.add(new THREE.Mesh(new THREE.TorusGeometry(GATE_R, 0.22, 10, 48), mat));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(GATE_R, 0.6, 8, 48), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    g.add(halo);
    const mystery = iconSprite("❓"), icon = iconSprite(d.icon);
    g.add(mystery, icon);
    g.userData = { key: d.key, mat, halo: halo.material, mystery, icon, passed: false };
    return g;
  }
  // Planet (mit Ringen und Neigung) aus der Weltraum-Ansicht nachbauen, in der gewünschten Größe
  function planetModel(id, radius) {
    const b = G.bodyById[id], src = W.bodies[id].mesh;
    const m = id === "sonne" ? src.clone() : src.parent.clone();
    m.scale.setScalar(radius / b.radius);
    return m;
  }

  // ---------- Jede Sonde ist einer echten Mission nachgebaut (Flugrichtung = +Z) ----------
  function probeMats() {
    const gold = new THREE.MeshStandardMaterial({ map: foilTex(), roughness: 0.3, metalness: 0.75 });
    return {
      gold, white: new THREE.MeshStandardMaterial({ color: srgb(0xeef0f3), roughness: 0.5, side: THREE.DoubleSide }),
      dark: new THREE.MeshStandardMaterial({ color: srgb(0x23262e), roughness: 0.5, metalness: 0.5 }),
      cell: new THREE.MeshStandardMaterial({ color: srgb(0x1e3a8a), metalness: 0.6, roughness: 0.25 }),
      steel: new THREE.MeshStandardMaterial({ color: srgb(0xc7cdd6), roughness: 0.3, metalness: 0.8 })
    };
  }
  const PROBE_M = { std: (o) => new THREE.MeshStandardMaterial(o) }; // für dishCap
  const boom = (g, m, a, b, r = 0.03) => { const d = b.clone().sub(a), c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), m); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(new V(0, 1, 0), d.normalize()); g.add(c); return c; };
  // Jupiter: Eintauchkapsel wie bei „Galileo“ (1995) – vorn der Hitzeschild, oben der Fallschirm
  function craftGalileo() {
    const P = probeMats(), g = new THREE.Group();
    const shield = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.8, 28), new THREE.MeshStandardMaterial({ color: srgb(0x6b3d1e), roughness: 0.8 })); shield.rotation.x = Math.PI / 2; shield.position.z = 0.55; g.add(shield);
    const back = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.9, 28), P.white); back.rotation.x = -Math.PI / 2; back.position.z = -0.2; g.add(back);
    const chuteTex = canvasTex(256, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "#f97316" : "#f8fafc"; c.fillRect(i * 32, 0, 32, 64); } });
    const chute = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshStandardMaterial({ map: chuteTex, side: THREE.DoubleSide, roughness: 0.8 }));
    chute.position.set(0, 5.2, -2.2); chute.rotation.x = -0.5; g.add(chute);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; boom(g, P.steel, new V(0, 0.2, -0.4), new V(Math.sin(a) * 1.9, 5.2 - 0.6 + Math.cos(a) * 0.9, -2.2 + Math.cos(a) * 1.1), 0.01); }
    g.userData.chute = chute;
    return g;
  }
  // Saturn: „Cassini“ – hoher goldener Körper, große weiße Schüssel, langer Messarm, Landekapsel „Huygens“ an der Seite
  function craftCassini() {
    const P = probeMats(), g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 1.8, 16), P.gold); body.rotation.x = Math.PI / 2; g.add(body);
    const dish = dishCap(PROBE_M, 1.6, 0.62); dish.rotation.x = -Math.PI / 2; dish.position.z = -0.1; g.add(dish);
    const hu = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 20), new THREE.MeshStandardMaterial({ color: srgb(0xb45309), roughness: 0.6 })); hu.rotation.z = Math.PI / 2; hu.position.set(0.8, 0, 0.3); g.add(hu);
    boom(g, P.steel, new V(-0.4, 0.2, 0.2), new V(-3.4, 0.4, 0.8), 0.03);
    for (const x of [-0.35, 0.35]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 10), P.dark); r.position.set(x, -0.6, 0.6); r.rotation.x = 0.6; g.add(r); }
    return g;
  }
  // Uranus: geplante NASA-Sonde „Uranus Orbiter and Probe“ – Körper mit großer Schüssel und drei Atom-Batterien
  function craftUranusOrbiter() {
    const P = probeMats(), g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 8), P.gold); body.rotation.x = Math.PI / 2; g.add(body);
    const dish = dishCap(PROBE_M, 1.4, 0.6); dish.rotation.x = -Math.PI / 2; dish.position.z = -0.5; g.add(dish);
    const entry = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 20), new THREE.MeshStandardMaterial({ color: srgb(0x0f766e), roughness: 0.6 })); entry.rotation.x = Math.PI / 2; entry.position.z = 0.9; g.add(entry);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5, r = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 10), P.dark); r.position.set(Math.sin(a) * 1.3, Math.cos(a) * 1.3, 0.1); r.rotation.x = Math.PI / 2; g.add(r); boom(g, P.steel, new V(0, 0, 0.1), r.position.clone(), 0.03); }
    return g;
  }
  // Neptun: „Voyager 2“ (flog 1989 vorbei) – riesige Schüssel, zehneckiger Körper, Arme für Atom-Batterien, Kameras und Magnetfeld-Messung
  function craftVoyager() {
    const P = probeMats(), g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 10), P.gold); body.rotation.x = Math.PI / 2; g.add(body);
    const dish = dishCap(PROBE_M, 2, 0.6); dish.rotation.x = -Math.PI / 2; dish.position.z = -0.05; g.add(dish);
    boom(g, P.steel, new V(0.6, 0, 0), new V(2.4, -0.4, 0.3), 0.04);
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 10), P.dark); r.position.set(1.6 + i * 0.4, -0.25 - i * 0.05, 0.2); r.rotation.z = Math.PI / 2; g.add(r); }
    boom(g, P.steel, new V(-0.6, 0, 0), new V(-2.3, 0.3, 0.3), 0.04);
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.35), P.dark); cam.position.set(-2.4, 0.35, 0.4); g.add(cam);
    boom(g, P.steel, new V(0, 0.5, 0), new V(-1.2, 4.5, -1), 0.02);
    return g;
  }
  // Sonne: „Parker Solar Probe“ – sechseckiger Hitzeschild (vorn weiß, hinten schwarz), kleiner Körper, schräge Solarflügel
  function craftParker() {
    const P = probeMats(), g = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.16, 6), [new THREE.MeshStandardMaterial({ color: srgb(0x111111), roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: srgb(0xf5f5f0), roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: srgb(0x111111), roughness: 0.8 })]);
    sh.rotation.x = Math.PI / 2; sh.position.z = 1.1; g.add(sh);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.2, 12), P.gold); body.rotation.x = Math.PI / 2; body.position.z = 0.2; g.add(body);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.5), P.cell); w.position.set(s * 0.9, 0, -0.3); w.rotation.set(0.9, 0, s * 0.3); g.add(w); }
    boom(g, P.steel, new V(0, 0, -0.4), new V(0, 0, -2.2), 0.025);
    return g;
  }

  // ---------- Was neben der Flugbahn passiert (je Ort anders) ----------
  function cloudDeckTex(tint) {
    const t = canvasTex(256, 256, (c) => {
      c.fillStyle = "rgba(0,0,0,0)"; c.clearRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) {
        const x0 = hash2(i, 1) * 256, y0 = hash2(i, 2) * 256, r = 18 + hash2(i, 3) * 40;
        for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { // über den Rand hinaus auf der anderen Seite weiter – keine Nähte beim Kacheln
          const x = x0 + ox, y = y0 + oy; if (x + r < 0 || x - r > 256 || y + r < 0 || y - r > 256) continue;
          const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, tint); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
    return t;
  }
  // Jupiter: Wolkendecken über und unter der Kapsel, die dunkler werden, je tiefer man kommt – dazu Blitze
  function sceneryJupiter(scene) {
    const decks = [[-13, "rgba(255,248,235,0.9)"], [15, "rgba(255,236,210,0.8)"]].map(([y, tint]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: cloudDeckTex(tint), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.userData.y = y; scene.add(m); return m;
    });
    const boltMat = new THREE.LineBasicMaterial({ color: 0xfff7cc, transparent: true, opacity: 0, fog: false });
    const pts = []; let x = 0, y = 12;
    for (let i = 0; i < 9; i++) { const nx = x + (hash2(i, 7) - 0.5) * 5, ny = y - 3; pts.push(x, y, 0, nx, ny, 0); x = nx; y = ny; }
    const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const bolt = new THREE.LineSegments(bg, boltMat); scene.add(bolt);
    const tone = new THREE.Color(), top = new THREE.Color(0xfff6e8), deep = new THREE.Color(0x8a5a32);
    return (dt, p, t, w) => {
      decks.forEach((d) => { d.position.set(p.x, p.y + d.userData.y, p.z); d.material.map.offset.set(p.x / 225, -p.z / 225); d.material.color.copy(tone.copy(top).lerp(deep, p.f)); });
      if (w.flash > 0.9 && boltMat.opacity < 0.1) bolt.position.set(p.x + (Math.random() - 0.5) * 60, p.y - 2, p.z + 60 + Math.random() * 60);
      boltMat.opacity = Math.max(0, w.flash || 0);
    };
  }
  // Saturn: der Mond Enceladus mit Eis-Fontänen am Südpol (Cassini ist 2015 mitten hindurchgeflogen)
  function scenerySaturn(scene, far) {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(26, 32, 20), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 }));
    moon.position.set(150, 40, 520); far.add(moon);
    const plumeMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,255,0.9)", "rgba(190,220,255,0.35)"), transparent: true, depthWrite: false, fog: false });
    const plumes = [];
    for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(plumeMat); s.scale.set(10, 38, 1); s.position.set(150 + (i - 2) * 6, 40 - 40 - i * 3, 520); far.add(s); plumes.push(s); }
    return (dt, p, t) => { plumes.forEach((s, i) => { s.scale.y = 34 + Math.sin(t * 1.5 + i) * 6; }); };
  }
  // Uranus: der kleine Mond Miranda mit seiner riesigen Klippe (20 Kilometer hoch – die höchste bekannte Steilwand)
  function sceneryUranus(scene, far) {
    const tex = canvasTex(256, 128, (c) => {
      c.fillStyle = "#9ca3af"; c.fillRect(0, 0, 256, 128);
      c.strokeStyle = "rgba(60,60,70,0.6)"; c.lineWidth = 6;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(90 + i * 8, 20); c.lineTo(120 + i * 8, 64); c.lineTo(90 + i * 8, 108); c.stroke(); } // Winkel-Muster
      c.fillStyle = "rgba(230,230,235,0.5)"; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(hash2(i, 1) * 256, hash2(i, 2) * 128, 2 + hash2(i, 3) * 5, 0, 7); c.fill(); }
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(22, 32, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    moon.position.set(-170, 60, 560); far.add(moon);
    return (dt) => { moon.rotation.y += dt * 0.05; };
  }
  // Neptun: helle Wolkenstreifen, die der Sturm quer vorbeijagt, und der Mond Triton mit dunklen Geysiren
  function sceneryNeptun(scene, far) {
    const mat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,255,0.95)", "rgba(200,220,255,0.3)"), transparent: true, depthWrite: false });
    const streaks = [];
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(mat); s.userData.z = -1e9; scene.add(s); streaks.push(s); }
    const triton = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 20), new THREE.MeshStandardMaterial({ color: 0xe8d8d0, roughness: 0.8 }));
    triton.position.set(190, 70, 600); far.add(triton);
    const gMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(40,30,30,0.8)", "rgba(40,30,30,0)"), transparent: true, depthWrite: false, fog: false });
    for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(gMat); s.scale.set(3, 22, 1); s.position.set(182 + i * 7, 90, 590); far.add(s); }
    return (dt, p, t, w, wind) => {
      for (const s of streaks) {
        if (s.userData.z < p.z - 14 || Math.abs(s.position.x - p.x) > 90) { s.userData.z = p.z + 30 + Math.random() * 160; s.position.set(p.x + (Math.random() > 0.5 ? -70 : 70), p.y + (Math.random() - 0.5) * 30, s.userData.z); s.scale.set(14 + Math.random() * 14, 1.2, 1); }
        s.position.x += (wind * 6 + (wind >= 0 ? 12 : -12)) * dt;
      }
    };
  }
  // Sonne: glühende Bögen aus Gas (Protuberanzen), unter denen man hindurchfliegt
  function scenerySonne(scene) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    const loops = [];
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(26, 1.4, 8, 40, Math.PI), mat); m.userData.z = -1e9; scene.add(m); loops.push(m); }
    return (dt, p, t) => {
      for (const m of loops) {
        if (m.userData.z < p.z - 20) { m.userData.z = p.z + 120 + Math.random() * 200; m.position.set((Math.random() - 0.5) * 20, -18, m.userData.z); m.rotation.y = (Math.random() - 0.5) * 0.8; }
        m.scale.y = 1 + 0.08 * Math.sin(t * 2 + m.userData.z);
      }
      mat.opacity = 0.45 + 0.15 * Math.sin(t * 3);
    };
  }

  // Was jede Sonde sieht und erlebt. sky/fog: [am Anfang, am Ende] des Flugs · puff: Teilchen, die vorbeiziehen ·
  // rocks: Hindernisse (null = keine) · wind(t, Fortschritt) = seitliche Kraft · instr(Fortschritt) = Anzeige unten links
  const PROBES = {
    jupiter: {
      sky: [0x05060c, 0x3a2210], fog: [[400, 2600], [20, 150]], stars: true, shield: false, craft: craftGalileo, scenery: sceneryJupiter,
      planet: { r: 640, from: [0, -720, 620], to: [0, -660, 260] },
      puff: { inner: "rgba(255,236,200,1)", outer: "rgba(214,160,100,0.85)", size: [5, 14], opacity: 0.5, from: 0.12 },
      wind: (t, f) => (f > 0.25 ? 5 * Math.sin(t * 0.6) + 3 * Math.sin(t * 1.7 + 1) : 0),
      instr: (f) => ["⬇️", `${Math.round((f * 150) / 5) * 5} km tief`],
      update(w, p, f, dt) { // in der Tiefe: Wetterleuchten
        w.flash = Math.max(0, (w.flash || 0) - dt * 3);
        if (f > 0.7 && Math.random() < dt * 0.5) { w.flash = 1; }
        w.ambient.intensity = 0.75 + w.flash * 1.6;
        w.planet.visible = f < 0.4;
      }
    },
    saturn: {
      sky: [0x05060c, 0x05060c], fog: [[600, 4000], [600, 4000]], stars: true, shield: false, craft: craftCassini, scenery: scenerySaturn,
      planet: { r: 330, from: [-300, -153, 560], to: [-300, -153, 440] }, // so nah, dass die schräge Ring-Ebene genau durch die Flugbahn geht
      puff: { inner: "rgba(255,255,255,1)", outer: "rgba(200,225,255,0.8)", size: [0.25, 0.8], opacity: 0.9, from: 0 },
      rocks: { count: 18, size: [0.7, 2.0], color: 0xdfeefc, glow: false },
      instr: (f) => ["🛰️", `${fmtInt(lerp(180000, 75000, f) / 1000) } Tsd. km bis Saturn`],
      update() {}
    },
    uranus: {
      sky: [0x04070d, 0x04070d], fog: [[600, 4000], [600, 4000]], stars: true, shield: false, craft: craftUranusOrbiter, scenery: sceneryUranus,
      planet: { r: 300, from: [400, 30, 950], to: [330, 30, 640] },
      puff: { inner: "rgba(210,250,255,1)", outer: "rgba(150,225,235,0.7)", size: [0.4, 1.4], opacity: 0.55, from: 0 },
      wind: (t) => 2 * Math.sin(t * 0.5),
      instr: (f) => ["🌡️", `−${Math.round(lerp(180, 224, f))} °C`],
      update(w, p, f, dt) { w.planet.rotation.x += dt * 0.02; }
    },
    neptun: {
      sky: [0x030614, 0x061233], fog: [[500, 3500], [90, 900]], stars: true, shield: false, craft: craftVoyager, scenery: sceneryNeptun,
      planet: { r: 300, from: [-380, -50, 900], to: [-300, -80, 560] },
      puff: { inner: "rgba(235,245,255,1)", outer: "rgba(120,160,255,0.75)", size: [1.5, 6], opacity: 0.5, from: 0 },
      wind: (t, f) => (9 * Math.sin(t * 0.5) + 5 * Math.sin(t * 1.3 + 1)) * (0.4 + 0.6 * f),
      instr: (f) => ["💨", `Wind: ${fmtInt(Math.round(lerp(400, 2100, f) / 50) * 50)} km/h`],
      update() {}
    },
    sonne: {
      sky: [0x120600, 0x2b0d00], fog: [[900, 5000], [900, 5000]], stars: false, shield: true, craft: craftParker, scenery: scenerySonne,
      planet: { r: 760, from: [0, -60, 1700], to: [0, -60, 1080] },
      puff: { inner: "rgba(255,240,180,1)", outer: "rgba(255,140,30,0.8)", size: [0.3, 1.0], opacity: 0.9, from: 0 },
      rocks: { count: 12, size: [1.2, 2.4], glow: true },
      instr: (f) => ["🌡️", `Hitzeschild: ${fmtInt(Math.round(lerp(300, 1400, f) / 50) * 50)} °C`],
      update(w, p, f, dt) { w.planet.rotation.y += dt * 0.01; }
    }
  };

  function buildProbeWorld() {
    const C = PROBES[bodyId];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.sky[0]);
    scene.fog = new THREE.Fog(C.sky[0], C.fog[0][0], C.fog[0][1]);
    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 6000);
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.3);
    scene.add(ambient, sun, sun.target);

    // „Ferne“: Sterne und Planet wandern mit der Sonde mit, damit sie unendlich weit weg wirken
    const far = new THREE.Group(); scene.add(far);
    if (C.stars) {
      const n = W.fast ? 900 : 1800, sp = new Float32Array(n * 3), v = new V();
      for (let i = 0; i < n; i++) { v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(3000); sp.set([v.x, v.y, v.z], i * 3); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
      far.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0.85, fog: false })));
    }
    const planet = planetModel(bodyId, C.planet.r);
    far.add(planet);
    if (bodyId === "sonne") { // Strahlenkranz
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,220,150,0.9)", "rgba(255,120,30,0.35)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
      glow.scale.setScalar(C.planet.r * 4.4); planet.add(glow); glow.scale.divideScalar(planet.scale.x);
    }

    const craft = C.craft ? C.craft() : makeSpaceProbe(C.shield); scene.add(craft);
    if (C.craft) craft.scale.setScalar(0.68); // kleiner, damit die große Schüssel das nächste Tor nicht verdeckt
    const extra = C.scenery ? C.scenery(scene, far) : null;
    const gates = cfg.discoveries.map((d) => { const g = makeGate(d); scene.add(g); return g; });

    // Teilchen, die vorbeiziehen (Wolkenfetzen, Eiskristalle, Funken)
    const puffMat = new THREE.SpriteMaterial({ map: glowTexture(C.puff.inner, C.puff.outer), transparent: true, opacity: C.puff.opacity, depthWrite: false });
    const puffs = [];
    for (let i = 0; i < (W.fast ? 50 : 90); i++) { const s = new THREE.Sprite(puffMat); s.userData.z = -1e9; scene.add(s); puffs.push(s); }
    // Hindernisse: Eisbrocken (Saturn) oder Glutbälle (Sonne)
    const rocks = [];
    if (C.rocks) for (let i = 0; i < C.rocks.count; i++) {
      const m = C.rocks.glow
        ? new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,250,200,1)", "rgba(255,110,20,0.9)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }))
        : new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: C.rocks.color, roughness: 0.6, flatShading: true }));
      m.userData = { z: -1e9, r: 1 }; scene.add(m); rocks.push(m);
    }
    return { scene, camera, ambient, sun, far, planet, craft, gates, puffs, rocks, extra, stations: {} };
  }

  // Tore der Reihe nach vor die Sonde legen (seitlich versetzt, damit man lenken muss)
  function placeGate(g, i, z, nearX = 0, nearY = 0) {
    const u = g.userData;
    u.z = z; u.passed = false;
    g.position.set(nearX + (hash2(i + 1, z * 0.01) - 0.5) * 17, nearY + (hash2(i + 7, z * 0.013) - 0.5) * 9, z);
    g.position.x = Math.max(-9, Math.min(9, g.position.x)); g.position.y = Math.max(-4.5, Math.min(4.5, g.position.y));
    g.visible = true;
  }
  function refreshGates() {
    for (const g of world.gates) {
      const u = g.userData, done = !!foundMap()[u.key], c = done ? 0x4ade80 : 0x7dd3fc;
      u.mat.color.set(c); u.halo.color.set(c);
      u.icon.visible = done; u.mystery.visible = !done; // was hinter einem Tor steckt, sieht man erst nach der Entdeckung
    }
  }
  function enterProbe() {
    if (!worlds[bodyId]) worlds[bodyId] = buildProbeWorld();
    world = worlds[bodyId];
    S.scene = world.scene; S.camera = world.camera;
    W.renderer.shadowMap.enabled = false;
    setupInput(); S.resize(); resetJoy();
    probe = { x: 0, y: 0, z: 0, vx: 0, vy: 0, t: 0, f: 0, shake: 0, bumpAt: -9, missAt: -9 };
    world.gates.forEach((g, i) => { placeGate(g, i, 150 + i * GATE_GAP); g.userData.told = false; });
    for (const s of world.puffs) s.userData.z = -1e9;
    for (const r of world.rocks) r.userData.z = -1e9;
    world.camera.position.set(0, 2.4, -9.5);
    view.special = null; experiment = null; boarding = null; jumpPressed = actionPressed = false;
    quizDone = (G.state.surfaceQuiz && G.state.surfaceQuiz[bodyId] != null) || false;
    updateCounter();
    $("surfLabels").innerHTML = ""; $("surfAction").classList.add("hidden");
    $("scope").classList.add("hidden"); $("scopeUi").classList.add("hidden");
    const hud = $("surfaceHud"); hud.classList.remove("hidden", "scoping", "driving"); hud.classList.add("probing");
    $("suit").classList.remove("cold");
    $("suitState").textContent = cfg.course.note;
    S.active = true;
    Sound.engine(0.35);
    const rest = cfg.discoveries.length - foundCount();
    if (rest === 0 && !quizDone) setTimeout(() => { if (S.active) quizSoon(); }, 1500);
    else setTimeout(() => { if (S.active) radio(rest === 0 ? cfg.radio.quizDone : foundCount() === 0 ? cfg.radio.start : cfg.radio.back, { rest }, cfg.flight && cfg.flight.who); }, 700);
  }
  function updateProbe(dt, elapsed) {
    const p = probe, w = world, C = PROBES[bodyId], c = w.camera;
    const mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x;
    const my = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
    jumpPressed = actionPressed = false;
    if (!UI.modalOpen()) {
      p.t += dt;
      const passed = w.gates.filter((g) => g.userData.passed).length;
      p.f += (passed / w.gates.length - p.f) * Math.min(1, dt * 0.6); // Fortschritt des Flugs (0 … 1), weich nachgeführt
      // Steuern: rechts auf dem Bildschirm ist −X (die Kamera schaut nach +Z). Dazu schiebt der Wind.
      const wind = C.wind ? C.wind(p.t, p.f) : 0;
      p.vx += (-mx * 13 + wind - p.vx) * Math.min(1, dt * 4);
      p.vy += (my * 10 - p.vy) * Math.min(1, dt * 4);
      p.x = Math.max(-LANE_X, Math.min(LANE_X, p.x + p.vx * dt));
      p.y = Math.max(-LANE_Y, Math.min(LANE_Y, p.y + p.vy * dt));
      p.z += PROBE_SPEED * dt;

      // Mess-Tore: durchgeflogen → Entdeckung; verfehlt → das Tor kommt ein Stück weiter vorn noch einmal
      w.gates.forEach((g, i) => {
        const u = g.userData;
        if (u.passed || p.z < u.z) return;
        if (Math.hypot(p.x - g.position.x, p.y - g.position.y) < GATE_R + 0.5) {
          u.passed = true; g.visible = false;
          const d = cfg.discoveries[i];
          if (foundMap()[u.key]) { Sound.correct(); UI.toast(`✓ ${d.icon} ${d.title}`, "gold"); }
          else discover(u.key);
        } else {
          placeGate(g, i, p.z + 80, p.x * 0.5, p.y * 0.5);
          if (elapsed - p.missAt > 5) { p.missAt = elapsed; UI.toast(cfg.course.miss); }
        }
      });

      // Flugleiterin kündigt das nächste Tor an
      if (cfg.flight) { const g = w.gates.filter((x) => !x.userData.passed).sort((x, y) => x.userData.z - y.userData.z)[0]; if (g && g.userData.z - p.z < 75 && !g.userData.told && !foundMap()[g.userData.key]) { /* schon Entdecktes nicht nochmal ankündigen */ g.userData.told = true; radio(cfg.flight.gates[w.gates.indexOf(g)], null, cfg.flight.who); } }
      // Teilchen: was hinter der Sonde verschwindet, taucht vorn wieder auf
      const showPuffs = p.f >= C.puff.from;
      for (const s of w.puffs) {
        const u = s.userData;
        if (u.z < p.z - 14) {
          u.z = p.z + 50 + Math.random() * 190;
          s.position.set(p.x + (Math.random() - 0.5) * 70, p.y + (Math.random() - 0.5) * 40, u.z);
          s.scale.setScalar(lerp(C.puff.size[0], C.puff.size[1], Math.random()));
        }
        s.position.x += wind * 1.6 * dt; // der Wind treibt sie quer durchs Bild
        s.visible = showPuffs;
      }
      // Hindernisse: Anstoßen rüttelt die Sonde durch, mehr passiert nicht
      for (const r of w.rocks) {
        const u = r.userData;
        if (u.z < p.z - 12) {
          u.z = p.z + 90 + Math.random() * 160;
          if (w.gates.some((g) => !g.userData.passed && Math.abs(g.userData.z - u.z) < 14)) u.z += 28; // nicht direkt vor ein Tor
          u.r = lerp(C.rocks.size[0], C.rocks.size[1], Math.random());
          r.position.set((Math.random() - 0.5) * 2 * LANE_X, (Math.random() - 0.5) * 2 * LANE_Y, u.z);
          r.scale.setScalar(C.rocks.glow ? u.r * 2.6 : u.r);
        }
        if (!C.rocks.glow) { r.rotation.x += dt * 0.5; r.rotation.y += dt * 0.3; }
        if (Math.abs(u.z - p.z) < 1.6 && Math.hypot(r.position.x - p.x, r.position.y - p.y) < u.r + 1.1) {
          u.z = -1e9; r.position.z = p.z - 50;
          p.shake = 0.6; p.vx += (p.x - r.position.x) * 6; p.vy += (p.y - r.position.y) * 6;
          Sound.land();
          if (elapsed - p.bumpAt > 4) { p.bumpAt = elapsed; UI.toast(cfg.course.bump); }
        }
      }

      // Umgebung: Himmel und Dunst je nach Fortschritt, der Planet rückt näher
      w.scene.background.setHex(C.sky[0]).lerp(tmpColor.setHex(C.sky[1]), p.f);
      w.scene.fog.color.copy(w.scene.background);
      w.scene.fog.near = lerp(C.fog[0][0], C.fog[1][0], p.f); w.scene.fog.far = lerp(C.fog[0][1], C.fog[1][1], p.f);
      const a = C.planet.from, b = C.planet.to;
      w.planet.position.set(lerp(a[0], b[0], p.f), lerp(a[1], b[1], p.f), lerp(a[2], b[2], p.f));
      C.update(w, p, p.f, dt);
      if (w.extra) w.extra(dt, p, p.t, w, wind);
      p.shake = Math.max(0, p.shake - dt * 1.5);
    }

    w.craft.position.set(p.x, p.y, p.z);
    w.craft.rotation.set(-p.vy * 0.03, 0, p.vx * 0.035);
    w.far.position.set(p.x * 0.75, p.y * 0.75, p.z);
    const sh = p.shake * 0.5;
    // Kamera etwas oberhalb: die Sonde sitzt im unteren Bilddrittel und verdeckt das nächste Tor nicht
    c.position.set(p.x * 0.75 + (Math.random() - 0.5) * sh, p.y * 0.75 + 3.4 + (Math.random() - 0.5) * sh, p.z - 10);
    c.lookAt(p.x * 0.9, p.y * 0.9 + 1.6, p.z + 25);
    w.sun.position.set(p.x - 30, p.y + 60, p.z - 40); w.sun.target.position.set(p.x, p.y, p.z);

    const [icon, value] = C.instr(p.f);
    if ($("suitTemp").textContent !== value) { $("suitIcon").textContent = icon; $("suitTemp").textContent = value; }
    radioTimer -= dt; if (radioTimer <= 0) $("radio").classList.add("hidden");
  }
  const tmpColor = new THREE.Color();

  // =========================================================
  //  Orte: was jeder Himmelskörper zusätzlich zum gemeinsamen Ablauf mitbringt
  //  build = Welt aufbauen · reset = beim Betreten zurückstellen · update = pro Bild · actions = Knopf an einer Station
  // =========================================================
  const SITES = {
    mond: {
      build: buildMoon,
      reset() {
        world.hammer.visible = world.feather.visible = world.telescope.visible = true;
        world.beam.visible = world.pulse.visible = world.cmpMoon.visible = false;
        applySky(0);
      },
      update(dt, busy, elapsed) {
        updateExperiment(dt);
        updateLife(dt, elapsed, busy);
        world.earth.rotation.y += dt * 0.02;
        const [mx, mz] = world.L.mondstein, mr = Math.hypot(ast.pos.x - mx, ast.pos.z - mz);
        if (ast.onGround && mr > MOAT_R[0] - 0.1 && mr < MOAT_R[3] && ast.pos.y < world.height(mx, mz) - 0.3 && elapsed - (world.moatTold || -99) > 25) { // in den Graben gefallen
          world.moatTold = elapsed;
          if (guide && guide.on) guideSay(cfg.moat.fell); else radio(cfg.moat.fell);
        }
      },
      actions: { himmel: startScope, spiegel: startLaser, antenne: startLapse, fallversuch: startFall }
    },
    mars: {
      build: buildMars,
      reset() {
        marsSky(0); resetMagnet();
        world.telescope.visible = true;
        world.everest.visible = world.zugspitze.visible = world.drill.userData.ice.visible = false;
        for (const s of world.samples) s.mk.visible = false;
        world.rover.userData.cells.color.copy(world.rover.userData.clean);
        world.heli.position.y = world.heliY;
        world.drill.userData.rod.position.y = ROD_Y;
        const [x, z] = world.L.roverStart;
        world.rover.position.set(x, world.height(x, z), z); world.rover.userData.heading = MARS_ROVER_PARK; roverTilt(world.rover, MARS_ROVER_PARK);
        world.observatory.userData.open = world.observatory.userData.target = 0; world.observatory.userData.set(0);
      },
      update(dt, busy, elapsed) {
        updateDevil(dt, elapsed);
        updatePatrol(dt);
        updateNpcs(dt, elapsed, busy);
        updateShuttle(dt);
        world.blink.forEach((m, i) => { m.visible = ((elapsed * 0.9 + i * 0.37) % 1) < 0.45; });
        for (const h of world.station.userData.turn) h.rotation.y = Math.sin(elapsed * 0.12) * 1.4; // Antenne sucht die Erde
        world.weather.userData.spin.rotation.y += dt * (3 + Math.sin(elapsed * 0.37) * 1.5); // Windmesser dreht sich mit den Böen
        world.weather.userData.vane.rotation.y = Math.sin(elapsed * 0.2) * 0.5;
        const ob = world.observatory.userData; // Klappkuppel der Sternwarte öffnet/schließt sich
        if (ob.open !== ob.target) { ob.open += Math.sign(ob.target - ob.open) * Math.min(Math.abs(ob.target - ob.open), dt * 0.7); ob.set(smooth(0, 1, ob.open)); }
        world.veils.rotation.y += dt * 0.004;
        world.phobos.rotation.y += dt * 0.05; world.deimos.rotation.y += dt * 0.03;
      },
      actions: { rover: startRover, vulkan: startHeli, monde: startMoons, eis: startEis, rost: startRost, abend: startAbend }
    },
    merkur: {
      build: buildMerkur,
      reset() {
        world.telescope.visible = world.sunGlow.visible = true;
        world.sunBig.visible = world.sunSmall.visible = world.meteor.visible = false;
        setOrrery(world.orrery, 0, 0);
      },
      update(dt, busy, elapsed) { updateLife(dt, elapsed, busy); },
      // Wettrennen: Die Erde läuft eine Runde (365 Tage), Merkur in derselben Zeit gut vier
      orrery: { earthLaps: 1, planetLaps: 365 / 88, vars: (f) => ({ erde: Math.floor(f * 365), planet: Math.floor((f * 365) / 88) }) },
      actions: { sonne: startSunScope, krater: startMeteor, jahr: startOrrery, groesse: startGuess, temperatur: startShadowRun }
    },
    pluto: {
      build: buildPluto,
      reset() {
        world.telescope.visible = true;
        world.cmpMoon.visible = world.beam.visible = world.pulse.visible = world.drone.userData.flames.visible = false;
        world.drone.position.y = world.droneY; world.drone.visible = true;
        setOrrery(world.orrery, 0, 0);
      },
      update(dt, busy, elapsed) {
        updateLife(dt, elapsed, busy);
      },
      grip: () => (inHeart(ast.pos.x, ast.pos.z) ? 0.16 : 1),
      // Wettrennen: Die Erde läuft 12 Runden, Pluto in derselben Zeit nur 12/248 einer Runde
      orrery: { earthLaps: 12, planetLaps: 12 / 248, vars: (f) => ({ erde: Math.floor(f * 12) }) },
      actions: { charon: startCharon, herz: startDrone, funk: startSignal, jahr: startOrrery, groesse: startGuess, eis: startCurling }
    },
    venus: {
      build: buildVenus,
      reset() {
        venusSky(0); resetCan();
        world.telescope.visible = true;
        world.globeE.rotation.y = world.globeV.rotation.y = 0;
      },
      update(dt, busy, elapsed) {
        updateLife(dt, elapsed, busy);
        const want = chal && chal.kind === "radar" ? 1 : 0, k = world.radarFog || 0;
        if (k !== want) { // Dunst zieht zu bzw. wird wieder dünner
          world.radarFog = Math.abs(want - k) < 0.01 ? want : k + (want - k) * Math.min(1, dt * 0.8);
          world.scene.fog.near = 18 - 15 * world.radarFog; world.scene.fog.far = 190 - 162 * world.radarFog;
        }
      },
      actions: { hitze: startHeat, druck: startPress, tag: startSpin, groesse: startGuess, abendstern: startEveningStar, venera: startRadar }
    },
    erde: {
      build: buildErde,
      reset() {
        erdeSky(1);
        world.telescope.visible = true; world.meteor.visible = false;
        world.rollRoof.userData.open = world.rollRoof.userData.target = 0; world.rollRoof.userData.set(0);
      },
      update(dt, busy, elapsed) {
        updateLife(dt, elapsed, busy);
        const [sx, sz] = world.L.see;
        world.clouds.rotation.y += dt * 0.004;
      },
      actions: { luft: startAir, stern: startShooting, tag: startDay, groesse: startGuess, mond: startMoonScope, wald: startSafari }
    }
  };

  if (/[?&]test/.test(location.search)) S._test = { navPath, navLine, navGrid, ast, view, get world() { return world; }, get boarding() { return boarding; }, get scope() { return view.special; }, get probe() { return probe; }, get guide() { return guide; }, discover, startAction, showFound, POSE, setBone, HATCH, setJoy: (x, y) => { joy.x = x; joy.y = y; } };
  return S;
})();
