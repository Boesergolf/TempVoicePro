const { EmbedBuilder } = require("discord.js");

const {
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
      text: "Verwaltung über /module"
    })
    .setTimestamp();
}

module.exports = {
  createModulePanelEmbed
};
