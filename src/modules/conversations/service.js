const repository = require('./repository');

module.exports = {
  list: repository.list,
  findById: repository.findById,
  findOpenByContactId: repository.findOpenByContactId,

  createConversation: (contactId, opts = {}) => repository.create({
    contact_id: contactId,
    assigned_attendant_id: opts.assigned_attendant_id || null,
    queue_id: opts.queue_id || null,
    status: opts.status || 'pending',
    started_at: opts.started_at || new Date()
  }),

  findOrCreateOpenConversation: async (contactId) => {
    let conversation = await repository.findOpenByContactId(contactId);
    if (!conversation) {
      conversation = await repository.create({ contact_id: contactId, status: 'pending' });
    }
    return conversation;
  },

  assignQueue: (conversationId, queueId) => repository.update(conversationId, {
    queue_id: queueId,
    status: 'open'
  }),

  assignAttendant: (conversationId, attendantId) => repository.update(conversationId, {
    assigned_attendant_id: attendantId,
    status: 'open'
  }),

  close: (conversationId) => repository.update(conversationId, {
    status: 'closed',
    closed_at: new Date()
  }),

  setStatus: (conversationId, status) => repository.update(conversationId, { status })
};
