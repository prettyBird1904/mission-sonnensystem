/* =========================================================
   Aussteigen & erkunden: als Astronaut über einen Himmelskörper laufen
   und die Lerninhalte selbst entdecken (bisher: Mond).
   ========================================================= */
window.Surface = (function () {
  const D = window.SPACE_DATA;
  // Gesprächs-Figuren (crew) laufen als Bewohner mit: sie stehen an ihrem Platz und reden miteinander (siehe updateTalks)
  for (const S of Object.values(D.surfaces)) if (S.crew && !S.crewIn) { S.npcs = [...(S.npcs || []), ...S.crew.map((c) => ({ ...c, crew: true, path: [c.spot] }))]; S.crewIn = true; }
  const V = THREE.Vector3;
  const $ = (id) => document.getElementById(id);
  const S = { active: false, scene: null, camera: null };
  const worlds = {};          // fertig gebaute Welten (schneller Wiedereinstieg)
  let G = null, W = null, UI = null;
  let world = null, cfg = null, bodyId = null, onExit = null, astronautModel = null, probeCam = null; // probeCam: nur für Tests (Kamera um die Sonde)
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
    wegweiser: [-10, 8], mondstein: [-16.1, 67.7], // Start der Weitsprung-Bahn unten im großen Krater (siehe MOON_JUMP)
    station: [44, 46], antenne: [11.3, 60], meet: [22, 26],
    route: {
      wegweiser: [[-7.5, 6.5]], waage: [[2, 8], [10, 6.5], [16.5, 7.5]], fallversuch: [[2, 9], [-14, 11], [-21.5, 12.6]], apollo: [[-21, 18], [-24, 21.5]],
      spiegel: [[-24.5, 27]], temperatur: [[-31.5, 30.5]], himmel: [[-20, 37], [-4, 38.5]], mondstein: [[-10, 50], [-14, 62], [-15.4, 65.8]],
      antenne: [[-8, 74], [2, 66], [8, 63.5]], wand: [[18, 56], [28, 50], [41, 41.5]], rakete: [[30, 36], [10, 12], [-4, 5]]
    }
  };
  const SHADOW_DIR = new V(-SUN_DIR.x, 0, -SUN_DIR.z).normalize(); // Schatten fallen weg von der Sonne
  // Mond-Weitsprung-Bahn unten im großen Krater: 9 m Anlauf bis zur weißen Absprunglinie (board), dahinter die Sprunggrube
  // mit Metermarken; die goldene Linie liegt 4 m hinter dem Brett (auf der Erde schafft man mit Raumanzug nicht mal 1 m).
  const MOON_JUMP = (() => {
    const dir = [-0.351, 0.936], [sx, sz] = MOON_LAYOUT.mondstein, board = [sx + dir[0] * 9, sz + dir[1] * 9];
    return { dir, board, start: [sx, sz], end: [board[0] + dir[0] * 7, board[1] + dir[1] * 7], gold: 4, run: 9, side: [dir[1], -dir[0]] };
  })();

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
    // Höhe der Ebene: "auto" = natürlicher Boden dort, "keep" = so hoch, wie die Ebenen davor den Boden dort schon gemacht haben
    const levels = [], flatten = (h, x, z, n) => {
      for (let i = 0; i < n; i++) { const [fx, fz, r, , bw = 10] = flats[i], dd = Math.hypot(x - fx, z - fz); if (dd < r + bw) h = levels[i] + (h - levels[i]) * smooth(r, r + bw, dd); }
      return h;
    };
    flats.forEach(([fx, fz, , lv], i) => levels.push(lv === "auto" ? raw(fx, fz) : lv === "keep" ? flatten(raw(fx, fz), fx, fz, i) : lv || 0));
    return function height(x, z) {
      let h = flatten(raw(x, z), x, z, flats.length);
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
  const NATURE_PAL = { leafsGreen: 0x4a8a32, leafsDark: 0x2c6430, leafsFall: 0xd9822f, grass: 0x55a038, woodBark: 0x7a5232, woodBarkDark: 0x5e3f28, woodBirch: 0xeee6d8,
    woodInner: 0xe4c79a, wood: 0xa8743f, woodDark: 0x7a5230, dirt: 0x7d5a3c, stone: 0xa9adb0, stoneDark: 0x878c90,
    colorRed: 0xd8203a, colorYellow: 0xf2b200, colorPurple: 0x7a4ce0, colorTan: 0xe0a060 }; // kräftigere Blütenfarben

  // =========================================================
  //  Eigene Modelle statt Baukasten (Kenney-Maße, Maßstab 1): Pflanzen, Holz, Steine, Zelt, Lagerfeuer, Kanu, Zaun, Laterne, Häuser
  // =========================================================
  // Teile sammeln und je Material zu einem Netz verschmelzen (wenige Zeichenaufrufe, auch als Instanzen)
  function partBuilder() {
    const byMat = new Map(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const api = {
      add(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], color = null, order = "XYZ") {
        e.set(rot[0], rot[1], rot[2], order); m4.compose(new V(...pos), q.setFromEuler(e), new V(...(typeof scl === "number" ? [scl, scl, scl] : scl)));
        return api.addM(geo, mat, m4.clone(), color);
      },
      addM(geo, mat, matrix, color = null) { if (!byMat.has(mat)) byMat.set(mat, []); byMat.get(mat).push({ geo, matrix, color }); return api; },
      group(shadow = true) {
        const g = new THREE.Group();
        for (const [mat, parts] of byMat) { const m = new THREE.Mesh(mergeParts(parts), mat); m.castShadow = shadow; m.receiveShadow = true; g.add(m); }
        return g;
      }
    };
    return api;
  }
  function mergeParts(parts) {
    const P = [], N = [], U = [], C = [], nm = new THREE.Matrix3(), col = new THREE.Color();
    for (const { geo, matrix, color } of parts) {
      const g = geo.index ? geo.toNonIndexed() : geo; if (!g.attributes.normal) g.computeVertexNormals();
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, vc = g.attributes.color, v = new V();
      nm.getNormalMatrix(matrix); if (color != null) col.set(color).convertSRGBToLinear();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(matrix); P.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
        U.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
        if (color != null) C.push(col.r, col.g, col.b); else if (vc) C.push(vc.getX(i), vc.getY(i), vc.getZ(i)); else C.push(1, 1, 1);
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); out.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    out.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); out.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
    out.computeBoundingSphere(); return out;
  }
  // Alle festen Netze einer Gruppe je Material verschmelzen (Teile in keep und deren Kinder bleiben einzeln, z. B. drehende oder blinkende Teile)
  function mergeStatic(root, keep = []) {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), drop = [], kept = new Set();
    for (const k of keep) if (k) k.traverse((o) => kept.add(o));
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || kept.has(o) || Array.isArray(o.material) || !o.visible || o.geometry.morphAttributes.position) return;
      for (let p = o.parent; p && p !== root; p = p.parent) if (kept.has(p) || !p.visible) return;
      const key = o.material.uuid + (o.castShadow ? "+" : "-");
      if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, parts: [] });
      groups.get(key).parts.push({ geo: o.geometry, matrix: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), color: null });
      drop.push(o);
    });
    for (const o of drop) if (o.parent) o.parent.remove(o);
    for (const { mat, cast, parts } of groups.values()) { const m = new THREE.Mesh(mergeParts(parts), mat); m.castShadow = cast; m.receiveShadow = true; root.add(m); }
    return root;
  }
  const PK = {}; // gemeinsame Materialien und Texturen der eigenen Modelle
  function pkMats() {
    if (PK.ready) return PK; PK.ready = true;
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.35, ...o });
    PK.plant = std({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }); PK.plant.userData.noCam = true;
    PK.petal = std({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55 }); PK.petal.userData.noCam = true;
    PK.barkTex = canvasTex(128, 256, (c) => { c.fillStyle = "#5b4330"; c.fillRect(0, 0, 128, 256); for (let i = 0; i < 46; i++) { const x = hash2(i, 1) * 128, w = 2 + hash2(i, 2) * 5; c.fillStyle = hash2(i, 3) > 0.5 ? "rgba(40,28,18,0.7)" : "rgba(130,105,80,0.45)"; c.fillRect(x, 0, w, 256); } for (let i = 0; i < 60; i++) { c.fillStyle = "rgba(30,20,12,0.5)"; c.fillRect(hash2(i, 4) * 128, hash2(i, 5) * 256, 3 + hash2(i, 6) * 10, 2); } });
    PK.barkTex.wrapS = PK.barkTex.wrapT = THREE.RepeatWrapping;
    PK.bark = std({ map: PK.barkTex, roughness: 0.95 });
    PK.endTex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, "#c89a62"); g.addColorStop(0.85, "#b98a55"); g.addColorStop(0.92, "#6b4a30"); g.addColorStop(1, "#4a3220"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); c.strokeStyle = "rgba(110,75,45,0.45)"; c.lineWidth = 1.2; for (let r = 6; r < 56; r += 5 + hash2(r, 1) * 3) { c.beginPath(); c.arc(64 + hash2(r, 2) * 3, 64, r, 0, 7); c.stroke(); } c.strokeStyle = "rgba(60,40,25,0.5)"; c.beginPath(); c.moveTo(64, 64); c.lineTo(110, 40); c.stroke(); });
    PK.end = std({ map: PK.endTex, roughness: 0.9 });
    PK.wood = std({ map: woodTex(), color: 0xc9a27a, roughness: 0.8 });
    PK.stone = std({ vertexColors: true, roughness: 0.95, flatShading: true });
    PK.cap = std({ map: canvasTex(128, 64, (c) => { c.fillStyle = "#c81e1e"; c.fillRect(0, 0, 128, 64); c.fillStyle = "#fff7ed"; for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse(hash2(i, 1) * 128, 6 + hash2(i, 2) * 40, 3 + hash2(i, 3) * 3, 2.5 + hash2(i, 3) * 2, 0, 0, 7); c.fill(); } }), roughness: 0.5 });
    PK.capTan = std({ color: 0xa8784a, roughness: 0.7 }); PK.stem = std({ color: 0xf3ead8, roughness: 0.7 });
    PK.fabric = std({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 });
    PK.metal = std({ color: 0x5b6470, metalness: 0.7, roughness: 0.4 });
    PK.ember = new THREE.MeshStandardMaterial({ color: 0x2a0d02, emissive: 0xff5a14, emissiveIntensity: 1.6, roughness: 0.9 });
    PK.char = std({ color: 0x1c1712, roughness: 1 });
    PK.lilyTex = canvasTex(128, 128, (c) => { c.fillStyle = "#3f7d33"; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = "rgba(160,210,120,0.55)"; c.lineWidth = 1.5; for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); c.stroke(); } const g = c.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, "rgba(120,180,90,0.4)"); g.addColorStop(1, "rgba(20,60,20,0.35)"); c.fillStyle = g; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); });
    PK.lily = std({ map: PK.lilyTex, roughness: 0.4, side: THREE.DoubleSide });
    // Häuser
    PK.plaster = std({ map: (() => { const t = canvasTex(256, 256, (c) => { const img = c.createImageData(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const v = 236 + (fbm2p(x / 20, y / 20, 12.8) - 0.5) * 30 + (hash2(x, y) - 0.5) * 12, i = (y * 256 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } c.putImageData(img, 0, 0); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t; })(), vertexColors: true, roughness: 0.92 });
    PK.tiles = std({ map: (() => { const t = canvasTex(256, 256, (c) => { c.fillStyle = "#d8d8d8"; c.fillRect(0, 0, 256, 256); for (let row = 0; row < 16; row++) for (let k = -1; k < 17; k++) { const x = k * 16 + (row % 2) * 8, y = row * 16, v = 180 + hash2(row, k) * 60; c.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 16, y); c.lineTo(x + 16, y + 10); c.quadraticCurveTo(x + 8, y + 17, x, y + 10); c.closePath(); c.fill(); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(x, y + 12, 16, 2); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); return t; })(), vertexColors: true, roughness: 0.7 });
    PK.trim = std({ color: 0xf7f7f4, roughness: 0.55 }); PK.glass = std({ color: 0x6f93b3, metalness: 0.45, roughness: 0.12, envMapIntensity: 1 });
    PK.door = std({ vertexColors: true, roughness: 0.6 }); PK.brick = std({ color: 0x9a4a35, roughness: 0.9 });
    PK.garage = std({ map: canvasTex(64, 128, (c) => { c.fillStyle = "#e6e6e2"; c.fillRect(0, 0, 64, 128); c.fillStyle = "rgba(0,0,0,0.18)"; for (let y = 6; y < 128; y += 12) c.fillRect(0, y, 64, 2); }), roughness: 0.6 });
    PK.plinth = std({ color: 0x8d8a84, roughness: 0.95 }); PK.gutter = std({ color: 0x8e979f, metalness: 0.6, roughness: 0.4 });
    PK.lamp = new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffd58a, emissiveIntensity: 0.8 });
    return PK;
  }
  // Grasbüschel aus gebogenen Halmen (unten dunkel, oben hell) – Normalen nach oben, so leuchtet das Gras weich
  function pkGrass(n, w, h, broad) {
    const p = [], nn = [], c = [], base = new THREE.Color(0x2f5d1f).convertSRGBToLinear(), tip = new THREE.Color(broad ? 0x6aa84a : 0x86b74c).convertSRGBToLinear();
    for (let i = 0; i < n; i++) {
      const a = hash2(i, 7) * 6.3, r = Math.sqrt(hash2(i, 8)) * w * 0.35, x0 = Math.cos(a) * r, z0 = Math.sin(a) * r, hh = h * (0.55 + hash2(i, 9) * 0.45), bw = (broad ? 0.03 : 0.012) * (0.7 + hash2(i, 10) * 0.6);
      const lean = (hash2(i, 11) - 0.3) * 0.9, la = a + (hash2(i, 12) - 0.5) * 1.5, dx = Math.cos(la), dz = Math.sin(la), px = -dz, pz = dx, S = 3;
      const pts = []; for (let k = 0; k <= S; k++) { const t = k / S, off = lean * hh * t * t; pts.push([x0 + dx * off, hh * t * (1 - 0.15 * lean * lean * t), z0 + dz * off, bw * (1 - t * 0.92)]); }
      for (let k = 0; k < S; k++) {
        const [ax, ay, az, aw] = pts[k], [bx, by, bz, bw2] = pts[k + 1], ca = base.clone().lerp(tip, k / S), cb = base.clone().lerp(tip, (k + 1) / S);
        const quad = [[ax - px * aw, ay, az - pz * aw, ca], [ax + px * aw, ay, az + pz * aw, ca], [bx + px * bw2, by, bz + pz * bw2, cb], [bx - px * bw2, by, bz - pz * bw2, cb]];
        for (const j of [0, 1, 2, 0, 2, 3]) { const [x, y, z, cc] = quad[j]; p.push(x, y, z); nn.push(0, 1, 0); c.push(cc.r, cc.g, cc.b); }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nn, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    return g;
  }
  // Blütenblatt (flach, rund) als Form
  const petalGeo = (w, l, round = 0.9) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(w * round, l * 0.2, w * round, l * 0.85, 0, l); sh.bezierCurveTo(-w * round, l * 0.85, -w * round, l * 0.2, 0, 0); return new THREE.ShapeGeometry(sh, 6); };
  const leafGeo = (w, l) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(w, l * 0.45, 0, l); sh.quadraticCurveTo(-w, l * 0.45, 0, 0); const g = new THREE.ShapeGeometry(sh, 5), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -0.3 * (p.getY(i) / l) ** 2 * l); g.computeVertexNormals(); return g; };
  // Blumen: tulpe, mohn, hahnenfuss, loewenzahn, lavendel, kornblume
  function pkFlower(kind, H) {
    const M = pkMats(), b = partBuilder(), green = 0x3e7a2a;
    b.add(new THREE.CylinderGeometry(0.0035, 0.005, H, 5), M.plant, [0, H / 2, 0], [0, 0, 0], 1, green);
    for (const a of [0.4, 2.6]) b.add(leafGeo(0.012, H * 0.45), M.plant, [0, 0.01, 0], [0.5, a, 0], 1, 0x4b8a30, "YXZ");
    const head = (geo, col, pos, rot, scl = 1, order = "YXZ") => b.add(geo, M.petal, pos, rot, scl, col, order);
    if (kind === "tulpe") { for (let k = 0; k < 6; k++) head(petalGeo(0.018, 0.05, 0.95), k % 2 ? 0xd62828 : 0xe03a3a, [0, H - 0.01, 0], [-0.22, (k / 6) * Math.PI * 2, 0]); }
    else if (kind === "mohn") { for (let k = 0; k < 4; k++) head(petalGeo(0.03, 0.045, 1.05), 0xe63922, [0, H, 0], [-1.05, (k / 4) * Math.PI * 2, 0]); head(new THREE.SphereGeometry(0.009, 8, 6), 0x1f1a14, [0, H + 0.008, 0], [0, 0, 0]); }
    else if (kind === "hahnenfuss") { for (let k = 0; k < 5; k++) head(petalGeo(0.018, 0.026, 1.1), 0xf7c600, [0, H, 0], [-0.75, (k / 5) * Math.PI * 2, 0]); head(new THREE.SphereGeometry(0.006, 8, 6), 0xd68a00, [0, H + 0.004, 0], [0, 0, 0]); }
    else if (kind === "loewenzahn") { for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 16; k++) head(petalGeo(0.004, 0.026 - ring * 0.008, 1), ring ? 0xffd21f : 0xf5b800, [0, H + ring * 0.004, 0], [-1.25 + ring * 0.5, (k / 16) * Math.PI * 2 + ring * 0.2, 0]); }
    else if (kind === "lavendel") { for (let k = 0; k < 14; k++) head(new THREE.SphereGeometry(0.006, 6, 4), k % 3 ? 0x8a6bd1 : 0x7357c0, [Math.cos(k * 2.4) * 0.005, H - 0.05 + k * 0.0045, Math.sin(k * 2.4) * 0.005], [0, 0, 0], [1, 1.4, 1]); }
    else { for (let k = 0; k < 12; k++) head(petalGeo(0.006, 0.024, 1), 0x4a63d8, [0, H, 0], [-1.2, (k / 12) * Math.PI * 2, 0]); head(new THREE.SphereGeometry(0.008, 8, 6), 0x2b2f6b, [0, H + 0.003, 0], [0, 0, 0]); }
    return b.group(false);
  }
  // Busch aus Blattbüscheln (wie die Baumkronen), innen ein dunkler Kern gegen Durchblick
  function pkBush(W, Hh, D, leaf, n) {
    const M = rtreeMats(), b = partBuilder(), c = new V(0, Hh * 0.45, 0), p = [], nn = [], uv = [], cl = [], idx = [];
    for (let i = 0; i < n; i++) {
      const u = hash2(i, 31) * 2 - 1, a = hash2(i, 32) * 6.3, rr = 0.75 + hash2(i, 33) * 0.3, y = Math.max(-0.2, u);
      const dir = new V(Math.cos(a) * Math.sqrt(1 - y * y), y, Math.sin(a) * Math.sqrt(1 - y * y)), pos = new V(dir.x * W * 0.5 * rr, Hh * 0.45 + dir.y * Hh * 0.55 * rr, dir.z * D * 0.5 * rr);
      const size = Math.min(W, D) * (0.32 + hash2(i, 34) * 0.18), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(hash2(i, 35) * 6.3, hash2(i, 36) * 6.3, hash2(i, 37) * 6.3));
      const ax = new V(1, 0, 0).applyQuaternion(q).multiplyScalar(size / 2), ay = new V(0, 1, 0).applyQuaternion(q).multiplyScalar(size / 2), nrm = pos.clone().sub(c).add(new V(0, 0.2 * Hh, 0)).normalize(), g = 0.55 + 0.45 * Math.max(0, (pos.y / Hh)), base = p.length / 3;
      [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]].forEach(([sx, sy, uu, vv]) => { const v = pos.clone().addScaledVector(ax, sx).addScaledVector(ay, sy); p.push(v.x, v.y, v.z); nn.push(nrm.x, nrm.y, nrm.z); uv.push(uu, vv); cl.push(g, g, g); });
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); lg.setAttribute("normal", new THREE.Float32BufferAttribute(nn, 3)); lg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); lg.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3)); lg.setIndex(idx);
    b.add(lg, M.leaf[leaf], [0, 0, 0]);
    b.add(new THREE.IcosahedronGeometry(1, 1), pkMats().plant, [0, Hh * 0.42, 0], [0, 0, 0], [W * 0.36, Hh * 0.38, D * 0.36], 0x24451a);
    return b.group(true);
  }
  function pkMushrooms(tan) {
    const M = pkMats(), b = partBuilder();
    [[0, 0, 0.25, 0.07], [0.07, 0.05, 0.17, 0.05], [-0.06, 0.06, 0.12, 0.04]].forEach(([x, z, h, r], i) => {
      const st = []; for (let k = 0; k <= 6; k++) { const t = k / 6; st.push(new THREE.Vector2(r * 0.3 * (1.2 - 0.3 * t), t * h * 0.8)); }
      b.add(new THREE.LatheGeometry(st, 10), M.stem, [x, 0, z], [0, 0, 0.08 * (i - 1)]);
      const cp = []; for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI * 0.5; cp.push(new THREE.Vector2(Math.max(0.001, Math.sin(a) * r), Math.cos(a) * r * (tan ? 0.55 : 0.7))); }
      cp.reverse(); b.add(new THREE.LatheGeometry(cp, 16), tan ? M.capTan : M.cap, [x, h * 0.78, z], [0, i, 0.08 * (i - 1)]);
      b.add(new THREE.CircleGeometry(r * 0.98, 16), M.stem, [x, h * 0.78 + 0.002, z], [Math.PI / 2, 0, 0]); // Lamellen unter dem Hut
    });
    return b.group(true);
  }
  function pkLog(r, len) { const M = pkMats(), b = partBuilder(); b.add(new THREE.CylinderGeometry(r, r * 1.05, len, 14, 1, true), M.bark, [0, r, 0], [Math.PI / 2, 0, 0]); for (const s of [-1, 1]) b.add(new THREE.CircleGeometry(r, 14), M.end, [0, r, (s * len) / 2], [0, s > 0 ? 0 : Math.PI, 0]); b.add(new THREE.CylinderGeometry(r * 0.25, r * 0.3, r * 1.2, 6), M.bark, [r * 0.7, r * 1.3, len * 0.15], [0, 0, -0.9]); return b; }
  function pkStump() { const M = pkMats(), b = partBuilder(); b.add(new THREE.CylinderGeometry(0.13, 0.16, 0.22, 16, 1, true), M.bark, [0, 0.11, 0]); b.add(new THREE.CircleGeometry(0.13, 16), M.end, [0, 0.22, 0], [-Math.PI / 2, 0, 0]); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3; b.add(new THREE.ConeGeometry(0.05, 0.18, 6), M.bark, [Math.cos(a) * 0.15, 0.04, Math.sin(a) * 0.15], [0, -a, Math.PI / 2 - 0.35], 1, null, "YXZ"); } b.add(new THREE.SphereGeometry(0.05, 8, 6), M.plant, [0.06, 0.2, 0.05], [0, 0, 0], [1.4, 0.35, 1.1], 0x557a2a); return b.group(true); }
  function pkRock(w, h, d, seed) { const M = pkMats(), b = partBuilder(), g = naturalRockGeo(seed, 2); g.translate(0, 0.35, 0); b.add(g, M.stone, [0, 0, 0], [0, 0, 0], [w / 2.1, h / 1.45, d / 2.1], null); const out = b.group(true); out.traverse((o) => { if (o.isMesh) { const c = o.geometry.attributes.color; for (let i = 0; i < c.count; i++) { const v = c.getX(i); c.setXYZ(i, v * 0.62, v * 0.6, v * 0.56); } } }); return out; }
  function pkLily(big) {
    const M = pkMats(), b = partBuilder(), r = big ? 0.13 : 0.09;
    const pad = new THREE.CircleGeometry(r, 24, 0.25, Math.PI * 2 - 0.5); b.add(pad, M.lily, [0, 0.01, 0], [-Math.PI / 2, 0, 0]);
    if (big) { for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 8; k++) b.add(petalGeo(0.012, 0.04 - ring * 0.01, 1), M.petal, [0.03, 0.02 + ring * 0.006, 0.02], [-1.0 + ring * 0.45, (k / 8) * Math.PI * 2 + ring * 0.4, 0], 1, ring ? 0xffe4ef : 0xfff7fb, "YXZ"); b.add(new THREE.SphereGeometry(0.009, 8, 6), M.petal, [0.03, 0.03, 0.02], [0, 0, 0], 1, 0xf6c400); }
    return b.group(false);
  }
  // Zelt (Firstzelt, Tür vorn +Z, offen mit zurückgeschlagenen Planen): Maße wie die Vorlage 0,87 × 0,56 × 0,67
  function pkTent() {
    const M = pkMats(), b = partBuilder(), W = 0.64, L = 0.84, H = 0.54, red = 0xc8352b, grey = 0x5b6470, inner = 0xd9c9b0;
    const slope = Math.hypot(W / 2, H), ang = Math.atan2(H, W / 2);
    // Dachflächen (je Seite eine Fläche vom First zur Traufe)
    const roof = (s) => { const g = new THREE.PlaneGeometry(L, slope, 8, 3), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -0.012 * Math.sin(((y / slope) + 0.5) * Math.PI)); } g.computeVertexNormals(); return g; };
    b.addM(roof(1), M.fabric, new THREE.Matrix4().compose(new V(W / 4, H / 2, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + ang, Math.PI / 2, 0, "YXZ")), new V(1, 1, 1)), red);
    b.addM(roof(1), M.fabric, new THREE.Matrix4().compose(new V(-W / 4, H / 2, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + ang, -Math.PI / 2, 0, "YXZ")), new V(1, 1, 1)), red);
    const tri = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath(); return new THREE.ShapeGeometry(sh); };
    b.add(tri(W, H), M.fabric, [0, 0, -L / 2], [0, 0, 0], 1, red);                                                        // Rückwand
    b.add(tri(W * 0.92, H * 0.92), M.fabric, [0, 0, -L / 2 + 0.02], [0, 0, 0], 1, inner);
    b.add(tri(W * 0.9, H * 0.9), M.fabric, [0, 0, L / 2 - 0.03], [0, 0, 0], 1, 0x2a221c);                                  // dunkles Innere hinter der Tür
    for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s * W * 0.5, 0); sh.lineTo(0, H); sh.closePath(); b.add(new THREE.ShapeGeometry(sh), M.fabric, [s * W * 0.02, 0, L / 2 + 0.005], [0, s * 0.9, 0], 1, red); } // zurückgeschlagene Planen
    b.add(new THREE.PlaneGeometry(W * 0.95, L), M.fabric, [0, 0.004, 0], [-Math.PI / 2, 0, 0], 1, grey);                   // Boden
    for (const z of [-L / 2 - 0.01, L / 2 + 0.01]) b.add(new THREE.CylinderGeometry(0.006, 0.006, H + 0.04, 6), M.metal, [0, (H + 0.04) / 2, z]);
    b.add(new THREE.CylinderGeometry(0.004, 0.004, L + 0.02, 6), M.metal, [0, H, 0], [Math.PI / 2, 0, 0]);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const top = new V(x * W * 0.42, H * 0.2, z * L * 0.5), pg = new V(x * W * 0.72, 0, z * L * 0.62), d = pg.clone().sub(top); const m = new THREE.Matrix4().compose(top.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), d.clone().normalize()), new V(1, d.length(), 1)); b.addM(new THREE.CylinderGeometry(0.0015, 0.0015, 1, 4), M.metal, m, 0xe5e7eb); b.add(new THREE.CylinderGeometry(0.004, 0.002, 0.03, 5), M.metal, [pg.x, 0.01, pg.z]); } // Abspannleinen mit Heringen
    for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.008, 0.006, L), M.fabric, [s * W * 0.5, 0.02, 0], [0, 0, 0], 1, grey);
    return b.group(true);
  }
  function pkCampfire() {
    const M = pkMats(), b = partBuilder();
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, g = naturalRockGeo(70 + k, 1); g.translate(0, 0.35, 0); b.add(g, M.stone, [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12], [0, a, 0], [0.035, 0.028, 0.03], 0x8a8780); }
    b.add(new THREE.CircleGeometry(0.1, 16), M.char, [0, 0.003, 0], [-Math.PI / 2, 0, 0]);
    b.add(new THREE.CircleGeometry(0.05, 12), M.ember, [0, 0.006, 0], [-Math.PI / 2, 0, 0]);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; b.add(new THREE.CylinderGeometry(0.012, 0.014, 0.16, 7), M.bark, [Math.cos(a) * 0.035, 0.045, Math.sin(a) * 0.035], [0, -a, 1.0], 1, null, "YXZ"); }
    return b.group(true);
  }
  // Kanu: Rumpf aus Spanten (Querschnitt U, an den Enden hochgezogen), Süllrand aus Holz, zwei Sitzbänke
  function pkCanoe() {
    const M = pkMats(), b = partBuilder(), L = 1.14, Wd = 0.29, Hh = 0.15, S = 40, R = 12, p = [], idx = [], nn = [];
    const sec = (t) => { const e = Math.pow(Math.max(0, 1 - t * t), 0.62), top = Hh + 0.04 * Math.pow(Math.abs(t), 4); return { w: (Wd / 2) * e, d: Hh * Math.pow(Math.max(0, 1 - t * t), 0.35), top }; };
    for (let i = 0; i <= S; i++) { const t = -1 + (2 * i) / S, z = (t * L) / 2, { w, d, top } = sec(t); for (let j = 0; j <= R; j++) { const a = (j / R) * Math.PI; p.push(-Math.cos(a) * w, top - Math.sin(a) * d, z); } }
    for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, c = a + R + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    const hull = new THREE.BufferGeometry(); hull.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); hull.setIndex(idx); hull.computeVertexNormals();
    b.add(hull, M.fabric, [0, 0, 0], [0, 0, 0], 1, 0x1d6b47);
    for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 20; i++) { const t = -0.97 + (1.94 * i) / 20, { w, top } = sec(t); pts.push(new V(s * w, top, (t * L) / 2)); } b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.007, 5), M.wood); }
    for (const t of [-0.45, 0, 0.45]) { const { w, top } = sec(t); b.add(new THREE.BoxGeometry(w * 2, 0.008, t ? 0.05 : 0.025), M.wood, [0, top - (t ? 0.04 : 0.005), (t * L) / 2]); }
    return b.group(true);
  }
  function pkPaddle() { const M = pkMats(), b = partBuilder(); b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8), M.wood, [0, 0.02, -0.07], [Math.PI / 2, 0, 0]); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.04, 0.02, 0.04, 0.13, 0, 0.17); sh.bezierCurveTo(-0.04, 0.13, -0.04, 0.02, 0, 0); b.add(new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }), M.wood, [0, 0.023, 0.13], [Math.PI / 2, 0, 0]); b.add(new THREE.BoxGeometry(0.05, 0.012, 0.015), M.wood, [0, 0.02, -0.29]); return b.group(true); }
  // Holzzaun: zwei Riegel, Latten mit Spitze (1 m lang, 0,35 hoch)
  function pkFence() { const M = pkMats(), b = partBuilder(); for (const y of [0.1, 0.26]) b.add(new THREE.BoxGeometry(1.0, 0.035, 0.02), M.wood, [0, y, -0.012]); for (let k = 0; k < 7; k++) { const x = -0.43 + k * 0.143, sh = new THREE.Shape(); sh.moveTo(-0.025, 0); sh.lineTo(0.025, 0); sh.lineTo(0.025, 0.31); sh.lineTo(0, 0.35); sh.lineTo(-0.025, 0.31); sh.closePath(); b.add(new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: false }), M.wood, [x, 0, 0]); } return b.group(true); }
  // Straßenlaterne: Mast, gebogener Arm (zur Straße, −X), Leuchtenkopf mit leuchtender Unterseite (Höhe 0,67, Maßstab ×8,5 ≈ 5,7 m)
  function pkStreetLight() { const M = pkMats(), b = partBuilder(), H = 0.6; b.add(new THREE.CylinderGeometry(0.008, 0.012, H, 10), M.metal, [0, H / 2, 0]); b.add(new THREE.CylinderGeometry(0.016, 0.018, 0.04, 10), M.metal, [0, 0.02, 0]); const pts = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push(new V(-0.06 + Math.cos(a) * 0.06, H + Math.sin(a) * 0.05, 0)); } pts.reverse(); pts.push(new V(-0.13, H + 0.05, 0)); b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.006, 6), M.metal); b.add(new THREE.BoxGeometry(0.05, 0.014, 0.028), M.metal, [-0.14, H + 0.05, 0]); b.add(new THREE.BoxGeometry(0.044, 0.004, 0.022), M.lamp ? pkMats().lamp : M.metal, [-0.14, H + 0.042, 0]); return b.group(true); }
  function pkWarnSign() { const M = pkMats(), b = partBuilder(); b.add(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 8), M.metal, [0, 0.1, 0]); const tex = canvasTex(128, 128, (c) => { c.fillStyle = "#fff"; c.beginPath(); c.moveTo(64, 6); c.lineTo(122, 116); c.lineTo(6, 116); c.closePath(); c.fill(); c.strokeStyle = "#dc2626"; c.lineWidth = 14; c.stroke(); c.fillStyle = "#111"; c.font = "bold 64px sans-serif"; c.textAlign = "center"; c.fillText("!", 64, 104); }); const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })); sign.position.set(0, 0.19, 0.006); const g = b.group(true); g.add(sign); return g; }
  function pkPathStones() { const M = pkMats(), b = partBuilder(); [[0, -0.07], [0.02, 0], [-0.01, 0.07]].forEach(([x, z], i) => { const sh = new THREE.Shape(); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, r = 0.035 * (0.85 + hash2(i, k) * 0.3); if (k) sh.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r); } b.add(new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 }), M.stone, [x, 0.008, z], [-Math.PI / 2, 0, i * 0.7], 1, 0xb6b0a4); }); return b.group(true); }
  function pkPlanter() { const M = pkMats(), b = partBuilder(); for (const [x, z, w, d] of [[0, 0.14, 0.4, 0.02], [0, -0.14, 0.4, 0.02], [0.19, 0, 0.02, 0.26], [-0.19, 0, 0.02, 0.26]]) b.add(new THREE.BoxGeometry(w, 0.11, d), M.wood, [x, 0.055, z]); b.add(new THREE.BoxGeometry(0.36, 0.01, 0.26), M.char, [0, 0.1, 0]); const out = b.group(true); const kinds = ["tulpe", "mohn", "hahnenfuss", "kornblume", "loewenzahn", "tulpe"]; kinds.forEach((k, i) => { const fl = pkFlower(k, 0.06 + hash2(i, 1) * 0.03); fl.scale.setScalar(0.9); fl.position.set(-0.13 + (i % 3) * 0.13, 0.1, i < 3 ? -0.05 : 0.06); out.add(fl); }); const bush = pkBush(0.12, 0.08, 0.12, 1, 22); bush.position.set(0.15, 0.1, 0); out.add(bush); return out; }
  // Haus nach Farbschema k: Sockel, verputzte Wände, Satteldach mit Ziegeln, Gauben, Fenster mit Rahmen, Sprossen, Fensterbänken
  // (manche mit Läden), Haustür mit Vordach und Stufen, Schornstein, Regenrinnen; Typ g mit Garage. Gebaut in Metern, Ausgabe in Vorlagen-Maßstab (÷ 7,5)
  function pkHouse(type, k) {
    const M = pkMats(), b = partBuilder(), T = { a: [1.3, 0.83, 1.03], c: [1.29, 1.03, 1.03], g: [1.45, 0.77, 1.18], h: [1.3, 0.74, 0.92], i: [1.29, 0.74, 1.03], k: [0.92, 1.15, 1.02], r: [1.03, 1.14, 1.02] }[type] || [1.3, 0.83, 1.03];
    const [wallC, roofC] = HOUSE_SCHEMES[k % HOUSE_SCHEMES.length], doorC = [0x2f5d50, 0x7a2e2e, 0x2c4f7c, 0x5b4636, 0x3f3f46][k % 5], shutterC = [0x2f6b4f, 0x3b5f8a, 0x7a3b2e][k % 3];
    const garage = type === "g", W = T[0] * 7.5 * (garage ? 0.62 : 0.8), D = T[2] * 7.5 * 0.74, floors = T[1] > 0.95 ? 2 : 1, FH = 2.7, B0 = 0.45, WH = floors * FH, top = B0 + WH;
    const pitch = floors === 2 ? 0.66 : 0.72, OV = 0.45, RD = D / 2 + OV, RH = Math.tan(pitch) * (D / 2), slopeLen = RD / Math.cos(pitch), ox = garage ? -1.4 : 0;
    b.add(new THREE.BoxGeometry(W + 0.14, B0, D + 0.14), M.plinth, [ox, B0 / 2, 0]);
    b.add(new THREE.BoxGeometry(W, WH, D), M.plaster, [ox, B0 + WH / 2, 0], [0, 0, 0], 1, wallC);
    const gable = new THREE.Shape(); gable.moveTo(-D / 2, 0); gable.lineTo(D / 2, 0); gable.lineTo(0, RH); gable.closePath();
    for (const s of [-1, 1]) b.add(new THREE.ShapeGeometry(gable), M.plaster, [ox + (s * W) / 2, top, 0], [0, (s * Math.PI) / 2, 0], 1, wallC);
    for (const s of [-1, 1]) {
      b.add(new THREE.BoxGeometry(W + 2 * OV, 0.12, slopeLen), M.tiles, [ox, top + RH - Math.sin(pitch) * slopeLen / 2 + 0.06, (s * Math.cos(pitch) * slopeLen) / 2], [s * pitch, 0, 0], 1, roofC);
      b.add(new THREE.BoxGeometry(W + 2 * OV + 0.02, 0.18, 0.05), M.trim, [ox, top - Math.tan(pitch) * OV - 0.02, s * (D / 2 + OV)], [0, 0, 0]);                 // Traufbrett
      b.add(new THREE.CylinderGeometry(0.07, 0.07, W + 2 * OV, 10, 1, true), M.gutter, [ox, top - Math.tan(pitch) * OV - 0.1, s * (D / 2 + OV + 0.06)], [0, 0, Math.PI / 2]); // Regenrinne
      b.add(new THREE.CylinderGeometry(0.045, 0.045, top, 8), M.gutter, [ox + W / 2 - 0.15, top / 2, s * (D / 2 + 0.08)]);                                       // Fallrohr
      for (const e of [-1, 1]) b.add(new THREE.BoxGeometry(0.06, 0.2, slopeLen + 0.02), M.trim, [ox + e * (W / 2 + OV - 0.03), top + RH - Math.sin(pitch) * slopeLen / 2 + 0.02, (s * Math.cos(pitch) * slopeLen) / 2], [s * pitch, 0, 0]); // Ortgang
    }
    b.add(new THREE.BoxGeometry(W + 2 * OV + 0.05, 0.16, 0.3), M.tiles, [ox, top + RH + 0.1, 0], [0, 0, 0], 1, roofC);                                         // First
    b.add(new THREE.BoxGeometry(0.6, 1.6, 0.6), M.brick, [ox + W * 0.22, top + RH * 0.75, -D * 0.12]); b.add(new THREE.BoxGeometry(0.72, 0.1, 0.72), M.plinth, [ox + W * 0.22, top + RH * 0.75 + 0.84, -D * 0.12]); // Schornstein
    const win = (x, y, z, ry, w = 1.05, h = 1.3, shut = false) => {
      const m = new THREE.Matrix4().compose(new V(x, y, z), new THREE.Quaternion().setFromAxisAngle(new V(0, 1, 0), ry), new V(1, 1, 1)), add = (geo, mat, px, py, pz, col = null) => b.addM(geo, mat, m.clone().multiply(new THREE.Matrix4().makeTranslation(px, py, pz)), col);
      add(new THREE.PlaneGeometry(w - 0.12, h - 0.12), M.glass, 0, 0, 0.015);
      for (const [px, py, gw, gh] of [[0, h / 2, w, 0.08], [0, -h / 2, w, 0.08], [w / 2, 0, 0.08, h], [-w / 2, 0, 0.08, h], [0, 0, 0.05, h], [0, h * 0.18, w, 0.05]]) add(new THREE.BoxGeometry(gw, gh, 0.07), M.trim, px, py, 0.035);
      add(new THREE.BoxGeometry(w + 0.16, 0.06, 0.2), M.trim, 0, -h / 2 - 0.06, 0.09);
      if (shut) for (const sx of [-1, 1]) add(new THREE.BoxGeometry(w * 0.48, h, 0.04), M.door, sx * (w * 0.75 + 0.02), 0, 0.04, shutterC);
    };
    const shut = k % 3 === 0, nW = Math.max(2, Math.floor(W / 2.3));
    for (let f = 0; f < floors; f++) {
      const y = B0 + f * FH + 1.5;
      for (let i = 0; i < nW; i++) {
        const x = ox - W / 2 + (W / nW) * (i + 0.5);
        if (!(f === 0 && Math.abs(x - ox) < 1.0)) win(x, y, D / 2, 0, 1.05, 1.3, shut);
        win(x, y, -D / 2, Math.PI, 1.05, 1.3, shut);
      }
      for (const s of [-1, 1]) if (!(garage && s > 0)) win(ox + (s * W) / 2, y, 0, (s * Math.PI) / 2, 0.9, 1.2);
    }
    if (floors === 1 || type === "k" || type === "r") win(ox + (W / 2) * (1 - 0.0), top + RH * 0.35, 0, Math.PI / 2, 0.7, 0.7); // kleines Giebelfenster
    // Haustür mit Glasstreifen, Rahmen, Vordach, Stufen, Lampe
    const dz = D / 2;
    b.add(new THREE.BoxGeometry(1.0, 2.1, 0.06), M.door, [ox, B0 + 1.05, dz + 0.03], [0, 0, 0], 1, doorC);
    b.add(new THREE.PlaneGeometry(0.16, 1.4), M.glass, [ox - 0.28, B0 + 1.15, dz + 0.065]);
    for (const [px, py, gw, gh] of [[0, 2.14, 1.2, 0.1], [-0.55, 1.05, 0.1, 2.1], [0.55, 1.05, 0.1, 2.1]]) b.add(new THREE.BoxGeometry(gw, gh, 0.1), M.trim, [ox + px, B0 + py, dz + 0.05]);
    b.add(new THREE.BoxGeometry(0.06, 0.06, 0.12), M.gutter, [ox + 0.36, B0 + 1.05, dz + 0.09]);
    b.add(new THREE.BoxGeometry(1.7, 0.1, 1.0), M.trim, [ox, B0 + 2.55, dz + 0.5]); for (const sx of [-0.75, 0.75]) b.add(new THREE.BoxGeometry(0.06, 0.06, 0.95), M.trim, [ox + sx, B0 + 2.42, dz + 0.48], [0.5, 0, 0]);
    for (const [w2, h2, d2, y2, z2] of [[1.6, 0.2, 1.2, 0.1, 0.6], [1.6, 0.2, 0.7, 0.3, 0.35]]) b.add(new THREE.BoxGeometry(w2, h2, d2), M.plinth, [ox, y2, dz + z2]);
    b.add(new THREE.BoxGeometry(0.14, 0.22, 0.12), M.lamp, [ox + 0.8, B0 + 2.0, dz + 0.08]);
    if (type === "c" || type === "k" || type === "r") { // Gaube auf der vorderen Dachfläche
      const gy = top + RH * 0.45, gz = D / 2 - (D / 2) * 0.45 + 0.2;
      b.add(new THREE.BoxGeometry(1.6, 1.2, 1.4), M.plaster, [ox - W * 0.18, gy + 0.3, gz - 0.4], [0, 0, 0], 1, wallC);
      win(ox - W * 0.18, gy + 0.35, gz + 0.31, 0, 0.9, 0.8);
      for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.1, 0.1, 1.6), M.tiles, [ox - W * 0.18 + s * 0.45, gy + 1.1, gz - 0.35], [0, 0, -s * 0.6], 1, roofC);
    }
    if (garage) { // Garage mit Flachdach und Sektionaltor
      const gx = ox + W / 2 + 1.55, gw = 3.1, gh = 2.7;
      b.add(new THREE.BoxGeometry(gw, gh, D * 0.9), M.plaster, [gx, gh / 2, -D * 0.05], [0, 0, 0], 1, wallC);
      b.add(new THREE.BoxGeometry(gw + 0.25, 0.18, D * 0.9 + 0.25), M.trim, [gx, gh + 0.09, -D * 0.05]);
      b.add(new THREE.PlaneGeometry(2.5, 2.1), M.garage, [gx, 1.05, D * 0.4 + 0.01]);
    }
    const g = b.group(true); g.scale.setScalar(1 / 7.5); const holder = new THREE.Group(); holder.add(g); return holder;
  }
  // Alle Ersatzmodelle eintragen (nach dem Laden der Baukästen; Häuser je Farbschema bei Bedarf, siehe houseVariant)
  function procKit() {
    if (procKit.done) return; procKit.done = true;
    const set = (name, make) => { try { const g = make(); g.userData.proc = true; KIT[name] = g; } catch (e) { console.warn("Modell", name, e); } };
    set("n_grass", () => { const b = partBuilder(); b.add(pkGrass(18, 0.38, 0.25, false), pkMats().plant); return b.group(false); });
    set("n_grass_large", () => { const b = partBuilder(); b.add(pkGrass(24, 0.41, 0.27, false), pkMats().plant); return b.group(false); });
    set("n_grass_leafs", () => { const b = partBuilder(); b.add(pkGrass(9, 0.23, 0.14, true), pkMats().plant); return b.group(false); });
    set("n_flower_redA", () => pkFlower("tulpe", 0.27)); set("n_flower_redB", () => pkFlower("mohn", 0.24));
    set("n_flower_yellowA", () => pkFlower("hahnenfuss", 0.18)); set("n_flower_yellowB", () => pkFlower("loewenzahn", 0.15));
    set("n_flower_purpleA", () => pkFlower("lavendel", 0.23)); set("n_flower_purpleB", () => pkFlower("kornblume", 0.2));
    set("n_plant_bushDetailed", () => pkBush(0.6, 0.36, 0.6, 0, 70)); set("n_plant_bushLarge", () => pkBush(0.37, 0.24, 0.34, 1, 44)); set("n_plant_bush", () => pkBush(0.4, 0.24, 0.4, 2, 46));
    set("n_mushroom_redGroup", () => pkMushrooms(false)); set("n_mushroom_tanGroup", () => pkMushrooms(true));
    set("n_stump_old", pkStump);
    set("n_log", () => pkLog(0.08, 0.7).group(true));
    set("n_log_stack", () => { const b = partBuilder(), M = pkMats(); [[-0.13, 0], [0, 0], [0.13, 0], [-0.065, 0.12], [0.065, 0.12], [0, 0.24]].forEach(([x, y], i) => { b.add(new THREE.CylinderGeometry(0.065, 0.068, 0.7, 12, 1, true), M.bark, [x, y + 0.065, 0], [Math.PI / 2, 0, i]); for (const s of [-1, 1]) b.add(new THREE.CircleGeometry(0.065, 12), M.end, [x, y + 0.065, s * 0.35], [0, s > 0 ? 0 : Math.PI, i]); }); return b.group(true); });
    set("n_rock_largeA", () => pkRock(0.78, 0.26, 1.02, 201)); set("n_rock_largeB", () => pkRock(0.77, 0.43, 1.02, 202)); set("n_rock_smallB", () => pkRock(0.36, 0.18, 0.36, 203));
    set("n_lily_large", () => pkLily(true)); set("n_lily_small", () => pkLily(false));
    set("n_tent_detailedOpen", pkTent); set("n_campfire_logs", pkCampfire); set("n_canoe", pkCanoe); set("n_canoe_paddle", pkPaddle);
    set("n_fence_simple", pkFence); set("t_light-curved", pkStreetLight); set("t_road-sign-object-warning", pkWarnSign); set("t_path-stones-short", pkPathStones); set("t_planter", pkPlanter);
    for (const t of ["a", "c", "g", "h", "i", "k", "r"]) set("t_building-type-" + t, () => pkHouse(t, 0));
  }

  function loadKit() {
    if (kitPromise) return kitPromise;
    kitPromise = (async () => {
      if (!THREE.GLTFLoader) await loadScript("lib/GLTFLoader.js");
      if (!window.SPACEKIT) await loadScript("models/spacekit.js");
      if (!window.NATUREKIT) await loadScript("models/naturekit.js").catch(() => {}); // Bäume, Blumen, Steine … (Nature Kit, Namen mit „n_“)
      if (!window.TOWNKIT) await loadScript("models/townkit.js").catch(() => {});   // Häuser, Zäune, Laternen … (City Kits, Namen mit „t_“)
      const loader = new THREE.GLTFLoader();
      await Promise.all([...Object.entries(window.SPACEKIT), ...Object.entries(window.NATUREKIT || {}), ...Object.entries(window.TOWNKIT || {})].map(([name, b64]) => new Promise((res) => {
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
            if (/^n_/.test(name)) for (const m of [].concat(o.material)) { // Nature Kit: Farben wie in echt (die Vorlage ist türkis), Laub durchlässig für die Kamera
              if (NATURE_PAL[m.name] != null && !m.userData.recolored) { m.color.set(NATURE_PAL[m.name]).convertSRGBToLinear(); m.userData.recolored = true; }
              if (/^n_(tree|plant|grass|flower)/.test(name)) m.userData.noCam = true;
            }
          });
          KIT[name] = holder; res();
        }, () => res());
      })));
      procKit(); // eigene, fein gebaute Modelle statt der Baukasten-Klötze
      return KIT;
    })().catch((e) => { console.warn("Modelle nicht geladen", e); procKit(); return KIT; });
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
  // Viele Kopien eines Modells auf einmal (je Teil des Modells ein InstancedMesh): list = [[x, y, z, größe, drehung], …]
  // Gibt false zurück, wenn das Modell fehlt (dann baut der Aufrufer etwas Eigenes).
  function kitInstanced(scene, name, list, shadow = true, vary = false) {
    const src = KIT[name]; if (!src) return false; if (!list.length) return true;
    src.updateMatrixWorld(true);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new V(0, 1, 0), p = new V(), s = new V(), c = new THREE.Color();
    src.traverse((o) => {
      if (!o.isMesh) return;
      const m = new THREE.InstancedMesh(o.geometry, o.material, list.length), local = o.matrixWorld;
      list.forEach(([x, y, z, k, ry], i) => {
        mx.compose(p.set(x, y, z), q.setFromAxisAngle(up, ry || 0), s.set(k, k, k)).multiply(local); m.setMatrixAt(i, mx);
        // immer eine Instanzfarbe setzen (sonst teilen sich Instanzen mit und ohne Farbe dasselbe Shader-Programm → schwarz); bei vary jeder Baum etwas anders grün
        if (vary) { const v = 0.8 + hash2(x * 0.37, z * 0.53) * 0.32, w = (hash2(z * 0.71, x * 0.19) - 0.5) * 0.16; m.setColorAt(i, c.setRGB(v * (1 + w), v, v * (1 - w * 1.5))); }
        else m.setColorAt(i, c.setRGB(1, 1, 1));
      });
      m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
    });
    return true;
  }

  const BONES = {
    hips: "Hips", spine: "Spine", spine2: "Spine2", head: "Head",
    armL: "LeftArm", armR: "RightArm", foreL: "LeftForeArm", foreR: "RightForeArm",
    legL: "LeftUpLeg", legR: "RightUpLeg", kneeL: "LeftLeg", kneeR: "RightLeg"
  };
  // Anzüge der Figuren: Jede Person sieht anders aus (Grundfarbe, Staub des Ortes, Visier) – nach echten Vorbildern:
  // Apollo (weiß, goldenes Visier), der moderne NASA-Anzug xEMU (weiß mit hellblauen Teilen), der orange Start-Anzug („Kürbis-Anzug“),
  // ein silberner Hitzeschutz-Anzug, ein dick gefütterter Kälte-Anzug und Janas blauer Trainingsanzug.
  const SUITS = {
    kind:   { base: 0xccc6b8, dust: 0x66625b, visor: 0xd9a520 },
    nora:   { base: 0xe4e8ee, lower: 0x9db7d6, dust: 0x8a8f96, visor: 0x7fa6c9, lamps: true },
    mond:   { base: 0xd6d3cc, dust: 0x5f5c57, visor: 0xd9a520, lamps: true, lower2: 0x8fa3c4 },
    mars:   { base: 0xe2d6c4, lower: 0xc77a4a, lower2: 0x6f7c8c, dust: 0x9a4e2c, visor: 0xc79a3a, lamps: true },
    merkur: { base: 0xe3e6ea, dust: 0x6a645c, visor: 0xc9ced6, metal: 0.2, lamps: true }, // silbrig glänzender Hitzeschutz
    venus:  { base: 0xf08a2c, dust: 0x8a5a2e, visor: 0x5a4632, lamps: true },
    erde:   { base: 0x3b64b0, lower: 0x2a4a86, dust: 0x3b64b0, visor: 0x8fc6e8 }
  };
  function makeModelAstronaut(gltf, accent, style = SUITS.kind) {
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
        o.material = new THREE.MeshStandardMaterial({ color: style.visor, metalness: 0.95, roughness: 0.12, emissive: new THREE.Color(style.visor).multiplyScalar(0.12) });
      }
    });
    paintSuit(g, rig, accent, style);
    addSuitParts(g, rig, style);
    g.userData = { rig };
    return g;
  }

  // Farben nach dem Vorbild der Apollo-Anzüge (z. B. Buzz Aldrin, 1969):
  // gebrochenes Weiß mit Stoff-Falten, dunkle Handschuhe & Stiefel, grauer Mondstaub an den Beinen,
  // farbige Streifen an Oberarmen, Oberschenkeln und Helm (bei Apollo: rot für den Kommandanten).
  function paintSuit(g, rig, accent, style = SUITS.kind) {
    const C = (h) => new THREE.Color(h);
    const BASE = C(style.base), LOWER = style.lower != null ? C(style.lower) : null, DUST = C(style.dust), GLOVE = C(0x303236), BOOT = C(0x46474c), SOLE = C(0x222327), RING = C(0x8e9196);
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
        tmpC.copy(LOWER && y < 0.95 && y > 0.16 && z > -0.2 && !o.name.startsWith("Helmet") ? LOWER : BASE).multiplyScalar(fold); // zweifarbige Anzüge: Beine anders
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
    whiteMats.forEach((m) => { m.vertexColors = true; m.color.set(0xffffff); m.roughness = style.metal ? 0.55 : 0.9; m.metalness = style.metal || 0; m.needsUpdate = true; });
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
  function addSuitParts(g, rig, style = SUITS.kind) {
    const helmBone = rig.bones.spine2 || rig.bones.spine; // der Helm sitzt fest auf dem Anzug (wie bei Apollo)
    if (style.lamps && helmBone) { // Helmlampen links und rechts (leuchten)
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.4, metalness: 0.6 }), glow = new THREE.MeshBasicMaterial({ color: 0xfff4c8, toneMapped: false });
      for (const sx of [-1, 1]) {
        const lamp = new THREE.Group();
        lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.075, 12), lampMat));
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 12), glow); lens.position.y = 0.039; lens.rotation.x = -Math.PI / 2; lamp.add(lens);
        attachToBone(g, helmBone, lamp, new V(sx * 0.175, 1.7, 0.05), new THREE.Quaternion().setFromAxisAngle(new V(1, 0, 0), Math.PI / 2));
      }
    }
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
  // fwd = Arm nach vorn drehen, down = absenken, swing = (bei hängendem Arm) um die Querachse der Schulter vor/zurück schwingen,
  // roll = Oberarm um sich selbst drehen (rechts +1,57: der Ellbogen beugt den Unterarm dann nach oben statt nach vorn – zum Winken)
  const ARM_SIDE = { armL: -1, armR: 1 }; // ausgemessen: so schwingt „vor“ wirklich nach vorn
  function setArm(rig, key, fwd, down, swing = 0, roll = 0) {
    const b = rig.bones[key]; if (!b) return;
    b.quaternion.copy(rig.rest[key]).multiply(qa.setFromAxisAngle(AX.z, fwd));
    if (swing) b.quaternion.multiply(qa.setFromAxisAngle(AX.y, swing * ARM_SIDE[key]));
    b.quaternion.multiply(qa.setFromAxisAngle(AX.x, down));
    if (roll) b.quaternion.multiply(qa.setFromAxisAngle(AX.y, roll));
  }
  const waveFrom = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
  const POSE = {};
  // Bewegungen nach Vorbild der Apollo-Filme: „Lope“ = gleitender Galopp mit kurzer Schwebephase,
  // Oberkörper leicht vorgebeugt, Arme angewinkelt vor dem Körper (der Anzug ist steif).
  function poseRig(rig, st) {
    const breathe = Math.sin(st.t * 1.4) * 0.015;
    setBone(rig, "head", 0, 0, 0); // nur die Gesten bewegen den Kopf
    let legL = 0, legR = 0, kneeL = 0, kneeR = 0, down = 1.3, fwd = 0.08, elbow = 0.3, lean = breathe, downL = null, downR = null;
    let swingL = 0, swingR = 0, twist = 0, elbowL = null, elbowR = null; // Armschwung (vor = positiv), Ellbogen einzeln, Drehung des Oberkörpers
    if (st.mode === "climb") {
      // Leiter hochsteigen: Hände und Füße greifen abwechselnd nach oben
      const s = Math.sin(st.phase);
      legL = 0.75 + 0.4 * s; legR = 0.75 - 0.4 * s;
      kneeL = -(0.95 + 0.45 * s); kneeR = -(0.95 - 0.45 * s);
      fwd = 1.3; elbow = 1.0; lean -= 0.06; // Ellbogen angewinkelt: kein gestreckter, erhobener Arm (siehe Winken)
      downL = 0.1 - 0.3 * s; downR = 0.1 + 0.3 * s;
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
    if (st.carry) { down = 0.75; fwd = 1.3; elbow = 0.95; swingL = swingR = 0; downL = downR = elbowL = elbowR = null; } // trägt etwas vor dem Bauch
    if (st.work) { lean -= 0.35; fwd = 0.9; down = 0.7; elbow = 0.9 + 0.25 * Math.sin(st.t * 3); } // vorgebeugt, arbeitet mit den Händen
    setBone(rig, "legL", legL, 0, 0); setBone(rig, "legR", legR, 0, 0);
    setBone(rig, "kneeL", kneeL, 0, 0); setBone(rig, "kneeR", kneeR, 0, 0);
    setArm(rig, "armL", fwd, downL == null ? down : downL, swingL); setArm(rig, "armR", -fwd, downR == null ? down : downR, swingR);
    setBone(rig, "foreL", 0, 0, elbowL == null ? elbow : elbowL); setBone(rig, "foreR", 0, 0, -(elbowR == null ? elbow : elbowR));
    setBone(rig, "spine", lean, twist, 0);
    if (st.act && !st.wave) ACT_POSE[st.act](rig, st.t, lean, st.seed);
    if (st.wave) { // winken wie ein Kind: Oberarm zur Seite, Unterarm senkrecht, die Hand schwingt seitlich hin und her
      // (nie mit gestrecktem Arm schräg nach vorn-oben – das sah aus wie ein verbotener Gruß). st.wave: 1 = ganz, kleiner = Übergang
      const k = st.wave === true ? 1 : st.wave, ua = rig.bones.armR, fa = rig.bones.foreR;
      if (ua && fa && k < 1) { waveFrom[0].copy(ua.quaternion); waveFrom[1].copy(fa.quaternion); }
      setArm(rig, "armR", -0.35, 0.25, 0, 1.57);
      setBone(rig, "foreR", 0, 0, -(1.7 + 0.25 * Math.sin(st.t * 8)));
      if (ua && fa && k < 1) {
        ua.quaternion.slerpQuaternions(waveFrom[0], waveFrom[2].copy(ua.quaternion), k);
        fa.quaternion.slerpQuaternions(waveFrom[1], waveFrom[2].copy(fa.quaternion), k);
      }
    }
  }
  // Tätigkeiten der Bewohner (t = Zeit in Sekunden): Gießkanne, Besen für die Solarzellen, Tablet, Werkzeug, Kniebeugen
  const ACT_POSE = {
    // (gemessen: Arm nach vorn = fwd ±1,4 – rechts negativ; down 0,25 = waagerecht, größer = tiefer, negativ = hoch)
    giessen(rig, t) { setArm(rig, "armR", -1.4, 0.8 + 0.06 * Math.sin(t * 1.3)); setBone(rig, "foreR", 0, 0, -0.25); setArm(rig, "armL", 0.08, 1.3); setBone(rig, "spine", -0.12, 0, 0); },
    putzen(rig, t) { const w = Math.sin(t * 4.2); setArm(rig, "armR", -(1.4 + 0.3 * w), 0.7); setBone(rig, "foreR", 0, 0, -0.35); setArm(rig, "armL", 0.08, 1.3); setBone(rig, "spine", -0.35, 0.1 * w, 0); },
    tablet(rig, t) { setArm(rig, "armL", 1.4, 0.65); setArm(rig, "armR", -1.4, 0.65); setBone(rig, "foreL", 0, 0, 1.2); setBone(rig, "foreR", 0, 0, -(1.2 + 0.1 * Math.max(0, Math.sin(t * 5)))); setBone(rig, "spine", -0.08, 0, 0); },
    werkeln(rig, t) { const w = Math.sin(t * 6); setArm(rig, "armR", -1.4, 0.6 + 0.3 * w); setBone(rig, "foreR", 0, 0, -0.7); setArm(rig, "armL", 1.4, 0.8); setBone(rig, "foreL", 0, 0, 0.5); setBone(rig, "spine", -0.4, 0, 0); },
    // Im Gespräch (die Figuren tragen Helme – man sieht das Reden an Händen, Kopf und Oberkörper). Alle 2,6 Sekunden eine
    // andere Geste, die sich weich aufbaut und wieder löst: erklären, beide Hände öffnen, nach oben zeigen, an den Fingern abzählen.
    reden(rig, t, lean, seed = 0) {
      const T = t + seed * 3.7, k = Math.floor(T / 2.6), u = (T % 2.6) / 2.6, g = (k * 5 + seed * 3) % 4;
      const e = Math.min(1, Math.sin(u * Math.PI) * 1.7), w = Math.sin(T * 2.3), w2 = Math.sin(T * 3.1 + 1);
      let fR = 0.12, dR = 1.25, eR = 0.35, rR = 0, fL = 0.12, dL = 1.25, eL = 0.35, look = 0, twist = 0.06 * Math.sin(T * 0.9);
      if (g === 0) { fR += 0.65 * e; dR -= (0.28 + 0.1 * w) * e; eR += (0.5 + 0.18 * w2) * e; twist -= 0.08 * e; }                       // erklärt mit der rechten Hand
      else if (g === 1) { fR += 0.5 * e; fL += 0.5 * e; dR -= 0.32 * e; dL -= 0.32 * e; eR += 0.6 * e; eL += 0.6 * e; look = 0.06 * e; } // beide Hände offen: „Stell dir vor …“
      else if (g === 2) { fR += 0.38 * e; dR -= 0.2 * e; eR += 1.55 * e; rR = 1.57 * e; look = 0.15 * e; twist -= 0.08 * e; }          // hebt die Hand: „Moment, ich hab eine Idee!“ (Arm angewinkelt –
      // NIE ein gestreckter, erhobener Arm: senkrecht oder schräg nach oben sah er aus manchen Blickwinkeln wie ein verbotener Gruß aus)
      else { fL += 0.95 * e; dL -= 0.4 * e; eL += 0.85 * e; fR += 0.85 * e; dR -= 0.3 * e; eR += (0.95 + 0.25 * Math.abs(Math.sin(T * 5))) * e; } // zählt an den Fingern ab
      setArm(rig, "armR", -fR, dR, 0, rR); setBone(rig, "foreR", 0, 0, -eR); setArm(rig, "armL", fL, dL); setBone(rig, "foreL", 0, 0, eL);
      setBone(rig, "spine", lean - 0.03, twist, 0);
      setBone(rig, "head", look - 0.05 * Math.max(0, Math.sin(T * 4.3)), 0.06 * Math.sin(T * 1.3), 0); // kleine Kopfbewegungen beim Sprechen
    },
    zuhoeren(rig, t, lean, seed = 0) { // hört zu: nickt ab und zu, verlagert das Gewicht, eine Hand mal locker in die Seite gestützt
      const T = t + seed * 2.1, ph = T % 3.4, nod = ph < 0.9 ? Math.sin((ph / 0.9) * Math.PI * 2) ** 2 : 0, sh = Math.sin(T * 0.55);
      const hip = (Math.floor(T / 7) + seed) % 2 === 0 ? Math.min(1, Math.sin(((T % 7) / 7) * Math.PI) * 2) : 0; // Hand an der Hüfte
      setArm(rig, "armL", 0.1 - 0.35 * hip, 1.28 - 0.35 * hip); setBone(rig, "foreL", 0, 0, 0.3 + 1.2 * hip);
      setArm(rig, "armR", -0.1, 1.28); setBone(rig, "foreR", 0, 0, -0.3);
      setBone(rig, "spine", lean + 0.02, 0.05 * Math.sin(T * 0.4), 0.035 * sh);                                  // Gewicht auf das andere Bein
      setBone(rig, "kneeL", -0.1 * Math.max(0, sh), 0, 0); setBone(rig, "kneeR", -0.1 * Math.max(0, -sh), 0, 0);
      setBone(rig, "head", -0.16 * nod, 0.1 * Math.sin(T * 0.3), 0.05 * Math.sin(T * 0.7));
    },
    sport(rig, t) { // Kniebeugen, die Arme gehen dabei nach vorn hoch
      const k = 0.5 - 0.5 * Math.cos(t * 3.4);
      setBone(rig, "legL", 1.15 * k, 0, 0); setBone(rig, "legR", 1.15 * k, 0, 0); setBone(rig, "kneeL", -1.9 * k, 0, 0); setBone(rig, "kneeR", -1.9 * k, 0, 0);
      setArm(rig, "armL", 1.4, 1.35 - 1.1 * k); setArm(rig, "armR", -1.4, 1.35 - 1.1 * k); setBone(rig, "foreL", 0, 0, 0.1); setBone(rig, "foreR", 0, 0, -0.1);
      setBone(rig, "spine", -0.25 * k, 0, 0);
    }
  };
  // wer was tut (die übrigen gehen ihre Wege und arbeiten wie bisher)
  const NPC_ACTS = { "Forscherin Mara": "giessen", "Techniker Bennett": "putzen", "Kommandantin Lea": "tablet", "Ingenieur Tom": "werkeln",
    "Forscher Kofi": "tablet", "Pilotin Sara": "tablet", "Astronautin Jana": "sport" };
  // Werkzeug zur Tätigkeit, an der Hand bzw. vor der Brust befestigt; userData.drops = Wassertropfen der Gießkanne
  function makeActProp(g, rig, act) {
    const keepP = g.position.clone(), keepR = g.rotation.y; g.position.set(0, 0, 0); g.rotation.y = 0; // Anbauteile werden in der Grundhaltung am Nullpunkt angebracht
    try { return actProp(g, rig, act); } finally { g.position.copy(keepP); g.rotation.y = keepR; g.updateMatrixWorld(true); }
  }
  function actProp(g, rig, act) {
    const M = colonyMats("mars"), hand = rig.bones.foreR, chest = rig.bones.spine2 || rig.bones.spine;
    if (act === "giessen" && hand) {
      const can = new THREE.Group(), green = M.std({ color: srgb(0x16a34a), roughness: 0.5 });
      put(can, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.2, 16), green), 0, -0.12, 0.05);
      put(can, new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 14, Math.PI), green), 0, -0.02, 0.05);
      const spout = put(can, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.25, 8), green), 0, -0.08, 0.22); spout.rotation.x = 1.1;
      const drops = new THREE.Group(); drops.position.set(0, -0.15, 0.33); can.add(drops);
      const dm = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.8 });
      for (let i = 0; i < 8; i++) drops.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), dm));
      attachToBone(g, hand, can, new V(-0.82, 1.42, 0.05)); can.userData.drops = drops;
      return can;
    }
    if (act === "putzen" && hand) {
      const br = new THREE.Group();
      put(br, new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8), M.steel), 0, 0, 0.35).rotation.x = Math.PI / 2;
      put(br, new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.1), M.std({ color: srgb(0xfacc15), roughness: 0.8 })), 0, 0, 0.8);
      attachToBone(g, hand, br, new V(-0.82, 1.42, 0.05)); return br;
    }
    if ((act === "tablet") && chest) {
      const tab = new THREE.Group();
      put(tab, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.015), M.metal), 0, 0, 0);
      const scr = canvasTex(128, 96, (c) => { c.fillStyle = "#0b1220"; c.fillRect(0, 0, 128, 96); c.fillStyle = "#38bdf8"; c.fillRect(10, 12, 70, 8); c.fillStyle = "#4ade80"; for (let i = 0; i < 6; i++) c.fillRect(12 + i * 18, 80 - i * 9, 12, 8 + i * 9); });
      put(tab, new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.17), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false })), 0, 0, 0.009, false);
      attachToBone(g, chest, tab, new V(0, 1.12, 0.42), new THREE.Quaternion().setFromAxisAngle(new V(1, 0, 0), -0.9)); return tab;
    }
    if (act === "werkeln" && hand) {
      const w = new THREE.Group();
      put(w, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8), M.std({ color: srgb(0xdc2626), roughness: 0.5 })), 0, -0.05, 0.08).rotation.x = 1.2;
      put(w, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), M.steel), 0, -0.1, 0.2);
      attachToBone(g, hand, w, new V(-0.82, 1.42, 0.05)); return w;
    }
    return null;
  }

  // Apollo 11: Auf dem Mond blieb die Abstiegsstufe der Mondfähre „Eagle“ zurück – achteckiger Körper in knittriger Goldfolie,
  // vier Beine mit Haupt- und Nebenstreben, Fußteller, Leiter mit Plattform am vorderen Bein (lokal: vorn = +Z), Triebwerksglocke unten
  function makeLander(M) {
    const g = new THREE.Group();
    const foil = M.std({ map: foilTex(), roughness: 0.3, metalness: 0.78, envMapIntensity: 1.25 });
    const black = M.std({ color: srgb(0x1c1c1f), roughness: 0.45, metalness: 0.6 }), silver = M.std({ color: srgb(0xc4c8cf), roughness: 0.3, metalness: 0.85 });
    const darkFoil = M.std({ color: srgb(0x8a6a2a), map: foilTex(), roughness: 0.4, metalness: 0.7 });
    const A = 1.9, Rv = A / Math.cos(Math.PI / 8), FW = 2 * A * Math.tan(Math.PI / 8), H = 1.65, Y0 = 1.42, Y1 = Y0 + H;
    // Seitenflächen: jede Folie leicht verknittert (Ausbeulungen hängen nur vom Ort ab, die Kanten bleiben geschlossen)
    for (let k = 0; k < 8; k++) {
      const geo = new THREE.PlaneGeometry(FW, H, 10, 8), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), edge = Math.min(1, (FW / 2 - Math.abs(x)) * 6, (H / 2 - Math.abs(y)) * 6); p.setZ(i, (fbm2(x * 2.3 + k * 5, y * 2.3) - 0.5) * 0.09 * edge); }
      geo.computeVertexNormals();
      const a = (k / 8) * Math.PI * 2, face = put(g, new THREE.Mesh(geo, k % 2 ? darkFoil : foil), Math.sin(a) * A, Y0 + H / 2, Math.cos(a) * A);
      face.rotation.y = a;
    }
    const oct = (y, h, mat) => { const m = put(g, new THREE.Mesh(new THREE.CylinderGeometry(Rv, Rv, h, 8), mat), 0, y, 0); m.rotation.y = Math.PI / 8; return m; };
    oct(Y1 + 0.03, 0.06, black); oct(Y0 - 0.03, 0.06, black);                                  // Deckel und Hitzeschild unten
    for (const [x, z] of [[0.9, 0.9], [-0.9, 0.9], [0.9, -0.9], [-0.9, -0.9]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), silver), x, Y1 + 0.13, z); // Halterungen der Aufstiegsstufe
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.1, 16), black), 0, Y1 + 0.1, 0);
    // Triebwerksglocke
    const bell = []; for (let i = 0; i <= 10; i++) { const t = i / 10; bell.push(new THREE.Vector2(0.26 + 0.5 * t * t, -t * 0.55)); }
    put(g, new THREE.Mesh(new THREE.LatheGeometry(bell, 24), M.std({ color: srgb(0x3a3a3e), roughness: 0.5, metalness: 0.7, side: THREE.DoubleSide })), 0, Y0 - 0.05, 0);
    // Beine (vorn = +Z mit Leiter), Haupt- und Nebenstreben, Fußteller; an drei Beinen der umgeknickte Tastfühler
    const padProf = [[0, 0], [0.38, 0.02], [0.47, 0.1], [0.48, 0.18]].map(([x, y]) => new THREE.Vector2(x, y));
    const padGeo = new THREE.LatheGeometry(padProf, 20);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a), sx = Math.cos(a), sz = -Math.sin(a);
      const U = new V(dx * (A + 0.05), Y1 - 0.15, dz * (A + 0.05)), P = new V(dx * 3.75, 0.2, dz * 3.75);
      pipeSeg(g, M, U, P, 0.085, foil);
      const S = U.clone().lerp(P, 0.62);
      for (const e of [-1, 1]) pipeSeg(g, M, S, new V(dx * A + sx * e * FW * 0.5, Y0 + 0.05, dz * A + sz * e * FW * 0.5), 0.04, silver);
      pipeSeg(g, M, S, new V(dx * (A + 0.02), Y0 + 0.5, dz * (A + 0.02)), 0.035, silver);
      put(g, new THREE.Mesh(padGeo, silver), P.x, 0.0, P.z);
      if (k) pipeSeg(g, M, new V(P.x, 0.06, P.z), new V(P.x + dx * 0.4 + sx * 1.1, 0.03, P.z + dz * 0.4 + sz * 1.1), 0.012, silver); // Tastfühler, beim Aufsetzen umgeknickt
    }
    // Leiter am vorderen Bein: zwei Holme parallel zur Strebe, Sprossen, oben die Plattform („Porch“) mit Geländer
    const U0 = new V(0, Y1 - 0.15, A + 0.05), P0 = new V(0, 0.2, 3.75), dir = P0.clone().sub(U0), nrm = new V(0, -dir.z, dir.y).normalize().multiplyScalar(-0.1);
    for (const e of [-0.24, 0.24]) pipeSeg(g, M, U0.clone().add(nrm).setX(e), U0.clone().addScaledVector(dir, 0.86).add(nrm).setX(e), 0.025, silver);
    for (let i = 1; i <= 9; i++) { const q = U0.clone().addScaledVector(dir, 0.08 + i * 0.085).add(nrm); put(g, new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.07), silver), 0, q.y, q.z, false); }
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.75), silver), 0, Y1 - 0.12, A + 0.4);
    for (const e of [-0.46, 0.46]) { pipeSeg(g, M, new V(e, Y1 - 0.1, A + 0.72), new V(e, Y1 + 0.3, A + 0.6), 0.018, silver); pipeSeg(g, M, new V(e, Y1 + 0.3, A + 0.6), new V(e, Y1 + 0.02, A + 0.05), 0.018, silver); } // Geländer der Plattform
    // Gedenkplakette an der Leiterstrebe („Hier betraten Menschen vom Planeten Erde zum ersten Mal den Mond …“)
    const plTex = canvasTex(128, 96, (c) => { c.fillStyle = "#d9dde3"; c.fillRect(0, 0, 128, 96); c.strokeStyle = "#6b7280"; c.lineWidth = 3; c.strokeRect(3, 3, 122, 90);
      for (const x of [40, 88]) { c.beginPath(); c.arc(x, 30, 18, 0, 7); c.stroke(); } c.fillStyle = "#6b7280"; for (let i = 0; i < 4; i++) c.fillRect(18, 58 + i * 8, 92, 3); });
    const pq = U0.clone().addScaledVector(dir, 0.45).addScaledVector(nrm, 0.9);
    const plate = put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.25), M.std({ map: plTex, metalness: 0.7, roughness: 0.3 })), 0, pq.y, pq.z, false);
    plate.rotation.x = -Math.asin(dir.z / dir.length()); // liegt flach auf der schrägen Strebe
    // Geräteschacht (MESA) links neben der Leiter, aufgeklappt
    const ma = Math.PI / 4, mesa = put(g, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.12), black), Math.sin(ma) * (A + 0.02), Y0 + 0.75, Math.cos(ma) * (A + 0.02), false); mesa.rotation.y = ma;
    const lid = put(g, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.8), foil), Math.sin(ma) * (A + 0.42), Y0 + 0.33, Math.cos(ma) * (A + 0.42), false); lid.rotation.set(0.25, ma, 0, "YXZ");
    return g;
  }

  // Einstieg der eigenen Rakete: Leiter und offene Luke (lokal +Z zeigt von der Rakete weg).
  // Sitzt genau zwischen zwei Flossen auf der Sonnenseite (nicht im Schatten der Rakete).
  const HATCH = { a: -Math.PI / 3, x: Math.sin(-Math.PI / 3), z: Math.cos(-Math.PI / 3), y: 3.75 };
  // Rakete als Hindernis: ein Kreis, der auch die Flossen umfasst (die Rakete steht auf ihnen, siehe World.makeRocket) –
  // ein glatter Kreis, damit man beim Vorbeilaufen außen herum gleitet und nicht zwischen Rumpf und Flosse hängen bleibt
  const ROCKET_COLLIDERS = [[0, 0, 2.45]];
  const ROCKET_SCALE = 4.6; // Größe der Rakete am Boden (World.makeRocket ist in Raumschiff-Einheiten gebaut)
  // Blick in die beleuchtete Kabine: warmes Licht, Sitz, Schaltpult mit bunten Lämpchen (Ecken rund wie der Tür-Umriss)
  function cabinTexture() {
    const c = document.createElement("canvas"); c.width = 128; c.height = 256;
    const g = c.getContext("2d"), path = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    path(0, 0, 128, 256, 25); g.clip();
    const bg = g.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, "#fff3c4"); bg.addColorStop(0.35, "#f6b44a"); bg.addColorStop(1, "#7a3510");
    g.fillStyle = bg; g.fillRect(0, 0, 128, 256);
    const lamp = g.createRadialGradient(64, 18, 2, 64, 18, 70); lamp.addColorStop(0, "rgba(255,255,240,1)"); lamp.addColorStop(1, "rgba(255,255,240,0)");
    g.fillStyle = lamp; g.fillRect(0, 0, 128, 110);
    g.fillStyle = "#3b2a22"; path(30, 120, 52, 120, 16); g.fill();  // Sitz
    g.fillStyle = "#4a352a"; path(40, 100, 32, 26, 10); g.fill();   // Kopfstütze
    g.fillStyle = "#2b3442"; path(92, 104, 30, 70, 6); g.fill();    // Schaltpult
    [["#ef4444", 100, 116], ["#22c55e", 112, 116], ["#38bdf8", 100, 130], ["#facc15", 112, 130], ["#22c55e", 100, 144], ["#ef4444", 112, 144]]
      .forEach(([col, x, y]) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); });
    for (let i = 0; i < 9; i++) { g.lineWidth = 18 - i * 2; g.strokeStyle = `rgba(40,16,4,${0.07 + i * 0.012})`; path(0, 0, 128, 256, 25); g.stroke(); } // Tiefe: Schatten am Rand
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    return tex;
  }
  // Einstieg: Luke mit aufklappender Tür, Rahmen, Plattform und Leiter mit Haltegriffen.
  // userData.setDoor(k): k = 1 offen (Kabinenlicht an), 0 zu (dann sieht man nur noch den Umriss auf dem Rumpf)
  function makeHatch() {
    const g = new THREE.Group(), H = W.rocketHull, Dr = H.door;
    const metal = new THREE.MeshStandardMaterial({ color: 0xa3acb9, metalness: 0.55, roughness: 0.38 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.5 });
    // Teile am Rumpf: in den Maßen der Rakete gebaut (aufrecht, Winkel wie am Boden) – darum die Drehung der Luke zurücknehmen
    const onHull = new THREE.Group(); onHull.rotation.y = -HATCH.a; onHull.position.y = 0.95 * ROCKET_SCALE; onHull.scale.setScalar(ROCKET_SCALE); g.add(onHull);
    const d0 = Dr.deg - Dr.half, d1 = Dr.deg + Dr.half;
    // Kabine (leuchtet von selbst) – UV auf die Tür gestreckt
    const cabGeo = H.geo(Dr.y0, Dr.y1, 8, 0.003, d0, d1), uv = cabGeo.attributes.uv;
    let u0 = 1, u1 = 0, v0 = 1, v1 = 0;
    for (let i = 0; i < uv.count; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - u0) / (u1 - u0), (uv.getY(i) - v0) / (v1 - v0));
    const cabin = new THREE.Mesh(cabGeo, new THREE.MeshBasicMaterial({ map: cabinTexture(), alphaTest: 0.5, toneMapped: false }));
    onHull.add(cabin);
    // Rahmen rund um die Öffnung
    // (von außen gesehen: d0 = rechte Kante mit dem Griff, d1 = linke Kante mit dem Scharnier)
    const cr = 7.7, cy = 0.043, pts = [];
    const corner = (dc, yc, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * Math.PI / 2; pts.push([dc + Math.cos(a) * cr, yc + Math.sin(a) * cy]); } };
    corner(d1 - cr, Dr.y1 - cy, 0); corner(d0 + cr, Dr.y1 - cy, Math.PI / 2); corner(d0 + cr, Dr.y0 + cy, Math.PI); corner(d1 - cr, Dr.y0 + cy, Math.PI * 1.5);
    const p3 = pts.map(([deg, y]) => { const a = THREE.MathUtils.degToRad(deg), r = H.r(y) + 0.006; return new V(Math.cos(a) * r, y, Math.sin(a) * r); });
    const frame = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p3, true), 96, 0.011, 6, true), metal);
    onHull.add(frame);
    // Türblatt: dasselbe Rumpfstück mit dem Lack (Umriss, Griff) – dreht sich an der linken Kante (Scharnier) nach außen
    const hingeA = THREE.MathUtils.degToRad(d1), hingeR = H.r((Dr.y0 + Dr.y1) / 2) + 0.004;
    const hinge = new THREE.Group(); hinge.position.set(Math.cos(hingeA) * hingeR, 0, Math.sin(hingeA) * hingeR); onHull.add(hinge);
    const leafMat = (side, color, map) => new THREE.MeshStandardMaterial({ color, map, alphaMap: H.doorAlpha(), alphaTest: 0.5, side, roughness: 0.42, metalness: 0.08 });
    const outGeo = H.geo(Dr.y0, Dr.y1, 8, 0.012, d0, d1), inGeo = H.geo(Dr.y0, Dr.y1, 8, 0.002, d0, d1);
    for (const geo of [outGeo, inGeo]) geo.translate(-hinge.position.x, 0, -hinge.position.z);
    const leaf = new THREE.Group();
    leaf.add(new THREE.Mesh(outGeo, leafMat(THREE.FrontSide, 0xf8fafc, H.tex())), new THREE.Mesh(inGeo, leafMat(THREE.BackSide, 0x94a3b8, null)));
    leaf.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    hinge.add(leaf);
    // Plattform vor der Luke und Leiter mit Haltegriffen
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.62), metal);
    step.position.set(0, HATCH.y - 0.035, 1.68); step.castShadow = true; g.add(step);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.06), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 }));
    edge.position.set(0, HATCH.y - 0.005, 1.97); g.add(edge);
    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 8), top = HATCH.y + 0.95;
    for (const x of [-0.34, 0.34]) {
      const rail = new THREE.Mesh(railGeo, metal); rail.scale.y = top; rail.position.set(x, top / 2, 1.88); rail.castShadow = true; g.add(rail);
      const grip = new THREE.Mesh(railGeo, metal); grip.scale.y = 0.42; grip.rotation.x = Math.PI / 2; grip.position.set(x, top, 1.67); g.add(grip);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), metal); knee.position.set(x, top, 1.88); g.add(knee);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.22), dark); foot.position.set(x, 0.025, 1.88); g.add(foot);
      const strut = new THREE.Mesh(railGeo, dark); strut.scale.y = 0.5; strut.rotation.x = Math.PI / 2; strut.position.set(x, 2.95, 1.62); g.add(strut);
    }
    const rungGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.68, 8); rungGeo.rotateZ(Math.PI / 2);
    for (let y = 0.34; y < HATCH.y - 0.15; y += 0.34) { const rung = new THREE.Mesh(rungGeo, metal); rung.position.set(0, y, 1.88); g.add(rung); }
    const setDoor = (k) => {
      hinge.rotation.y = -1.8 * k;           // ganz offen: weit nach außen geklappt
      leaf.visible = cabin.visible = k > 0.002;
    };
    setDoor(1);
    g.userData = { setDoor };
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

  // Rohr/Stab von a nach b (für Gestelle, Streben, Geländer)
  function rod(g, a, b, r, mat, seg = 10, shadow = true) {
    const v = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), seg), mat);
    m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new V(0, 1, 0), v.normalize()); m.castShadow = shadow; g.add(m); return m;
  }
  // Bildschirm-Inhalte (leuchten selbst): "status" Kurven und Werte, "map" Karte mit Punkten, "cam" Kamerabild mit Fadenkreuz, "bars" Balken
  const screenCache = {};
  function screenTex(kind) {
    if (screenCache[kind]) return screenCache[kind];
    return (screenCache[kind] = canvasTex(256, 160, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, "#0b1a2e"); g.addColorStop(1, "#06101d"); c.fillStyle = g; c.fillRect(0, 0, 256, 160);
      c.fillStyle = "#1e3a5f"; c.fillRect(0, 0, 256, 18); c.fillStyle = "#7dd3fc"; c.font = "bold 12px sans-serif"; c.fillText(kind === "map" ? "KARTE" : kind === "cam" ? "KAMERA 1" : kind === "bars" ? "ENERGIE" : "STATUS", 8, 13);
      c.fillStyle = "#4ade80"; c.beginPath(); c.arc(244, 9, 4, 0, 7); c.fill();
      c.strokeStyle = "rgba(125,211,252,0.15)"; c.lineWidth = 1; for (let x = 0; x < 256; x += 16) { c.beginPath(); c.moveTo(x, 18); c.lineTo(x, 160); c.stroke(); } for (let y = 18; y < 160; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
      if (kind === "status") {
        for (const [col, k] of [["#38bdf8", 0], ["#fbbf24", 1.7], ["#4ade80", 3.1]]) { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= 170; x += 4) c.lineTo(x + 6, 90 - Math.sin(x * 0.06 + k) * 22 - Math.sin(x * 0.19 + k * 2) * 8 + k * 10); c.stroke(); }
        c.fillStyle = "#e2e8f0"; c.font = "bold 14px monospace"; ["98 %", "OK", "4,2 V"].forEach((t, i) => c.fillText(t, 192, 50 + i * 34));
      } else if (kind === "map") {
        c.strokeStyle = "rgba(148,163,184,0.5)"; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(70 + i * 30, 90 + (i % 2) * 18, 18 + i * 5, 0, 7); c.stroke(); }
        c.strokeStyle = "#fbbf24"; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(30, 140); c.bezierCurveTo(80, 60, 160, 150, 230, 50); c.stroke(); c.setLineDash([]);
        for (const [x, y, col] of [[30, 140, "#4ade80"], [120, 104, "#fbbf24"], [230, 50, "#f87171"]]) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); }
      } else if (kind === "cam") {
        const s2 = c.createLinearGradient(0, 18, 0, 160); s2.addColorStop(0, "#3b4a5e"); s2.addColorStop(0.55, "#64748b"); s2.addColorStop(1, "#94a3b8"); c.fillStyle = s2; c.fillRect(0, 18, 256, 142);
        c.fillStyle = "#475569"; c.beginPath(); c.moveTo(0, 120); c.quadraticCurveTo(90, 95, 160, 118); c.quadraticCurveTo(210, 132, 256, 112); c.lineTo(256, 160); c.lineTo(0, 160); c.fill();
        c.strokeStyle = "rgba(255,255,255,0.8)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(118, 89); c.lineTo(138, 89); c.moveTo(128, 79); c.lineTo(128, 99); c.stroke(); c.strokeRect(98, 64, 60, 50);
        c.fillStyle = "#ef4444"; c.beginPath(); c.arc(16, 32, 4, 0, 7); c.fill();
      } else {
        ["#4ade80", "#4ade80", "#fbbf24", "#38bdf8", "#4ade80", "#f87171"].forEach((col, i) => { const h = 30 + ((i * 37) % 80); c.fillStyle = col; c.fillRect(16 + i * 40, 150 - h, 26, h); });
      }
    }));
  }
  function screenMat(kind) { return new THREE.MeshBasicMaterial({ map: screenTex(kind), toneMapped: false }); }
  // Fernrohr auf Dreibein: Stativ mit Spreizstreben und Ablage, Montierung mit Gegengewicht, Tubus mit Rohrschellen, Taukappe,
  // Linse, Sucherfernrohr, Auszug und Okular – der Tubus zeigt nach dir (Mitte etwa 1,5 m hoch)
  function makeTelescope(dir) {
    const g = new THREE.Group(), d = dir.clone().normalize();
    const alu = new THREE.MeshStandardMaterial({ color: 0xbcc2ca, metalness: 0.75, roughness: 0.32 }), black = new THREE.MeshStandardMaterial({ color: 0x1d2127, roughness: 0.55, metalness: 0.3 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.3, metalness: 0.15 }), grey = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.4, metalness: 0.55 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6, c = Math.cos(a), sn = Math.sin(a);
      const top = new V(c * 0.08, 1.05, sn * 0.08), mid = new V(c * 0.29, 0.55, sn * 0.29), foot = new V(c * 0.5, 0.02, sn * 0.5);
      rod(g, top, mid, 0.024, alu); rod(g, mid, foot, 0.017, alu);
      rod(g, mid.clone().addScaledVector(new V(c, 0, sn), 0.0).setY(0.52), mid.clone().setY(0.6), 0.032, black); // Klemme
      put(g, new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 6), black), foot.x, 0.025, foot.z, false);           // Gummifuß
      rod(g, new V(c * 0.24, 0.66, sn * 0.24), new V(c * 0.05, 0.66, sn * 0.05), 0.009, alu, 6, false);             // Spreizstrebe
    }
    const tray = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 3), black), 0, 0.66, 0, false); tray.rotation.y = Math.PI / 6;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.08, 18), black), 0, 1.08, 0);
    const hor = new V(d.x, 0, d.z); if (hor.lengthSq() < 1e-4) hor.set(0, 0, 1); hor.normalize();
    const side = new V().crossVectors(new V(0, 1, 0), hor).normalize(), axis = new V(0, 1.32, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.24, 0.17), white), 0, 1.24, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), grey), 0, 1.38, 0, false);
    const saddle = axis.clone().addScaledVector(side, 0.16);
    rod(g, axis, saddle, 0.032, grey);
    const cwEnd = axis.clone().addScaledVector(side, -0.46).add(new V(0, -0.14, 0));
    rod(g, axis, cwEnd, 0.015, alu);
    const cw = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 20), grey), 0, 0, 0); cw.position.copy(axis).lerp(cwEnd, 0.8); cw.quaternion.setFromUnitVectors(new V(0, 1, 0), cwEnd.clone().sub(axis).normalize());
    const tube = new THREE.Group(); tube.position.copy(saddle).addScaledVector(side, 0.14); tube.quaternion.setFromUnitVectors(new V(0, 1, 0), d); g.add(tube);
    const inv = tube.quaternion.clone().invert(), toMount = side.clone().negate().applyQuaternion(inv), across = new V().crossVectors(new V(0, 1, 0), toMount).normalize();
    put(tube, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.0, 28), white), 0, 0, 0);
    for (const y of [-0.22, 0.22]) put(tube, new THREE.Mesh(new THREE.TorusGeometry(0.116, 0.014, 8, 28), black), 0, y, 0, false).rotation.x = Math.PI / 2;
    put(tube, new THREE.Mesh(new THREE.TorusGeometry(0.111, 0.006, 6, 28), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })), 0, 0.4, 0, false).rotation.x = Math.PI / 2; // Zierring
    const dove = put(tube, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), grey), 0, 0, 0); dove.position.copy(toMount).multiplyScalar(0.13);
    put(tube, new THREE.Mesh(new THREE.CylinderGeometry(0.127, 0.123, 0.3, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d2127, roughness: 0.6, side: THREE.DoubleSide })), 0, 0.64, 0); // Taukappe
    put(tube, new THREE.Mesh(new THREE.CircleGeometry(0.104, 28), new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.05, metalness: 0.9 })), 0, 0.5, 0, false).rotation.x = -Math.PI / 2; // Linse
    put(tube, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.08, 20), black), 0, -0.54, 0);                               // hinterer Deckel
    put(tube, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 14), alu), 0, -0.64, 0);                                // Auszug
    const eye = put(tube, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.12, 14), black), 0, 0, 0); eye.position.set(0, -0.72, 0).addScaledVector(across, 0.06); eye.quaternion.setFromUnitVectors(new V(0, 1, 0), across.clone().add(new V(0, -0.4, 0)).normalize()); // Okular am Zenitspiegel
    put(tube, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), black), 0, -0.71, 0, false);
    const fp = across.clone().multiplyScalar(-0.16); // Sucherfernrohr
    const finder = put(tube, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 14), black), fp.x, 0.12, fp.z);
    for (const y of [0.02, 0.22]) put(tube, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.02), black), fp.x * 0.78, y, fp.z * 0.78, false);
    put(tube, new THREE.Mesh(new THREE.CircleGeometry(0.019, 14), new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.05, metalness: 0.9 })), fp.x, 0.281, fp.z, false).rotation.x = -Math.PI / 2;
    return mergeStatic(g);
  }

  // Waage: Trittfläche und Anzeige dahinter (lokal +Z = Blickrichtung des Astronauten, dort steht die Kamera)
  const WEIGH_DIR = new V(SUN_DIR.x, 0, SUN_DIR.z).normalize(); // zur Sonne hin, damit der Astronaut von vorn beleuchtet ist
  let scalePlateTex = null;
  function makeScale() {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xaab2bd, metalness: 0.6, roughness: 0.4 });
    if (!scalePlateTex) scalePlateTex = canvasTex(256, 256, (c) => { // Riffelblech mit gelb-schwarzer Warnkante
      c.fillStyle = "#9aa3ae"; c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < 256; x += 16) { c.save(); c.translate(x + 4, y + 4); c.rotate((y / 16) % 2 ? 0.8 : -0.8); c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(-5, -1.5, 10, 3); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(-5, 1.5, 10, 1.5); c.restore(); }
      c.save(); c.beginPath(); c.rect(0, 0, 256, 256); c.rect(20, 20, 216, 216); c.clip("evenodd");
      for (let i = 0, k = 0; k < 540; k += 14, i++) { c.fillStyle = i % 2 ? "#111827" : "#facc15"; c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 14, 0); c.lineTo(k + 14 - 256, 256); c.lineTo(k - 256, 256); c.fill(); }
      c.restore();
    });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 1.1), [metal, metal, new THREE.MeshStandardMaterial({ map: scalePlateTex, metalness: 0.55, roughness: 0.45 }), metal, metal, metal]);
    plate.position.y = 0.03; plate.receiveShadow = true; g.add(plate);
    const dark = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.45 });
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.3), dark); foot.position.set(0, 0.04, -0.95); g.add(foot);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), dark);
    pole.position.set(0, 1.15, -0.95); pole.castShadow = true; g.add(pole);
    for (const sx of [-1, 1]) { const brace = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), dark); brace.position.set(sx * 0.12, 0.25, -0.88); brace.rotation.z = sx * 0.5; g.add(brace); }
    const cv = document.createElement("canvas"); cv.width = 384; cv.height = 160;
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const display = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.62), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    display.position.set(0, 2.55, -0.9); g.add(display);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.8, 0.06), dark);
    back.position.set(0, 2.55, -0.94); back.castShadow = true; g.add(back);
    for (const y of [2.97, 2.13]) { const lip = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.06, 0.16), dark); lip.position.set(0, y, -0.94); g.add(lip); } // Rahmen oben und unten
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
  // Laser-Reflektor wie bei Apollo 11: Palette auf kurzen Beinen, schräges Feld mit 100 Tripelspiegeln in einem Rahmen mit Sonnenblenden
  let reflTex = null;
  function makeReflector() {
    const g = new THREE.Group();
    const alu = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.8, roughness: 0.3 }), dark = new THREE.MeshStandardMaterial({ color: 0x3f4752, metalness: 0.6, roughness: 0.4 });
    if (!reflTex) reflTex = canvasTex(256, 256, (c) => {
      c.fillStyle = "#4b5563"; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
        const x = 13 + i * 25.4, y = 13 + j * 25.4, gr = c.createRadialGradient(x - 4, y - 4, 1, x, y, 11); gr.addColorStop(0, "#e0f2fe"); gr.addColorStop(0.5, "#7aa7c7"); gr.addColorStop(1, "#1e3a5f");
        c.fillStyle = gr; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill();
        c.strokeStyle = "rgba(255,255,255,0.45)"; c.lineWidth = 1; c.beginPath(); for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k * Math.PI * 2) / 3; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); } c.stroke(); // Kanten der Tripelspiegel
      }
    });
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.62), alu), 0, 0.2, 0);
    for (const [x, z] of [[-0.35, -0.26], [0.35, -0.26], [-0.35, 0.26], [0.35, 0.26]]) { rod(g, new V(x, 0, z), new V(x, 0.2, z), 0.018, alu); put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 12), alu), x, 0.008, z, false); }
    for (const x of [-0.42, 0.42]) rod(g, new V(x, 0.24, -0.2), new V(x, 0.24, 0.2), 0.012, alu, 6, false); // Tragegriffe
    const panel = new THREE.Group(); panel.position.set(0, 0.42, 0.02); panel.rotation.x = -0.9; g.add(panel);
    put(panel, new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.05), dark), 0, 0, 0);
    put(panel, new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ map: reflTex, metalness: 0.6, roughness: 0.15 })), 0, 0, 0.026, false);
    for (const [x, y, w, h] of [[0, 0.27, 0.58, 0.02], [0, -0.27, 0.58, 0.02], [0.27, 0, 0.02, 0.58], [-0.27, 0, 0.02, 0.58]]) put(panel, new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.09), alu), x, y, 0.06, false); // Blenden
    rod(g, new V(-0.22, 0.22, -0.2), new V(-0.22, 0.3, 0.02), 0.014, alu, 6, false); rod(g, new V(0.22, 0.22, -0.2), new V(0.22, 0.3, 0.02), 0.014, alu, 6, false);
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
  // Parabolantenne auf Drehkranz und Gabel: echte Schüssel (Paraboloid) mit Rippen auf der Rückseite, Speisehorn auf vier Streben
  function makeDishAntenna(dir, R) {
    const g = new THREE.Group(), d = dir.clone().normalize();
    const white = new THREE.MeshStandardMaterial({ color: 0xeef0f3, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide }), grey = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.45, metalness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5, metalness: 0.5 });
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.22 * R, 0.28 * R, 0.2 * R, 20), grey), 0, 0.1 * R, 0);
    const az = new THREE.Group(); az.position.y = 0.2 * R; az.rotation.y = Math.atan2(d.x, d.z); g.add(az);
    put(az, new THREE.Mesh(new THREE.BoxGeometry(0.5 * R, 0.1 * R, 0.3 * R), dark), 0, 0.05 * R, 0);
    for (const x of [-0.24, 0.24]) put(az, new THREE.Mesh(new THREE.BoxGeometry(0.07 * R, 0.55 * R, 0.18 * R), dark), x * R, 0.35 * R, 0);
    const el = new THREE.Group(); el.position.y = 0.6 * R; el.rotation.x = -Math.asin(Math.max(-1, Math.min(1, d.y))); az.add(el);
    put(el, new THREE.Mesh(new THREE.CylinderGeometry(0.05 * R, 0.05 * R, 0.56 * R, 12), grey), 0, 0, 0).rotation.z = Math.PI / 2;
    const F = 0.42 * R, prof = []; for (let i = 0; i <= 18; i++) { const r = (R * i) / 18; prof.push(new THREE.Vector2(r, (r * r) / (4 * F))); }
    const dish = new THREE.Group(); dish.position.z = 0.12 * R; dish.rotation.x = Math.PI / 2; el.add(dish); // öffnet nach vorn (+Z)
    put(dish, new THREE.Mesh(new THREE.LatheGeometry(prof, 56), white), 0, 0, 0);
    const depth = (R * R) / (4 * F);
    put(dish, new THREE.Mesh(new THREE.TorusGeometry(R, 0.025 * R, 8, 56), grey), 0, depth, 0, false).rotation.x = Math.PI / 2;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, rib = new THREE.Group(); rib.rotation.y = a; dish.add(rib); const pts = []; for (let i = 2; i <= 10; i++) { const r = (R * i) / 10; pts.push(new V(r, (r * r) / (4 * F) - 0.03 * R, 0)); } put(rib, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.02 * R, 5), grey), 0, 0, 0, false); }
    put(dish, new THREE.Mesh(new THREE.CylinderGeometry(0.16 * R, 0.2 * R, 0.14 * R, 16), dark), 0, -0.05 * R, 0);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; rod(dish, new V(Math.cos(a) * R * 0.92, depth * 0.85, Math.sin(a) * R * 0.92), new V(0, F * 0.96, 0), 0.012 * R, grey, 6, false); }
    put(dish, new THREE.Mesh(new THREE.ConeGeometry(0.07 * R, 0.16 * R, 14), dark), 0, F, 0).rotation.x = Math.PI; // Speisehorn
    return g;
  }
  // Gerätecontainer (vorn = +Z mit Tür): Paneele, Kufen, Tür mit Rahmen, Griff und Fenster, Lüftungsgitter, Kühlrippen, Warnschild, Lampe
  function equipShelter(M) {
    const g = new THREE.Group(), W = 2.2, H = 1.6, D = 1.5;
    for (const x of [-0.85, 0.85]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, D + 0.2), M.metal), x, 0.06, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(W, H, D), M.hull(2, 1)), 0, 0.12 + H / 2, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.08, D + 0.12), M.metal), 0, 0.16 + H, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, H, 0.08), M.orange), (x * W) / 2, 0.12 + H / 2, (z * D) / 2, false);
    const door = new THREE.Group(); door.position.set(-0.45, 0.12, D / 2 + 0.01); g.add(door);
    put(door, new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.36, 0.04), M.metal), 0, 0.72, 0);
    put(door, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.06), M.steel), 0, 1.42, 0, false);
    for (const x of [-0.43, 0.43]) put(door, new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 0.06), M.steel), x, 0.72, 0, false);
    put(door, new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), M.glowBlue), 0, 1.1, 0.025, false);
    put(door, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.04), M.steel), 0.3, 0.72, 0.04, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), M.glow), -0.45, 1.66, D / 2 + 0.04, false);   // Lampe über der Tür
    const grille = canvasTex(128, 96, (c) => { c.fillStyle = "#4b5563"; c.fillRect(0, 0, 128, 96); c.fillStyle = "#1f2937"; for (let y = 8; y < 90; y += 9) c.fillRect(8, y, 112, 5); });
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshStandardMaterial({ map: grille, roughness: 0.6 })), 0.55, 1.15, D / 2 + 0.005, false);
    const warn = canvasTex(96, 96, (c) => { c.fillStyle = "#facc15"; c.beginPath(); c.moveTo(48, 6); c.lineTo(90, 86); c.lineTo(6, 86); c.closePath(); c.fill(); c.strokeStyle = "#111"; c.lineWidth = 5; c.stroke(); c.fillStyle = "#111"; c.font = "bold 46px sans-serif"; c.textAlign = "center"; c.fillText("⚡", 48, 78); });
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshStandardMaterial({ map: warn, transparent: true, roughness: 0.5 })), 0.55, 0.55, D / 2 + 0.005, false);
    for (let i = 0; i < 9; i++) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.03), M.steel), -W / 2 - 0.08, 0.85, -0.6 + i * 0.15, false); // Kühlrippen
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), M.metal), 0.6, 0.32 + H, -0.3);
    rod(g, new V(0.75, 0.3 + H, -0.3), new V(0.75, 1.3 + H, -0.3), 0.012, M.steel, 6, false);
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
  // ---------- Mond-Weitsprung: Bahn und Zubehör ----------
  function buildLongJump(B, M) {
    const J = MOON_JUMP, [dx, dz] = J.dir, [px, pz] = J.side, H = B.height, at = (k, s = 0) => [J.board[0] + dx * k + px * s, J.board[1] + dz * k + pz * s];
    const ry = Math.atan2(dx, dz), cols = [];
    makePath(B, [at(-J.run - 1), at(0)], 1.7, [112, 112, 120]);                     // Anlaufbahn (dunkel)
    makePath(B, [at(0), at(7)], 2.8, [214, 210, 200]);                               // Sprunggrube (heller, feiner Staub)
    const line = (k, w, col, thick = 0.12) => { const [x, z] = at(k), m = new THREE.Mesh(new THREE.PlaneGeometry(w, thick), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -8 }));
      m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, H(x, z) + 0.06, z); B.scene.add(m); return m; };
    line(0, 2.9, 0xffffff, 0.22);                                                     // Absprunglinie
    for (let k = 1; k <= 6; k++) if (k !== J.gold) line(k, 2.5, 0x9ca3af, 0.05);
    line(J.gold, 2.9, 0xfbbf24, 0.16);                                               // goldene Linie
    const num = (txt, col) => canvasTex(128, 64, (c) => { c.fillStyle = col; c.font = "bold 46px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 64, 34); });
    for (let k = 1; k <= 6; k++) { // Metermarken flach neben der Grube (vom Anlauf aus lesbar)
      for (const sd of [-1, 1]) {
        const [x, z] = at(k, sd * 1.85), m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: num(k + " m", k === J.gold ? "#fbbf24" : "#e5e7eb"), transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -8 }));
        m.rotation.set(-Math.PI / 2, 0, ry + Math.PI); m.position.set(x, H(x, z) + 0.05, z); B.scene.add(m);
      }
    }
    for (const sd of [-1, 1]) { // goldene Fähnchen an der 4-m-Linie
      const [x, z] = at(J.gold, sd * 1.6), fl = new THREE.Group(); fl.position.set(x, H(x, z), z); fl.rotation.y = ry; B.scene.add(fl);
      put(fl, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 6), M.steel), 0, 0.6, 0);
      put(fl, new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, toneMapped: false })), sd * 0.23, 1.05, 0, false).rotation.y = Math.PI / 2;
      cols.push([x, z, 0.15]);
    }
    { const [x, z] = at(-J.run + 0.5, 2.6), sign = B.on(makeSignBoard(M, "🦘 MOND-WEITSPRUNG", "#7c3aed", 2.8), x, z); sign.rotation.y = ry + Math.PI; cols.push([x, z, 0.3]); }
    // durchsichtiger „Erd-Astronaut“ für den Vergleich und zwei Fähnchen mit Schild für die Landepunkte
    const ghost = makeAstronaut("#60a5fa");
    ghost.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.5; o.material.color.lerp(new THREE.Color(0x60a5fa), 0.5); o.castShadow = false; } });
    ghost.visible = false; B.scene.add(ghost);
    const tag = (txt, bg) => { const t = canvasTex(320, 96, (c) => { c.fillStyle = bg; c.beginPath(); c.roundRect ? c.roundRect(4, 4, 312, 88, 30) : c.rect(4, 4, 312, 88); c.fill(); c.fillStyle = "#fff"; c.font = "bold 44px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 160, 50); });
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, toneMapped: false })); sp.scale.set(1.1, 0.33, 1); sp.renderOrder = 5; return sp; };
    const marker = (col) => { const g = new THREE.Group(); put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), M.steel), 0, 0.5, 0); put(g, new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 12), new THREE.MeshBasicMaterial({ color: col, toneMapped: false })), 0, 1.1, 0, false).rotation.x = Math.PI; g.visible = false; B.scene.add(g); return g; };
    const flagMoon = marker(0xfbbf24), flagEarth = marker(0x60a5fa);
    return { cols, ghost, flagMoon, flagEarth, tag };
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
    pspace:   { env: [0x05070d, 0x2c3446, 0x4a4640], a: 0xc84a12, b: 0x0d9488, hull: "#f5f2ec" }, // Sonden: Weltraum
    pjupiter: { env: [0xe6d6bc, 0xc49a6c, 0x6a4628], a: 0xc84a12, b: 0x0d9488, hull: "#f5f2ec" },
    psonne:   { env: [0x3a1206, 0xff8a30, 0xffc860], a: 0xc84a12, b: 0x0d9488, hull: "#f5f2ec" }
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

  const CAMPS = { mars: buildMarsCamp, mond: buildMoonCamp, merkur: buildMercCamp, venus: buildVenusCamp, erde: buildEarthCamp };
  const CAMP_COLLIDERS = { mars: marsCampColliders, mond: moonCampColliders, merkur: mercCampColliders, venus: venusCampColliders, erde: earthCampColliders };
  // Überdachung der „Wusstest du?“-Wand, passend zum Ort (lokal: Wand bei z = 0, vorn = −Z): zwei Stützen und ein Dach über dem Schild.
  // Mond: Tonnendach wie ein kleiner Hangar · Mars: zwei Sonnensegel · Merkur: weißer Hitzeschild · Venus: schweres Panzerdach
  const canopyColliders = ([sx, sz]) => [[sx - 8.7, sz - 1.7, 0.3], [sx + 8.7, sz - 1.7, 0.3], [sx - 8.7, sz + 1.5, 0.3], [sx + 8.7, sz + 1.5, 0.3]];
  function wallCanopy(g, M, style) {
    const X = 8.7, Y = 7.0, Z0 = -1.7, Z1 = 1.5, D = Z1 - Z0, zc = (Z0 + Z1) / 2;
    const post = style === "venus" ? venusMetal(M, 1, 3) : M.steel, foot = M.metal;
    const P = (m, x, y, z, sh = true) => { m.position.set(x, y, z); m.castShadow = sh; m.receiveShadow = true; g.add(m); return m; };
    for (const x of [-X, X]) for (const z of [Z0, Z1]) {
      P(new THREE.Mesh(new THREE.CylinderGeometry(style === "venus" ? 0.2 : 0.11, style === "venus" ? 0.24 : 0.13, Y, 10), post), x, Y / 2, z);
      P(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 12), foot), x, 0.1, z);
    }
    for (const z of [Z0, Z1]) P(new THREE.Mesh(new THREE.BoxGeometry(2 * X + 0.5, 0.22, 0.22), M.metal), 0, Y, z); // Längsträger
    for (const x of [-X, X]) P(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, D + 0.3), M.metal), x, Y, zc);
    if (style === "mond") { // Tonnendach
      const R = D / 2 + 0.35, shell = P(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2 * X + 1.2, 28, 1, true, 0, Math.PI), M.hull(6, 1)), 0, Y + 0.05, zc);
      shell.rotation.z = Math.PI / 2; shell.material = shell.material.clone(); shell.material.side = THREE.DoubleSide;
      for (const x of [-X - 0.6, -X / 3, X / 3, X + 0.6]) { const rib = P(new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.09, 8, 28, Math.PI), M.orange), x, Y + 0.05, zc, false); rib.rotation.y = Math.PI / 2; }
    } else if (style === "mars") { // zwei gespannte Sonnensegel
      const sail = M.std({ color: srgb(0xf97316), roughness: 0.8, side: THREE.DoubleSide });
      for (const sx of [-1, 1]) {
        const geo = new THREE.BufferGeometry(), x0 = sx * X, xm = sx * 0.1, y0 = Y + 0.15;
        geo.setAttribute("position", new THREE.Float32BufferAttribute([x0, y0, Z0, xm, y0 + 1.1, zc, x0, y0, Z1, xm, y0 + 1.1, zc, x0, y0, Z0, x0, y0, Z1], 3));
        geo.setIndex([0, 1, 2]); geo.computeVertexNormals();
        P(new THREE.Mesh(geo, sail), 0, 0, 0);
      }
      P(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), M.teal), 0, Y + 0.6, zc); // Mittelmast
      for (const z of [Z0, Z1]) P(new THREE.Mesh(new THREE.BoxGeometry(2 * X + 0.5, 0.06, 0.06), M.teal), 0, Y + 0.17, z, false);
    } else { // flaches Dach: weißer Hitzeschild (Merkur) oder schweres Panzerdach (Venus)
      const roof = style === "venus" ? venusMetal(M, 6, 1) : M.std({ color: srgb(0xf8fafc), roughness: 0.3, metalness: 0.3 });
      P(new THREE.Mesh(new THREE.BoxGeometry(2 * X + 1.4, 0.3, D + 1.2), roof), 0, Y + 0.3, zc).rotation.x = 0.06;
      P(new THREE.Mesh(new THREE.BoxGeometry(2 * X + 1.5, 0.22, 0.12), M.orange), 0, Y + 0.25, Z0 - 0.62, false);
    }
    for (const x of [-X, X]) { const l = blinkLamp(g, 0xfde68a, x, Y - 0.35, Z0 - 0.15); l.scale.setScalar(0.8); } // Lampen an den Stützen
  }
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
    { // Rückseite: Stahlgerüst wie bei einer echten Schautafel – senkrechte Träger, schräge Stützen mit Fußplatten, zwei Querträger
      const frame = new THREE.MeshStandardMaterial({ color: 0x5b6472, metalness: 0.7, roughness: 0.4 });
      for (const y of [0.9, 2.9]) add(new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.14, 0.12), frame), 0, y, 0.22);
      for (let i = 0; i < 6; i++) {
        const x = -6.5 + i * 2.6;
        add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.6, 0.14), frame), x, 1.8, 0.29);
        const len = Math.hypot(2.5, 0.95), st = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, len, 0.1), frame), x, 1.25, 0.36 + 0.95 / 2);
        st.rotation.x = -Math.atan2(0.95, 2.5); // Strebe von 2,5 m Höhe an der Wand schräg nach hinten zum Boden
        add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), frame), x, 0.02, 0.36 + 0.95, false);
      }
    }
    if (CAMPS[style] && style !== "erde") wallCanopy(g, colonyMats(style), style); // Dach über der Wand – so gehört sie zur Station (Erde: Pergola, siehe buildEarthCamp)
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

  // Geologenhammer wie bei Apollo: schwarzer Griff, Stahlschaft, Kopf mit Schlagfläche und Spitzhacke.
  // Nullpunkt = unteres Griffende (dort hält ihn die Hand), der Hammer zeigt nach +Y.
  function makeHammer() {
    const g = new THREE.Group(); g.rotation.order = "YXZ";
    const grip = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 }), steel = new THREE.MeshStandardMaterial({ color: 0xa8b0bb, metalness: 0.7, roughness: 0.32 });
    const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    part(new THREE.CylinderGeometry(0.02, 0.022, 0.14, 12), grip, 0, 0.07, 0);           // Griff
    part(new THREE.CylinderGeometry(0.023, 0.023, 0.012, 12), grip, 0, 0.004, 0);       // Endkappe
    part(new THREE.CylinderGeometry(0.0135, 0.016, 0.24, 10), steel, 0, 0.26, 0);        // Schaft
    part(new THREE.BoxGeometry(0.05, 0.048, 0.042), steel, 0, 0.385, 0);                  // Kopf
    part(new THREE.CylinderGeometry(0.024, 0.026, 0.06, 14), steel, 0.055, 0.385, 0).rotation.z = Math.PI / 2; // Schlagfläche
    const pick = part(new THREE.ConeGeometry(0.023, 0.11, 4), steel, -0.08, 0.385, 0);  // Spitzhacke
    pick.rotation.z = Math.PI / 2; pick.scale.z = 0.55;
    return g;
  }
  // Falkenfeder (wie bei Apollo 15): leicht gebogener Kiel, braune Fahne mit dunklen Querbändern, unten weißer Flaum.
  // Nullpunkt = unteres Kielende, die Feder zeigt nach +Y.
  let featherTex = null;
  function makeFeather() {
    const g = new THREE.Group(), L = 0.34; g.rotation.order = "YXZ";
    if (!featherTex) featherTex = canvasTex(96, 256, (c) => {
      const gr = c.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, "#f4efe6"); gr.addColorStop(0.16, "#e8dccb"); gr.addColorStop(0.3, "#b08a62"); gr.addColorStop(1, "#7a5638");
      c.fillStyle = gr; c.fillRect(0, 0, 96, 256);
      for (let i = 0; i < 7; i++) { c.fillStyle = "rgba(55,35,20,0.45)"; c.fillRect(0, 18 + i * 25, 96, 9); }          // Querbänder
      c.strokeStyle = "rgba(255,255,255,0.12)"; c.lineWidth = 1;
      for (let y = -60; y < 256; y += 4) { c.beginPath(); c.moveTo(48, y + 30); c.lineTo(0, y); c.moveTo(48, y + 30); c.lineTo(96, y); c.stroke(); } // Federäste
      c.fillStyle = "rgba(240,232,220,0.9)"; c.fillRect(46, 0, 4, 256);                                                  // Kiel
    });
    // Fahne: links schmal, rechts breit, oben rund – gebogen wie eine echte Feder
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.045); sh.bezierCurveTo(-0.02, 0.09, -0.026, 0.22, -0.012, L - 0.012); sh.quadraticCurveTo(0, L + 0.004, 0.012, L - 0.02);
    sh.bezierCurveTo(0.04, 0.24, 0.042, 0.1, 0, 0.045);
    const geo = new THREE.ShapeGeometry(sh, 16), p = geo.attributes.position, uv = geo.attributes.uv;
    const bend = (y) => 0.05 * (y / L) * (y / L);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      uv.setXY(i, (x + 0.03) / 0.075, y / L);
      p.setXYZ(i, x + bend(y), y, -6 * x * x);                                             // Bogen + leicht gewölbt
    }
    geo.computeVertexNormals();
    const vane = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: featherTex, side: THREE.DoubleSide, roughness: 0.95 }));
    vane.castShadow = true; g.add(vane);
    const quill = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 0.06, 0.15, 0.25, L - 0.01].map((y) => new V(bend(y), y, 0.001))), 12, 0.0032, 6), new THREE.MeshStandardMaterial({ color: 0xf1e8da, roughness: 0.6 }));
    g.add(quill);
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
    // Steine: natürlich geformt (verbeulte, unten flache Knollen in 4 Formen), halb im Boden, in jeder Größe – vom Kiesel bis zum Brocken
    const N = P.rocks != null ? P.rocks : FAST ? 140 : 280, rockMat = new THREE.MeshStandardMaterial({ color: P.rock, roughness: 0.95, vertexColors: true, ...rockTex(2, 1, 1.2) });
    const rockSets = [0, 1, 2, 3].map((k) => { const m = new THREE.InstancedMesh(sphereUV(naturalRockGeo(40 + k * 7, 2)), rockMat, Math.max(1, Math.ceil(N / 4))); m.count = 0; return m; });
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V(), p = new V(), e = new THREE.Euler(), rc = new THREE.Color();
    let placed = 0, tries = 0;
    const keepFree = [[0, 0, 12], ...P.keepFree];
    while (placed < N && tries++ < 5000) {
      const x = (hash2(tries, 1.3) - 0.5) * 300, z = (hash2(tries, 7.7) - 0.5) * 300;
      if (keepFree.some(([fx, fz, r]) => Math.hypot(x - fx, z - fz) < r)) continue;
      const s = 0.12 + Math.pow(hash2(tries, 3.1), 3) * 1.4, sy = s * (0.55 + hash2(tries, 9) * 0.4);
      p.set(x, height(x, z) + sy * 0.12, z); e.set((hash2(tries, 4) - 0.5) * 0.3, hash2(tries, 5) * 6.3, (hash2(tries, 6) - 0.5) * 0.3); q.setFromEuler(e);
      sc.set(s * (0.85 + hash2(tries, 8) * 0.4), sy, s); mtx.compose(p, q, sc);
      const m = rockSets[placed % 4], v = 0.8 + hash2(tries, 11) * 0.35; m.setMatrixAt(m.count, mtx); m.setColorAt(m.count, rc.setRGB(v, v, v)); m.count++; placed++;
    }
    for (const m of rockSets) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }

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

    // Höhe so, wie der Boden wirklich gezeichnet wird (Dreiecke im 2,5-m-Raster) – für Flächen und Teile, die genau aufliegen sollen
    const STEP = SIZE / SEG, meshHeight = (x, z) => {
      const gx = (x + SIZE / 2) / STEP, gz = (z + SIZE / 2) / STEP, ix = Math.max(0, Math.min(SEG - 1, Math.floor(gx))), iz = Math.max(0, Math.min(SEG - 1, Math.floor(gz))), u = gx - ix, v = gz - iz;
      const H = (i, j) => pos.getY(j * (SEG + 1) + i), ha = H(ix, iz), hb = H(ix, iz + 1), hc = H(ix + 1, iz + 1), hd = H(ix + 1, iz);
      return u + v <= 1 ? ha + (hd - ha) * u + (hb - ha) * v : hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
    };
    return { scene, camera, height, meshHeight, on, sun, sunBase: P.sun[1], sunGlow, ambient, hemi, stars, rocket, rocketY: rocket.position.y, hatch, hatchY: hatch.position.y,
      fpGeo, fpMat, astronaut, myPrints, printIdx: 0, dust, dustIdx: 0, ground, tint: P.tint, groundSize: SIZE };
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
      if (sc.extra) mk.removeFromParent(); // Extra zum Anschauen (Waage, Größenvergleich): keine Mission, also keine Lichtsäule
      const zone = sc.info ? (sc.reach || 3.2) : sc.zone || (sc.small ? 1.3 : sc.extra ? 2 : 1.7);
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
    if (world.rack) for (const m of world.rack.userData.globes || []) m.rotation.y += 0.12 * dt; // Kugeln im Größenvergleich drehen sich langsam
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
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), M.metal), 0, 0.4, -0.06); // Pfosten bleibt hinter der schrägen Platte
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), M.metal), 0, 0.025, -0.06);
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
  // Mondauto wie bei Apollo 15–17 (vorn = +Z): Rohrrahmen, vier Drahtgeflecht-Räder mit Titan-Stollen, Kotflügel, zwei Klappsitze mit Gurten,
  // Steuerkonsole mit T-Griff, vorn Schirmantenne, Stabantenne und Fernsehkamera, hinten der Werkzeugträger
  let lrvWheelTex = null;
  function moonBuggy(M) {
    const g = new THREE.Group();
    const alu = M.std({ color: srgb(0xc3c8cf), roughness: 0.35, metalness: 0.8 }), dark = M.std({ color: srgb(0x2b2f36), roughness: 0.6, metalness: 0.4 });
    const fender = M.std({ color: srgb(0x8aa0b4), roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide }), seat = M.std({ color: srgb(0x5b6f86), roughness: 0.8 });
    if (!lrvWheelTex) { lrvWheelTex = canvasTex(256, 64, (c) => { // Drahtgeflecht mit Stollen (durchsichtig dazwischen)
      c.clearRect(0, 0, 256, 64); c.strokeStyle = "rgba(205,210,216,1)"; c.lineWidth = 1.6;
      for (let x = -64; x < 320; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 32, 64); c.moveTo(x, 64); c.lineTo(x + 32, 0); c.stroke(); }
      c.fillStyle = "rgba(150,155,162,1)"; for (let x = 0; x < 256; x += 16) { c.beginPath(); c.moveTo(x, 6); c.lineTo(x + 8, 32); c.lineTo(x, 58); c.lineTo(x + 4, 58); c.lineTo(x + 12, 32); c.lineTo(x + 4, 6); c.fill(); }
      c.fillStyle = "rgba(170,175,182,1)"; c.fillRect(0, 0, 256, 4); c.fillRect(0, 60, 256, 4);
    }); lrvWheelTex.wrapS = THREE.RepeatWrapping; lrvWheelTex.repeat.x = 3; }
    const tire = new THREE.MeshStandardMaterial({ map: lrvWheelTex, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.7, roughness: 0.4 });
    // Rahmen: zwei Längsrohre, Querrohre, Bodenbleche
    for (const x of [-0.55, 0.55]) rod(g, new V(x, 0.62, -1.45), new V(x, 0.62, 1.45), 0.035, alu);
    for (const z of [-1.4, -0.7, 0, 0.7, 1.4]) rod(g, new V(-0.58, 0.62, z), new V(0.58, 0.62, z), 0.025, alu, 8);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.02, 2.7), M.std({ color: srgb(0x9ca3af), roughness: 0.6, metalness: 0.5 })), 0, 0.6, 0);
    // Räder mit Aufhängung und Kotflügeln
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const wx = x * 0.92, wz = z * 1.12, wheel = new THREE.Group(); wheel.position.set(wx, 0.41, wz); g.add(wheel);
      const t = put(wheel, new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.23, 40, 1, true), tire), 0, 0, 0); t.rotation.z = Math.PI / 2;
      for (const sx of [-0.11, 0.11]) { const r = put(wheel, new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.018, 6, 36), alu), sx, 0, 0, false); r.rotation.y = Math.PI / 2; }
      const hub = put(wheel, new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 20), alu), 0, 0, 0); hub.rotation.z = Math.PI / 2;
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; rod(wheel, new V(-x * 0.06, Math.cos(a) * 0.12, Math.sin(a) * 0.12), new V(-x * 0.1, Math.cos(a) * 0.36, Math.sin(a) * 0.36), 0.01, alu, 5, false); }
      rod(g, new V(x * 0.55, 0.62, wz - 0.2), new V(wx - x * 0.12, 0.45, wz), 0.025, alu, 8); rod(g, new V(x * 0.55, 0.62, wz + 0.2), new V(wx - x * 0.12, 0.45, wz), 0.025, alu, 8);
      const fd = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.3, 24, 1, true, -Math.PI * 0.32, Math.PI * 0.64), fender), wx, 0.43, wz, false); fd.rotation.z = Math.PI / 2;
    }
    // zwei Klappsitze mit Gurtband
    for (const x of [-0.3, 0.3]) {
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.42), seat), x, 0.78, -0.15);
      const back = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.05), seat), x, 1.02, -0.4); back.rotation.x = -0.22;
      rod(g, new V(x - 0.23, 0.64, -0.35), new V(x - 0.23, 1.24, -0.46), 0.015, alu, 6, false); rod(g, new V(x + 0.23, 0.64, -0.35), new V(x + 0.23, 1.24, -0.46), 0.015, alu, 6, false);
      rod(g, new V(x - 0.2, 0.84, -0.32), new V(x + 0.2, 0.84, 0.0), 0.012, M.std({ color: srgb(0xe5e7eb), roughness: 0.8 }), 5, false); // Gurt
    }
    // Steuerkonsole mit Anzeigen und T-Griff zwischen den Sitzen
    rod(g, new V(0, 0.62, 0.32), new V(0, 1.05, 0.38), 0.03, alu, 8);
    const panel = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.08), dark), 0, 1.12, 0.4); panel.rotation.x = -0.4;
    put(panel, new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2), screenMat("bars")), 0, 0, -0.041, false).rotation.y = Math.PI;
    rod(g, new V(0, 0.62, 0.05), new V(0, 0.86, 0.05), 0.016, alu, 6, false); rod(g, new V(-0.07, 0.86, 0.05), new V(0.07, 0.86, 0.05), 0.016, dark, 6, false); // T-Griff
    // vorn: Batteriekästen mit Spiegeln, Schirmantenne, Stabantenne, Fernsehkamera
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.5), M.std({ color: srgb(0xd9dde3), roughness: 0.4, metalness: 0.3 })), 0, 0.75, 1.2);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.45), M.std({ color: srgb(0xe2e8f0), roughness: 0.05, metalness: 1 })), 0, 0.87, 1.2, false);
    rod(g, new V(-0.4, 0.86, 1.3), new V(-0.4, 1.75, 1.3), 0.018, alu, 8);
    const um = put(g, new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.18, 24, 1, true), M.std({ color: srgb(0xf1f5f9), roughness: 0.6, side: THREE.DoubleSide })), -0.4, 1.86, 1.3, false); um.rotation.x = Math.PI - 0.5;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; rod(um, new V(0, 0.09, 0), new V(Math.cos(a) * 0.46, -0.09, Math.sin(a) * 0.46), 0.006, alu, 4, false); }
    rod(g, new V(0.42, 0.86, 1.35), new V(0.42, 1.6, 1.35), 0.012, alu, 6); put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 12), dark), 0.42, 1.72, 1.35, false); // Stabantenne
    rod(g, new V(0.05, 0.86, 1.42), new V(0.05, 1.32, 1.42), 0.02, alu, 8);
    const cam = new THREE.Group(); cam.position.set(0.05, 1.42, 1.42); cam.rotation.y = 0.3; g.add(cam);
    put(cam, new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.3), M.std({ color: srgb(0xe5e7eb), roughness: 0.4 })), 0, 0, 0);
    put(cam, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 14), dark), 0, 0, 0.2, false).rotation.x = Math.PI / 2;
    // hinten: Werkzeugträger mit Zange, Schaufel und Probenbeuteln
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.28), M.std({ color: srgb(0x8e959e), roughness: 0.5, metalness: 0.5 })), 0, 0.9, -1.38);
    for (const x of [-0.3, -0.1, 0.12]) rod(g, new V(x, 0.7, -1.55), new V(x + 0.05, 1.55, -1.6), 0.012, alu, 6, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.03), alu), 0.17, 1.6, -1.61, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.08), M.std({ color: srgb(0xf5f5f4), roughness: 0.9 })), 0.32, 1.0, -1.55, false);
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
  // Quader-Balken von a nach b (Querschnitt w × h); liegt b in derselben senkrechten Ebene wie a, bleibt die Oberseite oben
  function beamSeg(parent, a, b, w, h, mat, shadow = true) {
    const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d.length()), mat);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V(0, 0, 1), d.normalize()); m.castShadow = shadow; parent.add(m); return m;
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
    // Treppe: zwei schräge Wangen, Gitterrost-Stufen, Handläufe auf beiden Seiten
    const grate = M.std({ map: canvasTex(128, 64, (c) => { c.fillStyle = "#6b7280"; c.fillRect(0, 0, 128, 64); c.fillStyle = "#1f2937"; for (let x = 3; x < 128; x += 9) for (let y = 3; y < 64; y += 9) c.fillRect(x, y, 6, 6); }), roughness: 0.45, metalness: 0.6 });
    const nS = 4, rise = lift / (nS + 1), run = 0.32, z0 = R - 0.05, z1 = z0 + nS * run + 0.12;
    for (const sx of [-0.6, 0.6]) {
      beamSeg(g, new V(sx, lift - 0.06, z0), new V(sx, 0.02, z1), 0.06, 0.2, M.steel);
      pipeSeg(g, M, new V(sx, lift, z0 + 0.05), new V(sx, lift + 0.95, z0 + 0.05), 0.025, M.steel);
      pipeSeg(g, M, new V(sx, 0, z1 - 0.06), new V(sx, 0.95, z1 - 0.06), 0.025, M.steel);
      pipeSeg(g, M, new V(sx, lift + 0.95, z0 + 0.05), new V(sx, 0.95, z1 - 0.06), 0.035, M.teal);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.04, 12), M.metal), sx, 0.02, z1 - 0.06);
    }
    for (let j = 0; j < nS; j++) put(g, new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.045, run - 0.03), grate), 0, lift - (j + 1) * rise - 0.02, z0 + 0.17 + j * run);
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
    const moonKeep = [[...L.fallversuch, 6], [...L.himmel, 6], [...L.apollo, 10], [...L.boulder, 8], [...L.spawn, 5], [...L.waage, 9], [...L.wegweiser, 4], [...L.station, 22], [L.station[0], L.station[1] + 18, 28], [...L.spiegel, 5], [...L.antenne, 6], [MOON_CRATER[0], MOON_CRATER[1], MOON_CRATER[2] + 8], ...craters.map(([x, z, r]) => [x, z, r])];
    const small = scatterCraters(L, moonKeep, W.fast ? 30 : 50, 501, 1.6, 7, 200);
    craters.push(...small);
    const fresh = small.filter((c, i) => i % 4 === 0); // junge Krater: heller Auswurf mit Strahlen
    const J = MOON_JUMP, jumpLevel = makeHeight(craters, [], 0)(...J.board), jumpFlats = [];
    for (let k = -10; k <= 8; k += 1.5) jumpFlats.push([J.board[0] + J.dir[0] * k, J.board[1] + J.dir[1] * k, 3.2, jumpLevel, 5]); // ganz eben, sonst stimmen die Weiten nicht
    const flats = [...jumpFlats, [0, 0, 11], [...L.fallversuch, 5], [...L.himmel, 4, "auto", 3], [...L.apollo, 10], [...L.boulder, 7], [...L.shadowSpot, 6], [...L.waage, 9], [...L.station, 20, "auto"], [L.station[0], L.station[1] + 18, 24, "auto"], [...L.spiegel, 4], [...L.antenne, 5, "auto", 9]];
    const B = buildBase({
      height: makeHeight(craters, flats, 0),
      sky: 0x000000, stars: true, sunSize: 160,
      ground: 0x86837d, rock: 0x6b6863,
      tint: (x, z) => { // dunklere „Meere“, dunkler Graben, heller Auswurf um junge Krater
        let m = 0.72 + 0.28 * smooth(0.35, 0.6, fbm2(x * 0.01 + 3, z * 0.01));
        m *= 0.94 + 0.12 * fbm2(x * 0.09 + 5, z * 0.09);
        for (const [cx, cz, r] of fresh) { const d = Math.hypot(x - cx, z - cz); if (d < r * 3.2) { const ray = 0.6 + 0.4 * Math.max(0, Math.sin(Math.atan2(z - cz, x - cx) * 7 + cx)); m += 0.22 * smooth(r * 3.2, r * 0.9, d) * (d > r * 1.1 ? ray : 1); } }
        return [m, m, m * 1.02];
      },
      keepFree: [[...L.fallversuch, 5], [...L.himmel, 6], [...L.apollo, 9], [...L.shadowSpot, 7], [...L.spawn, 4],
        [...L.waage, 8], [...L.wegweiser, 3], [...L.mondstein, 3], [...MOON_JUMP.board, 9], [...MOON_JUMP.end, 4], [L.station[0], L.station[1] + 2, 18], [L.station[0], L.station[1] + 18, 26], [...L.spiegel, 4], [...L.antenne, 4]],
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
    const lander = on(mergeStatic(makeLander(M)), ...L.apollo);
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

    const boulder = new THREE.Mesh(boulderGeo(11), new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 1, vertexColors: true, ...rockTex(8, 4, 1.6), envMap: M.env, envMapIntensity: 0.7 })); // verwitterter Felsbrocken
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
    const longJump = buildLongJump(B, M);
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
    // Funkstation: Gittermast (Eckstiele, Ringe, Kreuzstreben) mit Plattform und großer Parabolantenne zur Erde, daneben der Gerätecontainer
    const [nx, nz] = L.antenne, mast = new THREE.Group(); on(mast, nx, nz);
    const lv = [0, 0.9, 1.8, 2.7, 3.5], wAt = (y) => 0.75 - (0.47 * y) / 3.5;
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rod(mast, new V(x * 0.75, 0, z * 0.75), new V(x * 0.28, 3.5, z * 0.28), 0.05, M.steel);
    for (let i = 0; i < lv.length; i++) {
      const w = wAt(lv[i]), c4 = [[-w, -w], [w, -w], [w, w], [-w, w]];
      for (let k = 0; k < 4; k++) rod(mast, new V(c4[k][0], lv[i] + 0.02, c4[k][1]), new V(c4[(k + 1) % 4][0], lv[i] + 0.02, c4[(k + 1) % 4][1]), 0.025, M.steel, 6, false);
      if (i < lv.length - 1) { const w2 = wAt(lv[i + 1]), d4 = [[-w2, -w2], [w2, -w2], [w2, w2], [-w2, w2]]; for (let k = 0; k < 4; k++) { rod(mast, new V(c4[k][0], lv[i], c4[k][1]), new V(d4[(k + 1) % 4][0], lv[i + 1], d4[(k + 1) % 4][1]), 0.016, M.steel, 6, false); rod(mast, new V(c4[(k + 1) % 4][0], lv[i], c4[(k + 1) % 4][1]), new V(d4[k][0], lv[i + 1], d4[k][1]), 0.016, M.steel, 6, false); } }
    }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(mast, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), M.metal), x * 0.75, 0.02, z * 0.75, false); // Fußplatten
    put(mast, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.9), M.metal), 0, 3.53, 0);
    for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]]) rod(mast, new V(x, 3.55, z), new V(x, 4.05, z), 0.015, M.orange, 6, false);
    for (const [a, b] of [[[-0.42, -0.42], [0.42, -0.42]], [[0.42, -0.42], [0.42, 0.42]], [[0.42, 0.42], [-0.42, 0.42]], [[-0.42, 0.42], [-0.42, -0.42]]]) rod(mast, new V(a[0], 4.03, a[1]), new V(b[0], 4.03, b[1]), 0.015, M.orange, 6, false);
    const ant = makeDishAntenna(earthDir, 1.25); ant.position.y = 3.56; mast.add(ant);
    const shelter = equipShelter(M); shelter.position.set(2.3, 0, -1.2); shelter.rotation.y = -0.5; mast.add(shelter);
    rod(mast, new V(0.5, 0.45, -0.5), new V(1.55, 0.45, -1.05), 0.05, M.metal);                                     // Kabelkanal zum Container
    rod(mast, new V(0.3, 3.5, 0.3), new V(0.7, 0.45, 0.7), 0.018, new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 }), 6, false); // Kabel am Mast
    const blinkMast = [blinkLamp(mast, 0xff3b30, 0.42, 4.12, 0.42)];
    mergeStatic(mast, blinkMast);
    const table = on(makeTable(), ...L.fallversuch);
    const hammer = makeHammer(), feather = makeFeather();
    hammer.scale.setScalar(1.1); feather.scale.setScalar(1.1); // echte Größe: Hammer knapp 50 cm, Feder gut 35 cm
    hammer.userData.table = [new V(0.22, 1.059, 0.12), new THREE.Euler(Math.PI / 2, -Math.PI / 2, 0, "YXZ")]; // liegen flach auf dem Tisch
    feather.userData.table = [new V(0.3, 1.036, -0.2), new THREE.Euler(Math.PI / 2, -Math.PI / 2 - 0.15, 0, "YXZ")];
    for (const o of [hammer, feather]) { o.position.copy(o.userData.table[0]); o.rotation.copy(o.userData.table[1]); }
    table.add(hammer, feather);
    const fallPlaque = on(makePlaque(M, [["HAMMER & FEDER", 44], ["Apollo 15 · 1971", 36], ["Dave Scott ließ beide", 30], ["gleichzeitig fallen", 30]]), L.fallversuch[0] - 2, L.fallversuch[1] + 1.6);
    fallPlaque.rotation.y = Math.atan2(-fallPlaque.position.x, -fallPlaque.position.z);
    // Mondauto vor der Basis
    const buggy = on(mergeStatic(moonBuggy(M)), L.station[0] - 12, L.station[1] - 4); buggy.rotation.y = 0.5;

    // Fußabdrücke von 1969 rund um die Fähre (bleiben, weil es keinen Wind gibt)
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 3.2, r = 4.5 + (i % 7) * 0.9;
      const x = L.apollo[0] + Math.cos(a) * r + ((i % 2) - 0.5) * 0.4, z = L.apollo[1] + Math.sin(a) * r;
      const fp = new THREE.Mesh(fpGeo, fpMat);
      fp.position.set(x, height(x, z) + 0.03, z); fp.rotation.y = -a;
      scene.add(fp);
    }
    // Spuren im Staub: der Rundgang, den Lea mit dem Kind läuft; Felsgruppen
    drawTour(B, L, [118, 116, 112], 1.9, "boots", "pole"); // Mond: festgetretener, dunklerer Staub mit Stiefelabdrücken
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
      [...L.spiegel, 0.5], [...L.wegweiser, 0.3], [...L.antenne, 1.2], [L.antenne[0] + 2, L.antenne[1] - 1, 1.1], ...longJump.cols,
      [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25], [cargo.position.x, cargo.position.z, 3.6],
      [buggy.position.x, buggy.position.z, 1.8], ...clusters.filter((c) => c[2] >= 5).map(([x, z]) => [x, z, 1.2]), ...npcs.map((n) => n.col),
      ...moonCampColliders(L.station), ...canopyColliders(L.station)];

    const craneArm = cargo.userData.crane;
    return { ...B, L, longJump, station, laserFrom, beam, pulse, earth, earthDir, cmpMoon, cmpRight, scale, lander, boulder, telescope, table, hammer, feather,
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
  let quizScene = 0; // Zeitpunkt: Nora hat die Bodenstation angekündigt – bis das Funk-Fenster aufgeht, schweigen die Bewohner (höchstens 20 s)

  function allQuestions() { return cfg.quiz.map((q) => ({ ...q, own: true })); }
  function fmtVars(t, vars) {
    const std = { name: G.state.name, anzahl: cfg.discoveries.length, fragen: allQuestions().length };
    return t.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : std[k] != null ? std[k] : "")).replace(/\bNoch 1 Entdeckungen\b/g, "Noch 1 Entdeckung").replace(/\bNoch 1 Mess-Tore\b/g, "Noch 1 Mess-Tor").replace(/\bNoch 1 Aufgaben\b/g, "Noch 1 Aufgabe");
  }

  // fn erst ausführen, wenn gerade niemand spricht und Nora keinen Satz mehr in der Warteschlange hat (spätestens nach max ms)
  function whenQuiet(fn, max = 9000) {
    const t0 = performance.now();
    const tick = () => {
      if (!S.active) return;
      const busy = Voice.busy() || !!(guide && guide.pending);
      if (busy && performance.now() - t0 < max) setTimeout(tick, 150); else setTimeout(fn, 250);
    };
    setTimeout(tick, 200);
  }
  function radio(text, vars, who) {
    const msg = fmtVars(text, vars);
    $("radioText").textContent = msg;
    $("radioHead").textContent = who || "📻 Bodenstation";
    const r = $("radio"); r.classList.remove("hidden"); r.classList.remove("ping"); void r.offsetWidth; r.classList.add("ping");
    radioTimer = 14;
    radioVoice = Voice.say(msg, who && /Nora/.test(who) ? "nora" : "radio", { polite: true, queue: Voice.busy() }); // lässt ausreden, wer gerade spricht
  }

  function foundMap() { return (G.state.found && G.state.found[bodyId]) || {}; }
  function foundCount() { const f = foundMap(); return cfg.discoveries.filter((d) => f[d.key]).length; }

  function updateCounter() {
    $("discCount").textContent = `${foundCount()}/${cfg.discoveries.length}`;
    if (probe) return;
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
    Voice.say(`${d.title}. ${text}`, "card", { modal: true, queue: Voice.busy() }); // spricht gerade jemand, liest Nora die Karte danach vor (nicht mittendrin abbrechen)
    if (guide && !known) guide.pending = null; // was sie noch sagen wollte (z. B. „Stell dich in den Kreis“), passt jetzt nicht mehr
    // Echte Fotos zum Durchblättern (aus der früheren Steckbrief-Galerie)
    if (d.gallery && !extra) UI.renderGallery($("discGallery"), (D.photos[bodyId] || []).filter((p) => d.gallery.includes(p.file)), 0, false, true);
    $("discOk").onclick = () => {
      UI.closeModal();
      if (known) return;
      const rest = cfg.discoveries.length - foundCount();
      if (rest === 0 && G.onPlanetDone) G.onPlanetDone(bodyId); // Mission erst jetzt geschafft: alles entdeckt
      if (guide) guide.justFound = key; // Nora reagiert gleich darauf („Verrückt, oder? …“)
      if (rest > 0) { if (!(guide && guide.on)) radio(D.radioFound[rest] || D.radioFound[D.radioFound.length - 1], { rest }); } // mit Führung sagt Nora, wohin es weitergeht
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
        <div class="row-gap">${all ? `<button class="btn ${quizDone ? "ghost" : "primary"}" id="foundQuiz">📻 Funk-Fragen ${quizDone ? "nochmal" : "beantworten"}</button>` : ""}<button class="btn primary" id="foundOk">Weiter erkunden ▶</button></div>
      </div>`);
    document.querySelectorAll("#modalContent .answer[data-key]").forEach((b) => b.onclick = () => discover(b.dataset.key, null, true));
    $("foundOk").onclick = () => UI.closeModal();
    if (all) $("foundQuiz").onclick = () => { UI.closeModal(); startQuiz(); };
  }

  // Alles entdeckt: Nora reagiert und kündigt die Bodenstation an – erst wenn sie ausgeredet hat, meldet sich die Bodenstation
  // Mit finale (z. B. Mond): erst zeigt Nora noch die Basis und führt zur „Wusstest du?“-Wand – dort meldet sich die Bodenstation
  function quizSoon() {
    if (guide && guide.on && guide.n.obj.visible) {
      const GC = cfg.guide, r = guide.justFound && GC.react && GC.react[guide.justFound]; guide.justFound = null;
      if (GC.finale && !guide.finale) { guide.finale = "walk"; guideSay([r, GC.finale.say]); return; }
      guideSay([r, guide.finale === "done" ? GC.finale.arrive : GC.quiz]);
      quizScene = performance.now();
      whenQuiet(() => startQuiz(true), 12000);
    } else { quizScene = performance.now(); setTimeout(() => startQuiz(true), 900); }
  }
  // auto = die Fragen kommen direkt nach der letzten Entdeckung → danach automatisch einsteigen und losfliegen
  function startQuiz(auto) {
    if (!S.active || UI.modalOpen() || view.special) { if (S.active) setTimeout(() => startQuiz(auto), 1500); return; } // erst, wenn kein Fenster offen ist und man nicht gerade an der Waage o. Ä. steht
    // Erst die Fragen zum Erkunden, dann die Fragen aus dem früheren Steckbrief-Quiz – alles per Funk
    const qs = allQuestions(); let i = 0, right = 0, rightOwn = 0;
    // Die Bodenstation meldet sich zuerst – die Fragen kommen, wenn das Kind „Ja, ich bin bereit!“ antwortet
    const intro = () => {
      quizScene = performance.now();
      const text = fmtVars((auto || !quizDone) && cfg.radio.quizIntro ? cfg.radio.quizIntro : D.quizAgain); // „Noch eine Runde?“ erst, wenn sie schon beantwortet sind
      UI.openModal(`
        <div class="discovery">
          <div class="disc-kicker">📻 Funkspruch der Bodenstation</div>
          <p class="intro">${text}</p>
          <div class="row-gap"><button class="btn primary" id="sqReady">${D.quizReady}</button></div>
        </div>`);
      Voice.say(text, "radio", { modal: true, polite: true, queue: Voice.busy() });
      $("sqReady").onclick = () => { Sound.click(); show(); };
    };
    const show = () => {
      const q = qs[i];
      UI.openModal(`
        <div class="discovery">
          <div class="disc-kicker">📻 Funkspruch der Bodenstation · Frage ${i + 1} von ${qs.length}</div>
          <h2 style="font-size:24px">${q.q}</h2>
          <div class="answers">${q.a.map((t, k) => `<button class="answer" data-k="${k}">${t}</button>`).join("")}</div>
          <div id="sqAfter"></div>
        </div>`);
      const nth = i === qs.length - 1 && qs.length > 1 ? D.quizOrder[D.quizOrder.length - 1] : D.quizOrder[Math.min(i, D.quizOrder.length - 2)]; // „Erste Frage:“ … „Und die letzte Frage:“
      Voice.say([nth, `${q.q} ${q.a.slice(0, -1).join("? ")}? Oder: ${q.a[q.a.length - 1]}?`], "radio", { modal: true });
      document.querySelectorAll("#modalContent .answer").forEach((b) => b.onclick = () => {
        const ok = +b.dataset.k === q.c; if (ok) { right++; if (q.own) rightOwn++; Sound.correct(); } else Sound.wrong();
        document.querySelectorAll("#modalContent .answer").forEach((x) => { x.disabled = true; if (+x.dataset.k === q.c) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        const pre = (ok ? D.quizRight : D.quizWrong)[i % D.quizRight.length]; // jede Frage eine andere Rückmeldung
        Voice.say(`${pre} ${q.why}`, "radio", { modal: true });
        $("sqAfter").innerHTML = `<div class="why">${ok ? "✅" : "❌"} ${pre} ${q.why}</div><div class="row-gap"><button class="btn primary" id="sqNext">${i < qs.length - 1 ? "Nächste Frage ▶" : "Ergebnis 🏆"}</button></div>`;
        $("sqNext").onclick = () => { i++; if (i < qs.length) show(); else finish(); };
      });
    };
    const finish = () => {
      quizDone = true; quizScene = 0;
      const QE = D.quizEnd, endText = fmtVars(right === qs.length ? QE.all : right ? QE.some : QE.none, { r: right, n: qs.length });
      G.onSurfaceQuiz(bodyId, rightOwn);
      G.onQuizFinished(bodyId, right - rightOwn);
      UI.openModal(`<div class="discovery center">
        <div class="stars-row">${qs.map((_, k) => `<span class="${k < right ? "" : "off"}">⭐</span>`).join("")}</div>
        <h2>${right} von ${qs.length} richtig</h2><p class="intro">📻 „${endText}“</p>
        <div class="row-gap"><button class="btn primary" id="sqClose">${auto ? "🚀 Weiterfliegen" : "👍 Super"}</button></div></div>`);
      if (right === qs.length) { Sound.fanfare(); UI.confetti(); }
      Voice.say(endText, "radio", { modal: true });
      $("sqClose").onclick = () => { UI.closeModal(); if (auto) { if (guide) { guide.key = "rakete"; guide.said.rakete = true; guide.autoBoard = true; } flyHome(); } else radio(cfg.radio.quizDone); }; // gleich einsteigen: kein „Komm, zur Rakete“ vorher
    };
    intro();
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
      if (guide) { // Nora steht vor der Leiter und steigt zuerst ein
        const n = guide.n, nx = HATCH.x * 2.45, nz = HATCH.z * 2.45; // schon vor der Leiter – sie klettert gleich los
        n.obj.visible = true; n.climbY = n.outR = n.standY = null; n.talk = 0; n.obj.position.set(nx, world.height(nx, nz), nz); n.heading = Math.atan2(-HATCH.x, -HATCH.z);
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
        if (view.special.key === "curling") { if (view.special.phase === "aim") view.special.aim = Math.max(-0.45, Math.min(0.45, view.special.aim - (e.clientX - drag.x) * 0.004)); } // Curling: auch per Wischen zielen
        else if (view.special.phase === "aim") { view.special.yaw += (e.clientX - drag.x) * k; view.special.pitch += (e.clientY - drag.y) * k; }
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
    if (worlds[id].pathMarks) worlds[id].colliders.push(...worlds[id].pathMarks.map(([x, z]) => [x, z, 0.2]));
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
    experiment = null; boarding = null; jumpPressed = actionPressed = false; talk = null; talkCd = 4; talkHeard = {};
    world.scene.add(world.astronaut); // holt den Astronauten aus dem zuletzt besuchten Ort hierher
    world.astronaut.visible = true; world.astronaut.scale.setScalar(1);
    world.hatch.userData.setDoor(1);
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
    precompile();
    S.active = true;
    const rest = cfg.discoveries.length - foundCount();
    const first = foundCount() === 0;
    setupGuide();
    quizScene = 0;
    // Schon alles entdeckt: Funk-Fragen ploppen NICHT von selbst auf (nur direkt nach der letzten Entdeckung) – ein Funkspruch sagt, wo sie sind
    if (!guide || !guide.on) setTimeout(() => { if (S.active) radio(rest === 0 ? (quizDone ? cfg.radio.quizDone : D.radioQuizOpen) : first ? cfg.radio.start : cfg.radio.back, { rest }); }, 700);
  };

  // Alle Oberflächen dieses Ortes gleich beim Betreten vorbereiten (Shader übersetzen) – auch was erst später sichtbar wird.
  // Sonst übersetzt der Grafikchip sie erst, wenn sie zum ersten Mal ins Bild kommen: auf Handys jedes Mal ein kurzer Hänger beim Laufen.
  // (Passiert hinter der Überblendung – da merkt man es nicht.)
  function precompile() {
    if (world.compiled) return; world.compiled = true;
    try { W.renderer.compile(world.scene, world.camera); } catch (e) { /* dann eben beim ersten Anblick */ }
  }

  function exit() {
    $("guideBtn").classList.add("hidden"); guide = null;
    if (!S.active) return;
    S.active = false; probe = null;
    Sound.engine(0); Sound.wind(0); Sound.ambience(null); Sound.loopsOff(); Voice.stop();
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
  // Leise Hintergrundgeräusche je Ort (Sound.ambience): Wo es Luft gibt, weht leiser Wind; ohne Luft hört man draußen nichts –
  // nur das Brummen des eigenen Raumanzugs. Dazu Vögel und Wasser auf der Erde, blubbernde Lava auf der Venus.
  let ambBird = 4, ambBubble = 1;
  function ambience(dt, t) {
    const p = ast.pos, gust = 0.5 + 0.5 * Math.sin(t * 0.07) * Math.sin(t * 0.113 + 1); // langsame, seltene Böen
    const duck = UI.modalOpen() || Voice.busy();
    let L;
    if (bodyId === "erde") {
      const air = view.special && view.special.key === "luft" ? view.special.a : 1; // Luft-Versuch: ohne Luft wird es still
      const lake = smooth(28, 10, Math.hypot(p.x - world.L.see[0], p.z - world.L.see[1]));
      L = { wind: (0.18 + 0.2 * gust) * air, water: 0.8 * lake * air };
      ambBird -= dt;
      if (ambBird <= 0) { ambBird = 3 + Math.random() * 7; if (air > 0.9 && !duck) Sound.bird(0.6 + Math.random() * 0.4); }
    } else if (bodyId === "mars") L = { wind: 0.3 + 0.35 * gust };
    else if (bodyId === "venus") {
      const dl = Math.abs(p.z - VENUS_LAVA_Z(p.x)) + Math.max(0, Math.abs(p.x) - 46), near = smooth(26, 3, dl);
      L = { wind: 0.2 + 0.1 * gust, lava: near };
      ambBubble -= dt * (0.4 + 2.5 * near);
      if (ambBubble <= 0) { ambBubble = 1 + Math.random(); if (near > 0.15 && !duck) Sound.bubble(near); }
    } else L = { hum: 0.6 }; // Mond, Merkur: keine Luft – kein Wind
    Sound.ambience(L, duck);
  }
  S.update = function (dt, elapsed) {
    if (!S.active || !world) return;
    if (probe) { Sound.ambience(null); updateProbe(dt, elapsed); return; }
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
    const lowG = g < 3; // Mond: Hüpf-Galopp wie die Apollo-Astronauten – sonst normales Laufen
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
    // Nicht ins Wasser laufen (See auf der Erde): am Ufer entlanggleiten
    if (!boarding && world.wet && world.wet(ast.pos.x, ast.pos.z)) {
      const nx = ast.pos.x, nz = ast.pos.z;
      if (!world.wet(nx, oz)) ast.pos.z = oz; else if (!world.wet(ox, nz)) ast.pos.x = ox; else { ast.pos.x = ox; ast.pos.z = oz; }
    }
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
      if (chal && chal.kind === "weit") longJumpTakeoff();
      Sound.hop(lowG);
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
          Sound.thud(0.22); // leiser Schritt beim Hüpfen auf Mond und Mars
        }
        if (ast.jumping) {
          ast.jumping = false;
          grains(ast.pos, 14, 0.8);
          footprint(0.17); footprint(-0.17);
          Sound.thud(1);
          // Höhe aus dem Absprung berechnen (gemessen wäre sie auf langsamen Geräten zu klein – die Erde springt nur 11 cm)
          const h = Math.max(ast.maxY - ast.jumpBase, cfg.jump);
          const jump = { hoehe: `${Math.round(h * 100)} Zentimeter`, zeit: Math.max(ast.airT, ast.airDur).toFixed(1).replace(".", ",") };
          const real = Math.abs(ast.pos.y - ast.jumpBase) < Math.max(0.25, cfg.jump * 0.6); // an einem steilen Hang zählt ein Sprung nicht
          if (chal && chal.kind === "weit") longJumpLanded();
          else if (real && (foundMap().sprung || !cfg.discoveries.some((d) => d.key === "sprung"))) UI.toast(`🦘 ${jump.hoehe} hoch · ${jump.zeit} Sekunden in der Luft`, "gold");
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
      const mode = boarding ? ((boarding.phase === "walk" && !boarding.waiting) || boarding.phase === "enter" ? "walk" : boarding.phase === "climb" ? "climb" : "stand")
        : ast.jumping ? "jump" : lowG && (ast.hopping || (ast.speed > 0.7 && ast.onGround)) ? "lope" : ast.run ? "run" : ast.speed > 0.15 ? "walk" : "stand";
      poseRig(u.rig, { mode, air: !ast.onGround, airP: ast.airDur ? Math.min(1, ast.airT / ast.airDur) : 0, contact: ast.contact || 0,
        speed: mode === "walk" && !boarding ? walkK : speedFrac, phase: ast.phase, hold, t: elapsed, carry: !!(chal && chal.kind === "shadow") });
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
      if (chal && CHAL_STATION[chal.kind] === key) continue; // das laufende Spiel nicht nochmal starten
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
    ambience(dt, elapsed);
    updateLabels();
    // Raketen-Markierung erst zeigen, wenn man sich entfernt hat (oder heim soll) – direkt nach der Landung stört sie nur
    const rk = world.stations.rakete;
    if (rk && !boarding && !view.special && !experiment) rk.marker.visible = Math.hypot(ast.pos.x - rk.x, ast.pos.z - rk.z) > 10 || quizDone || (guide && guide.on && guide.key === "rakete");
    animateMarkers(elapsed);
    updateCompass();
  };

  // ---------- Spielaufgaben, bei denen man frei herumläuft (Anzeige oben: #chalHud) ----------
  let chal = null;
  const CHAL_STATION = { weit: "mondstein", shadow: "temperatur", radar: "venera", safari: "wald" };
  // good = viel ist gut (Batterie, Signal, Fotos: rot → grün); sonst viel ist schlecht (Hitze: grün → rot)
  function chalHud(label, f, info, hot, good) {
    const h = $("chalHud"); h.classList.remove("hidden"); h.classList.toggle("hot", !!hot); h.classList.toggle("good", !!good);
    if ($("chalLabel").textContent !== label) $("chalLabel").textContent = label;
    $("chalFill").style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + "%";
    if ($("chalInfo").textContent !== (info || "")) $("chalInfo").textContent = info || "";
  }
  function endChallenge() { if (chal && chal.kind === "safari") safariUi(false); if (chal && chal.kind === "shadow") iceRunShow(false); chal = null; $("chalHud").classList.add("hidden"); }
  // Ein Spiel beginnt erst richtig, wenn die Erklärung zu Ende gesprochen ist (ohne Vorlesen: Zeit zum Lesen je nach Länge)
  function chalListen(c, text) { c.listen = true; c.listenAt = performance.now() / 1000; c.listenMin = Voice.enabled ? 0.8 : Math.min(7, Math.max(2.5, String(text || "").length / 15)); }
  function chalListening(c) {
    if (!c.listen) return false;
    const t = performance.now() / 1000 - c.listenAt;
    if (t > c.listenMin && (!Voice.busy() || t > 15)) c.listen = false;
    return c.listen;
  }
  function chalSay(text) { if (guide && guide.on && guide.n.obj.visible) guideSay(text, null, "now"); else radio(text); }
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
  // Mond: Weitsprung – 3 Versuche, ein Erd-Astronaut springt zum Vergleich mit
  const along = (x, z) => (x - MOON_JUMP.board[0]) * MOON_JUMP.dir[0] + (z - MOON_JUMP.board[1]) * MOON_JUMP.dir[1]; // Meter hinter der Absprunglinie
  function startLongJump() {
    chal = { kind: "weit", tries: 0, best: 0, phase: "run", wait: 0, ghostT: -1 };
    world.stations.mondstein.marker.visible = false;
    longJumpReset(); chalSay(cfg.longJump.start); Sound.click(); longJumpHud();
  }
  function longJumpReset() {
    const J = MOON_JUMP, [sx, sz] = J.start;
    ast.pos.set(sx, world.height(sx, sz), sz); ast.speed = ast.vy = 0; ast.onGround = true; ast.jumping = ast.hopping = false;
    ast.heading = view.yaw = Math.atan2(J.dir[0], J.dir[1]); view.dragged = 0;
    if (chal) { chal.phase = "run"; chal.from = null; }
  }
  function longJumpHud() {
    const T = cfg.longJump, c = chal, m = c.best ? c.best.toFixed(1).replace(".", ",") : "–";
    chalHud(fmtVars(T.label, { n: Math.min(3, c.tries + 1) }), c.best / 6, fmtVars(T.best, { m }), false, true);
  }
  function longJumpTakeoff() { // wird beim Absprung aufgerufen
    const c = chal, J = MOON_JUMP, s0 = along(ast.pos.x, ast.pos.z);
    if (c.phase !== "run") return;
    c.phase = "air"; c.foul = s0 > 0.35; c.from = [ast.pos.x, ast.pos.z, s0];
    // Erd-Astronaut: gleicher Anlauf, aber die Erde zieht 6-mal stärker – er kommt kaum vom Boden weg
    const pred = ast.speed * (ast.airDur || 1.2) * cfg.gravity / 9.81, g = world.longJump.ghost;
    g.visible = true; c.ghostT = 0; c.ghostFar = pred;
    g.rotation.y = Math.atan2(J.dir[0], J.dir[1]);
  }
  function longJumpLanded() {
    const c = chal, T = cfg.longJump, J = MOON_JUMP, LJ = world.longJump;
    if (c.phase !== "air" || !c.from) return;
    const far = Math.hypot(ast.pos.x - c.from[0], ast.pos.z - c.from[1]), sLand = along(ast.pos.x, ast.pos.z);
    c.phase = "wait"; c.wait = 3.2; c.tries++;
    if (c.foul) { Sound.wrong(); chalSay(T.foul); c.tries--; longJumpHud(); return; } // Übertreten zählt nicht als Versuch
    const earth = far * cfg.gravity / 9.81, fmt = (v) => v.toFixed(1).replace(".", ",");
    c.best = Math.max(c.best, far);
    // Fähnchen an beiden Landepunkten
    const put2 = (flag, x, z, txt, bg) => { flag.position.set(x, world.height(x, z), z); flag.visible = true; if (flag.userData.tag) flag.remove(flag.userData.tag); const t = LJ.tag(txt, bg); t.position.y = 1.55; flag.add(t); flag.userData.tag = t; };
    put2(LJ.flagMoon, ast.pos.x + J.side[0] * 0.4, ast.pos.z + J.side[1] * 0.4, "Mond " + fmt(far) + " m", "#b45309");
    const ex = c.from[0] + J.dir[0] * earth - J.side[0] * 1.3, ez = c.from[1] + J.dir[1] * earth - J.side[1] * 1.3;
    put2(LJ.flagEarth, ex + J.side[0] * -0.4, ez + J.side[1] * -0.4, "Erde " + fmt(earth) + " m", "#1d4ed8");
    UI.toast(fmtVars(T.result, { mond: fmt(far), erde: fmt(earth) }), "gold");
    const gold = sLand >= J.gold;
    if (gold) { Sound.correct(); UI.confetti(60); chalSay(T.gold); c.won = true; c.wait = 4.5; }
    else { Sound.collect(); chalSay(c.tries >= 3 ? T.done : T.good); if (c.tries >= 3) c.wait = 4.5; }
    longJumpHud();
  }
  function updateLongJump(dt, busy) {
    const c = chal, T = cfg.longJump, J = MOON_JUMP, LJ = world.longJump;
    if (c.ghostT >= 0) { // Erd-Astronaut hüpft neben dem Kind (gleiche Absprungstelle, seitlich versetzt)
      c.ghostT += dt; const k = Math.min(1, c.ghostT / 0.3), g = LJ.ghost;
      const x = c.from[0] + J.dir[0] * c.ghostFar * k - J.side[0] * 1.3, z = c.from[1] + J.dir[1] * c.ghostFar * k - J.side[1] * 1.3;
      g.position.set(x, world.height(x, z) + Math.sin(k * Math.PI) * 0.11, z);
      const u = g.userData, sw = k < 1 ? 0.5 : 0; u.legL.rotation.x = sw; u.legR.rotation.x = -sw * 0.6; u.armL.rotation.x = -0.6 * sw; u.armR.rotation.x = -0.6 * sw;
    }
    if (busy) return;
    if (c.phase === "run" && ast.onGround && !ast.jumping && along(ast.pos.x, ast.pos.z) > 0.7) { // ohne Sprung über die Linie gelaufen
      c.phase = "wait"; c.wait = 2.2; Sound.wrong(); chalSay(T.noJump);
    }
    if (c.phase === "wait" && (c.wait -= dt) <= 0) {
      if (c.won || c.tries >= 3) { const won = c.won; endChallenge(); world.stations.mondstein.marker.visible = true; LJ.ghost.visible = false; if (won || c.tries >= 3) discover("mondstein"); return; }
      LJ.ghost.visible = false; c.ghostT = -1; longJumpReset(); longJumpHud();
    }
    // weit weggelaufen: abbrechen
    const [mx, mz] = J.board;
    if (Math.hypot(ast.pos.x - mx, ast.pos.z - mz) > 26) { endChallenge(); world.stations.mondstein.marker.visible = true; LJ.ghost.visible = false; chalSay(T.quit); }
  }
  function updateChallenge(dt, busy) {
    if (!chal) return;
    if (chal.kind === "weit") { updateLongJump(dt, busy); return; }
    if (chal.kind === "safari") updateSafari(dt, busy);
    else if (chal.kind === "shadow") updateShadowRun(dt, busy);
    else if (chal.kind === "radar") updateRadar(dt, busy);
  }
  // Venus: Radar-Suche nach Venera 13. Signal = wie nah; alle paar Sekunden „wärmer“/„kälter“; nach einer Weile ein Richtungstipp.
  function startRadar() {
    chal = { kind: "radar", cool: 1, beep: 0, last: null, lastAt: 0, t: 0, hint: "" };
    world.stations.venera.marker.visible = false;
    chalSay(cfg.radar.start); Sound.click(); chalListen(chal, cfg.radar.start);
  }
  function updateRadar(dt, busy) {
    const T = cfg.radar, c = chal, [vx, vz] = world.L.venera;
    if (busy) return;
    if (chalListening(c)) { chalHud(T.label, 0, D.chalListen, false, true); return; } // erst zuhören – die Kühlung läuft noch nicht
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
      c.cool = 1; c.last = null; c.lastAt = c.t; chalListen(c, T.hot);
      return;
    }
    if (Math.hypot(ast.pos.x - rx, ast.pos.z - rz) > 95) { endRadar(false); chalSay(T.quit); }
  }
  function endRadar(found) {
    endChallenge();
    world.stations.venera.marker.visible = true;
    if (found) { Sound.correct(); UI.confetti(80); UI.toast(cfg.radar.found, "gold"); discover("venera"); }
  }
  // Merkur: Eis-Lieferung – einen Eisblock vom Eis-Lager zu Kofis Kühlschrank am großen Felsen tragen.
  // In der Sonne (430 °C) schmilzt er, im Schatten (−180 °C) bleibt er hart. Blau eingefärbt: wo Schatten liegt.
  const ICE_MELT = 0.14; // pro Sekunde in der Sonne (ganz geschmolzen nach gut 7 s Sonne)
  function iceRunShow(on) {
    const run = world.run; if (!run) return;
    world.finish.visible = on; run.block.visible = on; run.drops.visible = false;
    if (run.shade) run.shade.mesh.visible = on;
    world.stations.temperatur.marker.visible = !on;
  }
  function iceRunBack() { const run = world.run; ast.pos.set(run.S[0], world.height(...run.S), run.S[1]); ast.speed = 0; ast.heading = view.yaw = Math.atan2(run.F[0] - run.S[0], run.F[1] - run.S[1]); }
  // Schattenkarte der Strecke: einmal ausrechnen (Strahl zur Sonne knapp über dem Boden), als blaue Fläche aufs Gelände legen
  function iceShadeMap() {
    const run = world.run, H = world.height, step = 0.5;
    const dx = run.F[0] - run.S[0], dz = run.F[1] - run.S[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, vx = uz, vz = -ux;
    const u0 = -5, u1 = len + 6, w = 9, NU = Math.round((u1 - u0) / step) + 1, NV = Math.round((2 * w) / step) + 1;
    const at = (iu, iv) => { const u = u0 + iu * step, v = -w + iv * step; return [run.S[0] + ux * u + vx * v, run.S[1] + uz * u + vz * v]; };
    const grid = new Uint8Array(NU * NV), p = new V(), r = new THREE.Raycaster(); r.far = 200;
    run.casters.forEach((o) => o.updateMatrixWorld(true));
    for (let iu = 0; iu < NU; iu++) for (let iv = 0; iv < NV; iv++) {
      const [x, z] = at(iu, iv); p.set(x, H(x, z) + 0.4, z);
      r.set(p, SUN_DIR);
      grid[iu * NV + iv] = r.intersectObjects(run.casters, true).length > 0 || terrainShade(p, SUN_DIR) ? 1 : 0;
    }
    // Bild: 1 Pixel je Feld, weich gefiltert; zum Rand hin ausblenden
    const tex = canvasTex(NU, NV, (c) => {
      const img = c.createImageData(NU, NV);
      for (let iu = 0; iu < NU; iu++) for (let iv = 0; iv < NV; iv++) {
        const edge = Math.min(1, Math.min(iu, NU - 1 - iu) / 6, Math.min(iv, NV - 1 - iv) / 6), k = (iv * NU + iu) * 4;
        img.data[k] = 56; img.data[k + 1] = 189; img.data[k + 2] = 248; img.data[k + 3] = grid[iu * NV + iv] ? Math.round(150 * edge) : 0;
      }
      c.putImageData(img, 0, 0);
    });
    tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    // Fläche folgt dem Gelände
    const SU = Math.ceil(NU / 2), SV = Math.ceil(NV / 2), pos = [], uv = [], idx = [];
    for (let i = 0; i <= SU; i++) for (let j = 0; j <= SV; j++) {
      const fu = i / SU, fv = j / SV, [x, z] = at(fu * (NU - 1), fv * (NV - 1));
      pos.push(x, H(x, z) + 0.06, z); uv.push((fu * (NU - 1) + 0.5) / NU, 1 - (fv * (NV - 1) + 0.5) / NV);
    }
    for (let i = 0; i < SU; i++) for (let j = 0; j < SV; j++) { const a = i * (SV + 1) + j, b = a + SV + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    mesh.renderOrder = 2; mesh.visible = false; world.scene.add(mesh);
    const shade = (x, z) => {
      const ox = x - run.S[0], oz = z - run.S[1], iu = Math.round(((ox * ux + oz * uz) - u0) / step), iv = Math.round(((ox * vx + oz * vz) + w) / step);
      return iu >= 0 && iu < NU && iv >= 0 && iv < NV ? grid[iu * NV + iv] === 1 : temp.inShadow;
    };
    return { mesh, shade };
  }
  function startShadowRun() {
    const run = world.run, T = cfg.iceRun;
    if (!run.shade) run.shade = iceShadeMap();
    chal = { kind: "shadow", ice: 1 };
    iceRunBack(); iceRunShow(true);
    chalSay(T.start); Sound.click(); chalListen(chal, T.start);
  }
  function updateShadowRun(dt, busy) {
    const run = world.run, T = cfg.iceRun, c = chal;
    // Eisblock vor dem Bauch: wird kleiner, solange er schmilzt; in der Sonne tropft er
    const inShade = run.shade.shade(ast.pos.x, ast.pos.z), h = ast.heading, k = 0.4 + 0.6 * c.ice;
    run.block.position.set(ast.pos.x + Math.sin(h) * 0.36, ast.pos.y + 1.12, ast.pos.z + Math.cos(h) * 0.36);
    run.block.rotation.y = h; run.block.scale.setScalar(k);
    run.drops.visible = !inShade;
    if (!inShade) run.drops.children.forEach((d, i) => { const f = (performance.now() / 1000 * 1.7 + i / run.drops.children.length) % 1; d.position.set(run.block.position.x + Math.sin(i * 2.4) * 0.14 * k, run.block.position.y - 0.12 * k - f * 0.85, run.block.position.z + Math.cos(i * 2.4) * 0.1 * k); });
    if (busy) return;
    if (chalListening(c)) { chalHud(T.label, c.ice, D.chalListen, false, true); return; } // erst zuhören – das Eis schmilzt noch nicht
    if (!inShade) c.ice = Math.max(0, c.ice - ICE_MELT * dt);
    chalHud(T.label, c.ice, inShade ? T.cool : T.sun, c.ice < 0.35, inShade);
    const toGoal = Math.hypot(ast.pos.x - run.F[0], ast.pos.z - run.F[1]);
    if (toGoal < 1.6) { // geschafft: das Eis ist im Kühlschrank
      endChallenge(); Sound.correct(); UI.confetti(80); discover("temperatur"); return;
    }
    if (c.ice <= 0) { // geschmolzen: neuer Eisblock am Eis-Lager
      Sound.wrong(); chalSay(T.melted); c.ice = 1; iceRunBack(); chalListen(c, T.melted); return;
    }
    // weit weg gelaufen: abbrechen
    const line = Math.hypot(ast.pos.x - (run.S[0] + run.F[0]) / 2, ast.pos.z - (run.S[1] + run.F[1]) / 2);
    if (line > 26) { endChallenge(); chalSay(T.quit); }
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
    if (rr < 3.4 && want.y < world.rocketY + 11) { const k = 3.4 / (rr || 0.01); want.x *= k; want.z *= k; } // Rumpf und Flossen
    // view.camBase = wo die Kamera ohne Hindernisse wäre (weich nachgeführt). Hat jemand anderes die Kamera versetzt
    // (Landung, Fernrohr, Versuch …), von dort aus weitermachen.
    if (!view.camBase || !view.camLast || c.position.distanceToSquared(view.camLast) > 1e-6) { view.camBase = c.position.clone(); view.camArm = null; }
    view.camBase.lerp(want, 1 - Math.exp(-dt * 5));
    // nicht hinter Wände und in Gebäude: von Kopfhöhe zur Kamera schauen und vor dem ersten festen Teil bleiben
    camHead.set(ast.pos.x, ast.pos.y + 1.5, ast.pos.z);
    camDir.copy(view.camBase).sub(camHead);
    const camLen = camDir.length();
    let allowed = camLen;
    if (camLen > 1.1) {
      camRay.set(camHead, camDir.divideScalar(camLen)); camRay.far = camLen;
      const hit = camRay.intersectObjects(camBlockers(), false)[0];
      if (hit) allowed = Math.max(1, hit.distance - 0.35);
    } else camDir.divideScalar(camLen || 1);
    // Abstand weich anpassen: vor einem Hindernis zügig heran, danach langsam wieder zurück. Vorher sprang die Kamera sofort
    // heran und im nächsten Bild wieder weg – an Bäumen, Schilf, Zäunen und Felsen viele Male hintereinander: das Bild „zitterte“.
    const arm = view.camArm == null ? allowed : view.camArm;
    view.camArm = Math.min(camLen, arm + (allowed - arm) * (1 - Math.exp(-dt * (allowed < arm ? 12 : 2))));
    c.position.copy(camHead).addScaledVector(camDir, view.camArm);
    c.position.y += (camLen - view.camArm) * 0.25; // näher heran und dafür etwas höher – so schaut man über das Kind hinweg
    (view.camLast || (view.camLast = new V())).copy(c.position);
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
    if (key === "waage") startWeigh(); // Extras gibt es an mehreren Orten
    else if (key === "groesse") startSizes();
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
      world.hammer.rotation.set(0, ast.heading, 0); world.feather.rotation.set(0, ast.heading, 0);
      world.hammer.position.set(cx + rx * 0.4, baseY + 1.3, cz + rz * 0.4);
      world.feather.position.set(cx - rx * 0.4, baseY + 1.3, cz - rz * 0.4);
      experiment = { t: -1.4, y0: baseY + 1.3, ground: baseY, landed: false, fx, fz, rx, rz };
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
    const gi = Object.keys(D.surfaces).indexOf(bodyId) % D.guessOk.length; // wie in tools/stimmen.js
    return (ok ? `✅ ${D.guessOk[gi]} ` : `🤔 ${D.guessNo[gi]} `) + text;
  }
  function scopeSay(text, buttons, spoken) { // spoken = stattdessen vorlesen (ein Satz oder mehrere nacheinander)
    $("scopeText").textContent = text;
    if (text) Voice.say(spoken || text, "nora");
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

  // ---------- Waage (Extra, keine Mission): eigenes Erd-Gewicht einstellen und sehen, was die Waage hier anzeigt – so oft man will ----------
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
    view.special.kg = scaleKg; // zuletzt eingestelltes Gewicht
    showWeigh(true);
  }
  function moonKg(kg) { return (kg * cfg.gravity / 9.81).toFixed(1).replace(".", ",").replace(/,0$/, ""); } // 30,0 → 30
  // Die Anzeige reagiert wie eine echte Waage: Sie zeigt nur etwas an, solange der Astronaut auf der Platte steht
  let scaleKg = 30, scaleShown = "", scaleGuessing = false;
  function updateScaleDisplay() {
    const st = world.stations.waage || (world.scale && world.scale.position); if (!st || !world.scale) return;
    const onPlate = ast.onGround && Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z) < 0.6;
    const text = scaleGuessing ? "?? kg" : `${onPlate ? moonKg(scaleKg) : "0,0"} kg`;
    if (text !== scaleShown) { scaleShown = text; world.scale.userData.show(text); }
  }
  // Beim ersten Mal wird alles vorgelesen (Zahlen, dann die Erklärung), danach nur noch der Satz mit den neuen Zahlen
  function showWeigh(first) {
    const sp = view.special, T = cfg.weigh, mond = moonKg(sp.kg);
    scaleKg = sp.kg;
    const step = (d) => () => { sp.kg = Math.max(20, Math.min(60, sp.kg + d)); showWeigh(); };
    const text = fmtVars(T.text, { erde: sp.kg, mond });
    scopeSay(`${text} ${T.why}`, [[T.less, step(-5)], [T.more, step(5)], [T.done, endWeigh, true]], first ? [text, T.why] : text);
  }
  function endWeigh() {
    scaleGuessing = false; view.special = null;
    $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping");
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
    Sound.loopsOff();
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

  // Hände der Figur (Knochen „RightHand“/„LeftHand“ im Modell) – dort hält sie Hammer und Feder
  function astroHands() {
    const a = world.astronaut, u = a.userData;
    if (u.hands === undefined) { u.hands = null; let L = null, R = null; a.traverse((o) => { if (o.isBone && /LeftHand$/.test(o.name)) L = L || o; if (o.isBone && /RightHand$/.test(o.name)) R = R || o; }); if (L && R) u.hands = { L, R }; }
    return u.hands;
  }
  function updateExperiment(dt) {
    if (!experiment) return;
    const ex = experiment; ex.t += dt;
    if (ex.t < 0) { // in den Händen halten: Griff des Hammers in der rechten, Kiel der Feder in der linken Hand
      const H = astroHands();
      if (H) {
        world.astronaut.updateMatrixWorld(true);
        for (const [o, b] of [[world.hammer, H.R], [world.feather, H.L]]) { b.getWorldPosition(o.position); o.position.x += ex.fx * 0.06; o.position.z += ex.fz * 0.06; o.position.y -= 0.05; }
        ex.y0 = world.hammer.position.y = world.feather.position.y = Math.min(world.hammer.position.y, world.feather.position.y); // gleich hoch halten und loslassen
      }
      return;
    }
    if (!ex.released) { ex.released = true; Sound.click(); }
    const y = Math.max(ex.ground, ex.y0 - 0.5 * cfg.gravity * ex.t * ex.t);
    world.hammer.position.y = world.feather.position.y = y; // Nullpunkt = Unterkante
    if (ex.landed) { // nach dem Aufprall kippen beide um
      const k = Math.min(1, (ex.t - ex.landedAt) / 0.45), e = k * k;
      world.hammer.rotation.set(e * Math.PI / 2, ast.heading + 0.3, 0); world.feather.rotation.set(e * Math.PI / 2, ast.heading - 0.4, 0);
      world.hammer.position.y += 0.03 * e; world.feather.position.y += 0.005 * e; // flach liegend: Dicke über dem Boden
    }
    if (!ex.landed && y <= ex.ground) {
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
      for (const o of [world.hammer, world.feather]) { o.position.copy(o.userData.table[0]); o.rotation.copy(o.userData.table[1]); }
      discover("fallversuch", null, true);
    }
  }

  // Einsteigen: Nora läuft außen um die Rakete zur Leiter, klettert hoch und geht durch die Luke; das Kind wartet
  // vor der Leiter, bis sie weit genug oben ist, und folgt ihr. Dann klappt die Tür zu und die Rakete startet zurück ins All.
  const LADDER_R = 2.05, INSIDE_R = 1.15, WAIT_R = 2.95; // Abstand von der Raketenachse: Fuß der Leiter, drinnen, Warteplatz
  function startBoarding() {
    boarding = { phase: "walk", t: 0, y: ast.pos.y, foot: world.height(HATCH.x * LADDER_R, HATCH.z * LADDER_R) };
    const n = guide && guide.n;
    if (n) { // alte Sprechblase weg, Nora steigt zuerst ein
      n.talk = 0;
      if (n.obj.visible && cfg.guide && cfg.guide.board && (guide.autoBoard || !(guide.said && guide.said.rakete))) guideSay(cfg.guide.board, null, "now"); // nach dem Funkgespräch immer; sonst nur, wenn sie an der Rakete nicht schon „Steig ein“ gesagt hat
      if (n.obj.visible) boarding.nora = n.outR != null ? { phase: "enter", r: n.outR } // kam gerade erst heraus: gleich wieder hinein
        : { phase: n.climbY != null ? "climb" : "walk" };
      if (n.outR == null) n.standY = null;
      n.outR = null;
    }
    ast.speed = ast.vy = 0; ast.onGround = true; ast.jumping = ast.hopping = false;
    radioTimer = 0; $("radio").classList.add("hidden");
    world.stations.rakete.marker.visible = false;
  }
  function updateBoardingNora(dt) {
    const bn = boarding.nora, n = guide && guide.n;
    if (!bn || !n) return;
    const p = n.obj.position, top = world.hatchY + HATCH.y, inward = Math.atan2(-HATCH.x, -HATCH.z);
    n.moving = false;
    if (bn.phase === "walk") {
      // nicht durch Rumpf und Flossen: erst außen herum, dann gerade auf die Leiter zu
      const ang = Math.atan2(p.z, p.x), rad = Math.hypot(p.x, p.z);
      let dA = Math.atan2(HATCH.z, HATCH.x) - ang; dA = Math.atan2(Math.sin(dA), Math.cos(dA));
      const around = Math.abs(dA) > 0.2;
      let tx = HATCH.x * LADDER_R, tz = HATCH.z * LADDER_R;
      if (around) { const a = ang + Math.sign(dA) * Math.min(Math.abs(dA), 0.5), r = Math.min(Math.max(rad, 3.5), 4.2); tx = Math.cos(a) * r; tz = Math.sin(a) * r; } // Flossenspitzen reichen 2,8 m weit
      const ex = tx - p.x, ez = tz - p.z, ed = Math.hypot(ex, ez), st = (rad > 5 ? 3 : 2.2) * dt; // von weiter weg läuft sie
      if (!around && ed <= st) { p.x = tx; p.z = tz; bn.phase = "climb"; n.climbY = world.height(tx, tz); }
      else if (ed > 1e-4) {
        p.x += (ex / ed) * Math.min(st, ed); p.z += (ez / ed) * Math.min(st, ed);
        n.heading = angleLerp(n.heading, Math.atan2(ex, ez), 1 - Math.exp(-dt * 8)); n.moving = true; n.speedNow = st / dt;
      }
    } else if (bn.phase === "climb") {
      p.x = HATCH.x * LADDER_R; p.z = HATCH.z * LADDER_R;
      n.heading = angleLerp(n.heading, inward, 1 - Math.exp(-dt * 10));
      n.climbY = Math.min(top, n.climbY + 1.6 * dt);
      if (n.climbY >= top) { n.climbY = null; n.standY = top; bn.phase = "enter"; bn.r = LADDER_R; }
    } else if (bn.phase === "enter") { // oben durch die Luke hinein (der Rahmen verdeckt sie dabei)
      bn.r -= 1.1 * dt; p.x = HATCH.x * bn.r; p.z = HATCH.z * bn.r; n.heading = inward; n.moving = true; n.speedNow = 1.1;
      if (bn.r <= INSIDE_R) { n.obj.visible = false; n.standY = null; bn.phase = "in"; }
    }
  }
  function updateBoarding(dt) {
    const b = boarding, R = LADDER_R; b.t += dt;
    updateBoardingNora(dt);
    const bn = b.nora, n = guide && guide.n;
    // erst auf die Leiter, wenn Nora schon gut zwei Meter höher ist (sonst stehen beide auf derselben Sprosse)
    const free = !bn || bn.phase === "enter" || bn.phase === "in" || (bn.phase === "climb" && n.climbY - b.foot > 2.1);
    if (b.phase === "walk") {
      const goal = free ? R : WAIT_R;
      const dx = HATCH.x * goal - ast.pos.x, dz = HATCH.z * goal - ast.pos.z, d = Math.hypot(dx, dz), step = 1.3 * dt;
      b.waiting = d <= step && !free;
      if (d <= step) { ast.pos.x = HATCH.x * goal; ast.pos.z = HATCH.z * goal; if (free) { b.phase = "climb"; b.t = 0; } }
      else {
        ast.pos.x += (dx / d) * step; ast.pos.z += (dz / d) * step;
        ast.heading = angleLerp(ast.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 8));
      }
      if (b.waiting) ast.heading = angleLerp(ast.heading, Math.atan2(-HATCH.x, -HATCH.z), 1 - Math.exp(-dt * 6));
      b.y = world.height(ast.pos.x, ast.pos.z);
    } else {
      ast.heading = angleLerp(ast.heading, Math.atan2(-HATCH.x, -HATCH.z), 1 - Math.exp(-dt * 8)); // Blick zur Rakete
      if (b.phase === "climb") {
        const top = world.hatchY + HATCH.y; // Luke über dem Landeplatz (der kann höher liegen, z. B. Mars-Hochebene)
        b.y = Math.min(top, b.y + 1.15 * dt);
        if (b.y >= top) { b.phase = "enter"; b.t = 0; }
      } else if (b.phase === "enter") { // durch die Luke hinein – der Rahmen verdeckt das Kind Stück für Stück
        const k = Math.min(1, b.t / 0.85), r = R - (R - INSIDE_R) * k;
        ast.pos.x = HATCH.x * r; ast.pos.z = HATCH.z * r;
        if (k >= 1) { world.astronaut.visible = false; b.phase = "closing"; b.t = 0; }
      } else if (b.phase === "closing") { // Tür klappt zu
        const k = Math.min(1, b.t / 0.7);
        world.hatch.userData.setDoor(1 - k * k * (3 - 2 * k));
        if (k >= 1) { Sound.land(); b.phase = "closed"; b.t = 0; }
      } else if (b.phase === "closed") {
        if (b.t > 0.6) { b.phase = "launch"; b.t = 0; world.rocket.userData.flame.visible = true; Sound.engine(1); }
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
      if (sc.info || (home && !st.marker.visible) || (chal && CHAL_STATION[chal.kind] === key)) { el.style.display = "none"; continue; }
      // Namensschilder nur in der Nähe (die Rakete immer) – aus der Ferne helfen Hologramm und Kompass
      if (!home && Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z) > (secret ? 25 : sc.extra ? 16 : 32)) { el.style.display = "none"; continue; }
      const text = secret ? "✨ Fundstück" : `${home ? "🚀" : sc.extra ? "ℹ️" : done ? "✓" : "🔍"} ${sc.label}`; // ℹ️ = Extra zum Anschauen, keine Mission
      if (el.textContent !== text) el.textContent = text;
      el.classList.toggle("done", done);
      el.classList.toggle("extra", !!sc.extra);
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
      const st = SUITS[bodyId] || SUITS.mond, obj = makeModelAstronaut(npcModels[i], c.color, i % 2 && st.lower2 ? { ...st, lower: st.lower2 } : st); // Anzug passend zum Ort, zweite Person mit anderen Hosen
      const [x, z] = c.path[0];
      obj.position.set(x, B.height(x, z), z);
      B.scene.add(obj);
      const act = NPC_ACTS[c.name] || null, prop = act ? makeActProp(obj, obj.userData.rig, act) : null;
      if (prop) prop.visible = false;
      return { c, obj, rig: obj.userData.rig, i: 0, wait: 1 + i * 2, heading: 0, phase: 0, col: [x, z, 0.7], talk: 0, cool: 0, waveT: 0, said: 0, el: null, act, prop };
    }).filter(Boolean);
    if (noraModel) { // Nora, die Co-Pilotin: steht zuerst an der Leiter der Rakete
      const obj = makeModelAstronaut(noraModel, D.nora.color, SUITS.nora), x = HATCH.x * 2.6, z = HATCH.z * 2.6;
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
  // ---------- Gespräche der Crew: zwei Figuren unterhalten sich – das Kind hört zu (freiwillig, zählt nicht zur Mission) ----------
  // Beginnt, wenn das Kind näher als 7,5 m kommt und gerade niemand spricht; die Sätze laufen ohne Lücke hintereinander (Warteschlange),
  // so kann niemand dazwischenreden. Geht das Kind weit weg, hören sie nach dem laufenden Satz auf (dann beim nächsten Mal von vorn).
  let talk = null, talkCd = 0, talkHeard = {}, talkNear = 0, talkEnd = 0;
  function updateTalks(dt, busy) {
    const T = cfg.talks; if (!T || !T.length || !world.npcs) return;
    const crew = world.npcs.filter((n) => n.c.crew); if (crew.length < 2) return;
    const mx = (crew[0].obj.position.x + crew[1].obj.position.x) / 2, mz = (crew[0].obj.position.z + crew[1].obj.position.z) / 2;
    const dist = Math.hypot(ast.pos.x - mx, ast.pos.z - mz), by = (who) => crew.find((n) => n.c.short === who) || crew[0];
    if (talk) {
      talkEnd = performance.now();
      const cur = Voice.currentId(), i = talk.ids.indexOf(cur);
      if (i >= 0 && i !== talk.shown) { // nächster Satz: Sprechblase über dem, der redet
        talk.shown = i; const [who, text] = talk.lines[i], n = by(who);
        for (const m of crew) if (m !== n) m.talk = 0;
        n.el.innerHTML = `<b>${n.c.name}:</b> ${fmtVars(text)}`; n.voice = cur; n.talk = 9; n.cool = 30;
      }
      if (dist > 12 && !talk.leaving) { talk.leaving = true; talk.ids.forEach((id) => { if (id !== cur) Voice.stop(id); }); }
      if (!talk.ids.some((id) => Voice.speaking(id))) { // vorbei (oder abgebrochen)
        if (talk.shown === talk.lines.length - 1) talkHeard[talk.idx] = true;
        for (const m of crew) m.talk = 0;
        talk = null; talkCd = 18;
      }
      return;
    }
    talkCd -= dt;
    talkNear = dist < 7.5 && ast.speed < 1.2 ? talkNear + dt : 0; // nur, wenn das Kind stehen bleibt oder langsam geht – nicht beim Vorbeirennen
    if (talkCd > 0 || talkNear < 1 || busy) return;
    const idx = T.findIndex((_, k) => !talkHeard[k]); if (idx < 0) return;
    if (Voice.busy() || (guide && (guide.pending || (guide.on && !guide.met))) || UI.modalOpen() || view.special || experiment || boarding || performance.now() - quizScene < 20000) return;
    const lines = T[idx];
    const ids = lines.map(([who, text], k) => { const n = by(who); return Voice.say(fmtVars(text), n.c.f ? "npcF" : "npcM", { who: n.c.name, queue: k > 0 }); });
    if (!ids[0]) return; // Vorlesen aus
    talk = { idx, ids, lines, shown: -1 };
  }
  // Was die Gesprächs-Figuren gerade tun: wer laut redet, gestikuliert, der andere hört zu. Läuft kein hörbares Gespräch,
  // unterhalten sie sich trotzdem (abwechselnd, je ein paar Sekunden) – so sieht man schon von Weitem, dass dort geredet wird.
  // Steht das Kind ganz nah, hören beide ihm zu.
  function crewAct(n, elapsed, dist) {
    if (talk) return n.voice && Voice.currentId() === n.voice ? "reden" : "zuhoeren";
    if (dist < 3.2) return "zuhoeren";
    const i = world.npcs.filter((m) => m.c.crew).indexOf(n), turn = Math.floor((elapsed + 40) / 5.5);
    return (turn + (turn >> 2)) % 2 === i % 2 ? "reden" : "zuhoeren"; // mal redet der eine länger, mal der andere
  }
  function updateNpcs(dt, elapsed, busy) {
    updateTalks(dt, busy);
    const c = world.camera, w = innerWidth, h = innerHeight;
    for (const n of world.npcs) {
      const p = n.obj.position, dx = ast.pos.x - p.x, dz = ast.pos.z - p.z, dist = Math.hypot(dx, dz);
      let moving = false;
      const modal = UI.modalOpen();
      if (!modal || !n.isNora) n.talk -= dt;
      if (n.voice && n.talk < 0.5 && Voice.speaking(n.voice)) n.talk = 0.5; // Blase bleibt, solange gesprochen wird
      if (n.el) n.el.classList.toggle("talking", !!(n.voice && Voice.speaking(n.voice)));
      n.cool -= dt; n.waveT -= dt;
      if (n.guide || (n.isNora && boarding)) moving = !!n.moving;
      else if (n.isNora) { if (dist < 6) n.heading = angleLerp(n.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 5)); }
      else if (n.c.crew) { // Gesprächs-Figur: dreht sich zum Partner; spricht gerade niemand und das Kind steht ganz nah, schaut sie kurz zum Kind
        const o = world.npcs.find((m) => m.c.crew && m !== n), op = o ? o.obj.position : ast.pos;
        const toKid = !talk && dist < 3.2, tx = toKid ? ast.pos.x : op.x, tz = toKid ? ast.pos.z : op.z;
        n.heading = angleLerp(n.heading, Math.atan2(tx - p.x, tz - p.z), 1 - Math.exp(-dt * 4));
      }
      else if (!n.c.crew && dist < 5.5 && !busy && performance.now() - quizScene > 20000 && !Voice.busy() && !(guide && guide.pending)) { // stehen bleiben, zum Kind drehen und etwas sagen (wenn gerade niemand spricht)
        n.heading = angleLerp(n.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 5));
        if (n.cool <= 0 && !UI.modalOpen()) npcSay(n);
      } else if (n.wait > 0) n.wait -= dt;
      else {
        const [tx, tz] = n.c.path[(n.i + 1) % n.c.path.length], ex = tx - p.x, ez = tz - p.z, d = Math.hypot(ex, ez);
        if (d < 0.3) { n.i = (n.i + 1) % n.c.path.length; n.wait = n.act ? 7 + Math.random() * 6 : 3 + Math.random() * 5; }
        else {
          moving = true;
          const step = Math.min(d, 1.1 * dt);
          p.x += (ex / d) * step; p.z += (ez / d) * step;
          n.heading = angleLerp(n.heading, Math.atan2(ex, ez), 1 - Math.exp(-dt * 6));
        }
      }
      const climbing = n.climbY != null;
      p.y = climbing ? n.climbY : n.standY != null ? n.standY : world.height(p.x, p.z);
      n.obj.rotation.y = n.heading;
      const acting = !!n.act && !moving && !climbing && !n.isNora && n.wait > 0.4 && dist > 5.5; // bleibt stehen und tut etwas
      if (n.prop) {
        n.prop.visible = acting;
        const dr = n.prop.userData.drops;
        if (dr) dr.children.forEach((d, i) => { const k = (elapsed * 1.6 + i / 8) % 1; d.position.set(Math.sin(i * 2.3) * 0.02, -k * 0.9, k * 0.08); d.visible = acting; });
      }
      if (acting && n.act === "sport") p.y -= 0.32 * (0.5 - 0.5 * Math.cos((elapsed + n.c.path.length) * 3.4)); // Kniebeugen: der Körper geht mit runter
      const fast = moving && (n.speedNow || 0) > (n.fast ? 1.4 : 1.8); n.fast = fast; // Nora, wenn sie vorausläuft (mit Spielraum – sonst springt sie zwischen Gehen und Laufen hin und her)
      const slow = moving && !fast && n.isNora, wk = slow ? Math.min(1, n.speedNow / 1.6) : 0.7; // Nora geht langsamer (wartet aufs Kind): Schritte passend zum Tempo
      n.phase += dt * (fast ? 1.4 + n.speedNow * 2.3 : slow ? Math.PI * (1.4 + 0.4 * wk) : moving ? 5.3 : climbing ? 6 : 1.5); // Bewohner gehen gemütlich (1,1 m/s)
      poseRig(n.rig, { mode: climbing ? "climb" : fast ? "run" : moving ? "walk" : "stand", speed: fast ? Math.min(1, n.speedNow / 3.8) : moving ? wk : 0, phase: n.phase, t: elapsed + n.c.path.length,
        air: false, airP: 0, contact: 0, wave: (n.waveK = n.waveT > 0 ? Math.min(1, (n.waveK || 0) + dt / 0.35, n.waveT / 0.35) : 0), act: n.c.crew ? crewAct(n, elapsed, dist) : acting ? n.act : null, seed: n.c.crew ? world.npcs.indexOf(n) : 0,
        work: !n.c.crew && !acting && !moving && n.c.work && dist > 5.5 });
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
    const allDone = foundCount() >= cfg.discoveries.length; // alles entdeckt: freies Herumlaufen, Funk-Fragen freiwillig über die Liste
    guide = { n, on: !guideOff() && !allDone, key: undefined, pts: [], said: {}, waitCd: 0, met: false, sayCd: 0, helloDone: false, v: 0, hold: false, quiet: 0 };
    if (!guide.on) guide.helloDone = true;
    n.guide = guide.on; n.obj.visible = true; n.talk = 0; n.climbY = n.outR = n.standY = null;
    const lx = HATCH.x * 2.05, lz = HATCH.z * 2.05; // Fuß der Leiter
    n.obj.position.set(HATCH.x * 2.6, world.height(HATCH.x * 2.6, HATCH.z * 2.6), HATCH.z * 2.6);
    n.heading = Math.atan2(world.L.spawn[0] - n.obj.position.x, world.L.spawn[1] - n.obj.position.z);
    if (guide.on) { // Sie klettert hinter dem Kind die Leiter herunter
      const [sx, sz] = world.L.spawn, mx = lx, mz = lz;
      const top = world.hatchY + HATCH.y; // sie kommt aus der Luke und klettert hinter dem Kind herunter
      n.obj.position.set(HATCH.x * INSIDE_R, top, HATCH.z * INSIDE_R); n.standY = top; n.outR = INSIDE_R; n.heading = Math.atan2(HATCH.x, HATCH.z);
      // Das Kind schaut zur Rakete, damit es sie herunterklettern sieht
      ast.heading = view.yaw = Math.atan2(mx - sx, mz - sz);
      const cp = world.camera.position.set(sx - Math.sin(view.yaw) * 7, ast.pos.y + 3.2, sz - Math.cos(view.yaw) * 7), cr = Math.hypot(cp.x, cp.z);
      if (cr < 2.6) { cp.x *= 2.6 / (cr || 0.01); cp.z *= 2.6 / (cr || 0.01); }
      view.look.set(sx + Math.sin(view.yaw) * 3, ast.pos.y + 1.3, sz + Math.cos(view.yaw) * 3);
      setTimeout(() => {
        if (!S.active || !guide || !guide.on) return;
        if (!cfg.radio.landed) { guideSay(GC.hello); guide.helloDone = true; return; }
        radio(cfg.radio.landed); // „Bodenstation an Rakete: Seid ihr gut gelandet?“ – Nora antwortet, wenn der Funkspruch zu Ende ist
        whenQuiet(() => { if (S.active && guide && guide.on) { guideSay(GC.hello); guide.helloDone = true; } }, 7000);
      }, 600);
      guidePrecalc();
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
  // Spricht Nora noch, wartet der neue Satz, bis sie fertig ist (es wartet nur der neueste) – sie bricht sich nicht selbst ab.
  // mode: "low" = nur sagen, wenn sie gerade still ist (z. B. „Hier lang!“) · "now" = sofort (Rückmeldung im Spiel, „Allein erkunden“)
  // lead = Reaktion auf den Fund + „Komm mit zum …“ (das Zweite kann entfallen, siehe guideLeadGo)
  function guideSay(text, vars, mode, lead) {
    if (!guide || !text) return;
    const parts = (Array.isArray(text) ? text : [text]).filter(Boolean).map((t) => fmtVars(t, vars));
    if (!parts.length) return;
    const n = guide.n, msg = parts.length > 1 ? parts : parts[0];
    if (lead) guide.lead = Array.isArray(msg) ? { msg, id: 0 } : null;
    // Spricht gerade jemand (oder warten schon Sätze), stellt sich der Satz hinten an – die Reihenfolge bleibt („low“ = nur, wenn gerade Ruhe ist)
    if (mode !== "now" && (Voice.busy() || (n.voice && Voice.speaking(n.voice)) || (guide.pending && guide.pending.length))) {
      if (mode !== "low") {
        const q = guide.pending || (guide.pending = []), key = String(msg);
        if (!q.some((p) => String(p.msg) === key)) q.push({ msg, at: performance.now() });
        if (q.length > 3) q.shift();
      }
      return;
    }
    guide.pending = null;
    guideShow(msg);
  }
  function guideShow(msg) { // msg = Text oder Teile (je Teil eine Aufnahme)
    const n = guide.n, shown = Array.isArray(msg) ? msg.join(" ") : msg;
    n.cool = 20;
    guideBubble(shown);
    n.talk = Math.min(12, 3 + shown.split(" ").length * 0.38); // lange Sätze bleiben etwas länger stehen
    n.el.classList.remove("pop"); void n.el.offsetWidth; n.el.classList.add("pop");
    const lead = guide.lead && guide.lead.msg === msg ? guide.lead : null;
    n.voice = Voice.say(msg, "nora", { polite: true, onPart: lead ? (k) => guideLeadGo(lead, k) : undefined }); // lässt Bewohner ausreden
    if (lead) lead.id = n.voice;
    Sound.click();
  }
  function guideBubble(shown) { const n = guide.n; n.el.textContent = ""; const b = document.createElement("b"); b.textContent = `🎧 ${n.c.name}: `; n.el.append(b, shown); }
  // Zwischen der Reaktion auf den Fund und „Komm mit zum …“: Ist sie mit dem Kind schon (fast) an der Station, entfällt das „Komm mit“
  // und sie erklärt gleich die Station (vorher erzählte sie dort noch bis zu 8 Sekunden vom Weg dorthin)
  function guideLeadGo(lead, k) {
    if (!guide || guide.lead !== lead || k !== 1) return true;
    const p = guide.n.obj.position, st = world.stations[guide.key];
    let left = 0, x = p.x, z = p.z; for (const [tx, tz] of guide.pts) { left += Math.hypot(tx - x, tz - z); x = tx; z = tz; }
    const near = Math.hypot(ast.pos.x - p.x, ast.pos.z - p.z) < 7 || (!!st && Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z) < st.zone + 3);
    if (left > 3 || !near) return true;
    guide.lead = null; guideBubble(lead.msg[0]);
    return false;
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
    guideSay(cfg.guide.alone, null, "now"); updateGuideBtn(); Sound.click();
  }
  function guideResume() {
    if (!guide) return;
    guide.on = true; guide.n.guide = true; guide.key = undefined; guide.met = true; setGuideOff(false);
    updateGuideBtn();
  }
  // Wohin die Person als Nächstes führt: erste offene Entdeckung der Reihenfolge, dann die Funk-Fragen an der Wand, zum Schluss die Rakete
  function guideNextKey() {
    if (guide && guide.finale === "walk") return "wand";
    const f = foundMap();
    for (const k of cfg.guide.order) if (!f[k]) return k;
    return "rakete";
  }
  // Wo sie neben der Station stehen bleibt (Ende des Weges oder 2,5 m seitlich vor der Markierung)
  function guideStand(key, p = guide.n.obj.position) {
    const r = world.L.route && world.L.route[key];
    if (r) return r[r.length - 1];
    const st = world.stations[key]; if (!st) return null;
    const dx = st.x - p.x, dz = st.z - p.z, d = Math.hypot(dx, dz) || 1;
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
      let ok = Math.hypot(x, z) < 147 && !(world.wet && (world.wet(x, z) || world.wet(x + 0.5, z) || world.wet(x - 0.5, z) || world.wet(x, z + 0.5) || world.wet(x, z - 0.5)));
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
    // nur Hindernisse in der Nähe der Linie prüfen (auf der Erde gibt es fast 500 – das kostete auf dem Handy spürbar Zeit)
    const lx0 = Math.min(ax, bx), lx1 = Math.max(ax, bx), lz0 = Math.min(az, bz), lz1 = Math.max(az, bz);
    const cols = N.cols.filter(([cx, cz, r]) => cx + r + 0.5 > lx0 && cx - r - 0.5 < lx1 && cz + r + 0.5 > lz0 && cz - r - 0.5 < lz1);
    let px = ax, pz = az, ph = world.height(ax, az);
    for (let i = 1; i <= n; i++) {
      const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n, hh = world.height(x, z);
      if (hh - ph > (len / n) * MAX_SLOPE * 0.92) return false;
      if (world.wet && world.wet(x, z)) return false; // nicht durchs Wasser
      for (const [cx, cz, r] of cols) { const dx = x - cx, dz = z - cz, rr = r + 0.5; if (dx * dx + dz * dz < rr * rr) return false; }
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
    // glätten: so weit wie möglich geradeaus gehen – den weitesten frei erreichbaren Punkt mit Verdoppeln und Halbieren suchen
    // (vorher wurden alle Punkte von hinten durchprobiert: bei langen Wegen viele lange Linien – auf dem Handy ein spürbarer Hänger beim Losgehen)
    const out = []; let cx = ax, cz = az, i = 0;
    const ok = (j) => navLine(cx, cz, cells[j][0], cells[j][1]);
    while (i < cells.length) {
      let good = i, step = 1, bad = cells.length;
      while (good + step < cells.length && ok(good + step)) { good += step; step *= 2; }
      if (good + step < cells.length) bad = good + step;
      while (bad - good > 1) { const m = (good + bad) >> 1; if (ok(m)) good = m; else bad = m; }
      out.push(cells[good]); cx = cells[good][0]; cz = cells[good][1]; i = good + 1;
    }
    return out;
  }
  // Punkt, der L Meter weiter vorn auf dem restlichen Weg liegt (dorthin schaut sie beim Gehen)
  function pathAhead(p, pts, L) {
    let x = p.x, z = p.z;
    for (const [tx, tz] of pts) {
      const d = Math.hypot(tx - x, tz - z);
      if (d >= L) return [x + ((tx - x) / d) * L, z + ((tz - z) / d) * L];
      L -= d; x = tx; z = tz;
    }
    return [x, z];
  }
  // p = von wo aus (sonst da, wo sie gerade steht)
  function guideRoute(key, p = guide.n.obj.position) {
    const r = world.L.route && world.L.route[key];
    let way;
    if (!r) { const st = guideStand(key, p); way = st ? [st] : []; }
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
  // Die Wege der Führung gleich bei der Landung berechnen (hinter der Überblendung): Auf dem Handy dauerte das beim Losgehen
  // bis zu einigen Zehntelsekunden – das Bild stand kurz still. Unterwegs wird nur noch gerechnet, wenn sie woanders steht als gedacht.
  function guidePrecalc() {
    const GC = cfg.guide; guide.routes = {};
    let from = { x: world.L.spawn[0], z: world.L.spawn[1] };
    for (const k of [...GC.order, ...(GC.finale ? ["wand"] : []), "rakete"]) {
      const pts = guideRoute(k, from); guide.routes[k] = { from, pts };
      const e = pts[pts.length - 1]; if (e) from = { x: e[0], z: e[1] };
    }
  }
  function guideRouteFor(key) {
    const c = guide.routes && guide.routes[key], p = guide.n.obj.position;
    if (c && c.pts.length && Math.hypot(c.from.x - p.x, c.from.z - p.z) < 4 && navLine(p.x, p.z, c.pts[0][0], c.pts[0][1])) return c.pts.map((q) => [...q]);
    return guideRoute(key);
  }
  function updateGuide(dt, busy) {
    if (!guide) return;
    const n = guide.n, GC = cfg.guide, p = n.obj.position, talking = !!(n.voice && Voice.speaking(n.voice));
    if (!talking) guide.waitCd -= dt; // Pausen zählen erst, wenn sie ausgeredet hat
    guide.quiet = talking || (!Voice.enabled && n.talk > 0) ? 0 : guide.quiet + dt; // so lange ist sie schon still (ohne Vorlesen: Sprechblase weg)
    if (guide.pending && guide.pending.length && !Voice.busy() && !view.special && !experiment && !UI.modalOpen()) { // wartende Sätze der Reihe nach, wenn niemand mehr spricht (zu alte entfallen)
      const pm = guide.pending.shift(); if (!guide.pending.length) guide.pending = null;
      if (performance.now() - Math.max(pm.at, talkEnd) < 20000) guideShow(pm.msg); // zu alte Sätze entfallen – die Zeit, in der die Crew redet, zählt nicht mit
    }
    if (boarding) return; // steigt gerade ein (updateBoardingNora)
    if (n.outR != null) { // erst aus der Luke heraus auf die Plattform …
      n.outR = Math.min(LADDER_R, n.outR + 1.1 * dt); p.x = HATCH.x * n.outR; p.z = HATCH.z * n.outR;
      n.moving = true; n.speedNow = 1.1;
      if (n.outR >= LADDER_R) { n.outR = null; n.standY = null; n.climbY = world.hatchY + HATCH.y; n.moving = false; }
      return;
    }
    if (n.climbY != null) { // … dann die Leiter herunter (Gesicht zur Leiter)
      n.heading = angleLerp(n.heading, Math.atan2(-HATCH.x, -HATCH.z), 1 - Math.exp(-dt * 10));
      n.climbY -= 1.5 * dt;
      const g = world.height(p.x, p.z);
      if (n.climbY <= g) { n.climbY = null; p.y = g; }
      return;
    }
    // Im Gespräch: freie Person, die man ansprechen kann
    if (guide.finale === "walk" && !guide.on) { guide.finale = "done"; quizSoon(); } // Führung verlassen: Fragen gleich per Funk
    if (!guide.on) return;
    n.moving = false;
    if (busy || view.special || experiment || boarding || UI.modalOpen()) return;
    if (!quizDone && foundCount() >= cfg.discoveries.length && guide.finale !== "walk") { n.heading = angleLerp(n.heading, Math.atan2(ast.pos.x - p.x, ast.pos.z - p.z), 1 - Math.exp(-dt * 5)); return; } // wartet mit dem Kind auf die Bodenstation
    const dAst = Math.hypot(ast.pos.x - p.x, ast.pos.z - p.z);
    const key = guideNextKey();
    if (guide.met && key !== guide.key) { // neues Ziel: Bescheid sagen und losgehen
      const first = guide.key === undefined;
      guide.key = key; guide.pts = guideRouteFor(key); guide.said[key] = false; guide.lead = null;
      if (key === "rakete") { if (quizDone) guideSay(GC.home); }
      else if (key !== "sprung" && key !== "wand" && !first) {
        const r = guide.justFound && GC.react && GC.react[guide.justFound]; guide.justFound = null;
        guideSay([r, typeof GC.next === "object" ? GC.next[key] : GC.next], { ziel: cfg.stations[key].label }, undefined, !!r);
      }
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
      if (!guide.helloDone) return; // erst der Bodenstation antworten („Alles bestens!“), dann das Kind begrüßen
      guide.met = true; guide.pts = []; n.waveT = 2.4; guideSay(GC.welcome); guide.waitCd = 6;
      return;
    }
    if (guide.pts.length) {
      // Abstand halten: Fällt das Kind zurück, geht sie langsamer; ist es zu weit weg, bleibt sie stehen und wartet, bis es aufgeholt hat.
      // Weich beschleunigen und bremsen, mit Spielraum zwischen Stehenbleiben (12 m) und Weitergehen (8,5 m) –
      // vorher stand und ging sie an einer einzigen Grenze ständig im Wechsel (sie „zitterte“, vor allem bergauf, wenn das Kind langsamer ist).
      const [gx, gz] = guide.pts[guide.pts.length - 1]; // Ist das Kind schon vorausgelaufen (näher am Ziel als sie), holt sie auf statt zu warten
      const ahead = Math.hypot(ast.pos.x - gx, ast.pos.z - gz) < Math.hypot(p.x - gx, p.z - gz) - 2;
      if (!guide.hold && dAst > 12 && !ahead) guide.hold = true;
      else if (guide.hold && (dAst < 8.5 || ahead)) guide.hold = false;
      const want = guide.hold ? 0 : GUIDE_SPEED * (ahead ? 1.15 : Math.min(1.15, Math.max(0.35, (11.5 - dAst) / 6)));
      guide.v += (want - guide.v) * Math.min(1, dt * 3);
      if (guide.hold && guide.v < 0.25) { // steht: umdrehen, winken
        guide.v = 0;
        face(ast.pos.x, ast.pos.z);
        const listening = world.npcs.some((m) => !m.isNora && m.talk > 0 && Math.hypot(m.obj.position.x - ast.pos.x, m.obj.position.z - ast.pos.z) < 9);
        if (listening) guide.waitCd = Math.max(guide.waitCd, 3); // erst ausreden lassen
        else if (guide.waitCd <= 0) { guide.waitCd = 12; n.waveT = 2.4; guideSay(GC.wait, null, "low"); }
        return;
      }
      // ohne Halt von Wegpunkt zu Wegpunkt (sonst stockt die Laufbewegung an jedem Punkt für einen Moment)
      let left = guide.v * dt;
      while (left > 1e-4 && guide.pts.length) {
        const [tx, tz] = guide.pts[0], ex = tx - p.x, ez = tz - p.z, d = Math.hypot(ex, ez);
        if (d < 0.05) { guide.pts.shift(); continue; }
        const step = Math.min(d, left);
        p.x += (ex / d) * step; p.z += (ez / d) * step; left -= step;
      }
      n.speedNow = guide.v; n.moving = true;
      const [lx, lz] = pathAhead(p, guide.pts, 1.6); // Blick auf einen Punkt etwas voraus: dreht sich in Kurven weich, statt an jedem Wegpunkt zu zucken
      if (Math.hypot(lx - p.x, lz - p.z) > 0.3) face(lx, lz);
      return;
    }
    // angekommen
    guide.v = 0; guide.hold = false;
    face(ast.pos.x, ast.pos.z);
    if (guide.finale === "walk" && guide.key === "wand") { if (dAst < 7) { guide.finale = "done"; quizSoon(); } return; } // Basis-Besuch zu Ende: jetzt die Funk-Fragen
    // Erklären, sobald das Kind da ist (bei ihr oder schon am Kreis) und sie gerade nicht spricht – die Pause nach „Hier lang!“ zählt nicht mit
    const st = world.stations[guide.key], atStation = !!st && Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z) < st.zone + 3;
    if ((dAst < 7 || atStation) && guide.lead && !guide.lead.id && guide.pending) { // Reaktion + „Komm mit“ warten noch (jemand anderes spricht) – schon da: nur die Reaktion
      const L = guide.lead; guide.lead = null;
      guide.pending.forEach((q) => { if (q.msg === L.msg) q.msg = L.msg[0]; });
    }
    if ((dAst < 7 || atStation) && !guide.said[guide.key] && guide.quiet > 0.5) {
      guide.said[guide.key] = true; guide.waitCd = Math.max(guide.waitCd, 4);
      if (!foundMap()[guide.key]) guideSay(guide.key === "sprung" ? GC.jump : (GC.arrive && GC.arrive[guide.key]) || ""); // schon entdeckt (Kind war schneller): nichts erklären
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
    curling: [38.5, 41], // Startkreis der Curling-Bahn im Eis-Krater (Bahn nach Osten, siehe MARS_CURL_DIR)
    station: [0, 56], abend: [-28, 6], pad: [-34, 74], // Landeplatz des Raumtransporters
    meet: [-24, 12], // hier kommt Mia zu Beginn her
    // Weg der Führung (Wegpunkte bis zum Standplatz neben der Station)
    route: {
      wegweiser: [[5, 2.5]], vulkan: [[14, 3], [20.5, 2.6]], monde: [[8, 8], [-4, 8.6]], abend: [[-16, 5], [-23, 3.5]],
      rover: [[-33, 9], [-37, 16], [-37, 34], [-31, 40], [-25.5, 41]], teufel: [[-36, 40]], waage: [[-30, 52], [-25.5, 60.5]],
      rost: [[-12, 50], [2, 59], [6.5, 63.2]], curling: [[-12, 49], [3.5, 49.5], [14, 48], [25, 47], [29, 42.5], [35.6, 42.8]], eis: [[16, 56], [25, 47], [26.2, 43.2]], wand: [[14, 48], [3.5, 49.5]],
      rakete: [[-12, 49], [-31, 40], [-37, 34], [-37, 16], [-30, 8], [-5, 4.5]]
    }
  };
  const MARS_CURL_DIR = (() => { const l = Math.hypot(1, 0.12); return [1 / l, -0.12 / l]; })();
  // Eis-Krater: flacher Eisboden (Ellipse längs der Bahn, 17 × 8 m Halbachsen), Mitte 12 m hinter dem Startkreis
  const MARS_ICE = (() => { const [sx, sz] = MARS_LAYOUT.curling, [dx, dz] = MARS_CURL_DIR; return { cx: sx + dx * 12, cz: sz + dz * 12, a: 17, b: 8, dx, dz }; })();
  const onMarsIce = (x, z) => { const I = MARS_ICE, ox = x - I.cx, oz = z - I.cz, u = ox * I.dx + oz * I.dz, v = ox * I.dz - oz * I.dx; return (u / I.a) ** 2 + (v / I.b) ** 2 < 1; };
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
  // Eisbohrer: Kufenrahmen mit Warnstreifen, Mast mit Zahnstange, Bohrkopf mit Motor (fährt mit dem Gestänge nach unten),
  // Schneckenbohrer mit Hartmetallspitze, Bohrklein um das Loch, Bedienpult mit Not-Aus, Ablage mit Ersatzstangen
  function makeDrill() {
    const g = new THREE.Group(), M = colonyMats();
    const warn = M.std({ map: canvasTex(256, 32, (c) => { c.fillStyle = "#facc15"; c.fillRect(0, 0, 256, 32); c.fillStyle = "#111827"; for (let x = -32; x < 256; x += 32) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 16, 0); c.lineTo(x + 32, 0); c.lineTo(x + 16, 32); c.fill(); } }), roughness: 0.5 });
    const rodMat = M.std({ color: srgb(0x8b929c), metalness: 0.9, roughness: 0.28 }), dark = M.metal;
    for (const s of [-1, 1]) {
      put(g, new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.12), warn), 0, 0.12, s * 0.75);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.62), dark), s * 0.79, 0.12, 0);
      for (const t of [-1, 1]) { put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 14), dark), s * 0.79, 0.03, t * 0.75); put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), M.steel), s * 0.79, 0.12, t * 0.75); }
    }
    // Mast: zwei Schienen, eine mit Zahnstange, oben der Kopfbalken mit Seilrolle; Streben nach hinten
    for (const x of [-0.2, 0.2]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.95, 0.07), M.steel), x, 1.6, 0.34);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.7, 0.03), dark), 0.2, 1.55, 0.29);
    for (let y = 0.3; y < 2.9; y += 0.06) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.02), dark), 0.2, y, 0.27, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.22), M.orange), 0, 3.1, 0.34);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 18), dark), 0, 3.25, 0.34).rotation.x = Math.PI / 2;
    for (const x of [-0.2, 0.2]) pipeSeg(g, M, new V(x * 3.6, 0.16, 0.75), new V(x, 1.9, 0.36), 0.025, M.steel);
    for (const x of [-0.79, 0.79]) pipeSeg(g, M, new V(x, 0.16, 0.6), new V(Math.sign(x) * 0.2, 1.3, 0.34), 0.022, M.steel);
    // Gestänge (dreht sich und fährt nach unten): Kernrohr, Wendel, Spitze
    const rod = new THREE.Group(); rod.position.y = 1.05; g.add(rod);
    put(rod, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 14), rodMat), 0, 0, 0);
    const helix = []; for (let i = 0; i <= 160; i++) { const t = i / 160, a = t * Math.PI * 2 * 10; helix.push(new V(Math.cos(a) * 0.062, -0.92 + t * 1.5, Math.sin(a) * 0.062)); }
    put(rod, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 480, 0.017, 6), rodMat), 0, 0, 0);
    put(rod, new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 14), M.std({ color: srgb(0xd4d4d8), metalness: 0.95, roughness: 0.2 })), 0, -1.07, 0).rotation.x = Math.PI;
    // Bohrkopf: Getriebe, Motor mit Kühlrippen, Schlitten an den Schienen, Spannfutter, Schlauch
    const head = new THREE.Group(); head.position.y = rod.position.y + 1.2; g.add(head);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.32), dark), 0, 0, 0.04);
    put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 16), M.steel), 0, -0.16, 0);
    put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.42, 24), M.orange), 0, 0.32, 0);
    for (let k = 0; k < 6; k++) put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.018, 24), dark), 0, 0.16 + k * 0.064, 0, false);
    put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.07, 24), dark), 0, 0.565, 0);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.3, 0.05), M.steel), 0, 0.02, 0.25);
    for (const x of [-0.2, 0.2]) put(head, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.13), dark), x, 0.02, 0.34);
    const hose = []; for (let i = 0; i <= 12; i++) { const t = i / 12; hose.push(new V(0.12 + t * 0.4, 0.45 - t * 0.9 + Math.sin(t * Math.PI) * 0.25, 0.1 + t * 0.5)); }
    put(head, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hose), 24, 0.025, 8), M.teal), 0, 0, 0);
    // Bohrklein rund um das Loch
    const pile = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 8, 24), M.std({ color: srgb(0x8f4424), roughness: 1, envMapIntensity: 0.2 })), 0, 0.03, 0, false); pile.rotation.x = Math.PI / 2; pile.scale.z = 0.6;
    // Bedienpult mit Bildschirm, Tasten und Not-Aus (schaut zur Kamera)
    const desk = new THREE.Group(); desk.position.set(0.95, 0, -0.55); desk.rotation.y = -2.2; g.add(desk);
    put(desk, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.9, 10), M.steel), 0, 0.45, 0);
    const box = put(desk, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.16), M.hull(1, 1)), 0, 1.0, 0); box.rotation.x = -0.35;
    put(box, new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), M.glowBlue), -0.04, 0.04, 0.081, false);
    [[0x22c55e, 0.15, 0.06], [0xef4444, 0.15, -0.01], [0xfacc15, 0.15, -0.08]].forEach(([c, x, y]) => put(box, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })), x, y, 0.085, false).rotation.x = Math.PI / 2);
    put(box, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.04, 16), M.std({ color: srgb(0xdc2626), roughness: 0.4 })), 0.13, 0.17, 0.02, false);
    // Ablage mit Ersatzstangen
    const rack = new THREE.Group(); rack.position.set(-0.55, 0, 0.95); rack.rotation.y = 0.3; g.add(rack);
    for (const x of [-0.3, 0.3]) put(rack, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), M.steel), x, 0.25, 0);
    put(rack, new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.12), M.orange), 0, 0.5, 0);
    for (let k = 0; k < 3; k++) put(rack, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 12), rodMat), -0.12 + k * 0.12, 0.52, 0.02).rotation.set(0, 0, Math.PI / 2 + 0.05 * (k - 1));
    const ice = makeIceCrystals(1);
    ice.position.set(-0.45, 0.02, -0.45); ice.visible = false; g.add(ice); // auf der Kamera-Seite des Bohrers
    g.userData = { rod, ice, head };
    return mergeStatic(g, [rod, head, ice]);
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
  // Gesteinsschichten (von unten nach oben): Bänder unterschiedlicher Dicke mit welligen Grenzen, feiner Körnung
  // und dunklen Ablaufspuren („Wüstenlack“), die von den Kanten herunterziehen; waagerecht nahtlos
  function bandTexture(colors, seed) {
    const W = 512, H = 512, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const x = cv.getContext("2d"), bands = [];
    // Rauschen, das nur waagerecht nahtlos ist (senkrecht wiederholt es sich nicht)
    const vn = (X, Y, p) => { const xi = Math.floor(X), yi = Math.floor(Y), xf = X - xi, yf = Y - yi, w = (n) => ((n % p) + p) % p, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = hash2(w(xi), yi), b = hash2(w(xi + 1), yi), c = hash2(w(xi), yi + 1), d = hash2(w(xi + 1), yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
    for (let y = 0, i = 0; y < H; i++) { const h = 8 + hash2(i, seed) * 30 + (hash2(i, seed + 3) > 0.85 ? 30 : 0); bands.push([y, colors[Math.floor(hash2(i, seed + 1) * colors.length)]]); y += h; }
    const img = x.createImageData(W, H), rgb = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const yy = py + (vn(px / 64, seed + 0.5, 8) - 0.5) * 12 + (vn(px / 16, seed + 3.5, 32) - 0.5) * 3; // wellige Schichtgrenzen
      let k = 0; while (k < bands.length - 1 && bands[k + 1][0] <= yy) k++;
      const c0 = rgb(bands[k][1]), r0 = c0[0] * 0.55 + 150 * 0.45, g0 = c0[1] * 0.55 + 82 * 0.45, b0 = c0[2] * 0.55 + 58 * 0.45, n = 1 + (vn(px / 32, py / 2.5, 16) - 0.5) * 0.12 + (vn(px / 8, py / 1.5, 64) - 0.5) * 0.08 + (hash2(px, py) - 0.5) * 0.06, o = ((H - 1 - py) * W + px) * 4;
      img.data[o] = r0 * n; img.data[o + 1] = g0 * n; img.data[o + 2] = b0 * n; img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    for (let i = 0; i < 36; i++) { // Ablaufspuren
      const sx = hash2(i, seed + 7) * W, sy = hash2(i, seed + 8) * H, len = 60 + hash2(i, seed + 9) * 220, w = 10 + hash2(i, seed + 10) * 24;
      for (let dx = 0; dx < w; dx++) { // weicher Rand: Deckkraft quer zur Spur glockenförmig
        const k = Math.sin((Math.PI * (dx + 0.5)) / w), ln = len * (0.7 + 0.3 * k), gr = x.createLinearGradient(0, sy, 0, sy + ln);
        gr.addColorStop(0, "rgba(50,22,12," + (0.2 * k * k).toFixed(3) + ")"); gr.addColorStop(1, "rgba(50,22,12,0)"); x.fillStyle = gr; x.fillRect((sx + dx) % W, sy, 1, ln);
      }
    }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  }
  // Tafelberg wie in der Wüste: unregelmäßiger Grundriss, unten eine Schutthalde aus Sand und Geröll, darüber eine steile Wand,
  // deren Schichten unterschiedlich weit vorstehen (harte Schichten bilden Simse), senkrechte Erosionsrinnen, oben die Deckplatte.
  // Mitte auf halber Höhe (wie vorher der Zylinder)
  function makeButte(r, h, tex, seed) {
    const C = 96, ROWS = 44, TAL = 0.28, pos = [], uv = [], col = [], idx = [];
    const outline = [], gully = [];
    for (let j = 0; j < C; j++) {
      const u = j / C;
      outline.push(1 + (fbm2p(u * 4 + seed, seed * 0.37, 4) - 0.5) * 0.8 + (noise2p(u * 14, seed + 5, 14) - 0.5) * 0.16);
      gully.push(Math.pow(Math.max(0, noise2p(u * 34 + 3, seed + 9, 34) - 0.45) / 0.55, 1.2)); // 0 = Wand, 1 = tiefe Rinne
    }
    const layer = (t) => { const L = t * 11, i = Math.floor(L), fr = L - i, a = (hash2(i, seed) - 0.5) * 0.12, b = (hash2(i + 1, seed) - 0.5) * 0.12; return a + (b - a) * smooth(0.75, 1, fr); };
    const prof = (t, j) => {
      if (t <= TAL) { const k = 1 - t / TAL; return 1 + 0.75 * Math.pow(k, 2.6) + (hash2(j, Math.round(t * 99) + seed) - 0.5) * 0.05 * k; } // Schutthalde: oben steil, unten flach auslaufend
      const c = (t - TAL) / (0.95 - TAL);
      const bench = 0.13 * smooth(0.55, 0.6, t) * (0.6 + 0.4 * hash2(j >> 3, seed + 2)); // obere Wand tritt zurück: Stufe auf halber Höhe
      if (t <= 0.95) return 1 - 0.06 * c - bench + layer(t) - gully[j] * 0.2 * smooth(0, 0.12, c);
      return 0.94 - 0.13 * (0.6 + 0.4 * hash2(j >> 3, seed + 2)) + layer(0.95) + 0.04 * (1 - (t - 0.95) / 0.05) - gully[j] * 0.08; // Deckplatte steht etwas vor
    };
    const ts = []; for (let i = 0; i <= ROWS; i++) { const q = i / ROWS; ts.push(q < 0.35 ? (q / 0.35) * TAL : TAL + ((q - 0.35) / 0.65) * (1 - TAL)); }
    const sand = new THREE.Color(0x9c4e2e);
    ts.forEach((t, i) => {
      for (let j = 0; j <= C; j++) {
        const jj = j % C, a = (j / C) * Math.PI * 2, rr = r * prof(t, jj) * outline[jj];
        pos.push(Math.cos(a) * rr, t * h - h / 2, Math.sin(a) * rr); uv.push((j / C) * 5, t);
        const shade = t <= TAL ? 1 - 0.25 * smooth(0.5, 1, t / TAL) : 1 - gully[jj] * 0.4; col.push(shade, shade, shade);
      }
    });
    const capY = h / 2 + 0.6, ring = ts.length - 1;
    pos.push(0, capY, 0); uv.push(0.5, 1); col.push(1, 1, 1);
    const center = pos.length / 3 - 1, row = C + 1, talRows = ts.findIndex((t) => t > TAL) - 1;
    const gTal = [], gWall = [];
    for (let i = 0; i < ring; i++) for (let j = 0; j < C; j++) { const a = i * row + j, b = a + row, tri = [a, b, a + 1, a + 1, b, b + 1]; (i < talRows ? gTal : gWall).push(...tri); }
    for (let j = 0; j < C; j++) gWall.push(ring * row + j, center, ring * row + j + 1);
    idx.push(...gTal, ...gWall);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.addGroup(0, gTal.length, 0); geo.addGroup(gTal.length, gWall.length, 1); geo.computeVertexNormals();
    if (!makeButte.sand) { const t = regolithTexture(); t.repeat.set(8, 3); makeButte.sand = new THREE.MeshStandardMaterial({ map: t, color: sand, vertexColors: true, roughness: 1 }); }
    const m = new THREE.Mesh(geo, [makeButte.sand, new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.95 })]);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  // Gruppe unterschiedlich großer Felsen als Blickfang im Vordergrund
  function rockCluster(B, x, z, n, mat, seed) {
    const geo = rockCluster.geo || (rockCluster.geo = new THREE.DodecahedronGeometry(1, 0));
    if (mat.userData.natural) { // natürlich geformte Felsen: verbeulte Kugeln in mehreren Varianten
      const geos = rockCluster.natural || (rockCluster.natural = [0, 1, 2, 3, 4, 5].map((k) => sphereUV(naturalRockGeo(k, 3))));
      if (!mat.userData.surf) { mat.userData.surf = true; Object.assign(mat, rockTex(2, 1, 1.3)); mat.needsUpdate = true; }
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
  // Eisblock zum Tragen: klares Eis mit weißem, frostigem Kern
  function iceBlock() {
    const g = new THREE.Group();
    const clear = new THREE.MeshStandardMaterial({ color: srgb(0xcff0ff), emissive: srgb(0x38bdf8), emissiveIntensity: 0.5, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.72 });
    const core = new THREE.MeshStandardMaterial({ color: srgb(0xf0fbff), emissive: srgb(0x7dd3fc), emissiveIntensity: 0.5, roughness: 0.6 });
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.34), clear), 0, 0, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), core), 0, 0, 0, false);
    return g;
  }
  // Eis-Lager: Kühlkiste, aus der Eisblöcke herausschauen
  // Eis-Lager: offene Kühlkiste mit dicker gedämmter Wand, blauer Innenseite, Reif am Rand, Griffen und Temperaturanzeige; obendrauf die Eisblöcke
  function iceStore(M) {
    const g = new THREE.Group(), white = M.std({ color: srgb(0xf1f5f9), roughness: 0.45 }), blue = M.std({ color: srgb(0x0369a1), roughness: 0.5 }), frost = M.std({ color: srgb(0xe0f2fe), roughness: 0.25, emissive: srgb(0x7dd3fc), emissiveIntensity: 0.12 });
    const W = 1.36, D = 0.86, H = 0.62, T = 0.09;
    for (const x of [-0.55, 0.55]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, D - 0.1), M.metal), x, 0.04, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), white), 0, 0.12, 0);
    for (const [x, z, w, d] of [[0, (D - T) / 2, W, T], [0, -(D - T) / 2, W, T], [(W - T) / 2, 0, T, D - 2 * T], [-(W - T) / 2, 0, T, D - 2 * T]]) {
      put(g, new THREE.Mesh(new THREE.BoxGeometry(w, H, d), white), x, 0.08 + H / 2, z);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.035, d + 0.01), frost), x, 0.1 + H, z, false);
    }
    put(g, new THREE.Mesh(new THREE.BoxGeometry(W - 2 * T, 0.02, D - 2 * T), blue), 0, 0.17, 0, false);
    for (const [x, z, w, d] of [[0, D / 2 - T - 0.005, W - 2 * T, 0.01], [0, -(D / 2 - T - 0.005), W - 2 * T, 0.01], [W / 2 - T - 0.005, 0, 0.01, D - 2 * T], [-(W / 2 - T - 0.005), 0, 0.01, D - 2 * T]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(w, H - 0.06, d), blue), x, 0.12 + H / 2, z, false);
    for (const x of [-(W / 2 + 0.03), W / 2 + 0.03]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.36), M.steel), x, 0.5, 0, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.06, 0.06), blue), 0, 0.3, D / 2 + 0.005, false);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshBasicMaterial({ map: canvasTex(128, 52, (c) => { c.fillStyle = "#06121c"; c.fillRect(0, 0, 128, 52); c.fillStyle = "#7dd3fc"; c.font = "bold 30px monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("-20°C", 64, 28); }), toneMapped: false })), 0.38, 0.5, D / 2 + 0.003, false);
    [[-0.32, 0.72, 0.05, 0.2], [0.04, 0.74, -0.08, -0.15], [0.36, 0.7, 0.1, 0.4]].forEach(([x, y, z, r]) => { const b = iceBlock(); b.scale.setScalar(0.85); b.position.set(x, y, z); b.rotation.y = r; g.add(b); });
    return g;
  }
  // Kofis Kühlschrank im Felsschatten: Gehäuse aus Paneelen, eingelassene Tür mit Dichtung, Griff, Schneeflocke und Anzeige,
  // oben das Lüftungsgitter, hinten die Kühlrippen, Reif an den Kanten
  function iceFridge(M) {
    const g = new THREE.Group(), white = M.std({ map: hullTex(1, 2), roughness: 0.38 }), frost = M.std({ color: srgb(0xe0f2fe), roughness: 0.25, emissive: srgb(0x7dd3fc), emissiveIntensity: 0.12 });
    for (const [x, z] of [[-0.38, -0.28], [0.38, -0.28], [-0.38, 0.28], [0.38, 0.28]]) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 10), M.metal), x, 0.04, z, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.66, 0.72), white), 0, 0.91, -0.02);
    const door = canvasTex(192, 340, (c) => {
      const gr = c.createLinearGradient(0, 0, 192, 0); gr.addColorStop(0, "#eaf6fd"); gr.addColorStop(1, "#d4ecfa"); c.fillStyle = gr; c.fillRect(0, 0, 192, 340);
      c.strokeStyle = "#94a3b8"; c.lineWidth = 3; c.strokeRect(5, 5, 182, 330); c.beginPath(); c.moveTo(5, 118); c.lineTo(187, 118); c.stroke();
      c.font = "86px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("❄️", 90, 236);
      c.fillStyle = "#0369a1"; c.font = "bold 34px sans-serif"; c.fillText("EIS", 80, 58);
    });
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.58, 0.04), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })), 0, 0.9, 0.345, false); // Dichtung
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.56, 0.04), [M.std({ color: srgb(0xdbeefa) }), M.std({ color: srgb(0xdbeefa) }), M.std({ color: srgb(0xdbeefa) }), M.std({ color: srgb(0xdbeefa) }), new THREE.MeshStandardMaterial({ map: door, roughness: 0.35 }), M.std({ color: srgb(0xdbeefa) })]), 0, 0.9, 0.37);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.05), M.steel), 0.36, 1.05, 0.42, false);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.09), new THREE.MeshBasicMaterial({ map: canvasTex(128, 52, (c) => { c.fillStyle = "#06121c"; c.fillRect(0, 0, 128, 52); c.fillStyle = "#7dd3fc"; c.font = "bold 30px monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("-18°C", 64, 28); }), toneMapped: false })), -0.22, 1.5, 0.392, false);
    const grille = canvasTex(128, 48, (c) => { c.fillStyle = "#475569"; c.fillRect(0, 0, 128, 48); c.fillStyle = "#1e293b"; for (let x = 6; x < 124; x += 8) c.fillRect(x, 6, 4, 36); });
    const top = put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), new THREE.MeshStandardMaterial({ map: grille, roughness: 0.6 })), 0, 1.745, -0.04, false); top.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 8; i++) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.02, 0.06), M.steel), 0, 0.35 + i * 0.16, -0.42, false); // Kühlrippen hinten
    for (const [x, z] of [[-0.475, 0.34], [0.475, 0.34], [-0.475, -0.38], [0.475, -0.38]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.66, 0.03), frost), x, 0.91, z, false);
    return g;
  }
  function makeIceCrystals(k) {
    const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: srgb(0xc6ecff), emissive: srgb(0x38bdf8), emissiveIntensity: 0.25, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82, flatShading: true });
    for (const [x, z, sx, sy, r] of [[0, 0, 0.16, 0.26, 0.2], [0.17, 0.06, 0.11, 0.17, -0.5], [-0.12, 0.12, 0.09, 0.14, 0.9], [0.05, -0.15, 0.1, 0.12, 0.3], [-0.16, -0.08, 0.07, 0.1, 1.4]]) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat); c.scale.set(sx * k, sy * k, sx * k * 0.8); c.position.set(x * k, sy * k * 0.6, z * k); c.rotation.set(0.2, r, 0.15); g.add(c);
    }
    return g;
  }
  // Vulkan auf der Venus: dunkles Basaltgestein, oben ein Krater, an den Flanken glühende Lavaströme
  // Lava: helle, glühende Schmelze mit dunklen Krustenschollen (nahtlos kachelbar; v = Fließrichtung)
  function venusLavaTex() {
    const t = canvasTex(256, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0, "#d9480f"); g.addColorStop(0.5, "#ffb020"); g.addColorStop(1, "#d9480f");
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) { // helle Glutadern
        const x = hash2(i, 31) * 256, y = hash2(i, 32) * 256, r = 6 + hash2(i, 33) * 16;
        for (const oy of [-256, 0, 256]) { const gr = c.createRadialGradient(x, y + oy, 0, x, y + oy, r); gr.addColorStop(0, "rgba(255,240,150,0.9)"); gr.addColorStop(1, "rgba(255,200,60,0)"); c.fillStyle = gr; c.fillRect(x - r, y + oy - r, 2 * r, 2 * r); }
      }
      for (let i = 0; i < 26; i++) { // dunkle Krustenschollen, die auf der Lava treiben
        const x = 40 + hash2(i, 41) * 176, y = hash2(i, 42) * 256, w = 10 + hash2(i, 43) * 26, h = 8 + hash2(i, 44) * 22, rot = hash2(i, 45) * 3;
        for (const oy of [-256, 0, 256]) {
          c.save(); c.translate(x, y + oy); c.rotate(rot);
          c.fillStyle = "rgba(255,120,30,0.9)"; c.beginPath(); c.ellipse(0, 0, w / 2 + 3, h / 2 + 3, 0, 0, 7); c.fill(); // glühender Rand
          c.fillStyle = `rgba(${40 + hash2(i, 46) * 30},${18 + hash2(i, 47) * 12},10,0.95)`; c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, 7); c.fill();
          c.restore();
        }
      }
      const edge = c.createLinearGradient(0, 0, 256, 0); // zum Ufer hin erstarrt die Lava
      edge.addColorStop(0, "rgba(60,25,10,0.85)"); edge.addColorStop(0.16, "rgba(60,25,10,0)"); edge.addColorStop(0.84, "rgba(60,25,10,0)"); edge.addColorStop(1, "rgba(60,25,10,0.85)");
      c.fillStyle = edge; c.fillRect(0, 0, 256, 256);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  // Glut am Ufer: orange, zur Mitte hell, nach außen ausgeblendet (wird additiv über den Boden gelegt)
  function venusGlowTex() {
    return canvasTex(128, 8, (c) => {
      const g = c.createLinearGradient(0, 0, 128, 0);
      g.addColorStop(0, "rgba(255,90,20,0)"); g.addColorStop(0.3, "rgba(255,110,30,0.22)"); g.addColorStop(0.5, "rgba(255,150,50,0.32)"); g.addColorStop(0.7, "rgba(255,110,30,0.22)"); g.addColorStop(1, "rgba(255,90,20,0)");
      c.fillStyle = g; c.fillRect(0, 0, 128, 8);
    });
  }
  // Bogenbrücke aus Stahl (läuft entlang z): Gitterrost-Fahrbahn, zwei Stahlbögen mit Hängern, Geländer, Widerlager aus Beton, Warnlampen
  function venusBridge(M) {
    const g = new THREE.Group(), L = 8.4, W = 2.5, dark = M.std({ color: srgb(0x3a3f47), roughness: 0.6, metalness: 0.5 });
    const grate = canvasTex(64, 256, (c) => { c.fillStyle = "#596069"; c.fillRect(0, 0, 64, 256); c.fillStyle = "#3b4047"; for (let y = 0; y < 256; y += 8) c.fillRect(0, y, 64, 3); for (let x = 0; x < 64; x += 16) c.fillRect(x, 0, 2, 256); });
    grate.wrapT = THREE.RepeatWrapping; grate.repeat.set(1, 4);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(W, 0.14, L), M.std({ map: grate, roughness: 0.7, metalness: 0.4 })), 0, -0.02, 0); // Fahrbahn (oben bündig mit dem Weg)
    for (const sx of [-1, 1]) {
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, L + 0.2), dark), sx * (W / 2 + 0.08), -0.38, 0); // Längsträger (verdecken die Aufschüttung darunter)
      // Bogen: halbe Ellipse über die ganze Länge, 1,9 m hoch
      const curve = new THREE.EllipseCurve(0, 0, L / 2, 1.9, 0, Math.PI, false), pts = curve.getPoints(40).map((p) => new V(0, p.y, p.x));
      const arch = put(g, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.08, 8, false), M.orange), sx * (W / 2 + 0.16), 0.02, 0);
      arch.castShadow = true;
      for (let k = 1; k < 8; k++) { // Hänger vom Bogen zur Fahrbahn
        const z = -L / 2 + (k * L) / 8, h = 1.9 * Math.sqrt(Math.max(0, 1 - (z / (L / 2)) ** 2));
        put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, h, 6), dark), sx * (W / 2 + 0.16), h / 2, z);
      }
      // Geländer: Handlauf und Pfosten
      const rail = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 8), M.steel), sx * (W / 2 - 0.05), 1.0, 0); rail.rotation.x = Math.PI / 2;
      const mid = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L, 6), M.steel), sx * (W / 2 - 0.05), 0.55, 0); mid.rotation.x = Math.PI / 2;
      for (let k = 0; k <= 7; k++) put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), M.steel), sx * (W / 2 - 0.05), 0.5, -L / 2 + (k * L) / 7);
      for (const sz of [-1, 1]) { // Warnlampen an den Enden
        put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.25, 8), dark), sx * (W / 2 + 0.16), 0.62, sz * (L / 2 + 0.05));
        put(g, new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: srgb(0xffb020), toneMapped: false })), sx * (W / 2 + 0.16), 1.3, sz * (L / 2 + 0.05), false);
      }
    }
    const concrete = M.std({ color: srgb(0x8a8178), roughness: 0.95 });
    for (const sz of [-1, 1]) put(g, new THREE.Mesh(new THREE.BoxGeometry(W + 0.9, 1.1, 0.9), concrete), 0, -0.6, sz * (L / 2 - 0.2)); // Widerlager
    // Warnstreifen an den Auffahrten
    const stripe = canvasTex(128, 32, (c) => { c.fillStyle = "#facc15"; c.fillRect(0, 0, 128, 32); c.fillStyle = "#111"; for (let x = -32; x < 128; x += 24) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 12, 32); c.lineTo(x + 44, 0); c.lineTo(x + 32, 0); c.fill(); } });
    for (const sz of [-1, 1]) { const st = put(g, new THREE.Mesh(new THREE.PlaneGeometry(W, 0.35), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.8 })), 0, 0.055, sz * (L / 2 - 0.25), false); st.rotation.x = -Math.PI / 2; }
    g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    return g;
  }
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
  // Kleine Einschlagkrater in der Landschaft: [x, z, Radius, Tiefe], nicht auf freizuhaltenden Plätzen und nicht auf den Wegen der Führung
  function scatterCraters(L, keep, n, seed, rMin, rMax, area = 260) {
    const segs = [];
    for (const r of Object.values(L.route || {})) for (let i = 0; i < r.length - 1; i++) segs.push([r[i], r[i + 1]]);
    const segDist = (x, z) => { let m = Infinity; for (const [[ax, az], [bx, bz]] of segs) { const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1))); m = Math.min(m, Math.hypot(x - ax - vx * t, z - az - vz * t)); } return m; };
    const out = [];
    for (let i = 0; i < n * 30 && out.length < n; i++) {
      const x = (hash2(i, seed) - 0.5) * area, z = (hash2(i, seed + 1) - 0.5) * area, r = rMin + Math.pow(hash2(i, seed + 2), 2) * (rMax - rMin);
      if (Math.hypot(x, z) < 16 + r || Math.hypot(x, z) > 145 || segDist(x, z) < r * 1.6 + 3) continue;
      if (keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + r * 1.6 + 2)) continue;
      if (out.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + r + 2)) continue;
      out.push([x, z, r, r * (0.3 + hash2(i, seed + 3) * 0.12)]);
    }
    return out;
  }
  // Gleiche Eckpunkte zusammenführen (Index), damit die Normalen weich werden
  function mergeVerts(src) {
    const p = src.attributes.position, map = new Map(), pos = [], idx = [];
    for (let i = 0; i < p.count; i++) {
      const k = Math.round(p.getX(i) * 1e4) + "," + Math.round(p.getY(i) * 1e4) + "," + Math.round(p.getZ(i) * 1e4);
      let j = map.get(k); if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(p.getX(i), p.getY(i), p.getZ(i)); }
      idx.push(j);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
  }
  // Gesteinsoberfläche für alle Felsen: Farbe (Körnung, Adern, Poren, helle Minerale) und Normalenkarte aus demselben Relief.
  // Nahtlos, 512 px, bilinear gefiltert – das alte Relief per bumpMap wurde aus der Nähe klötzchenhaft.
  let rockSurfCache = null;
  function rockSurface() {
    if (rockSurfCache) return rockSurfCache;
    const S = 512, h = new Float32Array(S * S), crack = new Float32Array(S * S);
    // dasselbe Rauschen wie noise2p/fbm2p, nur mit vorberechneten Gitterwerten (gut 3× schneller – zählt beim Laden auf dem Tablet)
    const lat = {}, tn = (x, y, p) => {
      const Lp = lat[p] || (lat[p] = (() => { const a = new Float32Array(p * p); for (let j = 0; j < p; j++) for (let i = 0; i < p; i++) a[j * p + i] = hash2(i, j); return a; })());
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = Lp[y0 * p + x0], b = Lp[y0 * p + x1], c = Lp[y1 * p + x0], d = Lp[y1 * p + x1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }, tf = (x, y, p) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += tn(x * f, y * f, p * f) * a; a *= 0.5; f *= 2; } return s; };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S, i = y * S + x;
      h[i] = tf(u * 6, v * 6, 6) * 0.6 + tf(u * 20 + 3, v * 20, 20) * 0.28 + tn(u * 64, v * 64 + 5, 64) * 0.12;
      const c = 1 - Math.abs(tf(u * 5 + 11, v * 5 + 2, 5) * 2 - 1); // Adern/Risse: dort, wo das Rauschen die Mitte kreuzt
      crack[i] = smooth(0.978, 0.997, c);
      h[i] -= crack[i] * 0.07;
    }
    for (let k = 0; k < 70; k++) { // kleine Einschlaggruben (Mikrometeoriten) – auch über den Rand hinweg nahtlos
      const cx = hash2(k, 61) * S, cy = hash2(k, 62) * S, rr = 2 + Math.pow(hash2(k, 63), 2) * 9;
      for (let dy = -Math.ceil(rr * 1.4); dy <= rr * 1.4; dy++) for (let dx = -Math.ceil(rr * 1.4); dx <= rr * 1.4; dx++) {
        const d = Math.hypot(dx, dy) / rr; if (d > 1.4) continue;
        const i = (((Math.round(cy) + dy) % S + S) % S) * S + (((Math.round(cx) + dx) % S + S) % S);
        h[i] += d < 1 ? -0.07 * (1 - d * d) : 0.03 * (1 - (d - 1) / 0.4); // Mulde mit leichtem Wall
      }
    }
    const col = document.createElement("canvas"), nor = document.createElement("canvas"); col.width = col.height = nor.width = nor.height = S;
    const ci = col.getContext("2d").createImageData(S, S), ni = nor.getContext("2d").createImageData(S, S), at = (x, y) => h[((y + S) % S) * S + ((x + S) % S)], K = 9;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x, o = i * 4;
      let nx = -(at(x + 1, y) - at(x - 1, y)) * K, ny = (at(x, y + 1) - at(x, y - 1)) * K; const l = Math.hypot(nx, ny, 1);
      ni.data[o] = (nx / l * 0.5 + 0.5) * 255; ni.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; ni.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; ni.data[o + 3] = 255;
      const fleck = hash2(x * 1.7, y * 2.3) > 0.985 ? 0.18 : 0; // vereinzelte helle Mineralkörner
      const g = Math.max(0, Math.min(1, 0.7 + (h[i] - 0.5) * 0.55 - crack[i] * 0.14 + (hash2(x, y) - 0.5) * 0.08 + fleck)) * 255;
      ci.data[o] = g; ci.data[o + 1] = g * 0.985; ci.data[o + 2] = g * 0.96; ci.data[o + 3] = 255;
    }
    col.getContext("2d").putImageData(ci, 0, 0); nor.getContext("2d").putImageData(ni, 0, 0);
    const map = new THREE.CanvasTexture(col), normalMap = new THREE.CanvasTexture(nor);
    map.encoding = THREE.sRGBEncoding; normalMap.encoding = THREE.LinearEncoding;
    for (const t of [map, normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
    return (rockSurfCache = { map, normalMap });
  }
  // Materialwerte für einen Felsen: Farbe + Relief mit eigener Wiederholung (beide Karten gleich, three.js nimmt die Wiederholung der Farbkarte)
  function rockTex(rx, ry, k = 1) {
    const { map, normalMap } = rockSurface(), a = map.clone(), b = normalMap.clone();
    for (const t of [a, b]) { t.repeat.set(rx, ry); t.needsUpdate = true; }
    return { map: a, normalMap: b, normalScale: new THREE.Vector2(k, k) };
  }
  // Kugel-Abwicklung als Texturkoordinaten (an der Naht bekommt jedes Dreieck passende Werte), Normalen bleiben weich
  function sphereUV(src) {
    const g = src.index ? src.toNonIndexed() : src, p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i += 3) {
      const us = [];
      for (let k = 0; k < 3; k++) { const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k); us.push(Math.atan2(z, x) / (2 * Math.PI) + 0.5); uv[(i + k) * 2 + 1] = Math.atan2(y, Math.hypot(x, z)) / Math.PI + 0.5; }
      const mx = Math.max(...us);
      for (let k = 0; k < 3; k++) uv[(i + k) * 2] = mx - us[k] > 0.5 ? us[k] + 1 : us[k];
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }
  // Großer Felsen mit Texturkoordinaten
  function boulderGeo(seed) { return sphereUV(naturalRockGeo(seed, 5)); }
  function naturalRockGeo(seed, detail = 3) {
    const geo = mergeVerts(new THREE.IcosahedronGeometry(1, detail)), p = geo.attributes.position, v = new V(), col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = fbm2(v.x * 1.6 + seed * 3.1, v.z * 1.6 + v.y * 1.3 - seed) - 0.5, n2 = fbm2(v.x * 4.3 - seed, v.y * 4.1 + v.z * 3.7 + seed) - 0.5;
      const facet = (Math.round((v.x + v.y * 0.7) * 2.2 + seed) - Math.round(seed)) * 0.03; // angedeutete Bruchkanten
      v.multiplyScalar(1 + n * 0.55 + n2 * 0.16 + facet);
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
  // Steuerpult (die Bedienerin steht auf +Z): Sockel mit Lüftung, schräges Bedienfeld mit Bildschirm, Tasten und Steuerknüppel,
  // darüber eine Monitorbrücke mit zwei Bildschirmen und einer Statuslampe
  function makeConsole() {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0xe8ebef, metalness: 0.2, roughness: 0.42 }), dark = new THREE.MeshStandardMaterial({ color: 0x272c34, metalness: 0.4, roughness: 0.5 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 }), alu = new THREE.MeshStandardMaterial({ color: 0xaeb4bc, metalness: 0.8, roughness: 0.3 });
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.92), dark), 0, 0.04, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.8, 0.6), body), 0, 0.48, -0.06);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.12, 0.08), dark), 0, 0.14, 0.25, false);                       // Fußleiste
    const vent = canvasTex(256, 64, (c) => { c.fillStyle = "#d9dde3"; c.fillRect(0, 0, 256, 64); c.fillStyle = "#2f3640"; for (let x = 10; x < 246; x += 12) c.fillRect(x, 12, 6, 40); });
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshStandardMaterial({ map: vent, roughness: 0.6 })), 0, 0.42, 0.242, false);
    for (const x of [-0.69, 0.69]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.82, 0.64), trim), x, 0.49, -0.06, false); // farbige Kanten
    const desk = new THREE.Group(); desk.position.set(0, 0.93, 0.08); desk.rotation.x = 0.4; g.add(desk);
    put(desk, new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.06, 0.66), body), 0, 0, 0);
    put(desk, new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.07, 0.04), trim), 0, 0, 0.34, false);
    const scr = put(desk, new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.4), screenMat("status")), -0.28, 0.032, -0.04, false); scr.rotation.x = -Math.PI / 2;
    put(desk, new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.012, 0.44), dark), -0.28, 0.03, -0.04, false);
    const keyCols = [0x22c55e, 0xef4444, 0xfacc15, 0x38bdf8];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) put(desk, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.05), new THREE.MeshStandardMaterial({ color: keyCols[(i + j) % 4], emissive: keyCols[(i + j) % 4], emissiveIntensity: 0.35, roughness: 0.4 })), 0.22 + i * 0.08, 0.04, -0.18 + j * 0.08, false);
    put(desk, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 16), dark), 0.52, 0.045, 0.14, false);  // Steuerknüppel
    put(desk, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16, 8), alu), 0.52, 0.12, 0.14, false);
    put(desk, new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })), 0.52, 0.2, 0.14, false);
    for (const x of [-0.6, 0.6]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), alu), x, 1.25, -0.3);   // Monitorbrücke
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.05, 0.06), alu), 0, 1.6, -0.3);
    [["map", -0.3], ["cam", 0.3]].forEach(([k, x]) => {
      const mon = new THREE.Group(); mon.position.set(x, 1.38, -0.27); mon.rotation.x = -0.15; g.add(mon);
      put(mon, new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.04), dark), 0, 0, 0);
      put(mon, new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.31), screenMat(k)), 0, 0, 0.022, false);
    });
    const lamp = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80, toneMapped: false })), 0.6, 1.66, -0.3, false);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), dark), 0.6, 1.62, -0.3, false);
    g.userData.blink = [lamp];
    return mergeStatic(g, [lamp]);
  }
  // Solar-Rover wie „Spirit“ und „Opportunity“ (2004 – 2018), vorn = +Z: ein flaches Solarzellen-Deck aus Mittelteil und fünf Flügeln,
  // darunter der Elektronik-Kasten in Goldfolie, sechs Räder an der Rocker-Bogie-Schwinge, vorn der Kameramast mit zwei „Augen“,
  // hinten die flache Hochgewinn-Antenne und der Stab der Rundstrahl-Antenne, vorn eingeklappt der Roboterarm.
  // userData.cells = Material der Solarzellen (färbt sich bei Staub rotbraun)
  // Isolierdecke wie auf echten Raumsonden: Goldfolie mit Knitterfalten (als Relief, spiegelt das Licht), in Kissen abgesteppt,
  // an den Kreuzungen der Nähte kleine Befestigungsknöpfe. Nahtlos, eine Kachel ≈ 0,5 m
  const mliCache = {};
  function mliSurface(neutral = false) { // neutral: grau – die Farbe (silber, schwarz, gold) kommt dann vom Material
    if (mliCache[neutral]) return mliCache[neutral];
    const S = 512, hc = document.createElement("canvas"); hc.width = hc.height = S; const h = hc.getContext("2d");
    h.fillStyle = "#808080"; h.fillRect(0, 0, S, S); h.lineCap = "round";
    for (let i = 0; i < 320; i++) { // Falten: kurze, leicht gebogene Grate (hell) und Täler (dunkel), über den Rand hinweg nahtlos
      const x = hash2(i, 1) * S, y = hash2(i, 2) * S, a = hash2(i, 3) * 6.3, l = 18 + hash2(i, 4) * 80, up = hash2(i, 5) > 0.5;
      h.strokeStyle = up ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"; h.lineWidth = 2 + hash2(i, 6) * 6;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { h.beginPath(); h.moveTo(x + ox, y + oy); h.quadraticCurveTo(x + ox + Math.cos(a + 0.5) * l * 0.5, y + oy + Math.sin(a + 0.5) * l * 0.5, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); h.stroke(); }
    }
    h.strokeStyle = "rgba(0,0,0,0.75)"; h.lineWidth = 5; // Steppnähte (Täler) alle 128 px
    for (let k = 0; k <= S; k += 128) { h.beginPath(); h.moveTo(k, 0); h.lineTo(k, S); h.stroke(); h.beginPath(); h.moveTo(0, k); h.lineTo(S, k); h.stroke(); }
    const img = h.getImageData(0, 0, S, S).data, H = (x, y) => img[((((y % S) + S) % S) * S + (((x % S) + S) % S)) * 4] / 255;
    // Polster: zwischen den Nähten leicht gewölbt
    const puff = (x, y) => { const u = (x % 128) / 128, v = (y % 128) / 128; return Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.35; };
    const col = document.createElement("canvas"), nor = document.createElement("canvas"); col.width = col.height = nor.width = nor.height = S;
    const ci = col.getContext("2d").createImageData(S, S), ni = nor.getContext("2d").createImageData(S, S), hh = (x, y) => H(x, y) + puff(((x % S) + S) % S, ((y % S) + S) % S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const o = (y * S + x) * 4, dx = (hh(x + 1, y) - hh(x - 1, y)) * 3.2, dy = (hh(x, y + 1) - hh(x, y - 1)) * 3.2, l = Math.hypot(dx, dy, 1);
      ni.data[o] = (-dx / l * 0.5 + 0.5) * 255; ni.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; ni.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; ni.data[o + 3] = 255;
      const v = H(x, y), k = 0.78 + (v - 0.5) * 0.9 + (hash2(x, y) - 0.5) * 0.04; // helle Grate, dunkle Falten
      const [cr, cg, cb] = neutral ? [236, 236, 236] : [214, 160, 62]; ci.data[o] = Math.min(255, cr * k); ci.data[o + 1] = Math.min(255, cg * k); ci.data[o + 2] = Math.min(255, cb * k); ci.data[o + 3] = 255;
    }
    col.getContext("2d").putImageData(ci, 0, 0); nor.getContext("2d").putImageData(ni, 0, 0);
    const c2 = col.getContext("2d"); // Stiche entlang der Nähte und Knöpfe an den Kreuzungen
    c2.fillStyle = neutral ? "rgba(40,40,44,0.8)" : "rgba(60,38,8,0.85)"; for (let k = 0; k <= S; k += 128) for (let t = 4; t < S; t += 12) { c2.fillRect(k - 1, t, 2, 6); c2.fillRect(t, k - 1, 6, 2); }
    for (let x = 0; x <= S; x += 128) for (let y = 0; y <= S; y += 128) { c2.fillStyle = "#f1f1ee"; c2.beginPath(); c2.arc(x, y, 6, 0, 7); c2.fill(); c2.fillStyle = "rgba(0,0,0,0.35)"; c2.beginPath(); c2.arc(x + 1, y + 1, 3, 0, 7); c2.fill(); }
    const map = new THREE.CanvasTexture(col), normalMap = new THREE.CanvasTexture(nor);
    map.encoding = THREE.sRGBEncoding; normalMap.encoding = THREE.LinearEncoding;
    for (const t of [map, normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
    return (mliCache[neutral] = { map, normalMap });
  }
  function merWheel(R, W, alu, dark) {
    const b = partBuilder(), rim = alu.clone(); rim.side = THREE.DoubleSide;
    b.add(new THREE.CylinderGeometry(R, R, W, 48, 1, true), rim, [0, 0, 0], [0, 0, Math.PI / 2]);
    for (const sx of [-1, 1]) b.add(new THREE.TorusGeometry(R, 0.012, 6, 48), alu, [sx * W / 2, 0, 0], [0, Math.PI / 2, 0]);
    for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2; b.add(new THREE.BoxGeometry(W * 0.96, 0.022, 0.03), dark, [0, Math.cos(a) * (R + 0.008), Math.sin(a) * (R + 0.008)], [a, 0, 0]); }
    for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2, pts = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10, rr = 0.06 + t * (R * 0.94 - 0.06), a = a0 + sx * (t * 1.1 - 0.25 * Math.sin(t * Math.PI)); pts.push(new V(sx * (W / 2 - 0.02), Math.cos(a) * rr, Math.sin(a) * rr)); }
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.009, 5), alu);
    }
    b.add(new THREE.CylinderGeometry(0.065, 0.065, W * 0.9, 20), alu, [0, 0, 0], [0, 0, Math.PI / 2]);
    for (const sx of [-1, 1]) { b.add(new THREE.CylinderGeometry(0.04, 0.05, 0.03, 16), dark, [sx * (W * 0.45 + 0.015), 0, 0], [0, 0, Math.PI / 2]); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6), alu, [sx * (W * 0.45 + 0.03), Math.cos(a) * 0.03, Math.sin(a) * 0.03], [0, 0, Math.PI / 2]); } }
    return b.group(true);
  }
  function makeSolarRover(M) {
    const g = new THREE.Group(), b = partBuilder();
    // Solarzellen matt und dunkelblau (glänzten sie stark, spiegelten sie von der Seite nur den hellen Himmel – das Deck wirkte weiß)
    const cells = marsCellMat(M).clone(); cells.roughness = 0.42; cells.metalness = 0.25; cells.envMapIntensity = 0.45;
    const white = M.std({ color: srgb(0xeef0f2), roughness: 0.5 }), grey = M.std({ color: srgb(0x8f98a3), roughness: 0.4, metalness: 0.55 });
    const dark = M.std({ color: srgb(0x2b2e34), roughness: 0.8, metalness: 0.2 }), alu = M.std({ color: srgb(0xc3c8cf), roughness: 0.32, metalness: 0.8 });
    const ti = M.std({ color: srgb(0xa9b0b8), roughness: 0.3, metalness: 0.85 }), lens = M.std({ color: srgb(0x0f1216), roughness: 0.12, metalness: 0.6 });
    // Elektronik-Kasten: Kern, darauf gepolsterte Isolierdecken aus Goldfolie (Texturkoordinaten in Metern, damit die Kacheln überall gleich groß sind),
    // Eckprofile und Rahmen aus Aluminium; unten dunkler Bodenrahmen, vorn und hinten je zwei Gefahrenkameras
    const mli = mliSurface(), blanket = new THREE.MeshStandardMaterial({ map: mli.map, normalMap: mli.normalMap, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.32, metalness: 0.85, envMap: M.env, envMapIntensity: 1.15 });
    b.add(new THREE.BoxGeometry(1.06, 0.42, 1.36), dark, [0, 0.8, 0]);
    const pillow = (w, h) => { const g2 = new THREE.PlaneGeometry(w, h, 16, 6), p = g2.attributes.position, uv = g2.attributes.uv; for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2); p.setZ(i, 0.022 * (1 - u * u) * (1 - v * v)); uv.setXY(i, (p.getX(i) + w / 2) / 0.5, (p.getY(i) + h / 2) / 0.5); } g2.computeVertexNormals(); return g2; };
    for (const sx of [-1, 1]) b.add(pillow(1.32, 0.38), blanket, [sx * 0.532, 0.8, 0], [0, sx * Math.PI / 2, 0]);
    for (const sz of [-1, 1]) b.add(pillow(1.02, 0.38), blanket, [0, 0.8, sz * 0.682], [0, sz > 0 ? 0 : Math.PI, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(new THREE.BoxGeometry(0.045, 0.46, 0.045), alu, [sx * 0.545, 0.8, sz * 0.695]);
    for (const y of [0.595, 1.005]) { for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.03, 0.03, 1.4), alu, [sx * 0.548, y, 0]); for (const sz of [-1, 1]) b.add(new THREE.BoxGeometry(1.12, 0.03, 0.03), alu, [0, y, sz * 0.698]); }
    b.add(new THREE.BoxGeometry(1.14, 0.06, 1.44), dark, [0, 0.56, 0]);
    const radTex = canvasTex(64, 128, (c) => { c.fillStyle = "#e8ebee"; c.fillRect(0, 0, 64, 128); c.fillStyle = "rgba(90,100,112,0.55)"; for (let y = 6; y < 128; y += 10) c.fillRect(4, y, 56, 3); c.strokeStyle = "rgba(60,70,80,0.7)"; c.lineWidth = 3; c.strokeRect(1.5, 1.5, 61, 125); });
    const radMat = M.std({ map: radTex, roughness: 0.45, metalness: 0.3 }), kapton = M.std({ color: srgb(0xb7782b), roughness: 0.55, metalness: 0.2 });
    for (const sx of [-1, 1]) {
      const X = sx * 0.555;
      b.add(new THREE.BoxGeometry(0.02, 0.28, 0.62), radMat, [X + sx * 0.005, 0.84, -0.22]);                                   // Kühlfläche
      for (const [z, w, h] of [[0.36, 0.2, 0.16], [0.55, 0.1, 0.1]]) b.add(new THREE.BoxGeometry(0.07, h, w), dark, [X + sx * 0.035, 0.78, z]); // Gerätekästen
      for (const [y, c] of [[0.66, kapton], [0.97, dark]]) { const pts = [new V(X + sx * 0.02, y, -0.66), new V(X + sx * 0.035, y + 0.03, -0.2), new V(X + sx * 0.03, y - 0.02, 0.25), new V(X + sx * 0.02, y, 0.66)]; b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.014, 6), c); }
      for (const z of [0.1, 0.2]) b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 10), alu, [X + sx * 0.03, 0.66, z], [0, 0, Math.PI / 2]);  // Steckverbinder
    }
    b.add(new THREE.BoxGeometry(0.5, 0.16, 0.05), radMat, [0, 0.82, -0.72]); // Lüftungsgitter hinten
    for (const z of [0.72, -0.72]) for (const x of [-0.18, 0.18]) { b.add(new THREE.BoxGeometry(0.1, 0.07, 0.06), dark, [x, 0.66, z]); b.add(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), lens, [x, 0.66, z + Math.sign(z) * 0.035], [Math.PI / 2, 0, 0]); }
    // Solarflügel: jedes Feld mit Rahmen aus Aluminium, die Zellen leicht vertieft
    const deckY = 1.045;
    for (const [w, d, x, z] of [[1.24, 1.5, 0, -0.03], [0.56, 1.17, -0.9, 0.035], [0.56, 1.17, 0.9, 0.035], [1.2, 0.42, 0, -1.0], [0.46, 0.44, -0.86, -0.83], [0.46, 0.44, 0.86, -0.83]]) {
      b.add(new THREE.BoxGeometry(w, 0.03, d), grey, [x, deckY - 0.01, z]);
      b.add(new THREE.BoxGeometry(w - 0.04, 0.05, d - 0.04), dark, [x, deckY - 0.05, z]);
      for (const [fx, fz, fw, fd] of [[0, d / 2 - 0.015, w, 0.03], [0, -d / 2 + 0.015, w, 0.03], [w / 2 - 0.015, 0, 0.03, d], [-w / 2 + 0.015, 0, 0.03, d]]) b.add(new THREE.BoxGeometry(fw, 0.045, fd), alu, [x + fx, deckY + 0.005, z + fz]);
      b.add(new THREE.PlaneGeometry(w - 0.05, d - 0.05), cells, [x, deckY + 0.008, z], [-Math.PI / 2, 0, 0]);
    }
    // Sonnenuhr zum Einstellen der Kamerafarben (wie auf Spirit und Opportunity): Sockel, Farbfelder, Schattenstab
    b.add(new THREE.CylinderGeometry(0.075, 0.08, 0.04, 20), white, [0.42, deckY + 0.03, -0.62]);
    [[0xdc2626, 0.03, 0.03], [0x16a34a, -0.03, 0.03], [0x2563eb, 0.03, -0.03], [0xfacc15, -0.03, -0.03]].forEach(([c, dx, dz]) => b.add(new THREE.BoxGeometry(0.025, 0.012, 0.025), M.std({ color: srgb(c), roughness: 0.6 }), [0.42 + dx * 1.6, deckY + 0.055, -0.62 + dz * 1.6]));
    b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 6), dark, [0.42, deckY + 0.095, -0.62]);
    // Hochgewinn-Antenne: flache Scheibe auf einem Kardangelenk; Rundstrahl-Antenne: Stab mit Spitze
    b.add(new THREE.CylinderGeometry(0.035, 0.045, 0.18, 10), grey, [0.42, deckY + 0.1, -0.2]);
    b.add(new THREE.BoxGeometry(0.2, 0.04, 0.05), grey, [0.42, deckY + 0.2, -0.2]);
    for (const x of [0.33, 0.51]) b.add(new THREE.BoxGeometry(0.025, 0.12, 0.04), grey, [x, deckY + 0.26, -0.2]);
    b.add(new THREE.CylinderGeometry(0.24, 0.24, 0.035, 40), white, [0.42, deckY + 0.32, -0.2], [-0.7, 0, 0]);
    b.add(new THREE.TorusGeometry(0.24, 0.012, 6, 40), grey, [0.42, deckY + 0.32, -0.2], [Math.PI / 2 - 0.7, 0, 0]);
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), grey, [0.42, deckY + 0.31, -0.18], [-0.7, 0, 0]);
    b.add(new THREE.CylinderGeometry(0.01, 0.012, 0.6, 6), grey, [0.62, deckY + 0.3, 0.12]); b.add(new THREE.SphereGeometry(0.02, 8, 6), white, [0.62, deckY + 0.61, 0.12]);
    // Kameramast vorn links: Gelenk am Fuß, Mast, Kamerabalken mit zwei Panoramakameras (mit Blenden), zwei Navigationskameras, Infrarot-Spektrometer
    const mx = -0.42, mz = 0.5;
    b.add(new THREE.BoxGeometry(0.18, 0.1, 0.18), grey, [mx, deckY + 0.075, mz]);
    b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 14), dark, [mx, deckY + 0.12, mz], [0, 0, Math.PI / 2]);
    b.add(new THREE.CylinderGeometry(0.055, 0.065, 0.86, 16), white, [mx, deckY + 0.55, mz]);
    { const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 6; pts.push(new V(mx + Math.cos(a) * 0.07, deckY + 0.14 + t * 0.8, mz + Math.sin(a) * 0.07)); } b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.008, 5), dark); } // Kabel um den Mast
    for (const y of [0.3, 0.62]) b.add(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), grey, [mx, deckY + y, mz]);
    const hy = deckY + 1.02;
    b.add(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 12), grey, [mx, hy - 0.08, mz]);
    b.add(new THREE.BoxGeometry(0.6, 0.15, 0.17), grey, [mx, hy, mz]);
    for (const x of [-0.23, 0.23]) { b.add(new THREE.BoxGeometry(0.12, 0.12, 0.08), dark, [mx + x, hy, mz + 0.12]); b.add(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 16), lens, [mx + x, hy, mz + 0.165], [Math.PI / 2, 0, 0]); b.add(new THREE.CylinderGeometry(0.048, 0.044, 0.05, 16, 1, true), dark, [mx + x, hy, mz + 0.18], [Math.PI / 2, 0, 0]); }
    for (const x of [-0.06, 0.06]) { b.add(new THREE.BoxGeometry(0.07, 0.05, 0.07), white, [mx + x, hy + 0.09, mz + 0.02]); b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 10), lens, [mx + x, hy + 0.09, mz + 0.06], [Math.PI / 2, 0, 0]); }
    b.add(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 14), dark, [mx, hy - 0.02, mz - 0.17], [Math.PI / 2, 0, 0]);
    // Rocker-Bogie aus Titanrohren: jedes Rad hängt an einem Bein, so fahren die echten Rover über Steine; oben das Ausgleichsgestänge
    const WX = 0.97, WR = 0.25, BX = 0.8, joint = (p, r = 0.05) => b.add(new THREE.SphereGeometry(r, 12, 8), dark, [p.x, p.y, p.z]);
    const tube = (a, c, rr = 0.032) => { const d = c.clone().sub(a); b.addM(new THREE.CylinderGeometry(rr, rr, 1, 10), ti, new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), d.clone().normalize()), new V(1, d.length(), 1))); };
    for (const sx of [-1, 1]) {
      const x = sx * BX, F = new V(x, 0.62, 0.55), P = new V(x, 0.8, 0.06), Bp = new V(x, 0.52, -0.35), Bm = new V(x, 0.52, 0.02), Br = new V(x, 0.52, -0.72);
      tube(F, P); tube(P, Bp); tube(Bm, Br); tube(Bm, Bp, 0.03);
      for (const [top, z] of [[F, 0.72], [Bm, 0.02], [Br, -0.72]]) tube(top, new V(sx * (WX - 0.08), WR, z), 0.028);
      tube(P, new V(sx * 0.55, 0.8, 0.06), 0.045); joint(P, 0.06); joint(Bp); joint(F, 0.045); joint(Br, 0.045);
    }
    b.add(new THREE.BoxGeometry(1.5, 0.04, 0.06), ti, [0, 1.0, -0.62]);
    g.add(b.group(true));
    // Räder: Aluminium mit Stollen, drehen beim Fahren (rotation.x)
    const wheelSrc = merWheel(WR, 0.17, alu, dark), wheels = [];
    for (const sx of [-1, 1]) for (const z of [-0.72, 0.02, 0.72]) { const w = wheelSrc.clone(); w.position.set(sx * WX, WR, z); g.add(w); wheels.push(w); }
    // Roboterarm vorn: Schulter (dreht und kippt), Ober- und Unterarm, Werkzeugkopf mit Mikroskop-Kamera, Schleifbürste und Bohrer.
    // Beim Fahren quer vor dem Kasten eingeklappt; an einer Fundstelle fährt er aus (roverArmPose)
    const arm = { L1: 0.55, L2: 0.5, S: new V(0.3, 0.62, 0.74), TOOL: 0.27 };
    arm.shoulder = new THREE.Group(); arm.shoulder.position.copy(arm.S); g.add(arm.shoulder);
    put(arm.shoulder, new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), dark), 0, 0, 0);
    arm.upper = new THREE.Group(); arm.shoulder.add(arm.upper);
    put(arm.upper, new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, arm.L1, 10), ti), 0, 0, arm.L1 / 2).rotation.x = Math.PI / 2;
    arm.elbow = new THREE.Group(); arm.elbow.position.z = arm.L1; arm.upper.add(arm.elbow);
    put(arm.elbow, new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), dark), 0, 0, 0);
    put(arm.elbow, new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, arm.L2, 10), ti), 0, 0, arm.L2 / 2).rotation.x = Math.PI / 2;
    arm.wrist = new THREE.Group(); arm.wrist.position.z = arm.L2; arm.elbow.add(arm.wrist);
    arm.turret = new THREE.Group(); arm.wrist.add(arm.turret);
    put(arm.turret, new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.17), grey), 0, -0.07, 0);
    arm.bit = put(arm.turret, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.15, 8), alu), 0, -0.2, 0);                  // Bohrer
    put(arm.turret, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 14), M.std({ color: srgb(0x4b5563), roughness: 0.9 })), 0.075, -0.15, 0.04); // Bürste
    put(arm.turret, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12), lens), -0.075, -0.15, 0.03);                // Mikroskop
    arm.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,255,1)", "rgba(180,220,255,0.6)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    arm.flash.scale.setScalar(0.5); arm.flash.position.set(-0.075, -0.2, 0.03); arm.flash.visible = false; arm.flash.raycast = () => {}; arm.turret.add(arm.flash);
    g.userData = { wheels, heading: 0, speed: 0, cells, clean: cells.color.clone(), arm };
    roverArmPose(arm, 0);
    return g;
  }
  // Roboterarm: k = 0 eingeklappt … 1 ausgefahren, t = Ziel der Werkzeugspitze in Rover-Koordinaten (zwei Glieder, der Werkzeugkopf zeigt immer senkrecht nach unten)
  function roverArmPose(arm, k, t) {
    const { L1, L2, S, TOOL } = arm;
    let yaw = -Math.PI / 2, p = 0, e = Math.PI - 0.2; // eingeklappt: Oberarm quer vor dem Kasten, Unterarm zurückgefaltet
    if (t && k > 0) {
      const dx = t.x - S.x, dz = t.z - S.z, dy = t.y + TOOL - S.y, d = Math.hypot(dx, dz), D = Math.min(L1 + L2 - 0.02, Math.hypot(d, dy));
      const ee = Math.acos(Math.max(-1, Math.min(1, (D * D - L1 * L1 - L2 * L2) / (2 * L1 * L2))));
      const pp = Math.atan2(dy, d) + Math.atan2(L2 * Math.sin(ee), L1 + L2 * Math.cos(ee));
      yaw += (Math.atan2(dx, dz) - yaw) * k; p += (pp - p) * k; e += (ee - e) * k;
    }
    arm.shoulder.rotation.y = yaw; arm.upper.rotation.x = -p; arm.elbow.rotation.x = e; arm.wrist.rotation.x = p - e;
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
    if (i === 0) { // heller Felsen, übersät mit „Blaubeeren“ (Hämatit-Kügelchen)
      put(g, new THREE.Mesh(naturalRockGeo(61, 3), new THREE.MeshStandardMaterial({ color: srgb(0xd9a877), roughness: 1, vertexColors: true })), 0, 0.1, 0).scale.set(1.15, 0.3, 1.0);
      const berry = new THREE.MeshStandardMaterial({ color: srgb(0x3e4a5c), roughness: 0.35, metalness: 0.3 });
      for (let k = 0; k < 42; k++) { const a = hash2(k, 3) * 6.3, r = Math.sqrt(hash2(k, 4)) * 0.8; put(g, new THREE.Mesh(new THREE.SphereGeometry(0.035 + hash2(k, 5) * 0.035, 10, 8), berry), Math.cos(a) * r, 0.1 + 0.26 * (1 - (r / 1.05) ** 2), Math.sin(a) * r); }
      for (let k = 0; k < 30; k++) { const a = hash2(k, 7) * 6.3, r = 1.1 + hash2(k, 8) * 1.4; put(g, new THREE.Mesh(new THREE.SphereGeometry(0.03 + hash2(k, 9) * 0.03, 8, 6), berry), Math.cos(a) * r, 0.02, Math.sin(a) * r, false); } // herausgewittert im Sand
    } else if (i === 1) { // Felsen mit Schichten, wie am Grund eines Sees abgelagert
      const geo = naturalRockGeo(64, 3), p = geo.attributes.position, col = geo.attributes.color, pal = [0xd9a46c, 0xb8693e, 0xe7c08c, 0xa95a34, 0xd59a63, 0xc47f4f].map((h) => new THREE.Color(h).convertSRGBToLinear());
      for (let k = 0; k < p.count; k++) { const y = p.getY(k), band = Math.floor((y + 0.5) * 6 + Math.sin(p.getX(k) * 2.5) * 0.25), c = pal[((band % 6) + 6) % 6], v = 0.9 + 0.1 * hash2(k, 2); col.setXYZ(k, c.r * v, c.g * v, c.b * v); }
      put(g, new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, vertexColors: true, flatShading: true })), 0, 0.22, 0).scale.set(1.0, 0.62, 0.85);
    } else { // dunkler Felsen für die Bohrprobe
      put(g, new THREE.Mesh(naturalRockGeo(67, 3), new THREE.MeshStandardMaterial({ color: srgb(0x8a4a2e), roughness: 1, vertexColors: true })), 0, 0.25, 0).scale.set(0.9, 0.6, 0.8);
    }
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 12), new THREE.MeshStandardMaterial({ color: srgb(0xf4f4f5), roughness: 0.25, metalness: 0.6 }));
    tube.rotation.z = Math.PI / 2; tube.visible = false; g.userData.tube = tube; // Probenröhrchen – legt der Rover nach dem Bohren ab (wie Perseverance)
    return g;
  }
  // die Fundstellen im alten Flussdelta (rund um den hellen Fächer)
  const roverSamples = (L) => [[L.roverZiel[0] + 10, L.roverZiel[1] - 8], [L.roverZiel[0] - 4, L.roverZiel[1] + 9], [L.roverZiel[0] - 10, L.roverZiel[1] - 6]];
  // Rover: das echte Modell von Perseverance; im Grafikmodus „Flüssig“ (ohne das große Modell) der selbstgebaute Solar-Rover in Perseverance-Größe
  function makeMarsRover(nasa = true) {
    const real = nasa && nasaModel(["perseverance"], 3.0); // der echte Rover Perseverance
    if (real) { mergeStatic(real); real.userData = { wheels: [], heading: 0, speed: 0 }; return real; }
    const g = new THREE.Group(), r = makeSolarRover(colonyMats("mars")); r.scale.setScalar(1.3); g.add(r);
    g.userData = { wheels: r.userData.wheels, heading: 0, speed: 0 };
    return g;
  }
  // Hubschrauber: das echte Modell von Ingenuity (Rotoren drehen sich um die senkrechte Achse), sonst das selbstgebaute
  function makeMarsHeli() {
    const g = nasaModel(["ingenuity"], 2.6); // etwas größer als in echt (1,2 m Rotor), damit man ihn gut sieht
    if (!g) return makeHeli();
    const rotors = [];
    g.traverse((o) => { if (/STOWED/i.test(o.name)) o.visible = false; }); // das Modell enthält auch die eingeklappten Rotoren für den Flug zum Mars
    g.traverse((o) => { if (/^rotors_/i.test(o.name)) rotors.push(o); });
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
  // Landeplatz: flache Betonscheibe mit Fugen, Gummispuren, gelbem Ring, großem „H“ und Randmarken (1024 px)
  function makeHeliPad() {
    if (!makeHeliPad.mats) {
      const S = 1024, top = canvasTex(S, S, (x) => {
        const img = x.createImageData(S, S);
        for (let y = 0; y < S; y++) for (let X = 0; X < S; X++) { const v = 86 + (hash2(X, y) - 0.5) * 16, k = (y * S + X) * 4; img.data[k] = v; img.data[k + 1] = v * 0.97; img.data[k + 2] = v * 0.94; img.data[k + 3] = 255; }
        x.putImageData(img, 0, 0);
        for (let k = 0; k < 70; k++) { const cx = hash2(k, 11) * S, cy = hash2(k, 12) * S, rr = 40 + hash2(k, 13) * 140, gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr), d = hash2(k, 14) > 0.5; gr.addColorStop(0, d ? "rgba(30,26,22,0.16)" : "rgba(200,195,185,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); } // Flecken im Beton
        x.strokeStyle = "rgba(20,20,20,0.45)"; x.lineWidth = 3; // Fugen der Betonplatten
        for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(k * S / 4, 0); x.lineTo(k * S / 4, S); x.stroke(); x.beginPath(); x.moveTo(0, k * S / 4); x.lineTo(S, k * S / 4); x.stroke(); }
        for (let k = 0; k < 14; k++) { x.strokeStyle = "rgba(25,22,20,0.18)"; x.lineWidth = 10 + hash2(k, 3) * 14; x.beginPath(); const a = hash2(k, 1) * 6.3, rr = 180 + hash2(k, 2) * 200; x.arc(S / 2, S / 2, rr, a, a + 0.6 + hash2(k, 4)); x.stroke(); } // Abriebspuren
        x.strokeStyle = "#fbbf24"; x.lineWidth = 26; x.beginPath(); x.arc(S / 2, S / 2, 420, 0, 7); x.stroke();
        x.strokeStyle = "#f8fafc"; x.lineWidth = 10; x.setLineDash([46, 30]); x.beginPath(); x.arc(S / 2, S / 2, 470, 0, 7); x.stroke(); x.setLineDash([]);
        x.fillStyle = "#f8fafc"; const w = 64, hgt = 380, gap = 150; x.fillRect(S / 2 - gap - w / 2, S / 2 - hgt / 2, w, hgt); x.fillRect(S / 2 + gap - w / 2, S / 2 - hgt / 2, w, hgt); x.fillRect(S / 2 - gap, S / 2 - w / 2, gap * 2, w);
        x.globalCompositeOperation = "multiply"; const gr = x.createRadialGradient(S / 2, S / 2, 300, S / 2, S / 2, S / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(200,120,80,1)"); x.fillStyle = gr; x.fillRect(0, 0, S, S); // Marsstaub zum Rand hin
      });
      top.anisotropy = 8;
      makeHeliPad.mats = [new THREE.MeshStandardMaterial({ color: srgb(0x6b6660), roughness: 0.95 }), new THREE.MeshStandardMaterial({ map: top, roughness: 0.88 }), new THREE.MeshStandardMaterial({ color: srgb(0x6b6660), roughness: 0.95 })];
    }
    const m = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.25, 0.07, 64), makeHeliPad.mats); m.receiveShadow = true; // Oberkante 3,5 cm über dem Boden
    const g = new THREE.Group(); g.add(m); return g;
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
    for (const y of [1.15, 2.55]) put(tank, new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.035, 8, 40), M.steel), 0, y, 0, false).rotation.x = Math.PI / 2; // Spannringe
    for (const [x1, z1, x2, z2] of [[-0.6, -0.6, 0.6, 0.6], [0.6, -0.6, -0.6, 0.6]]) pipeSeg(tank, M, new V(x1, 0.05, z1), new V(x2, 0.48, z2), 0.025, M.metal); // Kreuzstreben
    // Leiter auf der Rückseite, oben ein Geländer und ein Einstieg
    const la = a + Math.PI, lx = Math.sin(la), lz = Math.cos(la), lpx = Math.cos(la), lpz = -Math.sin(la);
    for (const s of [-0.22, 0.22]) pipeSeg(tank, M, new V(lx * 1.18 + lpx * s, 0.5, lz * 1.18 + lpz * s), new V(lx * 1.18 + lpx * s, 3.5, lz * 1.18 + lpz * s), 0.022, M.steel);
    for (let y = 0.75; y < 3.4; y += 0.3) pipeSeg(tank, M, new V(lx * 1.18 - lpx * 0.22, y, lz * 1.18 - lpz * 0.22), new V(lx * 1.18 + lpx * 0.22, y, lz * 1.18 + lpz * 0.22), 0.016, M.steel);
    for (let k = 0; k < 10; k++) { const t = (k / 10) * Math.PI * 2; put(tank, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 6), M.steel), Math.sin(t) * 0.85, 3.25, Math.cos(t) * 0.85, false); }
    put(tank, new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.022, 6, 40), M.steel), 0, 3.47, 0, false).rotation.x = Math.PI / 2;
    put(tank, new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.12, 20), M.metal), 0, 3.25, 0);
    // Füllstandsanzeige: Glasrohr mit blauem Wasser neben dem Schild
    const ga = a + 1.05, gx = Math.sin(ga) * 1.13, gz = Math.cos(ga) * 1.13;
    put(tank, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.9, 12), M.glass), gx, 1.85, gz, false);
    put(tank, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 10), M.glowBlue), gx, 1.55, gz, false);
    for (const y of [0.9, 2.8]) put(tank, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), M.steel), gx, y, gz, false);
    // Auslass mit Handrad
    const va = a - 0.9, vx = Math.sin(va), vz = Math.cos(va);
    pipeSeg(tank, M, new V(vx * 1.0, 0.95, vz * 1.0), new V(vx * 1.45, 0.95, vz * 1.45), 0.07, M.metal);
    const wheel = put(tank, new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 24), M.std({ color: srgb(0xdc2626), roughness: 0.4 })), vx * 1.3, 1.12, vz * 1.3, false); wheel.rotation.x = Math.PI / 2;
    // Pumpe: liegender Pumpenkörper mit Motor, Flanschen und Kontrolllampe auf einem Sockel
    const pump = new THREE.Group(); pump.position.set(1.5, 0, -0.5); g.add(pump);
    put(pump, new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.6), M.metal), 0, 0.06, 0);
    put(pump, new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 24), M.teal), -0.18, 0.36, 0).rotation.z = Math.PI / 2;
    for (let k = 0; k < 5; k++) put(pump, new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.02, 24), M.metal), -0.34 + k * 0.08, 0.36, 0, false).rotation.z = Math.PI / 2;
    put(pump, new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), M.hull(1, 1)), 0.2, 0.36, 0).scale.set(0.9, 1, 1);
    for (const z of [-0.24, 0.24]) put(pump, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16), M.steel), 0.2, 0.36, z, false).rotation.x = Math.PI / 2;
    put(pump, new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), M.glowBlue), -0.41, 0.36, 0, false).rotation.y = -Math.PI / 2;
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
    // Lade- und Wartungsstation (lokal: Tür nach +Z): Geräteschrank mit gewölbtem Dach, Solarfeld auf Gestell, Funkmast mit Schüssel
    const st = new THREE.Group(); st.position.set(2.2, 0, 4.2); st.rotation.y = 2.6; g.add(st);
    put(st, new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.1, 1.5), M.metal), 0.3, 0.05, 0);
    const cab = new THREE.Group(); cab.position.set(-0.55, 0.1, 0); st.add(cab);
    put(cab, new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.74), M.hull(1, 1)), 0, 0.425, 0);
    const vault = put(cab, new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.95, 24, 1, false, 0, Math.PI), M.hull(1, 0.5)), 0, 0.85, 0); vault.rotation.z = Math.PI / 2;
    put(cab, new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.09, 0.76), M.orange), 0, 0.8, 0, false);
    put(cab, new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.62), M.metal), -0.15, 0.4, 0.372, false);
    put(cab, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), M.steel), 0.02, 0.42, 0.39, false);
    put(cab, new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), M.glowBlue), 0.28, 0.58, 0.372, false);
    for (let k = 0; k < 4; k++) put(cab, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.01), M.metal), 0.28, 0.2 + k * 0.05, 0.375, false);
    blinkLamp(cab, 0x4ade80, 0.35, 1.25, 0).scale.setScalar(0.45);
    // Solarfeld: zwei Paneele auf einem schrägen Gestell
    const arr = new THREE.Group(); arr.position.set(0.85, 0.1, 0); st.add(arr);
    for (const x of [-0.42, 0.42]) { put(arr, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), M.steel), x, 0.27, -0.45); put(arr, new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 0.05), M.steel), x, 0.52, 0.42); }
    const panels = new THREE.Group(); panels.position.set(0, 0.8, 0); panels.rotation.x = -0.55; arr.add(panels);
    put(panels, new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.04, 1.15), M.steel), 0, -0.03, 0);
    for (const x of [-0.31, 0.31]) put(panels, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 1.1), marsCellMat(M)), x, 0.01, 0, false);
    // Funkmast mit Schüssel zur Bodenstation
    put(st, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.1, 10), M.steel), -1.05, 1.15, -0.5);
    const dish = put(st, dishCap(M, 0.32, 0.6), -1.05, 2.2, -0.45); dish.rotation.x = Math.PI + 0.9;
    // Kabelkanal von der Station zum Landeplatz
    pipeSeg(g, M, new V(1.3, 0.05, 2.35), new V(1.95, 0.05, 3.5), 0.05, M.metal);
    // Windsack: zeigt, woher der (dünne) Marswind weht – wichtig für jeden Flug
    const sock = new THREE.Group(); sock.position.set(-3.1, 0, -2.4); g.add(sock);
    put(sock, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 3.2, 10), M.steel), 0, 1.6, 0);
    put(sock, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 12), M.metal), 0, 0.04, 0);
    const cone = new THREE.Group(); cone.position.set(0, 3.1, 0); cone.rotation.set(0, 0.8, -1.25); sock.add(cone);
    put(cone, new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 20), M.steel), 0, 0, 0, false).rotation.x = Math.PI / 2;
    const sockMats = [M.std({ color: srgb(0xf97316), roughness: 0.7, side: THREE.DoubleSide }), M.std({ color: srgb(0xf8fafc), roughness: 0.7, side: THREE.DoubleSide })];
    for (let k = 0; k < 5; k++) { const r0 = 0.2 - k * 0.025, r1 = 0.2 - (k + 1) * 0.025; put(cone, new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, 0.24, 18, 1, true), sockMats[k % 2]), 0, -0.12 - k * 0.24, 0); }
    g.userData.sock = cone;
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
  // Weg-Textur in hoher Auflösung (quer 0 … 1 = Wegbreite, längs 5 m): kind = "boots" (Stiefelabdrücke), "rover" (Radspuren + Abdrücke), "gravel" (Kies)
  function pathTex([cr, cg, cb], kind) {
    const key = `${cr},${cg},${cb},${kind}`;
    if (pathTexCache[key]) return pathTexCache[key];
    const W = 128, H = 512;
    const t = canvasTex(W, H, (c) => {
      const img = c.createImageData(W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / (W - 1), n = fbm2p(x / 16, y / 16, 32) - 0.5, g = hash2(x * 1.7, y * 1.3) - 0.5, i = (y * W + x) * 4;
        const edge = Math.max(0, Math.min(1, (Math.min(u, 1 - u) / 0.2) + (fbm2p(x / 8 + 7, y / 8, 64) - 0.5) * 0.9)); // ausgefranster Rand
        const k = 1 + n * 0.22 + g * (kind === "gravel" ? 0.3 : 0.12);
        img.data[i] = cr * k; img.data[i + 1] = cg * k; img.data[i + 2] = cb * k; img.data[i + 3] = 235 * edge;
      }
      c.putImageData(img, 0, 0);
      c.globalCompositeOperation = "source-atop"; // alles Weitere nur dort, wo Weg ist
      const wrap = (fn) => { for (const oy of [-H, 0, H]) fn(oy); };
      const boot = (x, y, a, foot) => wrap((oy) => { // Stiefelabdruck (ca. 12 × 30 cm) mit Profil-Rillen
        c.save(); c.translate(x, y + oy); c.rotate(a); c.scale(1, 1);
        c.fillStyle = "rgba(0,0,0,0.30)"; c.beginPath(); c.ellipse(0, -7, 4.6, 9, 0, 0, 7); c.ellipse(0, 9, 3.8, 6.5, 0, 0, 7); c.fill();
        c.strokeStyle = "rgba(0,0,0,0.28)"; c.lineWidth = 1; for (let k = -14; k <= 14; k += 3) { c.beginPath(); c.moveTo(-4, k); c.lineTo(4, k); c.stroke(); }
        c.strokeStyle = "rgba(255,255,255,0.18)"; c.beginPath(); c.ellipse(foot * 0.6, -7, 5.2, 9.6, 0, Math.PI * 0.6, Math.PI * 1.4); c.stroke();
        c.restore();
      });
      if (kind === "boots") { // Wegrand: eine Reihe heller Steinchen links und rechts – so sieht man den Weg auch, wo der Boden ähnlich dunkel ist
        for (const eu of [0.13, 0.87]) for (let k = 0; k < 64; k++) { const x = eu * W + (hash2(k, eu * 10) - 0.5) * 7, y = k * 8 + (hash2(k, 31) - 0.5) * 5, r = 1.6 + hash2(k, 32 + eu) * 2.2; wrap((oy) => { c.fillStyle = "rgba(0,0,0,0.35)"; c.beginPath(); c.ellipse(x + 1, y + oy + 1.5, r, r * 1.3, 0, 0, 7); c.fill(); c.fillStyle = `rgba(${200 + hash2(k, 33) * 40},${196 + hash2(k, 33) * 40},${190 + hash2(k, 33) * 40},0.95)`; c.beginPath(); c.ellipse(x, y + oy, r, r * 1.3, 0, 0, 7); c.fill(); }); }
      }
      if (kind === "boots" || kind === "rover") {
        const lanes = kind === "rover" ? [0.5] : [0.36, 0.62];
        lanes.forEach((lu, li) => { for (let k = 0; k < 18; k++) { const y = (k + li * 0.5) * (H / 18) + (hash2(k, li + 3) - 0.5) * 8, foot = k % 2 ? 1 : -1; boot(lu * W + foot * 5 + (hash2(k, li + 9) - 0.5) * 6, y, (hash2(k, li + 11) - 0.5) * 0.25, foot); } });
      }
      if (kind === "rover") { // zwei Radspuren mit Stollen-Muster
        for (const tu of [0.2, 0.8]) {
          c.fillStyle = "rgba(0,0,0,0.20)"; c.fillRect(tu * W - 8, 0, 16, H);
          c.fillStyle = "rgba(0,0,0,0.22)"; for (let y = 0; y < H; y += 7) { c.beginPath(); c.moveTo(tu * W - 8, y); c.lineTo(tu * W, y + 3); c.lineTo(tu * W + 8, y); c.lineTo(tu * W + 8, y + 2.5); c.lineTo(tu * W, y + 5.5); c.lineTo(tu * W - 8, y + 2.5); c.fill(); }
          c.fillStyle = "rgba(255,255,255,0.10)"; c.fillRect(tu * W - 10, 0, 2, H); c.fillRect(tu * W + 8, 0, 2, H);
        }
      }
      if (kind === "gravel") { // Kiesel und eine fest getretene Mitte
        c.fillStyle = "rgba(0,0,0,0.06)"; c.fillRect(W * 0.3, 0, W * 0.4, H);
        for (let k = 0; k < 2600; k++) { const x = hash2(k, 21) * W, y = hash2(k, 22) * H, r = 0.8 + hash2(k, 23) * 1.8, v = hash2(k, 24); c.fillStyle = v > 0.5 ? `rgba(255,250,235,${0.35 + v * 0.3})` : `rgba(60,50,40,${0.2 + v * 0.3})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      }
    });
    t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return (pathTexCache[key] = t);
  }
  // Wegmarke am Rand: "pole" = Stab mit Reflektor und kleiner Solarlampe (Mond, Merkur), "cairn" = Steinmännchen mit Fähnchen (Mars)
  function pathMarker(kind) {
    const g = new THREE.Group();
    if (kind === "pole") {
      const alu = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.8, roughness: 0.3 });
      const stripe = canvasTex(16, 64, (c) => { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? "#ffffff" : "#f97316"; c.fillRect(0, i * 16, 16, 16); } });
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 16), alu), 0, 0.025, 0);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.05, 10), alu), 0, 0.55, 0);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 12), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.4, emissive: 0x331100, emissiveIntensity: 0.4 })), 0, 0.85, 0);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.05, 14), alu), 0, 1.1, 0, false);
      put(g, new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, toneMapped: false })), 0, 1.14, 0, false);
    } else if (kind === "cairn") {
      const rock = new THREE.MeshStandardMaterial({ color: srgb(0x8a4a2e), roughness: 1, vertexColors: true, flatShading: true });
      let y = 0;
      for (let i = 0; i < 4; i++) { const sx = 0.32 - i * 0.06, sy = 0.11 - i * 0.012, m = new THREE.Mesh(naturalRockGeo(90 + i, 1), rock); m.scale.set(sx, sy, sx * 0.85); m.position.set((hash2(i, 5) - 0.5) * 0.04, y + sy * 0.6, 0); m.rotation.y = i * 1.3; m.castShadow = true; g.add(m); y += sy * 1.45; }
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 5), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7, roughness: 0.4 })), 0.05, y + 0.4, 0, false);
      const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(0.22, -0.06); fl.lineTo(0, -0.13); fl.closePath();
      put(g, new THREE.Mesh(new THREE.ShapeGeometry(fl), new THREE.MeshStandardMaterial({ color: srgb(0xf97316), roughness: 0.6, side: THREE.DoubleSide })), 0.05, y + 0.84, 0, false);
    }
    return g;
  }
  // Der Rundgang: ein durchgehender Pfad von der Rakete über alle Stationen in der Reihenfolge der Führung, dazu Wegmarken am Rand
  function drawTour(B, L, col, w = 2, kind = "boots", marker = null) {
    const pts = [[L.spawn[0] + 2, L.spawn[1] + 2]];
    for (const k of [...cfg.guide.order, "wand"]) for (const p of (L.route[k] || [])) pts.push(p);
    makePath(B, pts, w, col, kind);
    if (!marker) return;
    const near = Object.values(L).filter((v) => Array.isArray(v) && v.length === 2 && typeof v[0] === "number"), marks = [], markG = new THREE.Group();
    let acc = 6, side = 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az); if (len < 0.01) continue;
      for (let d = 12 - acc; d < len; d += 12) {
        const x = ax + ((bx - ax) * d) / len + ((bz - az) / len) * side * (w / 2 + 0.9), z = az + ((bz - az) * d) / len - ((bx - ax) / len) * side * (w / 2 + 0.9);
        side = -side;
        if (d < 3.5 || d > len - 3.5 || Math.hypot(x, z) < 8 || near.some(([px, pz]) => Math.hypot(px - x, pz - z) < 5)) continue; // nicht an der Rakete und nicht mitten in eine Station
        const m = pathMarker(marker); m.position.set(x, B.meshHeight(x, z), z); m.rotation.y = hash2(x, z) * 6.3; markG.add(m); marks.push([x, z]);
      }
      acc = (acc + len) % 12;
    }
    B.scene.add(mergeStatic(markG));
    B.pathMarks = marks;
  }
  function makePath(B, pts, w = 2.2, col, kind) {
    const P = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.8));
      for (let k = 0; k < n; k++) P.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    }
    P.push(pts[pts.length - 1]);
    const pos = [], uv = [], idx = [], AC = [-1, -0.5, 0, 0.5, 1], N = AC.length, Hm = B.meshHeight || B.height; // 5 Punkte quer: liegt auch in Mulden sauber auf
    let dist = 0;
    P.forEach(([x, z], i) => {
      const [px, pz] = P[Math.max(0, i - 1)], [nx, nz] = P[Math.min(P.length - 1, i + 1)];
      let dx = nx - px, dz = nz - pz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      if (i) dist += Math.hypot(x - P[i - 1][0], z - P[i - 1][1]);
      for (const s of AC) {
        const vx = x - dz * s * w / 2, vz = z + dx * s * w / 2;
        pos.push(vx, Hm(vx, vz) + 0.045, vz); uv.push((s + 1) / 2, dist / 5);
      }
      if (i) for (let j = 0; j < N - 1; j++) { const a = (i - 1) * N + j, b = i * N + j; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: kind ? pathTex(col, kind) : marsPathTex(col), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
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
    const I = MARS_ICE, alongIce = (k) => [L.curling[0] + I.dx * k, L.curling[1] + I.dz * k];
    const craters = [[60, -40, 16, 2], [-75, 65, 14, 1.8], [90, 50, 10, 1.2], [-45, -75, 18, 2.4], [45, 100, 12, 1.6], [70, 5, 6, 0.8], [I.cx, I.cz, 17, 1.2]];
    craters.push(...scatterCraters(L, [[I.cx, I.cz, 24], [...L.spawn, 6], [...L.station, 22], [L.station[0], L.station[1] + 16, 28], [...L.monde, 7], [...L.vulkan, 8], [...L.rover, 10], [...L.roverStart, 8], [...L.roverZiel, 24], [...L.eis, 9], [...L.wegweiser, 4], [...L.abend, 8], [...L.pad, 9], [...L.teufel, 6], [48, 62, 20], ...craters.map(([x, z, r]) => [x, z, r])], W.fast ? 16 : 28, 777, 1.8, 6, 200));
    const up = (p, r) => [...p, r, "auto", 3]; // Plätze oben auf der Hochebene: eben, aber auf ihrer Höhe
    const flats = [up([0, 0], 10), [...L.station, 20], [L.station[0], L.station[1] + 16, 26], [...L.waage, 4], up(L.monde, 5), up(L.vulkan, 6), [...L.rover, 7], [...L.roverStart, 5], [...L.eis, 7], [...L.pad, 7], up(L.abend, 5), up(L.wegweiser, 2.5), up(MARS_MAST(L.abend), 2)];
    // Eisboden im Krater: drei Ebenen auf gleicher Höhe längs der Bahn
    const iceLvl = makeHeight(craters, [], 40, (x, z) => marsDunes(x, z) + marsPlateau(x, z))(I.cx, I.cz) + 0.3;
    for (const k of [1, 12, 23]) flats.push([...alongIce(k), 10, iceLvl, 4]);
    const dustColors = ["rgba(190,110,70,1)", "rgba(170,95,60,0.9)"];
    const B = buildBase({
      height: makeHeight(craters, flats, 40, (x, z) => marsDunes(x, z) + marsPlateau(x, z)),
      // dünne, staubige Luft: gelbbrauner Himmel, Dunst in der Ferne, keine Sterne am Tag, die Sonne wirkt kleiner als auf der Erde
      sky: MARS_SKY.getHex(), fog: [90, 430], stars: false, sunSize: 105,
      ground: 0xb8623a, rock: 0x5a2c1c,
      tint: (x, z) => {
        let m = 0.75 + 0.25 * fbm2(x * 0.015 + 9, z * 0.015), r = m, g = m * 0.95, b = m * 0.9;
        const d = duneMask(x, z); // in den Dünen: feiner, hellerer Sand
        if (d > 0) { r += (1.08 - r) * d; g += (0.86 - g) * d; b += (0.62 - b) * d; }
        const cliff = marsPlateau(x, z); // Gesteinsschichten an der Steilkante
        if (cliff > 0.4 && cliff < 7.6) { const band = 0.82 + 0.18 * Math.sin(cliff * 5.5); r *= band; g *= band * 0.96; b *= band * 0.92; }
        const delta = smooth(30, 12, Math.hypot(x - L.roverZiel[0], z - L.roverZiel[1])); // helles Flussdelta mit Rinnen
        if (delta > 0) { const ch = 0.5 + 0.5 * Math.sin((x - L.roverZiel[0]) * 0.5 + Math.sin(z * 0.2) * 3); r += (1.15 * (0.9 + 0.1 * ch) - r) * delta; g += (0.92 * (0.9 + 0.1 * ch) - g) * delta; b += (0.7 - b) * delta; }
        const bas = smooth(0.58, 0.72, fbm2(x * 0.022 + 31, z * 0.022 - 7)) * (1 - d); // dunkler Basaltsand
        if (bas > 0) { r *= 1 - 0.32 * bas; g *= 1 - 0.36 * bas; b *= 1 - 0.3 * bas; }
        m = 0.9 + 0.1 * hash2(Math.floor(x * 2), Math.floor(z * 2)); // feine Körnung
        return [r * m, g * m, b * m];
      },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [L.station[0], L.station[1] + 16, 26], [...L.monde, 6], [...L.vulkan, 6], [...L.rover, 8],
        [...L.roverZiel, 3], [...L.eis, 7], [...L.wegweiser, 3], [...L.abend, 6], [I.cx, I.cz, 19]],
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
    on(makeHeliPad(), ...L.vulkan, 0.0);
    const field = on(makeFlightField(M), ...L.vulkan);
    const toGoal = Math.atan2(L.roverZiel[0] - L.rover[0], L.roverZiel[1] - L.rover[1]);
    const console_ = on(makeConsole(), ...L.rover); // Steuerpult vor dem Leitstand
    console_.rotation.y = toGoal + Math.PI;
    const hut = on(makeRoverHut(M), L.rover[0] + Math.cos(toGoal) * 3.8, L.rover[1] - Math.sin(toGoal) * 3.8); // neben dem Pult (nicht hinter dem Rover, sonst verdeckt er die Kamera), Fenster und Schild zur Rakete hin
    hut.rotation.y = Math.atan2(L.spawn[0] - hut.position.x, L.spawn[1] - hut.position.z);
    const carport = on(makeCarport(M), ...L.roverStart); carport.rotation.y = MARS_ROVER_PARK;
    const rover = on(makeSolarRover(M), ...L.roverStart); // Solar-Rover wie Spirit und Opportunity
    const samples = roverSamples(L).map(([x, z], i) => {
      const rock = on(makeSampleRock(i), x, z); scene.add(rock.userData.tube);
      const mk = makeMarker(); mk.scale.setScalar(0.9);
      mk.userData.beam.material.color.set(0xfcd34d); mk.userData.ring.material.color.set(0xfcd34d); mk.userData.pad.material.color.set(0xfcd34d);
      mk.userData.setIcon("🪨", 0xfcd34d);
      on(mk, x, z); mk.visible = false;
      return { i, x, z, mk, rock, done: false };
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
    // Eis-Krater: Eisfläche mit Staub am Rand, Zielscheibe, Eisstein, Ständer mit Ersatzsteinen und Schild
    const ice = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ map: marsIceTex(), roughness: 0.22, metalness: 0.05, transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
    ice.rotation.x = -Math.PI / 2; ice.rotation.z = Math.atan2(-I.dz, I.dx); ice.scale.set(I.a + 1.2, I.b + 1.2, 1); ice.receiveShadow = true;
    on(ice, I.cx, I.cz, 0.02);
    const lane = curlLane(L), curl = makeCurling();
    curl.target.position.set(lane.tx, height(lane.tx, lane.tz) + 0.05, lane.tz); scene.add(curl.target, curl.stone, curl.arrow);
    curl.stone.visible = curl.arrow.visible = false;
    const startRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 32), new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.8, depthWrite: false }));
    startRing.rotation.x = -Math.PI / 2; on(startRing, lane.sx + lane.dx * 1.4, lane.sz + lane.dz * 1.4, 0.05);
    const cside = [-lane.dz, lane.dx]; // quer zur Bahn: Schild und Steine-Ständer
    on(makeSignBoard(M, "🥌 EIS-KRATER · CURLING", "#0e7490", 3), lane.sx - cside[0] * 3.2 - lane.dx * 1.5, lane.sz - cside[1] * 3.2 - lane.dz * 1.5).rotation.y = Math.atan2(-lane.dx, -lane.dz);
    const rackAt = [lane.sx + cside[0] * 2.6, lane.sz + cside[1] * 2.6];
    for (let i = 0; i < 3; i++) { const st = makeCurling().stone; st.rotation.y = i * 1.3; on(st, rackAt[0] + lane.dx * (i - 1) * 0.75, rackAt[1] + lane.dz * (i - 1) * 0.75, 0.03); }
    const magnetTable = on(makeMagnetTable(), ...L.rost); // unter dem Vordach „Proben-Labor“
    magnetTable.rotation.y = Math.atan2(LAB_DIR.x, LAB_DIR.z);
    // Trampelpfad: der Rundgang, den Mia mit dem Kind läuft – über die Hochebene, die Rampe hinab ins Tal, durch den Außenposten
    drawTour(B, L, [196, 128, 86], 2.1, "rover", "cairn"); // Mars: Rover-Spuren und Abdrücke, Steinmännchen am Rand
    on(makeSignBoard(M, "🏞️ ALTES FLUSSDELTA", "#c84a12", 2.8), L.roverZiel[0] + 6, L.roverZiel[1] - 6).rotation.y = Math.atan2(L.rover[0] - L.roverZiel[0], L.rover[1] - L.roverZiel[1]);
    on(makeSignBoard(M, "⬇️ ZUM AUSSENPOSTEN", "#0d9488", 2.6), -32, 10).rotation.y = Math.atan2(32, -10);
    // Landschaft mit Charakter: Himmelsverlauf, Tafelberge am Horizont, Felsgruppen, Staubschleier, ein Rover auf Patrouille
    const skyDome = makeSkyDome(1.12, 0.74); skyDome.material.color.copy(MARS_SKY); scene.add(skyDome);
    const bands = bandTexture(["#8a4a33", "#9b5a3f", "#7a3f2b", "#a8694a", "#8f5038", "#b37757"], 3); // gedämpfte Rottöne, die im Dunst verschwimmen
    const buttes = [[-150, 120, 34, 42], [175, 95, 26, 30], [135, -165, 40, 36], [-195, -28, 30, 48], [60, 215, 44, 28], [-60, -205, 24, 26]];
    buttes.slice(0, rich ? 6 : 3).forEach(([x, z, r, h], i) => on(makeButte(r, h, bands, i * 7 + 1), x, z, h / 2 - 3));
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a2418, roughness: 0.95, vertexColors: true });
    rockMat.userData.natural = true;
    const clusters = [[38, 14, 6], [34, 30, 5], [9, -9, 5], [-10, 36, 6], [38, 64, 5], [-46, 58, 6], [12, 30, 4], [-50, 8, 5], [28, -30, 6], [-18, -12, 4]];
    clusters.slice(0, rich ? 10 : 5).forEach(([x, z, n], i) => rockCluster(B, x, z, n, rockMat, i * 13 + 2));
    const veils = rich ? makeDustVeils("rgba(210,150,100,1)", 9) : new THREE.Group(); scene.add(veils);
    const patrol = on(patrolRover, 48, 62);
    const patrolCol = [48, 62, 1.8];
    // Leben: zwei Mitbewohner und ein Raumtransporter mit eigenem Landeplatz
    const npcs = addNpcs(B);
    const landing = makeHeliPad(); landing.scale.set(2.4, 1, 2.4); on(landing, ...L.pad, 0.0); // Landeplatz des Transporters
    const shuttle = makeShuttle(B, L.pad);

    for (const [x, z, r] of [[...L.monde, 3.2], [...L.vulkan, 2.3], [...L.rover, 1.1], [...L.eis, 1.6], [...L.wegweiser, 1.2], [...L.abend, 1], [...L.roverStart, 2.8]]) addBlob(B, x, z, r);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, rover: L.rover, rost: L.rost, curling: L.curling, vulkan: L.vulkan, monde: L.monde, abend: L.abend, eis: L.eis, teufel: L.teufel,
      wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] }, { monde: MARS_SCOPE_DOOR(L.monde) });

    const hutAt = [hut.position.x, hut.position.z], parkP = (x, z) => [L.roverStart[0] + x * Math.cos(MARS_ROVER_PARK) + z * Math.sin(MARS_ROVER_PARK), L.roverStart[1] - x * Math.sin(MARS_ROVER_PARK) + z * Math.cos(MARS_ROVER_PARK)];
    const colliders = [...ROCKET_COLLIDERS, [...L.monde, 2.9], [...L.vulkan, 0.7], [L.vulkan[0] + 2.2, L.vulkan[1] + 4.2, 1.3], [L.vulkan[0] - 3.1, L.vulkan[1] - 2.4, 0.2], [...L.rover, 1], [...L.eis, 0.9], [...L.wegweiser, 0.3], [...hutAt, 2.5],
      [L.eis[0] + 2.7, L.eis[1] + 1.7, 1.3], [L.eis[0] + 1.5, L.eis[1] - 0.5, 0.6], [L.eis[0] + 4.3, L.eis[1] - 0.3, 0.2], [...MARS_MAST(L.abend), 0.3],
      ...[[-1.8, -2.4], [1.8, -2.4], [-1.8, 2.4], [1.8, 2.4]].map(([x, z]) => [...parkP(x, z), 0.2]),
      [...L.rost, 1], [...L.abend, 0.5], [...L.roverZiel, 0.7], [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25],
      ...marsCampColliders(L.station), ...canopyColliders(L.station), patrolCol, ...npcs.map((n) => n.col), [...L.pad, 4.5], [...rackAt, 0.9]];
    for (const [x, z, n] of clusters) if (n >= 5) colliders.push([x, z, 1.2]); // die großen Felsgruppen kann man nicht durchlaufen

    return { ...B, L, curl, lane, station, scale, telescope, phobos, deimos, volcano, volcanoLabel, everest, zugspitze, heli, heliY: heli.position.y, rover, samples, drill,
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
    for (const s of world.samples) { s.done = false; s.mk.visible = true; s.rock.userData.tube.visible = false; if (s.mark) { s.mark.removeFromParent(); s.mark = null; } }
    roverArmPose(r.userData.arm, 0); $("roverCam").classList.add("hidden");
    world.devil.userData.goal = null;
    scopeSay(`${T.start} (${isTouch() ? T.keysTouch : T.keys})`);
    roverHud();
  }
  function roverHud() {
    const sp = view.special, T = cfg.rover;
    chalHud(T.label, sp.bat, fmtVars(T.samples, { n: sp.got }) + (sp.dusty ? " · ☀️ Solarzellen staubig!" : ""), sp.bat < 0.25, true);
  }
  function roverSample(s) {
    const sp = view.special, r = world.rover;
    s.done = true; s.mk.visible = false; sp.got++; sp.last = s;
    sp.phase = "scan"; sp.st = 0; sp.said = false; sp.acted = false; sp.contact = null; r.userData.speed = 0;
    Sound.collect();
    const h = Math.atan2(s.x - r.position.x, s.z - r.position.z);
    sp.stop = { x: s.x - Math.sin(h) * 1.85, z: s.z - Math.cos(h) * 1.85, h }; // dort hält der Rover, die Nase zum Stein
  }
  // Knöpfe unter dem Text setzen, ohne etwas vorzulesen
  function scopeBtns(buttons) {
    const host = $("scopeBtns"); host.innerHTML = "";
    for (const [label, fn, primary] of buttons) { const b = document.createElement("button"); b.className = "btn " + (primary ? "primary" : "ghost"); b.textContent = label; b.onclick = () => { Sound.click(); fn(); }; host.appendChild(b); }
    host.classList.toggle("hidden", !host.children.length);
  }
  // Wo das Werkzeug den Stein berührt: von oben auf den Stein „tasten“ (Seite zum Rover hin)
  function roverContact(s) {
    const r = world.rover, fx = Math.sin(r.userData.heading), fz = Math.cos(r.userData.heading), x = s.x - fx * 0.45, z = s.z - fz * 0.45;
    const ray = new THREE.Raycaster(new V(x, world.height(x, z) + 4, z), new V(0, -1, 0)), hit = ray.intersectObject(s.rock, true)[0];
    if (!hit) return { p: new V(x, world.height(x, z) + 0.05, z), n: new V(0, 1, 0) };
    return { p: hit.point.clone(), n: hit.face.normal.clone().transformDirection(hit.object.matrixWorld) };
  }
  function roverMark(s, c, color, r) { // Spur auf dem Stein: geschliffener Kreis bzw. Bohrloch
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshStandardMaterial({ color: srgb(color), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.position.copy(c.p).addScaledVector(c.n, 0.01); m.quaternion.setFromUnitVectors(new V(0, 0, 1), c.n); world.scene.add(m); s.mark = m;
  }
  // Nahbild der Rover-Kamera (gezeichnet): Kügelchen, Schichten mit geschliffenem Kreis, Bohrloch und Röhrchen
  function drawRoverCam(i) {
    const cv = $("roverCam"), c = cv.getContext("2d"), W = cv.width, H = cv.height, T = cfg.rover;
    const base = [["#c9935f", "#b07a4a"], ["#c98a55", "#a9683c"], ["#8f5a3d", "#6e4129"]][i];
    c.fillStyle = base[0]; c.fillRect(0, 0, W, H);
    for (let k = 0; k < 2600; k++) { c.fillStyle = hash2(k, i + 1) > 0.5 ? base[1] : "rgba(255,230,190,0.35)"; const s = 1 + hash2(k, 9) * 2.5; c.fillRect(hash2(k, 3) * W, hash2(k, 4) * H, s, s); }
    if (i === 0) {
      for (let k = 0; k < 46; k++) {
        const x = hash2(k, 11) * W, y = hash2(k, 12) * H, r = 9 + hash2(k, 13) * 16;
        c.fillStyle = "rgba(60,35,20,0.35)"; c.beginPath(); c.ellipse(x + r * 0.3, y + r * 0.35, r, r * 0.8, 0, 0, 7); c.fill();
        const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, "#9fb0c8"); g.addColorStop(0.35, "#56627a"); g.addColorStop(1, "#262d3a");
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      }
    } else if (i === 1) {
      const cols = ["#d9a46c", "#b8693e", "#e7c08c", "#a95a34", "#d59a63", "#c47f4f"];
      for (let y = 0; y < H; y += 2) { const b = Math.floor((y + Math.sin(y * 0.02) * 10) / 26); c.fillStyle = cols[((b % 6) + 6) % 6]; c.globalAlpha = 0.55; c.fillRect(0, y + Math.sin(y * 0.05) * 2, W, 2); }
      c.globalAlpha = 1; c.strokeStyle = "rgba(90,45,20,0.35)"; c.lineWidth = 1;
      for (let k = 0; k < 40; k++) { const y = hash2(k, 21) * H, x = hash2(k, 22) * W; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 40, y + 9); c.stroke(); } // feine Schrägschichtung
      c.save(); c.beginPath(); c.arc(W * 0.55, H * 0.5, 82, 0, 7); c.clip();                       // geschliffener Kreis: frischer Stein, Farben kräftig
      for (let y = 0; y < H; y += 2) { const b = Math.floor((y + Math.sin(y * 0.02) * 10) / 26); c.fillStyle = cols[((b % 6) + 6) % 6]; c.fillRect(0, y, W, 2); }
      c.strokeStyle = "rgba(255,255,255,0.18)"; for (let rr = 10; rr < 82; rr += 6) { c.beginPath(); c.arc(W * 0.55, H * 0.5, rr, 0, 7); c.stroke(); }
      c.restore(); c.strokeStyle = "rgba(40,20,10,0.6)"; c.lineWidth = 4; c.beginPath(); c.arc(W * 0.55, H * 0.5, 83, 0, 7); c.stroke();
    } else {
      const g = c.createRadialGradient(W * 0.3, H * 0.5, 4, W * 0.3, H * 0.5, 46); g.addColorStop(0, "#1a0f0a"); g.addColorStop(0.7, "#3a2216"); g.addColorStop(1, "rgba(60,35,22,0)");
      c.fillStyle = g; c.beginPath(); c.arc(W * 0.3, H * 0.5, 46, 0, 7); c.fill();                      // Bohrloch
      c.save(); c.translate(W * 0.68, H * 0.52); c.rotate(-0.25);                                       // Röhrchen mit Bohrkern
      const tg = c.createLinearGradient(0, -26, 0, 26); tg.addColorStop(0, "#ffffff"); tg.addColorStop(0.5, "#c9ccd2"); tg.addColorStop(1, "#8d939c");
      c.fillStyle = tg; c.beginPath(); if (c.roundRect) c.roundRect(-110, -26, 220, 52, 24); else c.rect(-110, -26, 220, 52); c.fill();
      c.fillStyle = "#6e4129"; c.fillRect(-70, -14, 120, 28); c.fillStyle = "rgba(255,255,255,0.25)"; c.fillRect(-70, -14, 120, 6);
      c.fillStyle = "#334155"; c.font = "bold 15px sans-serif"; c.fillText("Probe Nr. 3", -100, 44); c.restore();
    }
    // Kamera-Einblendung: Ecken, Aufnahme-Punkt, Maßstab, Beschriftung
    c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 3;
    for (const [x, y, dx, dy] of [[12, 12, 1, 1], [W - 12, 12, -1, 1], [12, H - 12, 1, -1], [W - 12, H - 12, -1, -1]]) { c.beginPath(); c.moveTo(x, y + dy * 24); c.lineTo(x, y); c.lineTo(x + dx * 24, y); c.stroke(); }
    c.fillStyle = "#ef4444"; c.beginPath(); c.arc(W - 30, 30, 7, 0, 7); c.fill();
    c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(0, H - 38, W, 38);
    c.fillStyle = "#fff"; c.font = "bold 18px sans-serif"; c.textBaseline = "middle"; c.fillText(T.cam ? T.cam[i] : "", 16, H - 19);
    c.fillRect(W - 112, H - 22, 80, 4); c.font = "bold 13px sans-serif"; c.fillText("1 cm", W - 92, H - 31);
  }
  function roverNext() { // Knopf „Weiterfahren“: Bild weg, Arm einklappen, dann fahren
    const sp = view.special, T = cfg.rover;
    $("roverCam").classList.add("hidden"); scopeBtns([]); $("scopeText").textContent = T.nextHint;
    sp.phase = "stow"; sp.st = 0;
    if (sp.got === 1 && sp.dustAt < 0) sp.dustAt = sp.t + 6; // bald danach: Staub (aber erst, wenn niemand mehr spricht)
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
    { const k = Math.min(1, Math.abs(u.speed) / ROVER_SPEED); Sound.loop("rover", sp.phase === "drive" ? 0.25 + 0.75 * k : 0, k); } // Motor: leises Summen im Stand, lauter und höher beim Fahren
    if (sp.phase === "drive") {
      u.speed += ((sp.bat > 0 ? sp.iy * ROVER_SPEED : 0) - u.speed) * Math.min(1, dt * 2.5);
      u.heading -= sp.ix * 1.3 * dt * (u.speed < -0.2 ? -1 : 1);
      // Batterie: Fahren kostet Strom, mit Staub auf den Solarzellen viel mehr
      if (sp.charge > 0) { sp.charge -= dt; sp.bat = Math.min(1, sp.bat + dt * 0.9); }
      else sp.bat = Math.max(0, sp.bat - dt * (0.006 + 0.0045 * Math.abs(u.speed)) * (sp.dusty ? 3.2 : 1));
      if (sp.bat <= 0) { sp.phase = "charge"; sp.ct = 0; u.speed = 0; Sound.wrong(); scopeSay(T.empty); }
      for (const s of world.samples) if (!s.done && Math.hypot(r.position.x - s.x, r.position.z - s.z) < 2.6) { roverSample(s); break; }
      if (sp.dustAt > 0 && sp.t > sp.dustAt && !sp.dusty && sp.phase === "drive" && !Voice.busy()) { sp.dustAt = 0; roverDust(); } // nie mitten in einen Satz hinein
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
    } else if (sp.phase === "scan") { // heranfahren, Arm ausfahren, Werkzeug arbeiten lassen, dann das Nahbild zeigen
      const s = sp.last, A = u.arm, T2 = cfg.rover; sp.st += dt; u.speed = 0;
      if (sp.st >= 1.2 && sp.st - dt < 1.2) Sound.servo(); // der Arm fährt aus
      if (sp.st < 1.2) { const k = 1 - Math.exp(-dt * 4); r.position.x += (sp.stop.x - r.position.x) * k; r.position.z += (sp.stop.z - r.position.z) * k; u.heading = angleLerp(u.heading, sp.stop.h, k); for (const w of u.wheels) w.rotation.x += dt * 3; }
      else {
        if (!sp.contact) { r.updateMatrixWorld(true); sp.contact = roverContact(s); sp.local = r.worldToLocal(sp.contact.p.clone()); }
        roverArmPose(A, smooth(1.2, 2.5, sp.st), sp.local);
        if (sp.st > 2.5 && !sp.said) { sp.said = true; scopeSay(sp.got >= 3 ? `${T2.sample[s.i]}\n\n🎉 ${T2.done}` : T2.sample[s.i]); }
        if (sp.st > 2.5 && sp.st < 4.9) { // Werkzeug bei der Arbeit
          if (s.i === 0) { const f = (sp.st - 2.5) % 0.7; A.flash.visible = f < 0.1; if (f < dt) Sound.shutter(); }
          else {
            A.turret.rotation.y += dt * (s.i === 1 ? 14 : 26); A.wrist.position.x = (Math.random() - 0.5) * 0.008;
            if (Math.random() < dt * 14) grains(tmp.copy(sp.contact.p).setY(sp.contact.p.y + 0.05), 2, 0.35, 0, 0, 0.6);
          }
        }
        if (sp.st > 4.9 && !sp.acted) {
          sp.acted = true; A.flash.visible = false; A.wrist.position.x = 0;
          if (s.i === 1) roverMark(s, sp.contact, 0xf0c48e, 0.09);
          if (s.i === 2) { roverMark(s, sp.contact, 0x1c120c, 0.035); const t = s.rock.userData.tube, fx = Math.sin(u.heading), fz = Math.cos(u.heading); t.position.set(r.position.x + fx * 1.2 + fz * 0.9, 0, r.position.z + fz * 1.2 - fx * 0.9); t.position.y = world.height(t.position.x, t.position.z) + 0.03; t.rotation.set(0, u.heading + 0.6, Math.PI / 2, "YXZ"); t.visible = true; Sound.click(); }
          drawRoverCam(s.i); $("roverCam").classList.remove("hidden"); Sound.ping(1175);
          if (sp.got >= 3) { sp.phase = "done"; Sound.correct(); UI.confetti(80); endChallengeHud(); scopeBtns([[T2.doneBtn, endRover, true]]); }
          else { sp.phase = "look"; scopeBtns([[T2.next, roverNext, true]]); }
        }
      }
    } else if (sp.phase === "look") u.speed = 0; // Nahbild anschauen, bis „Weiterfahren“ gedrückt wird
    else if (sp.phase === "stow") { sp.st += dt; u.speed = 0; roverArmPose(u.arm, 1 - smooth(0, 1.1, sp.st), sp.local); if (sp.st > 1.1) sp.phase = "drive"; }
    else u.speed *= Math.exp(-dt * 6);
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
    const close = (sp.phase === "scan" && sp.st > 0.6) || sp.phase === "look" || (sp.phase === "done" && sp.contact) || (sp.phase === "stow" && sp.st < 0.5);
    if (close && sp.contact) { // seitlich vorn, etwas tiefer: man sieht den Arm arbeiten
      const cp = sp.contact.p, lx = Math.cos(u.heading), lz = -Math.sin(u.heading);
      want.set(cp.x + lx * 2.9 - fx * 0.2, cp.y + 1.5, cp.z + lz * 2.9 - fz * 0.2);
      c.position.lerp(want, 1 - Math.exp(-dt * 2.5)); view.look.lerp(tmp2.set(cp.x - fx * 0.3, cp.y + 0.25, cp.z - fz * 0.3), 1 - Math.exp(-dt * 3)); c.lookAt(view.look);
      return;
    }
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
    $("roverCam").classList.add("hidden"); roverArmPose(world.rover.userData.arm, 0);
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
    if (u.head) u.head.position.y = u.rod.position.y + 1.2; // der Bohrkopf fährt mit dem Gestänge am Mast hinunter
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
    { // Teile der Station, die außerhalb der ebenen Fläche stehen, auf den Boden setzen (tiefster Punkt ihrer Füße)
      station.updateMatrixWorld(true);
      const snaps = []; station.traverse((o) => { if (o.userData.snap) snaps.push(o); });
      for (const o of snaps) { let mn = Infinity; for (const [x, z] of o.userData.snap) { const q = o.localToWorld(new V(x, 0, z)); mn = Math.min(mn, B.height(q.x, q.z) - q.y); } o.position.y += mn; }
    }
    const colliders = [...ROCKET_COLLIDERS, [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25], ...(CAMP_COLLIDERS[style] || stationColliders)(L.station), ...(style && style !== "erde" ? canopyColliders(L.station) : [])];
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
  // Planetenmodell wie im Museum: gedrechselter Fuß, Tischplatte mit Gradskala, Bahnen aus Messing, leuchtende Sonne,
  // die Planeten sitzen auf Armen, die sich um die Sonne drehen
  function makeOrrery(planetId, rP, rE) {
    const g = new THREE.Group();
    const bronze = new THREE.MeshStandardMaterial({ color: srgb(0x2b2622), roughness: 0.45, metalness: 0.6 }), brass = new THREE.MeshStandardMaterial({ color: srgb(0xc9a227), roughness: 0.3, metalness: 0.85 });
    const foot = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.62, 0], [0.62, 0.06], [0.45, 0.14], [0.26, 0.22], [0.16, 0.32], [0.14, 0.6], [0.2, 0.68], [0.14, 0.76], [0.13, 0.92], [0.4, 0.96], [0.001, 0.96]].map(([a, b]) => new THREE.Vector2(a, b)), 28), bronze);
    foot.castShadow = true; g.add(foot);
    const top = canvasTex(1024, 1024, (c) => {
      const S = 1024, m = S / 2, gr = c.createRadialGradient(m, m, 40, m, m, m); gr.addColorStop(0, "#1b2a4a"); gr.addColorStop(1, "#0b1226"); c.fillStyle = gr; c.fillRect(0, 0, S, S);
      for (let k = 0; k < 500; k++) { c.fillStyle = "rgba(255,255,255," + (0.15 + hash2(k, 2) * 0.5) + ")"; c.fillRect(hash2(k, 0) * S, hash2(k, 1) * S, 1.5, 1.5); }
      c.strokeStyle = "rgba(201,162,39,0.35)"; c.lineWidth = 2; for (const rr of [0.25, 0.5, 0.75]) { c.beginPath(); c.arc(m, m, rr * m * 0.9, 0, 7); c.stroke(); }
      c.strokeStyle = "#c9a227"; for (let d = 0; d < 360; d += 5) { const a = (d * Math.PI) / 180, r0 = m * (d % 30 ? 0.93 : 0.9); c.lineWidth = d % 30 ? 2 : 4; c.beginPath(); c.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0); c.lineTo(m + Math.cos(a) * m * 0.97, m + Math.sin(a) * m * 0.97); c.stroke(); }
      c.lineWidth = 6; c.beginPath(); c.arc(m, m, m * 0.985, 0, 7); c.stroke();
    });
    top.anisotropy = 8;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.08, 72), [brass, new THREE.MeshStandardMaterial({ map: top, roughness: 0.4, metalness: 0.2 }), bronze]);
    disc.position.y = 1.0; disc.castShadow = disc.receiveShadow = true; g.add(disc);
    for (const rr of [rP, rE]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.012, 6, 96), brass); ring.rotation.x = Math.PI / 2; ring.position.y = 1.05; g.add(ring); }
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 12), brass), 0, 1.17, 0, false);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffc83d, toneMapped: false })); sun.position.y = 1.32; g.add(sun);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false })); halo.position.y = 1.32; halo.raycast = () => {}; g.add(halo);
    const ball = (id, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ map: W.bodies[id].mesh.material.map, roughness: 0.8 })); m.castShadow = true; g.add(m); return m; };
    const arm = (rr, y) => { const a = new THREE.Group(); a.position.y = 1.08; g.add(a); put(a, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, rr, 8), brass), rr / 2, 0, 0, false).rotation.z = Math.PI / 2; put(a, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, y - 1.08, 8), brass), rr, (y - 1.08) / 2, 0, false); put(a, new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), brass), rr, 0, 0, false); return a; };
    g.userData = { earth: ball("erde", 0.13), planet: ball(planetId, 0.1), armE: arm(rE, 1.25 - 0.13), armP: arm(rP, 1.22 - 0.1), rP, rE };
    setOrrery(g, 0, 0);
    return g;
  }
  function setOrrery(o, aE, aP) {
    const u = o.userData;
    u.earth.position.set(Math.cos(aE) * u.rE, 1.25, -Math.sin(aE) * u.rE);
    u.planet.position.set(Math.cos(aP) * u.rP, 1.22, -Math.sin(aP) * u.rP);
    if (u.armE) { u.armE.rotation.y = aE; u.armP.rotation.y = aP; }
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

  // --- Größenvergleich: Kugeln im selben Maßstab (Erde = 1 m Radius) auf einem Sockel, jede auf einem kleinen Messing-Halter,
  // vorn Namensschilder mit dem echten Durchmesser. lo/hi = tiefster/höchster Boden unter dem Sockel (gemessen zur Mitte):
  // Der Sockel reicht immer bis in den Boden – auch wenn der Boden nicht ganz eben ist.
  const fmtKm = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " km";
  function makeSizeRack(ids, lo = 0, hi = 0) {
    const g = new THREE.Group(), gap = 0.7, D = 1.2, rOf = (id) => G.bodyById[id].diameterKm / 12742;
    const width = ids.reduce((s, id) => s + rOf(id) * 2 + gap, gap);
    const top = Math.max(0, hi) + 0.72, bot = Math.min(0, lo) - 0.4, H = top - bot;
    const body = new THREE.MeshStandardMaterial({ color: srgb(0x1e3a5f), roughness: 0.55, metalness: 0.15 });
    const cap = new THREE.MeshStandardMaterial({ color: srgb(0xe5e7eb), roughness: 0.45, metalness: 0.1 });
    const brass = new THREE.MeshStandardMaterial({ color: srgb(0xc8a24a), roughness: 0.35, metalness: 0.8 });
    put(g, new THREE.Mesh(new THREE.BoxGeometry(width, H, D), body), 0, bot + H / 2, 0).receiveShadow = true;
    put(g, new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.08, D + 0.12), cap), 0, top + 0.04, 0).receiveShadow = true; // helle Deckplatte
    const globes = [];
    let x = width / 2 - gap; // von vorn (−Z) gesehen: links → rechts
    for (const id of ids) {
      const b = G.bodyById[id], r = rOf(id), cx = x - r, hp = 0.12;
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.06, r * 0.32), Math.max(0.08, r * 0.4), hp, 24), brass), cx, top + 0.08 + hp / 2, 0);
      const m = put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), new THREE.MeshStandardMaterial({ map: W.bodies[id].mesh.material.map, roughness: 0.9 })), cx, top + 0.08 + hp + r * 0.94, 0);
      m.rotation.y = hash2(globes.length, 3) * 6.3; globes.push(m);
      // Namensschild mit Durchmesser – so breit, wie zwischen den Nachbarn Platz ist
      const w = Math.min(1.3, r * 2 + gap - 0.12), h = w * 0.4;
      const tex = canvasTex(512, Math.round(512 * 0.4), (c) => {
        const W2 = 512, H2 = Math.round(512 * 0.4);
        c.fillStyle = "#0f172a"; c.beginPath(); c.roundRect ? c.roundRect(4, 4, W2 - 8, H2 - 8, 26) : c.rect(4, 4, W2 - 8, H2 - 8); c.fill();
        c.strokeStyle = "#c8a24a"; c.lineWidth = 6; c.stroke();
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillStyle = "#ffffff"; c.font = "bold 76px sans-serif"; c.fillText(b.name, W2 / 2, H2 * 0.38, W2 - 40);
        c.fillStyle = "#fde68a"; c.font = "bold 50px sans-serif"; c.fillText(fmtKm(b.diameterKm), W2 / 2, H2 * 0.75, W2 - 40);
      });
      const label = put(g, new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })), cx, top - 0.06 - h / 2, -D / 2 - 0.006, false);
      label.rotation.y = Math.PI;
      x -= r * 2 + gap;
    }
    g.userData = { width, depth: D, top, globes };
    return g;
  }
  // Größenvergleich: seitlich neben der Tafelwand, leicht zum Platz gedreht – so verdeckt er keine Entdeckungs-Tafeln.
  // Der Boden dort ist eingeebnet (rackFlat in den flats des Ortes). Gibt das Gestell, seine Hindernis-Kreise und den Platz davor zurück.
  const RACK_AT = ([sx, sz]) => [sx + 12.5, sz - 3], RACK_ANGLE = 0.4;
  const rackFlat = (L) => [...RACK_AT(L.station), 4.8, "keep", 5];
  function placeSizeRack(B, ids, station) {
    const a = RACK_ANGLE, [px, pz] = RACK_AT(station), y0 = B.height(px, pz), W0 = makeSizeRack(ids).userData.width;
    let lo = 0, hi = 0; // Boden unter dem Sockel abtasten
    for (let s = -W0 / 2; s <= W0 / 2 + 0.01; s += W0 / 8) for (const f of [-0.6, 0, 0.6]) {
      const h = B.height(px + Math.cos(a) * s - Math.sin(a) * f, pz - Math.sin(a) * s - Math.cos(a) * f) - y0; lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    const rack = B.on(makeSizeRack(ids, lo, hi), px, pz); rack.rotation.y = a;
    const half = rack.userData.width / 2 - 0.6, n = Math.max(1, Math.ceil(half / 1.0)), cols = [];
    for (let i = -n; i <= n; i++) { const s = (i / n) * half; cols.push([px + Math.cos(a) * s, pz - Math.sin(a) * s, 0.75]); }
    const spot = [px - Math.sin(a) * 2.6, pz - Math.cos(a) * 2.6]; // vor dem Gestell (vorn = −Z des Gestells)
    return { rack, cols, spot };
  }
  // Extra (keine Mission): Kamera vor das Gestell, kurze Erklärung, die man vorgelesen bekommt
  function startSizes() {
    enterExhibit("groesse", { update: updateSizes });
    world.astronaut.visible = false;
    scopeSay(cfg.sizes.text, [[cfg.sizes.done || "Fertig ✓", endHidden, true]]);
  }
  function updateSizes(dt) {
    const c = world.camera, r = world.rack, p = r.position, a = r.rotation.y, w = r.userData.width, d = 2.2 + w * 0.42, y = p.y + r.userData.top;
    c.position.lerp(tmp.set(p.x - Math.sin(a) * d, y + 1.1, p.z - Math.cos(a) * d), 1 - Math.exp(-dt * 3));
    view.look.lerp(tmp2.set(p.x, y + 0.55, p.z), 1 - Math.exp(-dt * 4));
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
  // Kühlrippen: Radiator-Paneele mit Kühlröhren und Rahmen, unten das Sammelrohr, oben das Rücklaufrohr
  function mercRadiators(M, n = 6) {
    const g = new THREE.Group();
    if (!mercRadiators.fin) {
      const tex = canvasTex(128, 256, (c) => {
        c.fillStyle = "#e8edf2"; c.fillRect(0, 0, 128, 256);
        for (let x = 7; x < 128; x += 14) { const gr = c.createLinearGradient(x - 4, 0, x + 4, 0); gr.addColorStop(0, "#aab4bf"); gr.addColorStop(0.5, "#ffffff"); gr.addColorStop(1, "#8f9aa6"); c.fillStyle = gr; c.fillRect(x - 4, 0, 8, 256); }
        c.fillStyle = "#7d8894"; c.fillRect(0, 0, 128, 9); c.fillRect(0, 247, 128, 9);
      });
      mercRadiators.fin = M.std({ map: tex, roughness: 0.28, metalness: 0.35, envMapIntensity: 1.1 });
    }
    const L = n * 0.9 + 0.6;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, L, 16), M.orange), 0, 0.5, 0).rotation.z = Math.PI / 2;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, L - 0.4, 12), M.steel), 0, 3.95, 0).rotation.z = Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.9;
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.3, 2.1), mercRadiators.fin), x, 2.2, 0);
      for (const z of [-1.08, 1.08]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.4, 0.06), M.metal), x, 2.2, z);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 2.2), M.metal), x, 3.88, 0);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 10), M.steel), x, 0.62, 0, false);
    }
    for (const x of [-(n * 0.45), n * 0.45]) { put(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 0.2), M.metal), x, -0.3, 0); put(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 2.0), M.metal), x, 0.2, 0); }
    g.userData.snap = [[-(n * 0.45), 0], [n * 0.45, 0], [0, 0]]; // diese Punkte stehen auf dem Boden (siehe addCommon)
    return mergeStatic(g); // ein Netz je Material
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
  // Fläche, die sich dem Gelände anschmiegt (Kreis aus Ringen; für Reif, Auswurf-Strahlen …)
  function groundDecal(height, cx, cz, R, mat, lift = 0.03, rings = 14, seg = 48) {
    const pos = [cx, height(cx, cz) + lift, cz], uv = [0.5, 0.5], idx = [];
    for (let i = 1; i <= rings; i++) for (let j = 0; j < seg; j++) {
      const r = (R * i) / rings, a = (j / seg) * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      pos.push(x, height(x, z) + lift, z); uv.push(0.5 + (Math.cos(a) * r) / (2 * R), 0.5 - (Math.sin(a) * r) / (2 * R));
    }
    for (let j = 0; j < seg; j++) idx.push(0, 1 + ((j + 1) % seg), 1 + j);
    for (let i = 1; i < rings; i++) for (let j = 0; j < seg; j++) {
      const a = 1 + (i - 1) * seg + j, b = 1 + (i - 1) * seg + ((j + 1) % seg), c = 1 + i * seg + j, d = 1 + i * seg + ((j + 1) % seg);
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.renderOrder = 1; m.raycast = () => {};
    return m;
  }
  // Absturzstelle von MESSENGER: 2015 schlug die Sonde mit fast 4 km/s auf – übrig sind nur Trümmer. Zerknautschter Goldkörper halb im Boden,
  // zerrissener Sonnenschirm, gebrochene Solarflügel, die Antennenschüssel, verbogener Messarm, Splitter und dunkle Auswurf-Strahlen
  function messengerWreck(scene, height, M, [cx, cz]) {
    const foil = M.std({ map: foilTex(), roughness: 0.32, metalness: 0.75, envMapIntensity: 1.2 }), cloth = M.std({ color: srgb(0xefebe2), roughness: 0.85, side: THREE.DoubleSide });
    const crumple = (geo, amp, seed) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x + (fbm2(y * 3 + seed, z * 3) - 0.5) * amp, y + (fbm2(x * 3 - seed, z * 3 + 1) - 0.5) * amp, z + (fbm2(x * 3 + 2, y * 3 + seed) - 0.5) * amp); } geo.computeVertexNormals(); return geo; };
    const place = (m, dx, dz, lift, rx, ry, rz) => { const x = cx + dx, z = cz + dz; m.position.set(x, height(x, z) + lift, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
    // dunkle Strahlen und Spritzer rund um den kleinen Einschlagkrater
    const rays = canvasTex(256, 256, (c) => {
      for (let i = 0; i < 26; i++) { const a = hash2(i, 81) * 6.3, l = 60 + hash2(i, 82) * 66, w = 3 + hash2(i, 83) * 8; const g = c.createLinearGradient(128, 128, 128 + Math.cos(a) * l, 128 + Math.sin(a) * l); g.addColorStop(0, "rgba(28,24,20,0.75)"); g.addColorStop(1, "rgba(28,24,20,0)"); c.strokeStyle = g; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(a) * l, 128 + Math.sin(a) * l); c.stroke(); }
      const r = c.createRadialGradient(128, 128, 10, 128, 128, 80); r.addColorStop(0, "rgba(30,26,22,0.7)"); r.addColorStop(1, "rgba(30,26,22,0)"); c.fillStyle = r; c.fillRect(0, 0, 256, 256);
    });
    scene.add(groundDecal(height, cx, cz, 8, new THREE.MeshStandardMaterial({ map: rays, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }), 0.06));
    place(new THREE.Mesh(crumple(new THREE.BoxGeometry(1.15, 0.85, 1.05, 4, 3, 4), 0.28, 3), foil), 0.2, -0.1, 0.05, 0.55, 0.8, -0.4);          // Körper, halb im Boden
    place(new THREE.Mesh(crumple(new THREE.CylinderGeometry(1.1, 1.1, 0.9, 10, 2, true, 0, 1.7), 0.18, 7), cloth), 1.35, 0.7, 0.25, 1.1, -0.6, 0.3); // Fetzen vom Sonnenschirm
    for (const [dx, dz, ry, rz, len] of [[-1.7, -1.3, 0.4, 0.12, 1.4], [-0.9, 1.1, 2.1, 0.55, 0.8], [2.9, -2.3, -0.9, 0.18, 1.2]]) { // gebrochene Solarflügel
      const pn = new THREE.Group();
      put(pn, new THREE.Mesh(new THREE.BoxGeometry(len, 0.035, 0.7), marsCellMat(M)), 0, 0, 0);
      put(pn, new THREE.Mesh(new THREE.BoxGeometry(len + 0.04, 0.05, 0.04), M.steel), 0, 0, 0.36, false); put(pn, new THREE.Mesh(new THREE.BoxGeometry(len + 0.04, 0.05, 0.04), M.steel), 0, 0, -0.36, false);
      place(pn, dx, dz, 0.06 + rz * 0.3, 0.08, ry, rz);
    }
    const dish = dishCap(M, 0.45, 0.9); place(dish, -2.4, 1.8, 0.12, 2.6, 0.4, 0.3);                                                    // Antennenschüssel, umgedreht
    const boom = []; for (let i = 0; i <= 8; i++) boom.push(new V(i * 0.32, Math.sin(i * 0.5) * 0.08, Math.sin(i * 0.9) * 0.25 + (i > 5 ? (i - 5) * 0.18 : 0)));
    place(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(boom), 30, 0.025, 6), M.steel), 0.6, 2.0, 0.05, 0, 0.5, 0);        // verbogener Messarm
    for (let i = 0; i < 18; i++) { // Splitter: Folienfetzen, Streben, schwarze Bruchstücke
      const a = hash2(i, 91) * 6.3, r = 1.4 + hash2(i, 92) * 4.2, kind = i % 3;
      const geo = kind === 0 ? crumple(new THREE.IcosahedronGeometry(0.1 + hash2(i, 93) * 0.12, 0), 0.08, i) : kind === 1 ? new THREE.CylinderGeometry(0.02, 0.02, 0.4 + hash2(i, 94) * 0.6, 5) : new THREE.BoxGeometry(0.18, 0.04, 0.12 + hash2(i, 95) * 0.15);
      place(new THREE.Mesh(geo, kind === 0 ? foil : kind === 1 ? M.steel : M.metal), Math.sin(a) * r, Math.cos(a) * r, kind === 1 ? 0.02 : 0.04, kind === 1 ? Math.PI / 2 : hash2(i, 96), a, hash2(i, 97) * 0.4);
    }
  }
  // Eis im ewigen Schatten: Reif-Fläche am Kraterboden (leuchtet leicht bläulich) und halb eingesunkene Eisbrocken
  function iceDeposit(scene, height, [cx, cz]) {
    const tex = canvasTex(256, 256, (c) => { // Reif: zur Mitte dichter, der Rand franst unregelmäßig aus; feine Körnung und Glitzern
      const img = c.createImageData(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const dx = (x - 128) / 128, dy = (y - 128) / 128, d = Math.hypot(dx, dy), n = fbm2(x * 0.035 + 3, y * 0.035) - 0.5, g = hash2(x, y) - 0.5;
        const a = Math.max(0, Math.min(1, (0.78 + n * 0.55 - d) * 10)) * (0.8 + 0.2 * (1 - d)), k = (y * 256 + x) * 4;
        img.data[k] = 214 + n * 50 + g * 20; img.data[k + 1] = 236 + n * 30 + g * 14; img.data[k + 2] = 252; img.data[k + 3] = a * 235;
      }
      c.putImageData(img, 0, 0);
      c.globalCompositeOperation = "source-atop"; c.fillStyle = "rgba(255,255,255,0.95)";
      for (let i = 0; i < 140; i++) c.fillRect(hash2(i, 78) * 256, hash2(i, 79) * 256, 1.5, 1.5); // Glitzern
      c.strokeStyle = "rgba(255,255,255,0.55)"; c.lineWidth = 1; // Reif-Kristalle: kleine Sterne mit sechs Strahlen
      for (let i = 0; i < 90; i++) { const x = hash2(i, 91) * 256, y = hash2(i, 92) * 256, l = 2 + hash2(i, 93) * 5; for (let k = 0; k < 3; k++) { const t = (k / 3) * Math.PI + hash2(i, 94); c.beginPath(); c.moveTo(x - Math.cos(t) * l, y - Math.sin(t) * l); c.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l); c.stroke(); } }
    });
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.18, metalness: 0.1, emissive: srgb(0x7cc8f5), emissiveMap: tex, emissiveIntensity: 0.16, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    scene.add(groundDecal(height, cx, cz, 3.4, mat, 0.06));
    const { normalMap, normalScale } = rockTex(1, 1, 0.5), iceGeos = [0, 1, 2, 3].map((k) => sphereUV(naturalRockGeo(140 + k, 3)));
    const chunk = new THREE.MeshStandardMaterial({ color: srgb(0xdff4ff), emissive: srgb(0x38bdf8), emissiveIntensity: 0.18, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.9, normalMap, normalScale, envMapIntensity: 1.2 });
    for (let i = 0; i < 9; i++) {
      const a = hash2(i, 85) * 6.3, r = Math.sqrt(hash2(i, 86)) * 2.4, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, k = 0.12 + hash2(i, 87) * 0.22;
      const m = new THREE.Mesh(iceGeos[i % 4], chunk); m.scale.set(k * 1.3, k * 0.75, k); m.position.set(x, height(x, z) + k * 0.15, z); m.rotation.set(hash2(i, 88), a, hash2(i, 89) * 0.6); m.castShadow = true;
      scene.add(m);
    }
  }
  // Steht etwas Starres auf schrägem Boden: dem Gelände nach neigen (Normale aus vier Punkten) und so tief setzen, dass nichts schwebt
  function alignToGround(obj, height, x, z, yaw, half = 0.9) {
    const hx0 = height(x - half, z), hx1 = height(x + half, z), hz0 = height(x, z - half), hz1 = height(x, z + half);
    const n = new V(-(hx1 - hx0) / (2 * half), 1, -(hz1 - hz0) / (2 * half)).normalize();
    obj.quaternion.setFromUnitVectors(new V(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(new V(0, 1, 0), yaw));
    obj.position.set(x, Math.min(height(x, z), (hx0 + hx1 + hz0 + hz1) / 4), z);
    return obj;
  }
  // Eis-Sonde nach dem NASA-Rover VIPER (sucht Eis in dunklen Polkratern): weißes Gehäuse mit Solarpaneelen an den Seiten,
  // goldene Isolierfolie, vier Räder an Schwingen, Kameramast mit Stereokameras und Scheinwerfern, Antennenschüssel,
  // vorn rechts der Bohrturm – der Bohrer steckt im Boden (lokal: vorn = +Z, zum Eis)
  function mercIceProbe(M) {
    const g = new THREE.Group(), b = partBuilder(), white = M.hull(1, 1), dark = M.metal;
    const gold = M.std({ map: canvasTex(128, 128, (c) => { c.fillStyle = "#c99a2e"; c.fillRect(0, 0, 128, 128); for (let i = 0; i < 140; i++) { const x = hash2(i, 5) * 128, y = hash2(i, 6) * 128, l = 6 + hash2(i, 7) * 22, a = hash2(i, 8) * 3.1; c.strokeStyle = hash2(i, 9) > 0.5 ? "rgba(255,236,170,0.55)" : "rgba(110,70,10,0.45)"; c.lineWidth = 1 + hash2(i, 10) * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } }), roughness: 0.3, metalness: 0.85 });
    const cells = marsCellMat(M);
    // Gehäuse mit dunklem Rahmen, Deck, Heizkörper oben
    b.add(new THREE.BoxGeometry(1.2, 0.62, 1.45), white, [0, 0.9, 0]);
    for (const [x, z] of [[-0.6, -0.725], [0.6, -0.725], [-0.6, 0.725], [0.6, 0.725]]) b.add(new THREE.BoxGeometry(0.06, 0.66, 0.06), dark, [x, 0.9, z]);
    b.add(new THREE.BoxGeometry(1.26, 0.05, 1.51), dark, [0, 1.235, 0]);
    for (let k = 0; k < 7; k++) b.add(new THREE.BoxGeometry(0.9, 0.06, 0.03), white, [0.05, 1.29, -0.55 + k * 0.12]);
    b.add(new THREE.BoxGeometry(0.42, 0.26, 0.36), gold, [-0.3, 1.39, 0.35]);
    // Solarpaneele senkrecht an beiden Seiten und hinten (die Sonne steht an den Polen ganz tief)
    for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.03, 0.5, 1.3), cells, [sx * 0.62, 0.92, 0]);
    b.add(new THREE.BoxGeometry(1.1, 0.5, 0.03), cells, [0, 0.92, -0.74]);
    // Schwingen und Räder
    for (const sx of [-1, 1]) {
      b.add(new THREE.BoxGeometry(0.08, 0.1, 1.25), dark, [sx * 0.7, 0.5, 0]);
      b.add(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 14), M.steel, [sx * 0.66, 0.6, 0], [0, 0, Math.PI / 2]);
    }
    // Kameramast vorn links mit Schwenkkopf: zwei Kameras, zwei Scheinwerferleisten
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 1.05, 12), M.steel, [-0.4, 1.78, 0.52]);
    b.add(new THREE.BoxGeometry(0.42, 0.16, 0.18), white, [-0.4, 2.34, 0.55]);
    for (const x of [-0.12, 0.12]) { b.add(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 16), dark, [-0.4 + x, 2.34, 0.66], [Math.PI / 2, 0, 0]); b.add(new THREE.CircleGeometry(0.035, 16), M.std({ color: srgb(0x0b2545), roughness: 0.05, metalness: 0.8 }), [-0.4 + x, 2.34, 0.701]); }
    // Antennenschüssel hinten auf einem Ausleger
    b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), M.steel, [0.35, 1.5, -0.45]);
    // Bohrturm vorn rechts: zwei Schienen, Antriebskasten, Bohrstange bis in den Boden
    for (const x of [0.32, 0.5]) b.add(new THREE.BoxGeometry(0.04, 1.1, 0.04), M.steel, [x, 0.75, 0.84]);
    b.add(new THREE.BoxGeometry(0.28, 0.2, 0.2), M.orange, [0.41, 1.12, 0.86]);
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 10), dark, [0.41, 0.45, 0.86]);
    b.add(new THREE.TorusGeometry(0.12, 0.05, 8, 20), M.std({ color: srgb(0x5a534b), roughness: 1 }), [0.41, 0.03, 0.86], [Math.PI / 2, 0, 0]); // Bohrklein
    g.add(b.group(true));
    const dish = put(g, dishCap(M, 0.28, 0.6), 0.35, 1.8, -0.45); dish.rotation.x = Math.PI + 0.7;
    const wheel = roverWheel(M, 0.3, 0.2, M.steel);
    for (const sx of [-1, 1]) for (const z of [-0.6, 0.6]) { const w = wheel.clone(); w.position.set(sx * 0.82, 0.3, z); g.add(w); }
    // Scheinwerfer: zwei Leuchtleisten am Kamerakopf, ein Spot auf das Eis
    for (const x of [-0.26, 0.26]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: srgb(0xfff4d6), toneMapped: false })), -0.4 + x, 2.34, 0.65, false);
    const spot = new THREE.SpotLight(0xfff1c2, 1.4, 14, 0.6, 0.5); spot.position.set(-0.4, 2.34, 0.7); spot.target.position.set(0, 0, 5); g.add(spot, spot.target);
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
    const mSmall = scatterCraters(L, [[...L.spawn, 6], [...L.station, 22], [L.station[0], L.station[1] + 16, 26], [...L.waage, 7], [...L.sonne, 7], [...L.boulder, 9], [...L.shadowSpot, 9],
      [...L.krater, 7], [...L.kraterZiel, 10], [...L.wegweiser, 4], [...L.sonde, 6], [...L.eis, 7], [MERKUR_CRATER[0], MERKUR_CRATER[1], MERKUR_CRATER[2] + 6], ...craters.map(([x, z, r]) => [x, z, r])], W.fast ? 30 : 50, 913, 1.6, 7, 210);
    craters.push(...mSmall);
    const hollows = mSmall.filter((c, i) => i % 5 === 1); // helle Senken, in denen Gestein verdampft ist
    const flats = [[0, 0, 11], [...L.station, 20, "auto"], [L.station[0], L.station[1] + 16, 20, "auto"], [...L.waage, 5], [...L.sonne, 4, "auto", 3], [...L.boulder, 7, "auto"], [...L.shadowSpot, 5, "auto"], [...L.krater, 5, "auto"], [...L.kraterZiel, 7, "auto"], rackFlat(L)];
    const B = buildBase({
      height: makeHeight(craters, flats, 80),
      // keine Luft: schwarzer Himmel – und eine riesige, grelle Sonne (Merkur ist ihr am nächsten)
      sky: 0x000000, stars: true, sunSize: 430,
      ground: 0x8f877c, rock: 0x4e4943,
      tint: (x, z) => {
        let m = (0.68 + 0.32 * fbm2(x * 0.012 + 5, z * 0.012)) * (0.93 + 0.14 * fbm2(x * 0.08 + 2, z * 0.08)), b = 0.92;
        for (const [cx, cz, r] of hollows) { const k = smooth(r * 1.1, r * 0.3, Math.hypot(x - cx, z - cz)) * (0.6 + 0.4 * fbm2(x * 0.5, z * 0.5)); m += 0.28 * k; b += 0.22 * k; }
        return [m, m * 0.97, m * b];
      },
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

    const boulder = new THREE.Mesh(boulderGeo(23), new THREE.MeshStandardMaterial({ color: 0x86807a, roughness: 1, vertexColors: true, ...rockTex(8, 4, 1.6), envMap: M.env, envMapIntensity: 0.7 }));
    boulder.material.map.repeat.set(10, 5); boulder.material.normalMap.repeat.set(10, 5);
    // Schattenlauf: drei Felsnadeln werfen Schatteninseln über die Strecke, am Ziel ein goldener Kreis im Felsschatten
    const run = shadowRunLayout(L), pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a837b, roughness: 1, vertexColors: true, ...rockTex(4, 2, 1.5) });
    const pillars = run.pillars.map(([x, z], i) => { const p = new THREE.Mesh(sphereUV(naturalRockGeo(40 + i, 4)), pillarMat); p.scale.set(2.1, 2.7, 1.9); p.castShadow = p.receiveShadow = true; return on(p, x, z, 1.2); });
    const finish = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.6, 48), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    finish.rotation.x = -Math.PI / 2; finish.renderOrder = 3; on(finish, ...run.F, 0.08); finish.visible = false;
    const runYaw = Math.atan2(run.F[0] - run.S[0], run.F[1] - run.S[1]), rux = Math.sin(runYaw), ruz = Math.cos(runYaw);
    on(makeSignBoard(M, "🧊 EIS-LAGER", "#0369a1", 2.2), run.S[0] + 2.2, run.S[1] + 1.2).rotation.y = runYaw + Math.PI;
    const store = on(iceStore(M), run.S[0] + ruz * 1.9, run.S[1] - rux * 1.9); store.rotation.y = runYaw - Math.PI / 2;
    const fridge = on(iceFridge(M), run.F[0] - SHADOW_DIR.x * 2.1, run.F[1] - SHADOW_DIR.z * 2.1); fridge.rotation.y = Math.atan2(run.S[0] - fridge.position.x, run.S[1] - fridge.position.z);
    run.block = iceBlock(); run.block.visible = false; scene.add(run.block);
    run.drops = new THREE.Group(); run.drops.visible = false; scene.add(run.drops);
    const dropMat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 7; i++) run.drops.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), dropMat));
    run.cols = [[store.position.x, store.position.z, 0.75], [fridge.position.x, fridge.position.z, 0.7]];
    boulder.scale.set(7, 8.5, 6.5); boulder.rotation.set(0.2, 0.7, 0.1); boulder.castShadow = boulder.receiveShadow = true;
    on(boulder, ...L.boulder, 2.4); // unten im Boden versenkt (der Fels ist unten flach)
    run.casters = [boulder, ...pillars, fridge, store];

    // Sonne im Filter-Fernrohr: groß, wie sie vom Merkur aussieht – und daneben klein, wie wir sie von der Erde kennen
    const TOWER = 4; // Sonnenturm, oben das Filter-Fernrohr
    const tower = on(mercSunTower(M, TOWER), ...L.sonne); tower.rotation.y = Math.atan2(-L.sonne[0], -L.sonne[1]);
    const telescope = on(makeTelescope(SUN_DIR), ...L.sonne, TOWER + 0.1);
    const sunAt = SUN_DIR.clone().multiplyScalar(1150), side = new V().crossVectors(SUN_DIR, new V(0, 1, 0)).normalize();
    const sunBig = makeSunDisc(52), sunSmall = makeSunDisc(20);
    sunBig.position.copy(sunAt); sunSmall.position.copy(sunAt).addScaledVector(side, -52);
    scene.add(sunBig, sunSmall);

    // Einschlag-Versuch: Brocken aus dem All und der Krater, den er hinterlässt
    // Einschlag: ein echter Felsbrocken (kein Feuer – ohne Luft verglüht nichts), ein Krater, der sich in den Boden gräbt, Auswurf und Blitz
    const meteor = new THREE.Mesh(naturalRockGeo(77, 3), new THREE.MeshStandardMaterial({ color: 0x6f675e, roughness: 1, vertexColors: true }));
    meteor.scale.set(1.35, 1.1, 1.2); meteor.castShadow = true; meteor.visible = false; scene.add(meteor);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,250,235,0.95)", "rgba(255,240,210,0.25)"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glint.raycast = () => {}; meteor.add(glint); // sonnenbeschienener Brocken: aus der Ferne ein heller Punkt am schwarzen Himmel
    const crater = makeImpactCrater(B, L.kraterZiel, 3.3, 7.2);
    const ejecta = makeEjecta(scene, 30, new THREE.MeshStandardMaterial({ color: 0x8a8177, roughness: 1, vertexColors: true }));
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,245,1)", "rgba(255,220,160,0.6)"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    flash.raycast = () => {}; flash.visible = false; scene.add(flash);
    const flashLight = new THREE.PointLight(0xfff0d0, 0, 30, 1.6); scene.add(flashLight);
    const decal = crater; // (früher ein flacher Fleck)
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
    messengerWreck(scene, B.meshHeight, M, L.sonde);
    { // Gedenktafel am Kraterrand, zum Weg hin (von dort kommt man)
      const [sx, sz] = L.sonde, [rx, rz] = L.route.sonde[L.route.sonde.length - 1], d = Math.hypot(rx - sx, rz - sz) || 1;
      const mp = on(makePlaque(M, [["MESSENGER", 52], ["2011 – 2015", 40], ["umkreiste den Merkur", 30], ["und stürzte hier ab", 30]]), sx + ((rx - sx) / d) * 5.6 + ((rz - sz) / d) * 1.6, sz + ((rz - sz) / d) * 5.6 - ((rx - sx) / d) * 1.6);
      mp.rotation.y = Math.atan2(rx - mp.position.x, rz - mp.position.z);
    }
    iceDeposit(scene, B.meshHeight, L.eis);
    // Eis-Sonde oben auf dem Rand des kleinen Kraters, Scheinwerfer auf das Eis gerichtet
    const [ex, ez] = L.eis, ipx = ex + 0.8 * 6.6, ipz = ez + 0.6 * 6.6, iceProbe = mercIceProbe(M);
    alignToGround(iceProbe, B.meshHeight, ipx, ipz, Math.atan2(ex - ipx, ez - ipz), 1.0); scene.add(iceProbe);
    const orrery = on(makeOrrery("merkur", 0.75, 1.7), ...L.jahr);
    const { rack, cols: rackCols, spot: rackSpot } = placeSizeRack(B, ["mond", "merkur", "erde"], L.station);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, temperatur: run.S, sonne: L.sonne, krater: L.krater, jahr: L.jahr, groesse: rackSpot,
      eis: L.eis, sonde: L.sonde, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] });
    const npcs = addNpcs(B);
    drawTour(B, L, [92, 86, 80], 2.0, "boots", "pole"); // der Rundgang mit Kofi: oben in der Sonne, dann hinab in den schattigen Krater
    on(makeSignBoard(M, "⬇️ ZUR STATION IM KRATER", "#b45309", 3), -30, 46).rotation.y = Math.atan2(30, -46);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7066, roughness: 0.95, vertexColors: true }); rockMat.userData.natural = true;
    const clusters = [[26, 14, 5], [-46, 4, 5], [52, 30, 5], [-6, -24, 4], [24, -22, 4]];
    clusters.forEach(([x, z, n], i) => rockCluster(B, x, z, n, rockMat, i * 19 + 5));
    common.station.updateMatrixWorld(true);
    const wall = [];
    const colliders = [...common.colliders, [...L.boulder, 6.8], [...L.sonne, 1.9], [...L.krater, 1], [...L.wegweiser, 0.3], [...L.sonde, 1.6],
      [...L.eis, 0.5], [iceProbe.position.x, iceProbe.position.z, 1.1], [...L.jahr, 1.2], ...rackCols,
      ...seismos.map((s) => [s.position.x, s.position.z, 0.5]), ...wall, ...npcs.map((n) => n.col), ...run.pillars.map(([x, z]) => [x, z, 1.7]), ...run.cols,
      ...clusters.filter((c) => c[2] >= 5).map(([x, z]) => [x, z, 1.2])];

    return { ...B, ...common, L, telescope, sunBig, sunSmall, sunAt, meteor, decal, crater, ejecta, flash, flashLight, orrery, rack, stations, colliders, npcs, blink: common.station.userData.blink,
      height: (x, z) => B.height(x, z) + crater.offset(x, z), // im Krater läuft man wirklich tiefer
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
  // Zeitlupe: der Brocken fliegt 4,5 s lang schräg heran (die Kamera schaut ihm entgegen), schlägt ein und gräbt einen Krater
  const tmp3 = new V(), tmp4 = new V();
  const METEOR_T = 4.5, METEOR_DIR = new V(-0.62, 0.62, 0.48).normalize(), METEOR_DIST = 95;
  function runMeteor() {
    const sp = view.special; sp.t = 0; sp.run = true; sp.hit = false; sp.shake = 0;
    world.crater.reset(); world.ejecta.reset();
    world.meteor.visible = true;
    scopeSay(cfg.impact.running);
  }
  function updateMeteor(dt) {
    const w = world, c = w.camera, sp = view.special, [kx, kz] = w.L.krater, [gx, gz] = w.L.kraterZiel, gy = w.height(gx, gz), by = B0(gx, gz);
    if (sp.run) sp.t += dt;
    const f = Math.min(1, sp.t / METEOR_T), after = sp.hit ? sp.t - METEOR_T : 0;
    // Kamera: am Messpult, schaut dem Brocken entgegen – nach dem Einschlag näher an den Krater heran
    const near = Math.min(1, after / 1.8), ease = near * near * (3 - 2 * near);
    const camFar = tmp.set(kx + 5, w.height(kx, kz) + 3.2, kz - 7), dx = gx - camFar.x, dz = gz - camFar.z, dd = Math.hypot(dx, dz);
    const camNear = tmp3.set(gx - (dx / dd) * 9.5, by + 4.6, gz - (dz / dd) * 9.5);
    c.position.lerp(camFar.lerp(camNear, ease), 1 - Math.exp(-dt * 3));
    if (sp.shake > 0) { sp.shake -= dt; const s = sp.shake * 0.35; c.position.x += (Math.random() - 0.5) * s; c.position.y += (Math.random() - 0.5) * s; }
    const m = w.meteor;
    if (sp.run && !sp.hit) {
      m.position.set(gx, by, gz).addScaledVector(METEOR_DIR, METEOR_DIST * (1 - f)); // gleichmäßig schnell (in echt über 10 km pro Sekunde)
      m.rotation.x += dt * 1.3; m.rotation.z += dt * 0.7;
      const glint = m.children[0], dist = c.position.distanceTo(m.position); glint.scale.setScalar(Math.min(9, dist * 0.06)); glint.material.opacity = Math.min(1, dist / 40);
      view.look.lerp(tmp2.copy(m.position).lerp(tmp4.set(gx, by + 1, gz), 0.72 + f * 0.25), 1 - Math.exp(-dt * 5)); // leicht nach oben – der Horizont bleibt im Bild
    } else view.look.lerp(tmp2.set(gx, by - 0.6 * ease, gz), 1 - Math.exp(-dt * 4));
    c.lookAt(view.look);
    if (sp.run && !sp.hit && f >= 1) { // Einschlag!
      sp.hit = true; m.visible = false; sp.shake = 0.7;
      w.crater.start(); w.ejecta.launch(gx, by, gz, 3.3, cfg.gravity);
      Sound.land(); Sound.land();
      grains(tmp.set(gx, by + 0.3, gz), 70, 4.2, 0, 0, 5);
    }
    // Blitz, Krater wächst, Brocken fliegen
    const fl = sp.hit ? Math.max(0, 1 - after / 0.45) : 0;
    w.flash.visible = fl > 0; if (fl > 0) { w.flash.position.set(gx, by + 1.2, gz); w.flash.scale.setScalar(4 + (1 - fl) * 14); w.flash.material.opacity = fl; }
    w.flashLight.position.set(gx, by + 2, gz); w.flashLight.intensity = fl * 9;
    w.crater.update(dt); w.ejecta.update(dt, w.height);
    if (sp.run && sp.hit && after > 3.2) {
      sp.run = false; Sound.correct();
      scopeSay(guessed(cfg.impact.end), [[cfg.impact.again, runMeteor], [cfg.impact.done, leaveExhibit, true]]);
    }
  }
  const B0 = (x, z) => world.height(x, z) - (world.crater ? world.crater.offset(x, z) : 0); // Höhe ohne Krater (Zielpunkt des Brockens)

  // ---------- Einschlagkrater: feines Bodenstück (Schüssel, Wall, helle Auswurf-Strahlen), das Gelände darunter sinkt mit ----------
  // R = Radius bis zum Wall, Rp = Radius des Bodenstücks (dort läuft die Auswurfdecke aus)
  function makeImpactCrater(B, [cx, cz], R, Rp) {
    const D = R * 0.42, H = R * 0.14, smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    const wob = (a) => 1 + 0.07 * Math.sin(a * 3 + 1.3) + 0.04 * Math.sin(a * 7 + 0.4); // nicht ganz kreisrund
    const prof = (r, a) => {
      const rr = r / (R * wob(a));
      if (rr < 1) return -D + (D + H) * rr * rr;                 // Schüssel bis hoch zum Wall
      return H * Math.pow(1 / rr, 3) * (1 - smooth((r - (Rp - 1.6)) / 1.6)); // Auswurfdecke wird nach außen dünner
    };
    // Bodenstück als Polarnetz (innen dichter)
    const RS = 34, AS = 72, Gs = B.groundSize, verts = [], uvs = [], idx = [], base = [];
    verts.push(0, 0, 0); base.push([0, 0]);
    for (let i = 1; i <= RS; i++) for (let j = 0; j < AS; j++) {
      const r = Rp * Math.pow(i / RS, 1.25), a = (j / AS) * Math.PI * 2;
      verts.push(Math.cos(a) * r, 0, Math.sin(a) * r); base.push([r, a]);
    }
    for (let j = 0; j < AS; j++) idx.push(0, 1 + ((j + 1) % AS), 1 + j);
    for (let i = 1; i < RS; i++) for (let j = 0; j < AS; j++) {
      const a = 1 + (i - 1) * AS + j, b = 1 + (i - 1) * AS + ((j + 1) % AS), c = a + AS, d = b + AS;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry(), n = verts.length / 3, col = new Float32Array(n * 4); // Farbe + Deckkraft (außen weich ausgeblendet)
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3)); geo.setIndex(idx);
    for (let k = 0; k < n; k++) { const x = cx + verts[k * 3], z = cz + verts[k * 3 + 2]; uvs.push((x + Gs / 2) / Gs, (Gs / 2 - z) / Gs); } // wie das Gelände
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    // Farbe: wie der Boden, Kraterboden dunkler, Wall hell, frischer Auswurf mit hellen Strahlen (wie junge Krater auf dem Merkur)
    const rays = (a) => Math.max(0, Math.sin(a * 9 + 0.7) * Math.sin(a * 4 + 2.1)) ** 2 + 0.6 * Math.max(0, Math.sin(a * 17 + 1.9)) ** 6;
    const gcol = B.ground.geometry.attributes.color, gpos0 = B.ground.geometry.attributes.position, side = Math.round(Math.sqrt(gpos0.count)), step = Gs / (side - 1);
    const x0 = gpos0.getX(0), z0 = gpos0.getZ(0), dzRow = Math.sign(gpos0.getZ(side) - z0) || 1;
    const groundTint = (x, z) => { // Geländefarbe bilinear (das Gelände ist ein Gitter mit side × side Punkten)
      const fx = (x - x0) / step, fz = ((z - z0) * dzRow) / step, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, out = [0, 0, 0];
      for (const [di, dj, w] of [[0, 0, (1 - u) * (1 - v)], [1, 0, u * (1 - v)], [0, 1, (1 - u) * v], [1, 1, u * v]]) {
        const k2 = (j + dj) * side + (i + di); for (let c = 0; c < 3; c++) out[c] += gcol.array[k2 * 3 + c] * w;
      }
      return out;
    };
    const tintAt = (k, fresh) => {
      const [r, a] = base[k], x = cx + verts[k * 3], z = cz + verts[k * 3 + 2], t = groundTint(x, z), rr = r / (R * wob(a));
      let m = 1;
      if (fresh) {
        if (rr < 0.8) m = 0.74 + 0.1 * rr; else if (rr < 1.15) m = 0.82 + 0.45 * smooth((rr - 0.8) / 0.25) - 0.1 * smooth((rr - 1) / 0.15);
        else m = 1 + (0.22 + 0.75 * rays(a)) * Math.exp(-(rr - 1.1) * 0.8) * (1 - smooth((r - (Rp - 1.6)) / 1.6));
      }
      return [t[0] * m, t[1] * m, t[2] * m];
    };
    const paint = (fresh) => { for (let k = 0; k < n; k++) { col.set(tintAt(k, fresh), k * 4); col[k * 4 + 3] = 1 - smooth((base[k][0] - (Rp - 1.9)) / 1.9); } geo.attributes.color.needsUpdate = true; };
    geo.setAttribute("color", new THREE.BufferAttribute(col, 4));
    const gm = B.ground.material, mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: gm.map, color: gm.color, vertexColors: true, transparent: true, roughness: 1, metalness: 0 }));
    mesh.position.set(cx, 0, cz); mesh.receiveShadow = true; mesh.visible = false; mesh.raycast = () => {};
    B.scene.add(mesh);
    // Geländepunkte unter dem Bodenstück (für das Absenken)
    const gp = B.ground.geometry.attributes.position, under = [];
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), r = Math.hypot(x - cx, z - cz); if (r < Rp) under.push([i, gp.getY(i), r, Math.atan2(z - cz, x - cx)]); }
    let k = 0, target = 0, growing = false;
    const shape = (kk) => {
      const p = geo.attributes.position;
      for (let v = 0; v < n; v++) { const [r, a] = base[v]; p.setY(v, B.height(cx + verts[v * 3], cz + verts[v * 3 + 2]) + prof(r, a) * kk + 0.03); }
      p.needsUpdate = true; geo.computeVertexNormals();
    };
    const sinkGround = (kk) => { // Gelände liegt immer etwas UNTER dem Bodenstück (das grobe Gitter würde sonst durch die Schüssel stechen)
      for (const [i, y0, r, a] of under) gp.setY(i, y0 + kk * (Math.min(0, prof(r, a)) - 0.45 * (1 - smooth((r - R * 1.15) / (Rp - R * 1.15)))));
      gp.needsUpdate = true; B.ground.geometry.computeVertexNormals();
    };
    return {
      mesh,
      offset: (x, z) => { if (!k) return 0; const r = Math.hypot(x - cx, z - cz); return r < Rp ? prof(r, Math.atan2(z - cz, x - cx)) * k : 0; },
      start() { k = 0.02; target = 1; growing = true; paint(true); shape(k); mesh.visible = true; sinkGround(1); },
      update(dt) { if (!growing) return; k = Math.min(target, k + dt / 0.75 * (1.2 - k)); shape(k); if (k >= target - 0.002) { k = target; shape(k); growing = false; } },
      reset() { if (!k && !growing) return; k = 0; growing = false; mesh.visible = false; sinkGround(0); }
    };
  }
  // Auswurf: Gesteinsbrocken fliegen in sauberen Bögen (keine Luft bremst) und bleiben rund um den Krater liegen
  function makeEjecta(scene, n, mat) {
    const inst = new THREE.InstancedMesh(naturalRockGeo(91, 1), mat, n); inst.count = 0; inst.castShadow = inst.receiveShadow = true; inst.frustumCulled = false;
    scene.add(inst);
    const parts = [], mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V(), white = new THREE.Color(1, 1, 1);
    let g = 3.7;
    const write = () => { parts.forEach((p, i) => { q.setFromEuler(e.set(p.rx, p.ry, p.rz)); mx.compose(p.pos, q, sc.set(p.s, p.s * 0.7, p.s * 0.9)); inst.setMatrixAt(i, mx); }); inst.instanceMatrix.needsUpdate = true; };
    return {
      launch(x, y, z, R, grav) {
        g = grav || 3.7; parts.length = 0;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, r0 = Math.random() * R * 0.4, sp = 2.5 + Math.random() * 6.5;
          parts.push({ pos: new V(x + Math.cos(a) * r0, y + 0.2, z + Math.sin(a) * r0), v: new V(Math.cos(a) * sp, 3 + Math.random() * 6.5, Math.sin(a) * sp),
            s: 0.07 + Math.pow(Math.random(), 2.2) * 0.32, rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, spin: (Math.random() - 0.5) * 9, landed: false });
          inst.setColorAt(i, white.setScalar(0.75 + Math.random() * 0.35));
        }
        inst.count = n; inst.instanceColor.needsUpdate = true; write();
      },
      update(dt, height) {
        let moving = false;
        for (const p of parts) {
          if (p.landed) continue;
          moving = true;
          p.v.y -= g * dt; p.pos.addScaledVector(p.v, dt); p.rx += p.spin * dt; p.rz += p.spin * 0.6 * dt;
          const gy = height(p.pos.x, p.pos.z) + p.s * 0.25;
          if (p.pos.y <= gy && p.v.y < 0) { p.pos.y = gy; p.landed = true; }
        }
        if (moving) write();
      },
      reset() { parts.length = 0; inst.count = 0; }
    };
  }

  // Parabolantenne (Schüssel mit Rand, Halterung und Empfänger), z. B. für Sonden und Funkmasten
  function dishCap(M, R, open) {
    const g = new THREE.Group(), rimR = R * Math.sin(open), rimY = R * Math.cos(open);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 36, 10, 0, Math.PI * 2, 0, open), M.std({ color: srgb(0xd5dbe4), side: THREE.DoubleSide, roughness: 0.55 })));
    const rim = put(g, new THREE.Mesh(new THREE.TorusGeometry(rimR, R * 0.035, 8, 40), M.std({ color: srgb(0x475063), roughness: 0.5, metalness: 0.4 })), 0, rimY, 0);
    rim.rotation.x = Math.PI / 2;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.22, R * 0.18, 16), M.std({ color: srgb(0x6b7280), roughness: 0.5, metalness: 0.5 })), 0, R + R * 0.06, 0); // Halterung hinten
    put(g, new THREE.Mesh(new THREE.ConeGeometry(R * 0.09, R * 0.3, 12), M.std({ color: srgb(0x374151), roughness: 0.5 })), 0, rimY - R * 0.3, 0).rotation.x = Math.PI; // Empfänger
    return g;
  }

  // ---------- Eis-Curling im Eis-Krater auf dem Mars: Bahn vom Startkreis über das Eis ----------
  // Weniger Schwerkraft: Der Stein drückt nicht so fest aufs Eis und bremst weniger (Bremsweg ∝ 1/g – auf der Erde nur gut ein Drittel so weit)
  const CURL_LEN = 22, CURL_DECEL = 0.8; // Ziel 22 m entfernt
  function curlLane(L) {
    const [sx, sz] = L.curling, [dx, dz] = MARS_CURL_DIR;
    return { sx, sz, dx, dz, tx: sx + dx * CURL_LEN, tz: sz + dz * CURL_LEN };
  }
  function marsIceTex() {
    return canvasTex(512, 512, (c) => {
      const g = c.createRadialGradient(256, 256, 0, 256, 256, 256);
      g.addColorStop(0, "rgba(232,244,252,1)"); g.addColorStop(0.8, "rgba(214,232,244,1)"); g.addColorStop(0.9, "rgba(196,150,120,0.9)"); g.addColorStop(1, "rgba(180,110,70,0)");
      c.fillStyle = g; c.fillRect(0, 0, 512, 512);
      c.strokeStyle = "rgba(150,185,210,0.55)"; c.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) { // feine Risse im Eis
        let x = 256 + (hash2(i, 1) - 0.5) * 380, y = 256 + (hash2(i, 2) - 0.5) * 380; c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (hash2(i, k + 3) - 0.5) * 70; y += (hash2(i, k + 9) - 0.5) * 70; c.lineTo(x, y); }
        c.stroke();
      }
      for (let i = 0; i < 160; i++) { c.fillStyle = "rgba(190,120,80," + (0.08 + 0.12 * hash2(i, 20)) + ")"; const a = hash2(i, 21) * 6.28, r = 150 + hash2(i, 22) * 95; c.beginPath(); c.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 3 + hash2(i, 23) * 9, 0, 7); c.fill(); } // Staub zum Rand hin
    });
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
    // "driving": der Joystick bleibt sichtbar – damit zielt man auf Tablet und Handy (vorher war er ausgeblendet, man konnte nur geradeaus werfen)
    enterExhibit("curling", { update: updateCurling, phase: "aim", aim: (Math.random() - 0.5) * 0.4, t: 0, left: 3, best: 0, v: 0, power: 0 }, "driving");
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
    world.curl.arrow.visible = false; Sound.push();
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
      sp.x += dx * sp.v * dt; sp.z += dz * sp.v * dt; sp.v = Math.max(0, sp.v - CURL_DECEL * (onMarsIce(sp.x, sp.z) ? 1 : 7) * dt); // neben dem Eis bremst der Staub sofort
      st.rotation.y += dt * sp.v * 0.6; // dreht sich beim Rutschen
      { const k = Math.min(1, sp.v / 6); Sound.loop("slide", sp.v > 0.05 ? 0.2 + 0.8 * k : 0, onMarsIce(sp.x, sp.z) ? k : k * 0.4); } // auf dem Staub dumpfer
      if (sp.v <= 0) { // liegen geblieben: wie nah am Ziel?
        sp.phase = "result"; Sound.loop("slide", 0);
        const d = Math.hypot(sp.x - ln.tx, sp.z - ln.tz), along = (sp.x - ln.sx) * ln.dx + (sp.z - ln.sz) * ln.dz;
        const pts = d < 1.2 ? 3 : d < 2.4 ? 2 : d < 3.8 ? 1 : 0;
        const first = pts > 0 && !sp.best; sp.best = Math.max(sp.best, pts);
        if (pts) { Sound.correct(); UI.confetti(pts * 40); } else Sound.wrong();
        let text = pts === 3 ? T.r3 : pts === 2 ? T.r2 : pts === 1 ? T.r1 : along < CURL_LEN ? T.short : T.long;
        if (first) text += " " + T.fact;
        const slid = Math.max(0, along - 1.4), fmt = (v) => v.toFixed(1).replace(".", ","); // gleicher Schwung auf der Erde: Bremsweg × g(Mars) / g(Erde)
        if (slid > 1) UI.toast(fmtVars(T.earth, { mars: fmt(slid), erde: fmt(slid * cfg.gravity / 9.81) }), "gold");
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
  // Globus wie im Klassenzimmer: gedrechselter Fuß, Halbmeridian aus Messing, Achse geneigt (tilt), Pfeil zeigt die Drehrichtung
  // (dir +1 = von oben gesehen gegen den Uhrzeiger wie die Erde, −1 = andersherum wie die Venus); vorn ein Namensschild
  function makeGlobe(id, tilt = 0, dir = 1, label = "") {
    const g = new THREE.Group(), R = 0.55, Y = 1.65;
    const bronze = new THREE.MeshStandardMaterial({ color: srgb(0x3a2c24), roughness: 0.45, metalness: 0.6 }), brass = new THREE.MeshStandardMaterial({ color: srgb(0xc9a227), roughness: 0.3, metalness: 0.85 });
    const foot = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.38, 0], [0.38, 0.05], [0.3, 0.1], [0.2, 0.16], [0.11, 0.22], [0.08, 0.35], [0.1, 0.42], [0.07, 0.5], [0.055, 0.85], [0.08, 0.9], [0.06, 0.96], [0.001, 0.97]].map(([a, b]) => new THREE.Vector2(a, b)), 24), bronze);
    foot.castShadow = true; g.add(foot);
    const axis = new THREE.Group(); axis.position.y = Y; axis.rotation.z = tilt; g.add(axis);
    const merid = new THREE.Mesh(new THREE.TorusGeometry(R + 0.08, 0.018, 8, 56, Math.PI), brass); merid.rotation.z = -Math.PI / 2; merid.castShadow = true; axis.add(merid);
    for (const sy of [-1, 1]) put(axis, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), brass), 0, sy * (R + 0.04), 0, false);
    const low = new V(Math.sin(tilt) * (R + 0.08), Y - Math.cos(tilt) * (R + 0.08), 0); // unterster Punkt des Meridians
    pipeSeg(g, { steel: brass }, new V(0, 0.95, 0), low, 0.022, brass);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshStandardMaterial({ map: W.bodies[id].mesh.material.map, roughness: 0.75 }));
    ball.castShadow = true; axis.add(ball);
    // Drehpfeil vorn am Äquator (dreht nicht mit)
    const col = dir > 0 ? 0x22c55e : 0xf97316, am = new THREE.MeshStandardMaterial({ color: srgb(col), emissive: srgb(col), emissiveIntensity: 0.35, roughness: 0.4 }), ra = R + 0.13;
    const P = (t) => new V(Math.cos(t) * ra, 0, Math.sin(t) * ra), t0 = -Math.PI / 2 + 0.75 * dir, t1 = -Math.PI / 2 - 0.75 * dir, pts = [];
    for (let k = 0; k <= 16; k++) pts.push(P(t0 + (t1 - t0) * (k / 16)));
    axis.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.022, 8), am));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 14), am), dv = P(t1).sub(P(t1 + 0.08 * dir)).normalize();
    tip.position.copy(P(t1)).addScaledVector(dv, 0.05); tip.quaternion.setFromUnitVectors(new V(0, 1, 0), dv); axis.add(tip);
    // gut sichtbares Fähnchen am Äquator: Stab und rotes Wimpel-Tuch
    const pin = new THREE.Group(); pin.position.z = R; ball.add(pin);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.5, roughness: 0.4 }));
    stick.rotation.x = Math.PI / 2; stick.position.z = 0.2; pin.add(stick);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16), new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide, roughness: 0.8 }));
    cloth.rotation.y = Math.PI / 2; cloth.position.set(0, 0.09, 0.3); pin.add(cloth);
    if (label) { // Namensschild am Fuß, schaut nach −Z (dort steht die Kamera beim Versuch)
      const plate = put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.13), new THREE.MeshStandardMaterial({ map: canvasTex(256, 80, (c) => { c.fillStyle = "#c9a227"; c.fillRect(0, 0, 256, 80); c.strokeStyle = "#7a5c12"; c.lineWidth = 6; c.strokeRect(3, 3, 250, 74); c.fillStyle = "#2b1d0e"; c.font = "bold 46px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, 128, 42); }), roughness: 0.35, metalness: 0.6 })), 0, 0.12, -0.42, false);
      plate.rotation.set(0.9, Math.PI, 0);
    }
    g.userData = { ball };
    return g;
  }

  // =========================================================
  //  Venus
  // =========================================================
  // =========================================================
  //  Venus: Kein Mensch könnte hier wohnen (465 °C, 90-facher Druck). Unten steht darum nur ein gepanzerter Roboter-Außenposten
  //  aus dicken Druckkugeln – wie bei den echten Venera-Sonden. Die Menschen wohnen 50 km hoch in den Wolken in einem Luftschiff (vom Boden aus unsichtbar)
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
    for (const x of [-1.4, 1.4]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.6), venusMetal(M, 1, 1)), x, -0.5, 0);
    g.userData.snap = [[-1.4, 0], [1.4, 0], [0, 0]];
    return g;
  }
  // Wind-Rover (NASA-Idee AREE): ohne Elektronik, angetrieben von einem Windrad – der Wind auf der Venus ist langsam, aber kräftig
  // Rad für Rover: Felge, Reifen mit schräg gestellten Stollen, Nabe mit Schrauben; Achse = x. Ein Netz je Material, zum Klonen
  function roverWheel(M, R, W, hubMat) {
    const wb = partBuilder(), lug = M.std({ color: srgb(0x2b2f36), roughness: 0.7, metalness: 0.4 }), n = Math.round(R * 34);
    wb.add(new THREE.CylinderGeometry(R * 0.91, R * 0.91, W, 32), M.metal, [0, 0, 0], [0, 0, Math.PI / 2]);
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; wb.add(new THREE.BoxGeometry(W * 1.1, R * 0.13, R * 0.18), lug, [0, Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95], [a, 0.35, 0]); }
    for (const sx of [-1, 1]) {
      wb.add(new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.02, 24), hubMat, [sx * (W / 2 + 0.005), 0, 0], [0, 0, Math.PI / 2]);
      wb.add(new THREE.CylinderGeometry(R * 0.22, R * 0.26, 0.08, 16), M.steel, [sx * (W / 2 + 0.04), 0, 0], [0, 0, Math.PI / 2]);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; wb.add(new THREE.CylinderGeometry(R * 0.035, R * 0.035, 0.04, 8), M.steel, [sx * (W / 2 + 0.025), Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4], [0, 0, Math.PI / 2]); }
    }
    return wb.group(true);
  }
  // Wind-Rover nach dem NASA-Konzept AREE: hitzefestes Fahrgestell mit abgerundeten Kanten, Schwingarme, große Räder mit Stollen,
  // zweistöckige Savonius-Windturbine aus blankem Metall (Antrieb ohne Batterie), vorn ein Tastfühler gegen Hindernisse,
  // hinten ein Radar-Reflektor (so „funkt“ der Rover mit dem Orbiter). Lokal: vorn = +Z
  function venusWindRover(M) {
    const g = new THREE.Group(), b = partBuilder();
    const alloy = venusMetal(M, 3, 1), steel = M.steel, dark = M.metal;
    const bright = M.std({ color: srgb(0xe4e7eb), roughness: 0.22, metalness: 0.9, side: THREE.DoubleSide });
    // Wanne: abgerundetes Rechteck, nach oben ausgezogen, darauf das Deck
    const rr = (w, d, rad) => { const sh = new THREE.Shape(), x = w / 2 - rad, z = d / 2 - rad; sh.moveTo(-x, -d / 2); sh.lineTo(x, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -z); sh.lineTo(w / 2, z); sh.quadraticCurveTo(w / 2, d / 2, x, d / 2); sh.lineTo(-x, d / 2); sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, z); sh.lineTo(-w / 2, -z); sh.quadraticCurveTo(-w / 2, -d / 2, -x, -d / 2); return sh; };
    const hull = new THREE.ExtrudeGeometry(rr(1.5, 2.5, 0.35), { depth: 0.62, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 6 });
    hull.rotateX(-Math.PI / 2); b.add(hull, alloy, [0, 0.72, 0]);
    b.add(new THREE.ExtrudeGeometry(rr(1.3, 2.25, 0.3), { depth: 0.06, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2), dark, [0, 1.42, 0]);
    for (const sx of [-1, 1]) { b.add(new THREE.BoxGeometry(0.04, 0.12, 2.3), M.orange, [sx * 0.83, 1.12, 0]); b.add(new THREE.BoxGeometry(0.03, 0.42, 0.5), dark, [sx * 0.84, 1.0, -0.55]); } // Zierleiste, Wartungsklappe
    // Schwingarme mit Drehlager an den Seiten
    for (const sx of [-1, 1]) {
      b.add(new THREE.BoxGeometry(0.12, 0.16, 2.05), dark, [sx * 1.0, 0.62, 0], [0.04 * sx, 0, 0]);
      b.add(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 16), steel, [sx * 0.95, 0.72, 0], [0, 0, Math.PI / 2]);
      for (const z of [-0.95, 0.95]) b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 12), steel, [sx * 1.1, 0.55, z], [0, 0, Math.PI / 2]);
    }
    // Getriebe unter dem Mast, Mast mit Lagern und zwei Streben
    b.add(new THREE.CylinderGeometry(0.26, 0.3, 0.32, 24), dark, [0, 1.6, 0.1]);
    b.add(new THREE.CylinderGeometry(0.06, 0.07, 1.25, 14), steel, [0, 2.3, 0.1]);
    for (const y of [1.82, 2.9]) b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 18), dark, [0, y, 0.1]);
    for (const sx of [-1, 1]) { const a = new V(sx * 0.55, 1.45, -0.6), c = new V(0, 2.5, 0.1), d = c.clone().sub(a); b.addM(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), steel, new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), d.clone().normalize()), new V(1, d.length(), 1))); }
    // Tastfühler vorn: Bügel mit Kugel – stößt der Rover an, weicht er aus
    b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), steel, [0, 0.945, 1.665], [Math.PI / 2 + 0.24, 0, 0]);
    b.add(new THREE.SphereGeometry(0.07, 14, 10), M.orange, [0, 0.83, 2.13]);
    b.add(new THREE.BoxGeometry(0.5, 0.08, 0.08), steel, [0, 1.06, 1.2]);
    // Radar-Reflektor hinten: drei senkrecht zueinander stehende Platten auf einem kurzen Pfosten
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), steel, [0.35, 1.72, -0.85]);
    for (const [rx, ry, rz] of [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]]) b.add(new THREE.PlaneGeometry(0.3, 0.3), bright, [0.35 + 0.075, 2.07, -0.85 + 0.075], [rx, ry, rz]);
    // kleines Messgerät mit Windfahne an einem Ausleger
    b.add(new THREE.BoxGeometry(0.06, 0.06, 0.6), steel, [-0.45, 1.75, -0.6], [0, 0.6, 0]);
    b.add(new THREE.BoxGeometry(0.18, 0.14, 0.14), M.hull ? M.hull(1, 1) : steel, [-0.6, 1.75, -0.85]);
    g.add(b.group(true));
    // Schild an beiden Seiten
    for (const sx of [-1, 1]) { const p = put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.24), signMat("🌬️ WIND-ROVER", "#7c2d12", 512, 112, 54)), sx * 0.835, 1.31, 0.25, false); p.rotation.y = sx * Math.PI / 2; }
    // Räder (drehen sich beim Fahren)
    const wheelSrc = roverWheel(M, 0.55, 0.36, alloy), wheels = [];
    for (const sx of [-1, 1]) for (const z of [-0.95, 0.95]) { const w = wheelSrc.clone(); w.position.set(sx * 1.32, 0.55, z); g.add(w); wheels.push(w); }
    // Savonius-Turbine: zwei Stufen aus je zwei Halbschalen (S-förmig), Endscheiben, die obere Stufe um 90° versetzt
    const turbine = new THREE.Group(); turbine.position.set(0, 3.0, 0.1); g.add(turbine);
    const disc = M.std({ color: srgb(0x9a3412), roughness: 0.45, metalness: 0.5 }), tb = partBuilder();
    for (let st = 0; st < 2; st++) {
      const y0 = st * 0.82, rot = st * Math.PI / 2;
      for (const sgn of [-1, 1]) {
        const blade = new THREE.CylinderGeometry(0.36, 0.36, 0.78, 24, 1, true, sgn > 0 ? 0 : Math.PI, Math.PI);
        tb.add(blade, bright, [Math.cos(rot) * sgn * 0.17, y0 + 0.4, -Math.sin(rot) * sgn * 0.17], [0, rot + Math.PI / 2, 0]);
      }
      for (const yy of [0, 0.8]) tb.add(new THREE.CylinderGeometry(0.62, 0.62, 0.03, 32), disc, [0, y0 + yy, 0]);
    }
    tb.add(new THREE.CylinderGeometry(0.035, 0.035, 1.75, 10), steel, [0, 0.85, 0]);
    tb.add(new THREE.SphereGeometry(0.07, 14, 10), disc, [0, 1.68, 0]);
    turbine.add(tb.group(true));
    g.userData = { turbine, wheels };
    return g;
  }
  // Venera 13: Landering mit Zacken, Druckkugel, Bremsscheibe und Antenne obendrauf
  // Radar-Peiler: Radarschüssel auf einem Dreibein, davor ein Bildschirm mit Radar-Kreisen (vorn = +Z)
  // Radar-Peiler: Vermessungs-Dreibein mit Drehkopf und Radarschüssel, daneben ein robuster Koffer-Bildschirm auf einem Ständer
  function makeRadarFinder(M) {
    const g = new THREE.Group(), case_ = M.std({ color: srgb(0x374151), roughness: 0.55, metalness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5, c = Math.cos(a), sn = Math.sin(a);
      rod(g, new V(c * 0.1, 1.42, sn * 0.1), new V(c * 0.45, 0.72, sn * 0.45), 0.032, M.steel); rod(g, new V(c * 0.45, 0.72, sn * 0.45), new V(c * 0.72, 0.02, sn * 0.72), 0.024, M.steel);
      put(g, new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 8), M.metal), c * 0.72, 0.03, sn * 0.72, false).rotation.x = Math.PI;
    }
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.1, 20), case_), 0, 1.47, 0);
    const head = new THREE.Group(); head.position.y = 1.55; g.add(head);
    put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 18), M.metal), 0, 0.11, 0);
    put(head, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.14), case_), 0, 0.26, 0);
    put(head, dishCap(M, 0.6, 0.85), 0, 0.45, 0.12).rotation.x = -1.15;
    put(head, new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80, toneMapped: false })), 0.14, 0.32, -0.05, false);
    const scr = canvasTex(256, 192, (c) => {
      c.fillStyle = "#03140c"; c.fillRect(0, 0, 256, 192);
      c.strokeStyle = "rgba(74,222,128,0.8)"; c.lineWidth = 3;
      for (const r of [24, 52, 80]) { c.beginPath(); c.arc(128, 96, r, 0, 7); c.stroke(); }
      c.beginPath(); c.moveTo(128, 96); c.lineTo(205, 50); c.stroke();
      c.fillStyle = "#bbf7d0"; c.beginPath(); c.arc(170, 70, 6, 0, 7); c.fill();
    });
    const stand = new THREE.Group(); stand.position.set(0, 0, 0.75); g.add(stand); // Koffer-Bildschirm auf Ständer (vorn)
    rod(stand, new V(0, 0, 0), new V(0, 0.95, -0.05), 0.03, M.steel);
    put(stand, new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 20), case_), 0, 0.02, 0);
    const box = new THREE.Group(); box.position.set(0, 1.05, -0.05); box.rotation.x = -0.4; stand.add(box);
    put(box, new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.12), case_), 0, 0, 0);
    put(box, new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.14), M.orange), 0, 0.29, 0, false);
    put(box, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), M.steel), 0, 0.34, 0, false);  // Griff
    put(box, new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false })), 0, 0, 0.062, false);
    rod(g, new V(0, 1.45, 0), new V(0, 1.0, 0.68), 0.01, new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 }), 5, false); // Kabel
    g.userData.head = head;
    return g;
  }
  function makeVenera(M) {
    const g = new THREE.Group();
    const shell = M.std({ color: srgb(0xe6e1d3), roughness: 0.5, metalness: 0.25 }), silver = M.std({ color: srgb(0xb9bec6), roughness: 0.32, metalness: 0.85 });
    const dark = M.std({ color: srgb(0x3d3f45), roughness: 0.45, metalness: 0.7 }), gold = M.std({ color: srgb(0xc9a046), roughness: 0.35, metalness: 0.85 });
    // Landering (federt den Aufprall ab) mit Zahnkranz unten
    const ring = put(g, new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.17, 14, 48), silver), 0, 0.22, 0); ring.rotation.x = Math.PI / 2; ring.scale.set(1, 1, 0.8);
    for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, t = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.035), silver), Math.sin(a) * 1.1, 0.06, Math.cos(a) * 1.1, false); t.rotation.set(0, a, Math.PI / 4); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; put(g, new THREE.Mesh(new THREE.CircleGeometry(0.045, 10), dark), Math.sin(a) * 1.1, 0.36, Math.cos(a) * 1.1, false).rotation.x = -Math.PI / 2; } // Löcher im Ring
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.98, 0.74, 36, 1, true), M.std({ color: srgb(0xcfcabd), roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide })), 0, 0.68, 0); // Stützkonus bis an die Kugel
    // Druckkugel (hielt 2 Stunden lang 470 °C und 90 bar aus) mit Nahtringen
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.82, 32, 22), shell), 0, 1.62, 0);
    for (const [y, r] of [[1.62, 0.83], [1.25, 0.72], [1.99, 0.72]]) { const n = put(g, new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 40), silver), 0, y, 0, false); n.rotation.x = Math.PI / 2; }
    // zwei Kamerafenster schräg nach unten (fotografierten den Boden rechts und links)
    for (const a of [Math.PI / 2, -Math.PI / 2]) {
      const cam = new THREE.Group(); cam.position.set(Math.sin(a) * 0.74, 1.42, Math.cos(a) * 0.74); cam.rotation.set(0, a, 0); g.add(cam);
      put(cam, new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.26), shell), 0, 0, 0.08);
      const win = put(cam, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.08, 16), dark), 0, -0.05, 0.22, false); win.rotation.x = Math.PI / 2 + 0.6;
      put(cam, new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), M.std({ color: srgb(0x1b3a52), roughness: 0.05, metalness: 0.9 })), 0, -0.075, 0.262, false).rotation.x = 0.6;
    }
    // Bremsscheibe: bremste den Fall durch die dichte Luft, Rand gezackt
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.05, 64), silver), 0, 2.42, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.42, 0.12, 64, 1, true), M.std({ color: srgb(0xd6d2c6), roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide })), 0, 2.35, 0);
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, z = put(g, new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), silver), Math.sin(a) * 1.47, 2.42, Math.cos(a) * 1.47, false); z.rotation.set(Math.PI / 2, a, 0, "YXZ"); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pipeSeg(g, M, new V(Math.sin(a) * 0.5, 2.15, Math.cos(a) * 0.5), new V(Math.sin(a) * 1.25, 2.4, Math.cos(a) * 1.25), 0.025, dark); }
    // Antennenturm mit Wendelantenne (funkte die Bilder zur Raumsonde, die sie zur Erde schickte)
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.55, 24), shell), 0, 2.72, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 24), silver), 0, 3.0, 0, false);
    const helix = []; for (let k = 0; k <= 80; k++) { const a = k * 0.42; helix.push(new V(Math.cos(a) * 0.12, 3.02 + k * 0.006, Math.sin(a) * 0.12)); }
    put(g, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 160, 0.012, 5), gold), 0, 0, 0, false);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), silver), 0, 3.27, 0, false);
    // Bohrarm für die Bodenprobe und Farbtafel am Landering
    pipeSeg(g, M, new V(0.62, 0.6, 0.55), new V(1.2, 0.18, 0.95), 0.04, dark);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.22, 10), dark), 1.24, 0.1, 0.98);
    const chartTex = canvasTex(128, 64, (c) => { const cols = ["#ffffff", "#9ca3af", "#111827", "#dc2626", "#16a34a", "#2563eb", "#facc15", "#f97316"]; cols.forEach((col, i) => { c.fillStyle = col; c.fillRect((i % 4) * 32, Math.floor(i / 4) * 32, 32, 32); }); });
    const chart = put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshStandardMaterial({ map: chartTex, roughness: 0.6 })), Math.sin(-0.6) * 1.33, 0.4, Math.cos(-0.6) * 1.33, false);
    chart.rotation.set(-0.5, -0.6, 0, "YXZ");
    pipeSeg(g, M, new V(Math.sin(-0.6) * 1.12, 0.3, Math.cos(-0.6) * 1.12), new V(Math.sin(-0.6) * 1.3, 0.36, Math.cos(-0.6) * 1.3), 0.02, dark);
    // abgeworfener Objektivdeckel liegt im Staub
    const cap = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), shell), -1.75, 0.0, 0.6); cap.rotation.x = 0.3;
    g.rotation.z = 0.05;
    return mergeStatic(g);
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
  const VENUS_BRIDGE_X = 4; // hier führt die Brücke über die Lava (= L.lava[0])
  const VENUS_LAYOUT = {
    spawn: [-6.9, 4], waage: [24, 10], hitze: [28, 30], druck: [16, 40], abendstern: [6, 66],
    venera: [-36, -26], radar: [9, -4], lava: [4, 50], wegweiser: [8, 5], // Venera 13 steht versteckt im Dunst, gesucht wird vom Radar-Peiler aus
    station: [-14, 74], tag: [-20, 67], groesse: [-8, 67], meet: [20, 24],
    route: {
      wegweiser: [[5.5, 2.5]], venera: [[5.2, 0.2]], waage: [[24, -2], [27.5, 6]], hitze: [[18, 6], [30, 18], [31.5, 26]],
      druck: [[26, 38], [19.5, 43]], lava: [[8, 46], [4, 46.5]], abendstern: [[4, 54], [3.5, 61.5]],
      tag: [[-6, 62], [-14, 61.5]], groesse: [[-6, 62.5]], wand: [[8, 46], [4, 46.5], [4, 54], [3.5, 61.5], [-6, 62], [-11, 69]], rakete: [[4, 60], [4, 46], [12, 30], [4, 8], [-4, 5]]
    }
  };
  function venusDome(x, z) { return VENUS_DOME[3] * smooth(VENUS_DOME[2], VENUS_DOME[2] - 8, Math.hypot(x - VENUS_DOME[0], z - VENUS_DOME[1])); }
  // Lava fließt in einer Rinne; unter der Brücke bleibt der Weg eben (wird nach den Ebenen abgezogen, siehe buildVenus)
  const venusLavaDip = (x, z) => 1.4 * smooth(4.5, 2, Math.abs(z - VENUS_LAVA_Z(x))) * smooth(48, 40, Math.abs(x)) * smooth(1.45, 2.4, Math.abs(x - VENUS_BRIDGE_X));
  const VENUS_SKY = new THREE.Color(0xd9a441), VENUS_CLEAR = new THREE.Color(0x05070f);
  const VENUS_EARTH_DIR = new V(0.35, 0.55, 0.75).normalize();
  function buildVenus() {
    const L = { ...VENUS_LAYOUT };
    const craters = [[70, 30, 14, 1.2], [-80, -50, 18, 1.6], [50, -80, 12, 1.2], [-70, 80, 12, 1]];
    const flats = [[0, 0, 11], [...L.station, 20, VENUS_DOME[3]], [L.station[0], L.station[1] + 16, 22, VENUS_DOME[3]], [...L.waage, 3], [...L.hitze, 5], [...L.druck, 5], [...L.abendstern, 6, VENUS_DOME[3], 4], [...L.venera, 4], [...L.radar, 3], [L.lava[0], 50, 9, 0, 6], rackFlat(L)];
    const B = buildBase({
      height: ((h) => (x, z) => h(x, z) - venusLavaDip(x, z))(makeHeight(craters, flats, 160, venusDome)),
      // dichte, giftige Wolken: gelb-oranger Dunst, man sieht kaum 100 Meter weit, die Sonne ist nur ein heller Schein
      sky: VENUS_SKY.getHex(), fog: [18, 190], stars: false, sunSize: 190,
      ground: 0x8a6a48, rock: 0x3a2c22,
      tint: (x, z) => {
        const m = 0.6 + 0.35 * fbm2(x * 0.03 + 4, z * 0.03), ridge = 1 - Math.abs(2 * fbm2(x * 0.018 + 11, z * 0.018 - 3) - 1); // erstarrte Lavaströme: dunkle Bänder
        const flow = smooth(0.72, 0.9, ridge), k = 1 - 0.42 * flow;
        return [m * k, m * 0.92 * k, m * 0.8 * (1 - 0.3 * flow)];
      },
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
    const hitzeTower = new THREE.Group();
    { // Klima-Messturm um das Thermometer
      const [hx, hz] = L.hitze, t = hitzeTower; on(t, hx, hz); t.rotation.y = board.rotation.y;
      // Gitterturm: vier Eckstiele, Ringe und Kreuzstreben, oben Gitterrost mit Geländer, Messgeräte (Hitzefühler im Strahlungsschutz, Windmesser, Antenne)
      const lvs = [0, 1.2, 2.4, 3.6], at = (y) => [1.5 - 0.4 * (y / 3.6), 0.85 - 0.3 * (y / 3.6)]; // breit genug für die Anzeigetafel in der Mitte
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rod(t, new V(x * 1.5, 0, z * 0.85), new V(x * 1.1, 3.6, z * 0.55), 0.065, M.orange);
      for (let i = 0; i < lvs.length; i++) {
        const [w, d] = at(lvs[i]), c4 = [[-w, -d], [w, -d], [w, d], [-w, d]];
        for (let k = 0; k < 4; k++) rod(t, new V(c4[k][0], lvs[i] + 0.03, c4[k][1]), new V(c4[(k + 1) % 4][0], lvs[i] + 0.03, c4[(k + 1) % 4][1]), 0.03, M.orange, 8, false);
        if (i < lvs.length - 1) { const [w2, d2] = at(lvs[i + 1]), e4 = [[-w2, -d2], [w2, -d2], [w2, d2], [-w2, d2]]; for (const k of [1, 3]) { rod(t, new V(c4[k][0], lvs[i], c4[k][1]), new V(e4[(k + 1) % 4][0], lvs[i + 1], e4[(k + 1) % 4][1]), 0.02, M.steel, 6, false); rod(t, new V(c4[(k + 1) % 4][0], lvs[i], c4[(k + 1) % 4][1]), new V(e4[k][0], lvs[i + 1], e4[k][1]), 0.02, M.steel, 6, false); } }
      }
      put(t, new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.3), venusMetal(M, 2, 1)), 0, 3.64, 0);
      for (const [x, z] of [[-1.15, -0.6], [1.15, -0.6], [1.15, 0.6], [-1.15, 0.6]]) rod(t, new V(x, 3.68, z), new V(x, 4.25, z), 0.02, M.steel, 6, false);
      for (const z of [-0.6, 0.6]) rod(t, new V(-1.15, 4.22, z), new V(1.15, 4.22, z), 0.02, M.steel, 6, false);
      for (const x of [-1.15, 1.15]) rod(t, new V(x, 4.22, -0.6), new V(x, 4.22, 0.6), 0.02, M.steel, 6, false);
      const shield = new THREE.Group(); shield.position.set(0.7, 3.68, 0); t.add(shield); // Strahlungsschutz: gestapelte Teller
      rod(shield, new V(0, 0, 0), new V(0, 0.75, 0), 0.02, M.steel, 6);
      for (let i = 0; i < 6; i++) put(shield, new THREE.Mesh(new THREE.CylinderGeometry(0.17 - i * 0.008, 0.2 - i * 0.008, 0.04, 20), M.hull(1, 1)), 0, 0.3 + i * 0.07, 0, false);
      const cups = new THREE.Group(); cups.position.set(-0.7, 4.45, 0); t.add(cups); t.userData.cups = cups;
      rod(t, new V(-0.7, 3.68, 0), new V(-0.7, 4.42, 0), 0.02, M.steel, 6);
      for (let i = 0; i < 3; i++) { const a = new THREE.Group(); a.rotation.y = (i / 3) * Math.PI * 2; cups.add(a); rod(a, new V(0, 0, 0), new V(0.2, 0, 0), 0.008, M.steel, 4, false); put(a, new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.std({ color: srgb(0xf1f5f9), roughness: 0.4, side: THREE.DoubleSide })), 0.2, 0, 0, false).rotation.x = Math.PI / 2; }
      rod(t, new V(1.0, 3.68, 0.45), new V(1.0, 5.0, 0.45), 0.012, M.steel, 6, false);
      mergeStatic(t, [cups]);
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
    { // Druck-Prüfstand: Werkbank aus Stahl, hinten eine Hubsäule – ihr Arm hebt die Glasglocke ab; dazu ein Manometer
      const bench = M.std({ color: srgb(0x4b5563), roughness: 0.45, metalness: 0.7 }), col = M.std({ color: srgb(0x9ca3af), roughness: 0.3, metalness: 0.85 });
      press.children.forEach((m) => { if (m.isMesh && m !== can && m !== dome) m.material = bench; });
      put(press, new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.04, 0.84), M.orange), 0, 0.985, 0, false);                       // Kante der Tischplatte
      put(press, new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.02, 32), col), 0, 1.035, 0);                            // Sockelplatte unter der Glocke
      put(press, new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.0, 0.2), col), 0, 1.5, 0.62);                                   // Hubsäule hinter dem Tisch
      put(press, new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), bench), 0, 0.03, 0.62);
      const arm = new THREE.Group(); arm.position.y = -1.03; dome.add(arm);                                                     // fährt mit der Glocke hoch
      put(arm, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.66), M.orange), 0, 1.95, 0.29);
      put(arm, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.28), M.orange), 0, 1.95, 0.62);                                // Schlitten an der Säule
      put(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 8), col), 0, 1.66, 0);                              // Stange zur Glocke
      put(arm, new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), col), 0, 1.38, 0, false);
      const gaugeTex = canvasTex(256, 256, (c) => { // Manometer: Skala 0 … 100 bar, Zeiger auf 92
        c.fillStyle = "#f8fafc"; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill(); c.lineWidth = 10; c.strokeStyle = "#1f2937"; c.stroke();
        c.lineWidth = 14; c.strokeStyle = "#dc2626"; c.beginPath(); c.arc(128, 128, 96, 0.75 * Math.PI + 1.5 * Math.PI * 0.8, 2.25 * Math.PI); c.stroke();
        c.fillStyle = "#111827"; c.font = "bold 22px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        for (let i = 0; i <= 10; i++) { const a = 0.75 * Math.PI + 1.5 * Math.PI * (i / 10); c.fillRect(128 + Math.cos(a) * 100 - 2, 128 + Math.sin(a) * 100 - 2, 4, 4); if (i % 2 === 0) c.fillText(String(i * 10), 128 + Math.cos(a) * 76, 128 + Math.sin(a) * 76); }
        c.fillText("bar", 128, 178);
        const a = 0.75 * Math.PI + 1.5 * Math.PI * 0.92; c.strokeStyle = "#111827"; c.lineWidth = 6; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); c.stroke();
        c.beginPath(); c.arc(128, 128, 10, 0, 7); c.fill();
      });
      put(press, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 28), col), 0, 1.45, 0.5).rotation.x = Math.PI / 2;
      put(press, new THREE.Mesh(new THREE.CircleGeometry(0.17, 28), new THREE.MeshBasicMaterial({ map: gaugeTex, toneMapped: false })), 0, 1.45, 0.455, false).rotation.y = Math.PI;
      put(press, new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.28), col), 0, 3.04, 0.62, false);
      const [px, pz] = L.druck, [ax, az] = L.route.druck[L.route.druck.length - 1], ad = Math.hypot(ax - px, az - pz) || 1, sx = px - ((az - pz) / ad) * 2.4, sz = pz + ((ax - px) / ad) * 2.4;
      on(makeSignBoard(M, "🥫 DRUCK-PRÜFSTAND · 92 bar", "#7c2d12", 2.8), sx, sz).rotation.y = Math.atan2(ax - sx, az - sz);
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
    const lavaTex = venusLavaTex(); lavaTex.repeat.set(1, 0.7);
    const lavaPts = []; for (let x = -46; x <= 40; x += 2) lavaPts.push([x, VENUS_LAVA_Z(x)]);
    const crustRiver = makePath(B, lavaPts, 7.5, [34, 22, 16]); // dunkle, erstarrte Kruste zu beiden Seiten (weicher Rand)
    const glowRiver = makePath(B, lavaPts, 6.2); // Glut, die das Ufer anstrahlt
    glowRiver.material = new THREE.MeshBasicMaterial({ map: venusGlowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -5 });
    const lavaRiver = makePath(B, lavaPts, 3.4); lavaRiver.material = new THREE.MeshBasicMaterial({ map: lavaTex, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6 }); // glüht durch den Dunst
    // unter der Brücke fließt die Lava tief in der Rinne weiter (dort ist der Weg aufgefüllt – sonst läge die Lava auf der Fahrbahn)
    for (const m of [crustRiver, glowRiver, lavaRiver]) {
      const pa = m.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); pa.setY(i, pa.getY(i) + (m === lavaRiver ? 0.22 : m === glowRiver ? 0.12 : 0) - 1.4 * smooth(4.5, 2, Math.abs(z - VENUS_LAVA_Z(x))) * (1 - smooth(1.45, 2.4, Math.abs(x - VENUS_BRIDGE_X)))); } // Lava steht als Fläche etwas über dem Rinnenboden
      pa.needsUpdate = true; m.geometry.computeBoundingSphere();
    }
    const bridge = venusBridge(M); bridge.position.set(VENUS_BRIDGE_X, height(VENUS_BRIDGE_X, VENUS_LAVA_Z(VENUS_BRIDGE_X)), VENUS_LAVA_Z(VENUS_BRIDGE_X)); bridge.rotation.y = -Math.atan(Math.cos(VENUS_BRIDGE_X * 0.08) * 0.24); scene.add(bridge); // quer zum Fluss
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
        put(b, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 16), M.metal), 0, 0.04, 0);
        put(b, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 1.05, 12), M.metal), 0, 0.58, 0);
        put(b, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.06, 16), M.metal), 0, 1.12, 0, false);
        beacons.push(put(b, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16), lampMat.clone()), 0, 1.23, 0, false));
        put(b, new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.09, 16), M.metal), 0, 1.355, 0, false); // Dach gegen die Säure-Wolken
        acc = len - s;
      }
      if (len < 7 - acc) acc += len;
    }
    const lavaCol = []; for (let x = -46; x <= 40; x += 2.6) if (Math.abs(x - L.lava[0]) > 1.6) lavaCol.push([x, VENUS_LAVA_Z(x), 1.5]);
    for (const sx of [-1.45, 1.45]) for (const dz of [-2.4, -0.8, 0.8, 2.4]) lavaCol.push([VENUS_BRIDGE_X + sx, VENUS_LAVA_Z(VENUS_BRIDGE_X) + dz, 0.25]);
    // Vulkan in der Ferne (auf der Venus gibt es Tausende)
    const cone = makeVenusVolcano(85, 42); cone.material.fog = true;
    cone.position.set(L.lava[0] - 110, height(L.lava[0] - 110, L.lava[1] - 90) - 2, L.lava[1] - 90); scene.add(cone);
    const lavaGlow = new THREE.PointLight(0xff6a1a, 1.2, 12, 1.5); lavaGlow.position.set(L.lava[0], height(...L.lava) + 1, L.lava[1]); scene.add(lavaGlow);
    const board2 = on(makeInfoBoard(M, "VENUS-AUSSENPOSTEN", ["☀️ Sonne: 108 Mio. km", "🌍 Erde: 38 – 261 Mio. km", "🌡️ 465 °C · 92-facher Druck"]), ...L.wegweiser);
    board2.rotation.y = Math.atan2(L.spawn[0] - L.wegweiser[0], L.spawn[1] - L.wegweiser[1]);
    // Wind-Rover, der langsam seine Runden dreht. (Saras Wolkenstation – ein Luftschiff – schwebt 50 km hoch in den Wolken:
    // vom Boden aus sieht man sie durch den dichten Dunst nicht, darum steht sie nicht in der Szene.)
    const windRover = on(venusWindRover(M), 44, -8);
    drawTour(B, L, [92, 74, 56], 1.9, "boots"); // Venus: dunkler Basalt-Pfad, dazu die Leitlichter
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95, vertexColors: true }); rockMat.userData.natural = true;
    const clusters = [[-30, 10, 5], [46, 34, 5], [-12, -24, 4], [30, -24, 4], [-40, 32, 5]];
    clusters.forEach(([x, z, n], i) => rockCluster(B, x, z, n, rockMat, i * 23 + 7));
    const anim = [(dt, t) => { // Wind-Rover fährt langsam im Kreis, sein Windrad dreht sich; die Lava flackert
      const a = t * 0.03, x = 44 + Math.cos(a) * 9, z = -8 + Math.sin(a) * 7;
      beacons.forEach((b, i) => { b.material.color.setRGB(1, 0.82, 0.54).multiplyScalar(0.45 + 0.9 * Math.max(0, Math.sin(t * 3 - i * 0.6))); }); // Lauflicht zeigt die Richtung
      windRover.position.set(x, height(x, z), z); windRover.rotation.y = Math.atan2(-Math.sin(a) * 9, Math.cos(a) * 7);
      windRover.userData.turbine.rotation.y += dt * 1.6;
      const spd = 0.03 * Math.hypot(Math.sin(a) * 9, Math.cos(a) * 7); windRover.userData.wheels.forEach((w) => { w.rotation.x += (dt * spd) / 0.55; });
      if (hitzeTower.userData.cups) hitzeTower.userData.cups.rotation.y += dt * 0.9; // Windmesser am Klima-Messturm (der Wind ist langsam)
      lavaGlow.intensity = 1 + 0.4 * Math.sin(t * 3.1) * Math.sin(t * 1.7);
      lavaTex.offset.y = -t * 0.035; // die Lava fließt langsam
    }];
    // Dreh-Vergleich: Erde und Venus als Globen nebeneinander
    const globes = new THREE.Group(), gE = makeGlobe("erde", 0.41, 1, "ERDE"), gV = makeGlobe("venus", -0.05, -1, "VENUS");
    gE.position.x = 0.9; gV.position.x = -0.9; globes.add(gE, gV);
    on(globes, ...L.tag);
    const { rack, cols: rackCols, spot: rackSpot } = placeSizeRack(B, ["mond", "venus", "erde"], L.station);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, hitze: L.hitze, druck: L.druck, tag: L.tag, groesse: rackSpot, abendstern: L.abendstern,
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
  // Raumfahrt-Besucherzentrum (vorn = −Z): weiße Metallfassade, Glasfront mit schlanken Pfosten und blauem Eingangsrahmen,
  // umlaufende Attika mit blauem Band, auf dem Dach die Planetariumskuppel (links), die Antenne der Bodenstation (rechts)
  // und ein großer Leuchtschriftzug
  function earthVisitorCenter(g, M, x, z, w, d, h) {
    const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b);
    const white = M.std({ color: srgb(0xf4f6f8), roughness: 0.32, metalness: 0.35 }), blue = M.std({ color: srgb(0x1d4ed8), roughness: 0.35, metalness: 0.2 });
    put(b, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.hull(w / 3, h / 2.6)), 0, h / 2, 0).receiveShadow = true;
    const glass = M.std({ color: srgb(0x8fb9dc), roughness: 0.04, metalness: 0.65, envMapIntensity: 1.5 });
    const n = 8, gw = w - 2, fw = gw / n;
    put(b, new THREE.Mesh(new THREE.PlaneGeometry(gw, h - 0.6), glass), 0, h / 2 - 0.05, -d / 2 - 0.02, false).rotation.y = Math.PI;
    for (let i = 0; i <= n; i++) put(b, new THREE.Mesh(new THREE.BoxGeometry(0.12, h - 0.5, 0.16), white), -gw / 2 + i * fw, h / 2 - 0.05, -d / 2 - 0.08);
    for (const y of [0.25, 2.8, h - 0.3]) put(b, new THREE.Mesh(new THREE.BoxGeometry(gw, 0.12, 0.16), white), 0, y, -d / 2 - 0.08);
    put(b, new THREE.Mesh(new THREE.BoxGeometry(2 * fw + 0.4, 0.28, 0.24), blue), 0, 2.72, -d / 2 - 0.13);                       // Eingangsrahmen
    for (const sx of [-1, 1]) put(b, new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.7, 0.24), blue), sx * (fw + 0.1), 1.35, -d / 2 - 0.13);
    put(b, new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.4, 0.06), white), 0, 1.25, -d / 2 - 0.12, false);                       // Fuge der Schiebetür
    // Attika mit blauem Band, Dachfläche
    put(b, new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.55, d + 0.3), white), 0, h + 0.27, 0);
    put(b, new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, 0.14, d + 0.34), blue), 0, h + 0.1, 0, false);
    put(b, new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.05, d - 0.2), M.std({ color: srgb(0x9aa0a6), roughness: 0.95 })), 0, h + 0.5, 0, false);
    // Planetariumskuppel: Ringsockel, Kuppel aus Platten, Lichtband
    const DX = -w / 2 + 5.2, DZ = 0.6, DR = 3.5;
    put(b, new THREE.Mesh(new THREE.CylinderGeometry(DR + 0.15, DR + 0.25, 0.7, 48), blue), DX, h + 0.85, DZ);
    put(b, new THREE.Mesh(new THREE.SphereGeometry(DR, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.hull(8, 3)), DX, h + 1.2, DZ);
    put(b, new THREE.Mesh(new THREE.TorusGeometry(DR + 0.02, 0.06, 8, 64), M.glowBlue), DX, h + 1.25, DZ, false).rotation.x = Math.PI / 2;
    put(b, new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.25, 24), white), DX, h + 1.2 + DR, DZ);
    // Antenne der Bodenstation auf dem Dach
    const AX = w / 2 - 4, AZ = 1.6;
    put(b, new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.4, 20), white), AX, h + 1.2, AZ);
    const dish = put(b, dishCap(M, 1.8, 0.6), AX, h + 2.3, AZ); dish.rotation.set(Math.PI + 0.85, -0.6, 0);
    // Leuchtschriftzug über der Front
    const SY = h + 3.3; // so hoch, dass er über dem „Wusstest du?“-Schild vor dem Haus zu sehen ist
    put(b, new THREE.Mesh(new THREE.BoxGeometry(13.4, 1.7, 0.3), white), 0, SY, -d / 2 + 0.6);
    put(b, new THREE.Mesh(new THREE.PlaneGeometry(13, 1.35), signMat("🚀 RAUMFAHRTZENTRUM", "#1e3a8a", 1600, 166, 104)), 0, SY, -d / 2 + 0.44, false).rotation.y = Math.PI;
    for (const sx of [-5, -1.7, 1.7, 5]) { put(b, new THREE.Mesh(new THREE.BoxGeometry(0.14, SY - h - 0.85, 0.14), white), sx, (SY - 0.85 + h + 0.5) / 2, -d / 2 + 0.75); }
    for (const sx of [-5, 5]) put(b, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.4), white), sx, h + 1.4, -d / 2 + 1.3, false).rotation.x = -0.9;
    return b;
  }
  // Nachbau einer Ariane 5 im Maßstab etwa 1 : 2, wie vor echten Raumfahrtzentren: Hauptstufe mit schwarzem Zwischenring und
  // Nutzlastverkleidung, zwei Feststoff-Booster mit Spitzen, Triebwerksdüsen, Schriftzug und Europa-Flagge; Betonsockel mit Stufe
  function earthAriane(M) {
    const g = new THREE.Group(), b = partBuilder(), P = 1.2; // P = Höhe des Sockels
    const paint = canvasTex(256, 512, (c) => { c.fillStyle = "#f4f4f1"; c.fillRect(0, 0, 256, 512); c.fillStyle = "rgba(0,0,0,0.10)"; for (let y = 40; y < 512; y += 64) c.fillRect(0, y, 256, 2); for (let x = 0; x < 256; x += 64) c.fillRect(x, 0, 2, 512); });
    paint.wrapS = THREE.RepeatWrapping;
    const white = M.std({ map: paint, roughness: 0.38, metalness: 0.12 }), black = M.std({ color: srgb(0x1f2328), roughness: 0.5, metalness: 0.3 });
    const nozzle = M.std({ color: srgb(0x3a3d42), roughness: 0.35, metalness: 0.8, side: THREE.DoubleSide }), copper = M.std({ color: srgb(0xa0522d), roughness: 0.4, metalness: 0.8 });
    const concrete = M.std({ color: srgb(0xb9b6ae), roughness: 0.95 });
    const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([rr, y]) => new THREE.Vector2(rr, y)), seg);
    // Sockel: Achteck mit Stufe
    b.add(new THREE.CylinderGeometry(3.7, 3.9, 0.5, 8), concrete, [0, 0.25, 0], [0, Math.PI / 8, 0]);
    b.add(new THREE.CylinderGeometry(3.2, 3.3, P - 0.5, 8), concrete, [0, 0.5 + (P - 0.5) / 2, 0], [0, Math.PI / 8, 0]);
    // Hauptstufe
    b.add(lathe([[0.95, P + 0.35], [0.86, P + 0.8], [0.66, P + 1.3], [0.45, P + 1.75], [0.38, P + 1.95]]), nozzle);   // Vulcain-Düse
    b.add(new THREE.TorusGeometry(0.95, 0.04, 8, 40), copper, [0, P + 0.35, 0], [Math.PI / 2, 0, 0]);
    for (const z of [-1.05, 1.05]) b.add(new THREE.BoxGeometry(0.25, 1.85, 0.25), concrete, [0, P + 0.92, z]);                 // Stützen unter der Hauptstufe
    b.add(new THREE.CylinderGeometry(1.25, 1.05, 0.5, 40), black, [0, P + 2.05, 0]);
    b.add(new THREE.CylinderGeometry(1.25, 1.25, 14.5, 48, 1, true), white, [0, P + 9.55, 0]);
    b.add(new THREE.CylinderGeometry(1.27, 1.27, 0.7, 48), black, [0, P + 17.1, 0]);
    b.add(lathe([[1.3, P + 17.45], [1.3, P + 19.2], [1.18, P + 20.4], [0.95, P + 21.4], [0.6, P + 22.2], [0.22, P + 22.7], [0.001, P + 22.85]], 48), white);
    // Booster links und rechts
    for (const sx of [-1, 1]) {
      const X = sx * 2.15;
      b.add(lathe([[0.62, P + 0.3], [0.55, P + 0.8], [0.45, P + 1.25]]), nozzle, [X, 0, 0]);
      for (const z of [-0.62, 0.62]) b.add(new THREE.BoxGeometry(0.28, 1.2, 0.28), concrete, [X + sx * 0.5, P + 0.6, z]);   // Stützen unter dem Booster
      b.add(new THREE.CylinderGeometry(0.82, 0.7, 0.5, 32), black, [X, P + 1.45, 0]);
      b.add(new THREE.CylinderGeometry(0.82, 0.82, 12.6, 40, 1, true), white, [X, P + 8.0, 0]);
      for (const y of [P + 4.6, P + 9.4]) b.add(new THREE.CylinderGeometry(0.835, 0.835, 0.12, 40), black, [X, y, 0]);
      b.add(lathe([[0.82, P + 14.3], [0.7, P + 15.3], [0.42, P + 16.1], [0.12, P + 16.6], [0.001, P + 16.7]], 40), white, [X, 0, 0]);
      for (const y of [P + 3.2, P + 13.6]) b.add(new THREE.BoxGeometry(0.75, 0.16, 0.22), black, [sx * 1.6, y, 0]);   // Halterungen
    }
    g.add(b.group(true));
    // Schriftzug senkrecht auf der Hauptstufe (vorn = −Z) und Europa-Flagge
    const label = (text, w, h, draw, y, r, a0, a1) => { const t = canvasTex(w, h, draw); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y[1] - y[0], 24, 1, true, a0, a1 - a0), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.4 })); m.position.y = (y[0] + y[1]) / 2; g.add(m); return m; };
    label("ARIANE", 128, 1024, (c) => { c.translate(64, 512); c.rotate(Math.PI / 2); c.fillStyle = "#1e3a8a"; c.font = "bold 92px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ARIANE 5", 0, 0); }, [P + 5.5, P + 15.5], 1.262, Math.PI - 0.3, Math.PI + 0.3);
    label("EU", 192, 128, (c) => { c.fillStyle = "#003399"; c.fillRect(0, 0, 192, 128); c.fillStyle = "#ffcc00"; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.beginPath(); c.arc(96 + Math.cos(a) * 38, 64 + Math.sin(a) * 38, 6, 0, 7); c.fill(); } }, [P + 15.9, P + 16.5], 1.262, Math.PI + 0.35, Math.PI + 1.05);
    return g;
  }
  // Startturm daneben: rot-weißer Gitterturm mit zwei Versorgungsarmen zur Rakete (Arme zeigen nach −Z), Blitzableiter oben
  function earthLaunchTower(M, H = 25) {
    const b = partBuilder(), red = M.std({ color: srgb(0xc81e1e), roughness: 0.45, metalness: 0.3 }), white = M.std({ color: srgb(0xf4f4f1), roughness: 0.4, metalness: 0.3 }), up = new V(0, 1, 0), S = 1.2;
    const bar = (a, c, rr, mat) => { const d = c.clone().sub(a); b.addM(new THREE.CylinderGeometry(rr, rr, 1, 6), mat, new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()), new V(1, d.length(), 1))); };
    const C = [[-S, -S], [S, -S], [S, S], [-S, S]];
    for (const [x, z] of C) b.add(new THREE.BoxGeometry(0.2, H, 0.2), red, [x, H / 2, z]);
    for (let y = 0, k = 0; y < H - 0.5; y += 2.5, k++) {
      const mat = k % 2 ? white : red;
      for (let i = 0; i < 4; i++) { const [x0, z0] = C[i], [x1, z1] = C[(i + 1) % 4]; bar(new V(x0, y + 2.5, z0), new V(x1, y + 2.5, z1), 0.06, mat); bar(new V(x0, y, z0), new V(x1, y + 2.5, z1), 0.045, mat); }
    }
    for (const y of [12, 19]) { // Versorgungsarme mit Geländer
      b.add(new THREE.BoxGeometry(0.9, 0.3, 3.0), white, [0, y, -S - 1.5]);
      for (const sx of [-0.4, 0.4]) { bar(new V(sx, y + 0.15, -S), new V(sx, y + 1.0, -S), 0.03, red); bar(new V(sx, y + 1.0, -S), new V(sx, y + 1.0, -S - 2.9), 0.03, red); bar(new V(sx, y + 0.15, -S - 2.9), new V(sx, y + 1.0, -S - 2.9), 0.03, red); }
      bar(new V(0, y - 2.2, -S), new V(0, y - 0.15, -S - 2.2), 0.08, red);
    }
    b.add(new THREE.BoxGeometry(2.8, 0.25, 2.8), white, [0, H + 0.1, 0]);
    b.add(new THREE.CylinderGeometry(0.04, 0.08, 4, 8), M.steel, [0, H + 2.2, 0]);
    const g = b.group(true); blinkLamp(g, 0xff3b30, 0, H + 4.25, 0).scale.setScalar(0.6);
    return g;
  }
  // Apollo-Kapsel als Ausstellungsstück: Hitzeschild (unten, braun verkohlt), Kegel mit Folienplatten, Fenster, Luke,
  // Steuerdüsen, oben der Andockstutzen; auf einem runden Sockel mit Schild
  function earthCapsule(M) {
    const g = new THREE.Group(), b = partBuilder(), Y = 0.55;
    const foil = M.std({ map: canvasTex(256, 128, (c) => { c.fillStyle = "#c9ccd1"; c.fillRect(0, 0, 256, 128); for (let i = 0; i < 16; i++) { c.fillStyle = "rgba(255,255,255," + (0.15 + hash2(i, 3) * 0.25) + ")"; c.fillRect(i * 16, 0, 15, 128); } c.fillStyle = "rgba(0,0,0,0.25)"; for (let y = 0; y < 128; y += 32) c.fillRect(0, y, 256, 2); }), roughness: 0.25, metalness: 0.85 });
    const shield = M.std({ color: srgb(0x5b3a24), roughness: 0.9 }), dark = M.metal;
    b.add(new THREE.CylinderGeometry(2.1, 2.3, Y, 40), M.std({ color: srgb(0x9ca3af), roughness: 0.8 }), [0, Y / 2, 0]);
    b.add(new THREE.LatheGeometry([[0.001, Y + 0.05], [1.2, Y + 0.12], [1.62, Y + 0.32], [1.66, Y + 0.45]].map(([a, c]) => new THREE.Vector2(a, c)), 48), shield);
    b.add(new THREE.LatheGeometry([[1.66, Y + 0.45], [1.6, Y + 0.55], [0.42, Y + 2.55], [0.38, Y + 2.62]].map(([a, c]) => new THREE.Vector2(a, c)), 48), foil);
    b.add(new THREE.CylinderGeometry(0.34, 0.38, 0.35, 24), foil, [0, Y + 2.8, 0]);
    b.add(new THREE.ConeGeometry(0.1, 0.35, 12), dark, [0, Y + 3.12, 0]);
    // Fenster und Luke vorn (−Z)
    const sl = Math.atan2(2.0, 1.22); // Neigung der Kegelwand
    for (const [a, y, rr] of [[Math.PI - 0.55, Y + 1.7, 0.14], [Math.PI + 0.55, Y + 1.7, 0.14]]) { const rad = 1.6 - (y - Y - 0.55) * (1.22 / 2.0); b.add(new THREE.CircleGeometry(rr, 20), M.std({ color: srgb(0x0b1d33), roughness: 0.05, metalness: 0.8 }), [Math.sin(a) * (rad + 0.02), y, Math.cos(a) * (rad + 0.02)], [-(Math.PI / 2 - sl), a, 0], 1, null, "YXZ"); }
    { const a = Math.PI, y = Y + 1.25, rad = 1.6 - (y - Y - 0.55) * (1.22 / 2.0); b.add(new THREE.BoxGeometry(0.62, 0.75, 0.04), dark, [Math.sin(a) * (rad + 0.02), y, Math.cos(a) * (rad + 0.02)], [-(Math.PI / 2 - sl), a, 0], 1, null, "YXZ"); }
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4, y = Y + 1.0, rad = 1.6 - (y - Y - 0.55) * (1.22 / 2.0); b.add(new THREE.BoxGeometry(0.18, 0.18, 0.12), dark, [Math.sin(a) * (rad + 0.05), y, Math.cos(a) * (rad + 0.05)], [0, a, 0]); }
    g.add(b.group(true));
    const sign = makeSignBoard(M, "🛰️ APOLLO-KAPSEL – FLOG ZUM MOND", "#1e3a8a", 3.2); sign.position.set(0, 0, -2.9); g.add(sign);
    return g;
  }
  // Fahnenmast mit Fahne, die leicht weht  // Fahnenmast mit Fahne, die leicht weht
  // Fahnen am Besucherzentrum (Seitenverhältnis 5 : 3): Deutschland, Stadt Hannover, NASA
  function flagTex(kind) {
    return canvasTex(500, 300, (c) => {
      if (kind === "de") { [["#000000", 0], ["#dd0000", 100], ["#ffce00", 200]].forEach(([col, y]) => { c.fillStyle = col; c.fillRect(0, y, 500, 100); }); return; }
      if (kind === "hannover") { // Rot-Weiß mit dem Stadtwappen: roter Schild, silberne Mauer mit zwei Türmen, goldener Löwe, goldenes Schildchen mit grünem Kleeblatt
        c.fillStyle = "#d4111a"; c.fillRect(0, 0, 500, 150); c.fillStyle = "#ffffff"; c.fillRect(0, 150, 500, 150);
        c.save(); c.translate(250, 150);
        c.fillStyle = "#c4141c"; c.strokeStyle = "#7a0a0f"; c.lineWidth = 4;
        c.beginPath(); c.moveTo(-62, -82); c.lineTo(62, -82); c.lineTo(62, 10); c.quadraticCurveTo(62, 70, 0, 92); c.quadraticCurveTo(-62, 70, -62, 10); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#eef0f2"; c.strokeStyle = "#8a8f96"; c.lineWidth = 2;
        c.fillRect(-48, -2, 96, 50); c.strokeRect(-48, -2, 96, 50);                               // Mauer
        for (const x of [-48, 22]) { c.fillRect(x, -50, 26, 50); c.strokeRect(x, -50, 26, 50); for (let k = 0; k < 3; k++) c.fillRect(x + k * 10, -60, 6, 12); } // Türme mit Zinnen
        for (let k = 0; k < 5; k++) c.fillRect(-20 + k * 9, -10, 6, 10);                          // Zinnen dazwischen
        c.fillStyle = "#1f2937"; c.beginPath(); c.moveTo(-14, 48); c.lineTo(-14, 26); c.quadraticCurveTo(0, 12, 14, 26); c.lineTo(14, 48); c.fill(); // Tor
        c.fillStyle = "#f2c230"; c.beginPath(); c.ellipse(0, -26, 13, 9, 0, 0, 7); c.fill(); c.fillRect(-10, -20, 4, 9); c.fillRect(6, -20, 4, 9); c.beginPath(); c.arc(11, -34, 6, 0, 7); c.fill(); // Löwe (vereinfacht)
        c.fillStyle = "#f2c230"; c.beginPath(); c.moveTo(-8, 28); c.lineTo(8, 28); c.lineTo(8, 36); c.quadraticCurveTo(8, 44, 0, 46); c.quadraticCurveTo(-8, 44, -8, 36); c.closePath(); c.fill(); // goldenes Schildchen
        c.fillStyle = "#15803d"; for (const [x, y] of [[-3, 33], [3, 33], [0, 28]]) { c.beginPath(); c.arc(x, y + 3, 3, 0, 7); c.fill(); } c.fillRect(-0.7, 36, 1.4, 6); // Kleeblatt
        c.restore(); return;
      }
      // NASA: dunkelblaues Tuch mit dem runden Abzeichen (blaue Kugel, Sterne, Umlaufbahn, rote Pfeilform, Schriftzug)
      c.fillStyle = "#0b3d91"; c.fillRect(0, 0, 500, 300);
      c.save(); c.translate(250, 150);
      c.fillStyle = "#1e5bc6"; c.beginPath(); c.arc(0, 0, 112, 0, 7); c.fill(); c.strokeStyle = "#ffffff"; c.lineWidth = 3; c.stroke();
      c.fillStyle = "#ffffff"; for (let i = 0; i < 26; i++) { const a = hash2(i, 7) * 6.3, r = Math.sqrt(hash2(i, 8)) * 100; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 1 + hash2(i, 9) * 1.6, 0, 7); c.fill(); }
      c.strokeStyle = "#ffffff"; c.lineWidth = 3; c.beginPath(); c.ellipse(4, 2, 104, 36, -0.35, 0, 7); c.stroke(); // Umlaufbahn
      c.fillStyle = "#fc3d21"; c.beginPath(); c.moveTo(-120, 52); c.quadraticCurveTo(-10, 8, 128, -58); c.quadraticCurveTo(10, -4, -96, 76); c.closePath(); c.fill(); // roter „Vektor“
      c.fillStyle = "#ffffff"; c.font = "bold 58px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("NASA", 0, 6);
      c.restore();
    });
  }
  function earthFlag(M, kind) {
    const g = new THREE.Group();
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 6, 8), M.steel), 0, 3, 0);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M.steel), 0, 6.02, 0, false); // Knauf
    const tex = flagTex(kind), back = tex.clone(); back.needsUpdate = true; back.wrapS = THREE.RepeatWrapping; back.repeat.x = -1; back.offset.x = 1; // Rückseite nicht spiegelverkehrt
    const geo = new THREE.PlaneGeometry(1.8, 1.08, 18, 8);
    const cloth = put(g, new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.FrontSide, roughness: 0.8 })), 0.92, 5.4, 0, false);
    cloth.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: back, side: THREE.BackSide, roughness: 0.8 })));
    g.userData.cloth = cloth;
    return g;
  }
  // Volkssternwarte mit Rolldach: niedrige Holzhütte, das Satteldach rollt zum Beobachten auf Schienen zur Seite (lokal: Tür nach +Z)
  function earthRollRoof(M) {
    const g = new THREE.Group(), W2 = 2.4, D2 = 2.2, H = 1.6;
    const trim = M.std({ color: srgb(0xf4f1ea), roughness: 0.6 });
    for (const [x, z, w, d] of [[0, -D2, W2 * 2, 0.2], [-W2, 0, 0.2, D2 * 2], [W2, 0, 0.2, D2 * 2], [-1.5, D2, 1.8, 0.2], [1.5, D2, 1.8, 0.2]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wood(M, w > 1 ? 2 : 0.4, 1)), x, H / 2, z);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.36, 0.2), wood(M, 0.5, 0.3)), 0, H - 0.18, D2);                               // Sturz über der Tür
    for (const [x, z] of [[-W2, -D2], [W2, -D2], [-W2, D2], [W2, D2]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.28, H + 0.02, 0.28), trim), x, H / 2, z); // Eckpfosten
    for (const x of [-0.62, 0.62]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, H - 0.36, 0.26), trim), x, (H - 0.36) / 2, D2);  // Türrahmen
    const door = new THREE.Group(); door.position.set(0.58, 0, D2 + 0.08); door.rotation.y = 1.2; g.add(door);                       // offene Tür
    put(door, new THREE.Mesh(new THREE.BoxGeometry(1.12, H - 0.38, 0.06), wood(M, 0.5, 1)), -0.56, (H - 0.38) / 2, 0);
    put(door, new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M.steel), -1.0, 0.85, 0.05, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(W2 * 2, 0.05, D2 * 2), M.std({ color: srgb(0x8b8f96), roughness: 0.9 })), 0, 0.03, 0, false);
    // Schienen zum Rollen des Dachs mit Stützen
    for (const z of [-D2 - 0.1, D2 + 0.1]) {
      put(g, new THREE.Mesh(new THREE.BoxGeometry(W2 * 4.3, 0.12, 0.14), M.steel), W2 * 1.05, H + 0.06, z);
      for (const x of [W2 * 1.55, W2 * 2.4, W2 * 3.15]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.14, H, 0.14), M.steel), x, H / 2, z);
    }
    for (const x of [W2 * 2.4, W2 * 3.15]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, D2 * 2 + 0.2), M.steel), x, H - 0.25, 0);
    // Dach: Rahmen, Satteldach mit Giebeln, Stehfalz-Blech, First, Rollen
    const roof = new THREE.Group(); roof.position.y = H + 0.12; g.add(roof);
    const RW = W2 * 2 + 0.5, RD = D2 + 0.4, pitch = 0.42, RH = Math.tan(pitch) * RD;
    put(roof, new THREE.Mesh(new THREE.BoxGeometry(W2 * 2 + 0.36, 0.32, D2 * 2 + 0.36), wood(M, 2, 0.3)), 0, 0.16, 0);
    const gable = new THREE.Shape(); gable.moveTo(-D2 - 0.18, 0); gable.lineTo(D2 + 0.18, 0); gable.lineTo(0, Math.tan(pitch) * (D2 + 0.18)); gable.closePath();
    const gGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.12, bevelEnabled: false });
    for (const x of [-W2 - 0.18, W2 + 0.06]) put(roof, new THREE.Mesh(gGeo, wood(M, 1, 0.4)), x, 0.32, 0).rotation.y = Math.PI / 2;
    const sheet = M.std({ color: M.orange.color.clone(), roughness: 0.35, metalness: 0.45 });
    const slopeLen = RD / Math.cos(pitch);
    for (const sz of [-1, 1]) {
      const side = new THREE.Group(); side.position.set(0, 0.32 + RH, 0); side.rotation.x = sz * pitch; roof.add(side);
      put(side, new THREE.Mesh(new THREE.BoxGeometry(RW, 0.07, slopeLen), sheet), 0, -0.035, sz * slopeLen / 2);
      for (let i = 0; i <= 12; i++) put(side, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, slopeLen), sheet), -RW / 2 + 0.1 + i * (RW - 0.2) / 12, 0.02, sz * slopeLen / 2, false);
      put(side, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, RW, 10, 1, true), M.steel), 0, -0.08, sz * (slopeLen + 0.04), false).rotation.z = Math.PI / 2; // Regenrinne
    }
    put(roof, new THREE.Mesh(new THREE.BoxGeometry(RW + 0.04, 0.12, 0.22), sheet), 0, 0.32 + RH + 0.02, 0);
    for (const x of [-W2 * 0.7, W2 * 0.7]) for (const z of [-D2 - 0.1, D2 + 0.1]) put(roof, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), M.metal), x, -0.03, z, false).rotation.x = Math.PI / 2;
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.375), signMat("🔭 VOLKSSTERNWARTE", "#16a34a", 600, 112, 50)), 0, H - 0.18, D2 + 0.115, false);
    g.userData = { roof, open: 0, target: 0, set(k) { roof.position.x = k * W2 * 2.1; } };
    mergeStatic(roof); return mergeStatic(g, [roof]);
  }
  // Wetterstation (lokal: vorn = −Z): weiße Wetterhütte mit Lamellen, Windmast, Regenmesser, Solarmodul – und ein Wetterballon,
  // der am Startplatz gefüllt wird und dann aufsteigt (Ablauf in der Erd-Animation)
  function earthWeather(M) {
    const g = new THREE.Group(), white = M.std({ color: srgb(0xf7f7f4), roughness: 0.55 }), shade = M.std({ color: srgb(0xe2e2dc), roughness: 0.6 });
    // Wetterhütte: vier Beine, Kasten mit schrägen Lamellen an allen Seiten (Luft kommt hinein, Sonne nicht), Doppeldach
    const HW = 0.9, HD = 0.7, Y0 = 1.0, HH = 0.8;
    for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.07, Y0 + 0.05, 0.07), white), x, (Y0 + 0.05) / 2, z);
    for (const [x, z] of [[0, -0.3], [0, 0.3]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.04), white), x, 0.35, z); // Querlatten der Beine
    put(g, new THREE.Mesh(new THREE.BoxGeometry(HW, 0.04, HD), shade), 0, Y0, 0);
    for (const [x, z] of [[-HW / 2, -HD / 2], [HW / 2, -HD / 2], [-HW / 2, HD / 2], [HW / 2, HD / 2]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, HH, 0.06), white), x, Y0 + HH / 2, z);
    const slat = (len) => new THREE.BoxGeometry(len, 0.11, 0.012);
    for (let i = 0; i < 8; i++) {
      const y = Y0 + 0.07 + i * 0.09;
      for (const sz of [-1, 1]) { const m = put(g, new THREE.Mesh(slat(HW - 0.06), white), 0, y, sz * (HD / 2 - 0.01), false); m.rotation.x = sz * 0.75; }
      for (const sx of [-1, 1]) { const m = put(g, new THREE.Mesh(slat(HD - 0.06), white), sx * (HW / 2 - 0.01), y, 0, false); m.rotation.set(0, Math.PI / 2, 0); m.rotateX(sx * 0.75); }
    }
    for (const x of [-0.02, 0.02]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.03, HH, 0.03), white), x, Y0 + HH / 2, -HD / 2 - 0.02, false); // Türfuge in der Mitte
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), M.metal), 0.08, Y0 + HH / 2, -HD / 2 - 0.04, false);                 // Türknauf
    put(g, new THREE.Mesh(new THREE.BoxGeometry(HW + 0.1, 0.04, HD + 0.1), white), 0, Y0 + HH + 0.02, 0);                            // inneres Dach
    for (const sz of [-1, 1]) { const r = put(g, new THREE.Mesh(new THREE.BoxGeometry(HW + 0.24, 0.035, HD / 2 + 0.2), white), 0, Y0 + HH + 0.16, sz * (HD / 4 + 0.08)); r.rotation.x = sz * 0.32; } // äußeres Satteldach
    for (const x of [-0.38, 0.38]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), white), x, Y0 + HH + 0.08, 0);       // Abstandshalter (Luft zwischen den Dächern)
    // Windmast mit Querarm: Schalenkreuz (dreht sich im Wind) und Windfahne
    const MX = -1.7, MZ = 0.5, MH = 6.4;
    { // Dreiecks-Gittermast mit Zickzack-Streben und drei Abspannseilen
      const leg = (k) => { const a = (k / 3) * Math.PI * 2; return [MX + Math.cos(a) * 0.17, MZ + Math.sin(a) * 0.17]; };
      for (let k = 0; k < 3; k++) { const [x, z] = leg(k); rod(g, new V(x, 0, z), new V(x, MH, z), 0.018, M.steel, 6); }
      for (let y = 0, i = 0; y < MH - 0.3; y += 0.4, i++) for (let k = 0; k < 3; k++) { const [x0, z0] = leg(k), [x1, z1] = leg(k + 1); rod(g, new V(x0, y + (i % 2 ? 0.4 : 0), z0), new V(x1, y + (i % 2 ? 0 : 0.4), z1), 0.008, M.steel, 4, false); }
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.5; rod(g, new V(MX, MH * 0.72, MZ), new V(MX + Math.cos(a) * 2.5, 0.02, MZ + Math.sin(a) * 2.5), 0.006, M.metal, 4, false); put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.08, 8), M.metal), MX + Math.cos(a) * 2.5, 0.04, MZ + Math.sin(a) * 2.5, false); }
    }
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 12), M.metal), MX, 0.06, MZ);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.05), M.steel), MX, MH, MZ);
    const cups = new THREE.Group(); cups.position.set(MX - 0.45, MH + 0.28, MZ); g.add(cups);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), M.steel), MX - 0.45, MH + 0.14, MZ, false);
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Group(); arm.rotation.y = (i / 3) * Math.PI * 2; cups.add(arm);
      put(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), M.steel), 0.11, 0, 0, false).rotation.z = Math.PI / 2;
      const cup = put(arm, new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.std({ color: srgb(0xf8fafc), roughness: 0.4, side: THREE.DoubleSide })), 0.22, 0, 0, false);
      cup.rotation.x = Math.PI / 2;
    }
    put(cups, new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.steel), 0, 0, 0, false);
    const vane = new THREE.Group(); vane.position.set(MX + 0.45, MH + 0.2, MZ); g.add(vane);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), M.steel), MX + 0.45, MH + 0.1, MZ, false);
    put(vane, new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 5), M.steel), 0, 0, 0, false).rotation.x = Math.PI / 2;
    put(vane, new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), M.orange), 0, 0, 0.33, false).rotation.x = Math.PI / 2;
    put(vane, new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.14, 0.18), M.orange), 0, 0, -0.27, false);
    // Solarmodul und Datenlogger am Mast (die Station misst ganz von allein)
    const pv = put(g, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.45), M.std({ color: srgb(0x1e3a8a), roughness: 0.2, metalness: 0.6 })), MX, 2.5, MZ - 0.3); pv.rotation.x = -0.6; put(g, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.26), M.steel), MX, 2.45, MZ - 0.13, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.18), M.std({ color: srgb(0xd1d5db), roughness: 0.5 })), MX, 1.5, MZ - 0.14);
    // Regenmesser nach Hellmann: Auffangtrichter auf 1 m Höhe
    const RX = 1.3, RZ = -0.4;
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), M.steel), RX, 0.45, RZ);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.42, 20), M.steel), RX, 1.08, RZ);
    const rim = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 24), M.steel), RX, 1.29, RZ, false); rim.rotation.x = Math.PI / 2;
    put(g, new THREE.Mesh(new THREE.CircleGeometry(0.095, 20), M.metal), RX, 1.275, RZ, false).rotation.x = -Math.PI / 2;
    // Startplatz für den Wetterballon: Betonplatte, zwei Gasflaschen
    const PX = 2.6, PZ = 1.4;
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.8), M.std({ color: srgb(0xb8b5ad), roughness: 0.95 })), PX, 0.03, PZ, false).receiveShadow = true;
    for (const dx of [0.75, 0.55]) { put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.2, 14), M.std({ color: srgb(0x6b7280), roughness: 0.4, metalness: 0.5 })), PX + dx, 0.66, PZ + 0.75); put(g, new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.std({ color: srgb(0x6b7280), roughness: 0.4, metalness: 0.5 })), PX + dx, 1.26, PZ + 0.75, false); }
    // Füllstutzen auf einem Ständer, Schlauch zu den Gasflaschen
    rod(g, new V(PX, 0.06, PZ), new V(PX, 1.0, PZ), 0.035, M.steel);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 12), M.metal), PX, 1.04, PZ);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.06, 16), M.metal), PX, 0.09, PZ, false);
    const hose = [new V(PX, 0.95, PZ), new V(PX + 0.2, 0.5, PZ + 0.25), new V(PX + 0.45, 0.12, PZ + 0.55), new V(PX + 0.62, 1.2, PZ + 0.75)];
    put(g, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hose), 20, 0.02, 6), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 })), 0, 0, 0, false);
    // Wetterballon: Nullpunkt = Hals (sitzt beim Füllen auf dem Stutzen), Hülle wächst beim Füllen; Sonde und Fallschirm hängen an der Schnur
    const balloon = new THREE.Group(); balloon.position.set(PX, 1.1, PZ); g.add(balloon);
    const prof = []; for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + (i / 20) * Math.PI; prof.push(new THREE.Vector2(a >= 0 ? Math.cos(a) * 0.8 : Math.max(0.04, Math.cos(a) * 0.8 * (0.85 + 0.15 * (1 + Math.sin(a)))), Math.sin(a) * 0.8 + (a < 0 ? Math.sin(a) * 0.25 : 0))); }
    const body = new THREE.Group(); balloon.add(body);
    put(body, new THREE.Mesh(new THREE.LatheGeometry(prof, 28), M.std({ color: srgb(0xf5f3ee), roughness: 0.35 })), 0, 1.05, 0, false);
    put(balloon, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 10), M.std({ color: srgb(0xf5f3ee), roughness: 0.35 })), 0, 0.02, 0, false);
    const sonde = new THREE.Group(); g.add(sonde);
    put(sonde, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.12), M.std({ color: srgb(0xf8fafc), roughness: 0.5 })), 0, 0.1, 0, false);
    put(sonde, new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 3), M.metal), 0.05, 0.35, 0, false);
    const chute = put(g, new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.14, 12, 1, true), M.std({ color: srgb(0xf97316), roughness: 0.6, side: THREE.DoubleSide })), 0, 0, 0, false);
    const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xe5e7eb })); line.frustumCulled = false; g.add(line);
    // Sonnenschein-Autograph: Glaskugel auf einer weißen Säule bündelt das Sonnenlicht und brennt eine Spur in einen Papierstreifen
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.3, 16), M.std({ color: srgb(0xf7f7f4), roughness: 0.6 })), 2.6, 0.65, -2.4);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.34), M.metal), 2.6, 1.32, -2.4);
    const bowl = put(g, new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24, Math.PI * 1.1), M.std({ color: srgb(0xc9a227), roughness: 0.3, metalness: 0.85 })), 2.6, 1.5, -2.4); bowl.rotation.set(0, Math.PI / 2, Math.PI + 0.25);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), M.std({ color: srgb(0xe0f2fe), roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.55, envMapIntensity: 2 })), 2.6, 1.5, -2.4, false);
    // Strahlungsmesser: Ausleger mit zwei Glaskuppeln
    rod(g, new V(-3.4, 0, -1.2), new V(-3.4, 1.5, -1.2), 0.03, M.steel);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.06), M.steel), -3.4, 1.5, -1.2);
    for (const x of [-3.75, -3.05]) { put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), M.std({ color: srgb(0xf7f7f4), roughness: 0.5 })), x, 1.55, -1.2); put(g, new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.std({ color: srgb(0xe0f2fe), roughness: 0.02, transparent: true, opacity: 0.6 })), x, 1.58, -1.2, false); }
    // Erdbodenthermometer: kleine weiße Messfühler in einer Reihe
    for (let k = 0; k < 5; k++) { put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35 + k * 0.05, 8), M.std({ color: srgb(0xf7f7f4), roughness: 0.5 })), 0.4 + k * 0.4, 0.17, -3.3); put(g, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.02), M.metal), 0.4 + k * 0.4, 0.38 + k * 0.025, -3.3, false); }
    // Messfeld: gemähter Rasen mit Streifen, weißer Zaun mit Maschendraht, Tor vorn und hinten
    const FX = 4.6, FZ = 4.2, lawn = new THREE.Mesh(new THREE.PlaneGeometry(2 * FX, 2 * FZ), new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "rgba(140,200,110,0.35)" : "rgba(60,120,50,0.25)"; c.fillRect(i * 32, 0, 32, 64); } }), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 1 }));
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.02; lawn.receiveShadow = true; g.add(lawn);
    const mesh = canvasTex(64, 64, (c) => { c.strokeStyle = "rgba(190,196,204,1)"; c.lineWidth = 2; for (let k = -64; k < 128; k += 12) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 64, 64); c.stroke(); c.beginPath(); c.moveTo(k + 64, 0); c.lineTo(k, 64); c.stroke(); } });
    mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
    const wire = new THREE.MeshStandardMaterial({ map: mesh, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 }), postM = M.std({ color: srgb(0xf7f7f4), roughness: 0.5 }), fence = [];
    const side = (ax, az, bx, bz) => { // Zaunstück von a nach b: Pfosten, zwei Holme, Maschendraht
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.2)), ry = Math.atan2(bz - az, bx - ax);
      for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n; put(g, new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.15, 0.07), postM), x, 0.575, z); }
      for (let k = 0; k <= Math.round(len / 0.45); k++) fence.push([ax + ((bx - ax) * k) / Math.round(len / 0.45), az + ((bz - az) * k) / Math.round(len / 0.45)]);
      for (const y of [1.1, 0.12]) put(g, new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.04), postM), (ax + bx) / 2, y, (az + bz) / 2, false).rotation.y = -ry;
      const t = mesh.clone(); t.needsUpdate = true; t.repeat.set(len / 0.6, 1.6); const wm = wire.clone(); wm.map = t;
      put(g, new THREE.Mesh(new THREE.PlaneGeometry(len, 0.95), wm), (ax + bx) / 2, 0.61, (az + bz) / 2, false).rotation.y = -ry;
    };
    side(-FX, -FZ, -1.2, -FZ); side(1.2, -FZ, FX, -FZ); side(FX, -FZ, FX, FZ); side(FX, FZ, 0.4, FZ); side(-2.4, FZ, -FX, FZ); side(-FX, FZ, -FX, -FZ);
    // Schild vor dem Tor
    const sg = makeSignBoard(M, "🌦️ WETTERSTATION", "#2563eb", 2.2); sg.position.set(-2.5, 0, -4.9); sg.rotation.y = Math.PI; g.add(sg);
    g.userData = { cups, vane, balloon, body, sonde, chute, line, launch: [PX, PZ], rest: [PX + 0.55, PZ - 0.45], fence };
    return mergeStatic(g, [cups, vane, balloon, sonde, chute]);
  }
  // Meteoriten-Vitrine: Glaskasten auf einem Sockel, darin ein echter Brocken aus dem All
  // Meteoriten-Vitrine: Sockel mit Holzverkleidung und Steinplatte, Glashaube mit Metallrahmen, innen der Meteorit auf einem Halter mit Kärtchen
  function earthMeteorCase(M) {
    const g = new THREE.Group(), frame = M.std({ color: srgb(0x4b5563), roughness: 0.35, metalness: 0.7 }), stone = M.std({ color: srgb(0x9a958c), roughness: 0.9 });
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 1.3), stone), 0, 0.06, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.78, 1.1), wood(M, 1, 1)), 0, 0.51, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), wood(M, 0.2, 1)), x * 0.55, 0.51, z * 0.55, false);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.07, 1.24), stone), 0, 0.935, 0);
    put(g, new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.76, 1.02), M.std({ color: srgb(0xdbeafe), transparent: true, opacity: 0.18, roughness: 0.03, metalness: 0.3, envMapIntensity: 1.6, depthWrite: false })), 0, 1.35, 0, false);
    const E = 0.51, Y0 = 0.97, Y1 = 1.73;
    for (const [x, z] of [[-E, -E], [E, -E], [-E, E], [E, E]]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.03, Y1 - Y0, 0.03), frame), x, (Y0 + Y1) / 2, z, false);
    for (const y of [Y0 + 0.01, Y1]) { for (const z of [-E, E]) put(g, new THREE.Mesh(new THREE.BoxGeometry(2 * E + 0.03, 0.03, 0.03), frame), 0, y, z, false); for (const x of [-E, E]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 2 * E + 0.03), frame), x, y, 0, false); }
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.06), M.glow), 0, Y1 - 0.03, -0.42, false); // Lichtleiste
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 20), M.std({ color: srgb(0x111827), roughness: 0.5 })), 0, 1.03, 0);
    const rock = put(g, new THREE.Mesh(naturalRockGeo(91, 3), new THREE.MeshStandardMaterial({ color: srgb(0x3b3532), roughness: 0.45, metalness: 0.55, vertexColors: true, ...rockTex(2, 1, 1.4) })), 0, 1.2, 0);
    rock.geometry = boulderGeo(91); rock.scale.set(0.24, 0.18, 0.2); rock.rotation.set(0.3, 0.8, 0.1);
    const card = canvasTex(160, 96, (c) => { c.fillStyle = "#f8fafc"; c.fillRect(0, 0, 160, 96); c.fillStyle = "#111827"; c.font = "bold 20px sans-serif"; c.fillText("Eisenmeteorit", 10, 30); c.font = "16px sans-serif"; c.fillText("4,5 Mrd. Jahre alt", 10, 58); c.fillText("aus dem All", 10, 82); });
    const cd = put(g, new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.12), new THREE.MeshStandardMaterial({ map: card, roughness: 0.6 })), 0.25, 1.02, -0.3, false); cd.rotation.set(-1.0, Math.PI, 0, "YXZ");
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(1, 0.3), signMat("☄️ METEORIT", "#16a34a", 360, 108, 56)), 0, 0.7, -0.556, false).rotation.y = Math.PI;
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
    const g = new THREE.Group(), fur = M.std({ vertexColors: true, roughness: 0.92, envMapIntensity: 0.3 }), pale = M.std({ color: srgb(0xf1e6d2), roughness: 0.9, envMapIntensity: 0.3 });
    const dark = M.std({ color: srgb(0x231912), roughness: 0.5 }), legMat = M.std({ color: srgb(0x8a5a32), roughness: 0.9, envMapIntensity: 0.3 });
    const brown = new THREE.Color(0x9c6a3c).convertSRGBToLinear(), back = new THREE.Color(0x7d5230).convertSRGBToLinear(), belly = new THREE.Color(0xe2cfae).convertSRGBToLinear();
    const shade = (geo, k = 1) => { const p = geo.attributes.position, n = geo.attributes.normal, c = []; for (let i = 0; i < p.count; i++) { const up = n.getY(i), col = brown.clone().lerp(up > 0 ? back : belly, Math.min(1, Math.abs(up) * k)); c.push(col.r, col.g, col.b); } geo.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); return geo; };
    // Rumpf: liegende Kapsel, vorn (Brust) tiefer, hinten (Keule) runder
    const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.5, 10, 20), bp = bodyGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i), t = y / 0.45; bp.setXYZ(i, x * (1 + 0.12 * Math.max(0, -t)), z * (z < 0 ? 1.15 + 0.15 * Math.max(0, t) : 0.95) + 0.03 * t, y); }
    bodyGeo.computeVertexNormals(); shade(bodyGeo, 1.6);
    put(g, new THREE.Mesh(bodyGeo, fur), 0, 0.74, 0).rotation.x = 0;
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), pale), 0, 0.78, -0.43).scale.set(1, 0.9, 0.45);       // heller „Spiegel“
    put(g, new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 8), pale), 0, 0.86, -0.47).rotation.x = -2.2;             // Stummelschwanz
    // Beine: Oberschenkel, Unterschenkel, Huf; hinten mit nach hinten gebogenem Sprunggelenk
    for (const [x, z, hind] of [[-0.1, 0.27, false], [0.1, 0.27, false], [-0.11, -0.28, true], [0.11, -0.28, true]]) {
      const hip = new V(x * 0.6, 0.8, z), knee = new V(x * 1.05, 0.4, z + (hind ? -0.07 : 0.02)), foot = new V(x * 1.05, 0.06, z + (hind ? 0.02 : 0.03));
      const up = rod(g, hip, knee, hind ? 0.065 : 0.05, fur, 10); up.geometry = new THREE.CylinderGeometry(hind ? 0.045 : 0.038, hind ? 0.085 : 0.06, hip.distanceTo(knee), 10, 1, true); shade(up.geometry, 1.2); // offen: das obere Ende steckt im Rumpf
      rod(g, knee, foot, 0.022, legMat, 8);
      put(g, new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), legMat), knee.x, knee.y, knee.z, false);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.06, 8), dark), foot.x, 0.03, foot.z);
    }
    // Hals und Kopf (userData.neck dreht beim Grasen und Umschauen)
    const neck = new THREE.Group(); neck.position.set(0, 0.86, 0.33); g.add(neck);
    const ng = new THREE.CylinderGeometry(0.06, 0.11, 0.46, 12); shade(ng, 1); put(neck, new THREE.Mesh(ng, fur), 0, 0.18, 0.07).rotation.x = 0.42;
    const head = new THREE.Group(); head.position.set(0, 0.39, 0.16); neck.add(head);
    const hg = new THREE.SphereGeometry(0.1, 18, 12); shade(hg, 1.2); put(head, new THREE.Mesh(hg, fur), 0, 0, 0).scale.set(0.85, 0.9, 1.2);
    const sg = new THREE.CylinderGeometry(0.035, 0.06, 0.17, 12); shade(sg, 1); put(head, new THREE.Mesh(sg, fur), 0, -0.035, 0.13).rotation.x = Math.PI / 2 + 0.25;
    put(head, new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), dark), 0, -0.055, 0.22, false).scale.set(1.2, 0.85, 0.8); // Nase
    put(head, new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), pale), 0, -0.075, 0.17, false).scale.set(1.3, 0.6, 1.2);   // helles Kinn
    const ear = (() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.055, 0.03, 0.05, 0.12, 0, 0.15); sh.bezierCurveTo(-0.05, 0.12, -0.055, 0.03, 0, 0); return new THREE.ShapeGeometry(sh, 8); })();
    for (const x of [-1, 1]) {
      const eye = put(head, new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), dark), x * 0.068, 0.025, 0.06, false);
      put(eye, new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })), x * 0.004, 0.008, 0.015, false); // Glanzpunkt
      const e = new THREE.Group(); e.position.set(x * 0.06, 0.07, -0.04); e.rotation.set(-0.25, x * 0.5, x * -0.55, "YXZ"); head.add(e);
      put(e, new THREE.Mesh(ear, M.std({ color: srgb(0x8f6038), roughness: 0.9, side: THREE.DoubleSide })), 0, 0, 0, false);
      put(e, new THREE.Mesh(ear, M.std({ color: srgb(0xe8d5bb), roughness: 0.9, side: THREE.DoubleSide })), 0, 0.012, 0.004, false).scale.set(0.7, 0.75, 1);
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

  // =========================================================
  //  Erde, schön gestaltet: Wälder und Baumgruppen, Büsche, Blumenwiesen, Grasbüschel, Schilf und Seerosen am See,
  //  ein Park um die Sonnenuhr und ein Dorf am Horizont – fast alles als InstancedMesh (viele Pflanzen, wenige Zeichenaufrufe)
  // =========================================================
  // viele gleiche Teile: list = [[x, y, z, sx, sy, sz, drehung, farbe], …] (Farbe wie im Malprogramm)
  function instanced(scene, geo, mat, list, shadow = true) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new V(), s = new V(), c = new THREE.Color();
    list.forEach(([x, y, z, sx, sy, sz, ry, col], i) => {
      e.set(0, ry || 0, 0); q.setFromEuler(e); mx.compose(p.set(x, y, z), q, s.set(sx, sy, sz)); m.setMatrixAt(i, mx);
      m.setColorAt(i, c.set(col == null ? 0xffffff : col).convertSRGBToLinear());
    });
    m.count = list.length; m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; // (Hüllkugel kennt die Instanzen nicht)
  }
  // Bäume als Instanzen: spots = [[x, z, Größe, Nadelbaum?, Zufallszahl], …]
  // ---------- Naturnahe Bäume: Stamm mit Ästen, Krone aus vielen Blatt-Büscheln (Karten mit gemalten Blättern) ----------
  // Die Normalen der Blattkarten zeigen von der Kronenmitte nach außen – so wirkt die Krone rund und weich beleuchtet.
  // Arten: 0, 1 = Laubbaum (Buche/Eiche), 2 = Birke, 3, 4 = Fichte. Höhe bei Größe 1: etwa 8 m (Fichte 10 m).
  const RTREE = { geos: {}, mats: null };
  function rtreeMats() {
    if (RTREE.mats) return RTREE.mats;
    const leafTex = (cols, needles) => canvasTex(256, 256, (c) => {
      c.clearRect(0, 0, 256, 256);
      for (let i = 0; i < (needles ? 70 : 190); i++) {
        const a = hash2(i, 1) * Math.PI * 2, r = Math.sqrt(hash2(i, 2)) * 104, x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r * (needles ? 0.55 : 1);
        c.fillStyle = cols[Math.floor(hash2(i, 3) * cols.length)];
        c.save(); c.translate(x, y); c.rotate(needles ? a * 0.2 + (hash2(i, 4) - 0.5) : hash2(i, 4) * 6.3);
        if (needles) { c.fillRect(-26, -2.5, 52, 5); for (let k = -22; k < 24; k += 5) c.fillRect(k, -10, 2.4, 20); } // Zweig mit Nadeln
        else { c.beginPath(); c.ellipse(0, 0, 13 + hash2(i, 5) * 7, 6 + hash2(i, 6) * 3, 0, 0, 7); c.fill(); }
        c.restore();
      }
    });
    const leaf = (cols, needles) => { const m = new THREE.MeshStandardMaterial({ map: leafTex(cols, needles), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 0.85, envMapIntensity: 0.35 }); m.userData.noCam = true; return m; };
    const bark = (col) => { const m = new THREE.MeshStandardMaterial({ color: srgb(col), roughness: 0.95, envMapIntensity: 0.3, vertexColors: true }); m.userData.noCam = true; return m; }; // dünne Äste: Kamera springt sonst
    return (RTREE.mats = {
      leaf: [leaf(["#3f7d2c", "#4f8f35", "#5f9f3c", "#36702a", "#6aa844"], false), leaf(["#4d8a2f", "#5c9a34", "#6fab3f", "#3e7a2b", "#7fb348"], false),
        leaf(["#6aa83a", "#7cb845", "#8fc24f", "#5d9a33", "#a3cc5a"], false), leaf(["#1f4f2a", "#2a5f30", "#235628", "#2f6a35"], true), leaf(["#24552c", "#2e6533", "#1d4a27", "#376f3a"], true)],
      wood: [bark(0x6b4a33), bark(0x5e4330), bark(0xe8e4dc), bark(0x5a3d2b), bark(0x5a3d2b)]
    });
  }
  function rtreeGeos(kind) {
    if (RTREE.geos[kind]) return RTREE.geos[kind];
    const W = { p: [], n: [], c: [], i: [] }, L = { p: [], n: [], c: [], u: [], i: [] }, sd = kind * 31 + 7, rnd = (k) => hash2(sd, k);
    let ri = 0; const r = () => hash2(sd, 100 + ri++);
    const tube = (a, b, r0, r1, seg = 7) => { // Ast oder Stamm von a nach b (sich verjüngend)
      const d = b.clone().sub(a); d.normalize();
      const t = Math.abs(d.y) < 0.9 ? new V(0, 1, 0) : new V(1, 0, 0), u = new V().crossVectors(d, t).normalize(), v = new V().crossVectors(d, u), base = W.p.length / 3;
      for (let k = 0; k <= 1; k++) for (let j = 0; j < seg; j++) {
        const ang = (j / seg) * Math.PI * 2, rr = k ? r1 : r0, nn = u.clone().multiplyScalar(Math.cos(ang)).addScaledVector(v, Math.sin(ang)), p = (k ? b : a).clone().addScaledVector(nn, rr);
        W.p.push(p.x, p.y, p.z); W.n.push(nn.x, nn.y, nn.z);
        const g = (0.75 + 0.25 * k) * (kind === 2 && j % 3 === 0 && k === 0 ? 0.55 : 1); W.c.push(g, g, g); // Birke: dunkle Flecken
      }
      for (let j = 0; j < seg; j++) { const j2 = (j + 1) % seg; W.i.push(base + j, base + seg + j, base + j2, base + j2, base + seg + j, base + seg + j2); }
    };
    const card = (p, size, center, stretch = 1, flat = 0) => { // Blattbüschel: Karte in zufälliger Lage, die Normale zeigt nach außen
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.3 * (1 - flat) + flat * (-Math.PI / 2 + (r() - 0.5) * 0.7), r() * 6.3, r() * 6.3 * (1 - flat)));
      const ax = new V(1, 0, 0).applyQuaternion(q).multiplyScalar(size * stretch / 2), ay = new V(0, 1, 0).applyQuaternion(q).multiplyScalar(size / 2);
      const nn = p.clone().sub(center).add(new V(0, 0.35, 0)).normalize(), base = L.p.length / 3;
      const h = Math.max(0, Math.min(1, (p.y - center.y) / 3 + 0.55)), out = Math.min(1, p.clone().sub(center).length() / 2.6), g = 0.5 + 0.35 * h + 0.25 * out;
      [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]].forEach(([sx, sy, uu, vv]) => {
        const v = p.clone().addScaledVector(ax, sx).addScaledVector(ay, sy); L.p.push(v.x, v.y, v.z); L.n.push(nn.x, nn.y, nn.z); L.u.push(uu, vv); L.c.push(g, g, g);
      });
      L.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    if (kind <= 2) { // Laubbaum oder Birke
      const birch = kind === 2, H = birch ? 4.2 : 2.6 + rnd(1) * 0.6, cy = birch ? 5.6 : 5.0, rx = birch ? 1.9 : 2.8, ry = birch ? 2.6 : 2.3;
      tube(new V(0, -0.3, 0), new V(0, H, 0), birch ? 0.17 : 0.3, birch ? 0.11 : 0.2, 8);
      const center = new V(0, cy, 0), subs = [], n = birch ? 6 : 7;
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + rnd(k + 10) * 0.8; subs.push(new V(Math.cos(a) * rx * 0.65, cy + (rnd(k + 20) - 0.35) * ry * 0.9, Math.sin(a) * rx * 0.65)); }
      subs.push(new V(0, cy + ry * 0.75, 0));
      for (const sp of subs) tube(new V(0, H - 0.2, 0), sp, birch ? 0.08 : 0.13, 0.04, 5);
      for (const sp of subs) for (let k = 0; k < (birch ? 11 : 13); k++) {
        const o = new V(r() - 0.5, (r() - 0.5) * 0.8, r() - 0.5).normalize().multiplyScalar(0.3 + r() * (birch ? 1.0 : 1.3));
        card(sp.clone().add(o), (birch ? 1.3 : 1.8) + r() * 0.8, center);
      }
    } else { // Fichte: Etagen hängender Zweige, nach oben kleiner
      const H = 9.6 + rnd(1) * 1.2;
      tube(new V(0, -0.3, 0), new V(0, H, 0), 0.26, 0.05, 7);
      for (let y = 1.3; y < H - 0.3; y += 0.42) {
        const f = (y - 1.3) / (H - 1.6), R = 2.6 * Math.pow(1 - f, 0.95) + 0.25, n = Math.max(3, Math.round(4 + R * 3.2));
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + r() * 0.6 + y * 1.7, rr = R * (0.45 + r() * 0.3);
          card(new V(Math.cos(a) * rr, y - rr * 0.18, Math.sin(a) * rr), 0.7 + R * 0.55, new V(0, y + 0.6, 0), 1.25, 0.85);
        }
      }
      for (let k = 0; k < 4; k++) card(new V((r() - 0.5) * 0.3, H - 0.4 + k * 0.15, (r() - 0.5) * 0.3), 0.7, new V(0, H - 1, 0), 0.8, 0.3);
    }
    const mk = (o, uv) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(o.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(o.c, 3));
      if (uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(o.u, 2));
      g.setIndex(o.i); g.computeBoundingSphere(); return g;
    };
    return (RTREE.geos[kind] = { wood: mk(W), leaf: mk(L, true) });
  }
  const rtreeKind = (con, sd) => (con ? 3 + (sd % 2) : hash2(sd, 3) < 0.22 ? 2 : sd % 2);
  // So weit reichen die Zweige vom Stamm aus (halbe Kronenbreite bei Größe 1) – Fichtenzweige hängen bis fast zum Boden
  function rtreeReach(kind) {
    const G = rtreeGeos(kind);
    if (!G.reach) { const p = G.leaf.attributes.position; G.reach = 0; for (let i = 0; i < p.count; i++) G.reach = Math.max(G.reach, Math.hypot(p.getX(i), p.getZ(i))); }
    return G.reach;
  }
  const rtreeCrown = (s, con, sd) => rtreeReach(rtreeKind(con, sd)) * s * (0.85 + hash2(sd, 4) * 0.3) * 1.1; // Krone eines Baums aus realTrees (in m)
  // Viele Bäume als Instanzen: spots = [[x, z, Größe, Nadelbaum?, Zufallszahl], …]
  function realTrees(scene, height, spots, shadow = true) {
    const M = rtreeMats(), by = [[], [], [], [], []], mx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new V(0, 1, 0), p = new V(), sc = new V(), c = new THREE.Color();
    for (const [x, z, s, con, sd] of spots) by[rtreeKind(con, sd)].push([x, height(x, z), z, s * (0.85 + hash2(sd, 4) * 0.3), hash2(sd, 1) * 6.3, sd]);
    by.forEach((list, kind) => {
      if (!list.length) return;
      const G = rtreeGeos(kind);
      for (const [geo, mat, leafy] of [[G.wood, M.wood[kind], false], [G.leaf, M.leaf[kind], true]]) {
        const m = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach(([x, y, z, k, ry, sd], i) => {
          mx.compose(p.set(x, y, z), q.setFromAxisAngle(up, ry), sc.set(k * (0.9 + hash2(sd, 7) * 0.2), k, k * (0.9 + hash2(sd, 8) * 0.2))); m.setMatrixAt(i, mx);
          const v = leafy ? 0.85 + hash2(sd, 5) * 0.3 : 1, w = leafy ? (hash2(sd, 6) - 0.5) * 0.14 : 0; m.setColorAt(i, c.setRGB(v * (1 + w), v, v * (1 - w)));
        });
        m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
      }
    });
  }
  function earthForest(B, spots, shadow = true) {
    if (spots.length) { realTrees(B.scene, B.height, spots, shadow); return; }
    if (KIT.n_tree_oak) { // fertige Bäume aus dem Nature Kit (Kenney, CC0): Laubbäume und Nadelbäume in mehreren Formen
      const LEAF = ["n_tree_oak", "n_tree_detailed", "n_tree_fat", "n_tree_default", "n_tree_oak_dark", "n_tree_detailed", "n_tree_oak"];
      const PINE = ["n_tree_pineTallA_detailed", "n_tree_pineTallB_detailed", "n_tree_pineRoundA", "n_tree_pineRoundC", "n_tree_pineDefaultA"];
      const by = {};
      for (const [x, z, s, con, sd] of spots) {
        const list = con ? PINE : LEAF, n = list[Math.floor(hash2(sd, 3) * list.length)];
        (by[n] = by[n] || []).push([x, B.height(x, z) - 0.05, z, s * (con ? 4.6 : 4.2) * (0.9 + hash2(sd, 4) * 0.25), hash2(sd, 1) * 6.3]);
      }
      for (const [n, list] of Object.entries(by)) kitInstanced(B.scene, n, list, shadow, true);
      return;
    }
    const trunks = [], tiers = [], crowns = [], std = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, envMapIntensity: 0.3, ...o });
    for (const [x, z, s, con, sd] of spots) {
      const y = B.height(x, z), th = (con ? 1.5 : 2.3) * s, ry = hash2(sd, 1) * 6;
      trunks.push([x, y + th / 2, z, 0.2 * s, th, 0.2 * s, ry, con ? 0x5a3a22 : 0x6b4a2e]);
      if (con) for (let k = 0; k < 4; k++) { const r = (1.6 - k * 0.33) * s, h = (1.45 - k * 0.12) * s; tiers.push([x, y + th * 0.6 + k * 0.92 * s + h / 2, z, r, h, r, ry + k, [0x2e6b30, 0x3d7d34, 0x2a5f3a, 0x356f35][(sd + k) % 4]]); }
      else for (let k = 0; k < 3; k++) { const a = sd * 2.1 + k * 2.1, o = k ? 0.6 * s : 0, r = (k ? 1.0 : 1.4) * s; crowns.push([x + Math.cos(a) * o, y + th + (k ? 0.15 : 0.6) * s, z + Math.sin(a) * o, r, r * 0.85, r, ry + k, [0x4f8f3a, 0x5c9a3c, 0x6b9f3a, 0x3f7f3a, 0x78a83f][(sd + k) % 5]]); }
    }
    const leaf = std({ vertexColors: true }); leaf.userData.noCam = true;
    instanced(B.scene, new THREE.CylinderGeometry(0.5, 0.7, 1, 7), std(), trunks);
    instanced(B.scene, treeGeo("tier", 1), leaf, tiers);
    instanced(B.scene, treeGeo("ball", 2), leaf, crowns);
  }
  // Pflanzen auf der Wiese: Büsche, Blumen (Stiel + Blüte), Grasbüschel; ok(x, z) = darf hier etwas wachsen?
  function earthMeadow(B, ok, lite) {
    const bushes = [], stems = [], blooms = [], tufts = [], H = B.height;
    const flowerCols = [0xfacc15, 0xf472b6, 0xffffff, 0xa78bfa, 0xef4444, 0xfb923c, 0x60a5fa];
    for (let i = 0, n = 0; i < 4000 && n < (lite ? 30 : 60); i++) { // Büsche in kleinen Gruppen
      const x = (hash2(i, 81) - 0.5) * 280, z = (hash2(i, 82) - 0.5) * 280; if (!ok(x, z, 2.5)) continue; n++;
      for (let k = 0; k < 3; k++) { const s = 0.55 + hash2(i + k, 83) * 0.6, a = hash2(i, 84 + k) * 6.3, xx = x + Math.cos(a) * k * 0.7, zz = z + Math.sin(a) * k * 0.7; bushes.push([xx, H(xx, zz) + s * 0.45, zz, s, s * 0.75, s, a, [0x3f7f3a, 0x4f8f3a, 0x5c9a3c, 0x2f6b34][(i + k) % 4]]); }
    }
    for (let i = 0, n = 0; i < 6000 && n < (lite ? 22 : 40); i++) { // Blumenflecken
      const cx = (hash2(i, 91) - 0.5) * 230, cz = (hash2(i, 92) - 0.5) * 230; if (!ok(cx, cz, 3)) continue; n++;
      const col = flowerCols[i % flowerCols.length], col2 = flowerCols[(i + 3) % flowerCols.length];
      for (let k = 0; k < (lite ? 12 : 22); k++) {
        const a = hash2(i, 100 + k) * 6.3, r = Math.sqrt(hash2(i, 200 + k)) * 2.6, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = H(x, z), h = 0.22 + hash2(k, i) * 0.2;
        stems.push([x, y + h / 2, z, 1, h, 1, 0, 0x3f8f35]);
        blooms.push([x, y + h, z, 1, 0.55, 1, a, k % 4 ? col : col2]);
      }
    }
    for (let i = 0, n = 0; i < 9000 && n < (lite ? 700 : 1600); i++) { // Grasbüschel
      const x = (hash2(i, 301) - 0.5) * 200, z = (hash2(i, 302) - 0.5) * 200; if (!ok(x, z, 0.8)) continue; n++;
      const s = 0.7 + hash2(i, 303) * 0.8; tufts.push([x, H(x, z) + 0.12 * s, z, s, s, s, hash2(i, 304) * 6, [0x4e8f2f, 0x5fa13a, 0x3f7f2a, 0x6aa84a][i % 4]]);
    }
    const cols = bushes.filter((b, i) => i % 3 === 0).map(([x, , z]) => [x, z, 0.7]); // Hindernisse (je Busch-Gruppe einer)
    if (KIT.n_plant_bushDetailed) { // fertige Büsche, Blumen und Gräser aus dem Nature Kit
      const pick = (lists, names, pos, k0, k1) => pos.forEach(([x, y, z, s, , , a], i) => { const n = names[i % names.length]; (lists[n] = lists[n] || []).push([x, H(x, z) - 0.02, z, k0 + hash2(i, 7) * k1, a]); });
      const L = {};
      pick(L, ["n_plant_bushDetailed", "n_plant_bushLarge", "n_plant_bush"], bushes, 2.6, 1.6);
      pick(L, ["n_flower_redA", "n_flower_yellowA", "n_flower_purpleA", "n_flower_redB", "n_flower_yellowB", "n_flower_purpleB"], blooms.filter((b, i) => i % 2 === 0), 1.8, 0.8);
      pick(L, ["n_grass", "n_grass_large", "n_grass_leafs"], tufts, 1.8, 1.2);
      for (const [n, list] of Object.entries(L)) kitInstanced(B.scene, n, list, /bush/.test(n));
      // Pilze, Baumstümpfe und Holz am Waldrand
      const extra = { n_mushroom_redGroup: [], n_mushroom_tanGroup: [], n_stump_old: [], n_log: [], n_log_stack: [], n_rock_largeA: [], n_rock_largeB: [], n_rock_smallB: [] };
      const names = Object.keys(extra);
      for (let i = 0, n = 0; i < 3000 && n < (lite ? 40 : 80); i++) {
        const x = (hash2(i, 401) - 0.5) * 260, z = (hash2(i, 402) - 0.5) * 260; if (!ok(x, z, 1.5)) continue; n++;
        const nm = names[i % names.length], big = /rock_large|log_stack/.test(nm);
        { const k = (big ? 3.2 : 2.6) * (0.8 + hash2(i, 403) * 0.5); extra[nm].push([x, H(x, z) - (big ? 0.12 * k : 0.02), z, k, hash2(i, 404) * 6.3]); }
        if (big) cols.push([x, z, 1.1]);
      }
      for (const [n, list] of Object.entries(extra)) kitInstanced(B.scene, n, list);
      return cols;
    }
    const std = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, envMapIntensity: 0.3, ...o });
    const bushMat = std({ vertexColors: true }); bushMat.userData.noCam = true;
    instanced(B.scene, treeGeo("ball", 0), bushMat, bushes);
    instanced(B.scene, new THREE.CylinderGeometry(0.012, 0.016, 1, 4), std(), stems, false);
    instanced(B.scene, new THREE.SphereGeometry(0.075, 8, 5), std({ roughness: 0.6 }), blooms, false);
    instanced(B.scene, new THREE.ConeGeometry(0.09, 0.3, 5), std(), tufts, false);
    return cols;
  }
  // Schilf und Seerosen am Ufer: entlang der Uferlinie (Höhe knapp unter/über dem Wasserspiegel)
  function earthShore(B, [lx, lz], water, lite) {
    const H = B.height, stalks = [], heads = [], pads = [], lilies = [];
    for (let i = 0; i < 360; i++) {
      const a = (i / 360) * Math.PI * 2 + hash2(i, 5) * 0.02; let r = 6;
      while (r < 22 && H(lx + Math.cos(a) * r, lz + Math.sin(a) * r) < water) r += 0.1; // Uferlinie in dieser Richtung
      if (hash2(i, 7) < (lite ? 0.55 : 0.3)) continue;
      const big = hash2(Math.floor(i / 9), 8) > 0.45; if (!big && i % 4) continue; // Schilf wächst in Gruppen
      for (let k = 0; k < 3; k++) {
        const rr = r + (hash2(i, 10 + k) - 0.7) * 1.4, x = lx + Math.cos(a + k * 0.004) * rr, z = lz + Math.sin(a + k * 0.004) * rr, y = Math.max(H(x, z), water - 0.3), h = 0.9 + hash2(i, 20 + k) * 0.8;
        stalks.push([x, y + h / 2, z, 1, h, 1, 0, [0x6b8f3a, 0x5a7d2f, 0x7a9a45][k]]);
        if (k === 1 && hash2(i, 30) > 0.5) heads.push([x, y + h + 0.05, z, 1, 1, 1, 0, 0x6b4423]);
      }
    }
    for (let i = 0; i < 14; i++) { // Seerosen auf dem Wasser, nahe am Ufer
      const a = hash2(i, 41) * Math.PI * 2; let r = 4; while (r < 20 && H(lx + Math.cos(a) * r, lz + Math.sin(a) * r) < water - 0.35) r += 0.2;
      r -= 1.2 + hash2(i, 42) * 1.5; const x = lx + Math.cos(a) * r, z = lz + Math.sin(a) * r, s = 0.35 + hash2(i, 43) * 0.25;
      pads.push([x, water + 0.012, z, s, 1, s, hash2(i, 44) * 6, [0x3f8f35, 0x4a9a3c][i % 2]]);
      if (i % 3 === 0) lilies.push([x + 0.1, water + 0.08, z, 1, 0.7, 1, 0, [0xf9a8d4, 0xffffff][i % 2]]);
    }
    const std = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, envMapIntensity: 0.3, ...o });
    instanced(B.scene, new THREE.CylinderGeometry(0.014, 0.022, 1, 4), std(), stalks, false);
    instanced(B.scene, new THREE.CylinderGeometry(0.045, 0.045, 0.24, 6), std(), heads, false);
    if (KIT.n_lily_large) { // Seerosen aus dem Nature Kit (teils mit Blüte)
      kitInstanced(B.scene, "n_lily_large", pads.filter((p, i) => i % 2 === 0).map(([x, y, z, s, , , a]) => [x, water - 0.02, z, 3 + s * 2, a]), false);
      kitInstanced(B.scene, "n_lily_small", pads.filter((p, i) => i % 2).map(([x, y, z, s, , , a]) => [x, water - 0.01, z, 3 + s * 2, a]), false);
      return;
    }
    const padGeo = new THREE.CircleGeometry(1, 16, 0.35, Math.PI * 2 - 0.7); padGeo.rotateX(-Math.PI / 2);
    instanced(B.scene, padGeo, std({ side: THREE.DoubleSide, roughness: 0.5 }), pads, false);
    instanced(B.scene, new THREE.SphereGeometry(0.11, 8, 5), std({ roughness: 0.6 }), lilies, false);
  }
  // Wasser: in der Mitte tiefblau, am Ufer hell-türkis (nach Wassertiefe), mit leichten, wandernden Wellen
  function earthWater(B, [lx, lz], level) {
    const geo = new THREE.RingGeometry(0.01, 18, 64, 12), pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const deep = new THREE.Color(0x1d5fa8).convertSRGBToLinear(), shallow = new THREE.Color(0x5cc7c9).convertSRGBToLinear(), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const x = lx + pos.getX(i), z = lz - pos.getY(i), d = level - B.height(x, z); c.copy(shallow).lerp(deep, smooth(0.05, 1.3, d)); col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const tex = canvasTex(256, 256, (x) => {
      x.fillStyle = "#d6e2ec"; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) { const px = hash2(i, 1) * 256, py = hash2(i, 2) * 256, w = 20 + hash2(i, 3) * 50; for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { x.fillStyle = `rgba(255,255,255,${0.35 + hash2(i, 4) * 0.4})`; x.beginPath(); x.ellipse(px + ox, py + oy, w, 2 + hash2(i, 5) * 2, 0, 0, 7); x.fill(); } }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 5);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.9 }));
    m.rotation.x = -Math.PI / 2; m.position.set(lx, level, lz); m.receiveShadow = true; B.scene.add(m);
    return m;
  }
  // Kleines Segelboot (vorn = +Z): weißer Rumpf mit blauem Streifen, Holzdeck, Mast mit Großsegel und Vorsegel
  function earthSailboat(M) {
    const g = new THREE.Group(), s = new THREE.Shape();
    s.moveTo(-0.55, 1.3); s.lineTo(0.55, 1.3); s.quadraticCurveTo(0.68, 0, 0, -1.55); s.quadraticCurveTo(-0.68, 0, -0.55, 1.3); // Umriss von oben (Bug bei −y = vorn)
    const hullGeo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 12 });
    hullGeo.rotateX(-Math.PI / 2); hullGeo.translate(0, -0.2, 0);
    const hull = put(g, new THREE.Mesh(hullGeo, [M.std({ color: srgb(0xb8834c), roughness: 0.7 }), M.std({ color: srgb(0x1d4ed8), roughness: 0.35 })]), 0, 0, 0); // Holzdeck, blauer Rumpf
    hull.userData.boat = true;
    const wood = M.std({ color: srgb(0x8b5a2b), roughness: 0.6 });
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 3.2, 8), wood), 0, 1.9, 0.35);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), wood), 0, 0.85, -0.38).rotation.x = Math.PI / 2; // Baum
    const sail = (pts, col) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); geo.computeVertexNormals();
      return put(g, new THREE.Mesh(geo, M.std({ color: srgb(col), side: THREE.DoubleSide, roughness: 0.8 })), 0, 0, 0); };
    sail([0, 0.9, 0.33, 0, 3.4, 0.33, 0, 0.9, -1.1], 0xfafafa); // Großsegel
    sail([0, 3.2, 0.4, 0, 0.6, 0.4, 0, 0.55, 1.45], 0xf97316);   // Vorsegel
    put(g, new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.6), M.std({ color: srgb(0xef4444) })), 0, 3.55, 0.35, false); // Wimpel
    return g;
  }

  // Park um die Sonnenuhr: Kiesplatz, Hecke im Kreis (offen zum Weg), runde Blumenbeete, Bänke mit Blick zur Uhr, Laternen, Bäume, Schild.
  // open = Richtung des Eingangs (Einheitsvektor x, z); treeOk(x, z, Krone) = darf dort ein Baum stehen? Gibt die Hindernis-Kreise zurück.
  // Parklaterne: gedrechselter Mast, achteckiger Glaskopf mit Rahmen, Dach und Spitze (ein Netz je Material, für alle Laternen geteilt)
  function parkLantern(pole, glass) {
    if (parkLantern.src) return parkLantern.src.clone();
    const b = partBuilder(), lathe = (pts) => new THREE.LatheGeometry(pts.map(([rr, y]) => new THREE.Vector2(rr, y)), 20), up = new V(0, 1, 0);
    b.add(lathe([[0.001, 0], [0.17, 0], [0.17, 0.05], [0.13, 0.1], [0.13, 0.3], [0.09, 0.36], [0.065, 0.44], [0.05, 0.62], [0.042, 2.3], [0.06, 2.33], [0.06, 2.38], [0.045, 2.42], [0.001, 2.42]]), pole);
    b.add(lathe([[0.001, 2.42], [0.1, 2.44], [0.15, 2.5], [0.001, 2.51]]), pole);
    b.add(new THREE.CylinderGeometry(0.17, 0.13, 0.42, 8), glass, [0, 2.71, 0]);
    for (let k = 0; k < 8; k++) {
      const t = (k / 8) * Math.PI * 2, a = new V(Math.sin(t) * 0.135, 2.5, Math.cos(t) * 0.135), c = new V(Math.sin(t) * 0.175, 2.92, Math.cos(t) * 0.175), d = c.clone().sub(a);
      b.addM(new THREE.CylinderGeometry(0.01, 0.01, 1, 5), pole, new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()), new V(1, d.length(), 1)));
    }
    b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 8), pole, [0, 2.935, 0]);
    b.add(new THREE.ConeGeometry(0.25, 0.24, 8), pole, [0, 3.07, 0]);
    b.add(new THREE.SphereGeometry(0.045, 12, 8), pole, [0, 3.22, 0]);
    parkLantern.src = b.group(true);
    return parkLantern.src.clone();
  }
  function earthPark(B, M, [tx, tz], [ox, oz], treeOk = () => true) {
    const H = B.height, y0 = H(tx, tz), cols = [], oa = Math.atan2(oz, ox);
    const off = (a) => Math.abs(Math.atan2(Math.sin(a - oa), Math.cos(a - oa))); // Winkelabstand zum Eingang
    const at = (a, r) => [tx + Math.cos(a) * r, tz + Math.sin(a) * r];
    const gm = new THREE.MeshStandardMaterial({ map: regolithTexture(), color: 0xe4d6b6, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
    gm.map.repeat.set(4, 4);
    const gravel = new THREE.Mesh(new THREE.CircleGeometry(4.7, 56), gm); gravel.rotation.x = -Math.PI / 2; gravel.position.set(tx, y0 + 0.03, tz); gravel.receiveShadow = true; B.scene.add(gravel);
    // Weg vom Platz durch den Eingang hinaus
    const [ex, ez] = at(oa, 4.4), [fx, fz] = at(oa, 9.5);
    makePath(B, [[ex, ez], [fx, fz]], 2, [214, 204, 178]);
    // Hecke
    const hedge = [];
    for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; if (off(a) < 0.95) continue; const [x, z] = at(a, 6.6), s = 0.62 + hash2(i, 3) * 0.12; hedge.push([x, H(x, z) + 0.42, z, s, s * 0.85, s, a, [0x2f6b34, 0x3a7a3a, 0x356f35][i % 3]]); if (i % 2 === 0) cols.push([x, z, 0.55]); }
    if (!KIT.p_hedge) KIT.p_hedge = pkBush(1.15, 1.1, 1.0, 0, 90); // Hecke aus Blattbüscheln wie die Bäume
    kitInstanced(B.scene, "p_hedge", hedge.map(([x, , z, s, , , a]) => [x, H(x, z) - 0.06, z, 0.8 + s * 0.35, -a]), true, true);
    // Blumenbeete zwischen Platz und Hecke
    const soil = M.std({ color: srgb(0x5b3a24), roughness: 1 }), stems = [], blooms = [], fcols = [[0xf472b6, 0xffffff], [0xfacc15, 0xfb923c], [0xa78bfa, 0xf9a8d4], [0xef4444, 0xfacc15]];
    [oa + Math.PI, oa + Math.PI / 2 + 0.25, oa - Math.PI / 2 - 0.25, oa + Math.PI - 0.95, oa + Math.PI + 0.95].forEach((a, i) => {
      const [bx, bz] = at(a, 5.55), by = H(bx, bz);
      const bed = put(B.scene, new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.16, 24), soil), bx, by + 0.06, bz); bed.receiveShadow = true;
      for (let k = 0; k < 14; k++) { const r = Math.sqrt(hash2(i, k + 10)) * 0.6, b = hash2(i, k + 40) * 6.3, x = bx + Math.cos(b) * r, z = bz + Math.sin(b) * r, h = 0.25 + hash2(k, i + 3) * 0.2;
        stems.push([x, by + 0.14 + h / 2, z, 1, h, 1, 0, 0x3f8f35]); blooms.push([x, by + 0.14 + h, z, 1.3, 0.7, 1.3, b, fcols[i % 4][k % 2]]); }
      cols.push([bx, bz, 0.75]);
    });
    const std = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, envMapIntensity: 0.3, ...o });
    if (KIT.n_flower_redA) { // Blumen aus dem Nature Kit
      const fl = ["n_flower_redA", "n_flower_yellowB", "n_flower_purpleA", "n_flower_redB", "n_flower_yellowA", "n_flower_purpleB"], by = {};
      blooms.forEach(([x, y, z, , , , a], i) => { const n = fl[(i * 7 + Math.floor(i / 14)) % fl.length]; (by[n] = by[n] || []).push([x, H(x, z) + 0.13, z, 1.7 + hash2(i, 9) * 0.6, a]); });
      for (const [n, list] of Object.entries(by)) kitInstanced(B.scene, n, list, false);
    } else {
      instanced(B.scene, new THREE.CylinderGeometry(0.014, 0.018, 1, 4), std(), stems, false);
      instanced(B.scene, new THREE.SphereGeometry(0.08, 8, 5), std({ roughness: 0.6 }), blooms, false);
    }
    // Bänke mit Blick zur Sonnenuhr, Laternen dazwischen
    for (const a of [oa + Math.PI, oa + Math.PI / 2 + 0.2, oa - Math.PI / 2 - 0.2]) {
      const [x, z] = at(a, 3.9), b = on2(B, earthBench(M), x, z); b.rotation.y = Math.atan2(Math.cos(a), Math.sin(a)); cols.push([x, z, 0.75]);
    }
    const pole = M.std({ color: srgb(0x1f3b2d), roughness: 0.5, metalness: 0.5 }), lampGlass = new THREE.MeshStandardMaterial({ color: srgb(0xfff3c4), emissive: srgb(0xffd27a), emissiveIntensity: 0.9 });
    for (const a of [oa + 1.25, oa - 1.25, oa + Math.PI + 0.62, oa + Math.PI - 0.62]) {
      const [x, z] = at(a, 5.0), y = H(x, z), l = new THREE.Group(); l.position.set(x, y, z); B.scene.add(l);
      l.add(parkLantern(pole, lampGlass));
      cols.push([x, z, 0.2]);
    }
    // Bäume rund um den Park (nicht vor dem Eingang)
    const spots = [];
    for (let i = 0; i < 9; i++) {
      const a = oa + 0.9 + (i / 8) * (Math.PI * 2 - 1.8), r = 9 + hash2(i, 61) * 2.5, [x, z] = at(a, r), s = 0.85 + hash2(i, 62) * 0.35, con = hash2(i, 63) < 0.25;
      if (!treeOk(x, z, rtreeCrown(s, con, i * 3 + 1))) continue; // Krone nicht über dem Weg
      spots.push([x, z, s, con, i * 3 + 1]); cols.push([x, z, 0.45]);
    }
    earthForest(B, spots);
    // Schild am Eingang
    const [sx, sz] = at(oa + 0.78, 7.3), sign = on2(B, makeSignBoard(M, "🌳 SONNENUHR-PARK", "#15803d", 2.8), sx, sz); sign.rotation.y = Math.atan2(ox, oz);
    cols.push([sx, sz, 0.3]);
    return cols;
  }
  const on2 = (B, obj, x, z, lift = 0) => B.on(obj, x, z, lift);
  // Häuser in verschiedenen Farben: Die Modelle des City Kits holen alle Farben aus einer Farbtafel (64-px-Felder).
  // Für jede Farbvariante wird die Tafel kopiert und darin die Wandfarbe (weißes Feld) und die Dachfarbe (grüne Felder) ersetzt.
  const HOUSE_SCHEMES = [[0xf5dc9a, 0xc0492f], [0xf2c14e, 0x5d6b7c], [0xa9cfe8, 0xc8673e], [0xf2b49a, 0x8a5233], [0xf7f5ef, 0x52606f], [0xbfdca5, 0xb3402c], [0xf6c6d6, 0x6b7c8f], [0xe9c99a, 0x9a3a28]]; // [Wand, Dach]
  const houseMats = {};
  function houseMaterial(src, k) {
    const key = src.uuid + '|' + k; if (houseMats[key]) return houseMats[key];
    const img = src.map && src.map.image; if (!img) return src;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
    const u = img.width / 512, [wall, roof] = HOUSE_SCHEMES[k % HOUSE_SCHEMES.length];
    const tint = (x0, y0, w, h, col, gain) => { // Feld neu einfärben, Helligkeitsverlauf bleibt erhalten
      const d = c.getImageData(x0 * u, y0 * u, w * u, h * u), cr = (col >> 16) & 255, cg = (col >> 8) & 255, cb = col & 255;
      for (let i = 0; i < d.data.length; i += 4) { const l = Math.min(1.15, (0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]) / 255 * gain); d.data[i] = Math.min(255, cr * l); d.data[i + 1] = Math.min(255, cg * l); d.data[i + 2] = Math.min(255, cb * l); }
      c.putImageData(d, x0 * u, y0 * u);
    };
    tint(192, 256, 64, 128, wall, 1);         // Hauswand (weiß)
    tint(0, 128, 64, 128, roof, 1.45);        // Dach (grün)
    const m = src.clone(), t = src.map.clone(); t.image = cv; t.needsUpdate = true; m.map = t;
    return (houseMats[key] = m);
  }
  function houseVariant(name, k) {
    const key = name + '|' + (k % HOUSE_SCHEMES.length); if (KIT[key] || !KIT[name]) return KIT[key] ? key : name;
    if (KIT[name].userData.proc) { const g = pkHouse(name.slice(-1), k % HOUSE_SCHEMES.length); g.userData.proc = true; KIT[key] = g; return key; }
    const g = KIT[name].clone(); g.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map((m) => houseMaterial(m, k)) : houseMaterial(o.material, k); });
    KIT[key] = g; return key;
  }
  // Dorfstraße: Fahrbahn mit Mittelstreifen auf einem Gehweg aus Pflaster, Straßenlaternen, links und rechts Häuser mit Vorgarten
  // (Häuser, Zäune, Laternen aus den City Kits von Kenney, CC0). Gibt die Hindernis-Kreise zurück.
  function earthTown(B, road, lite) {
    const H = B.height, cols = [];
    const asphalt = canvasTex(128, 256, (c) => {
      const img = c.createImageData(128, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 128; x++) { const n = hash2(x * 1.7, y * 0.9) * 22, i = (y * 128 + x) * 4; img.data[i] = 74 + n; img.data[i + 1] = 78 + n; img.data[i + 2] = 84 + n; img.data[i + 3] = 255; }
      c.putImageData(img, 0, 0);
      c.fillStyle = "#f4f4f2"; c.fillRect(7, 0, 4, 256); c.fillRect(117, 0, 4, 256); c.fillRect(62, 0, 4, 120); // Randlinien und Mittelstreifen (gestrichelt)
    });
    const paving = canvasTex(128, 128, (c) => {
      c.fillStyle = "#cfcbc2"; c.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(0,0,0,${0.03 + hash2(i, 2) * 0.05})`; c.fillRect((i % 4) * 32, Math.floor(i / 4) * 32 % 128, 32, 32); }
      c.strokeStyle = "rgba(90,85,78,0.45)"; c.lineWidth = 2;
      for (let k = 0; k <= 128; k += 32) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 128); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(128, k); c.stroke(); }
      c.fillStyle = "#9c978d"; c.fillRect(0, 0, 6, 128); c.fillRect(122, 0, 6, 128); // Bordstein
    });
    for (const t of [asphalt, paving]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    paving.repeat.set(3, 1);
    const walk = makePath(B, road, 10); walk.material = new THREE.MeshStandardMaterial({ map: paving, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3 });
    const street = makePath(B, road, 6.4); street.material = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -6 });
    street.position.y = 0.02; walk.receiveShadow = street.receiveShadow = true;
    { // Wendeplatz am Anfang der Straße (beim Besucherzentrum) – die Straße hört nicht einfach im Gras auf
      const [x0, z0] = road[0], y = H(x0, z0);
      const ring = new THREE.Mesh(new THREE.CircleGeometry(7.2, 40), new THREE.MeshStandardMaterial({ map: paving, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x0, y + 0.06, z0); ring.receiveShadow = true; B.scene.add(ring);
      const tar = new THREE.Mesh(new THREE.CircleGeometry(6, 40), new THREE.MeshStandardMaterial({ color: 0x575c63, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -6 }));
      tar.rotation.x = -Math.PI / 2; tar.position.set(x0, y + 0.08, z0); B.scene.add(tar);
      const isle = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.1, 0.25, 32), new THREE.MeshStandardMaterial({ color: 0x5aa83a, roughness: 1 }));
      isle.position.set(x0, y + 0.12, z0); B.scene.add(isle); cols.push([x0, z0, 2.2]);
      realTrees(B.scene, () => y + 0.2, [[x0, z0, 0.9, false, 7]]);
    }
    if (!KIT["t_building-type-a"]) return cols;
    // Punkte entlang der Straße (alle 1 m) mit Richtung
    const P = [];
    for (let i = 0; i < road.length - 1; i++) {
      const [ax, az] = road[i], [bx, bz] = road[i + 1], l = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < l; s += 1) P.push([ax + (bx - ax) * s / l, az + (bz - az) * s / l, (bx - ax) / l, (bz - az) / l]);
    }
    const houses = ["t_building-type-a", "t_building-type-c", "t_building-type-g", "t_building-type-h", "t_building-type-i", "t_building-type-k", "t_building-type-r"];
    const gardenTrees = [], lists = {}, add = (n, x, z, k, ry, lift = 0) => (lists[n] = lists[n] || []).push([x, H(x, z) + lift, z, k, ry]);
    let hi = 0;
    for (let i = 22; i < Math.min(P.length - 12, lite ? 90 : 120); i += 13) for (const side of [-1, 1]) {
      const [x, z, dx, dz] = P[i], nx = -dz * side, nz = dx * side; // nach außen (weg von der Straße)
      if (Math.hypot(x + nx * 13, z + nz * 13) > 140) continue;
      const hx = x + nx * 13, hz = z + nz * 13, face = Math.atan2(-nx, -nz); // Haustür (+Z) zur Straße
      const name = houses[hi++ % houses.length];
      add(houseVariant(name, hi * 5 + i), hx, hz, 7.5, face, -0.1); // jedes Haus in anderen Farben
      cols.push([hx, hz, 5]);
      // Vorgarten: niedriger Zaun an der Straße, Weg zur Tür, Blumenkasten, ein Baum
      const fx = x + nx * 6.2, fz = z + nz * 6.2;
      if (KIT.n_fence_simple) for (const k of [-4.4, -2.2, 2.2, 4.4]) add("n_fence_simple", fx + dx * k, fz + dz * k, 2.2, face); // Holzzaun, in der Mitte offen für den Weg
      add("t_path-stones-short", x + nx * 7.6, z + nz * 7.6, 7, face);
      add("t_planter", hx + dx * 5.5 - nx * 2, hz + dz * 5.5 - nz * 2, 6, face);
      gardenTrees.push([hx - dx * 6.5 + nx * 2, hz - dz * 6.5 + nz * 2, 0.75, false, hi * 3 + 1]);
      cols.push([hx - dx * 6.5 + nx * 2, hz - dz * 6.5 + nz * 2, 0.4]);
    }
    for (let i = 6; i < P.length - 4; i += 17) { // Straßenlaternen abwechselnd links und rechts, Arm über die Straße
      const side = (i / 17) % 2 < 1 ? 1 : -1, [x, z, dx, dz] = P[i], nx = -dz * side, nz = dx * side, lx = x + nx * 4, lz = z + nz * 4;
      if (Math.hypot(lx, lz) > 145) continue;
      add("t_light-curved", lx, lz, 8.5, Math.atan2(-nx, -nz) + Math.PI / 2); cols.push([lx, lz, 0.2]);
    }
    realTrees(B.scene, H, gardenTrees);
    { const [x, z, dx, dz] = P[3]; add("t_road-sign-object-warning", x - dz * 4.4, z + dx * 4.4, 9, Math.atan2(-dx, -dz)); }
    for (const [n, list] of Object.entries(lists)) kitInstanced(B.scene, n, list);
    return cols;
  }
  // Dorf am Horizont: Häuser mit roten Dächern und eine Kirche (außerhalb des Spielbereichs)
  function earthVillage(B, [cx, cz], lite) {
    const H = B.height, walls = [], roofs = [];
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const tri = new THREE.Shape(); tri.moveTo(-0.5, 0); tri.lineTo(0.5, 0); tri.lineTo(0, 1); tri.closePath();
    const prism = new THREE.ExtrudeGeometry(tri, { depth: 1, bevelEnabled: false }); prism.translate(0, 0, -0.5);
    const wallCols = [0xfaf5e6, 0xfde68a, 0xffffff, 0xfbcfe8, 0xe7e5e4], roofCols = [0xb91c1c, 0x9a3412, 0xc2410c, 0x7f1d1d];
    for (let i = 0; i < (lite ? 7 : 12); i++) {
      const a = hash2(i, 71) * Math.PI * 2, r = 4 + hash2(i, 72) * 22, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = H(x, z) - 0.3;
      const w = 5 + hash2(i, 73) * 3, d = 4 + hash2(i, 74) * 2, h = 3 + hash2(i, 75) * 2.5, ry = Math.atan2(-cx, -cz) + (hash2(i, 76) - 0.5) * 0.8;
      walls.push([x, y, z, w, h, d, ry, wallCols[i % wallCols.length]]);
      roofs.push([x, y + h, z, w * 1.12, 2.2 + hash2(i, 77), d * 1.15, ry, roofCols[i % roofCols.length]]);
    }
    const std = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, envMapIntensity: 0.3, ...o });
    instanced(B.scene, box, std(), walls);
    // Dachflächen: Prisma, dessen Grat quer zur Hausbreite liegt
    const r = instanced(B.scene, prism, std({ roughness: 0.7 }), roofs.map(([x, y, z, w, h, d, ry, c]) => [x, y, z, w, h, d, ry, c]));
    const y = H(cx, cz) - 0.3, ch = new THREE.Group(); ch.position.set(cx, y, cz); ch.rotation.y = Math.atan2(-cx, -cz); B.scene.add(ch); // Kirche
    put(ch, new THREE.Mesh(new THREE.BoxGeometry(3.2, 13, 3.2), std({ color: srgb(0xf5f0e1) })), 0, 6.5, 0);
    put(ch, new THREE.Mesh(new THREE.ConeGeometry(2.4, 6.5, 4), std({ color: srgb(0x475569) })), 0, 16.2, 0).rotation.y = Math.PI / 4;
    put(ch, new THREE.Mesh(new THREE.BoxGeometry(6, 6, 10), std({ color: srgb(0xf5f0e1) })), 0, 3, -6.5);
    const nave = put(ch, new THREE.Mesh(prism, std({ color: srgb(0x9a3412) })), 0, 6, -6.5); nave.scale.set(6.6, 3.2, 10.6);
    return r;
  }

  function buildEarthCamp(g, add) {
    const M = colonyMats("erde");
    earthVisitorCenter(g, M, 0, 12, 26, 9, 5.2);
    { // Die „Wusstest du?“-Wand steht unter einer Holz-Pergola, die vom Besucherzentrum nach vorn reicht – so gehört sie sichtbar zum Haus
      // Raumfahrt-Vordach: zwei weiße Säulen mit blauen Ringen, vorn ein Fachwerkträger aus drei Gurten, darüber ein gewölbtes
      // Glasdach, das zur Glasfront des Hauses hin abfällt (Rippen aus weißem Stahl)
      const Z0 = -1.3, Z1 = 7.5, Y = 7.3, X = 8.7, HY = 5.0, cb = partBuilder(), up = new V(0, 1, 0);
      const white = M.std({ color: srgb(0xf4f6f8), roughness: 0.3, metalness: 0.4 }), ring = M.std({ color: srgb(0x1d4ed8), roughness: 0.35 });
      const tube = (a, c, rr) => { const d = c.clone().sub(a); cb.addM(new THREE.CylinderGeometry(rr, rr, 1, 8), white, new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()), new V(1, d.length(), 1))); };
      for (const x of [-X, X]) {
        cb.add(new THREE.CylinderGeometry(0.2, 0.24, Y, 24), white, [x, Y / 2, Z0]);
        for (const y of [0.45, Y - 0.45]) cb.add(new THREE.CylinderGeometry(0.27, 0.27, 0.12, 24), ring, [x, y, Z0]);
        cb.add(new THREE.CylinderGeometry(0.42, 0.48, 0.25, 24), M.std({ color: srgb(0x8d8a83), roughness: 0.9 }), [x, 0.12, Z0]);
      }
      const ch = [[0, 0], [0, 0.9], [0.8, 0.45]], L0 = -X - 0.5, L1 = X + 0.5, NS = 18; // Gurte: (dz, dy) über der Säulenoberkante
      for (const [dz, dy] of ch) tube(new V(L0, Y + dy, Z0 + dz), new V(L1, Y + dy, Z0 + dz), 0.07);
      for (let i = 0; i < NS; i++) { const xa = L0 + (i * (L1 - L0)) / NS, xb = L0 + ((i + 1) * (L1 - L0)) / NS, P = (k, x) => new V(x, Y + ch[k][1], Z0 + ch[k][0]); tube(P(0, xa), P(1, xb), 0.03); tube(P(0, xa), P(2, xb), 0.03); tube(P(1, xa), P(2, xb), 0.03); }
      const curve = (x) => new THREE.QuadraticBezierCurve3(new V(x, Y + 0.9, Z0 + 0.4), new V(x, Y + 0.6, (Z0 + Z1) / 2 + 1), new V(x, HY, Z1));
      for (let i = 0; i <= 8; i++) { const x = L0 + 0.2 + (i * (L1 - L0 - 0.4)) / 8; cb.add(new THREE.TubeGeometry(curve(x), 16, 0.06, 6), white); }
      g.add(cb.group(true));
      const gl = new THREE.PlaneGeometry(1, 1, 1, 16), gp = gl.attributes.position; // Glasfläche entlang der Rippen
      for (let i = 0; i < gp.count; i++) { const u = gp.getX(i) + 0.5, t = 0.5 - gp.getY(i), p = curve(L0 + 0.2 + u * (L1 - L0 - 0.4)).getPoint(t); gp.setXYZ(i, p.x, p.y + 0.07, p.z); }
      gl.computeVertexNormals();
      const glassRoof = new THREE.Mesh(gl, new THREE.MeshStandardMaterial({ color: srgb(0xbfdbfe), transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false }));
      glassRoof.raycast = () => {}; glassRoof.userData.noCam = true; g.add(glassRoof);
      // Steinsockel unter dem Besucherzentrum (es steht am Hang – so schwebt keine Kante über dem Boden)
      put(g, new THREE.Mesh(new THREE.BoxGeometry(26.6, 2.6, 9.6), M.std({ color: srgb(0x9a958c), roughness: 0.95 })), 0, -1.1, 12).receiveShadow = true;
      // Rückseite und Seiten mit Fenstern (vom Dorf aus sichtbar)
      const glass = M.std({ color: srgb(0x9fc9e8), roughness: 0.05, metalness: 0.6, envMapIntensity: 1.4 });
      for (let i = 0; i < 6; i++) { const x = -10.8 + i * 4.3; put(g, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), glass), x, 3, 16.53, false); put(g, new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.2), M.hull(1, 1)), x, 2.1, 16.6); }
      for (const s of [-1, 1]) for (const z of [9.5, 14.5]) put(g, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), glass), s * 13.03, 3, z, false).rotation.y = s * Math.PI / 2;
    }
    for (const [x, c] of [[-15, "de"], [-17, "hannover"], [-19, "nasa"]]) { const f = earthFlag(M, c); f.position.set(x, 0, 4); g.add(f); (g.userData.flags = g.userData.flags || []).push(f.userData.cloth); }
    for (const [x, z] of [[-9.5, 3], [9.5, 3]]) colonyLamp(g, M, x, z);
    for (const [x, z, r] of [[-12, 2, 0.3], [12, 1.5, -0.3]]) { const b = earthBench(M); b.position.set(x, 0, z); b.rotation.y = Math.PI + r; g.add(b); }
    // Raketengarten: Ariane 5 mit Startturm rechts neben dem Haus, davor die Apollo-Kapsel
    const ariane = earthAriane(M); ariane.position.set(17.5, 0, 11); g.add(ariane);
    const tower = earthLaunchTower(M); tower.position.set(17.5, 0, 16.4); g.add(tower);
    const capsule = earthCapsule(M); capsule.position.set(15.6, 0, 3.4); capsule.rotation.y = 0.35; g.add(capsule);
    // Hochbeete vor der Glasfront: Einfassung aus Stein, Erde, gemischte Blumen und kleine Büsche (ein Netz je Material)
    const beds = new THREE.Group(), stone = M.std({ color: srgb(0xb9b6ae), roughness: 0.9 }), soil = M.std({ color: srgb(0x4a3322), roughness: 1 });
    const kinds = ['tulpe', 'mohn', 'hahnenfuss', 'kornblume', 'lavendel', 'loewenzahn'], flowers = kinds.map((k) => pkFlower(k, 0.2)), bush = pkBush(0.5, 0.36, 0.45, 2, 40);
    for (const [cx, w] of [[-9.2, 5.6], [9.65, 5.3]]) {
      for (const [dx, dz, bw, bd] of [[0, -0.55, w + 0.2, 0.1], [0, 0.55, w + 0.2, 0.1], [-w / 2, 0, 0.1, 1.2], [w / 2, 0, 0.1, 1.2]]) put(beds, new THREE.Mesh(new THREE.BoxGeometry(bw, 0.42, bd), stone), cx + dx, 0.21, 6.95 + dz);
      put(beds, new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 1.0), soil), cx, 0.38, 6.95, false);
      for (let i = 0; i < 26; i++) { const fl = flowers[(i * 5 + Math.floor(i / 6)) % flowers.length].clone(); fl.scale.setScalar(2.2 + hash2(i, cx) * 0.9); fl.rotation.y = hash2(i, cx + 1) * 6.3; fl.position.set(cx - w / 2 + 0.25 + ((i * 0.618) % 1) * (w - 0.5), 0.4, 6.55 + hash2(i, cx + 2) * 0.8); beds.add(fl); }
      for (const k of [-0.36, 0, 0.36]) { const b = bush.clone(); b.scale.setScalar(1.6); b.position.set(cx + k * w, 0.4, 7.1); beds.add(b); }
    }
    g.add(mergeStatic(beds));
  }
  function earthCampColliders([sx, sz]) {
    const c = [[sx - 15, sz + 4, 0.2], [sx - 17, sz + 4, 0.2], [sx - 19, sz + 4, 0.2], [sx - 9.5, sz + 3, 0.3], [sx + 9.5, sz + 3, 0.3], [sx - 12, sz + 2, 0.9], [sx + 12, sz + 1.5, 0.9],
      [sx - 8.7, sz - 1.3, 0.45], [sx + 8.7, sz - 1.3, 0.45], // Säulen des Vordachs
      [sx + 17.5, sz + 11, 3.8], [sx + 17.5, sz + 16.4, 1.9], [sx + 15.6, sz + 3.4, 2.3], [sx + 16.6, sz + 0.7, 0.25]]; // Ariane, Startturm, Kapsel mit Schild
    for (const [cx, w] of [[-9.2, 5.6], [9.65, 5.3]]) for (let x = cx - w / 2 + 0.6; x <= cx + w / 2 - 0.59; x += 1.05) c.push([sx + x, sz + 6.95, 0.6]); // Hochbeete
    for (let x = -12; x <= 12.1; x += 3) c.push([sx + x, sz + 10, 2.4], [sx + x, sz + 14, 2.4]);
    for (let x = -6.6; x <= 6.61; x += 2.2) c.push([sx + x, sz + 0.1, 1]); // Tafelwand
    return c;
  }

  // Erde: Die Rakete landet auf einer Wiese am See. Ein Rundweg führt links herum am Ufer entlang durch den Wald,
  // hinauf zur Sternwarte auf dem Hügel, zum Besucherzentrum und rechts am Ufer zurück.
  const ERDE_LAYOUT = {
    spawn: [-6.9, 4], waage: [-10, -4], luft: [18, 18], stern: [27.4, 39], mond: [-30, 68], // waage: neben der Rakete, weit weg vom Weg · stern: Vitrine neben der Wegkreuzung bei [24, 40]
    see: [0, 40], wasser: [-17, 38], wald: [-38, 44], wegweiser: [6, 5],
    road: [[-18, 101], [-36, 106], [-60, 107], [-84, 104], [-106, 98], [-142, 90]], // Dorfstraße hinter dem Besucherzentrum
    station: [0, 84], tag: [24, 70], groesse: [0, 77], meet: [16, 26],
    route: {
      wegweiser: [[4, 2.5]], waage: [[-7, 1]], wasser: [[-18, 24], [-20, 34]], wald: [[-26, 42], [-30, 46]],
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
  // Schattenrichtung (x, z) des Schattenwerfers (parallel zur Erdachse) für eine Uhrzeit – hängt nur vom Stundenwinkel ab.
  // Nachts zeigt die Linie die Verlängerung nach Süden (so wird der Zahlenring voll).
  function dialDir(hour) {
    const S = ERDE_SOUTH, U = new V(0, 1, 0), E = new V().crossVectors(U, S), Q = S.clone().multiplyScalar(Math.sin(0.87)).add(U.clone().multiplyScalar(Math.cos(0.87)));
    const H = Math.atan2(-SUN_DIR.dot(E), SUN_DIR.dot(Q)) + (hour - 9) * Math.PI / 12; // Stundenwinkel (Mittag = 0, nachmittags positiv)
    const d = Q.clone().multiplyScalar(Math.cos(H)).addScaledVector(E, -Math.sin(H)), P = ERDE_POLE;
    let x, z;
    if (Math.abs(d.y) < 1e-3) { x = -d.x; z = -d.z; } else { const k = P.y / d.y; x = P.x - k * d.x; z = P.z - k * d.z; if (d.y < 0) { x = -x; z = -z; } }
    const l = Math.hypot(x, z); return [x / l, z / l];
  }
  // Sonnenuhr: Steinsockel, Zifferblatt mit Stundenzahlen dort, wohin der Schatten zur jeweiligen Stunde zeigt, dreieckiger Schattenwerfer
  function earthSundial(M) {
    const g = new THREE.Group(), R = 1.15, TOP = 0.46, N = ERDE_SOUTH.clone().negate(), U = new V(0, 1, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.38, 0.44, 40), M.std({ color: srgb(0xb9a382), roughness: 0.9, envMapIntensity: 0.4 })), 0, 0.22, 0).receiveShadow = true; // Sandstein
    const tex = canvasTex(1024, 1024, (c) => {
      const px = (wx) => (wx / R + 1) * 512, pz = (wz) => (wz / R + 1) * 512;
      c.fillStyle = "#c9b48c"; c.fillRect(0, 0, 1024, 1024); // nicht zu hell, sonst sieht man den Schatten kaum
      c.strokeStyle = "#6b4f2a"; c.lineWidth = 12; c.beginPath(); c.arc(512, 512, 494, 0, 7); c.stroke();
      const up = Math.atan2(N.x, -N.z); // Zahlen stehen aufrecht, wenn man von Süden auf die Uhr schaut
      c.strokeStyle = "#6b4f2a"; c.lineWidth = 4; c.beginPath(); c.arc(512, 512, 395, 0, 7); c.stroke();
      // ganzer Zahlenring 0 bis 23 Uhr – jede Zahl genau dort, wohin der Schatten des Schattenwerfers zu dieser Stunde zeigt
      // (Tagstunden braun im Norden, Nachtstunden blau im Süden: nachts gibt es keinen Sonnenschatten)
      for (let h = 0; h < 24; h++) {
        const [ux, uz] = dialDir(h), night = h < 6 || h > 18;
        c.strokeStyle = night ? "#6b7fa8" : "#4a3418"; c.lineWidth = night ? 3 : h % 2 ? 5 : 8;
        c.beginPath(); c.moveTo(px(ux * 0.12), pz(uz * 0.12)); c.lineTo(px(ux * 0.74), pz(uz * 0.74)); c.stroke();
        c.save(); c.translate(px(ux * 0.88), pz(uz * 0.88)); c.rotate(up);
        c.fillStyle = night ? "#3b4f7a" : "#2f210d"; c.font = `bold ${night ? 50 : 56}px serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(h), 0, 0);
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
    { // naturnaher Baum (siehe rtreeGeos) – einzeln, z. B. für die Bäume, die man auf der Foto-Safari fotografiert
      const kind = rtreeKind(hash2(seed, 9) < 0.62, seed), G = rtreeGeos(kind), M = rtreeMats(), g = new THREE.Group();
      for (const [geo, mat] of [[G.wood, M.wood[kind]], [G.leaf, M.leaf[kind]]]) { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m); }
      g.scale.setScalar(s * 1.05); g.rotation.y = hash2(seed, 6) * 6.3;
      return g;
    }
    if (KIT.n_tree_oak) { // fertiges Modell aus dem Nature Kit (gleiche Bäume wie im Rest der Landschaft)
      const con = hash2(seed, 9) < 0.62, list = con ? ["n_tree_pineTallA_detailed", "n_tree_pineTallB_detailed", "n_tree_pineRoundA", "n_tree_pineDefaultA"] : ["n_tree_oak", "n_tree_detailed", "n_tree_fat"];
      const g = kit(list[Math.floor(hash2(seed, 5) * list.length)], s * (con ? 4.8 : 4.4)); g.rotation.y = hash2(seed, 6) * 6.3;
      return g;
    }
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
    // Besucherzentrum und Platz liegen auf EINER Höhe (vorher hatten Platz, Haus und Straße je eine eigene – dann schwebten Kanten)
    const SL = makeHeight(craters, [], 200, null, hills)(...L.station), [stx, stz] = L.station;
    const flats = [];
    for (let i = 0; i < L.road.length - 1; i++) { const [ax, az] = L.road[i], [bx, bz] = L.road[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 8); for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; flats.push([x, z, 12, Math.hypot(x - stx, z - stz) < 34 ? SL : "auto", 12]); } } // Dorf eben (zuerst – der Platz am Zentrum hat Vorrang)
    flats.push([0, 0, 11], [stx, stz, 20, SL, 14], [stx, stz + 12, 20, SL, 14], [stx - 15, stz + 12, 11, SL, 12], [stx + 15, stz + 12, 11, SL, 12], [...L.waage, 4], [...L.luft, 6.6], [...L.stern, 4], [...L.mond, 6.5, "auto", 9], [L.mond[0] + 5, L.mond[1] + 2, 5, "auto", 7], [...L.wald, 9, "auto"], [...L.tag, 10, "auto"], rackFlat(L),
      [stx + 11, stz + 1.5, 7.5, SL, 6]); // rechts vor dem Haus eben halten (der Park daneben zog den Boden bis zu 1 m nach unten – Bank, Laterne und Kapsel schwebten)
    const hgt = makeHeight(craters, flats, 200, null, hills);
    const G0 = new THREE.Color(0x4f9440), mul = (hex) => { const c = new THREE.Color(hex); return [c.r / G0.r, c.g / G0.g, c.b / G0.b]; };
    const SAND = mul(0xcfbf8e), MUD = mul(0x8a7a52), MEADOW = [mul(0x5a9e3c), mul(0x6aa83f), mul(0x4a8a3a), mul(0x7cae46)];
    const B = buildBase({
      height: hgt, rocks: KIT.n_rock_largeA ? 0 : 36, // auf der Erde: Felsen aus dem Nature Kit (mit Gras obendrauf)
      // Luft: blauer Himmel, leichter Dunst in der Ferne, am Tag keine Sterne
      sky: ERDE_SKY.getHex(), fog: [160, 560], stars: false, sunSize: 150,
      ground: 0x4f9440, rock: 0x8d918a,
      tint: (x, z) => { // Wiese in vielen Grüntönen, am Seeufer Sand und feuchte Erde
        const n = fbm2(x * 0.02 + 6, z * 0.02), n2 = fbm2(x * 0.07 + 2, z * 0.07 + 9), m = 0.85 + 0.25 * n;
        const k = Math.min(3, Math.floor(n2 * 4.2)), g = MEADOW[Math.max(0, k)], f = (a) => a.map((v) => v * m);
        let c = f(g);
        if (Math.hypot(x - ERDE_LAYOUT.see[0], z - ERDE_LAYOUT.see[1]) < 26) { const h = hgt(x, z), s = smooth(-0.1, -0.55, h), w = smooth(-0.55, -0.75, h); c = c.map((v, i) => v + (SAND[i] - v) * s); c = c.map((v, i) => v + (MUD[i] - v) * w); }
        return c;
      },
      keepFree: [[...L.spawn, 4], [L.station[0], L.station[1] + 2, 18], [...L.waage, 4], [...L.luft, 4], [...L.stern, 4], [...L.mond, 4],
        [...L.see, 20], [...L.wald, 9], [...L.wegweiser, 3]],
      ambient: [0xffffff, 0.55], hemi: [0xbfe3ff, 0x4a7a3a, 0.5], sun: [0xfff4e0, 1.5],
      dust: ["rgba(170,150,110,1)", "rgba(140,125,95,0.9)"]
    });
    const { scene, height, on, rocket } = B;
    const common = addCommon(B, L, "Besucherzentrum", "erde");
    const M = colonyMats("erde");

    // See: flüssiges Wasser gibt es nur auf der Erde
    const WATER = -0.7, lite = W.fast || W.lite;
    const water = earthWater(B, L.see, WATER);
    earthShore(B, L.see, WATER, lite);
    B.wet = (x, z) => Math.hypot(x - L.see[0], z - L.see[1]) < 18 && height(x, z) < WATER + 0.08; // im Wasser (Kind und Nora laufen außen herum) – nur so weit, wie die Wasserfläche reicht (sonst sperrt eine trockene Mulde neben dem Weg)
    // Landschaft: Wälder am Rand, Baumgruppen, Büsche, Blumenflecken und Grasbüschel – nicht auf Wegen, Plätzen und im See
    const tourPts = [[L.spawn[0] + 2, L.spawn[1] + 2]];
    for (const k of [...cfg.guide.order, "wand"]) for (const p of (L.route[k] || [])) tourPts.push(p);
    const lineDist = (pts, x, z) => { let m = Infinity; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1))); m = Math.min(m, Math.hypot(x - ax - vx * t, z - az - vz * t)); } return m; };
    const pathDist = (x, z) => lineDist(tourPts, x, z);
    // alle Wege, die man läuft: der Rundweg und jeder Weg bis zu seiner Station (auch das letzte Stück über die Wiese)
    const walks = [tourPts, ...Object.entries(L.route).map(([k, r]) => [...r, ...(L[k] ? [L[k]] : [])])];
    const wayDist = (x, z) => Math.min(...walks.map((w) => lineDist(w, x, z)));
    const treeOk = (x, z, crown) => wayDist(x, z) > crown + 1.6; // Baumkrone nicht über einem Weg (sonst steckt die Kamera in den Zweigen)
    const keep = [[0, 0, 14], [...L.station, 24], [L.station[0], L.station[1] + 14, 22], [...L.see, 21], [...L.tag, 13], [...L.mond, 11], [...L.luft, 7], [...L.stern, 7], [...L.waage, 6],
      [...L.wegweiser, 5], [...L.spawn, 7], [L.wald[0] + 12, L.wald[1] - 13, 7], [L.wald[0] - 1, L.wald[1] - 15, 5], [...L.wald, 13]];
    const roadDist = (x, z) => { let m = Infinity; for (let i = 0; i < L.road.length - 1; i++) { const [ax, az] = L.road[i], [bx, bz] = L.road[i + 1], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); m = Math.min(m, Math.hypot(x - ax - vx * t, z - az - vz * t)); } return m; };
    const free = (x, z, r) => Math.hypot(x, z) < 146 && pathDist(x, z) > r + 1.6 && roadDist(x, z) > r + 21 && !keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + r);
    const forest = [], treeCols = [];
    // Wald der Foto-Safari: ein Waldrand im Westen HINTER der Station (die Tiere sind auf der Wiese davor). Um die Station bleibt
    // eine Lichtung frei – die naturnahen Bäume sind groß (Kronen bis 5 m breit, Fichtenzweige bis fast zum Boden). Stünden sie
    // dicht um die Station, verschwände sie in den Zweigen und die Kamera steckte beim Hinlaufen mitten im Baum.
    const [wx0, wz0] = L.wald, trees = new THREE.Group(), photo = [];
    { // Info-Tafel „Foto-Safari“ am Rand der Lichtung, zum ankommenden Weg gedreht; daneben eine Kamera auf dem Stativ
      const [rx, rz] = L.route.wald[L.route.wald.length - 1], d = Math.hypot(rx - wx0, rz - wz0) || 1, ux = (rx - wx0) / d, uz = (rz - wz0) / d;
      const bx = wx0 + ux * 1.2 - uz * 3.2, bz = wz0 + uz * 1.2 + ux * 3.2, board = new THREE.Group(); on(board, bx, bz); board.rotation.y = Math.atan2(rx - bx, rz - bz);
      for (const x of [-0.85, 0.85]) put(board, new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.15, 0.1), wood(M, 0.2, 1)), x, 1.07, 0);
      const pic = canvasTex(640, 400, (c) => {
        c.fillStyle = "#f4ead7"; c.fillRect(0, 0, 640, 400); c.fillStyle = "#2f6b3a"; c.fillRect(0, 0, 640, 78);
        c.fillStyle = "#fff"; c.font = "bold 44px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("📷 FOTO-SAFARI", 320, 40);
        c.fillStyle = "#3b2f22"; c.font = "bold 24px sans-serif"; c.fillText("Wer lebt hier? Fotografiere 5 verschiedene!", 320, 108);
        const K = cfg.safari && cfg.safari.kinds ? Object.values(cfg.safari.kinds).filter(([, n]) => n !== "Mensch").slice(0, 6) : [];
        K.forEach(([em, name], i) => { const x = 70 + (i % 3) * 250 - (i % 3) * 30, y = 150 + Math.floor(i / 3) * 120; c.fillStyle = "#ffffff"; c.fillRect(x - 10, y, 190, 100); c.strokeStyle = "#c9b48f"; c.lineWidth = 3; c.strokeRect(x - 10, y, 190, 100); c.font = "54px sans-serif"; c.fillText(em, x + 40, y + 50); c.fillStyle = "#3b2f22"; c.font = "bold 22px sans-serif"; c.fillText(name, x + 120, y + 52); c.fillStyle = "#3b2f22"; });
      });
      put(board, new THREE.Mesh(new THREE.BoxGeometry(1.76, 1.12, 0.06), wood(M, 1, 0.6)), 0, 1.45, -0.02);
      put(board, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: pic, roughness: 0.7 })), 0, 1.45, 0.012, false);
      for (const s of [-1, 1]) { const r = put(board, new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.5), wood(M, 1, 0.3)), 0, 2.2, s * 0.17); r.rotation.x = s * 0.55; }
      const tripod = new THREE.Group(); tripod.position.set(1.5, 0, 0.6); tripod.rotation.y = 0.6; board.add(tripod);
      const black = new THREE.MeshStandardMaterial({ color: 0x1f2328, roughness: 0.5, metalness: 0.4 });
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; rod(tripod, new V(0, 1.2, 0), new V(Math.cos(a) * 0.38, 0.02, Math.sin(a) * 0.38), 0.014, M.steel, 6); }
      put(tripod, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.09), black), 0, 1.3, 0);
      put(tripod, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.2, 16), black), 0, 1.3, 0.14).rotation.x = Math.PI / 2;
      put(tripod, new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.05, metalness: 0.9 })), 0, 1.3, 0.241, false);
      put(tripod, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.04), black), 0.04, 1.37, -0.01, false);
      treeCols.push([bx, bz, 0.9]);
    }
    const crownOf = (s, sd) => rtreeReach(rtreeKind(hash2(sd, 9) < 0.62, sd)) * s * 1.05; // Krone eines Baums aus makeTree
    const clearing = (x, z, crown) => treeOk(x, z, crown) && Math.hypot(x - wx0, z - wz0) > crown + 8.5;
    for (let i = 0; i < 160 && photo.length < 12; i++) {
      const a = 1.95 + hash2(i, 11) * 2.15, r = 12 + hash2(i, 12) * 7, x = wx0 + Math.cos(a) * r, z = wz0 + Math.sin(a) * r, s = 0.75 + hash2(i, 13) * 0.45, sd = i * 7 + 1, cr = crownOf(s, sd);
      if (!clearing(x, z, cr) || photo.some(([px, pz, pc]) => Math.hypot(x - px, z - pz) < (cr + pc) * 0.55)) continue; // nicht Stamm an Stamm
      const t = makeTree(s, sd); t.position.set(x, height(x, z), z); trees.add(t); photo.push([x, z, cr]); treeCols.push([x, z, 0.35 * s]);
    }
    for (let i = 0; i < 14; i++) { // einzelne Bäume in der Landschaft (nicht an der Dorfstraße)
      const x = (hash2(i, 21) - 0.5) * 240, z = (hash2(i, 22) - 0.5) * 240, s = 0.9 + hash2(i, 23) * 0.8, sd = i * 11 + 3, cr = crownOf(s, sd);
      if (Math.hypot(x, z) < 70 || Math.hypot(x - L.see[0], z - L.see[1]) < 22 || roadDist(x, z) < cr + 8 || !treeOk(x, z, cr)) continue;
      const t = makeTree(s, sd); t.position.set(x, height(x, z), z); trees.add(t); treeCols.push([x, z, 0.35 * s]);
    }
    scene.add(trees);
    for (let i = 0; i < (lite ? 260 : 520); i++) { // Waldgürtel am Rand – in Gruppen (Rauschen entscheidet, wo Wald ist)
      const a = hash2(i, 51) * Math.PI * 2, r = 78 + hash2(i, 52) * 120, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = 0.95 + hash2(i, 53) * 0.75, con = hash2(i, 54) < 0.6;
      if (fbm2(x * 0.025 + 3, z * 0.025) < 0.5 || roadDist(x, z) < 12 || (r < 146 && (!free(x, z, 1.5) || !treeOk(x, z, rtreeCrown(s, con, i))))) continue;
      forest.push([x, z, s, con, i]); if (r < 148) treeCols.push([x, z, 0.4 * s]);
    }
    for (let i = 0, n = 0; i < 3000 && n < (lite ? 14 : 26); i++) { // Baumgruppen auf der Wiese
      const x = (hash2(i, 55) - 0.5) * 150, z = (hash2(i, 56) - 0.5) * 150; if (!free(x, z, 4)) continue; n++;
      for (let k = 0; k < 1 + (i % 3); k++) {
        const xx = x + (hash2(i, 57 + k) - 0.5) * 6, zz = z + (hash2(i, 60 + k) - 0.5) * 6, s = 0.9 + hash2(i, 63 + k) * 0.6, con = hash2(i, 66 + k) < 0.3;
        if (!free(xx, zz, 1.5) || !treeOk(xx, zz, rtreeCrown(s, con, i * 5 + k))) continue;
        forest.push([xx, zz, s, con, i * 5 + k]); treeCols.push([xx, zz, 0.4 * s]);
      }
    }
    for (let i = 0; i < 16; i++) { // dichterer Wald hinter dem Waldrand der Foto-Safari
      const a = 1.8 + hash2(i, 11) * 2.45, r = 19 + hash2(i, 12) * 9, x = wx0 + Math.cos(a) * r, z = wz0 + Math.sin(a) * r, s = 1 + hash2(i, 13) * 0.6;
      if (clearing(x, z, rtreeCrown(s, true, i + 900))) { forest.push([x, z, s, true, i + 900]); treeCols.push([x, z, 0.5]); }
    }
    earthForest(B, forest.filter(([x, z]) => Math.hypot(x, z) < 95)); // nahe Bäume werfen Schatten, ferne nicht (spart Rechenzeit)
    earthForest(B, forest.filter(([x, z]) => Math.hypot(x, z) >= 95), false);
    const bushCols = earthMeadow(B, (x, z, r) => free(x, z, r) && Math.hypot(x, z) < 140, lite);
    const townCols = earthTown(B, L.road, lite); // Dorfstraße mit Häusern hinter dem Besucherzentrum
    if (KIT.n_tent_detailedOpen) { // Zeltplatz: Zelt, Lagerfeuer, zwei Baumstämme zum Sitzen
      let spot = null;
      for (let i = 0; i < 200 && !spot; i++) { const a = 3.2 + (i % 20) * 0.08, r = 26 + Math.floor(i / 20) * 1.5, x = L.see[0] + Math.cos(a) * r, z = L.see[1] + Math.sin(a) * r; if (free(x, z, 4.5)) spot = [x, z]; }
      if (spot) {
        const [x, z] = spot, toLake = Math.atan2(L.see[0] - x, L.see[1] - z), y = (a, d) => [x + Math.sin(toLake + a) * d, z + Math.cos(toLake + a) * d];
        const [fx, fz] = y(0, 1.2), [tx2, tz2] = y(Math.PI, 2.2), [l1x, l1z] = y(1.3, 2.6), [l2x, l2z] = y(-1.3, 2.6);
        kitInstanced(scene, "n_tent_detailedOpen", [[tx2, height(tx2, tz2), tz2, 4.2, toLake]]);
        kitInstanced(scene, "n_campfire_logs", [[fx, height(fx, fz), fz, 3.5, 0]]);
        kitInstanced(scene, "n_log", [[l1x, height(l1x, l1z), l1z, 3.2, toLake + Math.PI / 2], [l2x, height(l2x, l2z), l2z, 3.2, toLake + Math.PI / 2]]);
        const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,230,150,1)", "rgba(255,120,30,0.8)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        flame.position.set(fx, height(fx, fz) + 0.45, fz); flame.scale.setScalar(1.1); scene.add(flame); B.campFlame = flame;
        treeCols.push([tx2, tz2, 1.6], [fx, fz, 0.6], [l1x, l1z, 0.6], [l2x, l2z, 0.6]);
      }
    }
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
    const meteor = new THREE.Mesh(sphereUV(naturalRockGeo(131, 3)).scale(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.9, vertexColors: true, ...rockTex(2, 1, 1.4) }));
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
      const fl = ["n_flower_redA", "n_flower_yellowA", "n_flower_purpleA", "n_flower_redB", "n_flower_yellowB", "n_flower_purpleB"], byF = {};
      for (let i = 0; i < 28; i++) {
        const a = gap + 0.62 + (i / 27) * (Math.PI * 2 - 1.24), r = 1.7 + hash2(i, 41) * 0.25, x = tx + Math.cos(a) * r, z = tz - Math.sin(a) * r; // a: Winkel im Ring
        if (KIT.n_flower_redA) { const n = fl[i % fl.length]; (byF[n] = byF[n] || []).push([x, height(x, z) + 0.03, z, 1.8 + hash2(i, 42) * 0.5, hash2(i, 43) * 6]); continue; }
        const f = earthFlower(M, cols[i % cols.length], 0.28 + hash2(i, 42) * 0.14); f.rotation.y = hash2(i, 43) * 6;
        on(f, x, z);
      }
      for (const [n, list] of Object.entries(byF)) kitInstanced(scene, n, list, false);
    }
    // Park um die Sonnenuhr: Eingang zwischen dem Rundweg (Wegpunkt am Park) und der Station vor der Uhr
    const parkOpen = (() => { const [tx, tz] = L.tag, r = L.route.tag[L.route.tag.length - 1], ax = r[0] - tx, az = r[1] - tz, l = Math.hypot(ax, az), x = ax / l + ERDE_SOUTH.x, z = az / l + ERDE_SOUTH.z, m = Math.hypot(x, z); return [x / m, z / m]; })();
    const parkCols = earthPark(B, M, L.tag, parkOpen, treeOk);
    { // Waage mit Schild „So viel wiegst du wirklich“
      on(makeSignBoard(M, "⚖️ WAAGE – WIE SCHWER BIST DU?", "#2563eb", 3.2), L.waage[0] + 2.4, L.waage[1] + 1).rotation.y = Math.atan2(-L.waage[0], -L.waage[1]);
    }
    // Am See: Steg mit Boot und Enten
    const [lx, lz] = L.see, jetty = new THREE.Group();
    { // Steg: beginnt am Westufer auf dem Trockenen und führt 6 m aufs Wasser hinaus, Pfosten bis zum Grund
      const dx = -0.99, dz = 0.12; let r = 6; while (r < 22 && height(lx + dx * r, lz + dz * r) < WATER) r += 0.1;
      const sx = lx + dx * (r + 1.4), sz = lz + dz * (r + 1.4), ry = Math.atan2(-dx, -dz), deckY = WATER + 0.45;
      jetty.position.set(sx, deckY, sz); jetty.rotation.y = ry; scene.add(jetty);
      for (let i = 0; i < 12; i++) put(jetty, new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 0.56), wood(M, 1, 0.3)), 0, 0, i * 0.62);
      for (const s of [-0.85, 0.85]) for (const k of [0.4, 3.2, 6.6]) {
        const wx = sx + Math.sin(ry) * k + Math.cos(ry) * s, wz = sz + Math.cos(ry) * k - Math.sin(ry) * s, bottom = Math.min(height(wx, wz), WATER) - 0.3, h = deckY - bottom + 0.7;
        put(jetty, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 8), wood(M, 0.2, 1)), s, 0.7 - h / 2, k);
      }
      for (const s of [-0.85, 0.85]) put(jetty, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 6.4), wood(M, 1, 0.2)), s, 0.6, 3.6); // Geländer
    }
    const boat = earthSailboat(M); scene.add(boat);
    const shoreTab = []; for (let k = 0; k < 72; k++) { const a = (k / 72) * Math.PI * 2; let r = 6; while (r < 22 && height(lx + Math.cos(a) * r, lz + Math.sin(a) * r) < WATER) r += 0.2; shoreTab.push(r); }
    const shoreR = (a) => shoreTab[((Math.round((a / (Math.PI * 2)) * 72) % 72) + 72) % 72]; // Abstand vom Seemittelpunkt zum Ufer in Richtung a
    if (KIT.n_canoe) { // Kanu am Steg und ein kleiner Zeltplatz mit Lagerfeuer am Ufer
      const ry = jetty.rotation.y, side = [Math.cos(ry), -Math.sin(ry)], fwd = [Math.sin(ry), Math.cos(ry)];
      const cx = jetty.position.x + fwd[0] * 4.6 + side[0] * 2.0, cz = jetty.position.z + fwd[1] * 4.6 + side[1] * 2.0;
      kitInstanced(scene, "n_canoe", [[cx, WATER - 0.12, cz, 3.2, ry]]);
      kitInstanced(scene, "n_canoe_paddle", [[jetty.position.x + fwd[0] * 2 + side[0] * 0.3, jetty.position.y + 0.05, jetty.position.z + fwd[1] * 2 + side[1] * 0.3, 2.6, ry + 0.5]], false);
    }
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
    const postAt = [MC[0] - 1.5, MC[1] + 6.5], post = on(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.25, 8), wood(M, 0.3, 1)), ...postAt, 0.62);
    post.castShadow = true;
    const robin = earthRobin(M); robin.position.set(postAt[0], post.position.y + 0.63, postAt[1]); robin.rotation.y = Math.atan2(-postAt[0], -postAt[1]); scene.add(robin);
    // Windräder am Horizont, Vögel am Himmel
    const turbines = [[140, 160], [175, 120], [110, 195]].map(([x, z]) => { const t = earthTurbine(M, 36); t.position.set(x, height(x, z) - 1, z); t.rotation.y = -2.4; scene.add(t); return t; });
    const birds = earthBirds(7); scene.add(birds);
    drawTour(B, L, [204, 194, 170], 1.9, "gravel"); // Rundweg um den See: Kiesweg
    const anim = [(dt, t) => {
      const ob = rollRoof.userData; if (ob.open !== ob.target) { ob.open += Math.sign(ob.target - ob.open) * Math.min(Math.abs(ob.target - ob.open), dt * 0.6); ob.set(smooth(0, 1, ob.open)); }
      weather.userData.cups.rotation.y += dt * (4 + 2 * Math.sin(t * 0.4));
      weather.userData.vane.rotation.y = 0.6 + Math.sin(t * 0.23) * 0.35 + Math.sin(t * 1.1) * 0.06; // Windfahne zeigt in den Wind
      { // Wetterballon: 8 s am Füllstutzen füllen (Sonde liegt daneben), dann steigt er immer schneller; ist die Schnur straff, hebt die Sonde ab
        const W = weather.userData, bl = W.balloon, ct = t % 50, [PX, PZ] = W.launch, [RX, RZ] = W.rest, LEN = 3.2;
        const fill = Math.min(1, ct / 8), up = Math.max(0, ct - 9);
        W.body.scale.setScalar(0.08 + 0.92 * fill * (2 - fill));
        const lift = up * up * 0.9 + up * 1.2;
        bl.position.set(PX + up * 0.9 + Math.sin(up * 0.8) * 0.15 * Math.min(1, up), 1.1 + lift, PZ + up * 1.4);
        bl.rotation.z = Math.sin(t * 1.3) * 0.04 * (up > 0 ? 1 : 0.4);
        const n = bl.position, hang = n.y - LEN > 0.06; // Sonde hängt, sobald die Schnur straff ist
        if (hang) W.sonde.position.set(n.x - 0.2, n.y - LEN - 0.2, n.z - 0.25); else W.sonde.position.set(RX, 0.06, RZ);
        const sp = W.sonde.position, top = new V(sp.x, sp.y + 0.2, sp.z);
        W.chute.position.copy(n).lerp(top, 0.4); W.chute.visible = hang || up > 0;
        if (!hang && up === 0) { W.chute.position.set(RX + 0.25, 0.08, RZ); }
        const a = W.line.geometry.attributes.position, mid = W.chute.position; a.setXYZ(0, n.x, n.y, n.z); a.setXYZ(1, mid.x, mid.y + 0.07, mid.z); a.setXYZ(2, top.x, top.y, top.z); a.needsUpdate = true;
        bl.visible = W.sonde.visible = W.chute.visible = W.line.visible = lift < 900;
      }
      { const a = t * 0.035; boat.position.set(lx + Math.cos(a) * 6.5, WATER + 0.05 + Math.sin(t * 1.3) * 0.04, lz + Math.sin(a) * 5); // segelt im Kreis, Bug in Fahrtrichtung
        boat.rotation.set(0, Math.atan2(-Math.sin(a) * 6.5, Math.cos(a) * 5), Math.sin(t * 0.9) * 0.05 - 0.06); }
      water.material.map.offset.set(t * 0.004, t * 0.0025); // Wellen ziehen langsam über den See
      if (B.campFlame) B.campFlame.scale.setScalar(0.95 + 0.25 * Math.abs(Math.sin(t * 7) * Math.sin(t * 3.1))); // Lagerfeuer flackert
      // Enten: drehen ihre Runden – steht das Kind am Ufer, schwimmen sie neugierig zu ihm heran
      { const cx = ast.pos.x - lx, cz = ast.pos.z - lz, cd = Math.hypot(cx, cz), ca = Math.atan2(cz, cx), shore = shoreR(ca), atShore = cd < shore + 6 && cd > shore - 0.5;
        ducks.forEach((d, i) => {
          const u = d.userData; if (!u.cur) u.cur = new V(lx - 6 + i * 0.6, -0.62, lz + i * 0.4);
          const a = t * 0.08 + i * 0.5, want = atShore
            ? tmp2.set(lx + Math.cos(ca + (i - 1.5) * 0.09) * (shore - 1.4 - (i % 2) * 0.7), -0.62, lz + Math.sin(ca + (i - 1.5) * 0.09) * (shore - 1.4 - (i % 2) * 0.7))
            : tmp2.set(lx - 6 + Math.cos(a) * 5 + i * 0.6, -0.62, lz + Math.sin(a) * 4 + i * 0.4);
          const ex = want.x - u.cur.x, ez = want.z - u.cur.z, ed = Math.hypot(ex, ez), st = Math.min(ed, dt * (atShore ? 1.3 : 0.9));
          if (ed > 0.05) { u.cur.x += (ex / ed) * st; u.cur.z += (ez / ed) * st; d.rotation.y = angleLerp(d.rotation.y, Math.atan2(ex, ez), 1 - Math.exp(-dt * 3)); }
          d.position.set(u.cur.x, -0.62 + Math.sin(t * 2 + i) * 0.015, u.cur.z);
        }); }
      for (const tb of turbines) tb.userData.rotor.rotation.z += dt * 0.9;
      for (const d of [doe, fawn]) { // Rehe grasen – kommt man zu nah (4,5 m), springen sie ein Stück davon und grasen dann weiter
        const u = d.userData, p = d.position; if (!u.home) { u.home = p.clone(); u.flee = 0; }
        const dx = p.x - ast.pos.x, dz = p.z - ast.pos.z, dd = Math.hypot(dx, dz);
        if (u.flee <= 0 && dd < 4.5) { u.flee = 1.5; const a = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.8; u.dir = [Math.sin(a), Math.cos(a)]; }
        if (u.flee > 0) {
          u.flee -= dt;
          let [vx, vz] = u.dir; const sp = 4.5 * Math.min(1, u.flee / 0.4 + 0.2), nx = p.x + vx * sp * dt, nz = p.z + vz * sp * dt;
          if ((world.wet && world.wet(nx, nz)) || Math.hypot(nx, nz) > 140 || Math.hypot(nx - u.home.x, nz - u.home.z) > 16) { const r = [vz, -vx]; u.dir = r; } // Wasser oder zu weit: abbiegen
          else { p.x = nx; p.z = nz; }
          d.rotation.y = angleLerp(d.rotation.y, Math.atan2(u.dir[0], u.dir[1]), 1 - Math.exp(-dt * 8));
          p.y = height(p.x, p.z) + Math.abs(Math.sin(t * 9)) * 0.28 * Math.min(1, u.flee * 2); u.neck.rotation.x = -0.25; // Sprünge, Kopf hoch
          continue;
        }
        p.y = height(p.x, p.z);
        const ph = (t * 0.16 + u.seed) % 1; u.neck.rotation.x = 1.25 * smooth(0.05, 0.15, ph) * (1 - smooth(0.62, 0.72, ph)); // grasen
      }
      flies.forEach((b, i) => { // Schmetterlinge flattern über der Wiese
        const u = b.userData, a = t * (0.3 + i * 0.05) + u.o, r = 1.4 + i * 0.6, x = MC[0] + Math.cos(a) * r, z = MC[1] + Math.sin(a * 1.3) * r;
        b.position.set(x, height(x, z) + 0.9 + 0.35 * Math.sin(t * 1.7 + u.o) + 0.08 * Math.sin(t * 9 + u.o), z);
        b.rotation.y = Math.atan2(-Math.sin(a) * r, Math.cos(a * 1.3) * r * 1.3);
        const f = 0.85 + Math.sin(t * 15 + u.o) * 0.6; u.wr.rotation.z = f; u.wl.rotation.z = -f;
      });
      { const u = frog.children[0].userData, ph = (t / 6 + u.seed) % 1; frog.children[0].position.y = ph < 0.08 ? Math.sin((ph / 0.08) * Math.PI) * 0.35 : 0; } // Frosch hüpft
      { const u = robin.userData, ph = (t / 4 + u.seed) % 1; u.head.rotation.y = Math.sin(t * 1.3 + u.seed) * 0.8 * (ph > 0.3 ? 1 : 0); robin.position.y = post.position.y + 0.63 + (ph < 0.06 ? Math.sin((ph / 0.06) * Math.PI) * 0.12 : 0); }
      for (const b of birds.userData.birds) { const a = t * 0.18 + b.o; b.b.position.set(Math.cos(a) * b.r + 10, b.h + Math.sin(t * 2 + b.o) * 0.6, 40 + Math.sin(a) * b.r); b.b.rotation.y = -a; b.b.scale.y = 1.4 * (0.6 + 0.4 * Math.sin(t * 8 + b.o)); }
      { const gust = 0.8 + 0.25 * Math.sin(t * 0.45) + 0.12 * Math.sin(t * 1.9); // Fahnen flattern im böigen Wind: zwei Wellen, nach außen stärker
        common.station.userData.flags.forEach((c, k) => { const p = c.geometry.attributes.position, ph = k * 1.7; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.9, y = p.getY(i); p.setZ(i, (Math.sin(x * 2.6 - t * 6 + ph + y * 0.9) * 0.24 + Math.sin(x * 5.5 - t * 10.5 + ph) * 0.06) * Math.min(1, x * 0.9 + 0.05) * gust); } p.needsUpdate = true; c.geometry.computeVertexNormals(); }); }
    }];
    const { rack, cols: rackCols, spot: rackSpot } = placeSizeRack(B, ["merkur", "mars", "venus", "erde"], L.station);

    const stations = addMarkers(B, { wand: [L.station[0], L.station[1] - 2.2],
      waage: L.waage, luft: L.luft, stern: L.stern, tag: L.tag, groesse: rackSpot, mond: L.mond,
      wasser: L.wasser, wald: L.wald, wegweiser: L.wegweiser, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] },
      { mond: MARS_SCOPE_DOOR(L.mond), tag: [ERDE_SOUTH.x * 2.6, ERDE_SOUTH.z * 2.6] }); // vor der Sonnenuhr (Süden), nicht auf ihr
    const npcs = addNpcs(B);
    const colliders = [...common.colliders, ...npcs.map((n) => n.col), [...L.luft, 0.9], [L.luft[0] - 1.4, L.luft[1], 0.2], ...(() => { weather.updateMatrixWorld(true); return weather.userData.fence.map(([x, z]) => { const v = weather.localToWorld(new V(x, 0, z)); return [v.x, v.z, 0.22]; }); })(), [...L.stern, 0.9], [...L.mond, 3.2], [...L.wegweiser, 0.3], [...L.tag, 1.4],
      ...rackCols, ...parkCols, ...treeCols, ...bushCols, ...townCols];

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
  //  Sonden: Wo man nicht landen kann (Gasriesen, Sonne), steuert das Kind eine Sonde und erledigt drei Aufgaben – an jedem
  //  Ort andere (PROBES[ort].tasks): ein Foto mit dem Sucher, Funken einsammeln, im Messfeld bleiben, durch die Lücke im Ring.
  //  Jede Aufgabe ist eine Entdeckung. Funk, Entdeckungskarten, Liste und Funk-Fragen sind dieselben wie beim Astronauten.
  // =========================================================
  let probe = null; // Zustand des laufenden Sondenflugs
  const PROBE_SPEED = 15, LANE_X = 13, LANE_Y = 7, GAP_H = 2.4, FINDER_PX = 62, PHOTO_HOLD = 0.9;
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
  // ---------- Was zu den Aufgaben gehört ----------
  // Einsammeln: leuchtende Funken (oder Bildchen wie 🌍), die vor der Sonde schweben; was vorbeizieht, kommt weiter vorn wieder
  // Zum Einsammeln überall dasselbe Zeichen: ein heller, funkelnder Stern mit Ring (nie zu verwechseln mit Hindernissen)
  function starTex(col) {
    return canvasTex(128, 128, (c) => {
      const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,0.75)"); gr.addColorStop(0.45, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
      c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 4; c.beginPath(); c.arc(64, 64, 40, 0, 7); c.stroke();
      c.beginPath(); for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, rr = k % 2 ? 20 : 50; c.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } c.closePath();
      c.lineJoin = "round"; c.lineWidth = 9; c.strokeStyle = "#0b2545"; c.stroke(); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = "#ffffff"; c.stroke();
      c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath(); c.arc(58, 58, 7, 0, 7); c.fill();
    });
  }
  function makeSparks(scene, def) {
    const list = [], mat = def.icon ? null : new THREE.SpriteMaterial({ map: starTex(def.glow), transparent: true, depthWrite: false, toneMapped: false, fog: false });
    for (let i = 0; i < 9; i++) {
      const sp = def.icon ? iconSprite(def.icon) : new THREE.Sprite(mat);
      sp.scale.setScalar(def.icon ? 3.4 : 2.8); sp.visible = false; sp.userData = { x: 0, y: 0, z: -1e9, ph: Math.random() * 6 }; scene.add(sp); list.push(sp);
    }
    return list;
  }
  function spawnSpark(sp, p, ahead) {
    const u = sp.userData; u.z = p.z + ahead;
    u.x = Math.max(-LANE_X + 1.5, Math.min(LANE_X - 1.5, p.x * 0.3 + (Math.random() - 0.5) * 18));
    u.y = Math.max(-LANE_Y + 1.2, Math.min(LANE_Y - 1.2, p.y * 0.3 + (Math.random() - 0.5) * 10));
    sp.position.set(u.x, u.y, u.z); sp.visible = true;
  }
  // Messfeld: eine leuchtende Röhre mit wandernden Streifen und Ringen, die vor der Sonde her schwebt (Radius = scale)
  function makeZone(scene) {
    const tex = canvasTex(64, 256, (c) => { const gr = c.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,0.95)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; for (let y = 0; y < 256; y += 32) c.fillRect(0, y, 64, 12); });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(12, 4);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
    const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    const g = new THREE.Group(), tube = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 64, 48, 1, true), mat); tube.rotation.x = Math.PI / 2; g.add(tube);
    for (const z of [-28, -12, 4, 20]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 64), ringMat); ring.position.z = z; g.add(ring); }
    g.visible = false; g.userData = { mat, ringMat, tex }; scene.add(g);
    return g;
  }
  // Ring-Wand mit einer Lücke (Saturn): viele Eisbrocken in einer Ebene quer zur Flugbahn, die Lücke zeigen zwei Leuchtlinien
  function makeGapWall(scene) {
    const N = 720, inst = new THREE.InstancedMesh(sphereUV(naturalRockGeo(150, 2)), new THREE.MeshStandardMaterial({ color: 0xe2ecf8, roughness: 0.4, vertexColors: true, ...rockTex(2, 1, 1) }), N);
    inst.frustumCulled = false; scene.add(inst);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    const W2 = 2 * LANE_X + 56, lines = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(W2, 0.22, 0.22), lineMat); scene.add(m); return m; });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W2, 2 * GAP_H), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    scene.add(glow);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V(), ps = new V();
    const wall = {
      z: -1e9, y: 0,
      set(z, y) {
        wall.z = z; wall.y = y;
        for (let i = 0; i < N; i++) {
          let px = 0, py = 0;
          for (let k = 0; k < 20; k++) { px = (hash2(i + k * 13, z * 0.01) - 0.5) * W2; py = (hash2(i + 77 + k * 7, z * 0.013) - 0.5) * (2 * LANE_Y + 22); if (Math.abs(py - y) > GAP_H + 0.5) break; }
          const s0 = 0.5 + Math.pow(hash2(i, 5), 2) * 1.6;
          e.set(hash2(i, 6) * 6, hash2(i, 7) * 6, hash2(i, 8) * 6); q.setFromEuler(e);
          m4.compose(ps.set(px, py, z + (hash2(i, 9) - 0.5) * 4), q, sc.set(s0, s0 * 0.8, s0)); inst.setMatrixAt(i, m4);
        }
        inst.instanceMatrix.needsUpdate = true;
        lines[0].position.set(0, y + GAP_H, z); lines[1].position.set(0, y - GAP_H, z); glow.position.set(0, y, z);
        wall.show(true);
      },
      show(v) { inst.visible = lines[0].visible = lines[1].visible = glow.visible = v; },
      pulse(t) { lineMat.opacity = 0.65 + 0.35 * Math.sin(t * 5); }
    };
    wall.show(false);
    return wall;
  }
  // Steuerdüsen: kleine weiße Wölkchen auf der Seite, von der die Sonde weggeschoben wird
  function makeJets(scene) {
    const list = [];
    for (let i = 0; i < 22; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,255,0.95)", "rgba(200,220,255,0.3)"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      sp.visible = false; sp.userData = { life: 0, v: new V() }; scene.add(sp); list.push(sp);
    }
    return { list, acc: 0 };
  }
  function jetsUpdate(J, p, dt, mx, my) {
    const k = Math.min(1, Math.hypot(mx, my));
    J.acc += dt * 28 * k;
    while (J.acc >= 1) {
      J.acc -= 1; const sp = J.list.find((x) => !x.visible); if (!sp) break;
      const u = sp.userData; u.life = 0.35; // rechts steuern (mx > 0) schiebt nach −X, also zischt es auf der +X-Seite
      u.v.set(mx * 7 + (Math.random() - 0.5) * 1.5, -my * 7 + (Math.random() - 0.5) * 1.5, -1.5);
      sp.position.set(p.x + Math.sign(mx) * 0.9 * (Math.abs(mx) > 0.15 ? 1 : 0), p.y - Math.sign(my) * 0.7 * (Math.abs(my) > 0.15 ? 1 : 0), p.z + 0.2);
      sp.visible = true;
    }
    for (const sp of J.list) if (sp.visible) {
      const u = sp.userData; u.life -= dt; if (u.life <= 0) { sp.visible = false; continue; }
      sp.position.addScaledVector(u.v, dt); sp.scale.setScalar(0.35 + (0.35 - u.life) * 3.2); sp.material.opacity = (u.life / 0.35) * 0.85;
    }
  }
  // Kleine Details für alle Sonden: Steuerdüsen-Blöcke (vier Düsen) und blinkende Positionslichter
  function craftDetail(g, P, rcs, lights) {
    for (const [x, y, z] of rcs) {
      const q = new THREE.Group(); q.position.set(x, y, z); g.add(q); q.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), P.dark));
      for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]) { const n = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 8), P.steel), dv = new V(...d); n.position.copy(dv).multiplyScalar(0.11); n.quaternion.setFromUnitVectors(new V(0, -1, 0), dv); q.add(n); }
    }
    g.userData.blink = lights.map(([x, y, z, c]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); m.position.set(x, y, z); g.add(m); return m; });
  }
  // Kugel des Planeten im Modell finden (die mit der Oberflächen-Textur)
  function planetSphere(pl) { let best = null; pl.traverse((o) => { if (o.isMesh && o.geometry.type === "SphereGeometry" && o.material && o.material.map && (!best || o.geometry.parameters.radius > best.geometry.parameters.radius)) best = o; }); return best || pl; }
  // Planet (mit Ringen und Neigung) aus der Weltraum-Ansicht nachbauen, in der gewünschten Größe
  function planetModel(id, radius) {
    const b = G.bodyById[id], src = W.bodies[id].mesh;
    const m = id === "sonne" ? src.clone() : src.parent.clone();
    m.scale.setScalar(radius / b.radius);
    return m;
  }

  // ---------- Jede Sonde ist einer echten Mission nachgebaut (Flugrichtung = +Z; im Spiel sieht man sie von hinten oben) ----------
  // Werkstoffe: Isolierdecken (gold, silber, schwarz, kupfer), weißer Lack, Aluminium, Kohlefaser, Solarzellen – mit weicher Spiegelung
  const PROBE_ENV = { jupiter: "pjupiter", sonne: "psonne" };
  function probeMats() {
    const env = envFor(PROBE_ENV[bodyId] || "pspace"), mli = mliSurface(true);
    const std = (o) => new THREE.MeshStandardMaterial({ envMap: env, envMapIntensity: 1, ...o });
    const blanket = (color, rep = 3) => { const a = mli.map.clone(), b = mli.normalMap.clone(); for (const t of [a, b]) { t.repeat.set(rep, rep * 0.6); t.needsUpdate = true; } return std({ map: a, normalMap: b, normalScale: new THREE.Vector2(1.1, 1.1), color: srgb(color), roughness: 0.3, metalness: 0.9, envMapIntensity: 1.35 }); };
    const panels = canvasTex(256, 256, (c) => { c.fillStyle = "#f3f4f6"; c.fillRect(0, 0, 256, 256); c.strokeStyle = "rgba(110,118,130,0.6)"; c.lineWidth = 2; for (let x = 0; x <= 256; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); } for (let y = 0; y <= 256; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); } });
    panels.wrapS = panels.wrapT = THREE.RepeatWrapping; panels.repeat.set(2, 1);
    const cells = canvasTex(256, 128, (c) => { c.fillStyle = "#0f2350"; c.fillRect(0, 0, 256, 128); const gr = c.createLinearGradient(0, 0, 256, 128); gr.addColorStop(0, "rgba(120,170,255,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, 256, 128); c.strokeStyle = "#b8c4d8"; c.lineWidth = 1.5; for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16, 128); c.stroke(); } for (let j = 0; j <= 8; j++) { c.beginPath(); c.moveTo(0, j * 16); c.lineTo(256, j * 16); c.stroke(); } });
    const char = canvasTex(256, 256, (c) => { c.fillStyle = "#3b2416"; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { const x = hash2(i, 1) * 256, y = hash2(i, 2) * 256, rr = 4 + hash2(i, 3) * 22; c.fillStyle = hash2(i, 4) > 0.5 ? "rgba(110,64,34,0.35)" : "rgba(14,8,4,0.4)"; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); } });
    return {
      env, std, gold: blanket(0xe9b04a), silver: blanket(0xd2d7dd), black: blanket(0x3b3b3e), copper: blanket(0xc8794a),
      white: std({ color: srgb(0xf1f2f4), roughness: 0.45, side: THREE.DoubleSide }), dishIn: std({ map: panels, roughness: 0.5, side: THREE.DoubleSide }),
      dark: std({ color: srgb(0x23262e), roughness: 0.5, metalness: 0.5 }), steel: std({ color: srgb(0xc7cdd6), roughness: 0.3, metalness: 0.85 }),
      alu: std({ color: srgb(0xd3d8de), roughness: 0.25, metalness: 0.9 }), comp: std({ color: srgb(0x2b2e33), roughness: 0.7, metalness: 0.15 }),
      cell: std({ map: cells, roughness: 0.3, metalness: 0.5 }), nozzle: std({ color: srgb(0x4b4f55), roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide }),
      char: std({ map: char, roughness: 0.9 }), lens: std({ color: srgb(0x0b1d33), roughness: 0.05, metalness: 0.8 }), record: std({ map: canvasTex(128, 128, (c) => { c.fillStyle = "#d4a93a"; c.fillRect(0, 0, 128, 128); c.strokeStyle = "rgba(90,60,10,0.45)"; for (let rr = 14; rr < 64; rr += 2.5) { c.beginPath(); c.arc(64, 64, rr, 0, 7); c.stroke(); } c.fillStyle = "#8a6a1e"; c.beginPath(); c.arc(64, 64, 12, 0, 7); c.fill(); }), roughness: 0.25, metalness: 0.95 })
    };
  }
  const PROBE_M = { std: (o) => new THREE.MeshStandardMaterial(o) }; // für dishCap (alte Sonde)
  const boom = (g, m, a, b, r = 0.03) => { const d = b.clone().sub(a), c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), m); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(new V(0, 1, 0), d.normalize()); g.add(c); return c; };
  // Bausteine (alles in einen partBuilder b): Stab von p nach q, Teil in einem gedrehten Rahmen, Rahmen mit Achse
  const pRod = (b, mat, p, q, rr, seg = 6) => { const d = q.clone().sub(p); b.addM(new THREE.CylinderGeometry(rr, rr, 1, seg), mat, new THREE.Matrix4().compose(p.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), d.clone().normalize()), new V(1, d.length(), 1))); };
  const pFrame = (pos, axis) => new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), axis.clone().normalize()), new V(1, 1, 1));
  const pAt = (b, geo, mat, base, lp = [0, 0, 0], lr = [0, 0, 0]) => b.addM(geo, mat, base.clone().multiply(new THREE.Matrix4().compose(new V(...lp), new THREE.Quaternion().setFromEuler(new THREE.Euler(...lr)), new V(1, 1, 1))));
  // Gitterausleger: drei Längsstäbe im Dreieck, Ringe und Diagonalen
  function pTruss(b, mat, a, c, w, n) {
    const d = c.clone().sub(a), dir = d.clone().normalize(), up = Math.abs(dir.y) > 0.9 ? new V(1, 0, 0) : new V(0, 1, 0), u = new V().crossVectors(dir, up).normalize(), v = new V().crossVectors(dir, u).normalize();
    const k3 = (k) => u.clone().multiplyScalar(Math.cos(k * 2.0944) * w).addScaledVector(v, Math.sin(k * 2.0944) * w), at = (i, k) => a.clone().addScaledVector(d, i / n).add(k3(k));
    for (let k = 0; k < 3; k++) pRod(b, mat, at(0, k), at(n, k), w * 0.11, 5);
    for (let i = 0; i <= n; i++) for (let k = 0; k < 3; k++) { pRod(b, mat, at(i, k), at(i, k + 1), w * 0.06, 4); if (i < n) pRod(b, mat, at(i, k), at(i + 1, k + 1), w * 0.05, 4); }
  }
  // Atombatterie (RTG): Zylinder mit acht Kühlrippen und Endkappen, entlang axis
  function pRTG(b, P, pos, axis, L = 1.1, rr = 0.16) {
    const fr = pFrame(pos, axis);
    pAt(b, new THREE.CylinderGeometry(rr, rr, L, 20), P.dark, fr);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; pAt(b, new THREE.BoxGeometry(0.016, L * 0.9, rr * 0.95), P.dark, fr, [Math.cos(a) * rr * 1.45, 0, Math.sin(a) * rr * 1.45], [0, Math.PI / 2 - a, 0]); }
    for (const y of [-L / 2, L / 2]) pAt(b, new THREE.CylinderGeometry(rr * 1.08, rr * 1.08, 0.05, 20), P.alu, fr, [0, y, 0]);
  }
  // Triebwerksdüse: Glocke, die nach dir aufgeht
  function pBell(b, P, pos, dir, L, r0, r1) { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(r0 + (r1 - r0) * Math.pow(t, 1.7), -t * L)); } const fr = pFrame(pos, dir.clone().negate()); pAt(b, new THREE.LatheGeometry(pts, 32), P.nozzle, fr); pAt(b, new THREE.TorusGeometry(r1, r1 * 0.04, 6, 32), P.alu, fr, [0, -L, 0], [Math.PI / 2, 0, 0]); pAt(b, new THREE.CylinderGeometry(r0 * 1.4, r0 * 1.6, L * 0.25, 16), P.dark, fr, [0, L * 0.12, 0]); }
  // Kasten aus Feldern: Vieleck-Prisma entlang Z, jede Seite eine Isolierdecke (mats im Wechsel)
  function pBus(b, P, n, rr, len, z, mats, rot = 0) {
    b.add(new THREE.CylinderGeometry(rr * 0.97, rr * 0.97, len, n), P.dark, [0, 0, z], [Math.PI / 2, rot, 0]);
    const side = 2 * rr * Math.sin(Math.PI / n), ap = rr * Math.cos(Math.PI / n), Zv = new V(0, 0, 1);
    for (let k = 0; k < n; k++) { // Feld: Breite quer, Länge entlang Z, Dicke nach außen
      const a = rot + (k + 0.5) * (2 * Math.PI / n) - Math.PI / 2, rad = new V(Math.cos(a), Math.sin(a), 0), tg = new V(-Math.sin(a), Math.cos(a), 0);
      b.addM(new THREE.BoxGeometry(side * 0.94, len * 0.94, 0.03), mats[k % mats.length], new THREE.Matrix4().makeBasis(tg, Zv, rad).setPosition(rad.x * ap, rad.y * ap, z));
    }
  }
  // Parabolantenne (Öffnung nach +Y): Schale aus Paneelen, Rippen und Ringe auf der Rückseite, Rand, Speisehorn, Fangspiegel auf Streben
  function probeDish(P, R, depth, struts = 4) {
    const b = partBuilder(), fz = (R * R) / (4 * depth), y = (rr) => (rr * rr) / (4 * fz), prof = [];
    for (let i = 0; i <= 16; i++) { const rr = (i / 16) * R; prof.push(new THREE.Vector2(Math.max(0.002, rr), y(rr))); }
    b.add(new THREE.LatheGeometry(prof, 64), P.dishIn);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, pts = []; for (let i = 2; i <= 10; i++) { const rr = (i / 10) * R * 0.98; pts.push(new V(Math.cos(a) * rr, y(rr) - R * 0.03, Math.sin(a) * rr)); } b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, R * 0.012, 5), P.alu); }
    for (const t of [0.5, 0.82]) b.add(new THREE.TorusGeometry(t * R, R * 0.01, 5, 48), P.alu, [0, y(t * R) - R * 0.035, 0], [Math.PI / 2, 0, 0]);
    b.add(new THREE.TorusGeometry(R, R * 0.022, 6, 64), P.white, [0, depth, 0], [Math.PI / 2, 0, 0]);
    b.add(new THREE.CylinderGeometry(R * 0.2, R * 0.26, R * 0.16, 24), P.dark, [0, -R * 0.06, 0]);
    b.add(new THREE.CylinderGeometry(R * 0.05, R * 0.09, R * 0.3, 16), P.alu, [0, R * 0.15, 0]);
    const hy = Math.max(depth * 1.15, fz * 0.8), sr = R * 0.13;
    b.add(new THREE.SphereGeometry(sr, 20, 8, 0, Math.PI * 2, 0, 0.9), P.alu, [0, hy + sr, 0], [Math.PI, 0, 0]);
    for (let k = 0; k < struts; k++) { const a = (k / struts) * Math.PI * 2 + 0.4, rr = R * 0.85; pRod(b, P.alu, new V(Math.cos(a) * rr, y(rr), Math.sin(a) * rr), new V(Math.cos(a) * sr * 0.6, hy + sr * 0.3, Math.sin(a) * sr * 0.6), R * 0.011, 5); }
    return b.group(true);
  }
  // Eintauchkapsel: stumpfer Hitzeschild (45°, verkohlt) nach +Y, Rückschale mit Isolierdecke nach −Y
  function pEntry(b, P, base, R, back = P.gold) {
    const prof = [], rn = R * 0.32; for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 4); prof.push(new THREE.Vector2(Math.max(0.002, Math.sin(a) * rn), R * 0.72 - rn + Math.cos(a) * rn)); }
    const last = prof[prof.length - 1]; for (let i = 1; i <= 6; i++) { const t = i / 6, rr = last.x + (R - last.x) * t; prof.push(new THREE.Vector2(rr, last.y - (rr - last.x))); }
    prof.reverse(); pAt(b, new THREE.LatheGeometry(prof, 48), P.char, base);
    pAt(b, new THREE.TorusGeometry(R, R * 0.04, 8, 48), P.alu, base, [0, prof[0].y, 0], [Math.PI / 2, 0, 0]);
    const bk = [[R * 0.98, prof[0].y], [R * 0.82, prof[0].y - R * 0.3], [R * 0.45, prof[0].y - R * 0.55], [R * 0.2, prof[0].y - R * 0.62], [0.002, prof[0].y - R * 0.63]].map(([a, c]) => new THREE.Vector2(a, c)).reverse();
    pAt(b, new THREE.LatheGeometry(bk, 48), back, base);
    return prof[0].y - R * 0.63;
  }

  // Neptun: „Voyager 2“ (flog 1989 vorbei) – große Schüssel zur Erde (zur Kamera), zehneckiger Körper mit Isolierdecken,
  // Ausleger mit drei Atom-Batterien, Messplattform mit Kameras, langer Magnetfeld-Ausleger, Radioantennen, goldene Schallplatte
  function craftVoyager() {
    const P = probeMats(), g = new THREE.Group(), b = partBuilder();
    pBus(b, P, 10, 0.8, 0.45, 0.35, [P.gold, P.black, P.gold, P.silver, P.gold, P.black]);
    for (const z of [0.12, 0.58]) b.add(new THREE.CylinderGeometry(0.82, 0.82, 0.03, 10), P.alu, [0, 0, z], [Math.PI / 2, 0, 0]);
    b.add(new THREE.SphereGeometry(0.36, 24, 16), P.silver, [0, 0, 0.72]);                            // Treibstofftank
    for (let k = 0; k < 6; k++) b.add(new THREE.BoxGeometry(0.03, 0.34, 0.02), P.alu, [-0.6 + k * 0.05, -0.55, 0.585]);  // Lamellen (Wärme)
    pTruss(b, P.alu, new V(0.72, -0.05, 0.35), new V(2.7, -0.35, 0.45), 0.09, 8);                       // Ausleger der Atom-Batterien
    for (let i = 0; i < 3; i++) pRTG(b, P, new V(1.75 + i * 0.42, -0.2 - i * 0.06, 0.42), new V(1, -0.15, 0.05), 0.38, 0.13);
    pTruss(b, P.alu, new V(-0.72, 0.05, 0.35), new V(-2.4, 0.3, 0.4), 0.09, 8);                         // Ausleger der Messgeräte
    b.add(new THREE.BoxGeometry(0.42, 0.36, 0.4), P.gold, [-2.45, 0.32, 0.4]);                          // Plattform (dreht sich zum Ziel)
    b.add(new THREE.CylinderGeometry(0.075, 0.075, 0.62, 18), P.white, [-2.5, 0.62, 0.62], [Math.PI / 2, 0, 0]); // Teleobjektiv
    b.add(new THREE.CircleGeometry(0.065, 18), P.lens, [-2.5, 0.62, 0.935]);
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16), P.white, [-2.28, 0.6, 0.5], [Math.PI / 2, 0, 0]);       // Weitwinkel
    b.add(new THREE.CircleGeometry(0.05, 16), P.lens, [-2.28, 0.6, 0.655]);
    b.add(new THREE.CylinderGeometry(0.12, 0.14, 0.24, 20), P.black, [-2.7, 0.35, 0.45], [0, 0, Math.PI / 2]);     // Infrarot-Spektrometer
    b.add(new THREE.BoxGeometry(0.24, 0.18, 0.2), P.silver, [-1.5, 0.35, 0.4]);                         // Teilchen-Messer
    for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.05, 0.12, 12), P.alu, [-1.5 + (k - 1) * 0.08, 0.5, 0.4]);
    pTruss(b, P.alu, new V(-0.25, 0.75, 0.45), new V(-1.6, 4.2, 1.2), 0.05, 14);                       // Magnetfeld-Ausleger
    for (const t of [0.55, 1]) b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), P.white, [-0.25 + (-1.35) * t, 0.75 + 3.45 * t, 0.45 + 0.75 * t]);
    pRod(b, P.steel, new V(0.3, -0.75, 0.45), new V(2.4, -3.3, 0.7), 0.01); pRod(b, P.steel, new V(-0.3, -0.75, 0.45), new V(-2.2, -3.4, 0.75), 0.01); // Radioantennen
    { const a = (72 * Math.PI) / 180, ap = 0.8 * Math.cos(Math.PI / 10) + 0.03; pAt(b, new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32), P.record, pFrame(new V(Math.cos(a) * ap, Math.sin(a) * ap, 0.35), new V(Math.cos(a), Math.sin(a), 0))); } // goldene Schallplatte an der Seite
    g.add(b.group(true));
    const dish = probeDish(P, 1.5, 0.42, 3); dish.rotation.x = -Math.PI / 2; dish.position.z = 0.08; g.add(dish); // Öffnung nach hinten zur Erde
    craftDetail(g, P, [[0, -0.85, 0.35], [0.6, 0.6, 0.6]], [[2.75, -0.35, 0.45, 0xff3b30], [-2.75, 0.3, 0.4, 0x22c55e]]);
    return g;
  }
  // Saturn: „Cassini“ – vorn die große Schüssel, dahinter der zwölfeckige Elektronik-Ring, der goldene Treibstofftank,
  // hinten zwei Haupttriebwerke und drei Atom-Batterien; an der Seite die Landekapsel „Huygens“, oben der Magnetfeld-Ausleger
  function craftCassini() {
    const P = probeMats(), g = new THREE.Group(), b = partBuilder();
    pBus(b, P, 12, 0.78, 0.45, 0.55, [P.black, P.gold, P.black, P.silver]);
    b.add(new THREE.CylinderGeometry(0.6, 0.62, 0.26, 24), P.silver, [0, 0, 0.2], [Math.PI / 2, 0, 0]);   // oberes Gerätemodul
    b.add(new THREE.CylinderGeometry(0.64, 0.64, 1.35, 32), P.gold, [0, 0, -0.62], [Math.PI / 2, 0, 0]);  // Treibstofftank
    for (const z of [-0.1, -1.3]) b.add(new THREE.TorusGeometry(0.645, 0.02, 6, 40), P.alu, [0, 0, z]);
    b.add(new THREE.CylinderGeometry(0.58, 0.52, 0.32, 24), P.black, [0, 0, -1.46], [Math.PI / 2, 0, 0]); // unteres Gerätemodul
    for (const x of [-0.24, 0.24]) pBell(b, P, new V(x, 0, -1.62), new V(0, 0, -1), 0.55, 0.08, 0.24);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 2, d = new V(Math.cos(a), Math.sin(a), -0.55).normalize(); pRTG(b, P, new V(Math.cos(a) * 0.82, Math.sin(a) * 0.82, -1.6), d, 0.85, 0.15); pRod(b, P.alu, new V(Math.cos(a) * 0.5, Math.sin(a) * 0.5, -1.4), new V(Math.cos(a) * 0.8, Math.sin(a) * 0.8, -1.55), 0.025); }
    const hu = pFrame(new V(0.72, 0.15, -0.35), new V(1, 0, 0)); pEntry(b, P, hu, 0.62, P.copper);    // Huygens
    b.add(new THREE.BoxGeometry(0.4, 0.3, 0.45), P.gold, [-0.78, 0, 0.25]);                             // Kamera-Plattform
    for (const [y, z, rr, L] of [[0.08, 0.36, 0.07, 0.4], [-0.08, 0.36, 0.05, 0.3], [0.08, 0.12, 0.06, 0.3], [-0.08, 0.12, 0.08, 0.35]]) { b.add(new THREE.CylinderGeometry(rr, rr, L, 16), P.white, [-1.0 - L / 2 + 0.1, y, z], [0, 0, Math.PI / 2]); b.add(new THREE.CircleGeometry(rr * 0.85, 16), P.lens, [-1.0 - L + 0.095, y, z], [0, -Math.PI / 2, 0]); }
    b.add(new THREE.BoxGeometry(0.34, 0.24, 0.3), P.silver, [0, 0.82, 0.3]);                            // Teilchen-Plattform
    pTruss(b, P.alu, new V(-0.15, 0.9, 0.3), new V(-0.7, 3.9, 0.9), 0.05, 12);                          // Magnetfeld-Ausleger
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12), P.white, [-0.7, 3.95, 0.9]);
    for (const a of [0.4, 2.6, 4.4]) pRod(b, P.steel, new V(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.0), new V(Math.cos(a) * 2.4, Math.sin(a) * 2.4, -0.3), 0.01); // Radio- und Plasmawellen-Antennen
    g.add(b.group(true));
    const dish = probeDish(P, 1.65, 0.42, 4); dish.rotation.x = Math.PI / 2; dish.position.z = 0.82; g.add(dish); // Schüssel nach vorn
    craftDetail(g, P, [[0.55, -0.55, -1.2], [-0.55, -0.55, -1.2]], [[1.7, 0, 0.9, 0xff3b30], [-1.7, 0, 0.9, 0x22c55e]]);
    return g;
  }
  // Uranus: geplante NASA-Sonde „Uranus Orbiter and Probe“ – sechseckiger Körper, oben die Schüssel (schräg nach hinten),
  // vorn die Eintauchkapsel für die Atmosphäre, hinten Haupttriebwerk und zwei Atom-Batterien, seitlich der Magnetfeld-Ausleger
  function craftUranusOrbiter() {
    const P = probeMats(), g = new THREE.Group(), b = partBuilder();
    pBus(b, P, 6, 0.78, 1.15, 0, [P.gold, P.silver, P.gold, P.black, P.gold, P.silver], Math.PI / 6);
    b.add(new THREE.CylinderGeometry(0.42, 0.5, 0.18, 24), P.alu, [0, 0, 0.66], [Math.PI / 2, 0, 0]);   // Adapter für die Kapsel
    pEntry(b, P, pFrame(new V(0, 0, 0.78), new V(0, 0, 1)), 0.6, P.gold);                             // Eintauchkapsel
    pBell(b, P, new V(0, 0, -0.58), new V(0, 0, -1), 0.5, 0.09, 0.27);                                  // Haupttriebwerk
    for (const sx of [-1, 1]) { const d = new V(sx * 0.6, -0.3, -0.75).normalize(); pRTG(b, P, new V(sx * 0.95, -0.35, -0.8), d, 0.75, 0.17); pRod(b, P.alu, new V(sx * 0.6, -0.2, -0.5), new V(sx * 0.85, -0.3, -0.7), 0.03); }
    pTruss(b, P.alu, new V(-0.7, 0.2, 0.1), new V(-3.0, 0.5, 0.3), 0.06, 12);                           // Magnetfeld-Ausleger
    for (const t of [0.55, 1]) b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), P.white, [-0.7 - 2.3 * t, 0.2 + 0.3 * t, 0.1 + 0.2 * t], [0, 0, Math.PI / 2]);
    for (const x of [0.3, 0.45]) { b.add(new THREE.BoxGeometry(0.1, 0.1, 0.14), P.dark, [x, 0.72, -0.3]); b.add(new THREE.CylinderGeometry(0.06, 0.04, 0.16, 12), P.black, [x, 0.72, -0.43], [Math.PI / 2, 0, 0]); } // Sternkameras
    g.add(b.group(true));
    const dish = probeDish(P, 1.15, 0.3, 3); dish.position.set(0, 0.76, -0.05); dish.quaternion.setFromUnitVectors(new V(0, 1, 0), new V(0, 0.75, -0.66).normalize()); g.add(dish);
    craftDetail(g, P, [[0.72, -0.5, 0.45], [-0.72, -0.5, 0.45]], [[1.2, 0, 0.2, 0xff3b30], [-3.05, 0.5, 0.3, 0x22c55e]]);
    return g;
  }
  // Sonne: „Parker Solar Probe“ – vorn der Hitzeschild (weiße Vorderseite, Kohlenstoff), dahinter im Schatten der Körper,
  // vier Kühler, zwei schräge Solarflügel mit Kühlrohren, vier Antennen, die über den Schild hinausragen, der Faraday-Becher, hinten der Magnetfeld-Ausleger
  function craftParker() {
    const P = probeMats(), g = new THREE.Group(), b = partBuilder(), Z = 1.1, RS = 1.3;
    b.add(new THREE.CylinderGeometry(RS, RS, 0.13, 6, 1, true), P.comp, [0, 0, Z], [Math.PI / 2, 0, 0]);
    b.add(new THREE.CircleGeometry(RS, 6, -Math.PI / 2), P.std({ color: srgb(0xf6f4ee), roughness: 0.75 }), [0, 0, Z + 0.065]);
    b.add(new THREE.CircleGeometry(RS, 6, -Math.PI / 2), P.comp, [0, 0, Z - 0.065], [0, Math.PI, 0]);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; pRod(b, P.alu, new V(Math.cos(a) * 0.75, Math.sin(a) * 0.75, Z - 0.07), new V(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.78), 0.022); } // Stützen
    pBus(b, P, 6, 0.55, 0.85, 0.35, [P.silver, P.black, P.silver, P.black, P.silver, P.black]);
    for (const x of [-0.33, -0.11, 0.11, 0.33]) { b.add(new THREE.BoxGeometry(0.035, 0.42, 0.55), P.white, [x, 0.84, 0.38]); b.add(new THREE.BoxGeometry(0.04, 0.03, 0.57), P.dark, [x, 0.64, 0.38]); } // Kühler im Schatten
    for (const sx of [-1, 1]) {
      pRod(b, P.alu, new V(sx * 0.5, 0, 0.45), new V(sx * 0.95, 0, 0.5), 0.03);
      const fr = new THREE.Matrix4().compose(new V(sx * 1.32, 0, 0.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.95, 0, sx * 0.3)), new V(1, 1, 1));
      pAt(b, new THREE.BoxGeometry(0.78, 0.035, 0.5), P.alu, fr); pAt(b, new THREE.PlaneGeometry(0.72, 0.44), P.cell, fr, [0, 0.019, 0], [-Math.PI / 2, 0, 0]);
      for (const zz of [-0.24, 0.24]) pAt(b, new THREE.CylinderGeometry(0.014, 0.014, 0.8, 8), P.steel, fr, [0, 0.03, zz], [0, 0, Math.PI / 2]); // Kühlrohre
    }
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; pRod(b, P.dark, new V(Math.cos(a) * 0.9, Math.sin(a) * 0.9, Z - 0.12), new V(Math.cos(a) * 2.2, Math.sin(a) * 2.2, Z + 0.3), 0.013); } // Antennen
    { const a = 1.05, p0 = new V(Math.cos(a) * 0.6, Math.sin(a) * 0.6, Z - 0.1), p1 = new V(Math.cos(a) * 1.4, Math.sin(a) * 1.4, Z - 0.05); pRod(b, P.alu, p0, p1, 0.02); b.add(new THREE.CylinderGeometry(0.09, 0.07, 0.24, 18), P.alu, [p1.x, p1.y, Z + 0.12], [Math.PI / 2, 0, 0]); } // Faraday-Becher
    pTruss(b, P.alu, new V(0, 0, -0.1), new V(0, 0.15, -2.3), 0.05, 12);                                // Magnetfeld-Ausleger
    for (const t of [0.45, 0.75, 1]) b.add(new THREE.BoxGeometry(0.1, 0.1, 0.1), P.white, [0, 0.15 * t, -0.1 - 2.2 * t]);
    b.add(new THREE.BoxGeometry(0.16, 0.16, 0.16), P.black, [0.56, 0.25, 0.7]); b.add(new THREE.CircleGeometry(0.05, 16), P.lens, [0.645, 0.25, 0.7], [0, Math.PI / 2, 0]); // Kamera WISPR
    g.add(b.group(true));
    const dish = probeDish(P, 0.3, 0.08, 3); dish.position.set(0.25, -0.35, -0.12); dish.rotation.x = -Math.PI / 2; g.add(dish);
    craftDetail(g, P, [[0.5, -0.45, 0.1], [-0.5, -0.45, 0.1]], [[1.35, 0, 0.9, 0xff3b30], [-1.35, 0, 0.9, 0x22c55e]]);
    return g;
  }
  // Jupiter: Eintauchkapsel wie bei „Galileo“ (1995) – vorn der verkohlte Hitzeschild, hinten die Rückschale mit Isolierdecke,
  // Mörser für den Fallschirm; dahinter ein Bandfallschirm mit Bahnen, Schlitzen, Öffnung oben und Fangleinen
  function craftGalileo() {
    const P = probeMats(), g = new THREE.Group(), b = partBuilder();
    const back = pEntry(b, P, pFrame(new V(0, 0, 0.15), new V(0, 0, 1)), 0.95, P.gold);
    b.add(new THREE.CylinderGeometry(0.13, 0.15, 0.32, 20), P.dark, [0, 0, 0.15 + back - 0.12], [Math.PI / 2, 0, 0]); // Mörser
    pRod(b, P.steel, new V(0.35, 0.25, -0.3), new V(0.5, 0.42, -0.62), 0.012);                         // Antenne
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; b.add(new THREE.BoxGeometry(0.1, 0.06, 0.08), P.alu, [Math.cos(a) * 0.62, Math.sin(a) * 0.62, -0.08]); } // Halterungen der Hülle
    g.add(b.group(true));
    // Fallschirm: Kappe mit 16 Bahnen (orange/weiß), Schlitzen zwischen den Bändern, Öffnung oben; Fangleinen zum Zusammenführungspunkt
    const tex = canvasTex(512, 256, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? "#f97316" : "#f8fafc"; c.fillRect(i * 32, 0, 32, 256); } c.globalCompositeOperation = "destination-out"; for (let y = 52; y < 250; y += 40) c.fillRect(0, y, 512, 7); for (let i = 0; i <= 16; i++) c.fillRect(i * 32 - 1, 0, 2, 256); });
    const chute = new THREE.Group(), cb = partBuilder(), RC = 2.2, T0 = 0.12, TL = Math.PI / 2.4;
    cb.add(new THREE.SphereGeometry(RC, 48, 12, 0, Math.PI * 2, T0, TL - T0), P.std({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }));
    const rimR = RC * Math.sin(TL), rimY = RC * Math.cos(TL), conf = new V(0, -1.4, 0);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; pRod(cb, P.steel, new V(Math.cos(a) * rimR, rimY, Math.sin(a) * rimR), conf, 0.006, 3); }
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; pRod(cb, P.steel, new V(Math.cos(a) * RC * Math.sin(T0), RC * Math.cos(T0), Math.sin(a) * RC * Math.sin(T0)), new V(Math.cos(a) * rimR, rimY, Math.sin(a) * rimR), 0.005, 3); } // Nähte
    chute.add(cb.group(false)); chute.position.set(0, 4.6, -2.2); chute.rotation.x = -0.5; g.add(chute);
    chute.updateMatrixWorld(true); const att = chute.worldToLocal(new V(0, 0, 0.15 + back - 0.27)), rb = partBuilder();
    pRod(rb, P.steel, conf, att, 0.012, 5); chute.add(rb.group(false));                                   // Hauptleine zum Mörser
    g.userData.chute = chute;
    craftDetail(g, P, [[0.7, 0, -0.1], [-0.7, 0, -0.1]], [[0.92, 0, 0.1, 0xff3b30], [-0.92, 0, 0.1, 0x22c55e]]);
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
  // Jupiter: Wolkendecken über und unter der Kapsel, die dunkler werden, je tiefer man kommt – dazu Blitze mit Donner,
  // Wolkenfetzen, die der Wind vorbeitreibt, und vorn in den Wolken der Große Rote Fleck (Foto-Ziel)
  function sceneryJupiter(scene, far, planet, tg) {
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
    // Großer Roter Fleck: ein Wirbel aus roten, orangen und hellen Bändern, der sich langsam dreht
    const swirl = canvasTex(512, 512, (c) => {
      const m = 256, gr = c.createRadialGradient(m, m, 10, m, m, m); gr.addColorStop(0, "rgba(150,40,20,1)"); gr.addColorStop(0.45, "rgba(196,78,40,1)"); gr.addColorStop(0.75, "rgba(232,160,110,0.85)"); gr.addColorStop(1, "rgba(240,210,170,0)");
      c.fillStyle = gr; c.fillRect(0, 0, 512, 512);
      c.lineCap = "round"; for (let k = 0; k < 26; k++) { const a0 = hash2(k, 1) * 6.3, r0 = 30 + hash2(k, 2) * 200; c.strokeStyle = hash2(k, 3) > 0.5 ? "rgba(255,225,190,0.45)" : "rgba(110,25,10,0.4)"; c.lineWidth = 4 + hash2(k, 4) * 10; c.beginPath(); for (let i = 0; i <= 30; i++) { const a = a0 + i * 0.09, rr = r0 * (1 - i * 0.012); const px = m + Math.cos(a) * rr, py = m + Math.sin(a) * rr * 0.62; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
    });
    const spot = new THREE.Mesh(new THREE.CircleGeometry(36, 72), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, depthWrite: false }));
    spot.rotation.x = -Math.PI / 2; spot.userData.z = -1e9; scene.add(spot); tg.fleck = spot;
    // Wolkenfetzen, die der Wind quer vorbeitreibt
    const wispMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,240,220,0.75)", "rgba(220,170,120,0.25)"), transparent: true, depthWrite: false });
    const wisps = []; for (let i = 0; i < 7; i++) { const sp = new THREE.Sprite(wispMat); sp.userData.z = -1e9; scene.add(sp); wisps.push(sp); }
    let thunderAt = 1e9, lastFlash = 0;
    return (dt, p, t, w, wind) => {
      decks.forEach((d) => { d.position.set(p.x, p.y + d.userData.y, p.z); d.material.map.offset.set(p.x / 225, -p.z / 225); d.material.color.copy(tone.copy(top).lerp(deep, p.f)); });
      if (w.flash > 0.9 && boltMat.opacity < 0.1) bolt.position.set(p.x + (Math.random() - 0.5) * 60, p.y - 2, p.z + 60 + Math.random() * 60);
      boltMat.opacity = Math.max(0, w.flash || 0);
      if ((w.flash || 0) > 0.95 && t - lastFlash > 1) { lastFlash = t; thunderAt = t + 0.4 + Math.random() * 0.9; } // erst der Blitz, dann der Donner
      if (t > thunderAt) { thunderAt = 1e9; Sound.thunder(0.7); }
      if (spot.userData.z < p.z + 22) { spot.userData.z = p.z + 240 + Math.random() * 40; spot.position.x = (Math.random() - 0.5) * 24; }
      spot.position.set(spot.position.x, p.y - 11.4, spot.userData.z); spot.rotation.z += dt * 0.12;
      for (const sp of wisps) {
        if (sp.userData.z < p.z - 10 || Math.abs(sp.position.x - p.x) > 70) { sp.userData.z = p.z + 40 + Math.random() * 140; sp.position.set(p.x + (Math.random() > 0.5 ? -45 : 45), p.y + (Math.random() - 0.5) * 18, sp.userData.z); sp.scale.set(26 + Math.random() * 24, 7 + Math.random() * 6, 1); }
        sp.position.x += (wind * 5 + (wind >= 0 ? 7 : -7)) * dt;
      }
    };
  }
  // Saturn: der Mond Enceladus mit Eis-Fontänen am Südpol (Cassini ist 2015 mitten hindurchgeflogen), ein kleiner Mond,
  // der vorbeizieht, und am Nordpol der sechseckige Sturm (Foto-Ziel)
  function scenerySaturn(scene, far, planet, tg, C) {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(26, 32, 20), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 }));
    moon.position.set(150, 40, 520); far.add(moon);
    const plumeMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,255,0.9)", "rgba(190,220,255,0.35)"), transparent: true, depthWrite: false, fog: false });
    const plumes = [];
    for (let i = 0; i < 5; i++) { const sp = new THREE.Sprite(plumeMat); sp.scale.set(10, 38, 1); sp.position.set(150 + (i - 2) * 6, 40 - 40 - i * 3, 520); far.add(sp); plumes.push(sp); }
    const pan = new THREE.Mesh(sphereUV(naturalRockGeo(160, 3)), new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.9, vertexColors: true, ...rockTex(2, 1, 1.2) }));
    pan.scale.setScalar(7); far.add(pan);
    // Sechseck: helles Randband, dunklere Fläche, in der Mitte das Auge des Sturms
    const hex = new THREE.Group(), path = new THREE.CurvePath(), hp = []; for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI * 2; hp.push(new V(Math.cos(a), Math.sin(a), 0)); }
    for (let k = 0; k < 6; k++) path.add(new THREE.LineCurve3(hp[k], hp[k + 1]));
    hex.add(new THREE.Mesh(new THREE.TubeGeometry(path, 60, 0.05, 6, true), new THREE.MeshBasicMaterial({ color: 0xeaf2ff, transparent: true, opacity: 0.9 })));
    hex.add(new THREE.Mesh(new THREE.CircleGeometry(0.97, 6), new THREE.MeshBasicMaterial({ color: 0x6b7f99, transparent: true, opacity: 0.55, depthWrite: false })));
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshBasicMaterial({ color: 0x2f3f57 })); eye.position.z = 0.01; hex.add(eye);
    hex.scale.setScalar(C.planet.r * 0.22); far.add(hex); tg.sechseck = hex;
    const sph = planetSphere(planet), q = new THREE.Quaternion(), pole = new V(), toCam = new V(), Z = new V(0, 0, 1);
    return (dt, p, t) => {
      plumes.forEach((sp, i) => { sp.scale.y = 34 + Math.sin(t * 1.5 + i) * 6; });
      const a = t * 0.04; pan.position.set(-120 + Math.cos(a) * 60, -40 + Math.sin(a * 0.7) * 15, 380); pan.rotation.y += dt * 0.2;
      sph.getWorldQuaternion(q); toCam.copy(planet.position).negate().normalize(); // der echte Pol läge hinter dem Rand – das Sechseck rückt auf die sichtbare Seite Richtung Nordpol
      pole.set(0, 1, 0).applyQuaternion(q).addScaledVector(toCam, 1.7).normalize();
      hex.position.copy(planet.position).addScaledVector(pole, C.planet.r * 0.995); hex.quaternion.setFromUnitVectors(Z, pole); hex.rotateZ(t * 0.02);
    };
  }
  // Uranus: der kleine Mond Miranda mit seiner riesigen Klippe (20 Kilometer hoch – die höchste bekannte Steilwand),
  // der Mond Ariel kreist sichtbar, am Pol flackert ein Polarlicht; Foto-Ziel ist der gekippte Planet selbst
  function sceneryUranus(scene, far, planet, tg, C) {
    const tex = canvasTex(256, 128, (c) => {
      c.fillStyle = "#9ca3af"; c.fillRect(0, 0, 256, 128);
      c.strokeStyle = "rgba(60,60,70,0.6)"; c.lineWidth = 6;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(90 + i * 8, 20); c.lineTo(120 + i * 8, 64); c.lineTo(90 + i * 8, 108); c.stroke(); } // Winkel-Muster
      c.fillStyle = "rgba(230,230,235,0.5)"; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(hash2(i, 1) * 256, hash2(i, 2) * 128, 2 + hash2(i, 3) * 5, 0, 7); c.fill(); }
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(22, 32, 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    moon.position.set(-170, 60, 560); far.add(moon);
    const ariel = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), new THREE.MeshStandardMaterial({ color: 0xb8c4cc, roughness: 0.85 })); far.add(ariel);
    const aur = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(170,255,230,0.9)", "rgba(80,200,255,0.25)"), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    aur.scale.setScalar(C.planet.r * 0.8); far.add(aur);
    tg.gekippt = planet;
    const sph = planetSphere(planet), q = new THREE.Quaternion(), pole = new V(), u = new V(), v = new V();
    return (dt, p, t) => {
      moon.rotation.y += dt * 0.05;
      sph.getWorldQuaternion(q); pole.set(0, 1, 0).applyQuaternion(q); u.set(1, 0, 0).applyQuaternion(q); v.crossVectors(pole, u);
      const a = t * 0.12, R = C.planet.r * 1.7; ariel.position.copy(planet.position).addScaledVector(u, Math.cos(a) * R).addScaledVector(v, Math.sin(a) * R);
      aur.position.copy(planet.position).addScaledVector(pole, C.planet.r * 0.95); aur.material.opacity = 0.35 + 0.3 * Math.sin(t * 2.3) * Math.sin(t * 0.9);
    };
  }
  // Neptun: helle Wolkenstreifen, die der Sturm quer vorbeijagt, der Mond Triton mit dunklen Geysiren, der Große Dunkle Fleck,
  // der über die Scheibe wandert – und ganz weit weg die Sonne als heller Stern (Foto-Ziele: die Sonne und der Neptun selbst)
  function sceneryNeptun(scene, far, planet, tg, C) {
    const mat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,255,0.95)", "rgba(200,220,255,0.3)"), transparent: true, depthWrite: false });
    const streaks = [];
    for (let i = 0; i < 16; i++) { const sp = new THREE.Sprite(mat); sp.userData.z = -1e9; scene.add(sp); streaks.push(sp); }
    const triton = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 20), new THREE.MeshStandardMaterial({ color: 0xe8d8d0, roughness: 0.8 }));
    triton.position.set(190, 70, 600); far.add(triton);
    const gMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(40,30,30,0.8)", "rgba(40,30,30,0)"), transparent: true, depthWrite: false, fog: false });
    for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(gMat); sp.scale.set(3, 22, 1); sp.position.set(182 + i * 7, 90, 590); far.add(sp); }
    const sunStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,245,1)", "rgba(255,225,150,0.45)"), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    sunStar.scale.setScalar(64); sunStar.position.set(260, 150, 2300); far.add(sunStar); tg.weit = sunStar; // links oben, weit weg vom Neptun (sonst verdeckt er sie)
    const dark = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x0b1f4d, transparent: true, opacity: 0.7, depthWrite: false })); dark.scale.set(C.planet.r * 0.2, C.planet.r * 0.12, 1); far.add(dark);
    tg.rechnen = planet;
    const dd = new V(), Z = new V(0, 0, 1);
    return (dt, p, t, w, wind) => {
      for (const sp of streaks) {
        if (sp.userData.z < p.z - 14 || Math.abs(sp.position.x - p.x) > 90) { sp.userData.z = p.z + 30 + Math.random() * 160; sp.position.set(p.x + (Math.random() > 0.5 ? -70 : 70), p.y + (Math.random() - 0.5) * 30, sp.userData.z); sp.scale.set(14 + Math.random() * 14, 1.2, 1); }
        sp.position.x += (wind * 6 + (wind >= 0 ? 12 : -12)) * dt;
      }
      const a = 0.45 + Math.sin(t * 0.05) * 0.25; dd.set(Math.sin(a), -0.25, -Math.cos(a)).normalize(); // wandert langsam über die Seite, die zur Sonde schaut
      dark.position.copy(planet.position).addScaledVector(dd, C.planet.r * 1.004); dark.quaternion.setFromUnitVectors(Z, dd);
      sunStar.material.rotation += dt * 0.1;
    };
  }
  // Sonne: glühende Bögen aus Gas (Protuberanzen), unter denen man hindurchfliegt, Eruptionen auf der Oberfläche
  // und eine Gruppe Sonnenflecken (Foto-Ziel)
  function scenerySonne(scene, far, planet, tg, C) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    const loops = [];
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(26, 1.4, 8, 40, Math.PI), mat); m.userData.z = -1e9; scene.add(m); loops.push(m); }
    const spotTex = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(25,8,2,1)"); gr.addColorStop(0.42, "rgba(45,14,4,0.97)"); gr.addColorStop(0.6, "rgba(130,48,10,0.8)"); gr.addColorStop(1, "rgba(170,70,10,0)"); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
    const spotMat = new THREE.MeshBasicMaterial({ map: spotTex, transparent: true, depthWrite: false, fog: false, toneMapped: false }), spots = new THREE.Group();
    [[0, 0, 36], [44, 14, 24], [-30, 22, 17], [20, -28, 13], [-12, -18, 9]].forEach(([x, y, sz]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(sz * 2, sz * 2), spotMat); m.position.set(x, y, 0); spots.add(m); });
    far.add(spots); tg.flecken = spots;
    const dir = new V(-0.24, 0.2, -1).normalize(), rad = C.planet.r * 1.003, Z = new V(0, 0, 1), Y = new V(0, 1, 0);
    const flares = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 8, 40, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffc061, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false })); m.userData = { t: 9, d: new V() }; far.add(m); return m; });
    let nextFlare = 2;
    return (dt, p, t) => {
      for (const m of loops) {
        if (m.userData.z < p.z - 20) { m.userData.z = p.z + 120 + Math.random() * 200; m.position.set((Math.random() - 0.5) * 20, -18, m.userData.z); m.rotation.y = (Math.random() - 0.5) * 0.8; }
        m.scale.y = 1 + 0.08 * Math.sin(t * 2 + m.userData.z);
      }
      mat.opacity = 0.45 + 0.15 * Math.sin(t * 3);
      spots.position.copy(planet.position).addScaledVector(dir, rad); spots.quaternion.setFromUnitVectors(Z, dir);
      if (t > nextFlare) { // Eruption: ein Gasbogen steigt aus der Oberfläche auf und verglüht wieder
        const m = flares.find((x) => x.userData.t >= 3);
        if (m) { m.userData.t = 0; m.userData.d.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.3) * 0.7, -1).normalize(); Sound.thunder(0.2); }
        nextFlare = t + 3 + Math.random() * 4;
      }
      for (const m of flares) {
        const u = m.userData; if (u.t >= 3) { m.visible = false; continue; }
        u.t += dt; const k = u.t / 3; m.visible = true;
        m.position.copy(planet.position).addScaledVector(u.d, rad); m.quaternion.setFromUnitVectors(Y, u.d); m.rotateY(u.d.x * 3);
        m.scale.setScalar(30 + 170 * k); m.material.opacity = Math.sin(Math.PI * Math.min(1, k)) * 0.75;
      }
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
      tasks: [{ kind: "collect", n: 11, icon: "🌍" }, { kind: "photo", target: "fleck" }, { kind: "hold", color: 0xffb070, r: 3.4, dur: 4.5, amp: [6, 3], speed: 0.4 }],
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
      tasks: [{ kind: "collect", n: 10, glow: "rgba(200,230,255,0.95)" }, { kind: "gap" }, { kind: "photo", target: "sechseck" }],
      instr: (f) => ["🛰️", `${fmtInt(lerp(180000, 75000, f) / 1000) } Tsd. km bis Saturn`],
      update() {}
    },
    uranus: {
      sky: [0x04070d, 0x04070d], fog: [[600, 4000], [600, 4000]], stars: true, shield: false, craft: craftUranusOrbiter, scenery: sceneryUranus,
      planet: { r: 300, from: [400, 30, 950], to: [330, 30, 640] },
      puff: { inner: "rgba(210,250,255,1)", outer: "rgba(150,225,235,0.7)", size: [0.4, 1.4], opacity: 0.55, from: 0 },
      wind: (t) => 2 * Math.sin(t * 0.5),
      tasks: [{ kind: "photo", target: "gekippt" }, { kind: "collect", n: 8, glow: "rgba(150,240,255,0.95)" }, { kind: "hold", color: 0x7dd3fc, r: 3.2, dur: 4, amp: [7, 3.5], speed: 0.42 }],
      instr: (f) => ["🌡️", `−${Math.round(lerp(180, 224, f))} °C`],
      update(w, p, f, dt) { w.planet.rotation.x += dt * 0.02; }
    },
    neptun: {
      sky: [0x030614, 0x061233], fog: [[500, 3500], [90, 900]], stars: true, shield: false, craft: craftVoyager, scenery: sceneryNeptun,
      planet: { r: 300, from: [-380, -50, 900], to: [-300, -80, 560] },
      puff: { inner: "rgba(235,245,255,1)", outer: "rgba(120,160,255,0.75)", size: [1.5, 6], opacity: 0.5, from: 0 },
      wind: (t, f) => (9 * Math.sin(t * 0.5) + 5 * Math.sin(t * 1.3 + 1)) * (0.4 + 0.6 * f),
      tasks: [{ kind: "hold", color: 0x93c5fd, r: 3.6, dur: 4.5, amp: [2, 1], speed: 0.3 }, { kind: "photo", target: "weit" }, { kind: "photo", target: "rechnen" }],
      instr: (f) => ["💨", `Wind: ${fmtInt(Math.round(lerp(400, 2100, f) / 50) * 50)} km/h`],
      update() {}
    },
    sonne: {
      sky: [0x120600, 0x2b0d00], fog: [[900, 5000], [900, 5000]], stars: false, shield: true, craft: craftParker, scenery: scenerySonne,
      planet: { r: 760, from: [0, -60, 1700], to: [0, -60, 1080] },
      puff: { inner: "rgba(255,240,180,1)", outer: "rgba(255,140,30,0.8)", size: [0.3, 1.0], opacity: 0.9, from: 0 },
      rocks: { count: 12, size: [1.2, 2.4], glow: true },
      tasks: [{ kind: "hold", color: 0xffd27a, r: 3.4, dur: 4, amp: [6, 3], speed: 0.45 }, { kind: "collect", n: 8, glow: "rgba(120,235,255,0.95)" }, { kind: "photo", target: "flecken" }],
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
    const tg = {}, extra = C.scenery ? C.scenery(scene, far, planet, tg, C) : null; // tg: Foto-Ziele, die der Hintergrund anlegt
    const collectDef = C.tasks.find((d) => d.kind === "collect");
    const sparks = collectDef ? makeSparks(scene, collectDef) : [], zone = C.tasks.some((d) => d.kind === "hold") ? makeZone(scene) : null;
    const gap = C.tasks.some((d) => d.kind === "gap") ? makeGapWall(scene) : null, jets = makeJets(scene);

    // Teilchen, die vorbeiziehen (Wolkenfetzen, Eiskristalle, Funken)
    const puffMat = new THREE.SpriteMaterial({ map: glowTexture(C.puff.inner, C.puff.outer), transparent: true, opacity: C.puff.opacity, depthWrite: false });
    const puffs = [];
    for (let i = 0; i < (W.fast ? 50 : 90); i++) { const s = new THREE.Sprite(puffMat); s.userData.z = -1e9; scene.add(s); puffs.push(s); }
    // Hindernisse: Eisbrocken (Saturn) oder Glutbälle (Sonne)
    const rocks = [], iceGeos = C.rocks && !C.rocks.glow ? [0, 1, 2, 3].map((k) => sphereUV(naturalRockGeo(120 + k, 3))) : null;
    const iceMat = iceGeos ? new THREE.MeshStandardMaterial({ color: C.rocks.color, roughness: 0.35, metalness: 0.05, vertexColors: true, ...rockTex(2, 1, 1.1) }) : null;
    let lavaMat = null, haloMat = null;
    if (C.rocks && C.rocks.glow) { // Glutball: dunkle Kruste mit glühenden Rissen (leuchtet von selbst), dazu ein roter Hitzeschein
      const tex = canvasTex(256, 128, (c) => { c.fillStyle = "#2a0802"; c.fillRect(0, 0, 256, 128); c.lineCap = "round"; for (let i = 0; i < 70; i++) { let x = hash2(i, 1) * 256, y = hash2(i, 2) * 128, a = hash2(i, 3) * 6.3; c.strokeStyle = hash2(i, 4) > 0.6 ? "#ffd060" : "#ff5a10"; c.lineWidth = 1.5 + hash2(i, 5) * 3; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { a += (hash2(i * 5 + k, 6) - 0.5) * 1.6; x += Math.cos(a) * 9; y += Math.sin(a) * 9; c.lineTo(x, y); } c.stroke(); } });
      lavaMat = new THREE.MeshStandardMaterial({ color: srgb(0x3a0c04), roughness: 0.85, emissive: srgb(0xffffff), emissiveMap: tex, emissiveIntensity: 1.5 });
      haloMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,90,20,0.75)", "rgba(160,20,0,0)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    }
    if (C.rocks) for (let i = 0; i < C.rocks.count; i++) {
      let m;
      if (C.rocks.glow) { m = new THREE.Group(); m.add(new THREE.Mesh(sphereUV(naturalRockGeo(170 + (i % 4), 3)), lavaMat)); const h = new THREE.Sprite(haloMat); h.scale.setScalar(3.4); m.add(h); }
      else m = new THREE.Mesh(iceGeos[i % 4], iceMat);
      m.userData = { z: -1e9, r: 1 }; scene.add(m); rocks.push(m);
    }
    return { scene, camera, ambient, sun, far, planet, craft, tg, sparks, zone, gap, jets, puffs, rocks, extra, stations: {} };
  }

  // ---------- Ablauf der Aufgaben: immer die erste noch nicht entdeckte; Anzeige oben (#chalHud), beim Foto der Sucher ----------
  function taskVisualsOff() {
    const w = world; finderShow(false); Sound.loop("measure", 0);
    for (const sp of w.sparks) sp.visible = false;
    if (w.zone) w.zone.visible = false;
    if (w.gap) w.gap.show(false);
  }
  function probeTaskStart() {
    const w = world, p = probe, C = PROBES[bodyId], found = foundMap(), i = cfg.discoveries.findIndex((d) => !found[d.key]);
    taskVisualsOff();
    if (i < 0) { p.task = null; p.taskWait = Infinity; $("chalHud").classList.add("hidden"); return; }
    const d = cfg.discoveries[i], def = C.tasks[i], t = p.task = { i, key: d.key, title: (cfg.course.targets && cfg.course.targets[i]) || d.icon + " " + d.title, def, kind: def.kind, label: cfg.course.tasks[i], prog: 0, t: 0, done: false, ready: false };
    // Erst erklärt Nora die Aufgabe – losgehen darf es, wenn sie fertig ist (ohne Vorlesen: Zeit zum Lesen je nach Länge)
    const say = (cfg.flight && cfg.flight.gates[i]) || "";
    if (say) { radio(say, null, cfg.flight.who); t.voiceId = radioVoice; }
    t.readyAt = p.t + (Voice.enabled ? 0.6 : Math.min(7, Math.max(2.5, say.length / 15)));
  }
  // Die Aufgabe geht los: Sucher, Funken, Messfeld oder Ring-Wand erscheinen
  function probeTaskBegin(t) {
    const w = world, p = probe, def = t.def;
    t.ready = true;
    if (t.kind === "photo") { // der Sucher startet auf der anderen Seite des Bildes – das Kind muss ihn erst zum Ziel schieben
      world.tg[def.target].getWorldPosition(tmp); tmp.project(w.camera);
      t.fx = tmp.z < 1 && tmp.x > 0 ? -0.55 : 0.55; t.fy = tmp.z < 1 && tmp.y > 0 ? -0.45 : 0.45; t.hold = 0; $("probeTargetLabel").textContent = t.title; finderShow(true);
    }
    if (t.kind === "collect") { t.got = 0; w.sparks.forEach((sp, k) => spawnSpark(sp, p, 45 + k * 15)); }
    if (t.kind === "hold") { t.ph = Math.random() * 6; w.zone.visible = true; w.zone.userData.mat.color.set(def.color); w.zone.userData.ringMat.color.set(def.color); }
    if (t.kind === "gap") w.gap.set(p.z + 130, (Math.random() - 0.5) * 6);
  }
  function probeTaskDone(t) {
    t.done = true; t.wait = 0.8;
    taskVisualsOff(); $("chalHud").classList.add("hidden");
    discover(t.key);
  }
  function finderShow(on) { $("probeFinder").classList.toggle("hidden", !on); $("probeTarget").classList.toggle("hidden", !on); }
  function probeFlash() { const f = $("probeFlash"); f.classList.add("on"); setTimeout(() => f.classList.remove("on"), 70); }
  function probeTaskUpdate(dt, mx, my) {
    const p = probe, w = world, t = p.task, def = t.def, T = D.probeHud;
    if (!t.ready) { // Nora erklärt noch
      chalHud(t.label, 0, T.listen, false, true);
      if (p.t >= t.readyAt && !Voice.busy() && !Voice.speaking(t.voiceId)) probeTaskBegin(t);
      return;
    }
    t.t += dt;
    if (t.kind === "photo") { // Sucher mit der Steuerung bewegen, aufs Ziel halten, bis der Ring voll ist
      t.fx = Math.max(-0.9, Math.min(0.9, t.fx + mx * dt * 0.95)); t.fy = Math.max(-0.85, Math.min(0.85, t.fy + my * dt * 0.85));
      w.tg[def.target].getWorldPosition(tmp); tmp.project(w.camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1, W2 = innerWidth / 2, H2 = innerHeight / 2;
      const on = vis && Math.hypot((tmp.x - t.fx) * W2, (tmp.y - t.fy) * H2) < FINDER_PX * 0.8;
      t.sx = tmp.x; t.sy = tmp.y;
      t.hold = on ? t.hold + dt : Math.max(0, t.hold - dt * 0.6);
      const fd = $("probeFinder"), tgt = $("probeTarget");
      fd.style.left = ((t.fx * 0.5 + 0.5) * 100).toFixed(2) + "%"; fd.style.top = ((-t.fy * 0.5 + 0.5) * 100).toFixed(2) + "%";
      fd.classList.toggle("on", on); fd.style.setProperty("--p", Math.min(1, t.hold / PHOTO_HOLD).toFixed(2));
      tgt.classList.toggle("hidden", !vis);
      if (vis) { tgt.style.left = ((tmp.x * 0.5 + 0.5) * 100).toFixed(2) + "%"; tgt.style.top = ((-tmp.y * 0.5 + 0.5) * 100).toFixed(2) + "%"; }
      chalHud(t.label, t.hold / PHOTO_HOLD, on ? T.photoHold : T.photo, false, true);
      if (t.hold >= PHOTO_HOLD) { Sound.shutter(); probeFlash(); probeTaskDone(t); }
    } else if (t.kind === "collect") {
      for (const sp of w.sparks) {
        if (!sp.visible) continue;
        const u = sp.userData; sp.position.y = u.y + Math.sin(t.t * 2.2 + u.ph) * 0.35; sp.material.rotation = t.t * 0.8 + u.ph;
        if (!def.icon) sp.scale.setScalar(2.8 * (1 + 0.18 * Math.sin(t.t * 6 + u.ph))); // funkelt
        if (u.z < p.z - 4) { spawnSpark(sp, p, 125 + Math.random() * 30); continue; }
        if (Math.abs(u.z - p.z) < 2.4 && Math.hypot(sp.position.x - p.x, sp.position.y - p.y) < 2.4) {
          t.got++; Sound.sparkle(t.got - 1);
          if (t.got >= def.n) { probeTaskDone(t); return; }
          spawnSpark(sp, p, 125 + Math.random() * 30);
        }
      }
      chalHud(t.label, t.got / def.n, fmtVars(T.collect, { n: t.got, max: def.n }), false, true);
    } else if (t.kind === "hold") { // im Messfeld bleiben: drinnen füllt sich die Messung, draußen geht sie langsam zurück
      t.ph += dt * def.speed;
      const zx = Math.sin(t.ph) * def.amp[0], zy = Math.sin(t.ph * 1.37 + 1) * def.amp[1], z = w.zone, inside = Math.hypot(p.x - zx, p.y - zy) < def.r;
      t.zx = zx; t.zy = zy;
      z.position.set(zx, zy, p.z + 26); z.scale.set(def.r, def.r, 1); z.userData.tex.offset.y -= dt * 0.7;
      t.prog = Math.max(0, Math.min(1, t.prog + (inside ? dt / def.dur : -dt * 0.12)));
      z.userData.mat.opacity = inside ? 0.4 : 0.2; z.userData.ringMat.opacity = inside ? 0.95 : 0.5;
      Sound.loop("measure", inside ? 1 : 0, t.prog);
      chalHud(t.label, t.prog, inside ? T.inside : T.outside, !inside && t.prog > 0.05, true);
      if (t.prog >= 1) probeTaskDone(t);
    } else if (t.kind === "gap") { // durch die Lücke im Ring: auf die Höhe der Leuchtlinien steuern
      const g = w.gap; g.pulse(t.t); t.prog = 1 - Math.max(0, Math.min(1, (g.z - p.z) / 130));
      chalHud(t.label, t.prog, T.gap, false, true);
      if (p.z >= g.z) {
        if (Math.abs(p.y - g.y) < GAP_H) { Sound.whoosh(); probeTaskDone(t); }
        else { p.shake = 0.9; Sound.thud(1); UI.toast(cfg.course.miss); g.set(p.z + 100, (Math.random() - 0.5) * 6); }
      }
    }
  }
  // für Tests: wohin muss man steuern? (x: rechts +, y: oben +)
  function probeAim() {
    const p = probe, t = p && p.task; if (!t || t.done || !t.ready) return { kind: "", x: 0, y: 0 };
    if (t.kind === "photo") return { kind: "photo", x: (t.sx || 0) - t.fx, y: (t.sy || 0) - t.fy };
    if (t.kind === "collect") { const sp = world.sparks.filter((x) => x.visible && x.userData.z > p.z + 1).sort((a, b) => a.userData.z - b.userData.z)[0]; return sp ? { kind: "collect", x: -(sp.position.x - p.x), y: sp.position.y - p.y } : { kind: "collect", x: 0, y: 0 }; }
    if (t.kind === "hold") return { kind: "hold", x: -((t.zx || 0) - p.x), y: (t.zy || 0) - p.y };
    return { kind: "gap", x: 0, y: world.gap.y - p.y };
  }
  function enterProbe() {
    if (!worlds[bodyId]) worlds[bodyId] = buildProbeWorld();
    world = worlds[bodyId];
    S.scene = world.scene; S.camera = world.camera;
    W.renderer.shadowMap.enabled = false;
    setupInput(); S.resize(); resetJoy();
    probe = { x: 0, y: 0, z: 0, vx: 0, vy: 0, t: 0, f: foundCount() / cfg.discoveries.length, shake: 0, bumpAt: -9, task: null, taskWait: 2.6 };
    taskVisualsOff(); $("chalHud").classList.add("hidden");
    for (const sp of world.jets.list) sp.visible = false;
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
    precompile();
    S.active = true;
    Sound.engine(0.35);
    const rest = cfg.discoveries.length - foundCount();
    quizScene = 0;
    setTimeout(() => { if (S.active) radio(rest === 0 ? (quizDone ? cfg.radio.quizDone : D.radioQuizOpen) : foundCount() === 0 ? cfg.radio.start : cfg.radio.back, { rest }, cfg.flight && cfg.flight.who); }, 700); // auch hier: kein Aufploppen
  }
  function updateProbe(dt, elapsed) {
    const p = probe, w = world, C = PROBES[bodyId], c = w.camera;
    const mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x;
    const my = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
    jumpPressed = actionPressed = false;
    if (!UI.modalOpen()) {
      p.t += dt;
      p.f += (foundCount() / cfg.discoveries.length - p.f) * Math.min(1, dt * 0.6); // Fortschritt des Flugs (0 … 1), weich nachgeführt
      const t = p.task, photo = !!(t && !t.done && t.ready && t.kind === "photo");
      // Steuern: rechts auf dem Bildschirm ist −X (die Kamera schaut nach +Z). Dazu schiebt der Wind. Beim Fotografieren lenkt man den Sucher.
      const wind = C.wind ? C.wind(p.t, p.f) : 0;
      p.vx += ((photo ? 0 : -mx * 13) + wind * (photo ? 0.3 : 1) - p.vx) * Math.min(1, dt * 4);
      p.vy += ((photo ? 0 : my * 10) - p.vy) * Math.min(1, dt * 4);
      p.x = Math.max(-LANE_X, Math.min(LANE_X, p.x + p.vx * dt));
      p.y = Math.max(-LANE_Y, Math.min(LANE_Y, p.y + p.vy * dt));
      p.z += PROBE_SPEED * (photo ? 0.55 : 1) * dt;
      const jx = photo ? 0 : mx, jy = photo ? 0 : my; jetsUpdate(w.jets, p, dt, jx, jy); Sound.loop("thrust", Math.min(1, Math.hypot(jx, jy)));
      // Aufgaben: nach einer kurzen Pause kommt die nächste
      if (!t) { if (p.taskWait > 0 && (p.taskWait -= dt) <= 0) probeTaskStart(); }
      else if (t.done) { if ((t.wait -= dt) <= 0) { p.task = null; p.taskWait = 1.2; } }
      else probeTaskUpdate(dt, mx, my);
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
          if (w.gap && Math.abs(w.gap.z - u.z) < 16) u.z += 30; // nicht direkt vor die Ring-Wand
          u.r = lerp(C.rocks.size[0], C.rocks.size[1], Math.random());
          r.position.set((Math.random() - 0.5) * 2 * LANE_X, (Math.random() - 0.5) * 2 * LANE_Y, u.z);
          r.scale.setScalar(u.r);
        }
        if (C.rocks.glow) r.children[1].scale.setScalar(3.4 * (1 + 0.15 * Math.sin(p.t * 17 + u.r * 9) + 0.08 * Math.sin(p.t * 31 + u.r * 4))); // der Hitzeschein flackert
        { r.rotation.x += dt * 0.5; r.rotation.y += dt * 0.3; }
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
      Sound.engine(0.35);
    } else { // ein Fenster ist offen: die Sonde steht – Düsen und Messton aus, Triebwerk leise
      Sound.loop("thrust", 0); Sound.loop("measure", 0); Sound.engine(0.08);
      for (const sp of w.jets.list) sp.visible = false;
    }

    w.craft.position.set(p.x, p.y, p.z);
    w.craft.rotation.set(-p.vy * 0.03, 0, p.vx * 0.035);
    if (w.craft.userData.blink) w.craft.userData.blink.forEach((m, i) => { m.visible = ((p.t * 1.1 + i * 0.5) % 1) < 0.16; });
    if (w.craft.userData.chute) w.craft.userData.chute.rotation.z = Math.sin(p.t * 0.9) * 0.08; // Fallschirm pendelt
    w.far.position.set(p.x * 0.75, p.y * 0.75, p.z);
    const sh = p.shake * 0.5;
    // Kamera etwas oberhalb: die Sonde sitzt im unteren Bilddrittel und verdeckt das nächste Tor nicht
    c.position.set(p.x * 0.75 + (Math.random() - 0.5) * sh, p.y * 0.75 + 3.4 + (Math.random() - 0.5) * sh, p.z - 10);
    c.lookAt(p.x * 0.9, p.y * 0.9 + 1.6, p.z + 25);
    if (probeCam) probeCam(c, w.craft);
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
      },
      actions: { himmel: startScope, spiegel: startLaser, antenne: startLapse, fallversuch: startFall, mondstein: startLongJump }
    },
    mars: {
      build: buildMars,
      reset() {
        marsSky(0); resetMagnet();
        world.telescope.visible = true;
        world.everest.visible = world.zugspitze.visible = world.drill.userData.ice.visible = false;
        for (const s of world.samples) s.mk.visible = false;
        $("roverCam").classList.add("hidden"); if (world.rover.userData.arm) roverArmPose(world.rover.userData.arm, 0);
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
      grip: () => (onMarsIce(ast.pos.x, ast.pos.z) ? 0.35 : 1), // auf dem Eis im Krater rutscht man
      actions: { rover: startRover, vulkan: startHeli, monde: startMoons, eis: startEis, rost: startRost, abend: startAbend, curling: startCurling }
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
      actions: { sonne: startSunScope, krater: startMeteor, jahr: startOrrery, temperatur: startShadowRun }
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
      actions: { hitze: startHeat, druck: startPress, tag: startSpin, abendstern: startEveningStar, venera: startRadar }
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
      actions: { luft: startAir, stern: startShooting, tag: startDay, mond: startMoonScope, wald: startSafari }
    }
  };

  if (/[?&]test/.test(location.search)) S._test = { probeAim, setProbeCam: (fn) => { probeCam = fn; }, navPath, navLine, navGrid, ast, view, get world() { return world; }, get boarding() { return boarding; }, get scope() { return view.special; }, get probe() { return probe; }, get guide() { return guide; }, get experiment() { return experiment; }, KIT, dropFall, discover, startAction, showFound, POSE, setBone, setArm, poseRig, HATCH, setJoy: (x, y) => { joy.x = x; joy.y = y; } };
  return S;
})();
