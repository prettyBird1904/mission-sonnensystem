/* =========================================================
   Spiellogik: Zustand, Steuerung, Autopilot, Missionen
   ========================================================= */
(function () {
  const D = window.SPACE_DATA;
  const W = window.World;
  const UI = window.UI;
  const STORE_KEY = "mission-sonnensystem-v1";
  const V = THREE.Vector3;
  // Test-Modus: Animation auch in Hintergrund-Tabs (nur für Entwicklung)
  if (/[?&]test/.test(location.search)) window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);

  // ---------- Spielstand ----------
  function freshState(name, color) {
    return { name: name || "Astronaut", color: color || "#ef4444", visited: {}, quiz: {}, mission: 0, dust: 0, dustStars: 0, orderStars: 0, hint: false };
  }
  // Mehrere Kinder können sich ein Tablet teilen: jedes hat ein eigenes Profil.
  const profileKey = (name) => name.trim().toLowerCase();
  function loadStore() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.profiles) return s;
      if (s && s.name) return { profiles: { [profileKey(s.name)]: s }, last: profileKey(s.name) }; // altes Format
    } catch (e) { /* ignorieren */ }
    return { profiles: {}, last: null };
  }
  function writeStore(store) { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignorieren */ } }

  const Game = {
    state: null,
    mode: "intro",           // intro | countdown | fly | auto | explore
    exploring: null,
    bodyById: {},
    save() {
      const store = loadStore(), k = profileKey(this.state.name);
      store.profiles[k] = this.state; store.last = k;
      writeStore(store);
    },
    reset() {
      const store = loadStore();
      delete store.profiles[profileKey(this.state.name)];
      store.last = null;
      writeStore(store);
      location.reload();
    },
    totalStars() {
      const s = this.state;
      const quiz = Object.values(s.quiz).reduce((a, b) => a + b, 0);
      return quiz + Math.min(s.mission, D.missions.length) + s.orderStars + s.dustStars;
    },
    currentMission() { return D.missions[this.state.mission] || null; }
  };
  D.bodies.forEach((b) => (Game.bodyById[b.id] = b));
  window.Game = Game;

  // ---------- Schiff-Physik ----------
  const ship = { pos: new V(), yaw: 0, pitch: 0, bank: 0, speed: 0, gas: 0 };
  const input = { keys: {}, joyX: 0, joyY: 0, tGas: false, tBoost: false, dragX: 0, dragY: 0 };
  const cam = { look: new V(), exploreAngle: 0 };
  let ap = null;              // Autopilot: { id, waypoint }
  let lastHeatWarn = 0;
  const tmpA = new V(), tmpB = new V(), tmpC = new V(), UP = new V(0, 1, 0);

  function forwardVec(out) {
    const cp = Math.cos(ship.pitch);
    return out.set(-Math.sin(ship.yaw) * cp, Math.sin(ship.pitch), -Math.cos(ship.yaw) * cp);
  }
  function aimAt(dir) {
    ship.yaw = Math.atan2(-dir.x, -dir.z);
    ship.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
  }
  function angleLerp(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  function bodyPos(id, out) { return W.worldPos(id, out); }

  // ---------- Missionen & Sterne ----------
  function markVisited(id) {
    const s = Game.state;
    if (!s.visited[id]) {
      s.visited[id] = true;
      UI.toast(`📘 Neuer Stempel im Forscherpass: ${Game.bodyById[id].name}!`, "gold");
    }
    const m = Game.currentMission();
    if (m && m.target === id) completeMission();
    Game.save();
    UI.updateHUD();
  }

  function completeMission() {
    const s = Game.state;
    s.mission++;
    s.hint = false;
    Game.save();
    Sound.fanfare();
    UI.confetti();
    const next = Game.currentMission();
    UI.celebrate("🏅", "Mission geschafft!", next ? "+1 ⭐ – Deine nächste Mission wartet schon!" : "Du hast ALLE Missionen geschafft! Hol dir deine Urkunde im Forscherpass.");
    UI.updateHUD(true);
  }
  Game.completeMission = completeMission;

  Game.onQuizFinished = function (id, stars) {
    const s = Game.state;
    const prev = s.quiz[id] || 0;
    if (stars > prev) {
      s.quiz[id] = stars;
      UI.toast(`+${stars - prev} ⭐ für das ${Game.bodyById[id].name}-Quiz!`, "gold");
      Game.save();
      UI.updateHUD(true);
    }
  };

  Game.onOrderFinished = function (stars) {
    const s = Game.state;
    if (stars > s.orderStars) { s.orderStars = stars; }
    const m = Game.currentMission();
    Game.save();
    if (m && m.target === "#order") completeMission();
    UI.updateHUD(true);
  };

  Game.toggleHint = function () {
    Game.state.hint = !Game.state.hint;
    Game.save();
    UI.updateHUD();
    if (Game.state.hint) {
      const m = Game.currentMission();
      if (m && m.target !== "#order") UI.toast(`💡 Folge dem gelben Pfeil – oder tippe unten auf „${Game.bodyById[m.target].name}“!`);
      else if (m) UI.toast("💡 Tippe oben rechts auf 🧩 „Ordnen“!");
    }
  };

  // ---------- Modi ----------
  Game.startAutopilot = function (id) {
    if (Game.mode === "countdown" || Game.mode === "intro") return;
    if (Game.mode === "explore") {
      if (Game.exploring === id) return;
      leaveExplore();
    }
    const P = bodyPos(id, new V());
    ap = { id, waypoint: null };
    // Nicht durch die Sonne fliegen: ggf. Umweg über einen Wegpunkt
    if (id !== "sonne") {
      const seg = tmpA.copy(P).sub(ship.pos);
      const t = THREE.MathUtils.clamp(-ship.pos.dot(seg) / seg.lengthSq(), 0, 1);
      const closest = tmpB.copy(ship.pos).addScaledVector(seg, t);
      if (closest.length() < 34) {
        const perp = tmpC.copy(seg).cross(UP).normalize();
        ap.waypoint = perp.multiplyScalar(48).setY(18).clone();
      }
    }
    Game.mode = "auto";
    UI.setAutopilot(Game.bodyById[id].name);
    Sound.whoosh();
  };

  Game.cancelAutopilot = function () {
    if (Game.mode !== "auto") return;
    ap = null;
    Game.mode = "fly";
    UI.setAutopilot(null);
  };

  Game.explore = function (id) {
    ap = null;
    UI.setAutopilot(null);
    Game.mode = "explore";
    Game.exploring = id;
    ship.speed = 0;
    const P = bodyPos(id, new V());
    cam.exploreAngle = Math.atan2(ship.pos.z - P.z, ship.pos.x - P.x);
    W.ship.visible = false;
    Sound.arrive();
    Sound.engine(0);
    UI.openPanel(id);
    markVisited(id);
  };

  function leaveExplore() {
    const id = Game.exploring;
    if (!id) return;
    const b = Game.bodyById[id];
    const P = bodyPos(id, new V());
    const radial = tmpA.copy(W.camera.position).sub(P).setY(0).normalize();
    ship.pos.copy(P).addScaledVector(radial, b.radius * 2.4 + 4);
    ship.pos.y += b.radius * 0.4;
    const tangent = tmpB.copy(UP).cross(radial).normalize();
    aimAt(tangent);
    ship.speed = 0;
    W.ship.visible = true;
    Game.exploring = null;
    Game.mode = "fly";
    UI.closePanel();
  }
  Game.leaveExplore = leaveExplore;

  // ---------- Eingabe ----------
  function setupInput(canvas) {
    const block = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "];
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (block.includes(e.key)) e.preventDefault();
      const k = e.key.toLowerCase();
      input.keys[k] = true;
      if (Game.mode === "auto" && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) Game.cancelAutopilot();
      if (k === "e" && Game.mode === "fly" && UI.nearId) Game.explore(UI.nearId);
      if (k === "escape") {
        if (UI.modalOpen()) UI.closeModal();
        else if (Game.mode === "explore") Game.leaveExplore();
        else if (Game.mode === "auto") Game.cancelAutopilot();
      }
    });
    window.addEventListener("keyup", (e) => { input.keys[e.key.toLowerCase()] = false; });
    window.addEventListener("blur", () => { input.keys = {}; });

    // Maus/Finger ziehen auf dem Bild = lenken
    let drag = null;
    canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; Sound.unlock(); });
    window.addEventListener("pointermove", (e) => {
      if (!drag || drag.id !== e.pointerId || Game.mode !== "fly") return;
      input.dragX += e.clientX - drag.x; input.dragY += e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
    });
    window.addEventListener("pointerup", (e) => { if (drag && drag.id === e.pointerId) drag = null; });

    // Joystick
    const joy = document.getElementById("joy"), knob = document.getElementById("joyKnob");
    let joyId = null;
    const joyMove = (e) => {
      const r = joy.getBoundingClientRect();
      let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      input.joyX = x; input.joyY = y;
      knob.style.transform = `translate(${x * 38}px, ${y * 38}px)`;
      if (Game.mode === "auto" && l > 0.3) Game.cancelAutopilot();
    };
    joy.addEventListener("pointerdown", (e) => {
      joyId = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch (err) { /* ältere Browser */ }
      joyMove(e);
    });
    joy.addEventListener("pointermove", (e) => { if (e.pointerId === joyId) joyMove(e); });
    const joyEnd = (e) => { if (e.pointerId !== joyId) return; joyId = null; input.joyX = input.joyY = 0; knob.style.transform = ""; };
    joy.addEventListener("pointerup", joyEnd); joy.addEventListener("pointercancel", joyEnd);

    [["tGas", "tGas"], ["tBoost", "tBoost"]].forEach(([elId, key]) => {
      const el = document.getElementById(elId);
      const on = (e) => { e.preventDefault(); input[key] = true; el.classList.add("on"); Sound.unlock(); if (Game.mode === "auto") Game.cancelAutopilot(); };
      const off = () => { input[key] = false; el.classList.remove("on"); };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off); el.addEventListener("pointerleave", off); el.addEventListener("pointercancel", off);
    });
  }

  // ---------- Update pro Frame ----------
  function collide(pos) {
    for (const id in W.bodies) {
      const b = Game.bodyById[id];
      const c = bodyPos(id, tmpC);
      const d = tmpA.copy(pos).sub(c);
      const min = id === "sonne" ? b.radius + 4 : b.radius * 1.12 + 0.8;
      const len = d.length();
      if (len < min) {
        pos.copy(c).addScaledVector(d.normalize(), min);
        ship.speed *= 0.6;
      }
    }
  }

  function collectDust() {
    for (const s of W.stardust) {
      if (s.position.distanceToSquared(ship.pos) < 6.5) {
        W.randomDustPos(s.position);
        const st = Game.state;
        st.dust++;
        Sound.collect();
        if (st.dust % 20 === 0) {
          st.dustStars++;
          UI.toast("✨ 20 Sternenstaub gesammelt = +1 ⭐!", "gold");
          UI.confetti(60);
        }
        Game.save();
        UI.updateHUD(false, true);
      }
    }
  }

  function updateFly(dt) {
    const k = input.keys;
    const turn = (k.a || k.arrowleft ? 1 : 0) - (k.d || k.arrowright ? 1 : 0) - input.joyX;
    const climb = (k.r ? 1 : 0) - (k.f ? 1 : 0) - input.joyY * 0.8;
    const gas = k.w || k.arrowup || input.tGas;
    const brake = k.s || k.arrowdown;
    const boost = k[" "] || k.shift || input.tBoost;

    ship.yaw += turn * 1.5 * dt - input.dragX * 0.004;
    ship.pitch = THREE.MathUtils.clamp(ship.pitch + climb * 1.0 * dt - input.dragY * 0.003, -1.1, 1.1);
    input.dragX = input.dragY = 0;
    ship.bank = THREE.MathUtils.lerp(ship.bank, turn * 0.45, 1 - Math.exp(-dt * 4));

    const target = gas || boost ? (boost ? 65 : 22) : brake ? -5 : 0;
    ship.speed += (target - ship.speed) * Math.min(1, dt * (target > ship.speed ? 1.2 : 1.6));
    ship.gas = gas || boost ? (boost ? 1 : 0.55) : 0;
    ship.pos.addScaledVector(forwardVec(tmpB), ship.speed * dt);
  }

  function updateAuto(dt) {
    const id = ap.id, b = Game.bodyById[id];
    const P = bodyPos(id, new V());
    let goal, arriveDist;
    const standoff = id === "sonne" ? b.radius * 2.6 : Math.max(b.radius * 3.2, 5.5);
    if (ap.waypoint) {
      goal = ap.waypoint; arriveDist = 6;
    } else {
      const dir = tmpA.copy(ship.pos).sub(P).normalize();
      if (b.parent) dir.add(bodyPos(b.parent, tmpB).sub(P).normalize().multiplyScalar(-1.5)).normalize();
      goal = tmpC.copy(P).addScaledVector(dir, standoff);
      arriveDist = 1.2;
    }
    const toGoal = new V().subVectors(goal, ship.pos);
    const dist = toGoal.length();
    if (!ap.waypoint && (dist < arriveDist || ship.pos.distanceTo(P) < standoff * 1.15)) { Game.explore(id); return; }
    if (ap.waypoint && dist < arriveDist) { ap.waypoint = null; return; }

    const dir = toGoal.normalize();
    const tYaw = Math.atan2(-dir.x, -dir.z), tPitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    const prevYaw = ship.yaw;
    ship.yaw = angleLerp(ship.yaw, tYaw, 1 - Math.exp(-dt * 3));
    ship.pitch = THREE.MathUtils.lerp(ship.pitch, tPitch, 1 - Math.exp(-dt * 3));
    ship.bank = THREE.MathUtils.lerp(ship.bank, THREE.MathUtils.clamp((ship.yaw - prevYaw) / dt, -1, 1) * 0.6, 1 - Math.exp(-dt * 4));
    const want = Math.min(120, 6 + dist * 1.4);
    ship.speed += (want - ship.speed) * Math.min(1, dt * 1.5);
    ship.gas = Math.min(1, ship.speed / 90);
    ship.pos.addScaledVector(dir, Math.min(ship.speed * dt, dist));
  }

  function updateShipVisual(dt, elapsed) {
    const s = W.ship;
    s.position.copy(ship.pos);
    s.rotation.set(ship.pitch, ship.yaw, ship.bank, "YXZ");
    const f = ship.gas;
    W.flame.visible = f > 0.02 || ship.speed > 1;
    W.flame.scale.set(1, 1, 0.25 + f * 1.5 + Math.sin(elapsed * 40) * 0.08 * (f + 0.2));
    if (ship.speed > 1.5 && Math.random() < 0.4 + f) {
      const back = tmpA.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, 1.5).applyEuler(s.rotation).add(ship.pos);
      W.emitTrail(back, f);
    }
  }

  function updateCamera(dt) {
    const c = W.camera;
    if (Game.mode === "explore") {
      const id = Game.exploring, b = Game.bodyById[id];
      const P = bodyPos(id, new V());
      cam.exploreAngle += dt * 0.07;
      // Muss zur CSS-Regel der Infotafel passen: seitlich (Querformat) oder unten (Hochformat)
      const bottomSheet = window.innerWidth <= 640 || (window.innerHeight > window.innerWidth && window.innerWidth <= 1100);
      const d = (id === "sonne" ? b.radius * 3.2 : Math.max(b.radius * 3.6, 5.5)) * (bottomSheet ? 1.35 : 1);
      const want = tmpA.set(Math.cos(cam.exploreAngle) * d, d * 0.22, Math.sin(cam.exploreAngle) * d).add(P);
      c.position.lerp(want, 1 - Math.exp(-dt * 2.2));
      const fwd = tmpB.copy(P).sub(c.position).normalize();
      const look = tmpC.copy(P);
      if (!bottomSheet) look.addScaledVector(fwd.cross(UP).normalize(), b.radius * 1.0 * (b.rings ? 1.3 : 1));
      else look.y -= b.radius * 1.35;
      cam.look.lerp(look, 1 - Math.exp(-dt * 3));
      c.lookAt(cam.look);
      setFov(55, dt);
      return;
    }
    if (Game.mode === "intro" || Game.mode === "countdown") return;
    const off = tmpA.set(0, 1.25, 4.4 + Math.max(0, ship.speed) * 0.025).applyEuler(new THREE.Euler(ship.pitch, ship.yaw, 0, "YXZ"));
    const want = off.add(ship.pos);
    c.position.lerp(want, 1 - Math.exp(-dt * 7));
    const look = forwardVec(tmpB).multiplyScalar(6).add(ship.pos);
    cam.look.lerp(look, 1 - Math.exp(-dt * 10));
    c.lookAt(cam.look);
    setFov(62 + THREE.MathUtils.clamp(ship.speed / 70, 0, 1) * 16, dt);
  }

  function setFov(target, dt) {
    const c = W.camera;
    const f = THREE.MathUtils.lerp(c.fov, target, 1 - Math.exp(-dt * 3));
    if (Math.abs(f - c.fov) > 0.01) { c.fov = f; c.updateProjectionMatrix(); }
  }

  function findNear() {
    let best = null, bestD = Infinity;
    for (const id in W.bodies) {
      const b = Game.bodyById[id];
      const d = bodyPos(id, tmpA).distanceTo(ship.pos) - b.radius;
      const range = Math.max(9, b.radius * 2.4);
      if (d < range && d < bestD) { best = id; bestD = d; }
    }
    return best;
  }

  // ---------- Hauptschleife ----------
  let last = performance.now(), elapsed = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; elapsed += dt;

    if (Game.mode === "intro") {
      const a = elapsed * 0.05;
      W.camera.position.set(Math.cos(a) * 260, 110, Math.sin(a) * 260);
      W.camera.lookAt(0, 0, 0);
      cam.look.set(0, 0, 0);
    }
    if (Game.mode === "fly") updateFly(dt);
    if (Game.mode === "auto") updateAuto(dt);
    if (Game.mode === "fly" || Game.mode === "auto") {
      collide(ship.pos);
      collectDust();
      if (ship.pos.length() < Game.bodyById.sonne.radius * 1.7 && elapsed - lastHeatWarn > 6) {
        lastHeatWarn = elapsed;
        UI.toast("🔥 Puh, ist das heiß hier! Nicht zu nah an die Sonne!", "warn");
      }
      if (ship.pos.length() > 900) { ship.pos.setLength(900); ship.speed *= 0.5; UI.toast("🌌 Hier endet unser Sonnensystem-Spielplatz. Dreh um!"); }
    }
    if (Game.mode !== "explore" && Game.mode !== "intro") updateShipVisual(dt, elapsed);
    if (Game.mode !== "fly" && Game.mode !== "auto") { ship.gas = 0; }

    W.update(dt, elapsed, false);
    updateCamera(dt);

    if (Game.mode === "fly" || Game.mode === "auto") {
      UI.nearId = Game.mode === "fly" ? findNear() : null;
      UI.frame(ship, W.camera);
      Sound.engine(Math.min(1, Math.abs(ship.speed) / 70));
    }
    UI.warp(Math.max(0, (ship.speed - 45) / 60) * (Game.mode === "explore" ? 0 : 1));

    W.renderer.render(W.scene, W.camera);
    requestAnimationFrame(loop);
  }

  // ---------- Start ----------
  function placeShipAtEarth() {
    const E = bodyPos("erde", new V());
    const out = E.clone().normalize();
    ship.pos.copy(E).addScaledVector(out, 16).add(new V(0, 3, 0));
    aimAt(tmpA.copy(ship.pos).multiplyScalar(-1).normalize());
    ship.speed = 0;
  }

  function beginFlight() {
    placeShipAtEarth();
    W.ship.visible = true;
    Game.mode = "countdown";
    const from = W.camera.position.clone();
    const to = new V(0, 1.25, 4.4).applyEuler(new THREE.Euler(ship.pitch, ship.yaw, 0, "YXZ")).add(ship.pos);
    const lookFrom = new V(0, 0, 0), lookTo = forwardVec(new V()).multiplyScalar(6).add(ship.pos);
    const t0 = performance.now(), dur = 3200;
    UI.countdown(() => {
      Game.mode = "fly";
      cam.look.copy(lookTo);
      UI.showHUD();
      UI.toast(document.documentElement.classList.contains("touch-ui")
        ? "🎮 Links lenken, rechts GAS geben – oder unten einen Planeten antippen (Autopilot)!"
        : "🎮 Steuerung: W = Gas, A/D = Lenken, Leertaste = Turbo – oder unten den Autopiloten nutzen!");
    });
    (function fly() {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      W.camera.position.lerpVectors(from, to, e);
      cam.look.lerpVectors(lookFrom, lookTo, e);
      W.camera.lookAt(cam.look);
      if (t < 1 && Game.mode === "countdown") requestAnimationFrame(fly);
    })();
  }

  Game.setTimeRunning = function (run) { W.timeScale = run ? 1 : 0; };

  async function boot() {
    const canvas = document.getElementById("scene");
    // Browser bitten, den Spielstand nicht automatisch zu löschen (z. B. bei wenig Speicher)
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* egal */ }
    const store = loadStore();
    const bar = document.getElementById("loadBar"), txt = document.getElementById("loadText");
    await W.build(canvas, "#ef4444", (p, t) => { bar.style.width = Math.round(p * 100) + "%"; txt.textContent = t; });

    const onResize = () => {
      W.camera.aspect = window.innerWidth / window.innerHeight;
      W.camera.updateProjectionMatrix();
      W.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    onResize();

    setupInput(canvas);
    UI.init(Game);
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(loop); });

    document.getElementById("loader").classList.add("hidden");
    // Zuletzt gespieltes Profil zuerst, danach die meisten Sterne
    const profiles = Object.keys(store.profiles).map((k) => store.profiles[k])
      .sort((a, b) => (profileKey(b.name) === store.last) - (profileKey(a.name) === store.last) || Object.keys(b.visited).length - Object.keys(a.visited).length);
    UI.showStart(profiles, (name, color) => {
      const existing = loadStore().profiles[profileKey(name)];
      Game.state = existing || freshState(name, color);
      Game.save();
      W.setShipColor(Game.state.color);
      Sound.unlock();
      UI.onStateReady();
      beginFlight();
    });
  }

  if (!window.THREE) {
    document.getElementById("loadText").textContent = "Fehler: 3D-Bibliothek konnte nicht geladen werden.";
  } else {
    boot().catch((e) => {
      console.error(e);
      document.getElementById("loadText").textContent = "Hoppla! Dein Browser unterstützt kein WebGL/3D. Bitte Chrome, Edge oder Firefox verwenden.";
    });
  }
})();
