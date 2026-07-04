const { ChannelType } = require("discord.js");

const {
  PANEL_CHANNEL_NAME,
  findPanelMessage
} = require("./panelChannel");

const {
  createTempVoicePanelEmbed
} = require("./tempVoicePanelView");

const updateTimers = new Map();

async function updateTempVoiceStatusPanel(guild) {
  if (!guild || !guild.channels) return false;

  const panelChannel = guild.channels.cache.find(channel =>
    channel &&
    channel.type === ChannelType.GuildText &&
    channel.name === PANEL_CHANNEL_NAME
  );

  if (!panelChannel) {
    return false;
  }

  const botId = guild.client.user.id;

  const panelMessage = await findPanelMessage(
    panelChannel,
    botId,
    "TempVoice Status"
  );

  if (!panelMessage) {
    return false;
  }

  await panelMessage.edit({
    embeds: [await createTempVoicePanelEmbed(guild)],
    components: []
  });

  return true;
}

function scheduleTempVoiceStatusUpdate(guild, delayMs = 4000) {
  if (!guild) return;

  const guildId = guild.id;

  const oldTimer = updateTimers.get(guildId);

  if (oldTimer) {
    clearTimeout(oldTimer);
  }

  const timer = setTimeout(async () => {
    updateTimers.delete(guildId);

    try {
      await updateTempVoiceStatusPanel(guild);
    } catch (err) {
      console.error("❌ TempVoice Status Panel Auto-Update Fehler:", err.message);
    }
  }, delayMs);

  updateTimers.set(guildId, timer);
}

module.exports = {
  updateTempVoiceStatusPanel,
  scheduleTempVoiceStatusUpdate
};
