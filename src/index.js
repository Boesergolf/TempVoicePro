require("dotenv").config();

const {
  startWebPanel
} = require("./webpanel/server");

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.env") });

const {
  Client,
  GatewayIntentBits,
  Collection
} = require("discord.js");

console.log("🚀 Bot startet...");

if (!process.env.TOKEN) {
  console.error("❌ TOKEN fehlt in der .env Datei!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();

try {
  require("./handlers/eventHandler")(client);
  console.log("✅ Events geladen");
} catch (err) {
  console.error("❌ EventHandler Fehler:", err);
}

try {
  require("./handlers/commandHandler")(client);
  console.log("✅ Commands geladen");
} catch (err) {
  console.error("❌ CommandHandler Fehler:", err);
}

client.on("error", (err) => {
  console.error("❌ Client Fehler:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

startWebPanel(client);

client.login(process.env.TOKEN);
