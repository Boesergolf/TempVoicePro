module.exports = {
  customId: "panel_hub_modules",

  async execute(interaction) {
    return interaction.reply({
      content:
        "🧩 **Module**\n\n" +
        "Module verwaltest du mit:\n" +
        "`/module list`\n" +
        "`/module enable`\n" +
        "`/module disable`\n\n" +
        "Das Modul-Panel ist zusätzlich über `/panels` erreichbar.",
      flags: 64
    });
  }
};
