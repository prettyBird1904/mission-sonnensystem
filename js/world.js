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
    ship: null, flame: null, trail: [], puffs: { dust: [], fire: [] },
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

  // ---------- Die eigene Rakete ----------
  // Aufrecht gedacht gebaut (y nach oben): Füße der Flossen bei y = -0.95, Spitze bei 1.33. buildShip legt sie danach
  // so hin, dass die Spitze entlang -Z zeigt (Flugrichtung). Steht die Rakete auf einem Planeten (rotation.x = π/2),
  // entsprechen die Winkel hier (atan2(z, x)) genau den Richtungen am Boden: Flossen bei 90°, 210°, 330°, Luke bei 150°.
  const NOSE0 = 0.5, NOSE_L = 0.83, TAIL0 = -0.66, TAIL1 = -0.42, HULL_Y1 = NOSE0 + NOSE_L;
  const DOOR = { deg: 150, half: 20.5, y0: -0.135, y1: 0.275 }; // Luke (passt zu HATCH in surface.js)
  function hullR(y) {
    if (y <= TAIL1) { const t = Math.max(0, (y - TAIL0) / (TAIL1 - TAIL0)); return 0.215 + (hullR(TAIL1 + 1e-6) - 0.215) * Math.sin(t * Math.PI / 2); }
    if (y <= NOSE0) return 0.325 - 0.04 * Math.pow((y + 0.12) / 0.62, 2); // leicht bauchig
    const R = hullR(NOSE0), L = NOSE_L, rho = (R * R + L * L) / (2 * R), x = Math.max(0, NOSE0 + L - y); // Ogive: spitz wie bei echten Raketen
    return Math.max(0, Math.sqrt(rho * rho - (L - x) * (L - x)) + R - rho);
  }
  const hullU = (deg) => (((90 - deg) / 360) % 1 + 1) % 1;     // Richtung → u der Rumpf-Textur
  const hullV = (y) => (y - TAIL0) / (HULL_Y1 - TAIL0);        // Höhe → v (eine Textur für alle Rumpfteile)
  // Rumpfstück als Drehkörper zwischen y0 und y1 (wahlweise nur ein Ausschnitt rundherum: deg0 … deg1)
  function hullGeo(y0, y1, n, grow = 0, deg0, deg1) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * (i / n); pts.push(new THREE.Vector2(hullR(y) + grow, y)); }
    const part = deg0 != null, phi0 = part ? THREE.MathUtils.degToRad(90 - deg1) : 0, phiL = part ? THREE.MathUtils.degToRad(deg1 - deg0) : Math.PI * 2;
    const geo = new THREE.LatheGeometry(pts, part ? 12 : 48, phi0, phiL);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      if (part) uv.setX(i, hullU(THREE.MathUtils.radToDeg(Math.atan2(pos.getZ(i), pos.getX(i)))));
      uv.setY(i, hullV(pos.getY(i)));
    }
    geo.computeVertexNormals();
    return geo;
  }
  function rrect(g, x, y, w, h, r) { // abgerundetes Rechteck (roundRect fehlt auf älteren iPads)
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  // Lack mit Blechfugen und Nieten, Schachbrett am Heck, Wappen, Flaggen, Schrift und Tür-Umriss.
  // Alles hell/grau → die Teile in der gewählten Farbe bekommen dieselben Fugen.
  let hullTex = null, doorAlpha = null;
  const TEX = 1024, doorRect = () => {
    const X = (deg) => TEX * hullU(deg), Y = (y) => TEX * (1 - hullV(y));
    return { x: X(DOOR.deg + DOOR.half), y: Y(DOOR.y1), w: X(DOOR.deg - DOOR.half) - X(DOOR.deg + DOOR.half), h: Y(DOOR.y0) - Y(DOOR.y1), r: 22 };
  };
  function hullTexture() {
    if (hullTex) return hullTex;
    const c = document.createElement("canvas"); c.width = c.height = TEX;
    const g = c.getContext("2d");
    const X = (deg) => TEX * hullU(deg), Y = (y) => TEX * (1 - hullV(y));
    g.fillStyle = "#fff"; g.fillRect(0, 0, TEX, TEX);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.025})`; g.fillRect(Math.random() * TEX, Math.random() * TEX, 2 + Math.random() * 6, 1 + Math.random() * 3); }
    const sq = TEX / 16, h = Y(-0.56) - Y(-0.47); // Schachbrett am Heck
    g.fillStyle = "rgba(20,24,40,0.30)";
    for (let row = 0; row < 2; row++) for (let i = 0; i < 16; i++) if ((i + row) % 2) g.fillRect(i * sq, Y(-0.47) + row * h, sq, h);
    for (const y of [-0.6, -0.2, 0.1, 0.72, 0.95]) { // waagerechte Fugen mit Nieten
      g.fillStyle = "rgba(30,40,60,0.32)"; g.fillRect(0, Y(y) - 1.5, TEX, 3);
      g.fillStyle = "rgba(30,40,60,0.26)";
      for (let x = 6; x < TEX; x += 16) for (const s of [-7, 7]) { g.beginPath(); g.arc(x, Y(y) + s, 1.8, 0, Math.PI * 2); g.fill(); }
    }
    g.fillStyle = "rgba(30,40,60,0.22)"; // senkrechte Fugen (8 Platten)
    for (let i = 0; i < 8; i++) g.fillRect((i + 0.5) * TEX / 8 - 1, Y(0.5), 2, Y(-0.42) - Y(0.5));
    const d = doorRect(); // Luke (geschlossen)
    g.fillStyle = "#fff"; g.fillRect(d.x - 8, d.y - 8, d.w + 16, d.h + 16);
    g.lineWidth = 5; g.strokeStyle = "rgba(30,40,60,0.55)"; rrect(g, d.x, d.y, d.w, d.h, d.r); g.stroke();
    g.lineWidth = 2; g.strokeStyle = "rgba(30,40,60,0.25)"; rrect(g, d.x + 9, d.y + 9, d.w - 18, d.h - 18, d.r - 8); g.stroke();
    g.fillStyle = "rgba(30,40,60,0.6)"; g.fillRect(d.x + d.w - 22, d.y + d.h / 2 - 18, 8, 36); // Griff
    // Wappen „Mission Sonnensystem“ über der Luke (150°) – dort schaut man beim Einsteigen direkt drauf, nichts verdeckt es
    const px = X(150), py = Y(0.385), pr = 50;
    g.fillStyle = "#1e3a8a"; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    g.lineWidth = 6; g.strokeStyle = "#facc15"; g.stroke();
    g.fillStyle = "#fde047"; g.beginPath(); g.arc(px - 16, py + 6, 13, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 2; g.beginPath(); g.ellipse(px - 16, py + 6, 34, 14, -0.3, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#60a5fa"; g.beginPath(); g.arc(px + 15, py - 4, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff"; for (const [sx, sy] of [[12, -26], [-26, -22], [26, 20], [-4, 30]]) { g.beginPath(); g.arc(px + sx, py + sy, 2.2, 0, Math.PI * 2); g.fill(); }
    for (const a of [30, 270]) { // Flagge + Schrift senkrecht auf den beiden freien Seiten
      const fx = X(a), fy = Y(0.4);
      [["#111", 0], ["#dd0000", 1], ["#ffce00", 2]].forEach(([col, k]) => { g.fillStyle = col; g.fillRect(fx - 30, fy - 21 + k * 14, 60, 14); });
      g.save(); g.translate(fx, Y(-0.37)); g.rotate(-Math.PI / 2);
      g.fillStyle = "#1e293b"; g.font = "bold 38px Fredoka, Arial, sans-serif"; g.textBaseline = "middle";
      g.fillText("SONNENSYSTEM", 0, 0); g.restore();
    }
    hullTex = new THREE.CanvasTexture(c);
    hullTex.encoding = THREE.sRGBEncoding; hullTex.anisotropy = 4;
    return hullTex;
  }
  // Nur die Tür (für die aufklappende Luke): weiß in der Tür, sonst schwarz
  function doorAlphaTexture() {
    if (doorAlpha) return doorAlpha;
    const c = document.createElement("canvas"); c.width = c.height = 256; // reicht für eine Maske
    const g = c.getContext("2d"), d = doorRect();
    g.scale(256 / TEX, 256 / TEX);
    g.fillStyle = "#000"; g.fillRect(0, 0, TEX, TEX);
    g.fillStyle = "#fff"; rrect(g, d.x - 2, d.y - 2, d.w + 4, d.h + 4, d.r); g.fill();
    doorAlpha = new THREE.CanvasTexture(c);
    return doorAlpha;
  }

  // Flamme: hell an der Düse, wird nach hinten schmal und verblasst (Farbverlauf statt harter Kegel)
  let flameTex = null;
  function flameTexture() {
    if (flameTex) return flameTex;
    const c = document.createElement("canvas"); c.width = 8; c.height = 128;
    const g = c.getContext("2d"), gr = g.createLinearGradient(0, 128, 0, 0); // unten (v = 0) = Düse
    gr.addColorStop(0, "#fff7e0"); gr.addColorStop(0.18, "#ffd27a"); gr.addColorStop(0.5, "#ff8a2a"); gr.addColorStop(0.8, "#7a2a08"); gr.addColorStop(1, "#000");
    g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
    flameTex = new THREE.CanvasTexture(c); flameTex.encoding = THREE.sRGBEncoding;
    return flameTex;
  }
  function buildFlame() {
    const flame = new THREE.Group();
    const cone = (r, len, op) => {
      const geo = new THREE.CylinderGeometry(r * 0.15, r, len, 20, 6, true); // schmal am Ende
      geo.rotateX(Math.PI / 2); geo.translate(0, 0, len / 2);   // Düse bei z = 0, Flamme nach +Z
      const pos = geo.attributes.position, uv = geo.attributes.uv; // v: 0 an der Düse, 1 am Ende
      for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getZ(i) / len);
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: flameTexture(), color: 0xffffff, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    };
    const outer = cone(0.17, 1.0, 0.75), core = cone(0.085, 0.55, 0.95);
    core.material.color.set(0xfff4d6);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowTexture("rgba(255,240,200,1)", "rgba(255,150,50,0.45)"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
    glow.scale.set(0.55, 0.55, 1); glow.position.z = 0.06;
    flame.add(outer, core, glow);
    for (const o of flame.children) {
      o.raycast = () => {};  // wirft keinen Schatten-Strahl (Thermometer) und Sprites bräuchten dafür eine Kamera
      o.renderOrder = 5;     // nach halbdurchsichtigen Himmelskugeln zeichnen (Intro), sonst liegt der Himmel wie ein Schleier darüber
    }
    return flame;
  }

  function buildShip(color) {
    const g = new THREE.Group(), up = new THREE.Group();
    up.rotation.x = -Math.PI / 2; // aufrecht gebaut → Spitze entlang -Z
    g.add(up);
    const tex = hullTexture();
    const main = new THREE.MeshStandardMaterial({ color: 0xf8fafc, map: tex, roughness: 0.42, metalness: 0.08 });
    const accent = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), map: tex, roughness: 0.4, metalness: 0.08 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.65 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide });
    const glass = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.08, metalness: 0.3, emissive: 0x0c4a6e, emissiveIntensity: 0.9 });

    // Rumpf in Farbzonen: Heck (Farbe), Mitte (weiß), Spitze (Farbe), dazwischen schmale Zierbänder
    up.add(new THREE.Mesh(hullGeo(TAIL0, TAIL1, 10), accent));
    up.add(new THREE.Mesh(hullGeo(TAIL1, NOSE0, 24), main));
    up.add(new THREE.Mesh(hullGeo(NOSE0, HULL_Y1 - 0.025, 30), accent));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), trim); tip.position.y = HULL_Y1 - 0.03; up.add(tip);
    for (const y of [TAIL1, NOSE0]) up.add(new THREE.Mesh(hullGeo(y - 0.012, y + 0.012, 2, 0.008), trim));
    // Boden + Triebwerksglocke
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.216, 32), dark); floor.rotation.x = Math.PI / 2; floor.position.y = TAIL0; up.add(floor);
    const bell = [[0.11, -0.64], [0.1, -0.67], [0.115, -0.72], [0.15, -0.77], [0.19, -0.805], [0.198, -0.81]].map(([r, y]) => new THREE.Vector2(r, y));
    up.add(new THREE.Mesh(new THREE.LatheGeometry(bell, 28), dark));
    const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.196, 0.008, 6, 28), trim); bellRim.rotation.x = Math.PI / 2; bellRim.position.y = -0.808; up.add(bellRim);
    const hot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: 0xff8a3d, toneMapped: false }));
    hot.rotation.x = Math.PI / 2; hot.position.y = -0.66; up.add(hot);

    // Bullaugen mit Metallrahmen: groß oben (im Flug sichtbar), klein über der Luke
    for (const [deg, y, r] of [[90, 0.33, 0.085]]) { // großes Bullauge oben (im Flug sichtbar); über der Luke sitzt das Wappen
      const a = THREE.MathUtils.degToRad(deg), R = hullR(y), nx = Math.cos(a), nz = Math.sin(a);
      const w = new THREE.Group(); w.position.set(nx * R, y, nz * R); w.lookAt(nx * 2, y, nz * 2);
      w.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 8, 28), trim));
      const pane = new THREE.Mesh(new THREE.SphereGeometry(r * 0.95, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), glass);
      pane.rotation.x = Math.PI / 2; pane.position.z = -r * 0.95 * Math.cos(Math.PI * 0.32) + 0.004; w.add(pane);
      const shine = new THREE.Mesh(new THREE.CircleGeometry(r * 0.22, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
      shine.position.set(-r * 0.35, r * 0.35, 0.012); w.add(shine);
      up.add(w);
    }

    // Flossen: gepfeilt, mit runden Kanten; an den Spitzen Landefüße – darauf steht die Rakete. Positionslichter rot/grün/weiß.
    const fs = new THREE.Shape(), rootTop = -0.08, rootBot = -0.62;
    fs.moveTo(hullR(rootTop) - 0.02, rootTop);
    fs.bezierCurveTo(0.42, -0.2, 0.55, -0.42, 0.585, -0.7);
    fs.lineTo(0.6, -0.9); fs.quadraticCurveTo(0.6, -0.935, 0.565, -0.935);
    fs.lineTo(0.5, -0.935); fs.quadraticCurveTo(0.47, -0.935, 0.462, -0.9);
    fs.bezierCurveTo(0.44, -0.74, 0.36, -0.66, hullR(rootBot) - 0.02, rootBot);
    fs.closePath();
    const finGeo = new THREE.ExtrudeGeometry(fs, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 3, curveSegments: 14 });
    finGeo.translate(0, 0, -0.02);
    const footGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.025, 16), lampGeo = new THREE.SphereGeometry(0.016, 10, 8);
    [0xff3b3b, 0x22e06b, 0xffffff].forEach((lc, i) => {
      const holder = new THREE.Group(); holder.rotation.y = -THREE.MathUtils.degToRad(90 + i * 120); up.add(holder); // +X zeigt nach außen
      holder.add(new THREE.Mesh(finGeo, accent));
      const foot = new THREE.Mesh(footGeo, dark); foot.position.set(0.532, -0.938, 0); holder.add(foot);
      const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: lc, toneMapped: false })); lamp.position.set(0.598, -0.69, 0); holder.add(lamp);
    });

    const flame = buildFlame();
    flame.position.z = 0.8; // an der Glocke
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
    buildPuffs();

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

  // Staubwolken und Abgas beim Landen/Starten: Sie hängen am Himmelskörper (ziehen mit ihm weiter und drehen sich mit),
  // statt frei im All stehen zu bleiben. Staub ist matt in der Farbe des Bodens, nur das Abgas leuchtet.
  function buildPuffs() {
    const dustTex = T.glowTexture("rgba(255,255,255,0.85)", "rgba(255,255,255,0.4)");
    const fireTex = T.glowTexture("rgba(255,236,190,1)", "rgba(255,140,60,0.5)");
    for (const [kind, tex, n] of [["dust", dustTex, FAST ? 40 : 90], ["fire", fireTex, FAST ? 30 : 60]]) {
      for (let i = 0; i < n; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: kind === "fire" ? THREE.AdditiveBlending : THREE.NormalBlending }));
        s.visible = false; s.userData = { life: 0, max: 1, size: 1, v: new THREE.Vector3(), kind };
        W.puffs[kind].push(s);
      }
    }
    W.puffIndex = { dust: 0, fire: 0 };
  }
  // pos/vel in den Koordinaten von parent (z. B. der Planetenkugel)
  function emitPuff(kind, parent, pos, vel, size, life, color) {
    const list = W.puffs[kind], s = list[W.puffIndex[kind]];
    W.puffIndex[kind] = (W.puffIndex[kind] + 1) % list.length;
    if (s.parent !== parent) parent.add(s);
    s.position.copy(pos); s.userData.v.copy(vel);
    s.userData.size = size; s.userData.max = s.userData.life = life;
    if (color != null) s.material.color.set(color);
    s.visible = true;
  }
  function updatePuffs(dt) {
    for (const kind of ["dust", "fire"]) for (const s of W.puffs[kind]) {
      if (!s.visible) continue;
      const u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { s.visible = false; continue; }
      s.position.addScaledVector(u.v, dt);
      u.v.multiplyScalar(Math.exp(-dt * (kind === "dust" ? 2.2 : 3)));
      const k = u.life / u.max, grow = 1 - k;
      s.material.opacity = (kind === "dust" ? 0.6 : 0.8) * k * Math.min(1, grow * 8);
      s.scale.setScalar(u.size * (kind === "dust" ? 0.45 + grow * 1.4 : 0.6 + grow * 0.9));
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
    updatePuffs(dt);
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
  // Maße und Lack der Rakete – surface.js baut daraus die aufklappende Luke (gleiche Einheiten wie die Rakete, aufrecht)
  W.rocketHull = { r: hullR, door: DOOR, geo: hullGeo, tex: hullTexture, doorAlpha: doorAlphaTexture };
  W.emitTrail = emitTrail;
  W.emitPuff = emitPuff;
  W.randomDustPos = randomDustPos;
  return W;
})();
