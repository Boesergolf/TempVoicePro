# TempVoicePro - Übergabe aus ChatGPT

## Aktueller Stand

Repo:
https://github.com/Boesergolf/TempVoicePro

Branch:
master

PM2 Prozess:
tempvoice

## Zuletzt abgeschlossen

### TempVoice Shared Panels
Commit:
845ae03 Improve temp voice shared panels

Erledigt:
- Gemeinsamer Channel #tempvoice-panels
- Keine neuen panel-lobby-* Channels mehr
- Pro TempVoice Lobby eine Panel-Nachricht
- Panel-Nachricht wird gelöscht, wenn Lobby gelöscht wird
- Permanent/Temporär Buttons eingebaut
- Rename aktualisiert den Namen im Panel
- /rename aktualisiert ebenfalls das Panel
- PM2 gespeichert
- Git Status war sauber

Wichtige Dateien:
- src/events/voiceStateUpdate.js
- src/utils/tempChannels.js
- src/utils/tempVoicePanelMessage.js
- src/buttons/tv_permanent.js
- src/buttons/tv_temporary.js
- src/events/interactionCreate.js
- src/commands/rename.js

### Musik Queue/Now Problem
Problem:
Queue und Now im Musikpanel zeigten nur noch Zurück-Buttons.

Diagnose:
- src/buttons/mp_queue.js und src/buttons/mp_now.js rufen panelHubMusic auf.
- createMusicQueueCentralMessage und createMusicNowCentralMessage liefern Embeds.
- Payload-Test zeigte:
  QUEUE embeds: 1
  NOW embeds: 1

Begonnener Fix:
- mp_queue.js und mp_now.js wurden auf interaction.message.edit mit embeds/components umgebaut.
- Danach war das Problem noch nicht gelöst.
- Nächster Ansatz war Text-Fallback in src/utils/panelHubMusic.js und vollständiger Edit in centralPanelAutoRefresh.js.

Noch prüfen:
- Ob Fix für Queue/Now committed wurde.
- git status --short prüfen.
- Musikpanel testen.

### Spotify Private Playlists
Stand:
- Webpanel Spotify OAuth ist vorhanden.
- Scope ist bereits:
  playlist-read-private playlist-read-collaborative
- spotifyUserAuth.js existiert.
- musicImport.js nutzt bisher Client Credentials.
- Ziel:
  musicImport.js soll zuerst Spotify User Token aus spotify_user_tokens verwenden.
  Fallback auf Client Credentials für öffentliche Playlists.

Achtung:
SPOTIFY_REDIRECT_URI steht aktuell wahrscheinlich noch auf HTTP:
http://88.218.227.60:3000/spotify/callback

Für echten Spotify Login wird später HTTPS benötigt:
https://panel.<domain>/spotify/callback

### Nächste große Bot-Richtung
Geplant:
- /botstatus Admin-Systemcheck
- danach /setupwizard
- später Webpanel-Ausbau, Rollen/Rechte-System, Nutzer-Guide

## Standard-Kommandos

Prüfen:
npm run check

Slash Commands deployen:
node deploy-commands.js

Bot neustarten:
pm2 flush tempvoice
pm2 restart tempvoice --update-env
tail -n 100 /root/.pm2/logs/tempvoice-error.log

Git:
git status --short
git add ...
git commit -m "..."
git push origin master
pm2 save

## Wichtig
Keine .env oder Secrets committen.
