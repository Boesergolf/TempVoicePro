# TempVoicePro

TempVoicePro ist ein Discord Bot für temporäre Voice Channels, Music Playback, Playlists, Music Panel Controls und ChatGPT-Integration.

## Funktionen

### TempVoice System

- `/setup` richtet das TempVoice System ein
- erstellt automatisch einen Creator Voice Channel
- beim Betreten des Creator Channels wird automatisch eine temporäre Lobby erstellt
- Lobby-Namen werden automatisch hochgezählt, zum Beispiel `Lobby 1`, `Lobby 2`
- für jede Lobby wird ein eigener temporärer Panel-Textkanal erstellt
- leere temporäre Voice Channels werden automatisch gelöscht
- dazugehörige Panel-Textkanäle und Datenbankeinträge werden ebenfalls gelöscht

### TempVoice Panel Buttons

Im temporären Panel-Textkanal gibt es Buttons für:

- Lock
- Unlock
- Hide
- Show
- Rename
- Limit
- Bitrate
- Owner anzeigen
- Claim
- Close
- Private
- Public
- Kick
- Ban
- Unban
- Add Co-Owner
- Remove Co-Owner

### TempVoice Commands

- `/setup`
- `/stats`
- `/lock`
- `/unlock`
- `/rename`
- `/addcoowner`
- `/removecoowner`

## Music Player

Der Bot kann Musik in Discord Voice Channels abspielen.

Unterstützt werden:

- direkte YouTube Links
- YouTube Shorts Links
- YouTube Suchbegriffe
- Spotify Links über Titel/Künstler-Erkennung
- gespeicherte Playlists
- Queue Verwaltung
- Pause und Resume
- Skip
- Stop
- Shuffle
- Remove
- Volume

### YouTube Links

Direkte YouTube Links werden direkt abgespielt.

YouTube Shorts werden intern automatisch in normale YouTube Watch-Links umgewandelt.

Beispiel:

`https://www.youtube.com/shorts/VIDEOID`

wird intern zu:

`https://www.youtube.com/watch?v=VIDEOID`

### Spotify Hinweis

Spotify wird nicht direkt gestreamt.

Der Bot liest Titel und Künstler aus Spotify und sucht den passenden Track über YouTube.

Ablauf:

`Spotify-Link erkannt → Titel/Künstler lesen → passenden Track über YouTube suchen → YouTube-Audio im Discord Voice abspielen`

### yt-dlp Timeout

Für langsame YouTube-Antworten kann in der `.env` dieser Wert gesetzt werden:

`YTDLP_TIMEOUT_MS=60000`

Das gibt `yt-dlp` bis zu 60 Sekunden Zeit, bevor der Track als Timeout gewertet wird.

### Auto-Leave

Wenn die Queue leer ist, kann der Bot automatisch nach kurzer Wartezeit den Voice Channel verlassen.

Dadurch bleibt der Bot nicht unnötig im Voice Channel hängen.

## Music Commands

- `/music play`
- `/music playlist`
- `/music queue`
- `/music nowplaying`
- `/music skip`
- `/music stop`
- `/music pause`
- `/music resume`
- `/music clear`
- `/music shuffle`
- `/music remove`
- `/music volume`

## Music Panel

Mit `/musicpanel` erstellt oder aktualisiert der Bot einen eigenen Channel:

- `#music-player`

Dort gibt es Buttons für:

- Play
- Playlist starten
- Playlists anzeigen
- Queue anzeigen
- Now Playing
- Pause
- Resume
- Skip
- Stop
- Clear
- Shuffle
- Remove
- Volume
- Refresh

Das Panel zeigt außerdem:

- aktuellen Track
- Queue
- Spotify Hinweis

Wenn `/musicpanel` mehrfach ausgeführt wird, wird das vorhandene Panel aktualisiert und doppelte Panels werden entfernt.

## Playlist System

Playlists werden in MySQL gespeichert.

Unterstützt werden:

- User Playlists
- globale Server Playlists
- YouTube Links
- Spotify Links
- Spotify Playlist Import
- YouTube Playlist Import

Playlist Commands:

- `/playlist create`
- `/playlist list`
- `/playlist add`
- `/playlist show`
- `/playlist import`
- `/playlist remove`
- `/playlist delete`

## ChatGPT Integration

Mit `/chatgpt` kann man dem Bot Fragen stellen.

Benötigt:

- gültigen OpenAI API Key
- verfügbares API Guthaben
- gesetzte `.env` Werte

Command:

- `/chatgpt`

## Help System

Der Bot enthält ein deutsches Hilfesystem:

- `/help`
- `/help kategorie:TempVoice`
- `/help kategorie:Panel Buttons`
- `/help kategorie:Musik`
- `/help kategorie:Playlists`
- `/help kategorie:ChatGPT`
- `/help kategorie:Technik`

## Installation

Repository klonen:

`git clone https://github.com/Boesergolf/TempVoicePro.git`

In den Ordner wechseln:

`cd TempVoicePro`

Pakete installieren:

`npm install`

`.env` erstellen:

`cp .env.example .env`

`.env` bearbeiten:

`nano .env`

## Beispiel .env

Diese Werte müssen lokal in der `.env` gesetzt werden:

- `TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `DB_HOST`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_COOLDOWN_MS`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `YOUTUBE_API_KEY`
- `YTDLP_TIMEOUT_MS`

Wichtig:

`.env`, Bot Token, API Keys und Passwörter niemals posten und niemals committen.

## Datenbank

Datenbank initialisieren:

`npm run db:init`

Die Tabellen werden automatisch erstellt oder erweitert.

## Slash Commands deployen

`node deploy-commands.js`

Danach Discord mit `STRG + R` neu laden.

## Bot starten

Direkt starten:

`npm start`

Mit PM2 starten:

`pm2 start src/index.js --name tempvoice`

PM2 speichern:

`pm2 save`

Bot neustarten:

`pm2 restart tempvoice --update-env`

Logs anzeigen:

`pm2 logs tempvoice --lines 80`

Logs leeren:

`pm2 flush tempvoice`

## yt-dlp

Der Music Player nutzt `yt-dlp` für YouTube Audio.

Version prüfen:

`yt-dlp --version`

Falls nötig installieren:

`mkdir -p /opt/yt-dlp`

`curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /opt/yt-dlp/yt-dlp`

`chmod +x /opt/yt-dlp/yt-dlp`

`ln -sf /opt/yt-dlp/yt-dlp /usr/local/bin/yt-dlp`

## Nützliche Wartungsbefehle

Syntax prüfen:

`find src -name "*.js" -print0 | xargs -0 -n1 node --check`

Commands deployen und Bot neustarten:

`node deploy-commands.js`

`pm2 restart tempvoice --update-env`

Git speichern:

`git add .`

`git commit -m "Update TempVoicePro"`

`git push origin master`

`pm2 save`

## Projektstruktur

TempVoicePro

- `deploy-commands.js`
- `init-db.js`
- `package.json`
- `README.md`
- `src/buttons`
- `src/commands`
- `src/database`
- `src/events`
- `src/handlers`
- `src/utils`

## Sicherheit

Niemals veröffentlichen:

- Discord Bot Token
- OpenAI API Key
- Spotify Client Secret
- YouTube API Key
- Datenbank Passwort
- `.env`

Die `.env` Datei gehört nicht ins Git Repository.

## Status

Aktueller Stand:

- TempVoice System aktiv
- TempVoice Panel aktiv
- Music Player aktiv
- Music Panel aktiv
- direkte YouTube Links aktiv
- YouTube Shorts aktiv
- Spotify-Erkennung über YouTube-Suche aktiv
- Playlist System aktiv
- ChatGPT Command aktiv
- Help Command aktiv
- MySQL Speicherung aktiv
- PM2 Betrieb aktiv

## Music Panel Statusanzeige

Das Music Panel zeigt zusätzlich eine Statusbox an.

Angezeigt werden:

- aktuelle Lautstärke
- aktueller Track
- aktuelle Queue
- Spotify Hinweis
- Refresh-Hinweis

Mit dem Button `🔄 Refresh` kann die Anzeige im Music Panel manuell aktualisiert werden.


## Music Panel Leave Button

Das Music Panel enthält einen `👋 Leave` Button.

Damit kann der Bot direkt aus dem Voice Channel getrennt werden.

Der Button macht:

- Music Player stoppen
- Queue leeren
- Voice Verbindung trennen
- Music Panel aktualisieren

