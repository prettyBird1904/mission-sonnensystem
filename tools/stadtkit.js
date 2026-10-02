// Erzeugt models/townkit.js aus „City Kit (Suburban)“ und „City Kit (Roads)“ von Kenney (www.kenney.nl, Lizenz CC0).
// Aufruf: node stadtkit.js <Ordner Suburban „Models/GLB format“> <Ordner Roads „Models/GLB format“>
// Die Modelle benutzen eine gemeinsame Farbtafel (Textures/colormap.png) – sie wird nach models/ kopiert und im Modell darauf verwiesen.
const fs = require("fs"), path = require("path");
const SUB = ["building-type-h", "building-type-i", "building-type-r", "building-type-k", "building-type-g", "building-type-a", "building-type-c",
  "driveway-short", "fence-1x3", "fence-low", "fence", "path-stones-short", "planter", "tree-large", "tree-small"];
const ROAD = ["light-curved", "light-square", "road-sign-object-warning", "construction-cone", "electricity-pole"];
const [subDir, roadDir] = process.argv.slice(2);
if (!subDir || !roadDir) { console.log("Aufruf: node stadtkit.js <Suburban-GLB-Ordner> <Roads-GLB-Ordner>"); process.exit(1); }
const models = path.join(__dirname, "..", "models"), out = {}; let bytes = 0;
function embed(dir, names, tex) {
  fs.copyFileSync(path.join(dir, "Textures", "colormap.png"), path.join(models, tex));
  for (const n of names) {
    const f = path.join(dir, n + ".glb"); if (!fs.existsSync(f)) { console.log("fehlt:", n); continue; }
    const b = fs.readFileSync(f), jlen = b.readUInt32LE(12), json = JSON.parse(b.slice(20, 20 + jlen).toString());
    for (const im of json.images || []) im.uri = "models/" + tex; // Farbtafel liegt neben den Modellen
    let js = Buffer.from(JSON.stringify(json)); const pad = (4 - (js.length % 4)) % 4; js = Buffer.concat([js, Buffer.alloc(pad, 0x20)]);
    const rest = b.slice(20 + jlen), head = Buffer.alloc(20);
    head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + js.length + rest.length, 8); head.writeUInt32LE(js.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
    const glb = Buffer.concat([head, js, rest]); bytes += glb.length; out["t_" + n] = glb.toString("base64");
  }
}
embed(subDir, SUB, "kenney-suburban.png");
embed(roadDir, ROAD, "kenney-roads.png");
const js = "/* 3D-Modelle aus „City Kit (Suburban)“ und „City Kit (Roads)“ von Kenney (www.kenney.nl), Lizenz CC0. Automatisch erzeugt (tools/stadtkit.js). */\nwindow.TOWNKIT = " + JSON.stringify(out).replace(/","/g, "\",\n\"") + ";\n";
fs.writeFileSync(path.join(models, "townkit.js"), js);
console.log(Object.keys(out).length, "Modelle,", Math.round(bytes / 1024), "KB roh,", Math.round(js.length / 1024), "KB als JS");
