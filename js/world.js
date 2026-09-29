/* =========================================================
   3D-Welt: Sonne, Planeten, Sterne, Asteroiden, Raumschiff
   ========================================================= */
window.World = (function () {
  const D = window.SPACE_DATA;
  const T = window.Textures;
  const W = {
    renderer: null, scene: null, camera: null,
    bodies: {},        // id -> { data, group, mesh, pivot, spin }
    stardust: [],
    ship: null, flame: null, trail: [],
    belt: null, sunGlow: [],
    timeScale: 1
  };

  const nextFrame = () => new Promise((r) => setTimeout(r, 0));
  // Tablets/Handys: etwas weniger Grafiklast, damit es flüssig läuft
  const LITE = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 0;
  // Höchste Render-Auflösung; die automatische Qualitätsregelung (game.js) geht bei Ruckeln darunter.
  // Grafik-Modus (Hilfe → Grafik): "schnell" = ⚡ Flüssig für schwächere Geräte
  let FAST = false;
  try { FAST = localStorage.getItem("ms-grafik") === "schnell"; } catch (e) { /* egal */ }
  W.fast = FAST;
  W.lite = LITE;
  W.maxPixelRatio = FAST ? 1 : Math.min(window.devicePixelRatio || 1, LITE ? 1.5 : 2);

  function rimMaterial(color, power = 2.5, intensity = 1.2) {
    return new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, power: { value: power }, intensity: { value: intensity } },
      vertexShader: `
        varying vec3 vN; varying vec3 vV;
        void main(){
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 color; uniform float power; uniform float intensity;
        varying vec3 vN; varying vec3 vV;
        void main(){
          float f = pow(1.0 - max(dot(vN, vV), 0.0), power) * intensity;
          gl_FragColor = vec4(color, f);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
  }

  function makeRing(inner, outer, faint) {
    const geo = new THREE.RingGeometry(inner, outer, 128, 1);
    const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    const mat = new THREE.MeshStandardMaterial({
      map: T.ringTexture(faint), transparent: true, side: THREE.DoubleSide,
      depthWrite: false, roughness: 1, metalness: 0
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }

  function buildShip(color) {
    const g = new THREE.Group();
    const main = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.4 });
    const accent = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.4, metalness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.1, metalness: 0.6, emissive: 0x0ea5e9, emissiveIntensity: 0.6 });

    // Rumpf zeigt entlang -Z (Blickrichtung)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.3, 24), main);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 24), accent);
    nose.rotation.x = -Math.PI / 2; nose.position.z = -1.0;
    g.add(nose);
    const window1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), glass);
    window1.position.set(0, 0.2, -0.35);
    g.add(window1);
    const ringBand = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.04, 8, 24), accent);
    ringBand.position.z = 0.25;
    g.add(ringBand);
    // Flossen
    const finGeo = new THREE.BoxGeometry(0.05, 0.45, 0.5);
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(finGeo, accent);
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      fin.position.set(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0.45);
      fin.rotation.z = a - Math.PI / 2;
      g.add(fin);
    }
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.2, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }));
    nozzle.rotation.x = Math.PI / 2; nozzle.position.z = 0.75;
    g.add(nozzle);

    // Flamme
    const flame = new THREE.Group();
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    f1.rotation.x = -Math.PI / 2; f1.position.z = 0.5;
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    f2.rotation.x = -Math.PI / 2; f2.position.z = 0.35;
    flame.add(f1, f2);
    flame.position.z = 0.85;
    g.add(flame);

    // Scheinwerfer-Licht, damit das Schiff im Schatten sichtbar bleibt
    const shipLight = new THREE.PointLight(0xffffff, 0.6, 6);
    shipLight.position.set(0, 1.5, 1.5);
    g.add(shipLight);

    g.userData.accent = accent;
    W.flame = flame;
    return g;
  }

  function setShipColor(color) {
    if (W.ship) W.ship.userData.accent.color.set(color);
  }

  async function build(canvas, shipColor, onProgress) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !FAST && (window.devicePixelRatio || 1) < 1.5, powerPreference: "high-performance" });
    renderer.setPixelRatio(W.maxPixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    W.renderer = renderer;

    const scene = new THREE.Scene();
    W.scene = scene;
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 6000);
    W.camera = camera;

    onProgress(0.05, "Male den Weltraum …"); await nextFrame();

    // Hintergrund
    const bg = new THREE.Mesh(new THREE.SphereGeometry(2500, 48, 24),
      new THREE.MeshBasicMaterial({ map: T.nebulaTexture(), side: THREE.BackSide, depthWrite: false, toneMapped: false }));
    scene.add(bg);
    W.bg = bg;

    // Sterne
    const dot = T.dotTexture();
    [[FAST ? 2500 : LITE ? 4000 : 7000, 2.2, 0.8], [FAST ? 500 : 900, 4.5, 1]].forEach(([n, size, op]) => {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      const palette = [[1, 1, 1], [0.75, 0.85, 1], [1, 0.92, 0.75], [1, 0.8, 0.8]];
      for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 1500 + Math.random() * 800;
        const s = Math.sqrt(1 - u * u);
        pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
        const c = palette[(Math.random() * palette.length) | 0], b = 0.5 + Math.random() * 0.5;
        col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        size, sizeAttenuation: false, map: dot, vertexColors: true, transparent: true,
        opacity: op, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      scene.add(pts);
    });

    // Licht
    scene.add(new THREE.AmbientLight(0x6070a0, 0.28));
    const sunLight = new THREE.PointLight(0xfff1dd, 1.75, 0);
    scene.add(sunLight);

    // Himmelskörper
    const list = D.bodies;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      onProgress(0.1 + (i / list.length) * 0.75, `Erschaffe ${b.name} …`);
      await nextFrame();
      buildBody(b);
    }

    onProgress(0.88, "Verteile Asteroiden …"); await nextFrame();
    buildBelt();
    buildStardust();

    onProgress(0.95, "Tanke das Raumschiff …"); await nextFrame();
    W.ship = buildShip(shipColor);
    scene.add(W.ship);
    buildTrail();

    onProgress(1, "Bereit zum Start!");
    return W;
  }

  function buildBody(b) {
    const scene = W.scene;
    const entry = { data: b };
    if (b.id === "sonne") {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(b.radius, 64, 48),
        new THREE.MeshBasicMaterial({ map: T.planetTexture("sonne", 512), toneMapped: false }));
      scene.add(mesh);
      const glow1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowTexture("rgba(255,240,200,1)", "rgba(255,170,60,0.55)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      glow1.scale.set(b.radius * 4.2, b.radius * 4.2, 1);
      const glow2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowTexture("rgba(255,200,120,0.6)", "rgba(255,120,40,0.18)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      glow2.scale.set(b.radius * 9, b.radius * 9, 1);
      scene.add(glow1, glow2);
      W.sunGlow = [glow1, glow2];
      entry.group = mesh; entry.mesh = mesh;
      W.bodies[b.id] = entry;
      return;
    }

    const parent = b.parent ? W.bodies[b.parent].group : scene;
    const pivot = new THREE.Group();
    pivot.rotation.y = Math.random() * Math.PI * 2;
    parent.add(pivot);

    // Umlaufbahn
    if (!b.parent) {
      const pts = [];
      for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * b.distance, 0, Math.sin(a) * b.distance)); }
      const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.16 }));
      scene.add(orbit);
      entry.orbitLine = orbit;
    }

    const group = new THREE.Group();
    group.position.x = b.distance;
    pivot.add(group);

    const tilt = new THREE.Group();
    tilt.rotation.z = THREE.MathUtils.degToRad(b.tilt || 0);
    group.add(tilt);

    const big = b.radius > 4;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(b.radius, 64, 48),
      new THREE.MeshStandardMaterial({ map: T.planetTexture(b.id, FAST ? 512 : b.id === "erde" ? (LITE ? 768 : 1024) : big && !LITE ? 768 : 512), roughness: 0.95, metalness: 0 }));
    tilt.add(mesh);

    const atmo = { erde: 0x5aa9ff, venus: 0xffd28a, mars: 0xff9a6a, uranus: 0x9ff3ff, neptun: 0x6b8cff, jupiter: 0xffe0b0, saturn: 0xffe8c0 }[b.id];
    if (atmo) {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(b.radius * 1.025, 48, 32), rimMaterial(atmo, 2.6, b.id === "erde" ? 1.6 : b.kind === "Gasriese" ? 0.5 : 1.1));
      tilt.add(shell);
    }
    if (b.id === "erde") {
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(b.radius * 1.012, 64, 48),
        new THREE.MeshStandardMaterial({ map: T.cloudTexture(), transparent: true, depthWrite: false, roughness: 1 }));
      tilt.add(clouds);
      entry.clouds = clouds;
    }
    if (b.rings) {
      const ring = b.faintRings ? makeRing(b.radius * 1.5, b.radius * 2.0, true) : makeRing(b.radius * 1.25, b.radius * 2.3, false);
      tilt.add(ring);
    }

    entry.pivot = pivot; entry.group = group; entry.mesh = mesh;
    entry.orbitSpeed = b.orbitYears ? 0.045 / Math.sqrt(b.orbitYears) : 0;
    entry.spin = b.id === "venus" ? -0.05 : (b.kind === "Gasriese" ? 0.25 : 0.12);
    W.bodies[b.id] = entry;
  }

  function buildBelt() {
    const n = FAST ? 350 : LITE ? 700 : 1100;
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a7f72, roughness: 1, flatShading: true });
    const belt = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 128 + Math.random() * 22;
      p.set(Math.cos(a) * r, (Math.random() - 0.5) * 4, Math.sin(a) * r);
      e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); q.setFromEuler(e);
      const k = 0.12 + Math.pow(Math.random(), 3) * 0.7;
      s.set(k, k * (0.6 + Math.random() * 0.6), k);
      m.compose(p, q, s);
      belt.setMatrixAt(i, m);
      belt.setColorAt(i, new THREE.Color().setHSL(0.07, 0.15, 0.3 + Math.random() * 0.3));
    }
    W.scene.add(belt);
    W.belt = belt;
  }

  function randomDustPos(v) {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 330;
    return v.set(Math.cos(a) * r, (Math.random() - 0.5) * 14, Math.sin(a) * r);
  }

  function buildStardust() {
    const geo = new THREE.OctahedronGeometry(0.55, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffb300, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.5 });
    const glowMat = new THREE.SpriteMaterial({ map: T.glowTexture("rgba(255,240,150,0.9)", "rgba(255,190,40,0.35)"), blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 70; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, mat));
      const sp = new THREE.Sprite(glowMat); sp.scale.set(3.2, 3.2, 1);
      g.add(sp);
      randomDustPos(g.position);
      g.userData.phase = Math.random() * 10;
      W.scene.add(g);
      W.stardust.push(g);
    }
  }

  function buildTrail() {
    const mat = new THREE.SpriteMaterial({ map: T.glowTexture("rgba(255,220,160,1)", "rgba(255,140,60,0.5)"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    for (let i = 0; i < (FAST ? 30 : 90); i++) {
      const s = new THREE.Sprite(mat.clone());
      s.visible = false;
      s.userData = { life: 0, max: 1 };
      W.scene.add(s);
      W.trail.push(s);
    }
    W.trailIndex = 0;
  }

  const tmp = new THREE.Vector3();
  function update(dt, elapsed, paused) {
    const ts = paused ? 0 : W.timeScale;
    for (const id in W.bodies) {
      const e = W.bodies[id];
      if (id === "sonne") { e.mesh.rotation.y += dt * 0.03; continue; }
      if (e.pivot) e.pivot.rotation.y += dt * e.orbitSpeed * ts;
      e.mesh.rotation.y += dt * e.spin;
      if (e.clouds) e.clouds.rotation.y += dt * 0.03;
    }
    if (W.belt) W.belt.rotation.y += dt * 0.006 * ts;
    const pulse = 1 + Math.sin(elapsed * 1.5) * 0.03;
    W.sunGlow.forEach((g, i) => { g.material.rotation += dt * (i ? -0.01 : 0.02); g.scale.setScalar(D.bodies[0].radius * (i ? 9 : 4.2) * (i ? 1 : pulse)); });
    for (const s of W.stardust) {
      s.rotation.y += dt * 1.5;
      s.children[0].position.y = Math.sin(elapsed * 2 + s.userData.phase) * 0.25;
    }
    for (const t of W.trail) {
      if (!t.visible) continue;
      t.userData.life -= dt;
      if (t.userData.life <= 0) { t.visible = false; continue; }
      const k = t.userData.life / t.userData.max;
      t.material.opacity = k * 0.7;
      t.scale.setScalar((0.25 + (1 - k) * 0.9) * t.userData.size);
    }
  }

  function emitTrail(pos, strength, size = 1) {
    const s = W.trail[W.trailIndex];
    W.trailIndex = (W.trailIndex + 1) % W.trail.length;
    s.position.copy(pos);
    s.userData.max = s.userData.life = 0.35 + strength * 0.6;
    s.userData.size = size;
    s.visible = true;
  }

  function worldPos(id, out) {
    return W.bodies[id].group.getWorldPosition(out || tmp);
  }

  W.build = build;
  W.update = update;
  W.worldPos = worldPos;
  W.setShipColor = setShipColor;
  // Zusätzliche Rakete (z. B. auf dem Mond), ohne die Flamme des Spieler-Schiffs zu überschreiben
  W.makeRocket = (color) => { const f = W.flame; const r = buildShip(color); r.userData.flame = W.flame; W.flame = f; return r; };
  W.emitTrail = emitTrail;
  W.randomDustPos = randomDustPos;
  return W;
})();
