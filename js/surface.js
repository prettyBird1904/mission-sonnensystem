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
    rocket: [0, 0], spawn: [8, 10],
    fallversuch: [-7, 15], himmel: [12, 20], apollo: [-18, 32], boulder: [22, 34]
  };
  const SHADOW_DIR = new V(-SUN_DIR.x, 0, -SUN_DIR.z).normalize(); // Schatten fallen weg von der Sonne

  function makeHeight(layout) {
    const craters = [[60, -20, 14, 2.2], [-50, 10, 10, 1.6], [12, 95, 18, 2.6], [-70, 70, 12, 1.8], [80, 60, 9, 1.4],
      [-30, -40, 16, 2.4], [40, -70, 11, 1.8], [-95, -30, 20, 3], [0, -95, 13, 2], [100, 10, 8, 1.2], [-15, 75, 7, 1.1],
      [55, 25, 5, 0.7], [-45, 30, 4, 0.6], [25, -30, 6, 0.9]];
    const b = layout.boulder, sh = [b[0] + SHADOW_DIR.x * 12, b[1] + SHADOW_DIR.z * 12];
    layout.shadowSpot = sh;
    const flats = [[0, 0, 11], [...layout.fallversuch, 5], [...layout.himmel, 5], [...layout.apollo, 10], [...layout.boulder, 7], [...sh, 8]];
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
    let legL = 0, legR = 0, kneeL = 0, kneeR = 0, down = 1.3, fwd = 0.08, elbow = 0.3, lean = breathe;
    if (st.mode === "lope") {
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
    setArm(rig, "armL", fwd, down); setArm(rig, "armR", -fwd, down);
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
    const keepFree = [[0, 0, 12], [...L.fallversuch, 5], [...L.himmel, 5], [...L.apollo, 9], [...L.shadowSpot, 7], [...L.spawn, 4]];
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
    scene.add(new THREE.AmbientLight(0x8090b0, 0.16));
    scene.add(new THREE.HemisphereLight(0x5b7bbf, 0x000000, 0.12));
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
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0.85 })));
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

    // Objekte
    const on = (obj, x, z, lift = 0) => { obj.position.set(x, height(x, z) + lift, z); scene.add(obj); return obj; };
    const rocket = W.makeRocket(G.state.color);
    rocket.scale.setScalar(4.6); rocket.rotation.x = Math.PI / 2;
    rocket.userData.flame.visible = false;
    rocket.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    on(rocket, 0, 0, 0.95 * 4.6);

    const lander = on(makeLander(), ...L.apollo);
    lander.rotation.y = 0.6;
    const flag = on(makeFlag(), L.apollo[0] + 4.5, L.apollo[1] - 2.5);
    flag.rotation.y = -0.4;

    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x5f5f65, roughness: 1, flatShading: true }));
    boulder.scale.set(7, 8.5, 6.5); boulder.rotation.set(0.2, 0.7, 0.1);
    boulder.castShadow = true; boulder.receiveShadow = true;
    on(boulder, ...L.boulder, 5.5);

    const telescope = on(makeTelescope(earthDir), ...L.himmel);
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
    const stationPos = { apollo: L.apollo, himmel: L.himmel, temperatur: L.shadowSpot, fallversuch: L.fallversuch };
    for (const [key, [x, z]] of Object.entries(stationPos)) {
      const mk = on(makeMarker(), key === "apollo" ? x + 6 : x, key === "apollo" ? z - 5 : z);
      stations[key] = { marker: mk, x: mk.position.x, z: mk.position.z };
    }

    const astronaut = astronautModel ? makeModelAstronaut(astronautModel, G.state.color) : makeAstronaut(G.state.color);
    scene.add(astronaut);

    // Staubwolken
    const dustMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(150,146,140,1)", "rgba(130,126,120,0.9)"), transparent: true, depthWrite: false });
    const dust = [];
    for (let i = 0; i < 120; i++) { const s = new THREE.Sprite(dustMat.clone()); s.visible = false; s.userData = { life: 0, v: new V() }; scene.add(s); dust.push(s); }

    // Einfache Kreis-Hindernisse: [x, z, Radius]
    const colliders = [[0, 0, 1.8], [...L.boulder, 6.8], [...L.apollo, 3.2], [...L.fallversuch, 1], [...L.himmel, 0.6]];

    return {
      scene, camera, height, L, sun, earth, earthDir, rocket, lander, boulder, telescope, table, hammer, feather,
      stations, astronaut, myPrints, printIdx: 0, dust, dustIdx: 0, colliders, shadowCasters: [boulder, rocket, lander]
    };
  }

  // ---------- Zustand beim Erkunden ----------
  const ast = { pos: new V(), vy: 0, onGround: true, heading: 0, speed: 0, phase: 0, jumpBase: 0, maxY: 0, walked: 0, foot: 0 };
  const view = { yaw: 0, height: 3.2, look: new V(), special: null };
  const keys = {}, joy = { x: 0, y: 0 };
  let jumpPressed = false, actionPressed = false;
  let temp = { shown: 120, inShadow: false, shadowTime: 0, sunSeen: false, check: 0 };
  let radioTimer = 0, farWarned = 0, experiment = null, quizDone = false;

  function fmtVars(t, vars) { return t.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : k === "name" ? G.state.name : "")); }

  function radio(text, vars) {
    const msg = fmtVars(text, vars);
    $("radioText").textContent = msg;
    const r = $("radio"); r.classList.remove("hidden"); r.classList.remove("ping"); void r.offsetWidth; r.classList.add("ping");
    $("radioSpeak").onclick = () => UI.speak(msg);
    if (Sound.enabled) UI.speak(msg);
    radioTimer = 14;
  }

  function foundMap() { return (G.state.found && G.state.found[bodyId]) || {}; }
  function foundCount() { return Object.keys(foundMap()).length; }

  function updateCounter() {
    $("discCount").textContent = `${foundCount()}/${cfg.discoveries.length}`;
    for (const [key, st] of Object.entries(world.stations)) {
      const done = !!foundMap()[key];
      st.marker.userData.beam.material.color.set(done ? 0x4ade80 : 0x7dd3fc);
      st.marker.userData.ring.material.color.set(done ? 0x4ade80 : 0x7dd3fc);
      st.marker.userData.beam.scale.y = done ? 0.25 : 1;
      st.marker.userData.beam.position.y = done ? 3.75 : 15;
    }
  }

  // Eine Entdeckung wurde gemacht → Karte zeigen, speichern, Sterne
  function discover(key, vars) {
    if (foundMap()[key]) return;
    const d = cfg.discoveries.find((x) => x.key === key);
    G.discover(bodyId, key);
    updateCounter();
    Sound.correct(); UI.confetti(90);
    const text = fmtVars(d.text, vars);
    UI.openModal(`
      <div class="discovery">
        <div class="disc-icon">${d.icon}</div>
        <div class="disc-kicker">Neue Entdeckung! +1 ⭐</div>
        <h2>${d.title}</h2>
        ${d.photo ? `<img src="img/${d.photo}" alt="" class="disc-photo">` : ""}
        <p>${text}</p>
        <div class="row-gap"><button class="btn ghost" id="discSpeak">🔊 Vorlesen</button><button class="btn primary" id="discOk">Weiter erkunden ▶</button></div>
      </div>`);
    if (Sound.enabled) UI.speak(`${d.title}. ${text}`);
    $("discSpeak").onclick = () => UI.speak(`${d.title}. ${text}`);
    $("discOk").onclick = () => {
      UI.closeModal();
      const rest = cfg.discoveries.length - foundCount();
      if (rest > 0) radio(cfg.radio.found, { rest });
      else if (!quizDone) { radio(cfg.radio.allFound); setTimeout(startQuiz, 2500); }
    };
  }

  function startQuiz() {
    if (!S.active || UI.modalOpen()) { if (S.active) setTimeout(startQuiz, 1500); return; }
    const qs = cfg.quiz; let i = 0, right = 0;
    const show = () => {
      const q = qs[i];
      UI.openModal(`
        <div class="discovery">
          <div class="disc-kicker">📻 Funkspruch der Bodenstation · Frage ${i + 1} von ${qs.length}</div>
          <h2 style="font-size:24px">${q.q}</h2>
          <div class="answers">${q.a.map((t, k) => `<button class="answer" data-k="${k}">${t}</button>`).join("")}</div>
          <div id="sqAfter"></div>
        </div>`);
      if (Sound.enabled) UI.speak(q.q);
      document.querySelectorAll("#modalContent .answer").forEach((b) => b.onclick = () => {
        const ok = +b.dataset.k === q.c; if (ok) { right++; Sound.correct(); } else Sound.wrong();
        document.querySelectorAll("#modalContent .answer").forEach((x) => { x.disabled = true; if (+x.dataset.k === q.c) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        $("sqAfter").innerHTML = `<div class="why">${ok ? "✅ Richtig! " : "❌ Nicht ganz. "}${q.why}</div><div class="row-gap"><button class="btn primary" id="sqNext">${i < qs.length - 1 ? "Nächste Frage ▶" : "Ergebnis 🏆"}</button></div>`;
        $("sqNext").onclick = () => { i++; if (i < qs.length) show(); else finish(); };
      });
    };
    const finish = () => {
      quizDone = true;
      G.onSurfaceQuiz(bodyId, right);
      UI.openModal(`<div class="discovery center">
        <div class="stars-row">${[1, 2, 3].map((k) => `<span class="${k <= right ? "" : "off"}">⭐</span>`).join("")}</div>
        <h2>${right} von ${qs.length} richtig</h2><p class="intro">Die Bodenstation ist beeindruckt!</p>
        <div class="row-gap"><button class="btn primary" id="sqClose">👍 Super</button></div></div>`);
      if (right === qs.length) { Sound.fanfare(); UI.confetti(); }
      $("sqClose").onclick = () => { UI.closeModal(); radio(cfg.radio.quizDone); };
    };
    show();
  }

  // ---------- Eingabe ----------
  let inputReady = false;
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
    $("sJump").addEventListener("pointerdown", (e) => { e.preventDefault(); jumpPressed = true; });
    $("surfAction").addEventListener("click", () => { actionPressed = true; });
    $("btnBoard").addEventListener("click", () => exit());

    // Kamera per Wischen/Ziehen drehen und neigen
    const canvas = $("scene"); let drag = null;
    canvas.addEventListener("pointerdown", (e) => { if (S.active) drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    window.addEventListener("pointermove", (e) => {
      if (!S.active || !drag || drag.id !== e.pointerId) return;
      view.yaw -= (e.clientX - drag.x) * 0.006;
      view.height = Math.max(0.8, Math.min(9, view.height + (e.clientY - drag.y) * 0.02));
      drag.x = e.clientX; drag.y = e.clientY; view.dragged = 1.5;
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
    ast.pos.set(sx, world.height(sx, sz), sz); ast.vy = 0; ast.onGround = true; ast.heading = 0.15; ast.speed = 0; ast.walked = 0;
    view.yaw = ast.heading; view.height = 3.2; view.special = null; view.dragged = 0;
    view.look.set(sx, ast.pos.y + 1.3, sz + 3);
    world.camera.position.set(sx - Math.sin(view.yaw) * 7, ast.pos.y + 3.2, sz - Math.cos(view.yaw) * 7);
    temp = { shown: 120, inShadow: false, shadowTime: 0, sunSeen: true, check: 0 };
    quizDone = (G.state.surfaceQuiz && G.state.surfaceQuiz[id] != null) || false;
    experiment = null; jumpPressed = actionPressed = false;
    world.hammer.visible = world.feather.visible = true;
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
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    S.active = false;
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
    const H = world.height, g = cfg.gravity;
    const paused = UI.modalOpen();

    // Eingabe → Bewegungsrichtung relativ zur Kamera
    let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x;
    let my = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;
    if (paused || view.special || experiment) { mx = my = 0; jumpPressed = false; }
    const len = Math.hypot(mx, my);
    const fwd = tmp.set(Math.sin(view.yaw), 0, Math.cos(view.yaw));
    const right = tmp2.set(-Math.cos(view.yaw), 0, Math.sin(view.yaw));
    // Tempo wie bei Apollo: Astronauten liefen im „Lope“ mit etwa 1 bis 2 m/s
    const LOPE_SPEED = 2.1;
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
    if (ast.onGround) ast.speed += (targetSpeed - ast.speed) * Math.min(1, dt * (targetSpeed > ast.speed ? 2.0 : 2.6));
    const hx = Math.sin(ast.heading), hz = Math.cos(ast.heading);
    ast.pos.x += hx * ast.speed * dt; ast.pos.z += hz * ast.speed * dt;

    // Hindernisse & Grenze
    for (const [cx, cz, r] of world.colliders) {
      const dx = ast.pos.x - cx, dz = ast.pos.z - cz, d = Math.hypot(dx, dz), min = r + 0.45;
      if (d < min && d > 0.001) { ast.pos.x = cx + (dx / d) * min; ast.pos.z = cz + (dz / d) * min; }
    }
    const far = Math.hypot(ast.pos.x, ast.pos.z);
    if (far > 150) {
      ast.pos.x *= 150 / far; ast.pos.z *= 150 / far;
      if (elapsed - farWarned > 12) { farWarned = elapsed; radio(cfg.radio.tooFar); }
    }

    // Springen & Lope-Schritte – echte Mond-Schwerkraft (1,62 m/s²)
    const ground = H(ast.pos.x, ast.pos.z);
    if (jumpPressed && ast.onGround) {
      // Realistisch: Anzug + Rucksack wiegen so viel wie ein Erwachsener → ca. 45 cm hoch, ~1,5 s in der Luft
      ast.vy = 1.2; ast.onGround = false; ast.jumpBase = ast.pos.y; ast.maxY = ast.pos.y; ast.jumping = true; ast.hopping = false;
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
          if (h > 0.3) discover("sprung", { hoehe: `${Math.round(h * 100)} Zentimeter`, zeit: ast.airT.toFixed(1).replace(".", ",") });
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

    // Astronaut darstellen
    const a = world.astronaut, u = a.userData;
    const speedFrac = Math.min(1, ast.speed / LOPE_SPEED);
    ast.phase += dt * (1.5 + ast.speed * 3);
    a.position.set(ast.pos.x, ast.pos.y, ast.pos.z);
    a.rotation.y = ast.heading;
    const hold = !!(experiment && experiment.t < 0.15);
    if (u.rig) {
      const mode = ast.jumping ? "jump" : (ast.hopping || (ast.speed > 0.7 && ast.onGround)) ? "lope" : ast.speed > 0.15 ? "walk" : "stand";
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
    if (temp.inShadow && temp.shadowTime > 1.8 && temp.sunSeen && !paused) discover("temperatur");
    const t = Math.round(temp.shown);
    const tEl = $("suitTemp");
    const tText = (t < 0 ? "−" : "") + Math.abs(t) + " °C";
    if (tEl.textContent !== tText) tEl.textContent = tText;
    $("suit").classList.toggle("cold", t < 0);
    $("suitState").textContent = temp.inShadow ? "❄️ Schatten – eiskalt!" : "☀️ Sonne – glühend heiß!";

    // Stationen: Nähe prüfen
    let near = null;
    for (const [key, st] of Object.entries(world.stations)) {
      const d = Math.hypot(ast.pos.x - st.x, ast.pos.z - st.z);
      if (key === "apollo" && Math.hypot(ast.pos.x - world.L.apollo[0], ast.pos.z - world.L.apollo[1]) < 9 && !paused) discover("apollo");
      if (cfg.stations[key].action && d < 3.2) near = key;
    }
    const act = $("surfAction");
    if (near && !experiment && !view.special && !paused) {
      act.classList.remove("hidden");
      act.innerHTML = `${cfg.stations[near].action} <kbd>E</kbd>`;
      if (actionPressed) startAction(near);
    } else act.classList.add("hidden");
    actionPressed = false;

    updateExperiment(dt);
    updateDust(dt);
    radioTimer -= dt; if (radioTimer <= 0) $("radio").classList.add("hidden");

    // Licht folgt dem Astronauten (scharfe Schatten in der Nähe)
    world.sun.target.position.copy(ast.pos);
    world.sun.position.copy(ast.pos).addScaledVector(SUN_DIR, 120);
    world.earth.rotation.y += dt * 0.02;

    updateCamera(dt);
    updateLabels();
  };

  function updateCamera(dt) {
    const c = world.camera;
    if (experiment) {
      // Nah heran: von der Seite zuschauen, wie Hammer und Feder fallen
      const hp = world.hammer.position, fp = world.feather.position;
      const mid = tmp2.set((hp.x + fp.x) / 2, experiment.ground + 0.85, (hp.z + fp.z) / 2);
      c.position.lerp(tmp.set(mid.x + experiment.fx * 3.4, experiment.ground + 1.1, mid.z + experiment.fz * 3.4), 1 - Math.exp(-dt * 3));
      view.look.lerp(mid, 1 - Math.exp(-dt * 4));
      c.lookAt(view.look);
      return;
    }
    if (view.special) {
      // Blick durchs Fernrohr zur Erde
      const sp = view.special; sp.t += dt;
      const eye = tmp.set(world.telescope.position.x, world.telescope.position.y + 1.7, world.telescope.position.z);
      c.position.lerp(eye, 1 - Math.exp(-dt * 3));
      view.look.lerp(world.earth.position, 1 - Math.exp(-dt * 2.5));
      c.lookAt(view.look);
      c.fov += ((sp.t < 5 ? 14 : 60) - c.fov) * Math.min(1, dt * 1.5); c.updateProjectionMatrix();
      $("scope").classList.toggle("hidden", !(sp.t > 0.8 && sp.t < 5));
      if (sp.t > 5.6) { view.special = null; $("scope").classList.add("hidden"); c.fov = 60; c.updateProjectionMatrix(); discover("himmel"); }
      return;
    }
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
    if (key === "himmel") { view.special = { t: 0 }; radioTimer = 0; $("radio").classList.add("hidden"); }
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
      discover("fallversuch");
    }
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
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1 || view.special) { el.style.display = "none"; continue; }
      const done = !!foundMap()[key];
      const text = `${done ? "✓" : "🔍"} ${cfg.stations[key].label}`;
      if (el.textContent !== text) el.textContent = text;
      el.classList.toggle("done", done);
      el.style.display = "";
      el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    }
  }

  if (/[?&]test/.test(location.search)) S._test = { ast, view, get world() { return world; }, discover, POSE, setBone };
  return S;
})();
