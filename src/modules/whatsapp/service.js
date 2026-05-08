const contactsService = require('../contacts/service');
const messagesService = require('../messages/service');
const conversationsService = require('../conversations/service');

module.exports = (io, opts = {}) => {
  const onAuto = (opts && opts.onAuto) || null;

  async function handleIncomingMessage(msg) {
    try {
      if (!msg) return;
      if (msg.isGroup) return; // ignore groups for now
      const jid = msg.from;
      const content = (msg.body || '').toString();
      const timestamp = msg.timestamp ? (Number(msg.timestamp) * 1000) : Date.now();

      const result = await messagesService.createIncoming({ jid, content, timestamp, raw: msg });

      // emit to socket clients
      try {
        io.emit('message', { from: jid, to: 'seller@server', body: content, timestamp, direction: 'in' });
        const contacts = await contactsService.listJids();
        io.emit('contactList', contacts);
      } catch (e) { console.error('emit error', e); }

      // optional auto-processing callback (keeps backwards compatibility)
      if (onAuto && typeof onAuto === 'function') {
        try { await onAuto(msg); } catch (e) { console.error('onAuto handler error', e); }
      }

      return result;
    } catch (err) {
      console.error('whatsapp handler error', err && err.message ? err.message : err);
      throw err;
    }
  }

  return { handleIncomingMessage };
};
