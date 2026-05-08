const repository = require('./repository');
const contactsService = require('../contacts/service');
const conversationsService = require('../conversations/service');

module.exports = {
  createIncoming: async ({ jid, content, message_type = 'text', timestamp = Date.now() }) => {
    const contact = await contactsService.findOrCreateByJid(jid, { phone: jid });
    const conversation = await conversationsService.findOrCreateOpenConversation(contact.id);
    const message = await repository.create({
      conversation_id: conversation.id,
      sender_type: 'client',
      sender_id: contact.id,
      content,
      message_type,
      timestamp,
      from_jid: jid,
      to_jid: 'seller@server',
      direction: 'in'
    });
    await contactsService.updateLastMessage(contact.id, timestamp);
    return { message, contact, conversation };
  },

  createOutgoing: async ({ to_jid, content, message_type = 'text', timestamp = Date.now(), sender_attendant_id = null, sender_type = 'attendant' }) => {
    const contact = await contactsService.findOrCreateByJid(to_jid, { phone: to_jid });
    const conversation = await conversationsService.findOrCreateOpenConversation(contact.id);
    const message = await repository.create({
      conversation_id: conversation.id,
      sender_type,
      sender_id: sender_attendant_id,
      content,
      message_type,
      timestamp,
      from_jid: 'seller@server',
      to_jid,
      direction: 'out'
    });
    await contactsService.updateLastMessage(contact.id, timestamp);
    return { message, contact, conversation };
  },

  listByConversation: repository.listByConversation,
  listByJid: repository.listByJid
};
