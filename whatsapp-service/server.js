const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  decryptPollVote,
  getKeyAuthor,
  jidNormalizedUser,
  DisconnectReason,
} = require('baileys');
// Dasselbe En/Decoding, das useMultiFileAuthState für creds.json nutzt:
// macht Uint8Array/Buffer (messageSecret!) JSON-safe und nach dem Laden wieder lebendig.
const { BufferJSON } = require('baileys/lib/Utils/generics.js');

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.WHATSAPP_SERVICE_TOKEN || '';
const SESSION_PATH = process.env.SESSION_PATH || '/data/session';
const STORE_FILE = path.join(SESSION_PATH, 'poll-store.json');

let sock = null;
// Modulebene, weil /send-poll den Sender-Key-Memory der Zielgruppe anfassen muss.
let authState = null;
let connected = false;
let myNumber = null;
let myName = null;
let currentQrDataUrl = null;   // gesetzt solange Kopplung aussteht
let qrAt = null;               // Zeitpunkt des aktuellen QR — ein abgelaufener darf nicht mehr raus
let lastPairingAt = null;      // letzter angenommener Scan (isNewLogin) — Beleg, dass die Kopplung überhaupt startete

// Lebensdauer JEDES QR-Codes. Ohne den Wert gibt Baileys dem ersten 60 s und jedem
// weiteren nur 20 s (Socket/socket.js: qrMs = qrTimeout || 20000). Die UI holt /qr
// alle 10 s — bei 20 s Lebensdauer kann der angezeigte Code trotzdem schon tot sein,
// und WhatsApp meldet beim Scannen "Anmeldung fehlgeschlagen". 60 s für alle Codes
// macht das Fenster eindeutig größer als das Polling-Intervall.
const QR_TTL_MS = 60000;

/**
 * Sichtbarer Zustand für /status. Ohne den sah "Dienst tot", "wartet auf QR" und
 * "ausgeloggt" in der UI identisch aus (Endlos-Spinner), weil nur connected/needsQr
 * gemeldet wurde.
 *   CONNECTING   — Socket baut auf
 *   WAITING_QR   — QR liegt bereit, Kopplung fehlt
 *   CONNECTED    — verbunden
 *   LOGGED_OUT   — WhatsApp hat das Gerät entfernt; Creds werden verworfen, neuer QR folgt
 *   INIT_FAILED  — Socket-Aufbau schlug fehl (z.B. kein Netz), Retry läuft
 */
let state = 'CONNECTING';
let lastError = null;          // { reason, at } — überlebt Reconnects, damit die Ursache sichtbar bleibt
let starting = false;          // verhindert parallele startSock-Läufe (Reconnect + Retry gleichzeitig)
let retryDelayMs = 0;
// Schutz vor einer 515-Dauerschleife: der Neustart darf ohne Wartezeit laufen,
// aber nicht endlos. Zurückgesetzt bei jedem 'open'.
let restartRequiredStreak = 0;
// Flacher Backoff für die Phase vor der Kopplung — siehe close-Handler.
let pairingRetryMs = 0;

const DISCONNECT_LOG = path.join(SESSION_PATH, 'disconnects.log');

function setError(reason) {
  lastError = { reason, at: new Date().toISOString() };
  // Zusätzlich persistent: Container-Logs rotieren, die Ursache soll beim nächsten
  // Vorfall noch nachweisbar sein.
  try {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
    fs.appendFileSync(DISCONNECT_LOG, `${lastError.at}\t${reason}\n`);
  } catch (e) { console.error('[wa] disconnect-log failed:', e && e.message || e); }
}

/**
 * Verwirft die Baileys-Auth-Dateien, behält poll-store.json.
 * Der Store hält messageSecret + abgegebene Stimmen — ohne ihn wären Votes
 * bereits laufender Umfragen nicht mehr entschlüsselbar.
 */
function clearAuthFiles() {
  let removed = 0;
  try {
    for (const f of fs.readdirSync(SESSION_PATH)) {
      if (f === path.basename(STORE_FILE) || f === path.basename(DISCONNECT_LOG)) continue;
      fs.rmSync(path.join(SESSION_PATH, f), { force: true, recursive: true });
      removed++;
    }
  } catch (e) {
    console.error('[wa] Auth-Dateien löschen fehlgeschlagen:', e && e.message || e);
  }
  console.log('[wa]', removed, 'Auth-Dateien verworfen (poll-store.json behalten)');
}

// Persistenter Poll-Store — überlebt Container-Neustart, sonst geht der messageSecret
// (zum Entschlüsseln der Votes) verloren und schon abgegebene Stimmen wären futsch.
//   polls[msgId] = { title, options:[...], groupId, secret(base64), votes: { voterJid: {name, options:[...]} } }
//   messages[msgId] = verschickte WAMessage (für getMessage → Retry-Resend nach Restart)
let store = { polls: {}, messages: {} };
// Obergrenze, damit der Store nicht endlos wächst. 200 Umfragen/Wochenrhythmus ≈ Jahre.
const MAX_STORED_MESSAGES = 200;
function loadStore() {
  try { store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'), BufferJSON.reviver); } catch { store = { polls: {}, messages: {} }; }
  if (!store.messages) store.messages = {};
}
function saveStore() {
  try {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, BufferJSON.replacer));
  } catch (e) { console.error('[wa] store save failed:', e && e.message || e); }
}
loadStore();

// getMessage-Callback für Baileys Retry-Receipts: Wenn ein Empfänger (z.B. nach
// Handywechsel) die Poll nicht entschlüsseln kann, schickt sein Client einen Retry.
// Baileys legt die Session neu an, muss aber die Original-Nachricht neu senden —
// ohne diesen Callback war die Quelle nur ein In-Memory-Cache, der bei jedem
// Container-Restart/Deploy leer ist → Retries blieben unbeantwortet und beim
// Empfänger stand dauerhaft "Warte auf diese Nachricht".
function getMessage(key) {
  const m = store.messages[key.id];
  return Promise.resolve(m ? m.message : undefined);
}
function rememberSentMessage(sent) {
  if (!sent?.key?.id) return;
  store.messages[sent.key.id] = sent;
  const ids = Object.keys(store.messages);
  if (ids.length > MAX_STORED_MESSAGES) {
    for (const id of ids.slice(0, ids.length - MAX_STORED_MESSAGES)) delete store.messages[id];
  }
}

const sha256hex = (s) => crypto.createHash('sha256').update(Buffer.from(s)).digest('hex');

/**
 * Verwirft den Sender-Key-Memory einer Gruppe (= Datei sender-key-memory-<gruppe>.json).
 *
 * Baileys merkt sich darin pro Gerät, ob es den Sender-Key der Gruppe schon
 * bekommen hat (messages-send.js: hasKey = !!senderKeyMap[deviceJid]) und
 * überspringt die Verteilung bei true. Wechselt jemand das Handy und behält
 * die Nummer, bleiben LID und Gerätenummer gleich — der Eintrag ist stale, das
 * neue Gerät bekommt den Key nie und sieht nur "Warte auf diese Nachricht".
 * Vor jedem Senden leeren heisst: der Key wird an alle neu verteilt, jeder
 * Handywechsel heilt mit der nächsten Umfrage. Der Sender-Key selbst ändert
 * sich dadurch nicht, der Memory ist reiner Cache — Worst Case eine doppelt
 * zugestellte Verteil-Nachricht.
 */
async function resetSenderKeyMemory(groupId) {
  if (!authState) return;
  try {
    await authState.keys.set({ 'sender-key-memory': { [groupId]: null } });
    console.log('[wa] sender-key-memory geleert für', groupId);
  } catch (e) {
    // Nicht fatal: ohne Reset wird nur nicht neu verteilt, das Senden selbst geht weiter.
    console.error('[wa] sender-key-memory reset failed:', e && e.message || e);
  }
}

async function startSock() {
  const { state: loadedAuthState, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
  authState = loadedAuthState;
  const { version } = await fetchLatestBaileysVersion();
  console.log('[wa] Baileys WA-Version:', version.join('.'));

  // Alten Socket schließen, sonst hängen nach jedem Reconnect zusätzliche
  // Event-Handler an einem verwaisten Socket (Leak + doppelte Vote-Verarbeitung).
  if (sock) {
    // Listener ZUERST abhängen: sock.end() feuert selbst ein connection.update/close,
    // das sonst als echter Abbruch gezählt würde (Phantom-Log + Backoff-Erhöhung).
    sock.ev?.removeAllListeners?.();
    try { sock.end(new Error('restart')); } catch { /* schon tot */ }
  }

  state = 'CONNECTING';
  sock = makeWASocket({
    version,
    auth: authState,
    // Ohne logger schluckt Baileys ALLE Meldungen zu Retry-Receipts und
    // Session-Neuaufbau (logger.debug) — genau die Spuren, die man bei
    // "Warte auf diese Nachricht"-Fällen braucht. Level per Env drosselbar,
    // nach der Diagnose auf 'warn' oder 'silent' zurückdrehen.
    logger: pino({ level: process.env.WA_LOG_LEVEL || 'debug' }),
    getMessage,
    qrTimeout: QR_TTL_MS,
  });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr, isNewLogin } = u;
    if (isNewLogin) {
      // WhatsApp hat den Scan angenommen. Ab hier entscheidet sich, ob die Kopplung
      // trägt — ohne diesen Marker sah ein Fehlschlag NACH dem Scan in /status genauso
      // aus wie ein nie gescannter Code, und die Container-Logs sind von aussen nicht
      // erreichbar. Der Zeitstempel bleibt stehen, auch wenn danach alles abbricht.
      state = 'PAIRING';
      currentQrDataUrl = null;
      qrAt = null;
      lastPairingAt = new Date().toISOString();
      console.log('[wa] Scan angenommen — Kopplung läuft…');
    }
    if (qr) {
      currentQrDataUrl = await QRCode.toDataURL(qr);
      qrAt = Date.now();
      connected = false;
      state = 'WAITING_QR';
      // Ein neuer Code heisst: der Weg zu WhatsApp steht. Wartezeit zurücksetzen.
      pairingRetryMs = 0;
      console.log('[wa] QR bereit — koppeln nötig');
    }
    if (connection === 'open') {
      connected = true;
      currentQrDataUrl = null;
      qrAt = null;
      state = 'CONNECTED';
      retryDelayMs = 0;
      restartRequiredStreak = 0;
      const pn = sock.user?.id ? jidNormalizedUser(sock.user.id).split('@')[0] : null;
      myNumber = pn ? '+' + pn : null;
      myName = sock.user?.name || null;
      console.log('[wa] verbunden als', myName, myNumber, '| LID', sock.user?.lid);
    }
    if (connection === 'close') {
      connected = false;
      // Der Code dieses Sockets ist mit ihm gestorben. Stehen lassen hiesse: die UI
      // zeigt ihn weiter, jemand scannt ihn, WhatsApp sagt "Anmeldung fehlgeschlagen".
      currentQrDataUrl = null;
      qrAt = null;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.restartRequired) {
        // 515 direkt nach dem Pairing ist KEIN Fehler, sondern der vorgeschriebene
        // Schritt: WhatsApp verlangt, dass der Client sich sofort neu verbindet.
        // Vorher lief das über den gemeinsamen Backoff — der stand nach ein paar
        // abgelaufenen QR-Runden am Deckel von 60 s. Die frisch erzeugten Creds waren
        // nach dieser Minute wertlos, der Folge-Login lief in einen 401, der Zweig
        // unten warf sie weg und das Handy meldete "Anmeldung fehlgeschlagen" —
        // obwohl das Koppeln selbst jedes Mal geklappt hatte (Logs 25.10.2026:
        // drei erfolgreiche Pairings, alle eine Minute später wieder tot).
        // Also ohne Wartezeit und ohne den Backoff anzufassen.
        restartRequiredStreak++;
        state = 'CONNECTING';
        if (restartRequiredStreak > 5) {
          setError('restart_required_loop (code ' + code + ') — 515 in Dauerschleife');
          console.log('[wa] 515 zum', restartRequiredStreak + '. Mal in Folge — mit Backoff weiter.');
          const delay = retryDelayMs;
          retryDelayMs = Math.min(retryDelayMs ? retryDelayMs * 2 : 2000, 60000);
          restart(delay);
        } else {
          console.log('[wa] Neustart verlangt (515) — sofortiger Reconnect.');
          restart(0);
        }
      } else if (!authState?.creds?.me) {
        // Noch keine Kopplung: JEDER Abbruch hier gehört zum Koppeln, nicht zu einem
        // Defekt. Entweder laufen die Codes ab (408 "QR refs attempts ended") oder
        // WhatsApp schliesst den ungenutzten Socket vorher (428 connectionClosed) —
        // beobachtet am 25.10.2026 alle ~3,5 min. Über den grossen Backoff wuchs die
        // Lücke ohne Code bis auf 60 s, und wer in der Zeit scannt, scannt einen toten
        // Code. Also eigener, flacher Backoff bis 5 s, zurückgesetzt bei jedem neuen
        // Code. Die Unterscheidung hängt an creds.me statt am state: der state ist ein
        // Anzeigewert, creds.me die Tatsache — configureSuccessfulPairing setzt es beim
        // Koppeln. (creds.registered taugt NICHT: Baileys 7.0.0-rc13 legt das Feld in
        // initAuthCreds auf false und fasst es nie wieder an.)
        const delay = pairingRetryMs;
        pairingRetryMs = Math.min(pairingRetryMs ? pairingRetryMs * 2 : 1000, 5000);
        state = 'CONNECTING';
        setError('pairing_retry (code ' + code + ') — noch nicht gekoppelt, neuer Satz Codes');
        console.log('[wa] noch ungekoppelt (code', code + '), neuer Versuch in', delay, 'ms…');
        restart(delay);
      } else if (code === DisconnectReason.loggedOut) {
        // WhatsApp hat das Gerät entfernt (z.B. conflict/device_removed). Die alten Creds
        // sind wertlos — mit ihnen läuft jeder Start sofort wieder in denselben 401 und es
        // erscheint NIE ein QR. Also verwerfen und neu koppeln lassen, ohne SSH-Eingriff.
        state = 'LOGGED_OUT';
        setError('logged_out (code ' + code + ') — Gerät in WhatsApp entfernt, neue Kopplung nötig');
        console.log('[wa] ausgeloggt — Creds werden verworfen, neuer QR folgt.');
        clearAuthFiles();
        restart(0);
      } else {
        setError('disconnected (code ' + code + ')');
        const delay = retryDelayMs;
        // Backoff wächst bei wiederholtem Abbruch, damit ein dauerhaft kaputter
        // Zustand WhatsApp nicht im Sekundentakt hämmert. Reset beim ersten 'open'.
        retryDelayMs = Math.min(retryDelayMs ? retryDelayMs * 2 : 2000, 60000);
        console.log('[wa] getrennt (code', code + '), reconnect in', delay, 'ms…');
        restart(delay);
      }
    }
  });

  // Poll-Votes kommen hier als pollUpdateMessage rein (Absender im LID-Format).
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const m of messages) {
      const pu = m.message?.pollUpdateMessage || m.message?.deviceSentMessage?.message?.pollUpdateMessage;
      if (pu) handleVote(m, pu);
    }
  });
}

// Entschlüsselt einen Vote und speichert je Wähler den LETZTEN Stand.
// Baileys 7-rc hat den Auto-Handler auskommentiert → wir rufen decryptPollVote selbst auf.
// Für Gruppen ist die passende JID-Kombi creator=eigenes LID / voter=voter-LID.
function handleVote(voteM, pu) {
  const msgId = pu.pollCreationMessageKey?.id;
  if (!msgId) return;
  const poll = store.polls[msgId];
  if (!poll) { console.log('[wa] Vote für unbekannte Poll', msgId, '— ignoriert'); return; }
  if (!poll.secret) { console.log('[wa] Poll', msgId, 'ohne secret — nicht entschlüsselbar'); return; }

  const secret = Buffer.from(poll.secret, 'base64');
  const meId = jidNormalizedUser(sock.user.id);
  const meLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : null;
  const voterDefault = getKeyAuthor(voteM.key, meId);
  const voterLid = voteM.key.participant ? jidNormalizedUser(voteM.key.participant) : voterDefault;

  const creators = [meLid, meId].filter(Boolean);
  const voters = [voterLid, voterDefault].filter((v, i, a) => v && a.indexOf(v) === i);

  for (const cj of creators) {
    for (const vj of voters) {
      try {
        const res = decryptPollVote(pu.vote, { pollEncKey: secret, pollCreatorJid: cj, pollMsgId: msgId, voterJid: vj });
        const chosen = (res.selectedOptions || [])
          .map((h) => { const hx = Buffer.from(h).toString('hex'); return poll.options.find((o) => sha256hex(o) === hx) || null; })
          .filter(Boolean);
        const voterKey = voterLid || voterDefault;
        const name = voteM.pushName || (poll.votes[voterKey] && poll.votes[voterKey].name) || voterKey;
        poll.votes[voterKey] = { name, options: chosen };
        saveStore();
        console.log('[wa] Vote', msgId, name, '→', chosen.join(', ') || '(leer)');
        return;
      } catch (_) { /* GCM-Auth fehlgeschlagen → nächste JID-Kombi */ }
    }
  }
  console.log('[wa] Vote nicht entschlüsselbar', msgId, voteM.key.participant || voteM.key.remoteJid);
}

/**
 * Einziger Einstieg in startSock — seriell und mit Backoff.
 * Vorher konnte ein fehlgeschlagener Start (z.B. fetchLatestBaileysVersion ohne Netz)
 * den Dienst dauerhaft ohne Socket zurücklassen: HTTP lief weiter, /qr lieferte für
 * immer null. Jetzt wird nachgefasst, bis ein Socket steht.
 */
function restart(delayMs) {
  if (starting) return;
  starting = true;
  setTimeout(() => {
    startSock()
      .then(() => { starting = false; })
      .catch((e) => {
        starting = false;
        state = 'INIT_FAILED';
        setError('init_failed: ' + (e && e.message || e));
        retryDelayMs = Math.min(retryDelayMs ? retryDelayMs * 2 : 5000, 60000);
        console.error('[wa] init failed, retry in', retryDelayMs, 'ms:', e && e.message || e);
        restart(retryDelayMs);
      });
  }, delayMs || 0);
}

restart(0);

const app = express();
app.use(express.json());

// Token-Guard auf allen Routen
app.use((req, res, next) => {
  if (!TOKEN || req.get('X-Service-Token') !== TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

// Ein QR, der älter als seine Lebensdauer ist, ist wertlos — WhatsApp weist ihn ab.
// Lieber nichts ausliefern (UI zeigt "neuer Code kommt") als einen toten Code.
function liveQr() {
  if (connected || !currentQrDataUrl) return null;
  if (qrAt && Date.now() - qrAt > QR_TTL_MS) return null;
  return currentQrDataUrl;
}

app.get('/status', (_req, res) => {
  res.json({
    connected,
    number: myNumber,
    name: myName,
    needsQr: liveQr() !== null,
    state,
    lastError: lastError ? lastError.reason : null,
    lastErrorAt: lastError ? lastError.at : null,
    lastPairingAt,
  });
});

app.get('/qr', (_req, res) => {
  res.json({ qr: connected ? null : currentQrDataUrl });
});

app.get('/groups', async (_req, res) => {
  if (!connected) return res.status(409).json({ error: 'not_connected' });
  try {
    const gs = await sock.groupFetchAllParticipating();
    const groups = Object.values(gs).map((g) => ({ id: g.id, name: g.subject }));
    res.json({ groups });
  } catch (e) {
    console.error('[wa] /groups failed:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

app.post('/send-poll', async (req, res) => {
  const { groupId, title, options, allowMultiple, message } = req.body || {};
  if (!connected) return res.status(409).json({ error: 'not_connected' });
  const hasPoll = Array.isArray(options) && options.length >= 2 && options.length <= 12 && typeof title === 'string' && title.trim() !== '';
  const hasMessage = typeof message === 'string' && message.trim() !== '';
  if (!groupId || (!hasPoll && !hasMessage)) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  try {
    // Einmal für Text UND Poll: der Memory wird beim ersten Senden sofort neu
    // geschrieben, ein zweiter Reset dazwischen würde nur doppelt verteilen.
    await resetSenderKeyMemory(groupId);
    // Optionale Nachricht zuerst (z.B. Event-Details), dann ggf. die Umfrage.
    if (hasMessage) {
      const sentText = await sock.sendMessage(groupId, { text: message.trim() });
      rememberSentMessage(sentText);
    }
    let pollMessageId = null;
    if (hasPoll) {
      const sent = await sock.sendMessage(groupId, {
        poll: { name: title, values: options, selectableCount: allowMultiple === true ? options.length : 1 },
      });
      rememberSentMessage(sent);
      pollMessageId = sent.key.id;
      const secret = sent.message?.messageContextInfo?.messageSecret;
      store.polls[pollMessageId] = {
        title,
        options,
        groupId,
        secret: secret ? Buffer.from(secret).toString('base64') : null,
        votes: {},
      };
      console.log('[wa] Poll gesendet', pollMessageId, '| secret vorhanden:', !!secret);
    }
    // Einmal am Ende: auch der reine Text-Fall (ohne Poll) muss persistiert werden,
    // sonst ist die gemerkte Nachricht nach dem nächsten Restart weg und der
    // Retry-Resend via getMessage greift genau dort nicht.
    saveStore();
    res.json({ sent: true, pollMessageId });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

// Liefert den aktuellen Abstimmungs-Stand je Wähler (letzter Stand). Format wie vom Backend erwartet.
app.get('/poll-votes/:msgId', (req, res) => {
  const poll = store.polls[req.params.msgId];
  if (!poll) return res.json([]);
  res.json(Object.values(poll.votes).map((v) => ({ voterName: v.name, options: v.options })));
});

app.listen(PORT, () => console.log('[wa] HTTP auf :' + PORT));
