const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const db = require("../database/mysql");
const { detectSource, getMetadataForUrl } = require("../utils/musicMetadata");

const {
  addTracks,
  getQueueText,
  getNowPlayingText,
  clearQueue,
  removeTrack,
  shuffleQueue,
  setVolume,
  getVolume,
  skipTrack,
  stopMusic,
  pauseMusic,
  resumeMusic
} = require("../utils/musicPlayer");

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function getScope(interaction) {
  return interaction.options.getString("scope") || "user";
}

function getOwnerKey(scope, userId) {
  return scope === "global" ? "GLOBAL" : userId;
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Musik im Voice Channel abspielen")

    .addSubcommand(sub =>
      sub
        .setName("play")
        .setDescription("YouTube/Spotify Link oder Suchbegriff abspielen")
        .addStringOption(option =>
          option
            .setName("input")
            .setDescription("YouTube-Link, Spotify-Link oder Suchbegriff")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("playlist")
        .setDescription("Gespeicherte Playlist abspielen")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Name der Playlist")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName("scope")
            .setDescription("User oder globale Playlist")
            .setRequired(false)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Global", value: "global" }
            )
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("nowplaying")
        .setDescription("Aktuell laufenden Track anzeigen")
    )

    .addSubcommand(sub =>
      sub
        .setName("queue")
        .setDescription("Aktuelle Musik-Queue anzeigen")
    )

    .addSubcommand(sub =>
      sub
        .setName("clear")
        .setDescription("Warteschlange leeren")
    )

    .addSubcommand(sub =>
      sub
        .setName("shuffle")
        .setDescription("Warteschlange mischen")
    )

    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Track aus der Warteschlange entfernen")
        .addIntegerOption(option =>
          option
            .setName("position")
            .setDescription("Position in der Queue")
            .setRequired(true)
            .setMinValue(1)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("volume")
        .setDescription("Lautstärke einstellen")
        .addIntegerOption(option =>
          option
            .setName("percent")
            .setDescription("Lautstärke von 1 bis 100 Prozent")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("skip")
        .setDescription("Aktuellen Track überspringen")
    )

    .addSubcommand(sub =>
      sub
        .setName("stop")
        .setDescription("Musik stoppen und Bot aus Voice entfernen")
    )

    .addSubcommand(sub =>
      sub
        .setName("pause")
        .setDescription("Musik pausieren")
    )

    .addSubcommand(sub =>
      sub
        .setName("resume")
        .setDescription("Musik fortsetzen")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "nowplaying") {
        return interaction.reply({
          content: getNowPlayingText(interaction.guild.id),
          flags: 64
        });
      }

      if (subcommand === "queue") {
        return interaction.reply({
          content: getQueueText(interaction.guild.id),
          flags: 64
        });
      }

      if (subcommand === "clear") {
        const count = clearQueue(interaction.guild.id);

        return interaction.reply({
          content: count > 0
            ? "🧹 Queue geleert. Entfernte Tracks: **" + count + "**"
            : "❌ Die Queue ist bereits leer.",
          flags: 64
        });
      }

      if (subcommand === "shuffle") {
        const shuffled = shuffleQueue(interaction.guild.id);

        return interaction.reply({
          content: shuffled
            ? "🔀 Queue wurde gemischt."
            : "❌ Es sind nicht genug Tracks in der Queue.",
          flags: 64
        });
      }

      if (subcommand === "remove") {
        const position = interaction.options.getInteger("position");
        const removed = removeTrack(interaction.guild.id, position);

        return interaction.reply({
          content: removed
            ? "🗑 Entfernt: **" + (removed.title || removed.query || removed.url || "Unbekannt") + "**"
            : "❌ An dieser Position wurde kein Track gefunden.",
          flags: 64
        });
      }

      if (subcommand === "volume") {
        const percent = interaction.options.getInteger("percent");
        const volume = setVolume(interaction.guild.id, percent);

        return interaction.reply({
          content: volume === false
            ? "❌ Es läuft aktuell keine Musik."
            : "🔊 Lautstärke gesetzt auf **" + volume + "%**.",
          flags: 64
        });
      }

      if (subcommand === "skip") {
        const skipped = skipTrack(interaction.guild.id);

        return interaction.reply({
          content: skipped
            ? "⏭ Track wurde übersprungen."
            : "❌ Es läuft aktuell keine Musik.",
          flags: 64
        });
      }

      if (subcommand === "stop") {
        const stopped = stopMusic(interaction.guild.id);

        return interaction.reply({
          content: stopped
            ? "⏹ Musik gestoppt."
            : "❌ Es läuft aktuell keine Musik.",
          flags: 64
        });
      }

      if (subcommand === "pause") {
        const paused = pauseMusic(interaction.guild.id);

        return interaction.reply({
          content: paused
            ? "⏸ Musik pausiert."
            : "❌ Es läuft aktuell keine Musik.",
          flags: 64
        });
      }

      if (subcommand === "resume") {
        const resumed = resumeMusic(interaction.guild.id);

        return interaction.reply({
          content: resumed
            ? "▶️ Musik läuft weiter."
            : "❌ Es läuft aktuell keine pausierte Musik.",
          flags: 64
        });
      }

      await interaction.deferReply();

      if (subcommand === "play") {
        const input = interaction.options.getString("input").trim();

        let track;

        if (isHttpUrl(input)) {
          const source = detectSource(input);
          let title = null;

          if (source === "spotify") {
            const metadata = await getMetadataForUrl(input).catch(() => null);
            title = metadata?.displayTitle || metadata?.title || null;
          }

          track = {
            source,
            url: input,
            title
          };
        } else {
          track = {
            source: "search",
            query: input,
            title: input
          };
        }

        await addTracks(interaction, [track]);

        return interaction.editReply(
          "✅ Track wurde zur Queue hinzugefügt."
        );
      }

      if (subcommand === "playlist") {
        const name = normalizeName(interaction.options.getString("name"));
        const scope = getScope(interaction);
        const ownerKey = getOwnerKey(scope, interaction.user.id);

        const [playlistRows] = await db.execute(
          "SELECT * FROM music_playlists WHERE guildId = ? AND ownerKey = ? AND scope = ? AND name = ?",
          [interaction.guild.id, ownerKey, scope, name]
        );

        const playlist = playlistRows[0];

        if (!playlist) {
          return interaction.editReply("❌ Playlist wurde nicht gefunden.");
        }

        const [items] = await db.execute(
          "SELECT * FROM music_playlist_items WHERE playlistId = ? ORDER BY position ASC LIMIT 100",
          [playlist.id]
        );

        if (items.length === 0) {
          return interaction.editReply("❌ Diese Playlist ist leer.");
        }

        const tracks = items.map(item => ({
          source: item.source,
          title: item.title,
          url: item.url
        }));

        await addTracks(interaction, tracks);

        const embed = new EmbedBuilder()
          .setTitle("🎵 Playlist gestartet")
          .setColor("Green")
          .setDescription(
            "Playlist: **" + playlist.name + "**\n" +
            "Einträge geladen: **" + tracks.length + "**"
          );

        return interaction.editReply({ embeds: [embed] });
      }

      return interaction.reply({
        content: "❌ Unbekannter Music-Befehl.",
        flags: 64
      });
    } catch (err) {
      console.error("❌ Music Command Fehler:", err);

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(
          "❌ Music Fehler: " + err.message
        );
      }

      return interaction.reply({
        content: "❌ Music Fehler: " + err.message,
        flags: 64
      });
    }
  }
};
