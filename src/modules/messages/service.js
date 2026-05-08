const repo = require('./repository');
const contactsService = require('../contacts/service');
const conversationsService = require('../conversations/service');

module.exports = {
  createIncoming: async ({ jid, content, message_type = 'text', timestamp = Date.now(), raw = null }) => {
    // ensure contact
    const contact = await contactsService.findOrCreateByJid(jid, { name: null, phone: jid });
    // ensure conversation
    const conv = await conversationsService.findOrCreateOpenConversation(contact.id);
    // persist message
    const msg = await repo.create({ conversation_id: conv.id, sender_type: 'client', sender_id: contact.id, content, message_type, timestamp, from_jid: jid, to_jid: 'seller@server', direction: 'in' });
    // update contact last_message
    await contactsService.updateLastMessage(contact.id, timestamp);
    return { message: msg, contact, conversation: conv };
  },
  createOutgoing: async ({ to_jid, content, message_type = 'text', timestamp = Date.now(), sender_attendant_id = null }) => {
    const contact = await contactsService.findOrCreateByJid(to_jid, { phone: to_jid });
    const conv = await conversationsService.findOrCreateOpenConversation(contact.id);
    const msg = await repo.create({ conversation_id: conv.id, sender_type: 'attendant', sender_id: sender_attendant_id, content, message_type, timestamp, from_jid: 'seller@server', to_jid, direction: 'out' });
    await contactsService.updateLastMessage(contact.id, timestamp);
    return { message: msg, contact, conversation: conv };
  },
  listByConversation: async (conversationId) => repo.listByConversation(conversationId)
};
