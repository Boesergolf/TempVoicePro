const { getQueueText } = require("../utils/musicPlayer");

module.exports = {
  customId: "mp_queue",

  async execute(interaction) {
    return interaction.reply({
      content: getQueueText(interaction.guild.id),
      ephemeral: true
    });
  }
};
