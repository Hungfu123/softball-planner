# WhatsApp-Sidecar

Standalone Node.js-Service, der [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js) kapselt und eine
interne HTTP-API für den Softball-Lineup-Backend bereitstellt. Der Spring-Backend spricht diesen Service über HTTP an,
um WhatsApp-Umfragen (Polls) in Gruppen zu verschicken — der eigentliche WhatsApp-Web-Client (inkl. Puppeteer/Chromium)
läuft isoliert in diesem Sidecar, nicht im Java-Prozess.

## Env-Variablen

| Variable                  | Default          | Beschreibung                                                                 |
|----------------------------|------------------|-------------------------------------------------------------------------------|
| `PORT`                     | `3000`           | HTTP-Port des Sidecars                                                        |
| `WHATSAPP_SERVICE_TOKEN`   | *(leer)*         | Shared Secret; muss bei jedem Request als `X-Service-Token`-Header mitgeschickt werden. Ohne Token (leer) sind **alle** Requests 401. |
| `SESSION_PATH`             | `/data/session`  | Ablageort der WhatsApp-Web-Session (LocalAuth). Sollte auf ein persistentes Volume zeigen, sonst muss nach jedem Neustart neu gekoppelt werden. |

## HTTP-API

Alle Routen erfordern den Header `X-Service-Token: <WHATSAPP_SERVICE_TOKEN>`, sonst `401 {"error":"unauthorized"}`.

- `GET /status` → `{ connected, number, needsQr }`
- `GET /qr` → `{ qr }` (data-URL des aktuellen QR-Codes oder `null`, wenn bereits verbunden bzw. kein Code aussteht)
- `GET /groups` → `{ groups: [{ id, name }, ...] }` (409 `not_connected`, solange nicht gekoppelt)
- `POST /send-poll` mit Body `{ groupId, title, options }` → `{ sent: true }` (409 `not_connected`, 400 `invalid_request` bei fehlenden/ungültigen Feldern)

## Kopplung (Pairing)

Beim ersten Start (oder wenn die Session ungültig wird) gibt der Client ein `qr`-Event aus. `/qr` liefert dann eine
data-URL mit dem aktuellen QR-Code. Diese wird in der Orga-UI als `<img>` angezeigt und muss am Handy über
**WhatsApp → Einstellungen → Verknüpfte Geräte → Gerät verknüpfen** gescannt werden. Nach erfolgreicher Kopplung
meldet `/status` `connected:true` mit der verknüpften Nummer, und `/groups` listet die WhatsApp-Gruppen.

Die Session liegt danach unter `SESSION_PATH` (Docker: auf ein Volume mounten!) — ohne erneutes Scannen bleibt der
Client nach einem Neustart verbunden, solange die Session gültig ist.

## Betrieb / Wartungsrisiko

`whatsapp-web.js` ist ein inoffizieller Client, der die WhatsApp-Web-Oberfläche per Puppeteer/Chromium fernsteuert.
Er ist **nicht** von Meta unterstützt und kann bei Änderungen an WhatsApp Web brechen (Layout-Änderungen, neue
Sicherheitsmaßnahmen etc.). Bei Ausfällen zuerst prüfen, ob ein neueres `whatsapp-web.js`-Release existiert.

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
