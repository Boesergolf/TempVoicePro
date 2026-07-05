const {
  handleAutoModMessage
} = require("../utils/autoMod");

const {
  PANEL_CHANNEL_NAME,
  isProtectedPanelMessage,
  schedulePanelMessageDelete
} = require("../utils/panelChannel");

async function handlePanelChannelCleanup(message) {
  if (!message.guild || !message.channel) {
    return;
  }

  if (message.channel.name !== PANEL_CHANNEL_NAME) {
    return;
  }

  if (isProtectedPanelMessage(message)) {
    return;
  }

  schedulePanelMessageDelete(message);
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
