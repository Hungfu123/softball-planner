const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth, Poll } = require('whatsapp-web.js');

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.WHATSAPP_SERVICE_TOKEN || '';
const SESSION_PATH = process.env.SESSION_PATH || '/data/session';

// Beim Start verwaiste Chromium-Singleton-Locks aus der persistenten Session
// entfernen — sonst startet Chromium nach unsauberem Container-Stop nicht
// ("profile appears to be in use", Code 21). Session selbst bleibt erhalten.
function clearChromeLocks(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.name.startsWith('Singleton')) {
      try { fs.unlinkSync(full); console.log('[wa] verwaisten Lock entfernt:', full); } catch { /* egal */ }
    } else if (e.isDirectory()) {
      clearChromeLocks(full);
    }
  }
}
clearChromeLocks(SESSION_PATH);

let currentQrDataUrl = null;   // gesetzt solange Kopplung aussteht
let connected = false;
let myNumber = null;
let myName = null;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

// TEMP-Diagnose: loggt jeden Event-Namen den der Client emittiert — um zu sehen, welches
// Event beim Abstimmen feuert (vote_update triggert in dieser Lib-Version nicht).
const _origEmit = client.emit.bind(client);
client.emit = (event, ...args) => {
  console.log('[wa] EVENT:', event);
  return _origEmit(event, ...args);
};

client.on('qr', async (qr) => {
  currentQrDataUrl = await QRCode.toDataURL(qr);
  connected = false;
  console.log('[wa] QR bereit — koppeln nötig');
});
client.on('ready', () => {
  connected = true;
  currentQrDataUrl = null;
  myNumber = client.info?.wid?.user ? '+' + client.info.wid.user : null;
  myName = client.info?.pushname || null;
  console.log('[wa] verbunden als', myName, myNumber);
});
client.on('disconnected', (r) => {
  connected = false;
  console.log('[wa] getrennt:', r);
});

// pollMsgId -> Map(voterWid -> { name, options: [] }); letzter Stand je Wähler
const pollVotes = new Map();

client.on('vote_update', async (vote) => {
  try {
    // Diagnose ganz oben (vor jedem return): zeigt ob das Event überhaupt feuert + die Struktur.
    console.log('[wa] vote-RAW:', JSON.stringify({
      hasVote: !!vote,
      voter: vote && vote.voter,
      parentIdType: typeof (vote && vote.parentMessage && vote.parentMessage.id),
      parentId: vote && vote.parentMessage && vote.parentMessage.id,
      selected: vote && vote.selectedOptions,
      keys: vote ? Object.keys(vote).slice(0, 20) : null,
    }));
    const pm = vote && vote.parentMessage;
    const msgId = extractMsgId(pm) || (pm && pm.id && pm.id._serialized) || null;
    if (!msgId) { console.warn('[wa] vote_update: keine parentMessage-id — übersprungen'); return; }
    const voterWid = vote.voter;
    let name = voterWid;
    try {
      const contact = await client.getContactById(voterWid);
      name = contact.pushname || contact.name || contact.number || voterWid;
    } catch (_) { /* Name nicht auflösbar → Wid als Fallback */ }
    const options = (vote.selectedOptions || [])
      .map((o) => (typeof o === 'string' ? o : (o && (o.name || o.localId)) || ''))
      .filter(Boolean);
    if (!pollVotes.has(msgId)) pollVotes.set(msgId, new Map());
    pollVotes.get(msgId).set(voterWid, { name, options });
    console.log('[wa] vote_update', msgId, name, options);
  } catch (e) {
    console.warn('[wa] vote_update Fehler:', e && e.message || e);
  }
});

client.initialize().catch((e) => console.error('[wa] init failed:', e));

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
  res.json({ connected, number: myNumber, name: myName, needsQr: !connected && currentQrDataUrl !== null });
});

app.get('/qr', (_req, res) => {
  res.json({ qr: connected ? null : currentQrDataUrl });
});

app.get('/groups', async (_req, res) => {
  if (!connected) return res.status(409).json({ error: 'not_connected' });
  try {
    const chats = await client.getChats();
    const groups = chats.filter((c) => c.isGroup).map((c) => ({ id: c.id._serialized, name: c.name }));
    res.json({ groups });
  } catch (e) {
    // Vollen Stack loggen — getChats bricht bei WhatsApp-Web-Updates gern mit
    // minifizierter Message ("r"), die allein nichts aussagt.
    console.error('[wa] /groups getChats FAILED:', e && e.stack ? e.stack : e);
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

// Message-ID aus dem sendMessage-Rückgabewert ziehen — je nach whatsapp-web.js-Version
// unterschiedlich verschachtelt (Objekt mit _serialized, roher String, oder Rohbestandteile).
function extractMsgId(msg) {
  if (!msg) return null;
  const id = msg.id;
  if (!id) return null;
  if (typeof id === 'string') return id;
  if (id._serialized) return id._serialized;
  if (id.id) {
    const remote = id.remote || msg.to || '';
    return remote ? `${id.fromMe ? 'true' : 'false'}_${remote}_${id.id}` : id.id;
  }
  return null;
}

// Fängt die eigene, gerade gesendete Poll-Nachricht über message_create ab und liefert ihre id.
// Nötig, weil sendMessage(Poll) in der gepinnten whatsapp-web.js-Version undefined zurückgibt.
// VOR dem Senden aufrufen (Listener muss aktiv sein, bevor das Event feuert).
function waitForSentPollId(groupId, title, timeoutMs = 10000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      client.removeListener('message_create', handler);
      resolve(val);
    };
    const handler = (msg) => {
      try {
        if (!msg || !msg.fromMe) return;
        const chat = msg.to || (msg.id && msg.id.remote);
        if (chat !== groupId) return;
        console.log('[wa] msg_create-DEBUG:', JSON.stringify({
          type: msg.type, pollName: msg.pollName, hasPollOptions: msg.pollOptions != null,
          bodyLen: msg.body ? msg.body.length : 0, id: extractMsgId(msg),
        }));
        const type = String(msg.type || '');
        const isPoll = type.includes('poll') || msg.pollName != null || (msg.pollOptions != null);
        // Falls Typ nicht als Poll erkennbar: über den Titel abgleichen (Poll-Frage steht im body/pollName).
        const matchesTitle = (msg.pollName && msg.pollName === title) || (msg.body && msg.body === title);
        if (isPoll || matchesTitle) finish(extractMsgId(msg));
      } catch (_) { /* ignore */ }
    };
    client.on('message_create', handler);
    setTimeout(() => finish(null), timeoutMs);
  });
}

app.post('/send-poll', async (req, res) => {
  const { groupId, title, options, allowMultiple, message } = req.body || {};
  if (!connected) return res.status(409).json({ error: 'not_connected' });
  const hasPoll = Array.isArray(options) && options.length >= 2 && options.length <= 12 && typeof title === 'string' && title.trim() !== '';
  const hasMessage = typeof message === 'string' && message.trim() !== '';
  if (!groupId || (!hasPoll && !hasMessage)) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  try {
    // Optionale Nachricht zuerst (z.B. Event-Details), dann ggf. die Umfrage.
    if (hasMessage) {
      await client.sendMessage(groupId, message.trim());
    }
    let pollMessageId = null;
    if (hasPoll) {
      // Diese whatsapp-web.js-Version gibt bei sendMessage(Poll) nichts zurück (undefined).
      // Deshalb die eigene gesendete Poll-Nachricht über message_create abfangen und deren id nehmen.
      const waitForPoll = waitForSentPollId(groupId, title);
      const sent = await client.sendMessage(groupId, new Poll(title, options, { allowMultipleAnswers: allowMultiple === true }));
      pollMessageId = extractMsgId(sent) || await waitForPoll;
      console.log('[wa] send-poll pollMessageId =', pollMessageId);
    }
    res.json({ sent: true, pollMessageId });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

app.get('/poll-votes/:msgId', (req, res) => {
  const voters = pollVotes.get(req.params.msgId);
  if (!voters) return res.json([]);
  res.json(Array.from(voters.values()).map((v) => ({ voterName: v.name, options: v.options })));
});

// DEBUG-Sonde: fragt die Poll-Vote-Tabelle aktiv ab (bulkGetByParentMsgKey) für ?msgId=<pollId>.
// Klärt: liegen nach dem Abstimmen echte Stimmen drin, obwohl vote_update nicht feuert?
app.get('/debug/poll-store', async (req, res) => {
  if (!connected) return res.status(409).json({ error: 'not_connected' });
  const msgId = req.query.msgId || null;
  try {
    const out = await client.pupPage.evaluate(async (msgId) => {
      const result = {};
      const safe = async (fn) => { try { return await fn(); } catch (e) { return 'ERR: ' + (e && e.message || e); } };
      const rq = window.require || (window.mR && window.mR.require);
      result.hasRequire = !!rq;
      const tm = await safe(() => rq('WAWebAddonPollVoteTableMode').pollVoteTableMode);
      result.tableSize = await safe(() => tm.getTableSize());

      // Store-Msg-Modul finden (für den echten MsgKey der Poll-Nachricht)
      result.msgStoreKeys = safe(() => Object.keys(window.Store || {}).filter((k) => /^Msg$|Msg/.test(k)).slice(0, 10));
      let key = null;
      result.foundMsg = await safe(async () => {
        const MsgStore = window.Store && window.Store.Msg;
        if (!MsgStore || !MsgStore.get || !msgId) return 'no MsgStore/msgId';
        const m = MsgStore.get(msgId);
        if (m && m.id) { key = m.id; return true; }
        return false;
      });

      const mapVotes = (arr) => (Array.isArray(arr) ? arr.slice(0, 30).map((v) => ({
        sender: v.sender && (v.sender._serialized || v.sender),
        parent: v.pollUpdateParentKey && (v.pollUpdateParentKey._serialized || v.pollUpdateParentKey),
        selectedLocalIds: v.selectedOptionLocalIds,
        selected: v.selectedOptions,
        keys: Object.keys(v).slice(0, 20),
      })) : arr);

      // bulk*-Methoden erwarten ARRAYS. Chat-Wid aus der Poll-ID (true_<chat>_<id>).
      const chatWid = typeof msgId === 'string' ? msgId.split('_')[1] : null;
      result.chatWid = chatWid;
      result.byParentArr = mapVotes(await safe(() => tm.bulkGetByParentMsgKey([msgId])));
      result.byChatWid = mapVotes(await safe(() => tm.bulkGetByChatWid([chatWid])));
      return result;
    }, msgId);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e && e.stack || e) });
  }
});

app.listen(PORT, () => console.log('[wa] HTTP auf :' + PORT));
