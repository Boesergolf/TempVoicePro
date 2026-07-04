const {
  startPanelAutoRefresh
} = require("../utils/panelAutoRefresh");

const { Events } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,

  execute(client) {
    startPanelAutoRefresh(client);
    console.log(`✅ Eingeloggt als ${client.user.tag}`);
  }
};
