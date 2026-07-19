const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  decryptPollVote,
  getKeyAuthor,
  jidNormalizedUser,
  DisconnectReason,
} = require('baileys');

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.WHATSAPP_SERVICE_TOKEN || '';
const SESSION_PATH = process.env.SESSION_PATH || '/data/session';
const STORE_FILE = path.join(SESSION_PATH, 'poll-store.json');

let sock = null;
let connected = false;
let myNumber = null;
let myName = null;
let currentQrDataUrl = null;   // gesetzt solange Kopplung aussteht

// Persistenter Poll-Store — überlebt Container-Neustart, sonst geht der messageSecret
// (zum Entschlüsseln der Votes) verloren und schon abgegebene Stimmen wären futsch.
//   polls[msgId] = { title, options:[...], groupId, secret(base64), votes: { voterJid: {name, options:[...]} } }
let store = { polls: {} };
function loadStore() {
  try { store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); } catch { store = { polls: {} }; }
}
function saveStore() {
  try {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(store));
  } catch (e) { console.error('[wa] store save failed:', e && e.message || e); }
}
loadStore();

const sha256hex = (s) => crypto.createHash('sha256').update(Buffer.from(s)).digest('hex');

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
  const { version } = await fetchLatestBaileysVersion();
  console.log('[wa] Baileys WA-Version:', version.join('.'));

  sock = makeWASocket({ version, auth: state, printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      currentQrDataUrl = await QRCode.toDataURL(qr);
      connected = false;
      console.log('[wa] QR bereit — koppeln nötig');
    }
    if (connection === 'open') {
      connected = true;
      currentQrDataUrl = null;
      const pn = sock.user?.id ? jidNormalizedUser(sock.user.id).split('@')[0] : null;
      myNumber = pn ? '+' + pn : null;
      myName = sock.user?.name || null;
      console.log('[wa] verbunden als', myName, myNumber, '| LID', sock.user?.lid);
    }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('[wa] ausgeloggt — Session löschen und neu koppeln.');
      } else {
        console.log('[wa] getrennt (code', code + '), reconnect…');
        startSock();
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

startSock().catch((e) => console.error('[wa] init failed:', e));

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
    // Optionale Nachricht zuerst (z.B. Event-Details), dann ggf. die Umfrage.
    if (hasMessage) {
      await sock.sendMessage(groupId, { text: message.trim() });
    }
    let pollMessageId = null;
    if (hasPoll) {
      const sent = await sock.sendMessage(groupId, {
        poll: { name: title, values: options, selectableCount: allowMultiple === true ? options.length : 1 },
      });
      pollMessageId = sent.key.id;
      const secret = sent.message?.messageContextInfo?.messageSecret;
      store.polls[pollMessageId] = {
        title,
        options,
        groupId,
        secret: secret ? Buffer.from(secret).toString('base64') : null,
        votes: {},
      };
      saveStore();
      console.log('[wa] Poll gesendet', pollMessageId, '| secret vorhanden:', !!secret);
    }
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
