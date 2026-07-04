const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const {
  getKnownModules,
  getGuildModules,
  setModuleEnabled
} = require("../utils/guildModules");

const {
  updateGuildPanels
} = require("../utils/panelAutoRefresh");

function moduleChoices() {
  return Object.entries(getKnownModules()).map(([key, info]) => ({
    name: info.name,
    value: key
  }));
}

function createModulesEmbed(modules) {
  const lines = Object.values(modules).map(module => {
    const status = module.enabled ? "✅ Aktiv" : "❌ Deaktiviert";

    return "**" + module.name + "** `" + module.key + "`\n" +
      status + " — " + module.description;
  });

  return new EmbedBuilder()
    .setTitle("🧩 Server Module")
    .setColor(0x5865f2)
    .setDescription(lines.join("\n\n"))
    .setFooter({
      text: "TempVoicePro Modul-System"
    })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("module")
    .setDescription("Verwaltet die TempVoicePro Module für diesen Server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("Zeigt alle Module und deren Status")
    )
    .addSubcommand(sub =>
      sub
        .setName("enable")
        .setDescription("Aktiviert ein Modul")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Welches Modul soll aktiviert werden?")
            .setRequired(true)
            .addChoices(...moduleChoices())
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("disable")
        .setDescription("Deaktiviert ein Modul")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Welches Modul soll deaktiviert werden?")
            .setRequired(true)
            .addChoices(...moduleChoices())
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      const modules = await getGuildModules(interaction.guild.id);

      return interaction.editReply({
        embeds: [createModulesEmbed(modules)]
      });
    }

    const moduleName = interaction.options.getString("name");
    const enabled = subcommand === "enable";

    const result = await setModuleEnabled(
      interaction.guild.id,
      moduleName,
      enabled
    );

    const modules = await getGuildModules(interaction.guild.id);

    await updateGuildPanels(interaction.guild).catch(err => {
      console.error("❌ Module Panel konnte nicht sofort aktualisiert werden:", err.message);
    });

    return interaction.editReply({
      content:
        (result.enabled ? "✅ Modul aktiviert: `" : "❌ Modul deaktiviert: `") +
        result.key +
        "`",
      embeds: [createModulesEmbed(modules)]
    });
  }
};
