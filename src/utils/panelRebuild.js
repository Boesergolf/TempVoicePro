const {
  createPanelHubMessage
} = require("./panelHub");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getPanelRebuildMaxMessages() {
  const value = Number(process.env.PANEL_REBUILD_MAX_MESSAGES || 300);

  if (!Number.isFinite(value)) {
    return 300;
  }

  return Math.max(25, Math.min(Math.floor(value), 500));
}

function isBotMessage(message, client) {
  return Boolean(
    message &&
    message.author &&
    client &&
    client.user &&
    message.author.id === client.user.id
  );
}

function shouldDeleteMessage(message, client, includeUserMessages) {
  if (!message || !client || !client.user) {
    return false;
  }

  if (isBotMessage(message, client)) {
    return true;
  }

  if (includeUserMessages) {
    return true;
  }

  return false;
}

async function safeUnpin(message) {
  if (!message || !message.pinned) {
    return;
  }

  await message.unpin().catch(error => {
    console.warn(
      "⚠️ PanelRebuild konnte Nachricht nicht entpinnen:",
      message.id,
      error.message
    );
  });
}

async function safeDelete(message) {
  if (!message) {
    return false;
  }

  await safeUnpin(message);

  return message.delete()
    .then(() => true)
    .catch(error => {
      console.warn(
        "⚠️ PanelRebuild konnte Nachricht nicht löschen:",
        message.id,
        error.message
      );

      return false;
    });
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

      const wasDeleted = await safeDelete(message);

      if (wasDeleted) {
        deleted++;
      }

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

  await hubMessage.pin().catch(error => {
    console.warn("⚠️ Zentralpanel konnte nicht gepinnt werden:", error.message);
  });

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
