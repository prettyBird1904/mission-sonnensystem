/* =========================================================
   Spiellogik: Zustand, Steuerung, Kompass, Missionen
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
    mode: "intro",           // intro | countdown | fly | landing | explore | takeoff
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
  let lastHeatWarn = 0;
  const tmpA = new V(), tmpB = new V(), tmpC = new V(), UP = new V(0, 1, 0), camEuler = new THREE.Euler();

  function forwardVec(out) {
    const cp = Math.cos(ship.pitch);
    return out.set(-Math.sin(ship.yaw) * cp, Math.sin(ship.pitch), -Math.cos(ship.yaw) * cp);
  }
  function aimAt(dir) {
    ship.yaw = Math.atan2(-dir.x, -dir.z);
    ship.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
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
      if (m && m.target !== "#order") UI.toast("💡 Folge dem gelben Pfeil – er zeigt dir, wohin du fliegen musst!");
      else if (m) UI.toast("💡 Tippe oben rechts auf 🧩 „Ordnen“!");
    }
  };

  // ---------- Modi ----------
  // Kompass: zeigt mit einem Pfeil die Richtung zum gewählten Ziel – fliegen müssen die Kinder selbst.
  Game.compass = null;
  Game.setCompass = function (id) {
    if (Game.mode === "countdown" || Game.mode === "intro") return;
    if (Game.mode === "explore") {
      if (Game.exploring === id) return;
      leaveExplore();
    }
    Game.compass = Game.compass === id ? null : id;
    UI.updateHUD();
    if (Game.compass) UI.toast(`🧭 Der gelbe Pfeil zeigt dir den Weg zu ${Game.bodyById[id].name}. Flieg selbst hin!`);
  };

  // ---------- Landen / Umlaufbahn / Starten ----------
  // Auf festem Boden wird gelandet; bei Sonne, Gas- und Eisriesen geht das nicht → Umlaufbahn.
  const CAN_LAND = ["Gesteinsplanet", "Mond der Erde", "Zwergplanet"];
  const NOSE = new V(0, 0, -1);
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  let seq = null; // laufende Animation: { kind: "land" | "orbit", phase: "in" | "stay" | "out", ... }

  function orbitRadius(b) {
    if (b.id === "sonne") return b.radius * 1.5;
    if (b.rings) return b.radius * (b.faintRings ? 2.4 : 2.8); // außerhalb der Ringe
    return b.radius * 1.8;
  }

  Game.explore = function (id) {
    if (Game.mode !== "fly") return;
    if (Game.compass === id) Game.compass = null;
    const b = Game.bodyById[id], entry = W.bodies[id];
    const land = CAN_LAND.includes(b.kind);
    // Die Rakete „hängt“ sich an den Himmelskörper, damit sie mit ihm mitfliegt (und beim Landen mitdreht)
    const parent = land ? entry.mesh : (id === "sonne" ? W.scene : entry.group);
    parent.attach(W.ship);
    const p0 = W.ship.position.clone(), q0 = W.ship.quaternion.clone();
    const r = b.radius;
    seq = { kind: land ? "land" : "orbit", phase: "in", id, b, parent, t: 0, p0, q0, r };
    if (land) {
      const n = p0.clone().normalize();
      seq.n = n;
      seq.s = THREE.MathUtils.clamp(r * 0.14, 0.1, 0.55);
      seq.hover = n.clone().multiplyScalar(r * 1.55 + 3 * seq.s);
      seq.ground = n.clone().multiplyScalar(r + 0.95 * seq.s);
      seq.qUp = new THREE.Quaternion().setFromUnitVectors(NOSE, n);
      seq.dur = 4.3;
      UI.toast(`🛬 Landeanflug auf ${id === "mond" ? "den Mond" : b.name} …`);
    } else {
      seq.s = THREE.MathUtils.clamp(r * 0.06, 0.25, 0.8);
      seq.R = orbitRadius(b);
      seq.a0 = seq.a = Math.atan2(p0.z, p0.x);
      seq.w = id === "sonne" ? 0.18 : 0.32;
      seq.dur = 4.0;
      UI.toast(id === "sonne"
        ? "🔥 Auf der Sonne kann man nicht landen – viel zu heiß! Wir fliegen eine Runde um sie herum."
        : `🪐 ${b.name} hat keinen festen Boden – dort kann man nicht landen! Wir fliegen in eine Umlaufbahn.`);
    }
    Game.mode = "landing";
    Game.exploring = id;
    ship.speed = 0;
    document.getElementById("hud").classList.add("hidden");
    Sound.whoosh();
  };

  // Erreicht der Anflug das Ziel: Infotafel öffnen, Stempel & Mission
  function arrive() {
    const id = seq.id, P = bodyPos(id, new V());
    seq.phase = "stay";
    Game.mode = "explore";
    const cp = W.camera.position;
    cam.exploreAngle = Math.atan2(cp.z - P.z, cp.x - P.x);
    Sound.engine(0);
    W.flame.visible = false;
    UI.openPanel(id);
    markVisited(id);
  }

  function leaveExplore() {
    if (Game.mode !== "explore" || !seq) return;
    UI.closePanel();
    document.getElementById("hud").classList.add("hidden");
    seq.phase = "out"; seq.t = 0;
    seq.dur = seq.kind === "land" ? 1.9 : 1.3;
    seq.from = W.ship.position.clone();
    seq.fromScale = W.ship.scale.x;
    if (seq.kind === "land") seq.to = seq.n.clone().multiplyScalar(seq.r * 2.3 + 4);
    Game.mode = "takeoff";
    Sound.whoosh();
  }
  Game.leaveExplore = leaveExplore;

  // Rakete ist wieder frei: zurück in die Szene und normal weiterfliegen
  function finishTakeoff() {
    W.scene.attach(W.ship);
    W.ship.scale.setScalar(1);
    ship.pos.copy(W.ship.position);
    const P = bodyPos(seq.id, new V());
    const out = tmpA.copy(ship.pos).sub(P).normalize();
    if (seq.kind === "land") aimAt(out);
    else aimAt(tmpB.copy(UP).cross(out).normalize()); // tangential weiter
    ship.pitch = THREE.MathUtils.clamp(ship.pitch, -1.0, 1.0);
    ship.bank = 0;
    ship.speed = 12;
    seq = null;
    Game.exploring = null;
    Game.mode = "fly";
    UI.showHUD();
    UI.updateHUD();
  }

  // Überspringen per Tipp/Taste (wichtig, wenn Kinder zum zehnten Mal landen)
  function skipSequence() {
    if (seq && (Game.mode === "landing" || Game.mode === "takeoff")) seq.t = Math.max(seq.t, seq.dur - 0.0001);
  }

  const qTmp = new THREE.Quaternion();
  function orbitPose(a, R, out) { return out.set(Math.cos(a) * R, 0, Math.sin(a) * R); }
  function orbitQuat(a, out) { return out.setFromUnitVectors(NOSE, tmpC.set(-Math.sin(a), 0, Math.cos(a))); }

  function updateSequence(dt, elapsed) {
    if (!seq) return;
    const s = W.ship;
    seq.t += dt;
    let flame = 0;

    if (seq.kind === "land") {
      if (seq.phase === "in") {
        const t = seq.t;
        if (t < 1.5) {
          const e = ease(t / 1.5);
          s.position.lerpVectors(seq.p0, seq.hover, e);
          s.quaternion.slerpQuaternions(seq.q0, seq.qUp, e);
          s.scale.setScalar(THREE.MathUtils.lerp(1, seq.s, e));
          flame = 0.6;
        } else if (t < 3.5) {
          const e = easeOut((t - 1.5) / 2);
          s.position.lerpVectors(seq.hover, seq.ground, e);
          s.quaternion.copy(seq.qUp);
          s.scale.setScalar(seq.s);
          flame = 0.8 - e * 0.5;
          if (e > 0.55) emitDust(3);
        } else {
          s.position.copy(seq.ground); s.quaternion.copy(seq.qUp); s.scale.setScalar(seq.s);
          if (!seq.touched) {
            seq.touched = true;
            Sound.land();
            for (let i = 0; i < 14; i++) emitDust(1);
            UI.toast(`🛬 Gelandet auf ${seq.id === "mond" ? "dem Mond" : seq.b.name}!`, "gold");
          }
          if (t >= seq.dur) arrive();
        }
      } else if (seq.phase === "out") {
        const e = Math.min(1, seq.t / seq.dur);
        s.position.lerpVectors(seq.from, seq.to, ease(e));
        s.scale.setScalar(THREE.MathUtils.lerp(seq.fromScale, 1, e));
        flame = 1;
        if (e < 0.3) emitDust(2);
        if (e >= 1) { finishTakeoff(); return; }
      }
    } else {
      // Umlaufbahn
      if (seq.phase === "in") {
        const t = seq.t;
        if (t < 1.8) {
          const e = ease(t / 1.8);
          s.position.lerpVectors(seq.p0, orbitPose(seq.a0, seq.R, tmpA), e);
          s.quaternion.slerpQuaternions(seq.q0, orbitQuat(seq.a0, qTmp), e);
          s.scale.setScalar(THREE.MathUtils.lerp(1, seq.s, e));
          flame = 0.6;
          seq.a = seq.a0;
        } else {
          flame = 0.35;
          if (t >= seq.dur) arrive();
        }
      } else if (seq.phase === "out") {
        const e = Math.min(1, seq.t / seq.dur);
        s.scale.setScalar(THREE.MathUtils.lerp(seq.fromScale, 1, e));
        flame = 1;
        if (e >= 1) { finishTakeoff(); return; }
      }
      // Kreisen (auch während die Infotafel offen ist)
      if (seq.t >= 1.8 || seq.phase !== "in") {
        seq.a += dt * seq.w;
        if (seq.phase === "in") s.scale.setScalar(seq.s);
        const R = seq.phase === "out" ? seq.R * (1 + 0.5 * Math.min(1, seq.t / seq.dur)) : seq.R;
        orbitPose(seq.a, R, s.position);
        orbitQuat(seq.a, s.quaternion);
      }
    }

    W.flame.visible = flame > 0.02;
    W.flame.scale.set(1, 1, 0.25 + flame * 1.5 + Math.sin(elapsed * 40) * 0.08 * (flame + 0.2));
    Sound.engine(flame * 0.6);
  }

  // Staub beim Landen/Starten: kleine Wolken rund um den Landepunkt
  function emitDust(n) {
    const parent = seq.parent;
    for (let i = 0; i < n; i++) {
      const p = tmpA.copy(seq.n).multiplyScalar(seq.r + 0.1 * seq.s);
      const side = tmpB.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).cross(seq.n).normalize()
        .multiplyScalar(seq.s * (0.5 + Math.random() * 2));
      p.add(side);
      parent.localToWorld(p);
      W.emitTrail(p, 0.8, seq.s * 2.2);
    }
  }

  // ---------- Eingabe ----------
  function setupInput(canvas) {
    const block = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "];
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (block.includes(e.key)) e.preventDefault();
      const k = e.key.toLowerCase();
      input.keys[k] = true;
      if (!e.repeat) skipSequence();
      if (k === "e" && Game.mode === "fly" && UI.nearId) Game.explore(UI.nearId);
      if (k === "escape") {
        if (UI.modalOpen()) UI.closeModal();
        else if (Game.mode === "explore") Game.leaveExplore();
      }
    });
    window.addEventListener("keyup", (e) => { input.keys[e.key.toLowerCase()] = false; });
    window.addEventListener("blur", () => { input.keys = {}; });

    // Maus/Finger ziehen auf dem Bild = lenken
    let drag = null;
    canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; Sound.unlock(); skipSequence(); });
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
      const on = (e) => { e.preventDefault(); input[key] = true; el.classList.add("on"); Sound.unlock(); };
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

    // Langsam lässt sich enger lenken – so kann man Planeten gut treffen
    const turnRate = 2.3 - Math.min(Math.abs(ship.speed) / 65, 1) * 0.9;
    ship.yaw += turn * turnRate * dt - input.dragX * 0.004;
    ship.pitch = THREE.MathUtils.clamp(ship.pitch + climb * 1.0 * dt - input.dragY * 0.003, -1.1, 1.1);
    // Alle Planeten liegen in einer Ebene: ohne Hoch/Runter-Eingabe sanft waagerecht ausrichten
    if (Math.abs(climb) < 0.05 && input.dragY === 0) ship.pitch *= Math.exp(-dt * 0.9);
    input.dragX = input.dragY = 0;
    ship.bank = THREE.MathUtils.lerp(ship.bank, turn * 0.45, 1 - Math.exp(-dt * 4));

    // Anflughilfe: nahe an einem Himmelskörper gibt es keinen Turbo, damit man nicht vorbeischießt
    const approach = nearestSurface() < 45;
    const useBoost = boost && !approach;
    if (boost && approach && !ship.boostWarned) { ship.boostWarned = true; UI.toast("🛬 Landeanflug: Turbo ist in Planetennähe aus!"); }
    if (!approach) ship.boostWarned = false;
    const target = gas || boost ? (useBoost ? 65 : 22) : brake ? -5 : 0;
    ship.speed += (target - ship.speed) * Math.min(1, dt * (target > ship.speed ? 1.2 : 1.6));
    ship.gas = gas || boost ? (useBoost ? 1 : 0.55) : 0;
    ship.pos.addScaledVector(forwardVec(tmpB), ship.speed * dt);
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
    // Nur beim Landen/Starten auf festem Boden darf die Kamera kippen – sonst wieder aufrichten
    const tilting = (Game.mode === "landing" || Game.mode === "takeoff") && seq && seq.kind === "land";
    if (!tilting && c.up.y < 0.9999) {
      if (c.up.y < -0.95) c.up.x += 0.05; // genau „kopfüber“ (Südpol): erst etwas seitlich kippen
      c.up.lerp(UP, 1 - Math.exp(-dt * 2.5)).normalize();
    }
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
    if ((Game.mode === "landing" || Game.mode === "takeoff") && seq) {
      // Kamera schaut von der Seite zu, wie die Rakete landet bzw. kreist
      const P = bodyPos(seq.id, new V());
      const shipW = W.ship.getWorldPosition(tmpA);
      const nW = tmpB.copy(shipW).sub(P).normalize();
      const side = tmpC.copy(nW).cross(UP);
      if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
      side.normalize();
      const sc = W.ship.scale.x, r = seq.r;
      const dist = seq.kind === "land" ? r * 0.9 + 5 * sc : r * 0.8 + 6 * sc;
      const want = new V().copy(shipW).addScaledVector(side, dist).addScaledVector(nW, seq.kind === "land" ? r * 0.3 + 2 * sc : r * 0.5);
      c.position.lerp(want, 1 - Math.exp(-dt * 2.5));
      const look = new V().copy(shipW).addScaledVector(nW, seq.kind === "land" ? -r * 0.15 : -r * 0.4);
      cam.look.lerp(look, 1 - Math.exp(-dt * 4));
      // Beim Landen dreht sich die Kamera mit, damit der Boden immer „unten“ ist
      if (seq.kind === "land") c.up.lerp(nW, 1 - Math.exp(-dt * 2)).normalize();
      c.lookAt(cam.look);
      setFov(55, dt);
      return;
    }
    if (Game.mode === "intro" || Game.mode === "countdown") return;
    const off = tmpA.set(0, 1.25, 4.4 + Math.max(0, ship.speed) * 0.025).applyEuler(camEuler.set(ship.pitch, ship.yaw, 0, "YXZ"));
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

  // Abstand der Rakete zur nächsten Oberfläche (für die Anflughilfe)
  function nearestSurface() {
    let best = Infinity;
    for (const id in W.bodies) best = Math.min(best, bodyPos(id, tmpC).distanceTo(ship.pos) - Game.bodyById[id].radius);
    return best;
  }

  function findNear() {
    let best = null, bestD = Infinity;
    for (const id in W.bodies) {
      const b = Game.bodyById[id];
      const d = bodyPos(id, tmpA).distanceTo(ship.pos) - b.radius;
      const range = Math.max(14, b.radius * 2.6);
      if (d < range && d < bestD) { best = id; bestD = d; }
    }
    return best;
  }

  // ---------- Hauptschleife ----------
  let last = performance.now(), elapsed = 0;

  // Automatische Qualität: Wird es ruckelig (z. B. wenn das Gerät warm wird), rendern wir mit
  // etwas weniger Pixeln; läuft es lange flüssig, wieder etwas mehr.
  const perf = { avg: 1 / 60, check: 0, goodFor: 0, bad: 0, ratio: 0, warmup: 0 };
  function adaptQuality(rawDt) {
    // Nur beim Fliegen/Erforschen messen, nicht direkt nach Start oder Moduswechsel (Anlauf-Ruckler)
    if (rawDt > 0.25 || (Game.mode !== "fly" && Game.mode !== "explore")) { perf.warmup = 0; return; }
    perf.warmup += rawDt;
    if (perf.warmup < 5) return;
    perf.avg += (rawDt - perf.avg) * 0.05;
    perf.check += rawDt;
    if (perf.check < 2) return;
    perf.check = 0;
    if (!perf.ratio) perf.ratio = W.renderer.getPixelRatio();
    // Nie unschärfer als ein normaler Bildschirm (1), außer das Gerät hat selbst weniger
    const floor = W.fast ? 0.75 : Math.min(1, W.maxPixelRatio);
    let next = perf.ratio;
    if (perf.avg > 1 / 50) perf.bad++; else perf.bad = 0;
    if (perf.bad >= 3 && perf.ratio <= floor && !W.fast && !perf.suggested) {
      perf.suggested = true;
      UI.toast("🐢 Ruckelt es? Lehrkraft: ❓ Hilfe → Grafik → „⚡ Flüssig“");
    }
    if (perf.bad >= 2 && perf.ratio > floor) { next = Math.max(floor, perf.ratio - 0.25); perf.goodFor = 0; perf.bad = 0; }
    else if (perf.avg < 1 / 57) { perf.goodFor += 2; if (perf.goodFor >= 20 && perf.ratio < W.maxPixelRatio) { next = Math.min(W.maxPixelRatio, perf.ratio + 0.25); perf.goodFor = 0; } }
    else perf.goodFor = 0;
    if (next !== perf.ratio) {
      perf.ratio = next;
      W.renderer.setPixelRatio(next);
      W.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  Game.perf = perf;

  // Bildrate-Anzeige zum Messen auf echten Geräten
  const fpsEl = document.getElementById("fps");
  let fpsShow = /[?&]fps/.test(location.search), fpsT = 0, fpsN = 0;
  try { fpsShow = fpsShow || localStorage.getItem("ms-fps") === "1"; } catch (e) { /* egal */ }
  Game.setFpsVisible = (on) => { fpsShow = on; fpsEl.classList.toggle("hidden", !on); try { localStorage.setItem("ms-fps", on ? "1" : "0"); } catch (e) { /* egal */ } };
  Game.fpsVisible = () => fpsShow;
  fpsEl.classList.toggle("hidden", !fpsShow);
  function updateFps(rawDt) {
    if (!fpsShow) return;
    fpsT += rawDt; fpsN++;
    if (fpsT < 0.5) return;
    fpsEl.textContent = `${Math.round(fpsN / fpsT)} Bilder/s · Auflösung ${W.renderer.getPixelRatio().toFixed(2)}${W.fast ? " · ⚡" : ""}`;
    fpsT = 0; fpsN = 0;
  }

  function loop(now) {
    const rawDt = (now - last) / 1000;
    const dt = Math.min(0.05, rawDt);
    last = now; elapsed += dt;
    adaptQuality(rawDt);
    updateFps(rawDt);

    if (Game.mode === "intro") {
      const a = elapsed * 0.05;
      W.camera.position.set(Math.cos(a) * 260, 110, Math.sin(a) * 260);
      W.camera.lookAt(0, 0, 0);
      cam.look.set(0, 0, 0);
    }
    if (Game.mode === "fly") updateFly(dt);
    if (Game.mode === "fly") {
      collide(ship.pos);
      collectDust();
      if (ship.pos.length() < Game.bodyById.sonne.radius * 1.7 && elapsed - lastHeatWarn > 6) {
        lastHeatWarn = elapsed;
        UI.toast("🔥 Puh, ist das heiß hier! Nicht zu nah an die Sonne!", "warn");
      }
      if (ship.pos.length() > 900) { ship.pos.setLength(900); ship.speed *= 0.5; UI.toast("🌌 Hier endet unser Sonnensystem-Spielplatz. Dreh um!"); }
    }
    if (Game.mode === "fly" || Game.mode === "countdown") updateShipVisual(dt, elapsed);
    if (Game.mode === "landing" || Game.mode === "takeoff" || Game.mode === "explore") updateSequence(dt, elapsed);
    if (Game.mode !== "fly") { ship.gas = 0; }

    W.update(dt, elapsed, false);
    updateCamera(dt);

    if (Game.mode === "fly") {
      UI.nearId = findNear();
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
        ? "🎮 Links lenken, rechts GAS geben! Tippe unten einen Planeten an – der Pfeil zeigt dir den Weg."
        : "🎮 W = Gas, A/D = Lenken, Leertaste = Turbo! Tippe unten einen Planeten an – der Pfeil zeigt dir den Weg.");
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
