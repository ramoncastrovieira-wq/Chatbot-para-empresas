const $ = selector => document.querySelector(selector);

const views = {
  login: $('#view-login'),
  clientes: $('#view-clientes'),
  chat: $('#view-chat')
};

$('#btn-clientes').addEventListener('click', () => show('clientes'));
$('#btn-chat').addEventListener('click', () => show('chat'));

function show(name) {
  Object.values(views).forEach(v => (v.style.display = 'none'));
  views[name].style.display = '';
  if (name === 'clientes') loadClientes();
  if (name === 'chat') ensureSocket();
}

// Clientes
const listaClientes = $('#lista-clientes');
$('#form-cliente').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  await fetch('/api/clientes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)});
  form.reset();
  loadClientes();
});

async function loadClientes() {
  const res = await fetch('/api/clientes');
  const items = await res.json();
  listaClientes.innerHTML = items.map(c => `
    <li>
      <strong>${c.nome}</strong> — ${c.email || ''} — ${c.telefone || ''}
      <button data-id="${c.id}" class="del-cliente">Excluir</button>
    </li>
  `).join('');
  document.querySelectorAll('.del-cliente').forEach(b => b.addEventListener('click', async (ev) => {
    const id = ev.target.dataset.id;
    await fetch('/api/clientes/' + id, { method: 'DELETE' });
    loadClientes();
  }));
}

// Catálogo de peças removido da interface — endpoints permanecem no servidor

// inicial
show('login');

// --- Chat / WhatsApp integration ---
let socket = null;
let selectedContact = null;
function ensureSocket() {
  if (socket) return;
  socket = io();
  const qrArea = document.getElementById('qr-area');
  const chatStatus = document.getElementById('chat-status');
  const chatWindow = document.getElementById('chat-window');
  const chatMessages = document.getElementById('chat-messages');
  const contactsUl = document.getElementById('contacts-ul');
  const chatHeader = document.getElementById('chat-header');

  socket.on('connect', () => {
    console.log('socket conectado');
    // request initial automode state via REST as fallback
    fetch('/api/automode').then(r => r.json()).then(j => {
      setAutoButtonState(!!j.autoMode);
    }).catch(()=>{});
  });

  socket.on('qr', (dataUrl) => {
    chatStatus.textContent = 'Escaneie o QR com o WhatsApp do vendedor';
    chatWindow.style.display = 'none';
    qrArea.innerHTML = `<img src="${dataUrl}" alt="QR Code" style="max-width:260px"/>`;
  });

  socket.on('status', (s) => {
    chatStatus.textContent = 'Status: ' + (s.state || '---');
    if (s.state === 'CONNECTED') {
      qrArea.innerHTML = '';
      chatWindow.style.display = '';
    }
  });

  socket.on('message', (m) => {
    // determine which jid represents the contact (not the server)
    const contactJid = (m.from === 'seller@server') ? m.to : m.from;
    // ensure contact appears on the left and get its list item
    const li = addContactToList(contactJid);
    // if the message belongs to the currently selected contact, render it
    if (selectedContact && (m.from === selectedContact || m.to === selectedContact)) {
      renderMessage(m);
    } else {
      // mark contact as having unread messages
      if (li) {
        li.classList.add('has-unread');
        const dot = li.querySelector('.unread-dot');
        if (dot) dot.style.display = 'inline-block';
      }
    }
  });

  socket.on('messageHistory', (rows) => {
    // rows can be error object or array
    if (!Array.isArray(rows)) return;
    chatMessages.innerHTML = '';
    rows.forEach(m => renderMessage(m));
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  socket.on('contactList', (contacts) => {
    contactsUl.innerHTML = '';
    (contacts || []).forEach(jid => addContactToList(jid));
  });

  socket.on('autoMode', (s) => {
    setAutoButtonState(!!s.autoMode);
  });

  // send message form
  document.getElementById('form-send').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedContact) return alert('Selecione um contato à esquerda.');
    const bodyInput = document.getElementById('input-body');
    const payload = { to: selectedContact, body: bodyInput.value };
    await fetch('/api/send', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    bodyInput.value = '';
    // append to view
    renderMessage({ from: 'seller@server', to: selectedContact, body: payload.body, timestamp: Date.now(), direction: 'out' });
  });

  // load history button
  // helper: add contact to left list
  function addContactToList(jid) {
    if (!jid) return null;
    const existing = Array.from(contactsUl.querySelectorAll('li')).find(li => li.dataset.jid === jid);
    if (existing) return existing;
    const li = document.createElement('li');
    li.dataset.jid = jid;
    const nameSpan = document.createElement('span');
    nameSpan.className = 'contact-name';
    nameSpan.textContent = jid;
    const unreadDot = document.createElement('span');
    unreadDot.className = 'unread-dot';
    unreadDot.style.display = 'none';
    li.appendChild(nameSpan);
    li.appendChild(unreadDot);
    li.addEventListener('click', () => {
      selectContact(jid);
      li.classList.remove('has-unread');
      unreadDot.style.display = 'none';
    });
    contactsUl.appendChild(li);
    return li;
  }

  function selectContact(jid) {
    selectedContact = jid;
    chatWindow.style.display = '';
    qrArea.innerHTML = '';
    chatHeader.textContent = jid;
    // mark active
    Array.from(contactsUl.querySelectorAll('li')).forEach(li => li.classList.toggle('active', li.dataset.jid === jid));
    // clear unread indicator for this contact
    const activeLi = contactsUl.querySelector(`li[data-jid="${jid}"]`);
    if (activeLi) {
      activeLi.classList.remove('has-unread');
      const dot = activeLi.querySelector('.unread-dot');
      if (dot) dot.style.display = 'none';
    }
    socket.emit('loadMessages', jid);
  }

  function renderMessage(m) {
    const li = document.createElement('li');
    const isOut = m.direction === 'out' || m.from === 'seller@server';
    li.className = isOut ? 'msg-out' : 'msg-in';
    const who = isOut ? 'Você' : (m.from || m.from_jid || 'contato');
    li.innerHTML = `<div class="bubble"><div class="who">${who}</div><div class="text">${m.body}</div></div>`;
    chatMessages.appendChild(li);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // auto-mode toggle
  document.getElementById('btn-toggle-auto').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const enabled = btn.dataset.enabled !== 'true';
    const res = await fetch('/api/automode', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ enabled }) });
    const json = await res.json();
    setAutoButtonState(!!json.autoMode);
  });

  function setAutoButtonState(enabled) {
    const btn = document.getElementById('btn-toggle-auto');
    if (!btn) return;
    btn.dataset.enabled = enabled ? 'true' : 'false';
    const indicator = document.querySelector('#btn-toggle-auto .auto-indicator');
    if (enabled) {
      btn.classList.remove('auto-off'); btn.classList.add('auto-on');
      btn.innerHTML = '<span class="auto-indicator on"></span>Auto-Respostas: Ativado';
    } else {
      btn.classList.remove('auto-on'); btn.classList.add('auto-off');
      btn.innerHTML = '<span class="auto-indicator off"></span>Auto-Respostas: Desativado';
    }
  }
}

// login
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)});
  if (res.ok) {
    show('chat');
  } else {
    alert('Credenciais inválidas');
  }
});
