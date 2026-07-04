const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "../events");

  if (!fs.existsSync(eventsPath)) {
    console.error("❌ Events-Ordner nicht gefunden:", eventsPath);
    return;
  }

  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith(".js"));

  let loaded = 0;

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);

    try {
      const event = require(filePath);

      if (!event.name || typeof event.execute !== "function") {
        console.warn(`⚠️ Event übersprungen: ${file} hat kein gültiges name/execute`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      loaded++;
      console.log(`✅ Event geladen: ${event.name}`);
    } catch (err) {
      console.error(`❌ Fehler beim Laden von Event ${file}:`, err);
    }
  }

  console.log(`📁 ${loaded} Event(s) geladen`);
};
