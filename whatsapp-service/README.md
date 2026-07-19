# WhatsApp-Sidecar

Standalone Node.js-Service, der [`baileys`](https://github.com/WhiskeySockets/Baileys) kapselt und eine
interne HTTP-API für den Softball-Lineup-Backend bereitstellt. Der Spring-Backend spricht diesen Service über HTTP an,
um WhatsApp-Umfragen (Polls) in Gruppen zu verschicken **und die abgegebenen Stimmen entschlüsselt auszulesen**.
Baileys spricht das WhatsApp-Web-Protokoll direkt über WebSocket — **kein Puppeteer/Chromium** mehr.

> Migriert von `whatsapp-web.js` → `baileys`, weil whatsapp-web.js Poll-Votes in Gruppen nicht liefern kann
> (das `vote_update`-Event feuert nicht). Baileys entschlüsselt die Votes selbst (`decryptPollVote`, LID/LID-JIDs).

## Env-Variablen

| Variable                  | Default          | Beschreibung                                                                 |
|----------------------------|------------------|-------------------------------------------------------------------------------|
| `PORT`                     | `3000`           | HTTP-Port des Sidecars                                                        |
| `WHATSAPP_SERVICE_TOKEN`   | *(leer)*         | Shared Secret; muss bei jedem Request als `X-Service-Token`-Header mitgeschickt werden. Ohne Token (leer) sind **alle** Requests 401. |
| `SESSION_PATH`             | `/data/session`  | Ablageort der Baileys-Session (`useMultiFileAuthState`) **und** des Poll-Stores (`poll-store.json`, hält msgId→Secret+Votes). Auf ein persistentes Volume mounten, sonst neu koppeln + Votes verloren. |

## HTTP-API

Alle Routen erfordern den Header `X-Service-Token: <WHATSAPP_SERVICE_TOKEN>`, sonst `401 {"error":"unauthorized"}`.

- `GET /status` → `{ connected, number, needsQr }`
- `GET /qr` → `{ qr }` (data-URL des aktuellen QR-Codes oder `null`, wenn bereits verbunden bzw. kein Code aussteht)
- `GET /groups` → `{ groups: [{ id, name }, ...] }` (409 `not_connected`, solange nicht gekoppelt)
- `POST /send-poll` mit Body `{ groupId, title, options, allowMultiple?, message? }` → `{ sent: true, pollMessageId }` (409 `not_connected`, 400 `invalid_request`). `pollMessageId` speichert das Backend als `last_sent_message_id`; darüber werden die Votes abgerufen.
- `GET /poll-votes/:msgId` → `[{ voterName, options: [...] }, ...]` — aktueller Abstimmungs-Stand je Wähler (letzter Stand, entschlüsselt; `voterName` = WhatsApp-pushName). Leeres Array, wenn die Poll unbekannt ist oder noch keine Votes vorliegen.

Votes werden **live** über das `messages.upsert`-Event entschlüsselt und je Wähler im `poll-store.json` gehalten — der Sidecar muss laufen, wenn abgestimmt wird. Nur Polls, die **dieser** Sidecar selbst gesendet hat, sind entschlüsselbar (er kennt nur dann den `messageSecret`).

## Kopplung (Pairing)

Beim ersten Start (oder wenn die Session ungültig wird) gibt der Client ein `qr`-Event aus. `/qr` liefert dann eine
data-URL mit dem aktuellen QR-Code. Diese wird in der Orga-UI als `<img>` angezeigt und muss am Handy über
**WhatsApp → Einstellungen → Verknüpfte Geräte → Gerät verknüpfen** gescannt werden. Nach erfolgreicher Kopplung
meldet `/status` `connected:true` mit der verknüpften Nummer, und `/groups` listet die WhatsApp-Gruppen.

Die Session liegt danach unter `SESSION_PATH` (Docker: auf ein Volume mounten!) — ohne erneutes Scannen bleibt der
Client nach einem Neustart verbunden, solange die Session gültig ist.

## Betrieb / Wartungsrisiko

`baileys` ist ein inoffizieller Client (WebSocket-Protokoll, kein Browser). Er ist **nicht** von Meta unterstützt und
kann bei WhatsApp-Protokoll-Änderungen brechen. Bei Ausfällen zuerst prüfen, ob ein neueres `baileys`-Release existiert.
Poll-Vote-Entschlüsselung nutzt `decryptPollVote` (in 7.0.0-rc ist der Auto-Handler auskommentiert → wird im
`messages.upsert`-Handler selbst aufgerufen). Bricht das nach einem Baileys-Update, hier zuerst prüfen.

## Lokaler Smoke-Test

```bash
cd whatsapp-service && npm install
WHATSAPP_SERVICE_TOKEN=devtoken SESSION_PATH=./.session PORT=3000 npm start
```

In einem zweiten Terminal:

```bash
curl -s -H "X-Service-Token: devtoken" localhost:3000/status
```

Erwartet nach ein paar Sekunden: `{"connected":false,"number":null,"needsQr":true}`. `/qr` liefert dann eine
data-URL — im Browser als Bild anzeigen und mit WhatsApp am Handy scannen. Danach liefert `/status`
`connected:true` + Nummer, `/groups` listet die Gruppen.
