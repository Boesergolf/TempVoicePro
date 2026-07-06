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


## Music Panel Loop Button

Das Music Panel enthält einen `🔁 Loop` Button.

Der Button schaltet zwischen drei Modi um:

- `Aus`
- `Track`
- `Queue`

Ablauf:

`Aus → Track wiederholen → Queue wiederholen → Aus`

### Track Loop

Im Modus `Track` wird der aktuell laufende Track wiederholt.

Wenn Skip gedrückt wird, wird der Track trotzdem übersprungen.

### Queue Loop

Im Modus `Queue` wird die gesamte Queue wiederholt.

Der vorherige Track wird wieder hinten an die Queue angehängt.

### Anzeige im Music Panel

Das Music Panel zeigt den aktuellen Loop-Modus in der Statusbox an.

Beispiel:

`🔁 Loop: Track`


## Music Panel History Button

Das Music Panel enthält einen `📜 History` Button.

Damit können die zuletzt gespielten Tracks angezeigt werden.

Die History speichert aktuell die letzten 20 Tracks im laufenden Bot-Prozess.

Angezeigt werden bis zu 10 zuletzt gespielte Tracks.

Hinweis:

Die History ist nicht dauerhaft in der Datenbank gespeichert. Nach einem Bot-Neustart ist sie wieder leer.


## Music Panel Favorite Button

Das Music Panel enthält einen `⭐ Favorite` Button.

Damit kann der aktuell laufende Track direkt gespeichert werden.

Der Button macht:

- aktuellen Track aus dem Music Player lesen
- persönliche Playlist `Favorites` suchen
- Playlist automatisch erstellen, falls sie noch nicht existiert
- Track in `Favorites` speichern

Die Playlist ist eine User-Playlist.

Prüfen:

`/playlist show playlist:Favorites`

Abspielen:

`/music playlist name:Favorites`


## Music Panel Favorite Duplikat-Schutz

Der `⭐ Favorite` Button prüft, ob der aktuell laufende Track bereits in der persönlichen Playlist `Favorites` gespeichert ist.

Wenn der Track noch nicht vorhanden ist:

`⭐ Gespeichert in deiner Playlist Favorites`

Wenn der Track bereits vorhanden ist:

`⭐ Dieser Track ist bereits in deiner Playlist Favorites`

Geprüft wird anhand von:

- gespeicherter URL
- Track-Titel

Dadurch werden doppelte Einträge in `Favorites` verhindert.


## Music Panel Clear History Button

Das Music Panel enthält einen `🗑 Clear History` Button.

Damit kann die aktuelle Music History geleert werden.

Der Button macht:

- gespeicherte History des laufenden Bot-Prozesses leeren
- Music Panel aktualisieren
- Anzahl der entfernten History-Einträge anzeigen

Hinweis:

Die History ist nur im laufenden Bot-Prozess gespeichert und wird nicht dauerhaft in MySQL gespeichert.


## Glücksrad System

TempVoicePro enthält ein Glücksrad-System für zufällige Auswahl.

Es kann genutzt werden für:

- nächste Karte auswählen
- nächste Map auswählen
- zufällige Spieler auswählen
- Mitglieder für Teams auswählen
- eigene Listen drehen

## Glücksrad Command

Der Slash Command lautet:

`/gluecksrad`

Verfügbare Modi:

- `/gluecksrad liste`
- `/gluecksrad voice`

### Eigene Liste drehen

Mit `/gluecksrad liste` kann aus einer eigenen Liste zufällig gewählt werden.

Beispiele:

`/gluecksrad liste eintraege: Inferno, Mirage, Dust2, Nuke titel: Nächste Map`

`/gluecksrad liste eintraege: Karte 1, Karte 2, Karte 3 anzahl: 1 titel: Nächste Karte`

Die Einträge können getrennt werden durch:

- Komma
- Semikolon
- neue Zeile
- senkrechten Strich

### Voice Auswahl

Mit `/gluecksrad voice` kann der Bot zufällige Mitglieder aus deinem aktuellen Voice Channel auswählen.

Beispiel:

`/gluecksrad voice anzahl: 2 titel: Team Auswahl`

Optional können Bots mit einbezogen werden.

## Glücksrad Panel

Mit `/gluecksradpanel` erstellt oder aktualisiert der Bot einen eigenen Channel:

`#gluecksrad`

Das Panel enthält:

- Dropdown-Menü für Voice-Auswahl
- Dropdown-Menü für Team-Auswahl
- Button für eigene Liste
- Hilfe Button

### Panel Funktionen

Das Glücksrad Panel kann:

- 1 Mitglied aus dem Voice Channel auswählen
- 2 Mitglieder aus dem Voice Channel auswählen
- 3 Mitglieder aus dem Voice Channel auswählen
- 2 zufällige Teams bilden
- 3 zufällige Teams bilden
- eigene Liste per Eingabefenster drehen

### Eigene Liste im Panel

Der Button `🎡 Eigene Liste drehen` öffnet ein Eingabefenster.

Dort können eingetragen werden:

- Titel
- Anzahl Gewinner
- Einträge

Beispiel für Einträge:

`Inferno, Mirage, Dust2, Nuke`

### Team-Auswahl

Die Team-Auswahl nutzt die Mitglieder aus dem aktuellen Voice Channel des Users, der das Dropdown benutzt.

Bots werden dabei standardmäßig ignoriert.


## Music Player Pause und Auto-Leave

Der Music Player verlässt den Voice Channel nicht, solange ein Track pausiert ist.

Auto-Leave greift nur, wenn:

- keine Queue vorhanden ist
- kein aktueller Track läuft
- der Player nicht pausiert ist
- keine neuen Tracks hinzugefügt wurden

Dadurch bleibt die aktuelle Wiedergabe erhalten, wenn der Bot pausiert wurde.


## Panel Kategorie Auswahl

Beim Erstellen oder Aktualisieren der zentralen Panels muss eine Kategorie ausgewählt werden.

Betroffene Commands:

- `/panels`
- `/musicpanel`
- `/gluecksradpanel`

Beispiel:

`/panels kategorie:Bot`

Der Bot erstellt oder verschiebt den zentralen Panel-Channel `#bot-panels` in die ausgewählte Kategorie.


## Help Kategorien

Der `/help` Command enthält mehrere Kategorien:

- Übersicht
- Panels
- TempVoice
- Musik
- Playlists
- Glücksrad
- ChatGPT
- Technik

Beispiele:

`/help`

`/help kategorie:Panels`

`/help kategorie:Glücksrad`

`/help kategorie:Musik`


## Angepinnte Panel Nachrichten

Die zentralen Panel-Nachrichten im Panel-Channel werden automatisch angepinnt.

Dadurch bleiben sie im Channel schnell erreichbar, ohne dass man hochscrollen muss.

Betroffene Panels:

- TempVoicePro Übersicht
- Music Player Panel
- Glücksrad Panel

Der Bot benötigt dafür die Berechtigung:

`Nachrichten verwalten`

Falls das Anpinnen fehlschlägt, läuft der Bot trotzdem weiter und schreibt den Fehler nur in die Logs.


## Panel Cleanup

Mit `/panelcleanup` können alte einzelne Panel-Channels gefunden werden.

Beispiele für alte Channels:

- `#music-player`
- `#gluecksrad`

Standardmäßig löscht der Command nichts.

Zum Prüfen:

`/panelcleanup`

Zum Löschen:

`/panelcleanup loeschen:Ja`

Der neue zentrale Panel-Channel `#bot-panels` bleibt erhalten.


## TempVoice Status Panel

Der zentrale Panel-Channel enthält zusätzlich ein TempVoice Status Panel.

Dieses Panel zeigt:

- Creator Channel
- TempVoice Kategorie
- Anzahl aktiver TempVoice Channels
- aktive Lobbys mit Owner

Das Panel wird über `/panels` erstellt oder aktualisiert.

Beispiel:

`/panels kategorie:Bot`

Hinweis:

Das TempVoice Status Panel wird nicht automatisch live jede Sekunde aktualisiert.
Es wird beim Ausführen von `/panels` neu aufgebaut.


## TempVoice Status Auto-Update

Das TempVoice Status Panel im zentralen Panel-Channel wird automatisch aktualisiert, wenn jemand den Voice Channel wechselt.

Dadurch werden Änderungen an aktiven Lobbys automatisch sichtbar, zum Beispiel:

- neue TempVoice Lobby erstellt
- TempVoice Lobby verlassen
- leere Lobby gelöscht
- Owner/Lobby-Status aktualisiert

Das Update wird mit kurzer Verzögerung ausgeführt, damit Datenbank und Discord Channels vorher sauber aktualisiert sind.


## Panel Channel Sofort-Bereinigung

Beim Ausführen von `/panels` räumt der Bot den zentralen Panel-Channel automatisch auf.

Dabei werden normale Nachrichten entfernt, damit die Panels direkt sichtbar bleiben.

Nicht gelöscht werden:

- angepinnte Nachrichten
- TempVoicePro Übersicht
- TempVoice Status Panel
- Music Player Panel
- Glücksrad Panel

Neue normale Nachrichten im Panel-Channel werden weiterhin automatisch nach dem eingestellten Timer gelöscht.

## Auch Einzel-Panel Commands räumen auf

Neben `/panels` räumen auch die einzelnen Panel-Commands den zentralen Panel-Channel auf.

Betroffene Commands:

- `/musicpanel`
- `/gluecksradpanel`

Dabei werden normale Nachrichten im Panel-Channel entfernt.

Nicht gelöscht werden:

- angepinnte Panel-Nachrichten
- TempVoicePro Übersicht
- TempVoice Status Panel
- Music Player Panel
- Glücksrad Panel


## Panel Auto-Refresh

Die zentralen Panels im Panel-Channel werden automatisch aktualisiert.

Betroffene Panels:

- TempVoice Status Panel
- Music Player Panel

Standardmäßig werden die Panels alle 30 Sekunden aktualisiert.

Optionale `.env` Einstellung:

`PANEL_AUTO_REFRESH_MS=30000`

Der Wert ist in Millisekunden angegeben.

Beispiele:

- `30000` = 30 Sekunden
- `60000` = 60 Sekunden

Der Auto-Refresh startet automatisch beim Bot-Start.


## Erweiterte Panel Übersicht

Die zentrale Panel-Übersicht im Channel `#bot-panels` zeigt wichtige Informationen direkt im Panel an.

Angezeigt werden:

- Auto-Lösch-Timer für normale Nachrichten
- Auto-Refresh-Timer für Status-Panels
- TempVoice Status Panel
- Music Player Panel
- Glücksrad Panel
- automatische Bereinigung
- wichtige Panel-Commands

Wichtige Commands:

- `/panels`
- `/musicpanel`
- `/gluecksradpanel`
- `/panelcleanup`
- `/help kategorie:Panels`


## Bot Status Panel

Der zentrale Panel-Channel enthält zusätzlich ein Bot Status Panel.

Dieses Panel zeigt:

- Bot Online-Status
- Ping
- Uptime
- RAM-Nutzung
- Server-Anzahl
- geladene Commands
- Datenbankstatus

Das Bot Status Panel wird über `/panels` erstellt und danach automatisch aktualisiert.


## Panel Refresh Button

Die zentrale Panel-Übersicht enthält einen Button:

`🔄 Panels aktualisieren`

Damit können die zentralen Status-Panels sofort aktualisiert werden, ohne `/panels` erneut auszuführen.

Aktualisiert werden:

- Bot Status Panel
- TempVoice Status Panel
- Music Player Panel

Der Button befindet sich im Übersichts-Panel im zentralen Panel-Channel.


## Panel Check

Mit `/panelcheck` kann der zentrale Panel-Channel geprüft werden.

Der Command zeigt:

- zentraler Panel-Channel
- Kategorie
- gefundene Panel-Nachrichten
- Auto-Lösch-Timer
- Auto-Refresh-Timer
- Bot-Berechtigungen im Panel-Channel

Geprüfte Rechte:

- Channel sehen
- Nachrichten senden
- Embeds senden
- Nachrichtenverlauf lesen
- Nachrichten verwalten
- Channel verwalten

Beispiel:

`/panelcheck`

Der Command ist hilfreich, wenn Auto-Löschen, Anpinnen oder Panel-Updates nicht funktionieren.


## Panel Refresh Button Cooldown

Der Button `🔄 Panels aktualisieren` besitzt einen Cooldown.

Standard:

`PANEL_REFRESH_BUTTON_COOLDOWN_MS=10000`

Das entspricht 10 Sekunden pro Server.

Dadurch kann der Refresh-Button nicht dauerhaft gespammt werden.


## Refresh Cooldown in Panel Übersicht

Die zentrale Panel-Übersicht zeigt den Cooldown des Buttons `🔄 Panels aktualisieren` direkt an.

Angezeigt wird:

- Refresh-Button Cooldown in Sekunden
- gilt pro Server
- verhindert Button-Spam

Die Einstellung kommt aus `.env`:

`PANEL_REFRESH_BUTTON_COOLDOWN_MS=10000`


## Code Check

Mit folgendem Befehl können alle wichtigen JavaScript-Dateien auf Syntaxfehler geprüft werden:

`npm run check`

Der Check prüft unter anderem:

- alle Dateien in `src/`
- `deploy-commands.js`
- `init-db.js`

Das ist hilfreich vor jedem Neustart, Deploy oder Commit.


## Music Lautstärke speichern

Der Music Player startet standardmäßig mit 20 Prozent Lautstärke.

Standardwert in `.env`:

`MUSIC_DEFAULT_VOLUME_PERCENT=20`

Wenn die Lautstärke über `/music volume` oder das Music Panel geändert wird, speichert der Bot die Lautstärke pro Server in MySQL.

Beim nächsten Abspielen wird die gespeicherte Lautstärke automatisch wieder geladen.



## Music Volume Bereich

Die Lautstärke des Music Players kann zwischen 1 und 100 Prozent eingestellt werden.

Standard:

`MUSIC_DEFAULT_VOLUME_PERCENT=20`

Beispiele:

`/music volume percent:20`

`/music volume percent:35`

Änderungen werden pro Server gespeichert und beim nächsten Abspielen automatisch wieder geladen.



## Server Modul-System

TempVoicePro besitzt ein Server-Modul-System.

Damit können einzelne Funktionen pro Discord-Server aktiviert oder deaktiviert werden.

Command:

`/module`

Verfügbare Subcommands:

- `/module list`
- `/module enable`
- `/module disable`

Aktuelle Module:

- TempVoice
- Music
- Playlist
- Glücksrad
- Panels
- ChatGPT
- Moderation
- Leveling
- Tickets

Beispiel:

`/module disable name:Music`

Danach werden Music-Commands auf diesem Server blockiert.

Wieder aktivieren:

`/module enable name:Music`

Das Modul-System nutzt die MySQL-Tabelle:

`guild_modules`


## Module Panel

Der zentrale Panel-Channel enthält ein Server Module Panel.

Dieses Panel zeigt den aktuellen Status aller Server-Module:

- TempVoice
- Music
- Playlist
- Glücksrad
- Panels
- ChatGPT
- Moderation
- Leveling
- Tickets

Aktive Module werden mit ✅ angezeigt.

Deaktivierte Module werden mit ❌ angezeigt.

Das Panel wird über `/panels` erstellt und danach automatisch aktualisiert.

Verwaltung:

`/module list`

`/module enable`

`/module disable`


## Module Panel Sofort-Update

Wenn ein Server-Modul mit `/module enable` oder `/module disable` geändert wird, aktualisiert der Bot die zentralen Panels sofort.

Dadurch wird das Server Module Panel direkt aktualisiert und muss nicht auf den nächsten Auto-Refresh warten.

Beispiele:

`/module disable name:Music`

`/module enable name:Music`

Das Module Panel im zentralen Panel-Channel zeigt die Änderung sofort an.


## Module Panel Berechtigung

Die Admin-Steuerung im Server Module Panel ist geschützt.

Module können über das Panel nur geändert werden, wenn der User die Discord-Berechtigung besitzt:

`Server verwalten`

Betroffen sind:

- Modul-Dropdown
- Button `✅ Aktivieren`
- Button `❌ Deaktivieren`

User ohne diese Berechtigung bekommen eine private Fehlermeldung.

Die Slash Commands `/module enable` und `/module disable` sind ebenfalls auf Server-Verwaltung beschränkt.



## Moderation Modlog

TempVoicePro besitzt ein grundlegendes Modlog-System.

Das Moderation-Modul ist standardmäßig deaktiviert und muss zuerst aktiviert werden:

`/module enable name:Moderation`

Danach kann der Modlog eingerichtet werden:

`/modlog setup channel:#mod-log`

Weitere Commands:

- `/modlog status`
- `/modlog disable`

Der Modlog nutzt die MySQL-Tabelle:

`guild_moderation_settings`

Aktuell dient der Modlog als Grundlage für kommende Moderationsfunktionen wie:

- Warns
- Kicks
- Bans
- Timeouts
- AutoMod
- Join/Leave Logs
- Anti-Raid Logs



## Moderation Warn-System

TempVoicePro besitzt ein grundlegendes Warn-System.

Voraussetzung:

`/module enable name:Moderation`

Optional empfohlen:

`/modlog setup channel:#mod-log`

Commands:

- `/warn user:@User grund:...`
- `/warnings user:@User`
- `/clearwarnings user:@User grund:...`

Warns werden in MySQL gespeichert.

Tabelle:

`moderation_warnings`

Beim Verwarnen und Löschen von Warns wird ein Eintrag in den Modlog geschrieben, sofern der Modlog eingerichtet und aktiviert ist.



## Moderation Timeout-System

TempVoicePro unterstützt Discord Timeouts.

Voraussetzung:

`/module enable name:Moderation`

Optional empfohlen:

`/modlog setup channel:#mod-log`

Commands:

- `/timeout user:@User minuten:10 grund:...`
- `/untimeout user:@User grund:...`

Der Bot benötigt dafür die Discord-Berechtigung:

`Mitglieder moderieren`

Außerdem muss die Bot-Rolle über der Rolle des betroffenen Users stehen.

Timeouts und entfernte Timeouts werden im Modlog protokolliert, sofern der Modlog eingerichtet ist.



## Moderation Kick-System

TempVoicePro unterstützt Kick-Moderation.

Voraussetzung:

`/module enable name:Moderation`

Optional empfohlen:

`/modlog setup channel:#mod-log`

Command:

`/kick user:@User grund:...`

Der Bot benötigt dafür die Discord-Berechtigung:

`Mitglieder kicken`

Außerdem muss die Bot-Rolle über der Rolle des betroffenen Users stehen.

Kicks werden im Modlog protokolliert, sofern der Modlog eingerichtet ist.



## Moderation Ban-System

TempVoicePro unterstützt Ban- und Unban-Moderation.

Voraussetzung:

`/module enable name:Moderation`

Optional empfohlen:

`/modlog setup channel:#mod-log`

Commands:

- `/ban user:@User grund:... nachrichten_tage:0`
- `/unban userid:123456789 grund:...`

Beim Ban kann optional festgelegt werden, wie viele Tage Nachrichten gelöscht werden sollen.

Erlaubt sind:

- `0` bis `7` Tage

Der Bot benötigt dafür die Discord-Berechtigung:

`Mitglieder bannen`

Außerdem muss die Bot-Rolle über der Rolle des betroffenen Users stehen.

Bans und Unbans werden im Modlog protokolliert, sofern der Modlog eingerichtet ist.



## Moderation Case-System

TempVoicePro besitzt ein Moderation Case-System.

Moderationsaktionen erhalten automatisch Case-IDs.

Beispiele:

- `Case #1` Warn
- `Case #2` Timeout
- `Case #3` Kick
- `Case #4` Ban

Commands:

- `/cases recent`
- `/cases user user:@User`
- `/cases show id:1`
- `/cases reason id:1 grund:Korrigierter Grund`

Cases werden in MySQL gespeichert.

Tabelle:

`moderation_cases`

Aktuell werden Cases erstellt für:

- Warn
- Warns löschen
- Timeout
- Timeout entfernen
- Kick
- Ban
- Unban



### Case-Grund nachträglich ändern

Moderatoren können den Grund eines bestehenden Cases korrigieren.

Beispiel:

`/cases reason id:12 grund:Grund korrigiert`

Die Änderung wird im Modlog dokumentiert.



## Moderation User-Profil

TempVoicePro kann ein Moderationsprofil pro User anzeigen.

Command:

- `/moduser user:@User`

Das Profil zeigt:

- aktive Warns
- gesamte Anzahl der Moderation Cases
- Warns
- Timeouts
- Kicks
- Bans
- Unbans
- letzte Moderationsfälle

Der Command gehört zum Moderation-Modul.

Voraussetzung:

`/module enable name:Moderation`



## Changelog

Wichtige Projektänderungen werden in `CHANGELOG.md` dokumentiert.

Nach größeren Entwicklungsschritten kann ein neuer Eintrag automatisch ergänzt werden:

    npm run changelog:add -- "Titel des Schritts" "Erster Punkt" "Zweiter Punkt"



## Auto-Mod-System

TempVoicePro besitzt ein Auto-Mod-System.

Das System kann Nachrichten automatisch auf Spam, Links und zu viele Großbuchstaben prüfen.

Command:

- `/automod status`
- `/automod enable`
- `/automod disable`
- `/automod antispam aktiv:true limit:5 sekunden:8`
- `/automod antilink aktiv:true`
- `/automod anticaps aktiv:true prozent:70 min_zeichen:12`
- `/automod autowarn aktiv:true`
- `/automod timeout aktiv:true minuten:10`

Funktionen:

- Anti-Spam
- Anti-Link
- Anti-Caps
- automatische Warns
- automatische Moderation Cases
- Modlog-Einträge
- optional automatische Timeouts

Auto-Mod gehört zum Moderation-Modul.

Voraussetzung:

`/module enable name:Moderation`

Empfohlen:

`/modlog setup channel:#mod-log`

Der Bot benötigt je nach Funktion folgende Discord-Berechtigungen:

- Nachrichten verwalten
- Mitglieder moderieren



## Webpanel

TempVoicePro besitzt ein Webpanel-Grundgerüst mit Discord OAuth2 Login.

Aktuelle Funktionen:

- Discord Login
- Logout
- Dashboard
- Serverauswahl
- Anzeige nur für Server, auf denen der Bot ist
- Anzeige nur für User mit `Server verwalten` oder `Administrator`

ENV-Werte:

    WEB_PANEL_ENABLED=true
    WEB_PANEL_PORT=3000
    WEB_PANEL_BASE_URL=http://DEINE-IP:3000
    DISCORD_CLIENT_ID=deine_discord_application_client_id
    DISCORD_CLIENT_SECRET=dein_discord_oauth_client_secret
    DISCORD_REDIRECT_URI=http://DEINE-IP:3000/auth/callback
    SESSION_SECRET=ein_langer_zufallswert

Discord Developer Portal:

Die Redirect URL muss exakt eingetragen werden:

    http://DEINE-IP:3000/auth/callback

Später kann das Webpanel über Nginx, Domain und HTTPS öffentlich sauber erreichbar gemacht werden.



## Spotify Webpanel Login

TempVoicePro kann Spotify-Accounts über das Webpanel verbinden.

Ziel:

- private Spotify-Playlists später importieren
- Spotify-User-Token sicher in MySQL speichern
- Playlist-Import mit User-Berechtigung ermöglichen

Zusätzlicher ENV-Wert:

    SPOTIFY_REDIRECT_URI=http://DEINE-IP:3000/spotify/callback

Im Spotify Developer Dashboard muss diese Redirect URI exakt eingetragen werden.

Tabelle:

    spotify_user_tokens

Hinweis:

Solange das Webpanel ohne HTTPS läuft, sollte der Spotify-Login nur intern/testweise verwendet werden. Für öffentliche Nutzung wird später HTTPS empfohlen.

