const {
  scheduleEphemeralReplyDelete
} = require("../utils/temporaryInteractionReply");

module.exports = {
  customId: "panel_hub_gluecksrad_command",

  async execute(interaction) {
    await interaction.reply({
      content:
        "🎡 **Glücksrad starten**\n\n" +
        "Nutze dafür den Slash-Command:\n" +
        "`/gluecksrad`\n\n" +
        "Für eigene Listen kannst du hier im Zentralpanel den Button **📋 Eigene Liste** verwenden.",
      flags: 64
    });

    scheduleEphemeralReplyDelete(interaction);
  }
};
