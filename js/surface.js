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

  function makeHeight(layout) {
    const craters = [[60, -20, 14, 2.2], [-50, 10, 10, 1.6], [12, 95, 18, 2.6], [-70, 70, 12, 1.8], [80, 60, 9, 1.4],
      [-30, -40, 16, 2.4], [40, -70, 11, 1.8], [-95, -30, 20, 3], [0, -95, 13, 2], [100, 10, 8, 1.2], [-15, 75, 7, 1.1],
      [55, 25, 5, 0.7], [-45, 30, 4, 0.6], [25, -30, 6, 0.9]];
    const b = layout.boulder, sh = [b[0] + SHADOW_DIR.x * 12, b[1] + SHADOW_DIR.z * 12];
    layout.shadowSpot = sh;
    const flats = [[0, 0, 11], [...layout.fallversuch, 5], [...layout.himmel, 5], [...layout.apollo, 10], [...layout.boulder, 7], [...sh, 8], [...layout.waage, 3], [...layout.station, 16]];
    return function height(x, z) {
      let h = (fbm2(x * 0.02, z * 0.02) - 0.5) * 6 + (fbm2(x * 0.12 + 7, z * 0.12) - 0.5) * 0.8;
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
    setBone(rig, "legL", legL, 0, 0); setBone(rig, "legR", legR, 0, 0);
    setBone(rig, "kneeL", kneeL, 0, 0); setBone(rig, "kneeR", kneeR, 0, 0);
    setArm(rig, "armL", fwd, downL == null ? down : downL); setArm(rig, "armR", -fwd, downR == null ? down : downR);
    setBone(rig, "foreL", 0, 0, elbow); setBone(rig, "foreR", 0, 0, -elbow);
    setBone(rig, "spine", lean, 0, 0);
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
      leg.position.set(Math.cos(a) * 0.35, 0.7, Math.sin(a) * 0.35); leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
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
  function makeSignpost() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8), new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.5, roughness: 0.4 }));
    pole.position.y = 1.15; pole.castShadow = true; g.add(pole);
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 160;
    const x = cv.getContext("2d");
    x.fillStyle = "#1d4ed8"; x.fillRect(0, 0, 512, 160);
    x.strokeStyle = "#fff"; x.lineWidth = 8; x.strokeRect(8, 8, 496, 144);
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "bold 58px sans-serif"; x.fillText("ERDE", 256, 54);
    x.font = "bold 44px sans-serif"; x.fillText("384.400 km", 256, 112);
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
  function makeStation(discoveries) {
    const g = new THREE.Group();
    const hull = new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.6, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.5, metalness: 0.4 });
    const lit = new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: 0xfde68a, emissiveIntensity: 0.8 });
    const add = (m, x, y, z, shadow = true) => { m.position.set(x, y, z); m.castShadow = shadow; g.add(m); return m; };
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
    // Wand mit Schild
    add(new THREE.Mesh(new THREE.BoxGeometry(15.6, 3.7, 0.3), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 })), 0, 1.85, 0).receiveShadow = true;
    for (const px of [-4.6, 4.6]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 8), dark), px, 4.2, 0);
    const sv = document.createElement("canvas"); sv.width = 1024; sv.height = 200;
    const sx = sv.getContext("2d");
    sx.fillStyle = "#7c3aed"; sx.fillRect(0, 0, 1024, 200);
    sx.strokeStyle = "#fde68a"; sx.lineWidth = 10; sx.strokeRect(8, 8, 1008, 184);
    sx.fillStyle = "#fff"; sx.textAlign = "center"; sx.textBaseline = "middle";
    sx.font = "bold 110px sans-serif"; sx.fillText("Wusstest du?", 512, 86);
    sx.font = "bold 34px sans-serif"; sx.fillStyle = "#fde68a"; sx.fillText("MONDSTATION · DEINE ENTDECKUNGEN", 512, 166);
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

  function makeMarker() {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 30, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 15; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 40),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    g.userData = { beam, ring };
    return g;
  }

  function buildMoon() {
    const FAST = W.fast;
    const L = { ...MOON_LAYOUT };
    const height = makeHeight(L);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 3000);

    // Boden
    const SIZE = 560, SEG = FAST ? 140 : 220;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, height(x, z));
      const m = 0.72 + 0.28 * smooth(0.35, 0.6, fbm2(x * 0.01 + 3, z * 0.01)); // dunklere „Meere“
      cols[i * 3] = cols[i * 3 + 1] = m; cols[i * 3 + 2] = m * 1.02;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: regolithTexture(), color: 0x86837d, vertexColors: true, roughness: 1, metalness: 0 }));
    ground.receiveShadow = true;
    scene.add(ground);

    // Steine
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x6b6863, roughness: 1, flatShading: true }), FAST ? 140 : 280);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V(), p = new V(), e = new THREE.Euler();
    let placed = 0, tries = 0;
    const keepFree = [[0, 0, 12], [...L.fallversuch, 5], [...L.himmel, 5], [...L.apollo, 9], [...L.shadowSpot, 7], [...L.spawn, 4],
      [...L.waage, 4], [...L.wegweiser, 3], [...L.mondstein, 3], [L.station[0], L.station[1] + 2, 18]];
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

    // Licht: grelle Sonne, kaum Umgebungslicht (auf dem Mond sind Schatten tiefschwarz), bläulicher Erdschein
    const ambient = new THREE.AmbientLight(0x8090b0, 0.16), hemi = new THREE.HemisphereLight(0x5b7bbf, 0x000000, 0.12);
    scene.add(ambient, hemi);
    const sun = new THREE.DirectionalLight(0xfffaf0, 1.9);
    sun.castShadow = true;
    const shadowRes = FAST || W.lite ? 1024 : 2048; // Tablets/Surface: sparsamer
    sun.shadow.mapSize.set(shadowRes, shadowRes);
    Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 260 });
    sun.shadow.bias = -0.0015;
    scene.add(sun, sun.target);

    // Himmel: Sterne, Sonne, Erde
    const n = FAST ? 1500 : 3000, sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 0.95 + 0.05, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      sp.set([r * Math.cos(th) * 1400, u * 1400, r * Math.sin(th) * 1400], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0.85 }));
    scene.add(stars);
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,245,1)", "rgba(255,240,200,0.5)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    sunGlow.position.copy(SUN_DIR).multiplyScalar(1200); sunGlow.scale.set(160, 160, 1);
    scene.add(sunGlow);

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
    const on = (obj, x, z, lift = 0) => { obj.position.set(x, height(x, z) + lift, z); scene.add(obj); return obj; };
    const rocket = W.makeRocket(G.state.color);
    rocket.scale.setScalar(4.6); rocket.rotation.x = Math.PI / 2;
    rocket.userData.flame.visible = false;
    rocket.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    on(rocket, 0, 0, 0.95 * 4.6);
    const hatch = on(makeHatch(), 0, 0);
    hatch.rotation.y = HATCH.a;

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
    const station = on(makeStation(cfg.discoveries), ...L.station);
    // Laserstrahl zwischen Spiegel und Erde (nur während der Messung sichtbar)
    const laserFrom = new V(L.spiegel[0], height(...L.spiegel) + 0.5, L.spiegel[1]);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 880, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.copy(laserFrom).addScaledVector(earthDir, 440);
    beam.quaternion.setFromUnitVectors(new V(0, 1, 0), earthDir);
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(220,255,220,1)", "rgba(74,222,128,0.7)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    beam.visible = pulse.visible = false;
    scene.add(beam, pulse);
    on(makeSignpost(), ...L.wegweiser).rotation.y = Math.atan2(L.wegweiser[0], L.wegweiser[1]) + Math.PI; // Schild zeigt zur Rakete
    on(makeAntenna(earthDir), ...L.antenne);
    on(makeMoonRock(), ...L.mondstein, 0.18);
    const table = on(makeTable(), ...L.fallversuch);
    const hammer = makeHammer(), feather = makeFeather();
    hammer.scale.setScalar(1.6); feather.scale.setScalar(1.6);
    hammer.rotation.z = Math.PI / 2; feather.rotation.z = Math.PI / 2;
    hammer.position.set(-0.3, 1.06, 0); feather.position.set(0.3, 1.04, 0);
    table.add(hammer, feather);

    // Fußabdrücke von 1969 rund um die Fähre (bleiben, weil es keinen Wind gibt)
    const fpTex = footprintTexture();
    const fpMat = new THREE.MeshBasicMaterial({ map: fpTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const fpGeo = new THREE.PlaneGeometry(0.3, 0.6); fpGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 3.2, r = 4.5 + (i % 7) * 0.9;
      const x = L.apollo[0] + Math.cos(a) * r + ((i % 2) - 0.5) * 0.4, z = L.apollo[1] + Math.sin(a) * r;
      const fp = new THREE.Mesh(fpGeo, fpMat);
      fp.position.set(x, height(x, z) + 0.03, z); fp.rotation.y = -a;
      scene.add(fp);
    }

    // Eigene Fußabdrücke (Pool)
    const myPrints = [];
    for (let i = 0; i < 160; i++) { const m = new THREE.Mesh(fpGeo, fpMat); m.visible = false; scene.add(m); myPrints.push(m); }

    // Markierungen (Lichtsäulen) für die Entdeckungs-Stationen
    const stations = {};
    const stationPos = { wand: [L.station[0], L.station[1] - 2.2], // zuerst: die Exponate daneben haben Vorrang
      apollo: L.apollo, himmel: L.himmel, temperatur: L.shadowSpot, fallversuch: L.fallversuch, waage: L.waage,
      spiegel: L.spiegel, wegweiser: L.wegweiser, antenne: L.antenne, mondstein: L.mondstein, rakete: [HATCH.x * 3.6, HATCH.z * 3.6] };
    for (const [key, [x, z]] of Object.entries(stationPos)) {
      const mk = on(makeMarker(), key === "apollo" ? x + 6 : x, key === "apollo" ? z - 5 : z);
      if (cfg.stations[key].small) mk.scale.set(0.45, 0.2, 0.45); // Fundstück: nur ein kleines Licht
      if (cfg.stations[key].info) mk.visible = false;              // Tafelwand: keine Entdeckung, also kein Licht
      stations[key] = { marker: mk, x: mk.position.x, z: mk.position.z };
    }

    const astronaut = astronautModel ? makeModelAstronaut(astronautModel, G.state.color) : makeAstronaut(G.state.color);
    scene.add(astronaut);

    // Staubwolken
    const dustMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(150,146,140,1)", "rgba(130,126,120,0.9)"), transparent: true, depthWrite: false });
    const dust = [];
    for (let i = 0; i < 120; i++) { const s = new THREE.Sprite(dustMat.clone()); s.visible = false; s.userData = { life: 0, v: new V() }; scene.add(s); dust.push(s); }

    // Einfache Kreis-Hindernisse: [x, z, Radius]
    const colliders = [[0, 0, 1.8], [...L.boulder, 6.8], [...L.apollo, 3.2], [...L.fallversuch, 1], [...L.himmel, 0.6],
      [...L.spiegel, 0.5], [...L.wegweiser, 0.3], [...L.antenne, 0.6], [...L.mondstein, 0.4], [scale.position.x - WEIGH_DIR.x * 0.95, scale.position.z - WEIGH_DIR.z * 0.95, 0.25]];
    // Mondstation: Tafelwand (Kette aus Kreisen), Kuppel, Wohnmodul, Mast des Sonnensegels
    const [sx0, sz0] = L.station;
    for (let x = -6.6; x <= 6.61; x += 2.2) colliders.push([sx0 + x, sz0 + 0.1, 1]);
    colliders.push([sx0, sz0 + 7.5, 6.4], [sx0 - 13, sz0 + 6.5, 2.4], [sx0 - 8.5, sz0 + 6.5, 2.4], [sx0 + 11, sz0 + 6, 0.5]);

    return {
      scene, camera, height, L, sun, sunGlow, ambient, hemi, stars, station, laserFrom, beam, pulse, earth, earthDir, cmpMoon, cmpRight, rocket, rocketY: rocket.position.y, hatch, hatchY: hatch.position.y, scale, lander, boulder, telescope, table, hammer, feather,
      stations, astronaut, myPrints, printIdx: 0, dust, dustIdx: 0, colliders, shadowCasters: [boulder, rocket, lander, station]
    };
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
    world.station.userData.refresh(foundMap()); // Tafeln an der Mondstation
    for (const [key, st] of Object.entries(world.stations)) {
      const home = !!cfg.stations[key].home, done = !!foundMap()[key];
      const color = home ? 0xfbbf24 : done ? 0x4ade80 : cfg.stations[key].small ? 0xfcd34d : 0x7dd3fc;
      st.marker.userData.beam.material.color.set(color);
      st.marker.userData.ring.material.color.set(color);
      st.marker.userData.beam.scale.y = done || home ? 0.25 : 1;
      st.marker.userData.beam.position.y = done || home ? 3.75 : 15;
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
          : `<button class="answer" disabled style="opacity:.6">○ ❓ Tipp: ${d.hint || (cfg.stations[d.key] || {}).hint || "Noch nicht entdeckt"}</button>`).join("")}</div>
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
    if (worlds[id]) return;
    astronautModel = await loadAstronautModel();
    bodyId = id; cfg = D.surfaces[id];
    worlds[id] = buildMoon();
  };

  S.enter = function (id, exitCb) {
    bodyId = id; cfg = D.surfaces[id]; onExit = exitCb;
    if (!worlds[id]) worlds[id] = buildMoon();
    world = worlds[id];
    S.scene = world.scene; S.camera = world.camera;
    W.renderer.shadowMap.enabled = true;
    W.renderer.shadowMap.type = THREE.PCFShadowMap;
    setupInput();
    S.resize();
    // Astronaut steht neben der Rakete, Blick zu den Stationen
    const [sx, sz] = world.L.spawn;
    ast.pos.set(sx, world.height(sx, sz), sz); ast.vy = 0; ast.onGround = true; ast.heading = 0.3; ast.speed = 0; ast.walked = 0;
    view.yaw = ast.heading; view.height = 3.2; view.special = null; view.dragged = 0;
    view.look.set(sx, ast.pos.y + 1.3, sz + 3);
    world.camera.position.set(sx - Math.sin(view.yaw) * 7, ast.pos.y + 3.2, sz - Math.cos(view.yaw) * 7);
    temp = { shown: 120, inShadow: false, shadowTime: 0, sunSeen: true, check: 0 };
    quizDone = (G.state.surfaceQuiz && G.state.surfaceQuiz[id] != null) || false;
    experiment = null; boarding = null; jumpPressed = actionPressed = false;
    world.hammer.visible = world.feather.visible = true;
    world.astronaut.visible = true; world.astronaut.scale.setScalar(1);
    world.hatch.userData.door.material.emissiveIntensity = 0.9;
    world.rocket.position.y = world.rocketY; world.hatch.position.y = world.hatchY;
    world.rocket.userData.flame.visible = false;
    world.telescope.visible = world.stations.himmel.marker.visible = world.stations.waage.marker.visible = true;
    scaleShown = "";
    world.stations.spiegel.marker.visible = world.stations.antenne.marker.visible = true;
    world.beam.visible = world.pulse.visible = false; setSun(0);
    world.cmpMoon.visible = false; applySky(0);
    $("scope").classList.add("hidden"); $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping");
    world.camera.fov = 60; world.camera.updateProjectionMatrix();
    world.stations.rakete.marker.visible = true;
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
    S.active = false;
    Sound.engine(0);
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
  }

  // ---------- pro Bild ----------
  const tmp = new V(), tmp2 = new V(), ray = new THREE.Raycaster();
  S.update = function (dt, elapsed) {
    if (!S.active || !world) return;
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
    if (ast.onGround) ast.speed += (targetSpeed - ast.speed) * Math.min(1, dt * (targetSpeed > ast.speed ? 3.0 : 3.4));
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
      // Anzug + Rucksack wiegen so viel wie ein Erwachsener → ca. 45 cm hoch, gut 1 s in der Luft
      ast.vy = Math.sqrt(2 * g * 0.45); ast.onGround = false; ast.jumpBase = ast.pos.y; ast.maxY = ast.pos.y; ast.jumping = true; ast.hopping = false;
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
          if (h > 0.3 && foundMap().sprung) UI.toast(`🦘 ${jump.hoehe} hoch · ${jump.zeit} Sekunden in der Luft`, "gold");
          else if (h > 0.3) discover("sprung", jump);
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
    const target = temp.inShadow ? -150 : 120;
    temp.shown += (target - temp.shown) * Math.min(1, dt * 1.2);
    if (temp.inShadow) temp.shadowTime += dt; else { temp.shadowTime = 0; temp.sunSeen = true; }
    if (temp.inShadow && temp.shadowTime > 1.8 && temp.sunSeen && !busy) discover("temperatur");
    const t = Math.round(temp.shown);
    const tEl = $("suitTemp");
    const tText = (t < 0 ? "−" : "") + Math.abs(t) + " °C";
    if (tEl.textContent !== tText) tEl.textContent = tText;
    $("suit").classList.toggle("cold", t < 0);
    $("suitState").textContent = temp.inShadow ? "❄️ Schatten – eiskalt!" : "☀️ Sonne – glühend heiß!";

    // Stationen: Nähe prüfen
    let near = null, nearText = "";
    for (const [key, st] of Object.entries(world.stations)) {
      const sc = cfg.stations[key], d = Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z);
      if (key === "apollo" && Math.hypot(ast.pos.x - world.L.apollo[0], ast.pos.z - world.L.apollo[1]) < 9 && !busy) discover("apollo");
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

    updateExperiment(dt);
    updateScaleDisplay();
    updateDust(dt);
    radioTimer -= dt; if (radioTimer <= 0) $("radio").classList.add("hidden");

    // Licht folgt dem Astronauten (scharfe Schatten in der Nähe)
    world.sun.target.position.copy(ast.pos);
    world.sun.position.copy(ast.pos).addScaledVector(sunNow, 120);
    world.earth.rotation.y += dt * 0.02;

    updateCamera(dt);
    updateLabels();
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
    if (key === "himmel") startScope();
    if (key === "waage") startWeigh();
    if (key === "spiegel") startLaser();
    if (key === "antenne") startLapse();
    if (key === "fallversuch") {
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
  function updateScope(dt) {
    const c = world.camera, sp = view.special, T = cfg.scope; sp.t += dt;
    const tp = world.telescope.position;
    c.position.lerp(tmp.set(tp.x, tp.y + 1.7, tp.z), 1 - Math.exp(-dt * 4));
    let fov = 30;
    if (sp.phase === "aim") {
      sp.yaw -= sp.ix * dt * 0.55; sp.pitch += sp.iy * dt * 0.55;
      if (sp.t > 25) { // die Bodenstation hilft beim Zielen, damit niemand hängen bleibt
        const k = Math.min(1, dt * 0.8);
        sp.yaw += angleLerp(0, sp.yawE - sp.yaw, 1) * k; sp.pitch += (sp.pitchE - sp.pitch) * k;
      }
      // nicht zu weit wegschwenken: höchstens ein Stück links/rechts der Erde, nicht unter den Horizont
      const dYaw = Math.max(-1.1, Math.min(0.4, angleLerp(0, sp.yawE - sp.yaw, 1)));
      sp.yaw = sp.yawE - dYaw;
      sp.pitch = Math.max(0.03, Math.min(1.25, sp.pitch));
      const dPitch = sp.pitchE - sp.pitch;
      const off = Math.hypot(dYaw * Math.cos(sp.pitch), dPitch);
      sp.lock = off < 0.07 ? sp.lock + dt : 0;
      if (sp.t > 8) { // Tipp: Pfeil in Richtung Erde (Erde links = größerer Drehwinkel)
        const arrow = off < 0.12 ? "" : ARROWS[(Math.round(Math.atan2(dPitch, -dYaw * Math.cos(sp.pitch)) / (Math.PI / 4)) + 8) % 8];
        if (arrow !== sp.hint) { sp.hint = arrow; $("scopeText").textContent = arrow ? `${T.hint} ${arrow}` : T.almost; }
      }
      const cp = Math.cos(sp.pitch);
      view.look.set(c.position.x + Math.sin(sp.yaw) * cp * 900, c.position.y + Math.sin(sp.pitch) * 900, c.position.z + Math.cos(sp.yaw) * cp * 900);
      if (sp.lock > 0.45) {
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

  // ---------- Exponate an der Mondstation ----------
  // Gemeinsamer Rahmen: Steuerung aus, HUD weg, Text + Knöpfe unten (wie beim Fernrohr)
  function enterExhibit(key, state) {
    view.special = state; state.key = key;
    ast.speed = 0; resetJoy();
    radioTimer = 0; $("radio").classList.add("hidden");
    world.stations[key].marker.visible = false;
    $("surfaceHud").classList.add("scoping");
  }
  function leaveExhibit() {
    const key = view.special.key;
    view.special = null;
    world.stations[key].marker.visible = true;
    $("scopeUi").classList.add("hidden"); $("surfaceHud").classList.remove("scoping");
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
    world.sun.intensity = 1.9 * day;
    world.sunGlow.visible = sunNow.y > -0.08;
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
  function grains(p, n, power = 1, dirX = 0, dirZ = 0) {
    for (let i = 0; i < n; i++) {
      const s = world.dust[world.dustIdx]; world.dustIdx = (world.dustIdx + 1) % world.dust.length;
      s.position.set(p.x + (Math.random() - 0.5) * 0.3, p.y + 0.05, p.z + (Math.random() - 0.5) * 0.3);
      s.userData.v.set((Math.random() - 0.5) * 0.8 * power + dirX * power, (0.4 + Math.random() * 0.9) * power, (Math.random() - 0.5) * 0.8 * power + dirZ * power);
      s.userData.life = 4; s.visible = true;
      s.material.opacity = 0.85; s.scale.setScalar(0.035 + Math.random() * 0.035);
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
      if (secret && Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z) > 40) { el.style.display = "none"; continue; }
      const text = secret ? "✨ Fundstück" : `${home ? "🚀" : done ? "✓" : "🔍"} ${sc.label}`;
      if (el.textContent !== text) el.textContent = text;
      el.classList.toggle("done", done);
      el.classList.toggle("home", home);
      el.style.display = "";
      el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    }
  }

  if (/[?&]test/.test(location.search)) S._test = { ast, view, get world() { return world; }, get boarding() { return boarding; }, get scope() { return view.special; }, discover, startAction, showFound, POSE, setBone, HATCH };
  return S;
})();
