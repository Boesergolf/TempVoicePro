const { getNowPlayingText } = require("../utils/musicPlayer");

module.exports = {
  customId: "mp_now",

  async execute(interaction) {
    return interaction.reply({
      content: getNowPlayingText(interaction.guild.id),
      flags: 64
    });
  }
};
