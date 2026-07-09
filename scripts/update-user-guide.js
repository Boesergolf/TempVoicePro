const fs = require("fs");
const path = require("path");

const guidePath = path.join(__dirname, "..", "BENUTZERHANDBUCH.md");
const commandsPath = path.join(__dirname, "..", "src", "commands");
const startMarker = "<!-- AUTO_COMMANDS_START -->";
const endMarker = "<!-- AUTO_COMMANDS_END -->";

const OPTION_TYPES = {
  1: "Subcommand",
  2: "Subcommand-Gruppe",
  3: "Text",
  4: "Zahl",
  5: "Ja/Nein",
  6: "User",
  7: "Channel",
  8: "Rolle",
  9: "Mentionable",
  10: "Kommazahl",
  11: "Datei"
};

function readCommands() {
  return fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"))
    .sort()
    .map(file => {
      const command = require(path.join(commandsPath, file));

      if (!command.data || typeof command.data.toJSON !== "function") {
        return null;
      }

      return command.data.toJSON();
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function accessLabel(command) {
  if (!command.default_member_permissions) {
    return "Normale Nutzer";
  }

  const value = BigInt(command.default_member_permissions);
  const administrator = 1n << 3n;
  const manageGuild = 1n << 5n;

  if ((value & administrator) !== 0n) {
    return "Admins";
  }

  if ((value & manageGuild) !== 0n) {
    return "Admins/Moderatoren mit Server verwalten";
  }

  return "Eingeschraenkte Berechtigung";
}

function optionLine(option) {
  const required = option.required ? "erforderlich" : "optional";
  const type = OPTION_TYPES[option.type] || "Option";

  return "`" + option.name + "` (" + type + ", " + required + ") - " + option.description;
}

function formatCommand(command) {
  const lines = [];
  const options = command.options || [];
  const subcommands = options.filter(option => option.type === 1);
  const normalOptions = options.filter(option => option.type !== 1 && option.type !== 2);

  lines.push("### `/" + command.name + "`");
  lines.push("");
  lines.push(command.description || "Keine Beschreibung.");
  lines.push("");
  lines.push("Zugriff: " + accessLabel(command));

  if (subcommands.length > 0) {
    lines.push("");
    lines.push("Subcommands:");

    for (const subcommand of subcommands) {
      lines.push("- `/" + command.name + " " + subcommand.name + "` - " + subcommand.description);

      for (const option of subcommand.options || []) {
        lines.push("  - " + optionLine(option));
      }
    }
  }

  if (normalOptions.length > 0) {
    lines.push("");
    lines.push("Optionen:");

    for (const option of normalOptions) {
      lines.push("- " + optionLine(option));
    }
  }

  return lines.join("\n");
}

function buildCommandReference() {
  const commands = readCommands();
  const lines = [
    startMarker,
    "",
    "_Dieser Abschnitt wird mit `npm run docs:update` aus `src/commands` generiert._",
    "",
    "Anzahl Slash-Commands: " + commands.length,
    "",
    commands.map(formatCommand).join("\n\n"),
    "",
    endMarker
  ];

  return lines.join("\n");
}

function main() {
  const guide = fs.readFileSync(guidePath, "utf8");
  const start = guide.indexOf(startMarker);
  const end = guide.indexOf(endMarker);

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Auto-Command-Marker im Benutzerhandbuch nicht gefunden.");
  }

  const before = guide.slice(0, start);
  const after = guide.slice(end + endMarker.length);
  const next = before + buildCommandReference() + after;

  fs.writeFileSync(guidePath, next);
  console.log("Benutzerhandbuch aktualisiert: " + path.relative(process.cwd(), guidePath));
}

main();
