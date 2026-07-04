const { getHistoryText } = require("../utils/musicPlayer");

module.exports = {
  customId: "mp_history",

  async execute(interaction) {
    return interaction.reply({
      content: getHistoryText(interaction.guild.id),
      flags: 64
    });
  }
};
