const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const {
  createPanelHubMessage
} = require("./panelHub");

const {
  createPlaylistPanelMessage
} = require("./playlistPanel");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getPanelRebuildMaxMessages() {
  const value = Number(process.env.PANEL_REBUILD_MAX_MESSAGES || 200);

  if (!Number.isFinite(value)) {
    return 200;
  }

  return Math.max(25, Math.min(Math.floor(value), 500));
}

function shouldDeleteMessage(message, client, includeUserMessages) {
  if (!message) {
    return false;
  }

  if (message.pinned) {
    return false;
  }

  if (includeUserMessages) {
    return true;
  }

  return message.author && client.user && message.author.id === client.user.id;
}

async function cleanupPanelChannel(channel, client, options = {}) {
  const maxMessages = getPanelRebuildMaxMessages();
  const includeUserMessages = Boolean(options.includeUserMessages);

  let deleted = 0;
  let scanned = 0;
  let before = null;

  while (scanned < maxMessages) {
    const fetchOptions = {
      limit: Math.min(100, maxMessages - scanned)
    };

    if (before) {
      fetchOptions.before = before;
    }

    const messages = await channel.messages.fetch(fetchOptions);

    if (!messages.size) {
      break;
    }

    const oldest = messages.last();

    if (!oldest) {
      break;
    }

    before = oldest.id;
    scanned += messages.size;

    for (const message of messages.values()) {
      if (!shouldDeleteMessage(message, client, includeUserMessages)) {
        continue;
      }

      await message.delete().then(() => {
        deleted++;
      }).catch(error => {
        console.warn(
          "⚠️ PanelRebuild konnte Nachricht nicht löschen:",
          message.id,
          error.message
        );
      });

      await sleep(250);
    }

    if (messages.size < fetchOptions.limit) {
      break;
    }
  }

  return {
    scanned,
    deleted
  };
}

function createAdditionalPanelsInfoMessage() {
  const embed = new EmbedBuilder()
    .setTitle("📌 Weitere Hauptpanels")
    .setDescription(
      [
        "Dieses Kontrollzentrum hält den Channel kompakt.",
        "",
        "Wenn du ein spezielles Panel brauchst, nutze die Buttons im Kontrollzentrum oder die Slash-Commands:",
        "",
        "🎵 `/musicpanel`",
        "🎡 `/gluecksradpanel`",
        "🧩 `/panels`",
        "🎙️ `/setup` für TempVoice",
        "",
        "Tipp: Nicht jedes Panel dauerhaft mehrfach erstellen. Lieber einmal sauber neu aufbauen."
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro Panel Ordnung" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_music")
      .setLabel("Music Panel")
      .setEmoji("🎵")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("panel_hub_gluecksrad")
      .setLabel("Glücksrad")
      .setEmoji("🎡")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_modules")
      .setLabel("Module")
      .setEmoji("🧩")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

async function sendRebuiltPanelLayout(channel) {
  const sentMessages = [];

  const hubMessage = await channel.send(createPanelHubMessage());
  sentMessages.push(hubMessage);

  await hubMessage.pin().catch(error => {
    console.warn("⚠️ PanelHub konnte nicht gepinnt werden:", error.message);
  });

  const playlistMessage = await channel.send(createPlaylistPanelMessage());
  sentMessages.push(playlistMessage);

  const infoMessage = await channel.send(createAdditionalPanelsInfoMessage());
  sentMessages.push(infoMessage);

  return sentMessages;
}

async function rebuildPanelChannel(channel, client, options = {}) {
  const cleanup = await cleanupPanelChannel(channel, client, options);
  const sentMessages = await sendRebuiltPanelLayout(channel);

  return {
    cleanup,
    created: sentMessages.length
  };
}

module.exports = {
  rebuildPanelChannel,
  cleanupPanelChannel,
  sendRebuiltPanelLayout
};
