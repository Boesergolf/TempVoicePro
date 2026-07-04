const { ChannelType } = require("discord.js");

const PANEL_CHANNEL_NAME = process.env.PANEL_CHANNEL_NAME || "bot-panels";

function getPanelMessageDeleteMs() {
  const value = Number(process.env.PANEL_MESSAGE_DELETE_MS || 60000);

  if (Number.isNaN(value) || value < 5000) {
    return 60000;
  }

  return value;
}

async function getOrCreatePanelChannel(guild, parentId = null) {
  let channel = guild.channels.cache.find(item =>
    item &&
    item.type === ChannelType.GuildText &&
    item.name === PANEL_CHANNEL_NAME
  );

  if (!channel) {
    channel = await guild.channels.create({
      name: PANEL_CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: parentId || undefined,
      topic: "Zentrale Bot-Panels für TempVoicePro"
    });

    return channel;
  }

  if (parentId && channel.parentId !== parentId) {
    await channel.setParent(parentId, {
      lockPermissions: false
    }).catch(err => {
      console.error("❌ Panel Channel konnte nicht verschoben werden:", err.message);
    });
  }

  return channel;
}

function isProtectedPanelMessage(message) {
  if (!message) return false;
  if (message.pinned) return true;

  const titles = (message.embeds || [])
    .map(embed => String(embed.title || ""))
    .join(" ");

  return (
    titles.includes("TempVoicePro Panels") ||
    titles.includes("Music Player") ||
    titles.includes("Glücksrad Panel")
  );
}

async function findPanelMessage(channel, botId, titlePart) {
  const messages = await channel.messages.fetch({ limit: 50 });

  return messages.find(message =>
    message.author &&
    message.author.id === botId &&
    message.embeds &&
    message.embeds.some(embed =>
      String(embed.title || "").includes(titlePart)
    )
  );
}

async function cleanupDuplicatePanelMessages(channel, botId, titlePart, keepMessageId) {
  const messages = await channel.messages.fetch({ limit: 50 });

  const panels = messages.filter(message =>
    message.author &&
    message.author.id === botId &&
    message.id !== keepMessageId &&
    message.embeds &&
    message.embeds.some(embed =>
      String(embed.title || "").includes(titlePart)
    )
  );

  for (const message of panels.values()) {
    await message.delete().catch(() => {});
  }
}

function schedulePanelMessageDelete(message) {
  if (!message) return;
  if (isProtectedPanelMessage(message)) return;

  const delay = getPanelMessageDeleteMs();

  setTimeout(async () => {
    try {
      if (!message.deleted && message.deletable) {
        await message.delete();
      }
    } catch {}
  }, delay);
}

module.exports = {
  PANEL_CHANNEL_NAME,
  getPanelMessageDeleteMs,
  getOrCreatePanelChannel,
  isProtectedPanelMessage,
  findPanelMessage,
  cleanupDuplicatePanelMessages,
  schedulePanelMessageDelete
};
