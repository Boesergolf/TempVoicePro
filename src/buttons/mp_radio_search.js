const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

module.exports = {
  customId: "mp_radio_search",

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("mp_radio_search_modal")
      .setTitle("Radiostream suchen");

    const queryInput = new TextInputBuilder()
      .setCustomId("query")
      .setLabel("Sendername oder Suchbegriff")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("z.B. 80s80s, Rock, Jazz")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(queryInput)
    );

    return interaction.showModal(modal);
  }
};
