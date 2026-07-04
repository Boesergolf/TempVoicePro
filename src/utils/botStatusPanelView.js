const { EmbedBuilder } = require("discord.js");
const db = require("../database/mysql");

function formatUptime(seconds) {
  const total = Math.floor(seconds);

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  const parts = [];

  if (days > 0) parts.push(days + "d");
  if (hours > 0) parts.push(hours + "h");
  if (minutes > 0) parts.push(minutes + "m");

  return parts.length > 0 ? parts.join(" ") : "unter 1m";
}

function formatMemory() {
  const used = process.memoryUsage().rss;
  const mb = used / 1024 / 1024;

  return mb.toFixed(1) + " MB";
}

async function getDatabaseStatus() {
  try {
    await db.query("SELECT 1");
    return "✅ Verbunden";
  } catch (err) {
    console.error("❌ Bot Status DB Fehler:", err.message);
    return "❌ Fehler";
  }
}

async function createBotStatusPanelEmbed(client) {
  const dbStatus = await getDatabaseStatus();

  const guildCount = client.guilds && client.guilds.cache
    ? client.guilds.cache.size
    : 0;

  const commandCount = client.commands && client.commands.size
    ? client.commands.size
    : 0;

  const ping = client.ws && typeof client.ws.ping === "number"
    ? Math.round(client.ws.ping) + " ms"
    : "Unbekannt";

  return new EmbedBuilder()
    .setTitle("🤖 Bot Status")
    .setColor(0x5865f2)
    .setDescription("Live-Status von TempVoicePro.")
    .addFields(
      {
        name: "Status",
        value: "✅ Online",
        inline: true
      },
      {
        name: "Ping",
        value: ping,
        inline: true
      },
      {
        name: "Uptime",
        value: formatUptime(process.uptime()),
        inline: true
      },
      {
        name: "RAM",
        value: formatMemory(),
        inline: true
      },
      {
        name: "Server",
        value: String(guildCount),
        inline: true
      },
      {
        name: "Commands",
        value: String(commandCount),
        inline: true
      },
      {
        name: "Datenbank",
        value: dbStatus,
        inline: true
      }
    )
    .setFooter({
      text: "Aktualisiert automatisch"
    })
    .setTimestamp();
}

module.exports = {
  createBotStatusPanelEmbed
};
