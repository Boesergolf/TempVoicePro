const { showListModal } = require("../utils/luckWheel");

module.exports = {
  customId: "gr_list",

  async execute(interaction) {
    return showListModal(interaction);
  }
};
