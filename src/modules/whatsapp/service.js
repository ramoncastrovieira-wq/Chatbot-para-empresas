const contactsService = require('../contacts/service');
const messagesService = require('../messages/service');
const conversationsService = require('../conversations/service');
const queuesService = require('../queues/service');

module.exports = (io, opts = {}) => {
  const onAuto = opts.onAuto || null;
  const sendMessage = opts.sendMessage || null;

  async function emitOperationalState(payload) {
    try {
      io.emit('message', {
        from: payload.from,
        to: payload.to,
        body: payload.body,
        timestamp: payload.timestamp,
        direction: payload.direction,
        conversation_id: payload.conversation_id,
        queue_id: payload.queue_id
      });
      io.emit('message:new', payload);
      io.emit('conversation:update', payload.conversation);
      const contacts = await contactsService.listJids();
      io.emit('contactList', contacts);
    } catch (e) {
      console.error('Erro ao emitir eventos operacionais:', e.message);
    }
  }

  async function sendSystemMessage(jid, content) {
    const result = await messagesService.createOutgoing({
      to_jid: jid,
      content,
      sender_type: 'system'
    });

    if (sendMessage) {
      await sendMessage(jid, content, { persist: false });
    }

    await emitOperationalState({
      from: 'seller@server',
      to: jid,
      body: content,
      timestamp: Date.now(),
      direction: 'out',
      conversation_id: result.conversation.id,
      queue_id: result.conversation.queue_id,
      conversation: result.conversation
    });

    return result;
  }

  async function applyUnitTriage(jid, content, conversation) {
    if (conversation.queue_id) return false;

    const normalized = String(content || '').trim();
    const queue = await queuesService.findByOption(normalized);

    if (!queue) {
      await sendSystemMessage(jid, queuesService.buildUnitMenu());
      return true;
    }

    const updatedConversation = await conversationsService.assignQueue(conversation.id, queue.id);
    await sendSystemMessage(
      jid,
      `Perfeito. Você selecionou: ${queue.name}.\nSeu atendimento foi direcionado para a fila correta. Um atendente irá assumir a conversa em breve.`
    );

    io.emit('queue:update', { queue, conversation: updatedConversation });
    io.emit('conversation:queued', { queue, conversation: updatedConversation });

    return true;
  }

  async function handleIncomingMessage(msg) {
    try {
      if (!msg || msg.isGroup || !msg.from) return null;

      const jid = msg.from;
      const content = (msg.body || '').toString();
      const timestamp = msg.timestamp ? Number(msg.timestamp) * 1000 : Date.now();

      const result = await messagesService.createIncoming({ jid, content, timestamp });

      await emitOperationalState({
        from: jid,
        to: 'seller@server',
        body: content,
        timestamp,
        direction: 'in',
        conversation_id: result.conversation.id,
        queue_id: result.conversation.queue_id,
        conversation: result.conversation
      });

      const triageHandled = await applyUnitTriage(jid, content, result.conversation);
      if (!triageHandled && onAuto && typeof onAuto === 'function') {
        await onAuto(msg);
      }

      return result;
    } catch (err) {
      console.error('Erro no handler do WhatsApp:', err.message);
      throw err;
    }
  }

  return { handleIncomingMessage, sendSystemMessage };
};
