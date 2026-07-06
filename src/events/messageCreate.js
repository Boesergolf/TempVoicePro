const {
  PermissionFlagsBits
} = require("discord.js");

const {
  handleAutoModMessage
} = require("../utils/autoMod");

const {
  PANEL_CHANNEL_NAME,
  isProtectedPanelMessage
} = require("../utils/panelChannel");

function getPanelDeleteDelayMs() {
  const value = Number(process.env.PANEL_MESSAGE_DELETE_MS || 30000);

  if (!Number.isFinite(value)) {
    return 30000;
  }

  return Math.max(5000, Math.min(value, 24 * 60 * 60 * 1000));
}

function getPanelChannelName() {
  return process.env.PANEL_CHANNEL_NAME || PANEL_CHANNEL_NAME || "bot-panels";
}

function isPanelChannelMessage(message) {
  if (!message.guild || !message.channel) {
    return false;
  }

  return message.channel.name === getPanelChannelName();
}

function hasDeletePermission(message) {
  const me = message.guild.members.me;

  if (!me) {
    return false;
  }

  const permissions = message.channel.permissionsFor(me);

  if (!permissions) {
    return false;
  }

  return permissions.has(PermissionFlagsBits.ManageMessages);
}

function shouldKeepPanelMessage(message) {
  if (message.pinned) {
    return true;
  }

  try {
    if (isProtectedPanelMessage(message)) {
      return true;
    }
  } catch (error) {
    console.error("Panel Protected Check Fehler:", error);
  }

  if (
    message.author &&
    message.client &&
    message.author.id === message.client.user.id &&
    (
      message.embeds.length > 0 ||
      message.components.length > 0
    )
  ) {
    return true;
  }

  return false;
}

function schedulePanelCleanupDelete(message) {
  const delayMs = getPanelDeleteDelayMs();

  setTimeout(async () => {
    try {
      const freshMessage = await message.channel.messages
        .fetch(message.id)
        .catch(() => null);

      if (!freshMessage) {
        return;
      }

      if (shouldKeepPanelMessage(freshMessage)) {
        return;
      }

      if (!hasDeletePermission(freshMessage)) {
        console.warn(
          "⚠️ Bot hat keine Berechtigung 'Nachrichten verwalten' im Panel-Channel #" +
          freshMessage.channel.name
        );
        return;
      }

      if (!freshMessage.deletable) {
        console.warn(
          "⚠️ Panel-Nachricht ist laut Discord.js nicht löschbar: " +
          freshMessage.id
        );
        return;
      }

      await freshMessage.delete();
    } catch (error) {
      console.error("Panel Message Delete Fehler:", error);
    }
  }, delayMs);
}

async function handlePanelChannelCleanup(message) {
  if (!isPanelChannelMessage(message)) {
    return;
  }

  if (shouldKeepPanelMessage(message)) {
    return;
  }

  schedulePanelCleanupDelete(message);
}

module.exports = {
  name: "messageCreate",

  async execute(message) {
    const autoModResult = await handleAutoModMessage(message).catch(error => {
      console.error("Auto-Mod Fehler:", error);
      return null;
    });

    if (autoModResult && autoModResult.deleted) {
      return;
    }

    await handlePanelChannelCleanup(message).catch(error => {
      console.error("Panel Message Cleanup Fehler:", error);
    });
  }
};
