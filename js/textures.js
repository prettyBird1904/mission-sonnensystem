/* =========================================================
   Prozedurale Texturen: Planeten werden per Rauschen „gemalt“.
   Gesampelt wird auf der Kugeloberfläche -> keine Nahtstellen.
   ========================================================= */
(function () {
  // ---------- 3D Value-Noise ----------
  const perm = new Uint8Array(512);
  let seed = 1337;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  (function initPerm() {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = rand();

  function fade(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(x, y, z) { return vals[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]]; }

  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const x0 = lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), u);
    const x1 = lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u);
    const x2 = lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u);
    const x3 = lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u);
    return lerp(lerp(x0, x1, v), lerp(x2, x3, v), w);
  }
  function fbm(x, y, z, oct = 5) {
    let sum = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += noise(x * f + i * 17.1, y * f + i * 9.3, z * f + i * 3.7) * amp;
      norm += amp; amp *= 0.5; f *= 2.03;
    }
    return sum / norm;
  }

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function ramp(stops, t) {
    t = clamp(t);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const a = stops[i - 1], b = stops[i];
        return mix(a[1], b[1], (t - a[0]) / (b[0] - a[0] || 1));
      }
    }
    return stops[stops.length - 1][1];
  }

  // ---------- Krater ----------
  function makeCraters(n, minR, maxR, s) {
    seed = s;
    const list = [];
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const size = minR + Math.pow(rand(), 3) * (maxR - minR);
      list.push({ x: r * Math.cos(th), y: u, z: r * Math.sin(th), r: size });
    }
    return list;
  }
  function craterShade(craters, x, y, z) {
    let s = 0;
    for (const c of craters) {
      const dx = x - c.x, dy = y - c.y, dz = z - c.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) / c.r;
      if (d < 1.25) {
        if (d < 0.85) s -= 0.22 * (1 - d * 0.6);
        else if (d < 1.1) s += 0.16 * (1 - Math.abs(d - 0.97) / 0.13);
      }
    }
    return s;
  }

  // ---------- Generische Kugel-Textur ----------
  function sphereCanvas(w, h, fn, alpha = false) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let j = 0; j < h; j++) {
      const lat = (0.5 - (j + 0.5) / h) * Math.PI;
      const cl = Math.cos(lat), y = Math.sin(lat);
      for (let i = 0; i < w; i++) {
        const lon = ((i + 0.5) / w) * Math.PI * 2;
        const x = cl * Math.cos(lon), z = cl * Math.sin(lon);
        const c = fn(x, y, z, lat, lon);
        const k = (j * w + i) * 4;
        d[k] = clamp(c[0], 0, 255); d[k + 1] = clamp(c[1], 0, 255); d[k + 2] = clamp(c[2], 0, 255);
        d[k + 3] = alpha ? clamp(c[3], 0, 255) : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // ---------- Planeten-Maler ----------
  const painters = {
    sonne(x, y, z) {
      const n = fbm(x * 6, y * 6, z * 6, 5);
      const g = fbm(x * 22, y * 22, z * 22, 3);
      return ramp([[0, hex("#c2410c")], [0.4, hex("#f97316")], [0.62, hex("#fbbf24")], [0.85, hex("#fff3c4")], [1, hex("#ffffff")]], n * 0.8 + g * 0.45 - 0.05);
    },
    merkur: (() => {
      const cr = makeCraters(140, 0.03, 0.2, 11);
      return (x, y, z) => {
        const n = fbm(x * 4, y * 4, z * 4, 5);
        const t = n + craterShade(cr, x, y, z);
        return ramp([[0, hex("#4b4540")], [0.5, hex("#8d857c")], [1, hex("#d6d0c7")]], t);
      };
    })(),
    venus(x, y, z, lat) {
      const w = fbm(x * 2, y * 2, z * 2, 4);
      const n = fbm(x * 1.5 + w * 2, y * 5 + w * 1.5, z * 1.5, 5);
      const band = Math.sin(lat * 9 + n * 6) * 0.5 + 0.5;
      return ramp([[0, hex("#a26b2c")], [0.4, hex("#d9a855")], [0.7, hex("#f1d49a")], [1, hex("#fff4d6")]], n * 0.7 + band * 0.3);
    },
    erde(x, y, z, lat) {
      const n = fbm(x * 1.7 + 3, y * 1.7, z * 1.7, 6);
      const alat = Math.abs(lat) / (Math.PI / 2);
      const ice = alat > 0.82 + (n - 0.5) * 0.25;
      if (ice) return hex("#f1f5f9");
      const sea = 0.52;
      if (n < sea) {
        const depth = (sea - n) / sea;
        return mix(hex("#1d8fe0"), hex("#0b2a6b"), smooth(0, 0.35, depth));
      }
      const h = (n - sea) / (1 - sea);
      const detail = fbm(x * 9, y * 9, z * 9, 3);
      const dry = smooth(0.35, 0.05, Math.abs(Math.abs(lat) - 0.4)) * smooth(0.45, 0.65, detail);
      let c = mix(hex("#3f9d3a"), hex("#1f6b2a"), detail);
      c = mix(c, hex("#d6b56d"), dry * 0.85);
      c = mix(c, hex("#8b7355"), smooth(0.35, 0.6, h));
      if (alat > 0.7) c = mix(c, hex("#dfe7ec"), smooth(0.7, 0.85, alat));
      return c;
    },
    mond: (() => {
      const cr = makeCraters(120, 0.03, 0.22, 42);
      return (x, y, z) => {
        const maria = smooth(0.45, 0.62, fbm(x * 1.6, y * 1.6, z * 1.6, 4));
        const n = fbm(x * 6, y * 6, z * 6, 4);
        const t = n * 0.7 + 0.3 - maria * 0.35 + craterShade(cr, x, y, z);
        return ramp([[0, hex("#3e3e42")], [0.5, hex("#8e8e94")], [1, hex("#e9e9ee")]], t);
      };
    })(),
    mars(x, y, z, lat) {
      const n = fbm(x * 2.5, y * 2.5, z * 2.5, 6);
      const d = fbm(x * 8, y * 8, z * 8, 3);
      let c = ramp([[0, hex("#5a2215")], [0.4, hex("#a4432a")], [0.6, hex("#d06a3a")], [1, hex("#eaa36b")]], n * 0.8 + d * 0.3);
      const alat = Math.abs(lat) / (Math.PI / 2);
      if (alat > 0.86 + (d - 0.5) * 0.12) c = hex("#f5ece6");
      return c;
    },
    jupiter(x, y, z, lat, lon) {
      const w = fbm(x * 3, y * 3, z * 3, 4);
      const b = Math.sin(lat * 16 + w * 3.2) * 0.5 + 0.5;
      const b2 = Math.sin(lat * 38 + w * 5) * 0.5 + 0.5;
      let c = ramp([[0, hex("#6e4029")], [0.35, hex("#b0703f")], [0.6, hex("#d9b184")], [0.82, hex("#eddcc0")], [1, hex("#f7eedd")]], b * 0.75 + b2 * 0.25);
      // Großer Roter Fleck
      const sLat = -0.38, sLon = 2.2;
      let dl = lon - sLon;
      const e = Math.sqrt(Math.pow(dl / 0.32, 2) + Math.pow((lat - sLat) / 0.12, 2));
      if (e < 1.4) {
        const swirl = fbm(x * 10, y * 10, z * 10, 3);
        const t = smooth(1.4, 0.6, e);
        c = mix(c, mix(hex("#b5452b"), hex("#e0875a"), swirl), t);
      }
      return c;
    },
    saturn(x, y, z, lat) {
      const w = fbm(x * 2, y * 2, z * 2, 3);
      const b = Math.sin(lat * 20 + w * 1.5) * 0.5 + 0.5;
      return ramp([[0, hex("#7a5a32")], [0.45, hex("#b8925c")], [0.75, hex("#d9bf8c")], [1, hex("#eadbb8")]], b * 0.7 + w * 0.3);
    },
    uranus(x, y, z, lat) {
      const w = fbm(x * 2, y * 2, z * 2, 3);
      const b = Math.sin(lat * 10 + w) * 0.5 + 0.5;
      return ramp([[0, hex("#6fc3d1")], [0.6, hex("#9ee3ea")], [1, hex("#d3f6f7")]], b * 0.35 + w * 0.5 + 0.1);
    },
    neptun(x, y, z, lat, lon) {
      const w = fbm(x * 3, y * 3, z * 3, 4);
      const b = Math.sin(lat * 14 + w * 2.5) * 0.5 + 0.5;
      let c = ramp([[0, hex("#1b2f8f")], [0.5, hex("#2f58d6")], [1, hex("#6e9bff")]], b * 0.6 + w * 0.4);
      const streak = smooth(0.72, 0.8, fbm(x * 2, y * 20, z * 2, 3));
      c = mix(c, hex("#e6efff"), streak * 0.8);
      const e = Math.sqrt(Math.pow((lon - 4) / 0.3, 2) + Math.pow((lat + 0.35) / 0.12, 2));
      if (e < 1) c = mix(c, hex("#0d1a55"), smooth(1, 0.4, e));
      return c;
    }
  };

  function planetTexture(id, size) {
    const w = size || 512;
    const cv = sphereCanvas(w, w / 2, painters[id]);
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  function cloudTexture() {
    const cv = sphereCanvas(512, 256, (x, y, z) => {
      const n = fbm(x * 2.2 + 10, y * 3.2, z * 2.2, 6);
      const a = smooth(0.52, 0.72, n) * 235;
      return [255, 255, 255, a];
    }, true);
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function ringTexture(faint) {
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 8;
    const ctx = cv.getContext("2d");
    for (let i = 0; i < 512; i++) {
      const t = i / 511;
      let a;
      if (faint) {
        a = (Math.abs(t - 0.3) < 0.02 || Math.abs(t - 0.62) < 0.015 || Math.abs(t - 0.9) < 0.03) ? 0.55 : 0.04;
      } else {
        a = 0.25 + 0.6 * fbm(t * 40, 0.5, 0.5, 3);
        if (t > 0.58 && t < 0.63) a *= 0.08; // Cassini-Teilung
        a *= smooth(0, 0.08, t) * smooth(1, 0.9, t);
      }
      const shade = faint ? [180, 225, 235] : mix(hex("#bfa37a"), hex("#fff1d6"), fbm(t * 25, 1, 1, 2));
      ctx.fillStyle = `rgba(${shade[0] | 0},${shade[1] | 0},${shade[2] | 0},${clamp(a)})`;
      ctx.fillRect(i, 0, 1, 8);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function glowTexture(inner, outer) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(0.25, outer);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function nebulaTexture() {
    const cv = sphereCanvas(1024, 512, (x, y, z) => {
      // Milchstraßen-Band entlang einer geneigten Ebene
      const band = Math.exp(-Math.pow((y * 0.9 + x * 0.35) * 3.2, 2));
      const n = fbm(x * 2.5, y * 2.5, z * 2.5, 5);
      const m = fbm(x * 1.2 + 5, y * 1.2, z * 1.2, 4);
      let c = [4, 6, 18];
      c = mix(c, hex("#3b1d6e"), smooth(0.45, 0.8, m) * 0.55);
      c = mix(c, hex("#0e4a7a"), smooth(0.5, 0.85, n) * 0.45);
      c = mix(c, hex("#b98ad8"), band * smooth(0.35, 0.8, n) * 0.5);
      c = mix(c, hex("#fde6c8"), band * smooth(0.6, 0.9, n) * 0.35);
      return c;
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function dotTexture() {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }

  window.Textures = { planetTexture, cloudTexture, ringTexture, glowTexture, nebulaTexture, dotTexture };
})();
