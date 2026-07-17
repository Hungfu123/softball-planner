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
    const msgId = vote.parentMessage?.id?._serialized;
    if (!msgId) return;
    const voterWid = vote.voter;
    let name = voterWid;
    try {
      const contact = await client.getContactById(voterWid);
      name = contact.pushname || contact.name || contact.number || voterWid;
    } catch (_) { /* Name nicht auflösbar → Wid als Fallback */ }
    const options = (vote.selectedOptions || []).map((o) => o.name);
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

// TEMP-DEBUG: instrumentiert getChatModel Schritt-für-Schritt im WA-Page-Kontext.
// Zeigt, warum /groups leer ist (0 Chats? welcher Model-Schritt wirft?). Wieder entfernen.
app.get('/debug-chats', async (_req, res) => {
  if (!connected) return res.status(409).json({ error: 'not_connected' });
  try {
    const out = await client.pupPage.evaluate(async () => {
      const r = { collections: {}, steps: {} };
      const C = window.require('WAWebCollections');
      r.collections.hasChat = !!(C && C.Chat);
      r.collections.hasGroupMetadata = !!(C && C.GroupMetadata);
      r.collections.hasGroupMetadataColl = !!(C && C.WAWebGroupMetadataCollection);
      const chats = C.Chat.getModelsArray();
      r.chatCount = chats.length;
      const groups = chats.filter((c) => c.groupMetadata);
      r.groupCount = groups.length;
      r.sample = chats.slice(0, 3).map((c) => ({ id: c.id && c.id._serialized, name: c.name || c.formattedTitle, isGroup: !!c.groupMetadata }));
      const g = groups[0];
      if (g) {
        const S = r.steps;
        try { S.serialize = !!g.serialize(); } catch (e) { S.serializeErr = String(e && e.message || e); }
        try { S.wid = !!window.require('WAWebWidFactory').createWid(g.id._serialized); } catch (e) { S.widErr = String(e && e.message || e); }
        try { S.gmSerialize = !!g.groupMetadata.serialize(); } catch (e) { S.gmSerializeErr = String(e && e.message || e); }
        try { S.hasToPn = typeof window.require('WAWebLidMigrationUtils').toPn; } catch (e) { S.toPnErr = String(e && e.message || e); }
        try { S.getChatModel = !!(await window.WWebJS.getChatModel(g)); } catch (e) { S.getChatModelErr = String(e && e.stack || e && e.message || e); }
      }
      return r;
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e && e.stack || e && e.message || e) });
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
    // Optionale Nachricht zuerst (z.B. Event-Details), dann ggf. die Umfrage.
    if (hasMessage) {
      await client.sendMessage(groupId, message.trim());
    }
    let pollMessageId = null;
    if (hasPoll) {
      const sent = await client.sendMessage(groupId, new Poll(title, options, { allowMultipleAnswers: allowMultiple === true }));
      pollMessageId = sent?.id?._serialized ?? null;
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

app.listen(PORT, () => console.log('[wa] HTTP auf :' + PORT));
