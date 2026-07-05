const fs = require("fs");
const path = require("path");

const changelogPath = path.join(process.cwd(), "CHANGELOG.md");

function printHelp() {
  console.log("");
  console.log("Nutzung:");
  console.log('  npm run changelog:add -- "Titel" "Punkt 1" "Punkt 2"');
  console.log("");
  console.log("Beispiel:");
  console.log('  npm run changelog:add -- "Auto-Mod Anti-Spam" "Anti-Spam eingebaut" "Auto-Warn vorbereitet"');
  console.log("");
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const title = String(args[0] || "").trim();
const points = args.slice(1).map(value => String(value || "").trim()).filter(Boolean);

if (!title) {
  console.error("❌ Bitte einen Titel angeben.");
  printHelp();
  process.exit(1);
}

if (!fs.existsSync(changelogPath)) {
  console.error("❌ CHANGELOG.md wurde nicht gefunden.");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);

const bodyPoints = points.length > 0
  ? points.map(point => point.startsWith("- ") ? point : "- " + point).join("\n")
  : "- Änderungen ergänzt.";

const entry = [
  "### " + today + " - " + title,
  "",
  bodyPoints,
  ""
].join("\n");

const current = fs.readFileSync(changelogPath, "utf8");
const marker = "## [Unreleased]\n";

if (!current.includes(marker)) {
  console.error("❌ Marker '## [Unreleased]' wurde in CHANGELOG.md nicht gefunden.");
  process.exit(1);
}

const next = current.replace(marker, marker + "\n" + entry);
fs.writeFileSync(changelogPath, next);

console.log("✅ Changelog aktualisiert:");
console.log("   " + today + " - " + title);
