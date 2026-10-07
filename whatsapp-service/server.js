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
  });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      currentQrDataUrl = await QRCode.toDataURL(qr);
      connected = false;
      state = 'WAITING_QR';
      console.log('[wa] QR bereit — koppeln nötig');
    }
    if (connection === 'open') {
      connected = true;
      currentQrDataUrl = null;
      state = 'CONNECTED';
      retryDelayMs = 0;
      const pn = sock.user?.id ? jidNormalizedUser(sock.user.id).split('@')[0] : null;
      myNumber = pn ? '+' + pn : null;
      myName = sock.user?.name || null;
      console.log('[wa] verbunden als', myName, myNumber, '| LID', sock.user?.lid);
    }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
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

app.get('/status', (_req, res) => {
  res.json({
    connected,
    number: myNumber,
    name: myName,
    needsQr: !connected && currentQrDataUrl !== null,
    state,
    lastError: lastError ? lastError.reason : null,
    lastErrorAt: lastError ? lastError.at : null,
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
