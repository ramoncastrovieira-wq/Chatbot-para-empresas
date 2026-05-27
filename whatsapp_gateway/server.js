const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.WA_GATEWAY_PORT || 3001;
const FASTAPI_BASE = process.env.FASTAPI_BASE || 'http://127.0.0.1:8000/api/v1';
const DEFAULT_QUEUE_ID = Number(process.env.DEFAULT_QUEUE_ID || 1);

app.use(cors({ origin: true }));
app.use(express.json());

let latestQr = null;
let latestQrRaw = null;
let waStatus = 'INITIALIZING';
let lastError = null;
let clientInfo = null;
let client = null;
let inboundCount = 0;
let lastInbound = null;

function normalizePhoneFromJid(jid) {
  if (!jid) return '';
  return String(jid).replace('@c.us', '').replace('@s.whatsapp.net', '').replace(/\D/g, '');
}

async function postToFastApi(path, payload) {
  const res = await fetch(`${FASTAPI_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`FastAPI ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function processIncomingMessage(msg) {
  if (!msg || msg.isGroup || !msg.from) return;

  const body = msg.body || '';
  const phone = normalizePhoneFromJid(msg.from);
  const name = msg._data?.notifyName || msg._data?.pushname || `Cliente ${phone}`;

  inboundCount += 1;
  lastInbound = { from: msg.from, phone, name, body, at: new Date().toISOString() };

  try {
    const result = await postToFastApi('/demo-chatbot/send', {
      phone,
      name,
      content: body,
      queue_id: DEFAULT_QUEUE_ID,
    });

    if (result && result.reply) {
      await msg.reply(result.reply);
    }

    console.log('[WA->FastAPI] mensagem processada', { phone, conversation_id: result.conversation_id, queue_item_id: result.queue_item_id });
  } catch (err) {
    lastError = err.message;
    console.error('[WA->FastAPI] erro:', err.message);
    try {
      await msg.reply('Recebemos sua mensagem. Um atendente irá verificar em instantes.');
    } catch (_) {}
  }
}

function initClient() {
  waStatus = 'INITIALIZING';
  lastError = null;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', async (qr) => {
    latestQrRaw = qr;
    latestQr = await qrcode.toDataURL(qr);
    waStatus = 'QR_RECEIVED';
    clientInfo = null;
    console.log('[WhatsApp] QR gerado. Abra o frontend e escaneie.');
  });

  client.on('authenticated', () => {
    waStatus = 'AUTHENTICATED';
    console.log('[WhatsApp] autenticado.');
  });

  client.on('ready', () => {
    waStatus = 'CONNECTED';
    latestQr = null;
    latestQrRaw = null;
    clientInfo = client.info || null;
    console.log('[WhatsApp] conectado e pronto.');
  });

  client.on('auth_failure', (msg) => {
    waStatus = 'AUTH_FAILURE';
    lastError = msg || 'Falha de autenticação';
    console.error('[WhatsApp] auth_failure:', lastError);
  });

  client.on('disconnected', (reason) => {
    waStatus = 'DISCONNECTED';
    lastError = reason || null;
    latestQr = null;
    latestQrRaw = null;
    clientInfo = null;
    console.warn('[WhatsApp] desconectado:', reason);
  });

  client.on('message', processIncomingMessage);

  client.initialize().catch((err) => {
    waStatus = 'ERROR';
    lastError = err.message;
    console.error('[WhatsApp] erro ao inicializar:', err);
  });
}

app.get('/api/wa/status', (req, res) => {
  res.json({
    status: waStatus,
    has_qr: !!latestQr,
    connected: waStatus === 'CONNECTED',
    client_info: clientInfo,
    inbound_count: inboundCount,
    last_inbound: lastInbound,
    last_error: lastError,
  });
});

app.get('/api/wa/qr', (req, res) => {
  res.json({ status: waStatus, qr: latestQr, raw: latestQrRaw });
});

app.post('/api/wa/restart', async (req, res) => {
  try {
    if (client) {
      await client.destroy().catch(() => {});
    }
    latestQr = null;
    latestQrRaw = null;
    initClient();
    res.json({ ok: true, status: waStatus });
  } catch (err) {
    lastError = err.message;
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/wa/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone and message are required' });
    if (!client || waStatus !== 'CONNECTED') return res.status(409).json({ error: 'WhatsApp is not connected', status: waStatus });

    const jid = `${String(phone).replace(/\D/g, '')}@c.us`;
    await client.sendMessage(jid, message);
    res.json({ ok: true, to: jid });
  } catch (err) {
    lastError = err.message;
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ service: 'Tico WhatsApp Demo Gateway', status: waStatus, frontend_hint: 'Abra http://127.0.0.1:8000 e acesse a aba WhatsApp no painel principal.' });
});

initClient();
app.listen(PORT, () => console.log(`[WhatsApp Demo Gateway] http://127.0.0.1:${PORT}`));
