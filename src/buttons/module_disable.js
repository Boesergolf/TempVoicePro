const {
  handleModuleButton
} = require("../utils/modulePanelActions");

module.exports = {
  customId: "module_disable",

  async execute(interaction) {
    return handleModuleButton(interaction, false);
  }
};
