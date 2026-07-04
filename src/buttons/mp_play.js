const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  customId: "mp_play",

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("mp_play_modal")
      .setTitle("Musik abspielen");

    const input = new TextInputBuilder()
      .setCustomId("input")
      .setLabel("Song, YouTube-Link oder Spotify-Link")
      .setPlaceholder("Never gonna give you up")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }
};
