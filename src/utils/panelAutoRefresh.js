const { ChannelType } = require("discord.js");

const {
  PANEL_CHANNEL_NAME,
  findPanelMessage
} = require("./panelChannel");

const {
  createTempVoicePanelEmbed
} = require("./tempVoicePanelView");

const {
  createMusicPanelEmbed,
  createMusicPanelRows
} = require("./musicPanelView");

const {
  createBotStatusPanelEmbed
} = require("./botStatusPanelView");

let started = false;

function getRefreshMs() {
  const value = Number(process.env.PANEL_AUTO_REFRESH_MS || 30000);

  if (Number.isNaN(value) || value < 10000) {
    return 30000;
  }

  return value;
}

async function updateGuildPanels(guild) {
  if (!guild || !guild.channels) return false;

  const panelChannel = guild.channels.cache.find(channel =>
    channel &&
    channel.type === ChannelType.GuildText &&
    channel.name === PANEL_CHANNEL_NAME
  );

  if (!panelChannel) return false;

  const botId = guild.client.user.id;

  const botStatusPanel = await findPanelMessage(
    panelChannel,
    botId,
    "Bot Status"
  );

  if (botStatusPanel) {
    await botStatusPanel.edit({
      embeds: [await createBotStatusPanelEmbed(guild.client)],
      components: []
    }).catch(() => {});
  }

  const tempVoicePanel = await findPanelMessage(
    panelChannel,
    botId,
    "TempVoice Status"
  );

  if (tempVoicePanel) {
    await tempVoicePanel.edit({
      embeds: [await createTempVoicePanelEmbed(guild)],
      components: []
    }).catch(() => {});
  }

  const musicPanel = await findPanelMessage(
    panelChannel,
    botId,
    "Music Player"
  );

  if (musicPanel) {
    await musicPanel.edit({
      embeds: [createMusicPanelEmbed(guild.id)],
      components: createMusicPanelRows()
    }).catch(() => {});
  }

  return true;
}

async function updateAllPanels(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      await updateGuildPanels(guild);
    } catch (err) {
      console.error("❌ Panel Auto-Refresh Fehler:", err.message);
    }
  }
}

function startPanelAutoRefresh(client) {
  if (started) return;

  started = true;

  const refreshMs = getRefreshMs();

  console.log("🔄 Panel Auto-Refresh aktiv alle " + refreshMs + "ms");

  setTimeout(() => {
    updateAllPanels(client).catch(() => {});
  }, 10000);

  setInterval(() => {
    updateAllPanels(client).catch(() => {});
  }, refreshMs);
}

module.exports = {
  startPanelAutoRefresh,
  updateGuildPanels,
  updateAllPanels
};
