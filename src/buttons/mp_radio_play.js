const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

module.exports = {
  customId: "mp_radio_play",

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("mp_radio_play_modal")
      .setTitle("Radiostream starten");

    const urlInput = new TextInputBuilder()
      .setCustomId("url")
      .setLabel("Stream-URL oder .m3u/.pls URL")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("https://streams.80s80s.de/web/mp3-192/streams.80s80s.de/play.m3u")
      .setRequired(true);

    const nameInput = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("Sendername optional")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("80s80s")
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(urlInput),
      new ActionRowBuilder().addComponents(nameInput)
    );

    return interaction.showModal(modal);
  }
};
