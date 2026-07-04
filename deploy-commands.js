const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { REST, Routes } = require("discord.js");

dotenv.config({ path: path.join(__dirname, ".env") });

if (!process.env.TOKEN) {
  console.error("TOKEN fehlt in der .env Datei!");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error("CLIENT_ID fehlt in der .env Datei!");
  process.exit(1);
}

if (!process.env.GUILD_ID) {
  console.error("GUILD_ID fehlt in der .env Datei!");
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "src", "commands");

if (!fs.existsSync(commandsPath)) {
  console.error("Commands-Ordner nicht gefunden: " + commandsPath);
  process.exit(1);
}

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(function(file) {
    return file.endsWith(".js");
  });

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);

  try {
    const command = require(filePath);

    if (!command.data || typeof command.data.toJSON !== "function") {
      console.warn("Command übersprungen: " + file);
      continue;
    }

    commands.push(command.data.toJSON());
    console.log("Command vorbereitet: /" + command.data.name);
  } catch (err) {
    console.error("Fehler beim Laden von " + file + ":", err);
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async function() {
  try {
    console.log("Deploye " + commands.length + " Slash Command(s)...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Slash Commands erfolgreich deployed.");
  } catch (err) {
    console.error("Deploy Fehler:", err);
    process.exit(1);
  }
})();
