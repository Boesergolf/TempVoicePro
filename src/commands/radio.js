const {
  SlashCommandBuilder
} = require("discord.js");

const {
  playRadioStream,
  stopRadio,
  getRadio,
  getRadioText
} = require("../utils/radioPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("radio")
    .setDescription("Spielt öffentliche Radiostreams im Voice Channel ab.")
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName("play")
        .setDescription("Startet einen Radiostream.")
        .addStringOption(option =>
          option
            .setName("url")
            .setDescription("Direkte Stream-URL oder .m3u/.pls Playlist-URL.")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Optionaler Anzeigename für den Sender.")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("stop")
        .setDescription("Stoppt den laufenden Radiostream.")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("now")
        .setDescription("Zeigt den aktuell laufenden Radiostream.")
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: 64
    });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "play") {
      const url = interaction.options.getString("url", true);
      const name = interaction.options.getString("name") || null;

      try {
        const radio = await playRadioStream(interaction, url, name);

        return interaction.editReply(
          "📻 Radiostream gestartet: **" +
          radio.title +
          "**\n🔗 " +
          radio.streamUrl
        );
      } catch (error) {
        console.error("❌ Radio Start Fehler:", error.message);
        return interaction.editReply("❌ Radio konnte nicht gestartet werden: " + error.message);
      }
    }

    if (subcommand === "stop") {
      const radio = getRadio(interaction.guild.id);

      if (!radio) {
        return interaction.editReply("📻 Es läuft aktuell kein Radio.");
      }

      stopRadio(interaction.guild.id);
      return interaction.editReply("⏹️ Radio wurde gestoppt.");
    }

    if (subcommand === "now") {
      return interaction.editReply(getRadioText(interaction.guild.id));
    }

    return interaction.editReply("❌ Unbekannter Radio-Befehl.");
  }
};
