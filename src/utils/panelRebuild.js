const {
  createPanelHubMessage
} = require("./panelHub");

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
  if (!message || !client || !client.user) {
    return false;
  }

  if (message.author && message.author.id === client.user.id) {
    return true;
  }

  if (includeUserMessages && !message.pinned) {
    return true;
  }

  return false;
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

async function sendRebuiltPanelLayout(channel) {
  const hubMessage = await channel.send(createPanelHubMessage());

  return [hubMessage];
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
