const {
  handleModuleButton
} = require("../utils/modulePanelActions");

module.exports = {
  customId: "module_enable",

  async execute(interaction) {
    return handleModuleButton(interaction, true);
  }
};
