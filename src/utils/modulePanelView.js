const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  getKnownModules,
  getGuildModules
} = require("./guildModules");

async function createModulePanelEmbed(guildId) {
  const modules = await getGuildModules(guildId);

  const lines = Object.values(modules).map(module => {
    const icon = module.enabled ? "✅" : "❌";

    return icon + " **" + module.name + "** `" + module.key + "`\n" +
      module.description;
  });

  return new EmbedBuilder()
    .setTitle("🧩 Server Module")
    .setColor(0x5865f2)
    .setDescription(lines.join("\n\n"))
    .setFooter({
      text: "Modul auswählen und per Button aktivieren/deaktivieren"
    })
    .setTimestamp();
}

function createModulePanelRows() {
  const modules = getKnownModules();

  const options = Object.entries(modules).map(([key, module]) => ({
    label: module.name,
    description: module.description.slice(0, 100),
    value: key
  }));

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("module_select")
      .setPlaceholder("Modul auswählen")
      .addOptions(options)
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("module_enable")
      .setLabel("Aktivieren")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("module_disable")
      .setLabel("Deaktivieren")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
  );

  return [
    selectRow,
    buttonRow
  ];
}

module.exports = {
  createModulePanelEmbed,
  createModulePanelRows
};
