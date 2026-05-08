const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const db = require('../config/database');

// WhatsApp
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Authentication routes (register / login / me)
const authRouter = require('../modules/auth');
app.use('/api', authRouter);

// Clientes endpoints
app.get('/api/clientes', (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/clientes', (req, res) => {
  const { nome, email, telefone, endereco } = req.body;
  const stmt = db.prepare('INSERT INTO clientes (nome, email, telefone, endereco) VALUES (?,?,?,?)');
  stmt.run([nome, email, telefone, endereco], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM clientes WHERE id = ?', [this.lastID], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.status(201).json(row);
    });
  });
  stmt.finalize();
});

app.put('/api/clientes/:id', (req, res) => {
  const id = req.params.id;
  const { nome, email, telefone, endereco } = req.body;
  db.run(
    'UPDATE clientes SET nome = ?, email = ?, telefone = ?, endereco = ? WHERE id = ?',
    [nome, email, telefone, endereco, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.delete('/api/clientes/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM clientes WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Peças endpoints
app.get('/api/pecas', (req, res) => {
  db.all('SELECT * FROM pecas ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/pecas', (req, res) => {
  const { codigo, nome, descricao, preco, estoque } = req.body;
  const stmt = db.prepare('INSERT INTO pecas (codigo, nome, descricao, preco, estoque) VALUES (?,?,?,?,?)');
  stmt.run([codigo, nome, descricao, preco || 0, estoque || 0], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM pecas WHERE id = ?', [this.lastID], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.status(201).json(row);
    });
  });
  stmt.finalize();
});

app.put('/api/pecas/:id', (req, res) => {
  const id = req.params.id;
  const { codigo, nome, descricao, preco, estoque } = req.body;
  db.run(
    'UPDATE pecas SET codigo = ?, nome = ?, descricao = ?, preco = ?, estoque = ? WHERE id = ?',
    [codigo, nome, descricao, preco, estoque, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.delete('/api/pecas/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM pecas WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Messages API
app.get('/api/messages/:jid', (req, res) => {
  const jid = req.params.jid;
  db.all('SELECT * FROM messages WHERE from_jid = ? OR to_jid = ? ORDER BY created_at ASC', [jid, jid], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/send', async (req, res) => {
  const { to, body } = req.body;
  if (!to || !body) return res.status(400).json({ error: 'to and body required' });
  try {
    if (!waClient) return res.status(500).json({ error: 'WhatsApp client not initialized' });
    await waClient.sendMessage(to, body);
    // persist out message
    db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', to, body, 'out'], function(err){
      if (err) return res.status(500).json({ error: err.message });
      emitContacts();
      res.json({ ok: true });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Automode endpoints
let autoMode = false;
app.get('/api/automode', (req, res) => res.json({ autoMode }));
app.post('/api/automode', (req, res) => {
  const { enabled } = req.body; autoMode = !!enabled; io.emit('autoMode', { autoMode }); res.json({ autoMode });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// conversational context helpers with inactivity follow-up
const userContexts = {};
const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes before prompting the user
const FOLLOWUP_MS = 2 * 60 * 1000; // 2 minutes to wait after prompt before clearing

function clearTimersForUser(entry) {
  if (!entry) return;
  if (entry.inactivityTimer) { clearTimeout(entry.inactivityTimer); entry.inactivityTimer = null; }
  if (entry.finalClearTimer) { clearTimeout(entry.finalClearTimer); entry.finalClearTimer = null; }
}

function setUserContext(userId, context) {
  const now = Date.now();
  const existing = userContexts[userId] || {};
  clearTimersForUser(existing);
  const entry = { context, timestamp: now, inactivityTimer: null, finalClearTimer: null };
  userContexts[userId] = entry;
  // schedule inactivity prompt
  entry.inactivityTimer = setTimeout(() => promptUserAfterInactivity(userId), INACTIVITY_MS);
}

function getUserContext(userId) {
  const entry = userContexts[userId];
  if (!entry) return null;
  // fallback expiration to 30 minutes if not interacted with
  if (Date.now() - entry.timestamp > 30 * 60 * 1000) {
    clearUserContext(userId);
    return null;
  }
  return entry.context;
}

function clearUserContext(userId) {
  const entry = userContexts[userId];
  if (entry) {
    clearTimersForUser(entry);
  }
  delete userContexts[userId];
}

async function promptUserAfterInactivity(userId) {
  try {
    const entry = userContexts[userId];
    if (!entry) return;
    // only prompt if user still in a conversational state (not null and not already awaiting)
    if (!entry.context || entry.context === 'awaiting_more') return;
    const text = 'Posso ajudar em mais alguma coisa?\n1) Sim\n2) Finalizar';
    // persist out message
    db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', userId, text, 'out'], function(err){
      if (err) console.error('db insert err', err);
      // emit to clients and send via whatsapp
      safeSendMessage(userId, text);
    });
    // set awaiting state and schedule final clear
    entry.context = 'awaiting_more';
    entry.timestamp = Date.now();
    entry.finalClearTimer = setTimeout(() => finalizeInactivity(userId), FOLLOWUP_MS);
  } catch (e) { console.error('promptUserAfterInactivity error', e); }
}

async function finalizeInactivity(userId) {
  try {
    const entry = userContexts[userId];
    if (!entry || entry.context !== 'awaiting_more') return clearUserContext(userId);
    const text = 'Encerrando atendimento por inatividade. Caso precise, nos envie uma nova mensagem.';
    db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', userId, text, 'out'], function(err){
      if (err) console.error('db insert err', err);
      safeSendMessage(userId, text);
      clearUserContext(userId);
    });
  } catch (e) { console.error('finalizeInactivity error', e); }
}

// safe send: types then sends when passed incoming msg
async function safeSendMessage(target, message) {
  try {
    if (target && typeof target.getChat === 'function') {
      const chat = await target.getChat();
      try { await chat.sendStateTyping(); } catch (e) {}
      await new Promise(r => setTimeout(r, 800));
      await waClient.sendMessage(target.from, message);
      try {
        io.emit('message', { from: 'seller@server', to: target.from, body: message, timestamp: Date.now(), direction: 'out' });
        emitContacts();
      } catch (e) {}
    } else {
      await waClient.sendMessage(target, message);
      try {
        io.emit('message', { from: 'seller@server', to: target, body: message, timestamp: Date.now(), direction: 'out' });
        emitContacts();
      } catch (e) {}
    }
  } catch (e) { console.error('safeSendMessage error', e && e.message ? e.message : e); }
}

// auto reply / conversational flow
async function processAutoReply(msg) {
  try {
    if (msg.isGroup) return;
    if (!msg.from) return; // ignore messages without a sender JID
    const userMessage = (msg.body || '').toLowerCase();
    const ctx = getUserContext(msg.from);

    // awaiting_more state: handle user reply to the inactivity prompt
    if (ctx === 'awaiting_more') {
      if (/(^|\s)(1|sim|claro)(\s|$)/i.test(userMessage)) {
        const text = 'Olá! Bem-vindo(a) à TICO Autopeças. Como posso ajudar você hoje?\n1) Ver Produtos\n2) Solicitar Orçamento\n3) Falar com Atendente';
        await safeSendMessage(msg, text);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, 'Menu enviado (texto)', 'out']);
        setUserContext(msg.from, 'main_menu');
        return;
      }

      if (/(^|\s)(2|finalizar|encerrar|sair|não|nao)(\s|$)/i.test(userMessage)) {
        const text = 'Tudo bem — se precisar, nos envie uma nova mensagem. Até logo!';
        await safeSendMessage(msg, text);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
        clearUserContext(msg.from);
        return;
      }

      await safeSendMessage(msg, 'Desculpe, responda 1 para continuar ou 2 para encerrar o atendimento.');
      return;
    }

    if (!ctx && /(^|\s)(oi|olá|ola|bom dia|boa tarde|boa noite)(\s|$)|produtos|menu|começar|start/i.test(userMessage)) {
      const text = 'Olá! Bem-vindo(a) à TICO Autopeças. Como posso ajudar você hoje?\n1) Ver Produtos\n2) Solicitar Orçamento\n3) Falar com Atendente';
      await safeSendMessage(msg, text);
      db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, 'Menu enviado (texto)', 'out']);
      setUserContext(msg.from, 'main_menu');
      return;
    }

    if (ctx === 'main_menu') {
      if (/1|ver produtos|produtos|ver/i.test(userMessage) || msg.selectedButtonId === 'opt_produtos') {
        const text = 'Categorias de Peças Automotivas:\n1) Freios\n2) Motor\n3) Suspensão\n4) Iluminação\nResponda apenas com o número da categoria (ex: 1).';
        await safeSendMessage(msg, text);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, 'Lista de categorias enviada (texto)', 'out']);
        setUserContext(msg.from, 'browse_categories');
        return;
      }

      if (/2|orçamento|orcamento|cotação|cotacao/i.test(userMessage) || msg.selectedButtonId === 'opt_orcamento') {
        const text = 'Ok — Para solicitar um orçamento, nos informe: nome da peça, quantidade e telefone para contato.';
        await safeSendMessage(msg, text);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
        setUserContext(msg.from, 'collect_quote');
        return;
      }

      if (/3|atendente|atendimento|falar com atendente/i.test(userMessage) || msg.selectedButtonId === 'opt_atendimento') {
        const text = 'Vou chamar um atendente. Por favor, aguarde — um vendedor entrará em contato em breve.';
        await safeSendMessage(msg, text);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
        clearUserContext(msg.from);
        return;
      }

      await safeSendMessage(msg, 'Desculpe, não entendi. Responda 1, 2 ou 3 ou escolha uma opção do menu.');
      return;
    }

    if (ctx === 'browse_categories') {
      const trimmed = (msg.body || '').trim();
      // Category 1: Freios
      if (/^1$/.test(trimmed) || /\bfreio|freios\b/i.test(userMessage)) {
        const text = 'Freios disponíveis:\n1) Pastilha de Freio A — R$ 120\n2) Disco de Freio B — R$ 250\n3) Kit de Reparo — R$ 85\nResponda com o número do produto para mais detalhes ou 0 para voltar ao menu.';
        await safeSendMessage(msg, text);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
        setUserContext(msg.from, 'browse_products:1');
        return;
      }
      // Category 2: Motor
      if (/^2$/.test(trimmed) || /\bmotor\b/i.test(userMessage)) {
        const text = 'Peças de Motor disponíveis:\n1) Filtro de Óleo — R$ 45\n2) Jogo de Velas — R$ 90\n3) Correia Dentada — R$ 220\nResponda com o número do produto para mais detalhes ou 0 para voltar ao menu.';
        await safeSendMessage(msg, text);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
        setUserContext(msg.from, 'browse_products:2');
        return;
      }
      // Category 3: Suspensão
      if (/^3$/.test(trimmed) || /suspens/i.test(userMessage)) {
        const text = 'Suspensão disponíveis:\n1) Amortecedor Dianteiro — R$ 320\n2) Mola Helicoidal — R$ 150\n3) Bieleta — R$ 40\nResponda com o número do produto para mais detalhes ou 0 para voltar ao menu.';
        await safeSendMessage(msg, text);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
        setUserContext(msg.from, 'browse_products:3');
        return;
      }
      // Category 4: Iluminação
      if (/^4$/.test(trimmed) || /ilumin|farol|lanterna|luz/i.test(userMessage)) {
        const text = 'Iluminação disponíveis:\n1) Farol Halógeno — R$ 180\n2) Lâmpada LED — R$ 60\n3) Lanternas Traseiras — R$ 220\nResponda com o número do produto para mais detalhes ou 0 para voltar ao menu.';
        await safeSendMessage(msg, text);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
        setUserContext(msg.from, 'browse_products:4');
        return;
      }
      await safeSendMessage(msg, 'Por favor responda apenas com o número da categoria (1-4) ou digite 0 para voltar ao menu.');
      return;
    }

    // browsing products: handle product number selection per category
    if (ctx && ctx.startsWith('browse_products:')) {
      const parts = ctx.split(':');
      const catId = parts[1];
      const trimmed = (msg.body || '').trim();
      // go back to main menu
      if (/^0$/.test(trimmed)) {
        const menu = 'Menu:\n1) Ver Produtos\n2) Solicitar Orçamento\n3) Falar com Atendente';
        await safeSendMessage(msg, menu);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, 'Menu enviado (texto)', 'out']);
        setUserContext(msg.from, 'main_menu');
        return;
      }

      // Category-specific product details
      if (catId === '1') {
        if (/^1$/.test(trimmed)) {
          const text = 'Pastilha de Freio A — R$ 120. Código: FREIO-A. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        if (/^2$/.test(trimmed)) {
          const text = 'Disco de Freio B — R$ 250. Código: DISCO-B. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        if (/^3$/.test(trimmed)) {
          const text = 'Kit de Reparo — R$ 85. Código: KIT-FREIO. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        await safeSendMessage(msg, 'Resposta inválida. Responda com o número do produto (1-3) ou 0 para voltar ao menu.');
        return;
      }

      if (catId === '2') {
        if (/^1$/.test(trimmed)) {
          const text = 'Filtro de Óleo — R$ 45. Código: FILTRO-OLEO. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        if (/^2$/.test(trimmed)) {
          const text = 'Jogo de Velas — R$ 90. Código: VELAS-SET. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        if (/^3$/.test(trimmed)) {
          const text = 'Correia Dentada — R$ 220. Código: CORREIA-1. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        await safeSendMessage(msg, 'Resposta inválida. Responda com o número do produto (1-3) ou 0 para voltar ao menu.');
        return;
      }

      if (catId === '3') {
        if (/^1$/.test(trimmed)) {
          const text = 'Amortecedor Dianteiro — R$ 320. Código: AMORT-DF. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        if (/^2$/.test(trimmed)) {
          const text = 'Mola Helicoidal — R$ 150. Código: MOLA-1. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        if (/^3$/.test(trimmed)) {
          const text = 'Bieleta — R$ 40. Código: BIELETA-1. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        await safeSendMessage(msg, 'Resposta inválida. Responda com o número do produto (1-3) ou 0 para voltar ao menu.');
        return;
      }

      if (catId === '4') {
        if (/^1$/.test(trimmed)) {
          const text = 'Farol Halógeno — R$ 180. Código: FAROL-H. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        if (/^2$/.test(trimmed)) {
          const text = 'Lâmpada LED — R$ 60. Código: LAMP-LED. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        if (/^3$/.test(trimmed)) {
          const text = 'Lanternas Traseiras — R$ 220. Código: LANT-T. Para solicitar orçamento, responda com: nome da peça, quantidade e telefone.';
          await safeSendMessage(msg, text);
          db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
          setUserContext(msg.from, 'collect_quote');
          return;
        }
        await safeSendMessage(msg, 'Resposta inválida. Responda com o número do produto (1-3) ou 0 para voltar ao menu.');
        return;
      }
    }

    if (ctx === 'collect_quote') {
      const text = 'Obrigado — recebemos sua solicitação. Nosso vendedor entrará em contato pelo telefone informado.';
      await safeSendMessage(msg, text);
      db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, text, 'out']);
      clearUserContext(msg.from);
      return;
    }

    if (autoMode) {
      if (/freio|freios/i.test(userMessage)) {
        const reply = 'Temos peças de freio. Responda 1 para ver categorias de peças (1-4) ou envie "produtos" para abrir o menu.';
        await safeSendMessage(msg, reply);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, reply, 'out']);
      } else if (/motor/i.test(userMessage)) {
        const reply = 'Temos peças de motor. Responda 1 para ver categorias de peças (1-4) ou envie "produtos" para abrir o menu.';
        await safeSendMessage(msg, reply);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, reply, 'out']);
      } else if (/suspens|amortecedor|mola/i.test(userMessage)) {
        const reply = 'Temos peças de suspensão. Responda 1 para ver categorias de peças (1-4) ou envie "produtos" para abrir o menu.';
        await safeSendMessage(msg, reply);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, reply, 'out']);
      } else if (/ilumin|farol|lanterna|luz/i.test(userMessage)) {
        const reply = 'Temos peças de iluminação. Responda 1 para ver categorias de peças (1-4) ou envie "produtos" para abrir o menu.';
        await safeSendMessage(msg, reply);
        db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', ['seller@server', msg.from, reply, 'out']);
      }
    }
  } catch (err) { console.error('auto reply error', err && err.message ? err.message : err); }
}

// WhatsApp client
let waClient = null;
let latestQr = null;
let waStatus = 'INITIALIZING';

function initWhatsApp() {
  waClient = new Client({ authStrategy: new LocalAuth(), puppeteer: { headless: true } });

  waClient.on('qr', (qr) => {
    qrcode.toDataURL(qr).then(url => { latestQr = url; waStatus = 'QR_RECEIVED'; io.emit('qr', url); }).catch(()=>{});
    io.emit('status', { state: 'QR_RECEIVED' });
  });

  waClient.on('ready', () => { waStatus = 'CONNECTED'; latestQr = null; io.emit('status', { state: 'CONNECTED' }); console.log('WhatsApp conectado'); });
  waClient.on('authenticated', () => { waStatus = 'AUTHENTICATED'; io.emit('status', { state: 'AUTHENTICATED' }); });
  waClient.on('auth_failure', msg => { waStatus = 'AUTH_FAILURE'; io.emit('status', { state: 'AUTH_FAILURE', msg }); });

  // initialize whatsapp message handler (delegates business logic to modules)
  const whatsappHandler = require('../modules/whatsapp/service')(io, { onAuto: processAutoReply });

  waClient.on('message', async msg => {
    try {
      console.log('wa message from:', msg.from, 'body:', msg.body);
      if (msg.isGroup) return;
      if (whatsappHandler && typeof whatsappHandler.handleIncomingMessage === 'function') {
        try {
          await whatsappHandler.handleIncomingMessage(msg);
        } catch (err) {
          console.error('whatsapp handler failed:', err);
        }
        return;
      }

      // fallback to legacy behaviour if handler not available
      const from = msg.from;
      const to = msg.to || 'seller@server';
      const body = msg.body;
      db.run('INSERT INTO messages (from_jid, to_jid, body, direction) VALUES (?,?,?,?)', [from, to, body, 'in'], function(err){
        if (err) console.error('db insert err', err);
        io.emit('message', { from, to, body, timestamp: Date.now() });
        emitContacts();
      });
      if (autoMode) await processAutoReply(msg);
    } catch (e) { console.error('message handler error', e); }
  });

  waClient.initialize();
}

initWhatsApp();

// contacts helper and endpoint
function emitContacts() {
  const sql = `
    SELECT jid FROM (
      SELECT DISTINCT from_jid AS jid FROM messages WHERE from_jid != 'seller@server'
      UNION
      SELECT DISTINCT to_jid AS jid FROM messages WHERE to_jid != 'seller@server'
    ) ORDER BY jid DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return;
    const contacts = (rows || []).map(r => r.jid).filter(Boolean);
    io.emit('contactList', contacts);
  });
}

app.get('/api/contacts', (req, res) => {
  const sql = `
    SELECT jid FROM (
      SELECT DISTINCT from_jid AS jid FROM messages WHERE from_jid != 'seller@server'
      UNION
      SELECT DISTINCT to_jid AS jid FROM messages WHERE to_jid != 'seller@server'
    ) ORDER BY jid DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json((rows || []).map(r => r.jid).filter(Boolean));
  });
});

io.on('connection', (socket) => {
  console.log('frontend conectado via socket.io');
  socket.emit('status', { state: waStatus || (waClient && waClient.info ? 'CONNECTED' : 'INITIALIZING') });
  if (latestQr) socket.emit('qr', latestQr);
  socket.emit('autoMode', { autoMode });
  
  // send contact list on connect
  emitContacts();

  socket.on('loadMessages', (jid) => {
    if (!jid) return socket.emit('messageHistory', []);
    db.all('SELECT * FROM messages WHERE from_jid = ? OR to_jid = ? ORDER BY created_at ASC', [jid, jid], (err, rows) => {
      if (err) return socket.emit('messageHistory', { error: err.message });
      socket.emit('messageHistory', rows);
    });
  });
});

server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
