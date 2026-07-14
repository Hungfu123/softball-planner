const express = require('express');
const QRCode = require('qrcode');
const { Client, LocalAuth, Poll } = require('whatsapp-web.js');

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.WHATSAPP_SERVICE_TOKEN || '';
const SESSION_PATH = process.env.SESSION_PATH || '/data/session';

let currentQrDataUrl = null;   // gesetzt solange Kopplung aussteht
let connected = false;
let myNumber = null;

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
  console.log('[wa] verbunden als', myNumber);
});
client.on('disconnected', (r) => {
  connected = false;
  console.log('[wa] getrennt:', r);
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
  res.json({ connected, number: myNumber, needsQr: !connected && currentQrDataUrl !== null });
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
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

app.post('/send-poll', async (req, res) => {
  const { groupId, title, options } = req.body || {};
  if (!connected) return res.status(409).json({ error: 'not_connected' });
  if (!groupId || !title || !Array.isArray(options) || options.length < 2 || options.length > 12) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  try {
    await client.sendMessage(groupId, new Poll(title, options, { allowMultipleAnswers: false }));
    res.json({ sent: true });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

app.listen(PORT, () => console.log('[wa] HTTP auf :' + PORT));
