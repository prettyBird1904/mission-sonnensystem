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
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const angleLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

  // ---------- Aufbau des Mondes ----------
  // Richtung ZUR Sonne: tief am Himmel → lange, deutliche Schatten
  const SUN_DIR = new V(-1, 0.32, -0.55).normalize();
  const MOON_LAYOUT = {
    rocket: [0, 0], spawn: [-6.9, 4], // Start neben der Leiter (siehe HATCH), aber außer Reichweite von „Einsteigen“
    fallversuch: [-7, 15], himmel: [12, 20], apollo: [-18, 32], boulder: [22, 34], waage: [4, 27],
    // Fundstücke (kleine goldene Lichter): Inhalte des Steckbriefs zum Selbst-Finden
    wegweiser: [-16, 8], mondstein: [25, -30], // mondstein liegt mitten in einem Krater
    // Mondstation „Wusstest du?“: Wand mit den Entdeckungs-Tafeln (Vorderseite zeigt zur Rakete), davor zwei Exponate zum Ausprobieren
    station: [2, 52], spiegel: [-4, 45], antenne: [8, 45]
  };
  const SHADOW_DIR = new V(-SUN_DIR.x, 0, -SUN_DIR.z).normalize(); // Schatten fallen weg von der Sonne

  // Gelände: sanfte Hügel, Krater [x, z, Radius, Tiefe], ebene Plätze [x, z, Radius] für Rakete und Stationen
  // extra(x, z): zusätzliche Formen (z. B. Sanddünen) – die ebenen Plätze bleiben trotzdem eben
  function makeHeight(craters, flats, seed = 0, extra = null) {
    return function height(x, z) {
      let h = (fbm2(x * 0.02 + seed, z * 0.02) - 0.5) * 6 + (fbm2(x * 0.12 + 7 + seed, z * 0.12) - 0.5) * 0.8;
      if (extra) h += extra(x, z);
      for (const [cx, cz, r, d] of craters) {
        const q = Math.hypot(x - cx, z - cz) / r;
        if (q < 1.7) { if (q < 1) h -= d * (1 - q * q); h += d * 0.45 * Math.exp(-Math.pow((q - 1) / 0.22, 2)); }
      }
      for (const [fx, fz, r] of flats) {
        const dd = Math.hypot(x - fx, z - fz);
        if (dd < r + 10) h *= smooth(r, r + 10, dd);
      }
      const edge = Math.hypot(x, z);
      h += smooth(170, 260, edge) * 30 * (0.6 + fbm2(x * 0.03, z * 0.03)); // Hügelkette am Rand
      return h;
    };
  }

  function regolithTexture() {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const n = fbm2(x * 0.08, y * 0.08) * 0.6 + hash2(x, y) * 0.4;
      const v = 120 + n * 90, k = (y * 256 + x) * 4;
      img.data[k] = img.data[k + 1] = v; img.data[k + 2] = v + 4; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv);
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
  // ---------- Echte NASA-Modelle (NASA 3D Resources): Habitat, Rover Perseverance, Hubschrauber Ingenuity ----------
  // Sie sind groß und Draco-komprimiert, darum werden sie erst beim ersten Besuch als Datei geladen (danach offline im Speicher).
  const NASA = {};
  const NASA_FILES = { "habitat-1": 11, "habitat-2": 11, ingenuity: 1.8, perseverance: 3.0 }; // Zielbreite in Metern
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
  function setArm(rig, key, fwd, down) {
    const b = rig.bones[key]; if (!b) return;
    // Erst nach vorn drehen, dann absenken – so zeigt „nach vorn“ auch bei hängendem Arm nach vorn
    b.quaternion.copy(rig.rest[key]).multiply(qa.setFromAxisAngle(AX.z, fwd)).multiply(qa.setFromAxisAngle(AX.x, down));
  }
  const POSE = {};
  // Bewegungen nach Vorbild der Apollo-Filme: „Lope“ = gleitender Galopp mit kurzer Schwebephase,
  // Oberkörper leicht vorgebeugt, Arme angewinkelt vor dem Körper (der Anzug ist steif).
  function poseRig(rig, st) {
    const breathe = Math.sin(st.t * 1.4) * 0.015;
    let legL = 0, legR = 0, kneeL = 0, kneeR = 0, down = 1.3, fwd = 0.08, elbow = 0.3, lean = breathe, downL = null, downR = null;
    if (st.mode === "climb") {
      // Leiter hochsteigen: Hände und Füße greifen abwechselnd nach oben
      const s = Math.sin(st.phase);
      legL = 0.75 + 0.4 * s; legR = 0.75 - 0.4 * s;
      kneeL = -(0.95 + 0.45 * s); kneeR = -(0.95 - 0.45 * s);
      fwd = 1.3; elbow = 0.5; lean -= 0.06;
      downL = -0.15 - 0.35 * s; downR = -0.15 + 0.35 * s;
    } else if (st.mode === "lope") {
      lean -= 0.2 * st.speed;
      down = 1.0; fwd = 0.35; elbow = 0.75;
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
      const sw = Math.sin(st.phase) * 0.3 * st.speed;
      legL = sw; legR = -sw; kneeL = -Math.max(0, -Math.sin(st.phase)) * 0.4 * st.speed; kneeR = -Math.max(0, Math.sin(st.phase)) * 0.4 * st.speed;
      down = 1.15; fwd = 0.2; elbow = 0.55; lean -= 0.08 * st.speed;
    } else if (st.mode === "jump") {
      legL = 0.25; legR = 0.1; kneeL = -0.45; kneeR = -0.35;
      down = 0.85; fwd = 0.45; elbow = 0.6; lean -= 0.05;
    }
    if (st.hold) { down = 0.25; fwd = 1.35; elbow = 0.2; } // beide Arme waagerecht nach vorn
    if (st.work) { lean -= 0.35; fwd = 0.9; down = 0.7; elbow = 0.9 + 0.25 * Math.sin(st.t * 3); } // vorgebeugt, arbeitet mit den Händen
    setBone(rig, "legL", legL, 0, 0); setBone(rig, "legR", legR, 0, 0);
    setBone(rig, "kneeL", kneeL, 0, 0); setBone(rig, "kneeR", kneeR, 0, 0);
    setArm(rig, "armL", fwd, downL == null ? down : downL); setArm(rig, "armR", -fwd, downR == null ? down : downR);
    setBone(rig, "foreL", 0, 0, elbow); setBone(rig, "foreR", 0, 0, -elbow);
    setBone(rig, "spine", lean, 0, 0);
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
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 10, 0, Math.PI * 2, 0, 0.75), white);
    dish.position.y = -0.75; dish.castShadow = true; head.add(dish);
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
  // Mars-Forschungslager hinter der Tafelwand (lokal: Vorderseite = −Z): zwei Wohnmodule, ein Gewächshaus-Tunnel
  // mit Pflanzen unter rosa Pflanzenlampen, Sonnenkollektoren und ein Funkmast mit blinkendem Licht
  // Mars-Forschungslager aus fertigen Modellen (Kenney Space Kit): Hallen, Glas-Gewächshaus, Verbindungsgänge,
  // Generator, Fässer, große Antennenschüssel – dazu Sonnenkollektoren und blinkende Lichter
  function buildMarsCamp(g, add, hull, dark, lit) {
    // Am schönsten: das echte NASA-Habitat (Habitat Demonstration Unit), daneben Gewächshaus, Sonnenkollektoren und Funkmast
    const hab = nasaModel(["habitat-2", "habitat-1"], 16);
    if (hab) {
      hab.position.set(-17, 0, 10); hab.rotation.y = MARS_HAB_ROT; g.add(hab); // links neben der Tafelwand, damit man es ganz sieht
      marsGreenhouse(add, 14, 7);
      marsPanels(add, dark, [[21, 4], [23.5, 8], [26, 12]]);
      g.userData.blink.push(marsMast(add, hull, dark, 6, 16));
      g.userData.nasa = true;
      return;
    }
    if (!KIT.hangar_largeA) return buildMarsCampSimple(g, add, hull, dark, lit);
    const put = (name, s, x, z, ry = 0, y = 0) => { const m = kit(name, s); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
    // groß genug und weit genug hinten, dass das Lager über die Tafelwand hinausragt
    put("hangar_roundGlass", 4.6, -15, 16, Math.PI);         // Gewächshaus
    put("hangar_largeA", 4.6, 0.5, 17, Math.PI / 2);         // große Halle (quer)
    put("hangar_roundA", 4.6, 14, 16, Math.PI);              // runde Wohnhalle
    put("corridor_window", 4.6, -8.2, 16.5, Math.PI / 2);    // Gänge dazwischen
    put("corridor_window", 4.6, 8.8, 16.5, Math.PI / 2);
    put("satelliteDish_large", 5.5, 20, 24, -0.6);
    put("machine_generatorLarge", 3.2, 9, 3.2, Math.PI);
    put("machine_wireless", 3.2, -9.5, 3.6, Math.PI);
    put("barrels", 3.2, 13.5, 3, 0.4); put("barrel", 3.2, -13.5, 4.2); put("barrel", 3.2, -12.4, 3.2, 1);
    put("pipe_straight", 3.2, -8.2, 6.4, Math.PI / 2); put("chimney_detailed", 4.6, 5, 25);
    // Sonnenkollektoren rechts neben dem Lager
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.5, roughness: 0.3 });
    for (const [x, z] of [[18.5, 3], [20.5, 6.5], [22.5, 10]]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), dark), x, 0.7, z);
      const p = add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.5), panelMat), x, 1.45, z); p.rotation.x = -0.7;
    }
    // blinkende Positionslichter auf dem Dach und an der Antenne
    const light = (color, x, y, z) => add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color, toneMapped: false })), x, y, z, false);
    g.userData.blink.push(light(0xff3b30, 20, 7.4, 24), light(0x4ade80, 0.5, 7.2, 17), light(0xfcd34d, -15, 6.8, 16));
  }
  const MARS_HAB_ROT = 0; // Drehung des NASA-Habitats (Vorderseite mit Flagge zum Platz)
  function marsNasaColliders([sx, sz]) {
    const c = [[sx - 22, sz + 10, 5.5], [sx - 12, sz + 10, 5.5], [sx + 12, sz + 7, 2.4], [sx + 16, sz + 7, 2.4], [sx + 21, sz + 4, 0.5], [sx + 23.5, sz + 8, 0.5], [sx + 26, sz + 12, 0.5], [sx + 6, sz + 16, 0.4]];
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx + x, sz + 0.1, 1]); // Tafelwand
    return c;
  }
  // Hindernisse des Mars-Lagers (Weltkoordinaten)
  function marsCampColliders([sx, sz]) {
    const c = [[sx - 15, sz + 16, 7], [sx - 4, sz + 17, 5], [sx + 5, sz + 17, 5], [sx + 14, sz + 16, 5], [sx + 20, sz + 24, 2.2], [sx + 9, sz + 3.2, 1.6],
      [sx - 9.5, sz + 3.6, 1.2], [sx + 13.5, sz + 3, 1.2], [sx - 13, sz + 3.7, 1], [sx + 18.5, sz + 3, 0.5], [sx + 20.5, sz + 6.5, 0.5], [sx + 22.5, sz + 10, 0.5]];
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx + x, sz + 0.1, 1]); // Tafelwand
    return c;
  }
  function buildMarsCampSimple(g, add, hull, dark, lit) {
    const accent = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.5 });
    const module = (x, z, r, h) => {
      add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), hull), x, h / 2, z).receiveShadow = true;
      add(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), hull), x, h, z);
      add(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.25, 28), accent), x, h * 0.72, z, false);
      for (const a of [-0.45, 0, 0.45]) { // Fenster auf der Vorderseite
        const w = add(new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), lit), x + Math.sin(a) * (r + 0.02), h * 0.45, z - Math.cos(a) * (r + 0.02), false);
        w.rotation.y = Math.PI + a;
      }
    };
    module(-1.5, 8.2, 3, 3.2);
    module(4.4, 7.6, 2.2, 2.6);
    add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 1.6), hull), 1.9, 0.9, 7.9);
    const door = add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.9), dark), -1.5, 0.95, 5.18, false); door.rotation.y = Math.PI; // Luftschleuse
    marsGreenhouse(add, -10.5, 6.5);
    marsPanels(add, dark, [[9.5, 4.5], [11.5, 7], [13.5, 9.5]]);
    g.userData.blink.push(marsMast(add, hull, dark, 7, 11));
    const green = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4ade80, toneMapped: false })), -1.5, 4.9, 8.2, false);
    g.userData.blink.push(green);
  }
  // Gewächshaus: halbe Glasröhre (8 m lang, entlang X), innen Beete mit Pflanzen und rosa leuchtende Pflanzenlampen
  function marsGreenhouse(add, cx, cz) {
    const glass = new THREE.MeshStandardMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
    const tunnel = add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 8, 24, 1, true, 0, Math.PI), glass), cx, 0, cz, false);
    tunnel.rotation.z = Math.PI / 2;
    const frame = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.4, roughness: 0.5 });
    for (let i = -2; i <= 2; i++) { // Rippen des Glasdachs
      const rib = add(new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.05, 6, 24, Math.PI), frame), cx + i * 1.9, 0, cz, false); rib.rotation.y = Math.PI / 2;
    }
    for (const e of [-1, 1]) {
      const cap = add(new THREE.Mesh(new THREE.CircleGeometry(2.2, 20, 0, Math.PI), glass), cx + e * 4, 0, cz, false);
      cap.rotation.y = Math.PI / 2;
    }
    const soil = new THREE.MeshStandardMaterial({ color: 0x3b2718, roughness: 1 }), leaf = new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.8, flatShading: true });
    const grow = new THREE.MeshBasicMaterial({ color: 0xf472b6, toneMapped: false });
    for (const dz of [-0.8, 0.8]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(7, 0.35, 0.7), soil), cx, 0.18, cz + dz, false);
      for (let i = 0; i < 10; i++) add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), leaf), cx - 3.3 + i * 0.73, 0.55, cz + dz, false);
      add(new THREE.Mesh(new THREE.BoxGeometry(7, 0.05, 0.08), grow), cx, 1.75, cz + dz, false);
    }
  }
  function marsPanels(add, dark, spots) {
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.5, roughness: 0.3 });
    for (const [x, z] of spots) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), dark), x, 0.7, z);
      const p = add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.5), panelMat), x, 1.45, z); p.rotation.x = -0.7;
    }
  }
  // Funkmast mit Schüssel und blinkendem rotem Licht (liefert das Licht zurück)
  function marsMast(add, hull, dark, x, z) {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.5, 8), dark), x, 2.75, z);
    const dish = add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 6, 0, Math.PI * 2, 0, 0.9), hull), x, 4.6, z - 0.4); dish.rotation.x = -1.1;
    return add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false })), x, 5.6, z, false);
  }

  function makeStation(discoveries, name, style = "") {
    const g = new THREE.Group();
    const hull = new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.6, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.5, metalness: 0.4 });
    const lit = new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: 0xfde68a, emissiveIntensity: 0.8 });
    const add = (m, x, y, z, shadow = true) => { m.position.set(x, y, z); m.castShadow = shadow; g.add(m); return m; };
    g.userData.blink = [];
    if (style === "mars") buildMarsCamp(g, add, hull, dark, lit);
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
    add(new THREE.Mesh(new THREE.BoxGeometry(15.6, 3.7, 0.3), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 })), 0, 1.85, 0).receiveShadow = true;
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
    const panels = discoveries.map((d, i) => {
      const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256;
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      add(new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })),
        (2 - (i % 5)) * 3, i < 5 ? 2.75 : 1.15, -0.16, false).rotation.y = Math.PI;
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
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 40), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, opacity: 0.75, ...add }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
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
    g.userData = { beam, ring, holo, setIcon, phase: Math.random() * 6 };
    return g;
  }
  // Hologramme schweben leicht auf und ab und werden in der Ferne etwas größer, damit man sie auch von weitem findet
  function animateMarkers(elapsed) {
    const c = world.camera;
    for (const st of Object.values(world.stations)) {
      const m = st.marker; if (!m.visible) continue;
      const u = m.userData, d = c.position.distanceTo(m.position);
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
      const [ox, oz] = offsets[key] || [0, 0];
      const mk = B.on(makeMarker(), x + ox, z + oz);
      if (cfg.stations[key].small) mk.scale.setScalar(0.7); // Fundstück: nur ein kleines Licht
      if (cfg.stations[key].info) mk.visible = false;              // Tafelwand: keine Entdeckung, also kein Licht
      stations[key] = { marker: mk, x: mk.position.x, z: mk.position.z };
    }
    return stations;
  }
  // Tafelwand der Station als Kette aus Kreis-Hindernissen, dazu Kuppel, Wohnmodul und Mast des Sonnensegels
  function stationColliders([sx0, sz0]) {
    const c = [[sx0, sz0 + 7.5, 6.4], [sx0 - 13, sz0 + 6.5, 2.4], [sx0 - 8.5, sz0 + 6.5, 2.4], [sx0 + 11, sz0 + 6, 0.5]];
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx0 + x, sz0 + 0.1, 1]);
    return c;
  }

  // ---------- Mond ----------
  function buildMoon() {
    const L = { ...MOON_LAYOUT };
    L.shadowSpot = [L.boulder[0] + SHADOW_DIR.x * 12, L.boulder[1] + SHADOW_DIR.z * 12];
    const craters = [[60, -20, 14, 2.2], [-50, 10, 10, 1.6], [12, 95, 18, 2.6], [-70, 70, 12, 1.8], [80, 60, 9, 1.4],
      [-30, -40, 16, 2.4], [40, -70, 11, 1.8], [-95, -30, 20, 3], [0, -95, 13, 2], [100, 10, 8, 1.2], [-15, 75, 7, 1.1],
      [55, 25, 5, 0.7], [-45, 30, 4, 0.6], [25, -30, 6, 0.9]];
    const flats = [[0, 0, 11], [...L.fallversuch, 5], [...L.himmel, 5], [...L.apollo, 10], [...L.boulder, 7], [...L.shadowSpot, 8], [...L.waage, 3], [...L.station, 16]];
    const B = buildBase({
      height: makeHeight(craters, flats),
      sky: 0x000000, stars: true, sunSize: 160,
      ground: 0x86837d, rock: 0x6b6863,
      tint: (x, z) => { const m = 0.72 + 0.28 * smooth(0.35, 0.6, fbm2(x * 0.01 + 3, z * 0.01)); return [m, m, m * 1.02]; }, // dunklere „Meere“
      keepFree: [[...L.fallversuch, 5], [...L.himmel, 5], [...L.apollo, 9], [...L.shadowSpot, 7], [...L.spawn, 4],
        [...L.waage, 4], [...L.wegweiser, 3], [...L.mondstein, 3], [L.station[0], L.station[1] + 2, 18]],
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
    const lander = on(makeLander(), ...L.apollo);
    lander.rotation.y = 0.6;
    const flag = on(makeFlag(), L.apollo[0] + 4.5, L.apollo[1] - 2.5);
    flag.rotation.y = -0.4;

    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x5f5f65, roughness: 1, flatShading: true }));
    boulder.scale.set(7, 8.5, 6.5); boulder.rotation.set(0.2, 0.7, 0.1);
    boulder.castShadow = true; boulder.receiveShadow = true;
    on(boulder, ...L.boulder, 5.5);

    const telescope = on(makeTelescope(earthDir), ...L.himmel);
    const scale = on(makeScale(), ...L.waage);
    scale.rotation.y = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);
    on(makeReflector(), ...L.spiegel).rotation.y = Math.atan2(earthDir.x, earthDir.z);
    const station = on(makeStation(cfg.discoveries, "Mondstation"), ...L.station);
    // Laserstrahl zwischen Spiegel und Erde (nur während der Messung sichtbar)
    const laserFrom = new V(L.spiegel[0], height(...L.spiegel) + 0.5, L.spiegel[1]);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 880, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.copy(laserFrom).addScaledVector(earthDir, 440);
    beam.quaternion.setFromUnitVectors(new V(0, 1, 0), earthDir);
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(220,255,220,1)", "rgba(74,222,128,0.7)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    beam.visible = pulse.visible = false;
    scene.add(beam, pulse);
    on(makeSignpost("ERDE", "384.400 km"), ...L.wegweiser).rotation.y = Math.atan2(L.wegweiser[0], L.wegweiser[1]) + Math.PI; // Schild zeigt zur Rakete
    on(makeAntenna(earthDir), ...L.antenne);
    on(makeMoonRock(), ...L.mondstein, 0.18);
    const table = on(makeTable(), ...L.fallversuch);
    const hammer = makeHammer(), feather = makeFeather();
    hammer.scale.setScalar(1.6); feather.scale.setScalar(1.6);
    hammer.rotation.z = Math.PI / 2; feather.rotation.z = Math.PI / 2;
    hammer.position.set(-0.3, 1.06, 0); feather.position.set(0.3, 1.04, 0);
    table.add(hammer, feather);

    // Fußabdrücke von 1969 rund um die Fähre (bleiben, weil es keinen Wind gibt)
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 3.2, r = 4.5 + (i % 7) * 0.9;
      const x = L.apollo[0] + Math.cos(a) * r + ((i % 2) - 0.5) * 0.4, z = L.apollo[1] + Math.sin(a) * r;
      const fp = new THREE.Mesh(fpGeo, fpMat);
      fp.position.set(x, height(x, z) + 0.03, z); fp.rotation.y = -a;
      scene.add(fp);
    }

    // Markierungen (Lichtsäulen) für die Entdeckungs-Stationen
    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2], // zuerst: die Exponate daneben haben Vorrang
      apollo: L.apollo, himmel: L.himmel, temperatur: L.shadowSpot, fallversuch: L.fallversuch, waage: L.waage,
      spiegel: L.spiegel, wegweiser: L.wegweiser, antenne: L.antenne, mondstein: L.mondstein, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] },
    { apollo: [6, -5] });

    // Einfache Kreis-Hindernisse: [x, z, Radius]
    const colliders = [[0, 0, 1.8], [...L.boulder, 6.8], [...L.apollo, 3.2], [...L.fallversuch, 1], [...L.himmel, 0.6],
      [...L.spiegel, 0.5], [...L.wegweiser, 0.3], [...L.antenne, 0.6], [...L.mondstein, 0.4], [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25],
      ...stationColliders(L.station)];

    return { ...B, L, station, laserFrom, beam, pulse, earth, earthDir, cmpMoon, cmpRight, scale, lander, boulder, telescope, table, hammer, feather,
      stations, colliders, shadowCasters: [boulder, rocket, lander, station] };
  }

  // ---------- Zustand beim Erkunden ----------
  const ast = { pos: new V(), vy: 0, onGround: true, heading: 0, speed: 0, phase: 0, jumpBase: 0, maxY: 0, walked: 0, foot: 0 };
  const view = { yaw: 0, height: 3.2, look: new V(), special: null };
  const keys = {}, joy = { x: 0, y: 0 };
  let jumpPressed = false, actionPressed = false;
  let temp = { shown: 120, inShadow: false, shadowTime: 0, sunSeen: false, check: 0 };
  let radioTimer = 0, farWarned = 0, experiment = null, quizDone = false, boarding = null;

  function allQuestions() { return cfg.quiz.map((q) => ({ ...q, own: true })).concat(G.bodyById[bodyId].quiz || []); }
  function fmtVars(t, vars) {
    const std = { name: G.state.name, anzahl: cfg.discoveries.length, fragen: allQuestions().length };
    return t.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : std[k] != null ? std[k] : ""));
  }

  function radio(text, vars) {
    const msg = fmtVars(text, vars);
    $("radioText").textContent = msg;
    const r = $("radio"); r.classList.remove("hidden"); r.classList.remove("ping"); void r.offsetWidth; r.classList.add("ping");
    radioTimer = 14;
  }

  function foundMap() { return (G.state.found && G.state.found[bodyId]) || {}; }
  function foundCount() { return Object.keys(foundMap()).length; }

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
        ${d.gallery ? `<div class="gallery" id="discGallery"></div>` : d.photo ? `<img src="img/${d.photo}" alt="" class="disc-photo">` : ""}
        <p>${text}</p>
        <div class="row-gap"><button class="btn primary" id="discOk">Weiter erkunden ▶</button></div>
      </div>`);
    // Echte Fotos zum Durchblättern (aus der früheren Steckbrief-Galerie)
    if (d.gallery) UI.renderGallery($("discGallery"), (D.photos[bodyId] || []).filter((p) => d.gallery.includes(p.file)), 0, false, true);
    $("discOk").onclick = () => {
      UI.closeModal();
      if (known) return;
      const rest = cfg.discoveries.length - foundCount();
      if (rest > 0) radio(cfg.radio.found, { rest });
      else if (!quizDone) { radio(cfg.radio.allFound); setTimeout(startQuiz, 2500); }
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

  function startQuiz() {
    if (!S.active || UI.modalOpen()) { if (S.active) setTimeout(startQuiz, 1500); return; }
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
      document.querySelectorAll("#modalContent .answer").forEach((b) => b.onclick = () => {
        const ok = +b.dataset.k === q.c; if (ok) { right++; if (q.own) rightOwn++; Sound.correct(); } else Sound.wrong();
        document.querySelectorAll("#modalContent .answer").forEach((x) => { x.disabled = true; if (+x.dataset.k === q.c) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
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
        <div class="row-gap"><button class="btn primary" id="sqClose">👍 Super</button></div></div>`);
      if (right === qs.length) { Sound.fanfare(); UI.confetti(); }
      $("sqClose").onclick = () => { UI.closeModal(); radio(cfg.radio.quizDone); };
    };
    show();
  }

  // ---------- Eingabe ----------
  let inputReady = false, resetJoy = () => {};
  function setupInput() {
    if (inputReady) return; inputReady = true;
    window.addEventListener("keydown", (e) => {
      if (!S.active || e.target.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
      keys[k] = true;
      if (k === " " && !e.repeat) jumpPressed = true;
      if (k === "e" && !e.repeat) actionPressed = true;
    });
    window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
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
    bodyId = id; cfg = D.surfaces[id];
    worlds[id] = SITES[id].build();
  };
  let npcModels = [];

  S.enter = function (id, exitCb) {
    bodyId = id; cfg = D.surfaces[id]; onExit = exitCb; site = SITES[id];
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
    setTimeout(() => { if (S.active) radio(rest === 0 ? cfg.radio.quizDone : first ? cfg.radio.start : cfg.radio.back, { rest }); }, 700);
  };

  function exit() {
    if (!S.active) return;
    S.active = false; probe = null;
    Sound.engine(0); Sound.wind(0);
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
      n.el = document.createElement("div"); n.el.className = "label npc-bubble"; n.el.style.display = "none";
      host.appendChild(n.el);
    }
  }

  // ---------- pro Bild ----------
  const tmp = new V(), tmp2 = new V(), ray = new THREE.Raycaster();
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
    const LOPE_SPEED = 3.0;
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
    if (ast.onGround) ast.speed += (targetSpeed - ast.speed) * Math.min(1, dt * grip * (targetSpeed > ast.speed ? 3.0 : 3.4));
    const hx = Math.sin(ast.heading), hz = Math.cos(ast.heading);
    ast.pos.x += hx * ast.speed * dt; ast.pos.z += hz * ast.speed * dt;

    // Hindernisse & Grenze
    if (!boarding) for (const [cx, cz, r] of world.colliders) {
      const dx = ast.pos.x - cx, dz = ast.pos.z - cz, d = Math.hypot(dx, dz), min = r + 0.45;
      if (d < min && d > 0.001) { ast.pos.x = cx + (dx / d) * min; ast.pos.z = cz + (dz / d) * min; }
    }
    const far = Math.hypot(ast.pos.x, ast.pos.z);
    if (far > 150) {
      ast.pos.x *= 150 / far; ast.pos.z *= 150 / far;
      if (elapsed - farWarned > 12) { farWarned = elapsed; radio(cfg.radio.tooFar); }
    }

    // Springen & Lope-Schritte – mit moveGravity (etwas stärker als die echte Mond-Schwerkraft, fühlt sich weniger zäh an)
    const ground = H(ast.pos.x, ast.pos.z);
    if (jumpPressed && ast.onGround) {
      // Anzug + Rucksack wiegen so viel wie ein Erwachsener → auf dem Mond ca. 45 cm hoch, gut 1 s in der Luft (cfg.jump = Höhe in m)
      ast.vy = Math.sqrt(2 * g * cfg.jump); ast.onGround = false; ast.jumpBase = ast.pos.y; ast.maxY = ast.pos.y; ast.jumping = true; ast.hopping = false;
      ast.airT = 0; ast.airDur = 2 * ast.vy / g;
      Sound.whoosh();
      grains(ast.pos, 8, 0.6);
    } else if (ast.onGround && ast.speed > 0.7 && (ast.contact || 0) > 0.18 && !paused) {
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
          const h = Math.max(0, ast.maxY - ast.jumpBase);
          const jump = { hoehe: `${Math.round(h * 100)} Zentimeter`, zeit: ast.airT.toFixed(1).replace(".", ",") };
          const real = h > cfg.jump * 0.67; // an einem Hang zählt ein Sprung nicht
          if (real && foundMap().sprung) UI.toast(`🦘 ${jump.hoehe} hoch · ${jump.zeit} Sekunden in der Luft`, "gold");
          else if (real) discover("sprung", jump);
        }
      }
    } else {
      ast.contact = (ast.contact || 0) + dt;
      ast.pos.y += (ground - ast.pos.y) * Math.min(1, dt * 12);
    }

    // Langsames Gehen (ohne Hüpfer): Fußabdrücke nach Strecke
    if (ast.onGround && ast.speed > 0.15 && ast.speed <= 0.7) {
      ast.walked += ast.speed * dt;
      if (ast.walked > 0.55) { ast.walked = 0; ast.foot = 1 - ast.foot; footprint(ast.foot ? 0.17 : -0.17); }
    }

    if (boarding) updateBoarding(dt);

    // Astronaut darstellen
    const a = world.astronaut, u = a.userData;
    const speedFrac = boarding ? 0.8 : Math.min(1, ast.speed / LOPE_SPEED);
    ast.phase += dt * (boarding ? 6 : 1.5 + ast.speed * 3);
    a.position.set(ast.pos.x, ast.pos.y, ast.pos.z);
    a.rotation.y = ast.heading;
    const hold = !!(experiment && experiment.t < 0.15);
    if (u.rig) {
      const mode = boarding ? (boarding.phase === "walk" ? "walk" : boarding.phase === "climb" ? "climb" : "stand")
        : ast.jumping ? "jump" : (ast.hopping || (ast.speed > 0.7 && ast.onGround)) ? "lope" : ast.speed > 0.15 ? "walk" : "stand";
      poseRig(u.rig, { mode, air: !ast.onGround, airP: ast.airDur ? Math.min(1, ast.airT / ast.airDur) : 0, contact: ast.contact || 0,
        speed: speedFrac, phase: ast.phase, hold, t: elapsed });
    } else {
      const sw = ast.onGround ? Math.sin(ast.phase) * 0.45 * speedFrac : 0.35;
      u.legL.rotation.x = sw; u.legR.rotation.x = ast.onGround ? -sw : -0.2;
      u.armL.rotation.x = -sw * 0.5 - (ast.onGround ? 0 : 0.6); u.armR.rotation.x = sw * 0.5 - (ast.onGround ? 0 : 0.6);
      u.armL.rotation.z = 0.12; u.armR.rotation.z = -0.12;
      if (experiment) { const hd = experiment.t < 0 ? -1.25 : -0.9; u.armL.rotation.x = hd; u.armR.rotation.x = hd; u.armL.rotation.z = 0.3; u.armR.rotation.z = -0.3; }
    }

    // Schatten & Temperatur (Raumanzug-Thermometer)
    temp.check -= dt;
    if (temp.check <= 0) {
      temp.check = 0.2;
      ray.set(tmp.copy(ast.pos).setY(ast.pos.y + 1.2), SUN_DIR);
      ray.far = 200;
      temp.inShadow = ray.intersectObjects(world.shadowCasters, true).length > 0;
    }
    const target = temp.inShadow ? cfg.temp.shade : cfg.temp.sun;
    temp.shown += (target - temp.shown) * Math.min(1, dt * 1.2);
    if (temp.inShadow) temp.shadowTime += dt; else { temp.shadowTime = 0; temp.sunSeen = true; }
    if (world.stations.temperatur && temp.inShadow && temp.shadowTime > 1.8 && temp.sunSeen && !busy) discover("temperatur");
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
      if (sc.auto && d < sc.auto && !busy && !view.special && !experiment) discover(key); // Fundstück: hingehen genügt
      const text = sc.action || (sc.again && foundMap()[key] ? sc.again : "");
      if (text && d < (sc.reach || 3.2)) { near = key; nearText = text; }
    }
    const act = $("surfAction");
    if (near && !experiment && !view.special && !busy) {
      act.classList.remove("hidden");
      const html = `${nearText} <kbd>E</kbd>`;
      if (act.innerHTML !== html) act.innerHTML = html;
      if (actionPressed) startAction(near);
    } else act.classList.add("hidden");
    actionPressed = false;

    site.update(dt, busy, elapsed);
    updateScaleDisplay();
    updateDust(dt);
    radioTimer -= dt; if (radioTimer <= 0) $("radio").classList.add("hidden");

    // Licht folgt dem Astronauten (scharfe Schatten in der Nähe)
    world.sun.target.position.copy(ast.pos);
    world.sun.position.copy(ast.pos).addScaledVector(sunNow, 120);

    updateCamera(dt);
    updateLabels();
    animateMarkers(elapsed);
    updateCompass();
  };

  function updateCamera(dt) {
    const c = world.camera;
    if (boarding) {
      // Schräg von hinten zuschauen, wie der Astronaut die Leiter hochsteigt
      // … und beim Start ein Stück zurückgehen und der Rakete nachschauen
      const a = HATCH.a + 0.45, launch = boarding.phase === "launch", dist = launch ? 17 : 9.5;
      c.position.lerp(tmp.set(Math.sin(a) * dist, 2.6, Math.cos(a) * dist), 1 - Math.exp(-dt * 2.5));
      if (launch) view.look.lerp(tmp2.set(0, 4 + (boarding.rise || 0), 0), 1 - Math.exp(-dt * 3));
      else view.look.lerp(tmp2.set(HATCH.x * 1.6, 3.3, HATCH.z * 1.6), 1 - Math.exp(-dt * 3));
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
    c.position.lerp(want, 1 - Math.exp(-dt * 5));
    const lookY = ast.pos.y + 1.3 + Math.max(0, (1.6 - view.height)) * 2.5; // tief = nach oben schauen
    view.look.lerp(tmp2.set(ast.pos.x + Math.sin(view.yaw) * 3, lookY, ast.pos.z + Math.cos(view.yaw) * 3), 1 - Math.exp(-dt * 8));
    c.lookAt(view.look);
    if (Math.abs(c.fov - 60) > 0.1) { c.fov += (60 - c.fov) * Math.min(1, dt * 3); c.updateProjectionMatrix(); }
  }

  function startAction(key) {
    Sound.click();
    if (key === "rakete") { startBoarding(); return; }
    if (key === "wand") { showFound(); return; }
    if (!cfg.stations[key].action) { discover(key, null, true); return; }
    if (key === "waage") startWeigh();
    else site.actions[key]();
  }
  function startFall() {
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
  function scopeSay(text, buttons) {
    $("scopeText").textContent = text;
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
    showWeigh();
  }
  function moonKg(kg) { return (kg * cfg.gravity / 9.81).toFixed(1).replace(".", ","); }
  // Die Anzeige reagiert wie eine echte Waage: Sie zeigt nur etwas an, solange der Astronaut auf der Platte steht
  let scaleKg = 30, scaleShown = "";
  function updateScaleDisplay() {
    const st = world.stations.waage;
    const onPlate = ast.onGround && Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z) < 0.6;
    const text = `${onPlate ? moonKg(scaleKg) : "0,0"} kg`;
    if (text !== scaleShown) { scaleShown = text; world.scale.userData.show(text); }
  }
  function showWeigh() {
    const sp = view.special, T = cfg.weigh, mond = moonKg(sp.kg);
    scaleKg = sp.kg;
    const step = (d) => () => { sp.kg = Math.max(20, Math.min(60, sp.kg + d)); showWeigh(); };
    scopeSay(fmtVars(T.text, { erde: sp.kg, mond }), [[T.less, step(-5)], [T.more, step(5)], [T.done, endWeigh, true]]);
  }
  function endWeigh() {
    const sp = view.special;
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
    const sp = view.special; sp.t = -2.2; sp.stage = "";
    world.beam.visible = world.pulse.visible = false;
    scopeSay(cfg.laser.ready);
  }
  function updateLaser(dt) {
    const c = world.camera, sp = view.special, T = cfg.laser, e = world.earthDir, M = world.laserFrom;
    // Kamera hinter dem Spiegel: Spiegel unten im Bild, die Erde darüber
    const h = Math.hypot(e.x, e.z);
    c.position.lerp(tmp.set(M.x - (e.x / h) * 6.5, M.y + 1.7, M.z - (e.z / h) * 6.5), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.copy(M).addScaledVector(e, 14), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (sp.stage === "end") return;
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
      if (stage === "end") { Sound.land(); world.pulse.visible = false; scopeSay(T.end, [[T.again, runLaser], [T.done, endLaser, true]]); return; }
    }
    const text = `${stage === "hin" ? T.hin : T.zurueck} ⏱️ ${sec(t)} s`;
    if ($("scopeText").textContent !== text) $("scopeText").textContent = text;
  }
  function endLaser() { world.beam.visible = world.pulse.visible = false; world.astronaut.visible = true; leaveExhibit(); }

  // Antenne: Zeit vorspulen – die Sonne wandert in einem Mond-Tag einmal über den Himmel, die Erde bleibt stehen
  const sunNow = SUN_DIR.clone();
  const SUN_AXIS = new V().crossVectors(SUN_DIR, new V(0, 1, 0)).normalize(); // Drehung um diese Achse: die Sonne steigt zuerst höher
  function setSun(angle) {
    sunNow.copy(SUN_DIR).applyAxisAngle(SUN_AXIS, angle);
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
    const sp = view.special; sp.t = -1.5; sp.day = 0; sp.running = true;
    scopeSay(cfg.lapse.ready);
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
      scopeSay(T.end, [[T.again, runLapse], [T.done, leaveExhibit, true]]);
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
      UI.toast(`⏱️ Beide nach ${ex.t.toFixed(1).replace(".", ",")} Sekunden unten – gleichzeitig!`, "gold");
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
    ast.speed = ast.vy = 0; ast.onGround = true; ast.jumping = ast.hopping = false;
    radioTimer = 0; $("radio").classList.add("hidden");
    world.stations.rakete.marker.visible = false;
  }
  function updateBoarding(dt) {
    const b = boarding, R = 2.05; b.t += dt;
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
        b.y = Math.min(HATCH.y, b.y + 0.95 * dt);
        if (b.y >= HATCH.y) { b.phase = "enter"; b.t = 0; }
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
    for (const [key, st] of Object.entries(world.stations)) {
      const sc = cfg.stations[key];
      if (sc.info || sc.home || foundMap()[key] || !cfg.discoveries.some((d) => d.key === key)) continue;
      const d = Math.hypot(st.x - ast.pos.x, st.z - ast.pos.z);
      if (d < bestD) { bestD = d; best = st; }
    }
    if (!best || bestD < 5 || view.special || boarding || experiment) { if (compassShown) { compassShown = ""; el.classList.add("hidden"); } return; }
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
      if (sc.info) { el.style.display = "none"; continue; }
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
    return (cfg.npcs || []).map((c, i) => {
      if (!npcModels[i]) return null;
      const obj = makeModelAstronaut(npcModels[i], c.color);
      const [x, z] = c.path[0];
      obj.position.set(x, B.height(x, z), z);
      B.scene.add(obj);
      return { c, obj, rig: obj.userData.rig, i: 0, wait: 1 + i * 2, heading: 0, phase: 0, col: [x, z, 0.7], talk: 0, cool: 0, waveT: 0, said: 0, el: null };
    }).filter(Boolean);
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
    Sound.click();
  }
  function updateNpcs(dt, elapsed, busy) {
    const c = world.camera, w = innerWidth, h = innerHeight;
    for (const n of world.npcs) {
      const p = n.obj.position, dx = ast.pos.x - p.x, dz = ast.pos.z - p.z, dist = Math.hypot(dx, dz);
      let moving = false;
      n.talk -= dt; n.cool -= dt; n.waveT -= dt;
      if (dist < 5.5 && !busy) { // stehen bleiben, zum Kind drehen und etwas sagen
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
      p.y = world.height(p.x, p.z);
      n.obj.rotation.y = n.heading;
      n.phase += dt * (moving ? 5 : 1.5);
      poseRig(n.rig, { mode: moving ? "walk" : "stand", speed: moving ? 0.55 : 0, phase: n.phase, t: elapsed + n.c.path.length,
        air: false, airP: 0, contact: 0, wave: n.waveT > 0, work: !moving && n.c.work && dist > 5.5 });
      n.col[0] = p.x; n.col[1] = p.z;
      // Sprechblase über dem Kopf
      if (n.talk > 0 && !view.special) {
        tmp.set(p.x, p.y + 2.35, p.z).project(c);
        if (tmp.z < 1) { n.el.style.display = ""; n.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`; }
        else n.el.style.display = "none";
      } else n.el.style.display = "none";
    }
  }

  // Raumtransporter: fliegt heran, landet auf seinem Landeplatz, wartet, startet wieder – und nach einer Pause von vorn
  function makeShuttle(B, pad) {
    const g = kit("craft_cargoA", 6);
    const glowMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,240,200,1)", "rgba(255,140,40,0.8)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const jets = [];
    for (const x of [-1.2, 1.2]) { const s = new THREE.Sprite(glowMat); s.position.set(x, 0.1, 0); s.scale.setScalar(2.2); g.add(s); jets.push(s); }
    g.traverse((o) => { if (o.isSprite) o.scale.divideScalar(6); }); // Sprites nicht mitskalieren
    B.scene.add(g);
    const [px, pz] = pad, py = B.height(px, pz);
    return { g, jets, t: 20, pad: new V(px, py + 0.1, pz), from: new V(px - 240, py + 150, pz + 260), to: new V(px + 260, py + 170, pz - 220) };
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
  const MARS_LAYOUT = {
    spawn: [-6.9, 4],
    waage: [-13, 22], monde: [12, 20], vulkan: [27, 30], rover: [-22, 12], roverStart: [-25, 17], roverZiel: [-42, 40],
    eis: [20, -22], wegweiser: [14, 4], teufel: [-28, -26],
    station: [0, 56], abend: [-6, 49], rost: [6, 49], pad: [-34, 72] // Landeplatz des Raumtransporters
  };
  const MARS_SKY = new THREE.Color(0xd2a679), MARS_DUSK = new THREE.Color(0x46587a);
  const PHOBOS_DIR = new V(0.2, 0.6, 1).normalize(), DEIMOS_DIR = new V(-0.75, 0.5, 0.55).normalize();
  const VOLCANO_DIR = new V(1, 0, 0.35).normalize(), VOLCANO_H = 500, REAL_H = 22; // Olympus Mons: 22 km hoch
  const MAGNET_UP = 1.75, MAGNET_DOWN = 1.27;

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
    const ice = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0xdff4ff, emissive: 0x7dd3fc, emissiveIntensity: 0.5, roughness: 0.2, flatShading: true }));
    ice.position.set(-0.45, 0.1, -0.45); ice.visible = false; g.add(ice); // auf der Kamera-Seite des Bohrers
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
  function naturalRockGeo(seed) {
    const geo = new THREE.IcosahedronGeometry(1, 3), p = geo.attributes.position, v = new V(), col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = fbm2(v.x * 1.6 + seed * 3.1, v.z * 1.6 + v.y * 1.3 - seed) - 0.5;
      const facet = Math.round((v.x + v.y * 0.7) * 2.2 + seed) * 0.04; // grobe Bruchkanten
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
    const flats = [[0, 0, 11], [...L.station, 20], [L.station[0], L.station[1] + 16, 22], [...L.waage, 3], [...L.monde, 4], [...L.vulkan, 4], [...L.rover, 6], [...L.eis, 4], [...L.pad, 7]];
    const dustColors = ["rgba(190,110,70,1)", "rgba(170,95,60,0.9)"];
    const B = buildBase({
      height: makeHeight(craters, flats, 40, marsDunes),
      // dünne, staubige Luft: gelbbrauner Himmel, Dunst in der Ferne, keine Sterne am Tag, die Sonne wirkt kleiner als auf der Erde
      sky: MARS_SKY.getHex(), fog: [90, 430], stars: false, sunSize: 105,
      ground: 0xb8623a, rock: 0x7d4a35,
      tint: (x, z) => {
        let m = 0.75 + 0.25 * fbm2(x * 0.015 + 9, z * 0.015), r = m, g = m * 0.95, b = m * 0.9;
        const d = duneMask(x, z); // in den Dünen: feiner, hellerer Sand
        if (d > 0) { r += (1.08 - r) * d; g += (0.86 - g) * d; b += (0.62 - b) * d; }
        m = 0.9 + 0.1 * hash2(Math.floor(x * 2), Math.floor(z * 2)); // feine Körnung
        return [r * m, g * m, b * m];
      },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [...L.waage, 4], [...L.monde, 4], [...L.vulkan, 4], [...L.rover, 7],
        [...L.roverZiel, 3], [...L.eis, 4], [...L.wegweiser, 3]],
      ambient: [0xffd2a8, 0.5], hemi: [0xe8b98a, 0x6b3a22, 0.35], sun: [0xfff0dc, 1.45],
      dust: dustColors
    });
    const { scene, height, on, rocket } = B;

    // Himmel: die beiden kleinen Monde (kartoffelförmig) und in der Ferne der Olympus Mons
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x8a7f76, roughness: 1, flatShading: true, fog: false });
    const phobos = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), moonMat); phobos.scale.set(9, 7, 6.5);
    phobos.position.copy(PHOBOS_DIR).multiplyScalar(900);
    const deimos = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), moonMat); deimos.scale.set(3.2, 2.6, 2.4);
    deimos.position.copy(DEIMOS_DIR).multiplyScalar(900);
    const flat = (c) => new THREE.MeshBasicMaterial({ color: c, fog: false });
    const volcanoAt = VOLCANO_DIR.clone().multiplyScalar(1500), side = new V().crossVectors(VOLCANO_DIR, new V(0, 1, 0));
    const volcano = new THREE.Mesh(new THREE.CylinderGeometry(130, 600, VOLCANO_H, 40), flat(0xb88d6a));
    volcano.position.copy(volcanoAt).setY(VOLCANO_H / 2 - 10);
    // Vergleichsberge im selben Maßstab (erst im Hubschrauber sichtbar)
    const peak = (km, r, color, shift) => {
      const hgt = (km / REAL_H) * VOLCANO_H, m = new THREE.Mesh(new THREE.ConeGeometry(r, hgt, 6), flat(color));
      m.position.copy(volcanoAt).addScaledVector(VOLCANO_DIR, -650).addScaledVector(side, shift).setY(hgt / 2 - 10);
      m.visible = false; return m;
    };
    const everest = peak(8.85, 150, 0x5d6b7a, -170), zugspitze = peak(2.96, 60, 0x3f6b4c, 120);
    scene.add(phobos, deimos, volcano, everest, zugspitze);

    // Stationen
    const telescope = on(makeTelescope(PHOBOS_DIR), ...L.monde);
    const scale = on(makeScale(), ...L.waage);
    scale.rotation.y = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);
    const heli = on(makeMarsHeli(), ...L.vulkan);
    on(makeHeliPad(), ...L.vulkan, 0.04);
    const console_ = on(KIT.desk_computerScreen ? makeKitConsole() : makeConsole(), ...L.rover); // Steuerpult für den Rover
    console_.rotation.y = Math.atan2(L.roverZiel[0] - L.rover[0], L.roverZiel[1] - L.rover[1]) + Math.PI;
    const rover = on(makeMarsRover(), ...L.roverStart);
    const roverGoal = new THREE.Group();
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: 0xe3cba5, roughness: 1, flatShading: true }));
    stone.scale.y = 0.6; stone.position.y = 0.3; stone.castShadow = true;
    const goalMark = makeMarker(); goalMark.scale.setScalar(0.9);
    goalMark.userData.beam.material.color.set(0xfcd34d); goalMark.userData.ring.material.color.set(0xfcd34d);
    goalMark.userData.setIcon("🎯", 0xfcd34d);
    roverGoal.add(goalMark); roverGoal.visible = false;
    on(stone, ...L.roverZiel, 0.3); on(roverGoal, ...L.roverZiel);
    const drill = on(makeDrill(), ...L.eis);
    on(makeSignpost("SONNE", "228 Mio. km"), ...L.wegweiser).rotation.y = Math.atan2(L.wegweiser[0], L.wegweiser[1]) + Math.PI;
    const devil = on(makeDevil(dustColors), ...L.teufel);
    const station = on(makeStation(cfg.discoveries, "Marsstation", "mars"), ...L.station);
    on(makeTelescope(new V(SUN_DIR.x, 0.12, SUN_DIR.z).normalize()), ...L.abend); // Himmelskamera, schaut zum Sonnenuntergang
    const magnetTable = on(makeMagnetTable(), ...L.rost);

    // Landschaft mit Charakter: Himmelsverlauf, Tafelberge am Horizont, Felsgruppen, Staubschleier, ein Rover auf Patrouille
    const skyDome = makeSkyDome(1.12, 0.74); skyDome.material.color.copy(MARS_SKY); scene.add(skyDome);
    const bands = bandTexture(["#8a4a33", "#9b5a3f", "#7a3f2b", "#a8694a", "#8f5038", "#b37757"], 3); // gedämpfte Rottöne, die im Dunst verschwimmen
    const buttes = [[-150, 120, 34, 42], [175, 95, 26, 30], [135, -165, 40, 36], [-185, -105, 30, 48], [60, 215, 44, 28], [-60, -205, 24, 26]];
    buttes.slice(0, rich ? 6 : 3).forEach(([x, z, r, h], i) => on(makeButte(r, h, bands, i * 7 + 1), x, z, h / 2 - 3));
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a4e36, roughness: 0.95, vertexColors: true });
    rockMat.userData.natural = true;
    const clusters = [[18, 26, 6], [33, 24, 5], [9, -9, 5], [-14, 42, 6], [22, 62, 5], [-24, 60, 6], [-4, 30, 4], [-38, 10, 5], [28, -30, 6], [-18, -12, 4]];
    clusters.slice(0, rich ? 10 : 5).forEach(([x, z, n], i) => rockCluster(B, x, z, n, rockMat, i * 13 + 2));
    const veils = rich ? makeDustVeils("rgba(210,150,100,1)", 9) : new THREE.Group(); scene.add(veils);
    const patrol = on(makeMarsRover(false), 48, 62);
    const patrolCol = [48, 62, 1.8];
    // Leben: zwei Mitbewohner und ein Raumtransporter mit eigenem Landeplatz
    const npcs = addNpcs(B);
    const landing = makeHeliPad(); landing.scale.setScalar(2.4); on(landing, ...L.pad, 0.05); // Landeplatz des Transporters
    const shuttle = KIT.craft_cargoA ? makeShuttle(B, L.pad) : null;
    if (rich && KIT.craterLarge) for (const [x, z, s] of [[40, -12, 9], [-52, 36, 7], [62, 30, 8], [-20, -52, 10], [8, 90, 9]]) on(kit("craterLarge", s), x, z, -0.2);
    for (const [x, z, r] of [[...L.monde, 1.1], [...L.vulkan, 2.3], [...L.rover, 1.1], [...L.eis, 1.3], [...L.wegweiser, 0.6], [...L.rost, 1.3], [...L.abend, 1], [...L.waage, 1.2]]) addBlob(B, x, z, r);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, rover: L.rover, rost: L.rost, vulkan: L.vulkan, monde: L.monde, abend: L.abend, eis: L.eis, teufel: L.teufel,
      wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] });

    const colliders = [[0, 0, 1.8], [...L.monde, 0.6], [...L.vulkan, 0.7], [...L.rover, 1], [...L.eis, 0.9], [...L.wegweiser, 0.3],
      [...L.rost, 1], [...L.abend, 0.6], [...L.roverZiel, 0.7], [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25],
      ...(station.userData.nasa ? marsNasaColliders(L.station) : KIT.hangar_largeA ? marsCampColliders(L.station) : stationColliders(L.station)), patrolCol, ...npcs.map((n) => n.col), [...L.pad, 4.5]];
    for (const [x, z, n] of clusters) if (n >= 5) colliders.push([x, z, 1.2]); // die großen Felsgruppen kann man nicht durchlaufen

    return { ...B, L, station, scale, telescope, phobos, deimos, volcano, everest, zugspitze, heli, heliY: heli.position.y, rover, roverGoal, drill,
      devil, magnetTable, skyDome, veils, patrol, patrolCol, npcs, shuttle, blink: [...station.userData.blink, ...console_.userData.blink],
      stations, colliders, shadowCasters: [rocket, station] };
  }

  // Himmel und Licht zwischen Mittag (f = 0) und Sonnenuntergang (f = 1): Auf dem Mars wird es abends BLAU um die Sonne
  const DUSK_GLOW = new THREE.Color(0x8fc4ff), WHITE = new THREE.Color(0xffffff);
  function marsSky(f) {
    sunNow.copy(SUN_DIR).applyAxisAngle(SUN_AXIS, -0.2 * f); // Sonne sinkt bis hinter die Hügel am Horizont
    world.scene.background.copy(MARS_SKY).lerp(MARS_DUSK, f);
    world.scene.fog.color.copy(world.scene.background);
    world.skyDome.material.color.copy(world.scene.background);
    world.sunGlow.position.copy(sunNow).multiplyScalar(1200);
    world.sunGlow.material.color.copy(WHITE).lerp(DUSK_GLOW, f);
    world.sunGlow.scale.setScalar(105 * (1 + 2.4 * f));
    world.sun.intensity = world.sunBase * (1 - 0.65 * f);
    world.ambient.intensity = 0.5 * (1 - 0.45 * f);
  }

  // --- Rover fernsteuern: zum hellen Stein fahren und ihn untersuchen ---
  function startRover() {
    enterExhibit("rover", { update: updateRover, done: false, puff: 0 }, "driving");
    const r = world.rover, [x, z] = world.L.roverStart, [gx, gz] = world.L.roverZiel;
    r.position.set(x, world.height(x, z), z);
    r.userData.heading = Math.atan2(gx - x, gz - z) + 0.7; // steht schräg – das Kind muss selbst lenken
    r.userData.speed = 0;
    world.roverGoal.visible = true;
    scopeSay(isTouch() ? cfg.rover.driveTouch : cfg.rover.drive);
  }
  function updateRover(dt) {
    const sp = view.special, r = world.rover, u = r.userData, c = world.camera;
    if (!sp.done) {
      u.speed += (sp.iy * 2.8 - u.speed) * Math.min(1, dt * 2.5);
      u.heading -= sp.ix * 1.3 * dt * (u.speed < -0.2 ? -1 : 1);
      const nx = r.position.x + Math.sin(u.heading) * u.speed * dt, nz = r.position.z + Math.cos(u.heading) * u.speed * dt;
      if (Math.hypot(nx - world.L.rover[0], nz - world.L.rover[1]) < 75) r.position.set(nx, world.height(nx, nz), nz); // Funk-Reichweite
      for (const w of u.wheels) w.rotation.x += (u.speed * dt) / 0.28;
      sp.puff -= dt;
      if (Math.abs(u.speed) > 0.6 && sp.puff <= 0) { sp.puff = 0.18; grains(r.position, 2, 0.5, -Math.sin(u.heading), -Math.cos(u.heading)); }
      const [gx, gz] = world.L.roverZiel;
      if (Math.hypot(r.position.x - gx, r.position.z - gz) < 2.6) {
        sp.done = true; u.speed = 0; Sound.correct(); grains(tmp.set(gx, world.height(gx, gz) + 0.4, gz), 12, 0.7);
        scopeSay(cfg.rover.found, [[cfg.rover.done, endRover, true]]);
      }
    }
    r.rotation.y = u.heading;
    const fx = Math.sin(u.heading), fz = Math.cos(u.heading);
    c.position.lerp(tmp.set(r.position.x - fx * 6.5, r.position.y + 3.4, r.position.z - fz * 6.5), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(r.position.x + fx * 3, r.position.y + 1, r.position.z + fz * 3), 1 - Math.exp(-dt * 5));
    c.lookAt(view.look);
  }
  function endRover() { world.roverGoal.visible = false; leaveExhibit(); }

  // --- Hubschrauber: aufsteigen, den Olympus Mons sehen und bekannte Berge danebenstellen ---
  function startHeli() {
    enterExhibit("vulkan", { update: updateHeli, t: 0, top: false, seen: {} });
    scopeSay(cfg.heli.rising);
  }
  function heliUi(last) {
    const sp = view.special, T = cfg.heli, both = sp.seen.everest && sp.seen.zugspitze;
    const show = (key) => () => { sp.seen[key] = true; world[key].visible = true; heliUi(key); };
    const btns = [];
    if (!sp.seen.everest) btns.push([T.everestBtn, show("everest"), true]);
    if (!sp.seen.zugspitze) btns.push([T.zugspitzeBtn, show("zugspitze"), !btns.length]);
    if (both) btns.push([T.done, endHeli, true]);
    scopeSay(both ? T.all : last ? T[last] : T.intro, btns);
  }
  function updateHeli(dt) {
    const sp = view.special, c = world.camera, h = world.heli, d = VOLCANO_DIR; sp.t += dt;
    const k = smooth(0.3, 5, sp.t);
    h.position.y = world.heliY + k * 60;
    if (h.userData.spin) h.userData.spin(dt); else h.userData.rotor.rotation.y += dt * 42;
    c.position.lerp(tmp.set(h.position.x - d.x * 9, h.position.y + 2.4, h.position.z - d.z * 9), 1 - Math.exp(-dt * 4));
    // erst dem Hubschrauber nachschauen, oben dann zum Vulkan
    tmp2.set(h.position.x + d.x * 20, h.position.y + 1, h.position.z + d.z * 20).lerp(tmp.set(d.x * 1500, VOLCANO_H * 0.24, d.z * 1500), k);
    view.look.lerp(tmp2, 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    const fov = 60 - 28 * k;
    c.fov += (fov - c.fov) * Math.min(1, dt * 2.5); c.updateProjectionMatrix();
    if (k >= 1 && !sp.top) { sp.top = true; Sound.correct(); heliUi(); }
  }
  function endHeli() {
    world.everest.visible = world.zugspitze.visible = false;
    world.heli.position.y = world.heliY;
    leaveExhibit();
  }

  // --- Fernrohr: die beiden Marsmonde finden ---
  function startMoons() {
    const T = cfg.moons;
    startTour("monde", T, [
      { pos: world.phobos.position, fov: 4.5, text: T.phobos },
      { pos: world.deimos.position, fov: 2.2, text: T.deimos, btn: T.deimosBtn, slow: true }
    ]);
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
    if (sp.depth >= 3) scopeSay(T.steps[3], [[T.done, endEis, true]]);
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
  function startRost() {
    enterExhibit("rost", { update: updateRost, t: 0, run: false });
    world.astronaut.visible = false;
    resetMagnet();
    scopeSay(cfg.magnet.ready, [[cfg.magnet.go, runRost, true]]);
  }
  function runRost() {
    const sp = view.special; sp.t = 0; sp.run = true;
    resetMagnet();
    scopeSay(cfg.magnet.running);
  }
  function updateRost(dt) {
    const c = world.camera, sp = view.special, p = world.magnetTable.position, u = world.magnetTable.userData;
    c.position.lerp(tmp.set(p.x - 0.9, p.y + 1.75, p.z + 2.5), 1 - Math.exp(-dt * 3)); // von hinten: so steht der Galgen nicht im Bild
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
      scopeSay(cfg.magnet.end, [[cfg.magnet.again, runRost], [cfg.magnet.done, endRost, true]]);
    }
  }
  function endRost() { world.astronaut.visible = true; leaveExhibit(); }

  // --- Himmelskamera: Zeit vorspulen bis zum (blauen!) Sonnenuntergang ---
  const DUSK_TIME = 7;
  function startAbend() { enterExhibit("abend", { update: updateAbend }); runAbend(); }
  function runAbend() {
    const sp = view.special; sp.t = -1.5; sp.run = true; sp.said = false;
    marsSky(0);
    scopeSay(cfg.dusk.ready);
  }
  function updateAbend(dt) {
    const c = world.camera, sp = view.special, st = world.stations.abend, y = world.height(st.x, st.z);
    const h = Math.hypot(SUN_DIR.x, SUN_DIR.z), dx = SUN_DIR.x / h, dz = SUN_DIR.z / h;
    c.position.lerp(tmp.set(st.x - dx * 5, y + 2.2, st.z - dz * 5), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(st.x + dx * 40, y + 7, st.z + dz * 40), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (!sp.run) return;
    sp.t += dt;
    if (sp.t < 0) return;
    if (!sp.said) { sp.said = true; $("scopeText").textContent = cfg.dusk.running; }
    marsSky(smooth(0, DUSK_TIME, sp.t));
    if (sp.t > DUSK_TIME + 0.6) {
      sp.run = false; Sound.correct();
      scopeSay(cfg.dusk.end, [[cfg.dusk.again, runAbend], [cfg.dusk.done, endAbend, true]]);
    }
  }
  function endAbend() { marsSky(0); leaveExhibit(); }

  // --- Ein zweiter Rover fährt von allein seine Runden neben der Station ---
  function updatePatrol(dt) {
    const r = world.patrol, u = r.userData, cx = 48, cz = 62;
    u.a = (u.a || 0) + dt * 0.1; // etwa 1,3 m/s
    const x = cx + Math.cos(u.a) * 16, z = cz + Math.sin(u.a) * 10;
    const hx = -Math.sin(u.a) * 16, hz = Math.cos(u.a) * 10; // Fahrtrichtung
    r.position.set(x, world.height(x, z), z); r.rotation.y = Math.atan2(hx, hz);
    for (const w of u.wheels) w.rotation.x += dt * 4.5;
    world.patrolCol[0] = x; world.patrolCol[1] = z;
    u.puff = (u.puff || 0) - dt;
    if (u.puff <= 0 && world.camera.position.distanceTo(r.position) < 60) { u.puff = 0.35; grains(r.position, 1, 0.4); }
  }

  // --- Staubteufel: wandert über die Ebene, man muss ihn einholen ---
  function updateDevil(elapsed) {
    const [cx, cz] = world.L.teufel, st = world.stations.teufel;
    const x = cx + 16 * Math.sin(elapsed * 0.11), z = cz + 12 * Math.sin(elapsed * 0.17 + 1), y = world.height(x, z);
    world.devil.position.set(x, y, z);
    world.devil.userData.parts.forEach((s, i) => {
      const hgt = (i / 19) * 7.5, r = 0.2 + hgt * 0.2, a = elapsed * 3.2 + i * 0.95;
      s.position.set(Math.cos(a) * r, hgt + 0.2, Math.sin(a) * r);
      s.scale.setScalar(0.9 + hgt * 0.32);
    });
    st.x = x; st.z = z; st.marker.position.set(x, y, z);
  }

  // =========================================================
  //  Bausteine, die mehrere Orte benutzen
  // =========================================================
  const endHidden = () => { world.astronaut.visible = true; leaveExhibit(); }; // Exponat beenden, bei dem der Astronaut ausgeblendet war

  // Waage und Station mit Tafelwand hat jeder Ort
  function addCommon(B, L, name) {
    const scale = B.on(makeScale(), ...L.waage);
    scale.rotation.y = Math.atan2(WEIGH_DIR.x, WEIGH_DIR.z);
    const station = B.on(makeStation(cfg.discoveries, name), ...L.station);
    const colliders = [[0, 0, 1.8], [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25], ...stationColliders(L.station)];
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
    scopeSay(cfg.orrery.ready, [[cfg.orrery.go, runOrrery, true]]);
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
      scopeSay(T.end, [[T.again, runOrrery], [T.done, endHidden, true]]);
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
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.24), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
      label.position.set(x - r, 0.62, -0.46); label.rotation.y = Math.PI; g.add(label);
      x -= r * 2 + gap;
    }
    g.userData = { width };
    return g;
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
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 8, 0, Math.PI * 2, 0, 0.8), white); dish.rotation.x = Math.PI; dish.position.y = 2.0; dish.castShadow = true; g.add(dish);
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
  const MERKUR_LAYOUT = {
    spawn: [-6.9, 4], waage: [4, 27], sonne: [-14, 22], boulder: [22, 34], krater: [-30, 38], kraterZiel: [-44, 52],
    wegweiser: [14, 4], sonde: [-22, -16], eis: [30, -36], // eis liegt mitten in einem tiefen Krater
    station: [2, 58], jahr: [-4, 51], groesse: [8, 51]
  };
  function buildMerkur() {
    const L = { ...MERKUR_LAYOUT };
    L.shadowSpot = [L.boulder[0] + SHADOW_DIR.x * 12, L.boulder[1] + SHADOW_DIR.z * 12];
    const craters = [[...L.eis, 13, 3.2], [70, 10, 16, 2.4], [-70, -30, 18, 2.8], [-85, 60, 14, 2], [60, 95, 12, 1.8], [-20, 105, 10, 1.4],
      [100, -60, 20, 3], [-48, 10, 6, 0.9], [52, 44, 5, 0.8], [0, -80, 14, 2.2], [-100, 10, 9, 1.3], [40, -85, 8, 1.2]];
    const flats = [[0, 0, 11], [...L.station, 16], [...L.waage, 3], [...L.sonne, 4], [...L.boulder, 7], [...L.shadowSpot, 8], [...L.krater, 4], [...L.kraterZiel, 6]];
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
    const common = addCommon(B, L, "Merkurstation");

    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x5f5a54, roughness: 1, flatShading: true }));
    boulder.scale.set(7, 8.5, 6.5); boulder.rotation.set(0.2, 0.7, 0.1); boulder.castShadow = boulder.receiveShadow = true;
    on(boulder, ...L.boulder, 5.5);

    // Sonne im Filter-Fernrohr: groß, wie sie vom Merkur aussieht – und daneben klein, wie wir sie von der Erde kennen
    const telescope = on(makeTelescope(SUN_DIR), ...L.sonne);
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
    on(makeTable(), ...L.krater); // Versuchspult

    on(makeSignpost("SONNE", "58 Mio. km"), ...L.wegweiser).rotation.y = Math.atan2(L.wegweiser[0], L.wegweiser[1]) + Math.PI;
    on(makeProbe(), ...L.sonde).rotation.y = 0.6;
    const ice = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: 0xdff4ff, emissive: 0x7dd3fc, emissiveIntensity: 0.6, roughness: 0.2, flatShading: true }));
    on(ice, ...L.eis, 0.3);
    const orrery = on(makeOrrery("merkur", 0.75, 1.7), ...L.jahr);
    const rack = on(makeSizeRack(["mond", "merkur", "erde"]), ...L.groesse);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, temperatur: L.shadowSpot, sonne: L.sonne, krater: L.krater, jahr: L.jahr, groesse: L.groesse,
      eis: L.eis, sonde: L.sonde, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] });
    const colliders = [...common.colliders, [...L.boulder, 6.8], [...L.sonne, 0.6], [...L.krater, 1], [...L.wegweiser, 0.3], [...L.sonde, 1],
      [...L.eis, 0.5], [...L.jahr, 1.2], [L.groesse[0] - 1.2, L.groesse[1], 1], [L.groesse[0] + 1.2, L.groesse[1], 1]];

    return { ...B, ...common, L, telescope, sunBig, sunSmall, sunAt, meteor, decal, orrery, rack, stations, colliders, shadowCasters: [boulder, rocket, common.station] };
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
    scopeSay(cfg.impact.ready, [[cfg.impact.go, runMeteor, true]]);
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
      scopeSay(cfg.impact.end, [[cfg.impact.again, runMeteor], [cfg.impact.done, leaveExhibit, true]]);
    }
  }

  // =========================================================
  //  Pluto
  // =========================================================
  const PLUTO_LAYOUT = {
    spawn: [-6.9, 4], waage: [-12, 20], charon: [12, 20], herz: [24, 38], funk: [16, 2], wegweiser: [-16, 8], sonde: [26, -22],
    eis: [0, 82], heart: [0, 120], // das „Herz“: eine riesige glatte Eisfläche, beginnt ein Stück hinter den Stationen
    station: [-44, 34], jahr: [-50, 27], groesse: [-38, 27]
  };
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
    const flats = [[0, 0, 11], [...L.station, 16], [...L.waage, 3], [...L.charon, 4], [...L.herz, 4], [...L.funk, 4], [L.heart[0], L.heart[1] + 5, 62]];
    const B = buildBase({
      height: makeHeight(craters, flats, 120),
      // fast keine Luft, schwarzer Himmel – die Sonne ist so weit weg, dass sie nur noch ein sehr heller Stern ist
      sky: 0x000000, stars: true, sunSize: 34,
      ground: 0xa89680, rock: 0x8a7a68,
      tint: (x, z) => { if (inHeart(x, z)) return [1.9, 1.9, 1.85]; const m = 0.42 + 0.28 * fbm2(x * 0.012 + 2, z * 0.012); return [m, m * 0.88, m * 0.76]; },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [...L.waage, 4], [...L.charon, 4], [...L.herz, 4], [...L.funk, 4],
        [...L.wegweiser, 3], [...L.sonde, 3], [L.heart[0], L.heart[1] + 5, 66]],
      ambient: [0x8fa0c0, 0.34], hemi: [0x6f86b8, 0x000000, 0.22], sun: [0xeef2ff, 0.95],
      dust: ["rgba(235,240,250,1)", "rgba(200,210,230,0.9)"]
    });
    const { scene, height, on, rocket } = B;
    const common = addCommon(B, L, "Plutostation");

    // Charon: Plutos großer Mond, steht immer an derselben Stelle am Himmel; daneben (nur im Fernrohr) unser Mond zum Vergleich
    const charon = new THREE.Mesh(new THREE.SphereGeometry(30, 40, 28), new THREE.MeshStandardMaterial({ map: W.bodies.mond.mesh.material.map, color: 0x9a948c, roughness: 1 }));
    charon.position.copy(CHARON_DIR).multiplyScalar(900);
    const side = new V().crossVectors(CHARON_DIR, new V(0, 1, 0)).normalize();
    const cmpMoon = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 16), new THREE.MeshStandardMaterial({ map: W.bodies.mond.mesh.material.map, color: 0xd8d8d8, roughness: 1 }));
    cmpMoon.position.copy(charon.position).addScaledVector(side, 46); cmpMoon.visible = false;
    scene.add(charon, cmpMoon);
    const telescope = on(makeTelescope(CHARON_DIR), ...L.charon);

    const drone = on(makeDrone(), ...L.herz);
    // Funk-Antenne zeigt zur Sonne: Von hier aus steht die Erde ganz dicht neben ihr
    on(makeAntenna(SUN_DIR), ...L.funk);
    const signalFrom = new V(L.funk[0], height(...L.funk) + 1.7, L.funk[1]);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 880, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.copy(signalFrom).addScaledVector(SUN_DIR, 440);
    beam.quaternion.setFromUnitVectors(new V(0, 1, 0), SUN_DIR);
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(220,255,220,1)", "rgba(74,222,128,0.7)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    beam.visible = pulse.visible = false;
    scene.add(beam, pulse);

    on(makeSignpost("SONNE", "5,9 Mrd. km"), ...L.wegweiser).rotation.y = Math.atan2(L.wegweiser[0], L.wegweiser[1]) + Math.PI;
    on(makeProbe(), ...L.sonde).rotation.y = -0.5;
    const orrery = on(makeOrrery("pluto", 1.95, 0.6), ...L.jahr);
    const rack = on(makeSizeRack(["pluto", "mond", "erde"]), ...L.groesse);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, charon: L.charon, herz: L.herz, funk: L.funk, jahr: L.jahr, groesse: L.groesse,
      eis: L.eis, sonde: L.sonde, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] });
    const colliders = [...common.colliders, [...L.charon, 0.6], [...L.herz, 0.7], [...L.funk, 0.6], [...L.wegweiser, 0.3], [...L.sonde, 1],
      [...L.jahr, 1.2], [L.groesse[0] - 1.2, L.groesse[1], 1], [L.groesse[0] + 1.2, L.groesse[1], 1]];

    return { ...B, ...common, L, telescope, charon, cmpMoon, drone, droneY: drone.position.y, signalFrom, beam, pulse, orrery, rack,
      stations, colliders, shadowCasters: [rocket, common.station] };
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
    const sp = view.special; sp.t = -1.8; sp.end = false; sp.last = "";
    world.beam.visible = world.pulse.visible = false;
    scopeSay(cfg.signal.ready);
  }
  function updateSignal(dt) {
    const c = world.camera, sp = view.special, T = cfg.signal, M = world.signalFrom, h = Math.hypot(SUN_DIR.x, SUN_DIR.z);
    c.position.lerp(tmp.set(M.x - (SUN_DIR.x / h) * 7, M.y + 1, M.z - (SUN_DIR.z / h) * 7), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.copy(M).addScaledVector(SUN_DIR, 16), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (sp.end) return;
    sp.t += dt;
    if (sp.t < 0) return;
    const f = Math.min(1, sp.t / SIGNAL_TIME), far = 880 * f;
    world.beam.visible = world.pulse.visible = true;
    world.pulse.position.copy(M).addScaledVector(SUN_DIR, far);
    world.pulse.scale.setScalar(0.7 + far * 0.03);
    if (f >= 1) {
      sp.end = true; world.pulse.visible = false; Sound.correct();
      scopeSay(T.end, [[T.again, runSignal], [T.done, endSignal, true]]);
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
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    pin.rotation.x = Math.PI / 2; pin.position.z = 0.62; ball.add(pin);
    g.userData = { ball };
    return g;
  }

  // =========================================================
  //  Venus
  // =========================================================
  const VENUS_LAYOUT = {
    spawn: [-6.9, 4], waage: [-12, 20], hitze: [10, 18], druck: [24, 30], abendstern: [-24, 34],
    venera: [20, -20], lava: [-30, -18], wegweiser: [14, 4],
    station: [0, 56], tag: [-6, 49], groesse: [6, 49]
  };
  const VENUS_SKY = new THREE.Color(0xd9a441), VENUS_CLEAR = new THREE.Color(0x05070f);
  const VENUS_EARTH_DIR = new V(0.35, 0.55, 0.75).normalize();
  function buildVenus() {
    const L = { ...VENUS_LAYOUT };
    const craters = [[70, 30, 14, 1.2], [-80, -50, 18, 1.6], [50, -80, 12, 1.2], [-70, 80, 12, 1]];
    const flats = [[0, 0, 11], [...L.station, 16], [...L.waage, 3], [...L.hitze, 4], [...L.druck, 4], [...L.abendstern, 4]];
    const B = buildBase({
      height: makeHeight(craters, flats, 160),
      // dichte, giftige Wolken: gelb-oranger Dunst, man sieht kaum 100 Meter weit, die Sonne ist nur ein heller Schein
      sky: VENUS_SKY.getHex(), fog: [18, 190], stars: false, sunSize: 190,
      ground: 0x8a6a48, rock: 0x5a4632,
      tint: (x, z) => { const m = 0.6 + 0.35 * fbm2(x * 0.03 + 4, z * 0.03); return [m, m * 0.92, m * 0.8]; },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [...L.waage, 4], [...L.hitze, 4], [...L.druck, 4], [...L.abendstern, 4],
        [...L.venera, 3], [...L.lava, 5], [...L.wegweiser, 3]],
      ambient: [0xffc070, 0.75], hemi: [0xffd28a, 0x5a3a1a, 0.4], sun: [0xffe2b0, 0.5],
      dust: ["rgba(200,160,100,1)", "rgba(170,130,80,0.9)"]
    });
    const { scene, on, rocket } = B;
    const common = addCommon(B, L, "Venusstation");

    // Großes Thermometer (Treibhaus-Versuch), schaut zur Sonne hin
    const board = on(makeBoard(), ...L.hitze);
    board.rotation.y = Math.atan2(-SUN_DIR.x, -SUN_DIR.z);
    // Druck-Versuch: Blechdose unter einer Schutzglocke
    const press = on(makeTable(), ...L.druck);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 20), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.3 }));
    can.position.y = 1.2; press.add(can);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide }));
    dome.position.y = 1.03; press.add(dome);
    // Spezial-Fernrohr, das durch die Wolken schaut: die Erde als blauer Punkt, daneben winzig der Mond
    const telescope = on(makeTelescope(VENUS_EARTH_DIR), ...L.abendstern);
    const dot = (inner, outer, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(inner, outer), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })); s.scale.setScalar(size); s.visible = false; scene.add(s); return s; };
    const earthStar = dot("rgba(200,225,255,1)", "rgba(80,150,255,0.7)", 14), moonStar = dot("rgba(255,255,255,1)", "rgba(200,200,200,0.5)", 4);
    earthStar.position.copy(VENUS_EARTH_DIR).multiplyScalar(900);
    moonStar.position.copy(earthStar.position).addScaledVector(new V().crossVectors(VENUS_EARTH_DIR, new V(0, 1, 0)).normalize(), 12);

    on(makeProbe(), ...L.venera).rotation.y = 0.9;
    // Lava-Spalte: glühende Risse im dunklen Gestein
    const lava = new THREE.Group(), glow = new THREE.MeshBasicMaterial({ color: 0xff6a1a, fog: false });
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22 + hash2(i, 1) * 0.2, 0.04, 1.5), glow);
      seg.position.set((hash2(i, 2) - 0.5) * 0.9, 0.03, (i - 2.5) * 1.25); seg.rotation.y = (hash2(i, 3) - 0.5) * 0.9; lava.add(seg);
    }
    on(lava, ...L.lava);
    on(makeSignpost("SONNE", "108 Mio. km"), ...L.wegweiser).rotation.y = Math.atan2(L.wegweiser[0], L.wegweiser[1]) + Math.PI;
    // Dreh-Vergleich: Erde und Venus als Globen nebeneinander
    const globes = new THREE.Group(), gE = makeGlobe("erde"), gV = makeGlobe("venus");
    gE.position.x = 0.9; gV.position.x = -0.9; globes.add(gE, gV);
    on(globes, ...L.tag);
    const rack = on(makeSizeRack(["mond", "venus", "erde"]), ...L.groesse);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, hitze: L.hitze, druck: L.druck, tag: L.tag, groesse: L.groesse, abendstern: L.abendstern,
      venera: L.venera, lava: L.lava, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] });
    const colliders = [...common.colliders, [...L.hitze, 0.4], [...L.druck, 1], [...L.abendstern, 0.6], [...L.venera, 1], [...L.wegweiser, 0.3],
      [...L.tag, 1.5], [L.groesse[0] - 1.2, L.groesse[1], 1], [L.groesse[0] + 1.2, L.groesse[1], 1]];

    return { ...B, ...common, L, board, press, can, dome, telescope, earthStar, moonStar, globeE: gE.userData.ball, globeV: gV.userData.ball, rack,
      stations, colliders, shadowCasters: [rocket, common.station] };
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
    scopeSay(cfg.heat.intro, [[cfg.heat.off, () => setClouds(false), true]]);
  }
  function setClouds(on) {
    const sp = view.special, T = cfg.heat;
    sp.clear = !on;
    if (!on) sp.tried = 1; else if (sp.tried) sp.tried = 2;
    Sound.whoosh();
    if (!on) scopeSay(T.offText, [[T.on, () => setClouds(true), true]]);
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
    scopeSay(cfg.press.ready, [[cfg.press.go, runPress, true]]);
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
    if (sp.t > 2.4) { sp.run = false; Sound.correct(); scopeSay(cfg.press.end, [[cfg.press.again, runPress], [cfg.press.done, endHidden, true]]); }
  }
  // --- Dreh-Vergleich: 10 Erdtage lang drehen sich beide Globen ---
  const SPIN_TIME = 12, SPIN_DAYS = 10;
  function startSpin() {
    enterExhibit("tag", { update: updateSpin, t: 0, run: false, last: "" });
    world.astronaut.visible = false;
    scopeSay(cfg.spin.ready, [[cfg.spin.go, runSpin, true]]);
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
    if (f >= 1) { sp.run = false; Sound.correct(); scopeSay(T.end, [[T.again, runSpin], [T.done, endHidden, true]]); return; }
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
  const ERDE_LAYOUT = {
    spawn: [-6.9, 4], waage: [-12, 20], luft: [10, 18], stern: [24, 30], mond: [-24, 34],
    see: [44, -12], wasser: [31, -8], wald: [-36, -16], wegweiser: [14, 4],
    station: [0, 56], tag: [18, 46], groesse: [0, 49] // Sonnenuhr rechts neben der Station: freier Blick zum Sonnenuntergang
  };
  const ERDE_SKY = new THREE.Color(0x7ec0ee), ERDE_NIGHT = new THREE.Color(0x04060e), ERDE_DUSK = new THREE.Color(0xf08a3c);
  const ERDE_MOON_DIR = new V(-0.55, 0.5, 0.65).normalize();
  function makeTree(s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.6 * s, 8), new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 }));
    trunk.position.y = 0.8 * s; trunk.castShadow = true; g.add(trunk);
    const green = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 1, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry((1.5 - i * 0.35) * s, 1.8 * s, 9), green);
      c.position.y = (1.9 + i * 1.05) * s; c.castShadow = true; g.add(c);
    }
    return g;
  }
  function buildErde() {
    const L = { ...ERDE_LAYOUT };
    const craters = [[...L.see, 18, 2.4]]; // die Senke für den See
    const flats = [[0, 0, 11], [...L.station, 16], [...L.waage, 3], [...L.luft, 4], [...L.stern, 4], [...L.mond, 4], [...L.wald, 9], [...L.tag, 3]];
    const B = buildBase({
      height: makeHeight(craters, flats, 200),
      // Luft: blauer Himmel, leichter Dunst in der Ferne, am Tag keine Sterne
      sky: ERDE_SKY.getHex(), fog: [160, 560], stars: false, sunSize: 150,
      ground: 0x6aa84f, rock: 0x8a8a86,
      tint: (x, z) => { const m = 0.75 + 0.3 * fbm2(x * 0.02 + 6, z * 0.02); return [m * 0.95, m, m * 0.85]; },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [...L.waage, 4], [...L.luft, 4], [...L.stern, 4], [...L.mond, 4],
        [...L.see, 20], [...L.wald, 9], [...L.wegweiser, 3]],
      ambient: [0xffffff, 0.55], hemi: [0xbfe3ff, 0x4a7a3a, 0.5], sun: [0xfff4e0, 1.5],
      dust: ["rgba(170,150,110,1)", "rgba(140,125,95,0.9)"]
    });
    const { scene, height, on, rocket } = B;
    const common = addCommon(B, L, "Erdstation");

    // See: flüssiges Wasser gibt es nur auf der Erde
    const water = new THREE.Mesh(new THREE.CircleGeometry(17.5, 48), new THREE.MeshStandardMaterial({ color: 0x2f7fd0, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.88 }));
    water.rotation.x = -Math.PI / 2; water.position.set(L.see[0], -0.7, L.see[1]); water.receiveShadow = true; scene.add(water);
    // Wald
    const trees = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const a = hash2(i, 11) * Math.PI * 2, r = 3.5 + hash2(i, 12) * 7, x = L.wald[0] + Math.cos(a) * r, z = L.wald[1] + Math.sin(a) * r;
      const t = makeTree(0.8 + hash2(i, 13) * 0.7); t.position.set(x, height(x, z), z); trees.add(t);
    }
    for (let i = 0; i < 14; i++) { // einzelne Bäume in der Landschaft
      const x = (hash2(i, 21) - 0.5) * 240, z = (hash2(i, 22) - 0.5) * 240;
      if (Math.hypot(x, z) < 70 || Math.hypot(x - L.see[0], z - L.see[1]) < 22) continue;
      const t = makeTree(0.9 + hash2(i, 23) * 0.8); t.position.set(x, height(x, z), z); trees.add(t);
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
    const telescope = on(makeTelescope(ERDE_MOON_DIR), ...L.mond);

    // Sternschnuppen-Versuch
    on(makeTable(), ...L.stern);
    const meteor = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 1, flatShading: true }));
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,225,150,1)", "rgba(255,110,20,0.9)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    meteor.add(fire); meteor.visible = false; scene.add(meteor);
    on(makeAntenna(new V(0.3, 0.8, 0.5).normalize()), ...L.luft); // Wetterstation beim Luft-Versuch
    on(makeSignpost("SONNE", "150 Mio. km"), ...L.wegweiser).rotation.y = Math.atan2(L.wegweiser[0], L.wegweiser[1]) + Math.PI;
    // Sonnenuhr: Der Schatten des Stabs wandert im Lauf des Tages
    const dial = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.8 })); plate.position.y = 0.06; plate.receiveShadow = true;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), new THREE.MeshStandardMaterial({ color: 0x374151 })); rod.position.y = 0.75; rod.castShadow = true;
    dial.add(plate, rod); on(dial, ...L.tag);
    const rack = on(makeSizeRack(["merkur", "mars", "venus", "erde"]), ...L.groesse);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, luft: L.luft, stern: L.stern, tag: L.tag, groesse: L.groesse, mond: L.mond,
      wasser: L.wasser, wald: L.wald, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] });
    const colliders = [...common.colliders, [...L.luft, 0.6], [...L.stern, 1], [...L.mond, 0.6], [...L.wegweiser, 0.3], [...L.tag, 0.4],
      [L.groesse[0] - 1.6, L.groesse[1], 1], [L.groesse[0], L.groesse[1], 1], [L.groesse[0] + 1.6, L.groesse[1], 1]];

    return { ...B, ...common, L, water, trees, clouds, cloudMat: white, moon, telescope, meteor, fire, rack, stations, colliders, shadowCasters: [rocket, common.station, trees] };
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
    scopeSay(cfg.air.intro, [[cfg.air.off, () => setEarthAir(false), true]]);
  }
  function setEarthAir(on) {
    const sp = view.special, T = cfg.air;
    sp.on = on;
    if (!on) sp.tried = 1; else if (sp.tried) sp.tried = 2;
    Sound.whoosh();
    if (!on) scopeSay(T.offText, [[T.on, () => setEarthAir(true), true]]);
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
    scopeSay(cfg.shooting.ready, [[cfg.shooting.go, runShooting, true]]);
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
    if (sp.t > 3) { sp.run = false; Sound.correct(); scopeSay(cfg.shooting.end, [[cfg.shooting.again, runShooting], [cfg.shooting.done, leaveExhibit, true]]); }
  }
  // --- Sonnenuhr: ein ganzer Tag im Zeitraffer ---
  const DAY_TIME = 14;
  function startDay() { enterExhibit("tag", { update: updateDay }); runDay(); }
  function runDay() { const sp = view.special; sp.t = -1.5; sp.run = true; sp.last = ""; setSun(0); erdeSky(1); scopeSay(cfg.day.ready); }
  function updateDay(dt) {
    const c = world.camera, sp = view.special, [x, z] = world.L.tag, y = world.height(x, z), T = cfg.day;
    // Blick über die Sonnenuhr dorthin, wo die Sonne untergeht (gegenüber von dort, wo sie jetzt steht)
    const h = Math.hypot(SUN_DIR.x, SUN_DIR.z), dx = -SUN_DIR.x / h, dz = -SUN_DIR.z / h;
    c.position.lerp(tmp.set(x - dx * 6, y + 3.4, z - dz * 6), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(x + dx * 30, y + 8, z + dz * 30), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (!sp.run) return;
    sp.t += dt;
    if (sp.t < 0) return;
    const f = Math.min(1, sp.t / DAY_TIME);
    setSun(f * Math.PI * 2); erdeSky(1);
    if (f >= 1) { sp.run = false; setSun(0); erdeSky(1); Sound.correct(); scopeSay(T.end, [[T.again, runDay], [T.done, leaveExhibit, true]]); return; }
    const hour = Math.floor(9 + f * 24) % 24;
    const text = fmtVars(sunNow.y > 0 ? T.day : T.night, { uhr: hour });
    if (text !== sp.last) { sp.last = text; $("scopeText").textContent = text; }
  }
  function startMoonScope() {
    const T = cfg.moonScope;
    startTour("mond", T, [{ pos: world.moon.position, fov: 5, text: T.found }]);
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
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 8, 0, Math.PI * 2, 0, 0.8), white);
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

  // Was jede Sonde sieht und erlebt. sky/fog: [am Anfang, am Ende] des Flugs · puff: Teilchen, die vorbeiziehen ·
  // rocks: Hindernisse (null = keine) · wind(t, Fortschritt) = seitliche Kraft · instr(Fortschritt) = Anzeige unten links
  const PROBES = {
    jupiter: {
      sky: [0x05060c, 0x3a2210], fog: [[400, 2600], [20, 150]], stars: true, shield: false,
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
      sky: [0x05060c, 0x05060c], fog: [[600, 4000], [600, 4000]], stars: true, shield: false,
      planet: { r: 330, from: [-300, -153, 560], to: [-300, -153, 440] }, // so nah, dass die schräge Ring-Ebene genau durch die Flugbahn geht
      puff: { inner: "rgba(255,255,255,1)", outer: "rgba(200,225,255,0.8)", size: [0.25, 0.8], opacity: 0.9, from: 0 },
      rocks: { count: 18, size: [0.7, 2.0], color: 0xdfeefc, glow: false },
      instr: (f) => ["🛰️", `${fmtInt(lerp(180000, 75000, f) / 1000) } Tsd. km bis Saturn`],
      update() {}
    },
    uranus: {
      sky: [0x04070d, 0x04070d], fog: [[600, 4000], [600, 4000]], stars: true, shield: false,
      planet: { r: 300, from: [400, 30, 950], to: [330, 30, 640] },
      puff: { inner: "rgba(210,250,255,1)", outer: "rgba(150,225,235,0.7)", size: [0.4, 1.4], opacity: 0.55, from: 0 },
      wind: (t) => 2 * Math.sin(t * 0.5),
      instr: (f) => ["🌡️", `−${Math.round(lerp(180, 224, f))} °C`],
      update(w, p, f, dt) { w.planet.rotation.x += dt * 0.02; }
    },
    neptun: {
      sky: [0x030614, 0x061233], fog: [[500, 3500], [90, 900]], stars: true, shield: false,
      planet: { r: 300, from: [-380, -50, 900], to: [-300, -80, 560] },
      puff: { inner: "rgba(235,245,255,1)", outer: "rgba(120,160,255,0.75)", size: [1.5, 6], opacity: 0.5, from: 0 },
      wind: (t, f) => (9 * Math.sin(t * 0.5) + 5 * Math.sin(t * 1.3 + 1)) * (0.4 + 0.6 * f),
      instr: (f) => ["💨", `Wind: ${fmtInt(Math.round(lerp(400, 2100, f) / 50) * 50)} km/h`],
      update() {}
    },
    sonne: {
      sky: [0x120600, 0x2b0d00], fog: [[900, 5000], [900, 5000]], stars: false, shield: true,
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

    const craft = makeSpaceProbe(C.shield); scene.add(craft);
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
    return { scene, camera, ambient, sun, far, planet, craft, gates, puffs, rocks, stations: {} };
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
    world.gates.forEach((g, i) => placeGate(g, i, 150 + i * GATE_GAP));
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
    setTimeout(() => { if (S.active) radio(rest === 0 ? cfg.radio.quizDone : foundCount() === 0 ? cfg.radio.start : cfg.radio.back, { rest }); }, 700);
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
      update(dt, busy) {
        if (!busy && Math.hypot(ast.pos.x - world.L.apollo[0], ast.pos.z - world.L.apollo[1]) < 9) discover("apollo");
        updateExperiment(dt);
        world.earth.rotation.y += dt * 0.02;
      },
      actions: { himmel: startScope, spiegel: startLaser, antenne: startLapse, fallversuch: startFall }
    },
    mars: {
      build: buildMars,
      reset() {
        marsSky(0); resetMagnet();
        world.telescope.visible = true;
        world.everest.visible = world.zugspitze.visible = world.roverGoal.visible = world.drill.userData.ice.visible = false;
        world.heli.position.y = world.heliY;
        world.drill.userData.rod.position.y = ROD_Y;
        const [x, z] = world.L.roverStart;
        world.rover.position.set(x, world.height(x, z), z); world.rover.rotation.y = world.rover.userData.heading = 2.2;
      },
      update(dt, busy, elapsed) {
        updateDevil(elapsed);
        updatePatrol(dt);
        updateNpcs(dt, elapsed, busy);
        updateShuttle(dt);
        world.blink.forEach((m, i) => { m.visible = ((elapsed * 0.9 + i * 0.37) % 1) < 0.45; });
        world.veils.rotation.y += dt * 0.004;
        Sound.wind(0.35 + 0.18 * Math.sin(elapsed * 0.37) + 0.12 * Math.sin(elapsed * 1.3 + 1)); // leises Heulen mit Böen
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
      update() {},
      // Wettrennen: Die Erde läuft eine Runde (365 Tage), Merkur in derselben Zeit gut vier
      orrery: { earthLaps: 1, planetLaps: 365 / 88, vars: (f) => ({ erde: Math.floor(f * 365), planet: Math.floor((f * 365) / 88) }) },
      actions: { sonne: startSunScope, krater: startMeteor, jahr: startOrrery, groesse: startGuess }
    },
    pluto: {
      build: buildPluto,
      reset() {
        world.telescope.visible = true;
        world.cmpMoon.visible = world.beam.visible = world.pulse.visible = world.drone.userData.flames.visible = false;
        world.drone.position.y = world.droneY; world.drone.visible = true;
        setOrrery(world.orrery, 0, 0);
      },
      update(dt, busy) {
        if (!busy && !view.special && inHeart(ast.pos.x, ast.pos.z)) discover("eis"); // auf dem glatten Stickstoff-Eis
      },
      grip: () => (inHeart(ast.pos.x, ast.pos.z) ? 0.16 : 1),
      // Wettrennen: Die Erde läuft 12 Runden, Pluto in derselben Zeit nur 12/248 einer Runde
      orrery: { earthLaps: 12, planetLaps: 12 / 248, vars: (f) => ({ erde: Math.floor(f * 12) }) },
      actions: { charon: startCharon, herz: startDrone, funk: startSignal, jahr: startOrrery, groesse: startGuess }
    },
    venus: {
      build: buildVenus,
      reset() {
        venusSky(0); resetCan();
        world.telescope.visible = true;
        world.globeE.rotation.y = world.globeV.rotation.y = 0;
      },
      update() {},
      actions: { hitze: startHeat, druck: startPress, tag: startSpin, groesse: startGuess, abendstern: startEveningStar }
    },
    erde: {
      build: buildErde,
      reset() {
        erdeSky(1);
        world.telescope.visible = true; world.meteor.visible = false;
      },
      update(dt, busy) {
        const [sx, sz] = world.L.see;
        if (!busy && !view.special && Math.hypot(ast.pos.x - sx, ast.pos.z - sz) < 15) discover("wasser"); // am Ufer des Sees
        world.clouds.rotation.y += dt * 0.004;
      },
      actions: { luft: startAir, stern: startShooting, tag: startDay, groesse: startGuess, mond: startMoonScope }
    }
  };

  if (/[?&]test/.test(location.search)) S._test = { ast, view, get world() { return world; }, get boarding() { return boarding; }, get scope() { return view.special; }, get probe() { return probe; }, discover, startAction, showFound, POSE, setBone, HATCH };
  return S;
})();
