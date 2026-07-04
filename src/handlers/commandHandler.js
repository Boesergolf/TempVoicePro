const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const commandsPath = path.join(__dirname, "../commands");

  if (!fs.existsSync(commandsPath)) {
    console.error("❌ Commands-Ordner nicht gefunden:", commandsPath);
    return;
  }

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

  let loaded = 0;

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    try {
      const command = require(filePath);

      if (!command.data || !command.data.name || typeof command.execute !== "function") {
        console.warn(`⚠️ Command übersprungen: ${file} hat kein gültiges data/execute`);
        continue;
      }

      client.commands.set(command.data.name, command);
      loaded++;

      console.log(`✅ Command geladen: /${command.data.name}`);
    } catch (err) {
      console.error(`❌ Fehler beim Laden von Command ${file}:`, err);
    }
  }

  console.log(`📁 ${loaded} Command(s) geladen`);
};
