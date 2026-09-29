/* =========================================================
   Benutzeroberfläche: HUD, Infotafel, Quiz, Labor, Pass, Spiele
   ========================================================= */
window.UI = (function () {
  const D = window.SPACE_DATA;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const fmt = (n, d = 0) => Number(n).toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ball = (id, size, extra = "") => `<span class="ball p-${id} ${id === "saturn" ? "ring-deco" : ""} ${extra}" style="width:${size}px;height:${size}px"></span>`;

  let G = null;
  const labels = {};
  const ranks = [
    [0, "Weltraum-Neuling", "🐣"], [6, "Sternen-Entdecker/in", "🔭"], [15, "Planeten-Forscher/in", "🧑‍🚀"],
    [26, "Raumschiff-Kapitän/in", "🚀"], [38, "Weltraum-Profi", "🏆"]
  ];
  function rankOf(stars) {
    let r = ranks[0], next = null;
    for (let i = 0; i < ranks.length; i++) if (stars >= ranks[i][0]) { r = ranks[i]; next = ranks[i + 1] || null; }
    return { title: r[1], icon: r[2], min: r[0], next };
  }

  // ---------- Vorlesen ----------
  let voice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const vs = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith("de"));
    voice = vs.find((v) => /natural|online|google/i.test(v.name)) || vs[0] || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text) {
    if (!("speechSynthesis" in window)) { toast("Vorlesen geht in diesem Browser leider nicht."); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ""));
    u.lang = "de-DE"; u.rate = 0.95; u.pitch = 1.05;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }

  // ---------- Toasts, Feiern, Konfetti ----------
  function toast(msg, type = "") {
    const t = el("div", "toast " + type, msg);
    $("toasts").appendChild(t);
    while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
    setTimeout(() => t.remove(), 3100);
  }
  function celebrate(icon, title, text) {
    const c = el("div", "celebrate", `<div class="celebrate-card glass"><div class="big">${icon}</div><h3>${title}</h3><p>${text}</p></div>`);
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3200);
  }
  let confettiParts = [], confettiRunning = false;
  function confetti(n = 160) {
    const cv = $("confetti"), ctx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#facc15", "#f472b6", "#22d3ee", "#a78bfa", "#34d399", "#fb923c"];
    for (let i = 0; i < n; i++) confettiParts.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.45,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0], life: 1
    });
    if (confettiRunning) return;
    confettiRunning = true;
    (function step() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      confettiParts = confettiParts.filter((p) => p.life > 0 && p.y < cv.height + 20);
      for (const p of confettiParts) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += 0.15; p.life -= 0.006;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r)));
        ctx.restore();
      }
      if (confettiParts.length) requestAnimationFrame(step);
      else { confettiRunning = false; ctx.clearRect(0, 0, cv.width, cv.height); }
    })();
  }

  // ---------- Start ----------
  function showStart(profiles, onGo) {
    $("start").classList.remove("hidden");
    // iPad/iPhone im normalen Safari-Tab: Safari löscht Webseiten-Daten nach 7 Tagen ohne Nutzung,
    // und der Home-Bildschirm hat einen eigenen Speicher → Hinweis zeigen.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = navigator.standalone || matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
    if (isIOS && !standalone) $("installHint").classList.remove("hidden");
    let color = "#ef4444";
    const picks = [...$("colorPick").children];
    picks.forEach((b) => b.addEventListener("click", () => {
      picks.forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); color = b.dataset.color; Sound.unlock(); Sound.click();
    }));
    if (profiles.length) {
      $("continueBox").classList.remove("hidden");
      $("newBox").classList.add("hidden");
      const list = $("pilotList");
      profiles.forEach((p) => {
        const visited = Object.keys(p.visited || {}).length;
        const btn = el("button", "pilot-pick", `<span class="pp-rocket" style="--c:${p.color}">🚀</span><span class="pp-name">${escapeHtml(p.name)}</span><small>${visited}/${D.bodies.length} besucht</small>`);
        btn.onclick = () => { $("start").classList.add("hidden"); onGo(p.name, p.color); };
        list.appendChild(btn);
      });
      $("btnNewPilot").onclick = () => { $("continueBox").classList.add("hidden"); $("newBox").classList.remove("hidden"); $("pilotName").focus(); };
    } else if (matchMedia("(pointer: fine)").matches) {
      // Auf Tablets nicht automatisch fokussieren – sonst springt sofort die Tastatur auf
      setTimeout(() => $("pilotName").focus(), 100);
    }
    const go = () => {
      const name = $("pilotName").value.trim();
      if (!name) { $("pilotName").focus(); $("pilotName").style.borderColor = "#fb7185"; toast("✏️ Schreib zuerst deinen Namen hinein!"); return; }
      $("pilotName").blur();
      $("start").classList.add("hidden");
      onGo(name, color);
    };
    $("btnStart").onclick = go;
    $("pilotName").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  function countdown(done) {
    const box = $("countdown"), span = box.querySelector("span");
    box.classList.remove("hidden");
    const steps = ["3", "2", "1", "🚀"];
    let i = 0;
    (function next() {
      if (i >= steps.length) { box.classList.add("hidden"); done(); return; }
      span.textContent = steps[i];
      span.style.animation = "none"; void span.offsetWidth; span.style.animation = "";
      if (i < 3) Sound.click(); else Sound.whoosh();
      i++;
      setTimeout(next, 800);
    })();
  }

  // ---------- HUD ----------
  function init(game) {
    G = game;
    // Dock
    const dock = $("dockItems");
    D.bodies.forEach((b) => {
      const size = b.radius > 6 || b.id === "sonne" ? "large" : b.radius < 1.7 ? "small" : "";
      const it = el("button", "dock-item " + size, `${ball(b.id, 38)}<small>${b.name}</small>`);
      it.dataset.id = b.id;
      it.title = `Kompass: Zeig mir den Weg zu ${b.name}`;
      it.onclick = () => { Sound.unlock(); Sound.click(); G.setCompass(b.id); };
      dock.appendChild(it);
    });
    // Labels
    D.bodies.forEach((b) => {
      const l = el("div", "label", `<span class="dot" style="--c:${b.color}"></span>${b.name}<span class="check"></span>`);
      l.onclick = () => { Sound.unlock(); Sound.click(); G.setCompass(b.id); };
      $("labels").appendChild(l);
      labels[b.id] = l;
    });

    $("btnHint").onclick = () => { Sound.click(); G.toggleHint(); };
    $("btnSpeakMission").onclick = () => { const m = G.currentMission(); speak(m ? m.text : "Alle Missionen geschafft!"); };
    $("btnPass").onclick = () => { Sound.click(); showPass(); };
    $("btnOrder").onclick = () => { Sound.click(); showOrder(); };
    $("btnHelp").onclick = () => { Sound.click(); showHelp(); };
    $("btnTime").onclick = (e) => {
      const btn = e.currentTarget, run = btn.dataset.paused === "1";
      btn.dataset.paused = run ? "0" : "1";
      btn.innerHTML = run ? "⏸️<span>Pause</span>" : "▶️<span>Weiter</span>";
      G.setTimeRunning(run);
      toast(run ? "🪐 Die Planeten kreisen wieder um die Sonne." : "⏸️ Die Planeten bleiben jetzt stehen.");
    };
    $("btnSound").onclick = (e) => {
      const on = Sound.toggle();
      e.currentTarget.innerHTML = (on ? "🔊" : "🔇") + "<span>Ton</span>";
    };
    $("explorePrompt").onclick = () => { if (UI.nearId) G.explore(UI.nearId); };
    $("pClose").onclick = () => { Sound.click(); G.leaveExplore(); };
    $("modalClose").onclick = closeModal;
    $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
    document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => { Sound.click(); showTab(t.dataset.tab); }));
  }

  function onStateReady() {
    document.documentElement.style.setProperty("--ship", G.state.color);
    updateHUD();
  }
  function showHUD() { $("hud").classList.remove("hidden"); }

  let lastStars = null, lastDust = null;
  function updateHUD(bumpStars, bumpDust) {
    const s = G.state;
    const stars = G.totalStars();
    const r = rankOf(stars);
    $("hudName").textContent = s.name;
    $("hudRank").textContent = r.title;
    $("pilotAvatar").textContent = r.icon;
    $("hudStars").textContent = stars;
    $("hudDust").textContent = s.dust;
    if (bumpStars || (lastStars !== null && stars > lastStars)) bump($("hudStars").parentElement);
    if (bumpDust) bump($("hudDust").parentElement);
    if (lastStars !== null && r.min > rankOf(lastStars).min) {
      setTimeout(() => { celebrate(r.icon, "Neuer Rang!", `Du bist jetzt: <b>${r.title}</b>`); Sound.fanfare(); }, 1500);
    }
    lastStars = stars; lastDust = s.dust;

    const m = G.currentMission();
    const total = D.missions.length;
    $("missionTag").textContent = m ? `Mission ${s.mission + 1}/${total}` : "Alle Missionen geschafft 🎉";
    $("missionText").textContent = m ? m.text : "Super! Fliege frei herum, mache die Quizze oder hol dir deine Urkunde im Forscherpass 📘";
    $("btnHint").classList.toggle("active", !!s.hint);
    $("btnHint").classList.toggle("hidden", !m);
    $("missionCard").classList.toggle("done", !m);

    const target = G.compass || (m && s.hint ? m.target : null);
    document.querySelectorAll(".dock-item").forEach((d) => {
      d.classList.toggle("target", d.dataset.id === target);
      d.querySelector(".tick")?.remove();
      if (s.visited[d.dataset.id]) d.insertAdjacentHTML("beforeend", '<span class="tick">✓</span>');
    });
    $("btnOrder").style.outline = target === "#order" ? "2px solid #facc15" : "";
    for (const id in labels) {
      labels[id].classList.toggle("target", id === target);
      labels[id].querySelector(".check").textContent = s.visited[id] ? "✓" : "";
    }
  }
  function bump(e) { e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }


  // Pro Frame: Labels, Tacho, Nähe-Anzeige, Randpfeil
  const v3 = new THREE.Vector3(), rayDir = new THREE.Vector3();
  // Wird der Punkt (von der Kamera aus gesehen) von einem großen Himmelskörper verdeckt?
  const occ = new THREE.Vector3(), rel = new THREE.Vector3();
  function occluded(camPos, p, dist, selfId) {
    rayDir.copy(p).sub(camPos).divideScalar(dist);
    for (const id in labels) {
      const b = G.bodyById[id];
      if (id === selfId || b.radius < 2.5) continue;
      World.worldPos(id, occ);
      rel.copy(occ).sub(camPos);
      const t = rel.dot(rayDir);
      if (t <= 0 || t >= dist - b.radius) continue;
      if (rel.lengthSq() - t * t < b.radius * b.radius) return true;
    }
    return false;
  }
  function frame(ship, camera) {
    const w = innerWidth, h = innerHeight;
    const m = G.currentMission();
    const target = G.compass || (m && G.state.hint && m.target !== "#order" ? m.target : null);
    let arrowShown = false;
    for (const id in labels) {
      const b = G.bodyById[id], l = labels[id];
      World.worldPos(id, v3);
      const dist = v3.distanceTo(camera.position);
      // Das Kompass-/Missionsziel bleibt immer sichtbar, auch wenn es hinter der Sonne liegt
      const hidden = id !== target && occluded(camera.position, v3, dist, id);
      v3.y += b.radius * 1.15;
      v3.project(camera);
      const onScreen = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      if (id === target && !onScreen) {
        // Randpfeil zeigt zum Ziel
        let x = v3.x, y = v3.y;
        if (v3.z > 1) { x = -x; y = -y; }
        const ang = Math.atan2(-y, x);
        const r = 0.82;
        const k = r / Math.max(Math.abs(x), Math.abs(y), 0.001);
        const sx = (x * k * 0.5 + 0.5) * w, sy = (-y * k * 0.5 + 0.5) * h;
        const ea = $("edgeArrow");
        ea.classList.remove("hidden");
        ea.style.transform = `translate(${sx}px, ${sy}px)`;
        ea.querySelector(".arrow-inner").style.transform = `rotate(${ang}rad)`;
        ea.querySelector("span").textContent = b.name;
        arrowShown = true;
      }
      if (!onScreen || hidden || (b.parent && dist > 150)) { l.style.display = "none"; continue; }
      l.style.display = "";
      l.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h - 6}px) translate(-50%, -100%)`;
      l.classList.toggle("dim", dist > 260 && id !== target);
    }
    if (!arrowShown) $("edgeArrow").classList.add("hidden");

    const sp = Math.abs(ship.speed);
    $("speedVal").textContent = Math.round(sp * 10);
    $("speedBar").style.width = Math.min(100, (sp / 120) * 100) + "%";
    const near = UI.nearId;
    if (near) $("nearText").textContent = `In der Nähe: ${G.bodyById[near].name}`;
    else if (target) $("nearText").textContent = `🧭 Ziel: ${G.bodyById[target].name} – noch ${Math.round(World.worldPos(target, v3).distanceTo(ship.pos) * 10)}`;
    else $("nearText").textContent = "Freier Weltraum";
    const p = $("explorePrompt");
    p.classList.toggle("hidden", !near);
    if (near) p.querySelector("span").textContent = G.bodyById[near].name;
  }

  function warp(v) { $("warp").style.opacity = Math.min(0.8, v).toFixed(2); }

  // ---------- Infotafel ----------
  let current = null, factIdx = 0;
  function openPanel(id) {
    current = G.bodyById[id];
    $("hud").classList.add("hidden");
    const p = $("panel");
    p.classList.remove("hidden");
    p.style.animation = "none"; void p.offsetWidth; p.style.animation = "";
    $("pBall").outerHTML = `<div class="panel-ball" id="pBall">${ball(id, 58)}</div>`;
    $("pName").textContent = current.name;
    $("pKind").textContent = current.kind;
    $("pSpeak").onclick = () => speak(`${current.name}. ${current.intro}`);
    renderInfo(); renderFacts(0); renderLab(); renderQuizStart();
    showTab("info");
  }
  function closePanel() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    $("panel").classList.add("hidden");
    $("hud").classList.remove("hidden");
  }
  function showTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".tabpane").forEach((t) => t.classList.toggle("active", t.dataset.pane === name));
    document.querySelector(".panel-body").scrollTop = 0;
    const b = current;
    if (b) $("pSpeak").onclick = {
      info: () => speak(`${b.name}. ${b.intro}`),
      facts: () => speak(b.facts[factIdx]),
      lab: () => speak($("paneLab").innerText.split("\n").slice(0, 6).join(". ")),
      quiz: () => { const q = $("paneQuiz").querySelector(".quiz-q"); speak(q ? q.textContent : "Teste dein Wissen im Quiz!"); }
    }[name];
  }

  function renderInfo() {
    const b = current;
    const distLabel = b.distanceFrom ? `Entfernung zur ${b.distanceFrom}` : "Entfernung zur Sonne";
    const distVal = b.id === "sonne" ? "Mittelpunkt 😎" : b.distanceKm >= 1e9 ? `${fmt(b.distanceKm / 1e9, 1)} Mrd. km` : b.distanceKm >= 1e6 ? `${fmt(b.distanceKm / 1e6)} Mio. km` : `${fmt(b.distanceKm)} km`;
    const tiles = [
      ["📏", "Durchmesser", `${fmt(b.diameterKm)} km`],
      ["🧭", distLabel, distVal],
      ["🔄", "Ein Tag dauert", b.day],
      ["🗓️", b.id === "mond" ? "Runde um die Erde" : "Ein Jahr dauert", b.id === "mond" ? "ca. 27 Tage" : b.year],
      ["🌡️", "Temperatur", b.tempText],
      ["🌙", "Monde", b.moons]
    ];
    const ratio = b.diameterKm / 12742;
    const maxPx = 120;
    const pPx = ratio >= 1 ? maxPx : Math.max(8, maxPx * ratio);
    const ePx = ratio >= 1 ? Math.max(5, maxPx / ratio) : maxPx;
    let cmpText;
    if (b.id === "erde") cmpText = "Das ist unsere Erde – sie ist unser Maßstab!";
    else if (ratio >= 1) cmpText = `${b.id === "sonne" ? "Die Sonne" : b.name} ist etwa <b>${fmt(ratio, ratio < 10 ? 1 : 0)}-mal</b> so breit wie die Erde.`;
    else cmpText = `Die Erde ist etwa <b>${fmt(1 / ratio, 1)}-mal</b> so breit wie ${b.id === "mond" ? "der Mond" : b.name}.`;

    const clampT = Math.max(-240, Math.min(500, b.tempC));
    const pos = ((clampT + 240) / 740) * 100;
    const home = ((15 + 240) / 740) * 100;

    $("paneInfo").innerHTML = `
      <p class="intro">${b.intro}</p>
      <div class="facts-grid">${tiles.map(([i, l, v]) => `<div class="fact"><div class="ico">${i}</div><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join("")}</div>
      <div class="box">
        <h3>⚖️ Größenvergleich</h3>
        ${b.id === "erde" ? `<div class="compare"><figure>${ball("erde", 90)}<figcaption>Erde</figcaption></figure></div>` : `
        <div class="compare">
          <figure>${ball("erde", ePx)}<figcaption>Erde</figcaption></figure>
          <figure>${ball(b.id, pPx)}<figcaption>${b.name}</figcaption></figure>
        </div>`}
        <p>${cmpText}</p>
      </div>
      <div class="box">
        <h3>🌡️ Wie warm ist es dort?</h3>
        <div class="thermo"><div class="mark" style="left:${home}%;opacity:.4"></div><span class="home" style="left:${home}%">🏠 Erde</span><div class="mark" id="thermoMark" style="left:${home}%"></div></div>
        <div class="thermo-scale"><span>🥶 −240 °C</span><span>0 °C</span><span>🔥 500 °C</span></div>
        <p>${b.id === "sonne" ? "Die Sonne ist so heiß, dass sie gar nicht auf diese Skala passt! 🔥" : `${b.name}: <b>${b.tempText}</b>`}</p>
      </div>`;
    requestAnimationFrame(() => setTimeout(() => { const m = $("thermoMark"); if (m) m.style.left = pos + "%"; }, 150));
  }

  function renderFacts(i) {
    const b = current;
    factIdx = (i + b.facts.length) % b.facts.length;
    $("paneFacts").innerHTML = `
      <div class="fact-card"><span class="num">Fakt ${factIdx + 1} von ${b.facts.length}</span>${b.facts[factIdx]}</div>
      <div class="fact-nav">
        <button class="btn ghost" id="fPrev">◀</button>
        <div class="dots">${b.facts.map((_, k) => `<i class="${k === factIdx ? "on" : ""}"></i>`).join("")}</div>
        <button class="btn primary" id="fNext">Nächster ▶</button>
      </div>
      <div class="row-gap"><button class="btn ghost" id="fSpeak">🔊 Vorlesen</button></div>`;
    $("fPrev").onclick = () => { Sound.click(); renderFacts(factIdx - 1); };
    $("fNext").onclick = () => { Sound.click(); renderFacts(factIdx + 1); };
    $("fSpeak").onclick = () => speak(b.facts[factIdx]);
    if ($("pSpeak") && document.querySelector('.tab.active')?.dataset.tab === "facts") $("pSpeak").onclick = () => speak(b.facts[factIdx]);
  }

  function travelText(km) {
    const hours = km / 100;
    const days = hours / 24, years = days / 365;
    if (years >= 1) return `${fmt(years, years < 10 ? 1 : 0)} Jahre`;
    return `${fmt(days)} Tage`;
  }
  function lightText(km) {
    const s = km / 300000;
    if (s < 60) return `${fmt(s, 1)} Sekunden`;
    if (s < 3600) return `${fmt(s / 60, 1)} Minuten`;
    return `${fmt(s / 3600, 1)} Stunden`;
  }

  function renderLab() {
    const b = current;
    let ageBox = "";
    if (b.orbitYears && !b.parent) {
      ageBox = `
      <div class="box">
        <h3>🎂 Wie alt wärst du dort?</h3>
        <p>Ein Jahr ist die Zeit für eine Runde um die Sonne. Stell dein Alter ein:</p>
        <div class="lab-row"><input type="range" min="6" max="12" value="9" id="ageIn"><output id="ageOut">9 Jahre</output></div>
        <div class="big-result" id="ageRes"></div>
      </div>`;
    }
    const km = b.id === "sonne" ? 150000000 : b.distanceKm;
    const route = b.id === "sonne" ? "von der Erde zur Sonne" : b.parent ? `von der Erde zum ${b.name}` : `von der Sonne bis zum ${b.name}`;
    $("paneLab").innerHTML = `
      <div class="box">
        <h3>⚖️ Wie schwer würdest du dich fühlen?</h3>
        <p>Stell ein, wie viel du auf der Erde wiegst:</p>
        <div class="lab-row"><input type="range" min="20" max="60" value="30" id="wIn"><output id="wOut">30 kg</output></div>
        <div style="display:flex;align-items:center;gap:16px"><span class="jumper" id="jumper">🧑‍🚀</span><div class="big-result" id="wRes"></div></div>
      </div>
      ${ageBox}
      <div class="box">
        <h3>🚗 Wie lange dauert die Reise?</h3>
        <p>So lange bräuchtest du ${route} …</p>
        <div class="big-result">🚗 mit dem Auto (100 km/h): <b>${travelText(km)}</b></div>
        <div class="big-result">💡 mit Lichtgeschwindigkeit: <b>${lightText(km)}</b></div>
        <p style="color:var(--muted)">Licht ist das Schnellste, was es gibt: 300.000 km in einer Sekunde!</p>
      </div>`;

    const wIn = $("wIn");
    const updW = () => {
      const kg = +wIn.value, felt = kg * b.gravity;
      $("wOut").textContent = `${kg} kg`;
      let txt = `Auf ${b.id === "sonne" ? "der Sonne" : b.id === "mond" ? "dem Mond" : b.name} fühlst du dich wie <b>${fmt(felt, felt < 10 ? 1 : 0)} kg</b>`;
      if (b.gravity < 0.5) txt += " – du könntest riesig hoch springen! 🦘";
      else if (b.gravity > 2) txt += " – du kämst kaum hoch! 😵";
      else if (b.gravity > 1.05) txt += " – ein bisschen schwerer als zu Hause.";
      else if (b.id !== "erde") txt += " – fast wie zu Hause.";
      if (b.kind === "Gasriese" || b.kind === "Eisriese" || b.id === "sonne") txt += `<br><small style="color:var(--muted)">(Stehen könntest du dort aber nicht – es gibt keinen festen Boden!)</small>`;
      $("wRes").innerHTML = txt;
      const j = $("jumper");
      j.style.setProperty("--jh", Math.min(90, Math.max(4, 22 / b.gravity)) + "px");
      j.style.setProperty("--jt", Math.min(3, Math.max(0.4, 0.8 / Math.sqrt(b.gravity))) + "s");
    };
    wIn.oninput = updW; updW();

    if ($("ageIn")) {
      const updA = () => {
        const a = +$("ageIn").value, pa = a / b.orbitYears;
        $("ageOut").textContent = `${a} Jahre`;
        let t = `Auf ${b.name} wärst du <b>${fmt(pa, pa < 10 ? 1 : 0)} Jahre</b> alt!`;
        if (pa < 1) t += " Du hättest dort noch nicht mal deinen ersten Geburtstag gefeiert! 🎂";
        else if (pa > a) t += " Du hättest schon viel mehr Geburtstage gefeiert! 🎉";
        $("ageRes").innerHTML = t;
      };
      $("ageIn").oninput = updA; updA();
    }
  }

  // ---------- Quiz ----------
  function renderQuizStart() {
    const b = current, best = G.state.quiz[b.id] || 0;
    $("paneQuiz").innerHTML = `
      <div class="center">
        <div class="stars-row">${[1, 2, 3].map((k) => `<span class="${k <= best ? "" : "off"}">⭐</span>`).join("")}</div>
        <p class="intro">${best === 3 ? "Perfekt! Du hast alle Sterne. Willst du es nochmal versuchen?" : `Beantworte 3 Fragen über ${b.id === "sonne" ? "die Sonne" : b.id === "mond" ? "den Mond" : b.name} und sammle bis zu 3 Sterne!`}</p>
        <button class="btn primary xl" id="qStart">🏆 Quiz starten</button>
        ${best < 3 ? `<p style="color:var(--muted);margin-top:14px">Tipp: Lies vorher den Steckbrief und die Fakten!</p>` : ""}
      </div>`;
    $("qStart").onclick = () => { Sound.click(); runQuiz(); };
  }

  function runQuiz() {
    const b = current;
    const qs = b.quiz;
    let i = 0, right = 0;
    const results = [];
    function show() {
      const q = qs[i];
      const order = shuffle(q.a.map((txt, k) => ({ txt, k })));
      $("paneQuiz").innerHTML = `
        <div class="quiz-progress">${qs.map((_, k) => `<i class="${results[k] === true ? "ok" : results[k] === false ? "no" : k === i ? "now" : ""}"></i>`).join("")}</div>
        <div style="color:var(--muted);font-size:14px">Frage ${i + 1} von ${qs.length}</div>
        <div class="quiz-q">${q.q}</div>
        <div class="answers">${order.map((o) => `<button class="answer" data-k="${o.k}">${o.txt}</button>`).join("")}</div>
        <div id="qAfter"></div>`;
      if (document.querySelector(".tab.active")?.dataset.tab === "quiz") $("pSpeak").onclick = () => speak(q.q + " " + order.map((o) => o.txt).join(". Oder: "));
      $("paneQuiz").querySelectorAll(".answer").forEach((btn) => btn.onclick = () => {
        const ok = +btn.dataset.k === q.c;
        results[i] = ok;
        if (ok) { right++; Sound.correct(); } else Sound.wrong();
        $("paneQuiz").querySelectorAll(".answer").forEach((x) => {
          x.disabled = true;
          if (+x.dataset.k === q.c) x.classList.add("right");
        });
        if (!ok) btn.classList.add("wrong");
        $("qAfter").innerHTML = `<div class="why">${ok ? "✅ Richtig! " : "❌ Nicht ganz. "}${q.why}</div>
          <div class="row-gap"><button class="btn primary" id="qNext">${i < qs.length - 1 ? "Nächste Frage ▶" : "Ergebnis 🏆"}</button></div>`;
        $("qNext").onclick = () => { Sound.click(); i++; i < qs.length ? show() : finish(); };
      });
    }
    function finish() {
      const msg = ["Nicht schlimm – probier's gleich nochmal!", "Ein guter Anfang!", "Super gemacht!", "Wow, alles richtig! Du bist ein Weltraum-Genie! 🌟"][right];
      $("paneQuiz").innerHTML = `
        <div class="center">
          <div class="stars-row">${[1, 2, 3].map((k) => `<span class="${k <= right ? "" : "off"}">⭐</span>`).join("")}</div>
          <h3 style="font-family:var(--font-head);font-size:26px;margin:4px 0">${right} von ${qs.length} richtig</h3>
          <p class="intro">${msg}</p>
          <div class="row-gap">
            <button class="btn ghost" id="qAgain">🔁 Nochmal</button>
            <button class="btn primary" id="qBack">🚀 Weiterfliegen</button>
          </div>
        </div>`;
      if (right === 3) { Sound.fanfare(); confetti(); }
      G.onQuizFinished(b.id, right);
      $("qAgain").onclick = () => { Sound.click(); runQuiz(); };
      $("qBack").onclick = () => { Sound.click(); G.leaveExplore(); };
    }
    show();
  }

  // ---------- Modale ----------
  function openModal(html) {
    $("modalContent").innerHTML = html;
    $("modal").classList.remove("hidden");
    $("modal").querySelector(".modal-card").scrollTop = 0;
  }
  function closeModal() {
    $("modal").classList.add("hidden");
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  function modalOpen() { return !$("modal").classList.contains("hidden"); }

  function showPass() {
    const s = G.state, stars = G.totalStars(), r = rankOf(stars);
    const planetsVisited = D.planetOrder.filter((id) => s.visited[id]).length;
    const allDone = planetsVisited === 8;
    const pct = r.next ? ((stars - r.min) / (r.next[0] - r.min)) * 100 : 100;
    openModal(`
      <h2>📘 Forscherpass von ${escapeHtml(s.name)}</h2>
      <p class="sub">Sammle Stempel, indem du Himmelskörper erforschst. Tippe auf ein Feld, um hinzufliegen!</p>
      <div class="pass-top">
        <div class="rank-badge">${r.icon} Rang<b>${r.title}</b></div>
        <div class="rank-meter">
          <div>⭐ <b>${stars}</b> Sterne ${r.next ? `– noch ${r.next[0] - stars} bis <b>${r.next[1]}</b>` : "– höchster Rang erreicht! 🏆"}</div>
          <div class="bar"><div style="width:${pct}%"></div></div>
          <div style="font-size:13px;color:var(--muted);margin-top:6px">Quiz-Sterne · Missionen · Planeten ordnen · ✨ Sternenstaub (20 = 1 ⭐)</div>
        </div>
      </div>
      <div class="stamps">
        ${D.bodies.map((b) => `
          <div class="stamp ${s.visited[b.id] ? "on" : ""}" data-id="${b.id}">
            ${s.visited[b.id] ? '<span class="seal">BESUCHT</span>' : ""}
            ${ball(b.id, 52)}
            <div class="nm">${b.name}</div>
            <div class="st">${[1, 2, 3].map((k) => (k <= (s.quiz[b.id] || 0) ? "⭐" : "☆")).join("")}</div>
          </div>`).join("")}
      </div>
      <div class="row-gap" style="margin-top:22px">
        <button class="btn warm" id="btnCert" ${allDone ? "" : "disabled"}>📜 Meine Urkunde</button>
      </div>
      ${allDone ? "" : `<p class="center" style="color:var(--muted)">Besuche alle 8 Planeten, um deine Urkunde zu bekommen! (${planetsVisited}/8)</p>`}
    `);
    document.querySelectorAll(".stamp").forEach((st) => st.onclick = () => { closeModal(); G.setCompass(st.dataset.id); });
    $("btnCert").onclick = showCert;
  }

  function escapeHtml(t) { return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  function certHtml() {
    const s = G.state, stars = G.totalStars(), r = rankOf(stars);
    const date = new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
    return `
      <div class="cert">
        <div class="seal-big">🚀🪐⭐</div>
        <h1>URKUNDE</h1>
        <p>Hiermit wird bestätigt, dass</p>
        <div class="name">${escapeHtml(s.name)}</div>
        <p>erfolgreich durch unser Sonnensystem geflogen ist,<br>alle acht Planeten erforscht und dabei <b>${stars} Sterne</b> gesammelt hat.</p>
        <p>Verliehener Rang: <b>${r.icon} ${r.title}</b></p>
        <div class="foot"><div>${date}</div><div>Unterschrift</div></div>
      </div>`;
  }
  function showCert() {
    Sound.fanfare(); confetti();
    openModal(`${certHtml()}<div class="row-gap"><button class="btn primary" id="btnPrint">🖨️ Drucken</button><button class="btn ghost" id="btnBackPass">◀ Zurück</button></div>`);
    $("btnPrint").onclick = () => { $("printArea").innerHTML = certHtml(); window.print(); };
    $("btnBackPass").onclick = showPass;
  }

  function showOrder() {
    const order = D.planetOrder;
    let step = 0, mistakes = 0;
    const pool = shuffle(order);
    openModal(`
      <h2>🧩 Planeten ordnen</h2>
      <p class="sub">Tippe die Planeten der Reihe nach an – vom nächsten an der Sonne bis zum äußersten!</p>
      <div class="order-sun">
        <span class="ball p-sonne" style="width:54px;height:54px"></span>
        ${order.map((_, k) => `<div class="slot" data-k="${k}">${k + 1}.</div>`).join("")}
      </div>
      <div class="order-pool">${pool.map((id) => `<button class="pool-item" data-id="${id}">${ball(id, 46)}<span>${G.bodyById[id].name}</span></button>`).join("")}</div>
      <div class="mnemonic hidden" id="mnemo">🧠 Merksatz: ${D.mnemonic.split(" ").map((w) => `<b>${w[0]}</b>${w.slice(1)}`).join(" ")}</div>
      <div id="orderEnd"></div>`);
    document.querySelectorAll(".pool-item").forEach((btn) => btn.onclick = () => {
      const id = btn.dataset.id;
      if (id === order[step]) {
        Sound.correct();
        const slot = document.querySelector(`.slot[data-k="${step}"]`);
        slot.classList.add("filled");
        slot.innerHTML = `${ball(id, 36)}<span>${G.bodyById[id].name}</span>`;
        btn.remove();
        step++;
        if (step === order.length) {
          const stars = mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;
          $("mnemo").classList.remove("hidden");
          $("orderEnd").innerHTML = `<div class="center" style="margin-top:14px">
            <div class="stars-row">${[1, 2, 3].map((k) => `<span class="${k <= stars ? "" : "off"}">⭐</span>`).join("")}</div>
            <p class="intro">${stars === 3 ? "Perfekt! Du kennst die Reihenfolge! 🌟" : "Geschafft! Mit dem Merksatz klappt es beim nächsten Mal noch besser."}</p>
            <div class="row-gap"><button class="btn ghost" id="oAgain">🔁 Nochmal</button><button class="btn primary" id="oClose">🚀 Weiterfliegen</button></div></div>`;
          $("oAgain").onclick = showOrder;
          $("oClose").onclick = closeModal;
          confetti();
          G.onOrderFinished(stars);
        }
      } else {
        mistakes++;
        Sound.wrong();
        btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake");
        if (mistakes >= 2) $("mnemo").classList.remove("hidden");
      }
    });
  }

  function showHelp() {
    openModal(`
      <h2>❓ So funktioniert's</h2>
      <p class="sub">Fliege durchs Weltall, erforsche Planeten, löse Missionen und sammle Sterne!</p>
      <div class="help-grid">
        <div class="box"><h3>⌨️ Tastatur</h3>
          <div class="keys">
            <span><kbd>W</kbd> <kbd>↑</kbd></span><span>Gas geben</span>
            <span><kbd>S</kbd> <kbd>↓</kbd></span><span>Bremsen</span>
            <span><kbd>A</kbd> <kbd>D</kbd></span><span>Links / rechts lenken</span>
            <span><kbd>R</kbd> <kbd>F</kbd></span><span>Hoch / runter</span>
            <span><kbd>Leertaste</kbd></span><span>Turbo 🚀</span>
            <span><kbd>E</kbd></span><span>Planet erforschen</span>
            <span><kbd>Esc</kbd></span><span>Zurück</span>
          </div>
          <p style="color:var(--muted)">Du kannst auch mit der Maus ziehen, um zu lenken.</p>
        </div>
        <div class="box"><h3>📱 Tablet</h3><p>Links lenkst du mit dem Joystick. Rechts sind <b>GAS</b> und <b>TURBO</b>.</p>
          <h3 style="margin-top:14px">🧭 Kompass</h3><p>Tippe unten auf einen Planeten oder auf ein Namensschild. Ein gelber Pfeil zeigt dir den Weg – fliegen musst du selbst!</p></div>
        <div class="box"><h3>⭐ Sterne sammeln</h3><p>🏅 Missionen lösen<br>🏆 Quiz bei jedem Planeten (bis zu 3 ⭐)<br>🧩 Planeten ordnen<br>✨ Goldenen Sternenstaub einfliegen (20 = 1 ⭐)</p></div>
        <div class="box"><h3>📏 Gut zu wissen</h3><p>In echt sind die Planeten <b>viel weiter</b> voneinander entfernt und die Sonne ist <b>viel größer</b>. Damit du alles gut sehen kannst, haben wir das Sonnensystem hier zusammengeschoben.</p></div>
      </div>
      <div class="mnemonic">🧠 Merksatz für die Planeten: ${D.mnemonic.split(" ").map((w) => `<b>${w[0]}</b>${w.slice(1)}`).join(" ")}<br><small>(Merkur, Venus, Erde, Mars, Jupiter, Saturn, Uranus, Neptun)</small></div>
      <div class="row-gap">
        <button class="btn primary" id="btnSwitch">👋 Astronaut/in wechseln</button>
        <button class="btn ghost" id="btnReset">🗑️ Meinen Spielstand löschen</button>
      </div>`);
    $("btnSwitch").onclick = () => location.reload();
    let armed = false;
    $("btnReset").onclick = (e) => {
      if (!armed) { armed = true; e.currentTarget.textContent = "⚠️ Wirklich alles löschen? Nochmal tippen!"; return; }
      G.reset();
    };
  }

  return {
    nearId: null,
    init, onStateReady, showStart, countdown, showHUD, updateHUD, frame, warp,
    openPanel, closePanel, toast, celebrate, confetti, speak, closeModal, modalOpen
  };
})();
