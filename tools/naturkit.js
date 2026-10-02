// Erzeugt models/naturekit.js aus dem „Nature Kit“ von Kenney (www.kenney.nl, Lizenz CC0).
// Aufruf: node naturkit.js <Ordner mit den .glb-Dateien>   (im Download-Zip: „Models/GLTF format“)
// Nur die hier aufgezählten Modelle werden eingebettet (als Base64, Namen mit „n_“ davor, damit nichts mit dem Space Kit kollidiert).
const fs = require("fs"), path = require("path");
const NAMES = [
  // Bäume
  "tree_default", "tree_default_dark", "tree_oak", "tree_oak_dark", "tree_detailed", "tree_fat", "tree_tall", "tree_simple", "tree_small", "tree_cone",
  "tree_default_fall", "tree_oak_fall", "tree_pineTallA_detailed", "tree_pineTallB_detailed", "tree_pineRoundA", "tree_pineRoundC", "tree_pineDefaultA", "tree_pineSmallA",
  // Büsche, Gras, Blumen, Pilze
  "plant_bush", "plant_bushLarge", "plant_bushDetailed", "plant_bushSmall", "grass", "grass_large", "grass_leafs", "plant_flatTall",
  "flower_redA", "flower_redB", "flower_yellowA", "flower_yellowB", "flower_purpleA", "flower_purpleB",
  "mushroom_red", "mushroom_redGroup", "mushroom_tanGroup",
  // Holz und Steine
  "log", "log_large", "log_stack", "stump_round", "stump_old", "rock_largeA", "rock_largeB", "rock_smallB", "rock_smallFlatA", "stone_largeB", "stone_smallC",
  // Am Wasser
  "lily_large", "lily_small", "canoe", "canoe_paddle",
  // Dinge
  "fence_simple", "fence_planks", "fence_gate", "bridge_wood", "campfire_logs", "tent_detailedOpen", "pot_large", "pot_small", "sign", "path_stone"
];
const dir = process.argv[2];
if (!dir) { console.log("Aufruf: node naturkit.js <Ordner mit den .glb-Dateien>"); process.exit(1); }
const out = {}; let bytes = 0;
for (const n of NAMES) {
  const f = path.join(dir, n + ".glb");
  if (!fs.existsSync(f)) { console.log("fehlt:", n); continue; }
  const b = fs.readFileSync(f); bytes += b.length; out["n_" + n] = b.toString("base64");
}
const js = "/* 3D-Modelle aus dem „Nature Kit“ von Kenney (www.kenney.nl), Lizenz CC0 – frei nutzbar. Automatisch erzeugt (tools/naturkit.js). */\nwindow.NATUREKIT = " + JSON.stringify(out, null, 0).replace(/","/g, "\",\n\"") + ";\n";
fs.writeFileSync(path.join(__dirname, "..", "models", "naturekit.js"), js);
console.log(Object.keys(out).length, "Modelle,", Math.round(bytes / 1024), "KB roh,", Math.round(js.length / 1024), "KB als JS");
