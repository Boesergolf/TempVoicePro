const { toggleLoop } = require("../utils/musicPlayer");
const { refreshMusicPanelMessage } = require("../utils/musicPanelView");

function label(mode) {
  if (mode === "track") return "🔂 Aktueller Track wird wiederholt.";
  if (mode === "queue") return "🔁 Ganze Queue wird wiederholt.";
  return "➡️ Loop ist ausgeschaltet.";
}

module.exports = {
  customId: "mp_loop",

  async execute(interaction) {
    const mode = toggleLoop(interaction.guild.id);

    await refreshMusicPanelMessage(interaction);

    if (!mode) {
      return interaction.reply({
        content: "❌ Es läuft aktuell keine Musik.",
        flags: 64
      });
    }

    return interaction.reply({
      content: label(mode),
      flags: 64
    });
  }
};
