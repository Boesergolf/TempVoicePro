const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = ["src", "."];
const skipDirs = new Set(["node_modules", ".git", ".pm2"]);
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        walk(fullPath);
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
}

walk("src");

for (const file of ["deploy-commands.js", "init-db.js"]) {
  if (fs.existsSync(file)) {
    files.push(file);
  }
}

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    failed = true;
    console.error("\n❌ Syntaxfehler in:", file);
    console.error(result.stderr || result.stdout);
  } else {
    console.log("✅ OK:", file);
  }
}

if (failed) {
  console.error("\n❌ Check fehlgeschlagen.");
  process.exit(1);
}

console.log("\n✅ Alle JS-Dateien sind syntaktisch sauber.");
