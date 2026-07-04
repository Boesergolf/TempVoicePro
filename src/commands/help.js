const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

function makeEmbed(title, description, fields, color) {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(color || "Blue")
    .setDescription(description)
    .addFields(fields)
    .setFooter({
      text: "TempVoicePro • Erstellt mit Unterstützung von ChatGPT"
    })
    .setTimestamp();
}

function overviewHelp() {
  return makeEmbed(
    "📘 TempVoicePro Hilfe",
    "Wähle eine Kategorie mit `/help kategorie:...` aus.",
    [
      {
        name: "🎧 TempVoice",
        value:
          "/setup - TempVoice einrichten\n" +
          "/stats - Statistiken anzeigen\n" +
          "/lock - Channel sperren\n" +
          "/unlock - Channel entsperren\n" +
          "/rename - Channel umbenennen\n" +
          "/addcoowner - Co-Owner hinzufügen\n" +
          "/removecoowner - Co-Owner entfernen"
      },
      {
        name: "🎵 Musik",
        value:
          "/music play - Musik abspielen\n" +
          "/music playlist - Playlist abspielen\n" +
          "/music queue - Queue anzeigen\n" +
          "/music nowplaying - aktuellen Song anzeigen\n" +
          "/music skip - Song überspringen\n" +
          "/music stop - Musik stoppen\n" +
          "/music pause - pausieren\n" +
          "/music resume - fortsetzen\n" +
          "/music clear - Queue leeren\n" +
          "/music shuffle - Queue mischen\n" +
          "/music remove - Song aus Queue entfernen\n" +
          "/music volume - Lautstärke setzen"
      },
      {
        name: "📂 Playlists",
        value:
          "/playlist create - Playlist erstellen\n" +
          "/playlist list - Playlists anzeigen\n" +
          "/playlist add - Link hinzufügen\n" +
          "/playlist show - Playlist anzeigen\n" +
          "/playlist import - Spotify/YouTube Playlist importieren\n" +
          "/playlist remove - Eintrag entfernen\n" +
          "/playlist delete - Playlist löschen"
      },
      {
        name: "🤖 ChatGPT",
        value:
          "/chatgpt - ChatGPT eine Frage stellen"
      }
    ],
    "Blue"
  );
}

function tempvoiceHelp() {
  return makeEmbed(
    "🎧 TempVoice Hilfe",
    "Diese Befehle verwalten temporäre Voice Channels.",
    [
      {
        name: "/setup",
        value: "Richtet das TempVoice System ein."
      },
      {
        name: "/stats",
        value: "Zeigt Statistiken zum TempVoice System."
      },
      {
        name: "/lock",
        value: "Sperrt deinen aktuellen TempVoice Channel."
      },
      {
        name: "/unlock",
        value: "Entsperrt deinen aktuellen TempVoice Channel."
      },
      {
        name: "/rename name:...",
        value: "Benennt deinen aktuellen TempVoice Channel um."
      },
      {
        name: "/addcoowner user:@User",
        value: "Fügt einen Co-Owner zu deinem TempVoice Channel hinzu."
      },
      {
        name: "/removecoowner user:@User",
        value: "Entfernt einen Co-Owner aus deinem TempVoice Channel."
      }
    ],
    "Green"
  );
}

function panelHelp() {
  return makeEmbed(
    "🎛 Panel Button Hilfe",
    "Diese Buttons erscheinen im temporären Panel-Textkanal.",
    [
      {
        name: "Channel Verwaltung",
        value:
          "Lock - Channel sperren\n" +
          "Unlock - Channel entsperren\n" +
          "Hide - Channel verstecken\n" +
          "Show - Channel sichtbar machen\n" +
          "Rename - Channel umbenennen\n" +
          "Limit - Userlimit setzen\n" +
          "Bitrate - Bitrate ändern"
      },
      {
        name: "Owner Funktionen",
        value:
          "Owner - Owner anzeigen\n" +
          "Claim - Owner übernehmen\n" +
          "Add Co-Owner - Co-Owner hinzufügen\n" +
          "Remove Co-Owner - Co-Owner entfernen"
      },
      {
        name: "Moderation",
        value:
          "Private - Channel privat machen\n" +
          "Public - Channel öffentlich machen\n" +
          "Kick - User aus dem Channel kicken\n" +
          "Ban - User aus dem Channel ausschließen\n" +
          "Unban - User wieder erlauben\n" +
          "Close - Channel schließen"
      }
    ],
    "Purple"
  );
}

function musicHelp() {
  return makeEmbed(
    "🎵 Musik Hilfe",
    "Diese Befehle steuern den Musikplayer.",
    [
      {
        name: "/music play input:...",
        value:
          "Spielt einen Song, YouTube-Link oder Spotify-Link ab.\n" +
          "Beispiel: /music play input:Never gonna give you up"
      },
      {
        name: "/music playlist name:...",
        value: "Spielt eine gespeicherte Playlist ab."
      },
      {
        name: "Queue",
        value:
          "/music queue - Queue anzeigen\n" +
          "/music nowplaying - aktuellen Song anzeigen\n" +
          "/music skip - Song überspringen\n" +
          "/music clear - Queue leeren\n" +
          "/music shuffle - Queue mischen\n" +
          "/music remove position:1 - Song entfernen"
      },
      {
        name: "Player",
        value:
          "/music pause - pausieren\n" +
          "/music resume - fortsetzen\n" +
          "/music stop - stoppen\n" +
          "/music volume percent:50 - Lautstärke setzen"
      },
      {
        name: "Spotify Hinweis",
        value:
          "Spotify-Link erkannt: Der Bot liest Titel/Künstler aus Spotify und spielt den passenden Track über YouTube ab."
      }
    ],
    "Orange"
  );
}

function playlistHelp() {
  return makeEmbed(
    "📂 Playlist Hilfe",
    "Playlists können pro User oder global für den Server gespeichert werden.",
    [
      {
        name: "/playlist create name:... scope:User",
        value: "Erstellt eine neue Playlist."
      },
      {
        name: "/playlist list scope:User",
        value: "Zeigt gespeicherte Playlists an."
      },
      {
        name: "/playlist add playlist:... url:...",
        value: "Fügt einen YouTube-, Spotify- oder normalen Link hinzu."
      },
      {
        name: "/playlist show playlist:...",
        value: "Zeigt den Inhalt einer Playlist."
      },
      {
        name: "/playlist import playlist:... url:...",
        value: "Importiert eine Spotify- oder YouTube-Playlist."
      },
      {
        name: "/playlist remove playlist:... position:1",
        value: "Entfernt einen Eintrag aus der Playlist."
      },
      {
        name: "/playlist delete playlist:...",
        value: "Löscht eine komplette Playlist."
      }
    ],
    "Aqua"
  );
}

function chatgptHelp() {
  return makeEmbed(
    "🤖 ChatGPT Hilfe",
    "Mit diesem Command kannst du dem Bot eine Frage stellen.",
    [
      {
        name: "/chatgpt frage:...",
        value:
          "Stellt ChatGPT eine Frage.\n" +
          "Beispiel: /chatgpt frage:Was kannst du?"
      },
      {
        name: "Private Antwort",
        value:
          "Mit private:Ja ist die Antwort nur für dich sichtbar.\n" +
          "Mit private:Nein ist sie öffentlich."
      },
      {
        name: "Hinweis",
        value:
          "Diese Funktion benötigt einen gültigen OpenAI API Key und verfügbares API-Guthaben."
      }
    ],
    "Blue"
  );
}

function techHelp() {
  return makeEmbed(
    "🛠 Technik Hilfe",
    "Nützliche Befehle für Wartung und Fehlerbehebung.",
    [
      {
        name: "PM2",
        value:
          "pm2 restart tempvoice --update-env\n" +
          "pm2 logs tempvoice --lines 80\n" +
          "pm2 flush tempvoice\n" +
          "pm2 save"
      },
      {
        name: "Slash Commands",
        value:
          "node deploy-commands.js\n" +
          "Danach Discord mit STRG + R neu laden."
      },
      {
        name: "Datenbank",
        value:
          "npm run db:init"
      },
      {
        name: "Sicherheit",
        value:
          ".env, Bot Token, API Keys und Passwörter niemals veröffentlichen."
      }
    ],
    "DarkGrey"
  );
}

function getHelp(category) {
  if (category === "tempvoice") return tempvoiceHelp();
  if (category === "panel") return panelHelp();
  if (category === "music") return musicHelp();
  if (category === "playlist") return playlistHelp();
  if (category === "chatgpt") return chatgptHelp();
  if (category === "technik") return techHelp();

  return overviewHelp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Zeigt die Hilfe für TempVoicePro")
    .addStringOption(option =>
      option
        .setName("kategorie")
        .setDescription("Welche Hilfe möchtest du sehen?")
        .setRequired(false)
        .addChoices(
          { name: "Übersicht", value: "uebersicht" },
          { name: "TempVoice", value: "tempvoice" },
          { name: "Panel Buttons", value: "panel" },
          { name: "Musik", value: "music" },
          { name: "Playlists", value: "playlist" },
          { name: "ChatGPT", value: "chatgpt" },
          { name: "Technik", value: "technik" }
        )
    )
    .addBooleanOption(option =>
      option
        .setName("oeffentlich")
        .setDescription("Soll die Hilfe für alle sichtbar sein?")
        .setRequired(false)
    ),

  async execute(interaction) {
    const category = interaction.options.getString("kategorie") || "uebersicht";
    const publicAnswer = interaction.options.getBoolean("oeffentlich") || false;

    const options = {
      embeds: [getHelp(category)]
    };

    if (!publicAnswer) {
      options.flags = MessageFlags.Ephemeral;
    }

    return interaction.reply(options);
  }
};
