const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  customId: "mp_playlist",

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("mp_playlist_modal")
      .setTitle("Playlist abspielen");

    const playlist = new TextInputBuilder()
      .setCustomId("playlist")
      .setLabel("Playlist-Name")
      .setPlaceholder("Meine Musik")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const scope = new TextInputBuilder()
      .setCustomId("scope")
      .setLabel("Scope: user oder global")
      .setPlaceholder("user")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(playlist),
      new ActionRowBuilder().addComponents(scope)
    );

    return interaction.showModal(modal);
  }
};
