const repo = require('./repository');

module.exports = {
  findOpenByContactId: async (contactId) => repo.findOpenByContactId(contactId),
  createConversation: async (contactId, opts = {}) => repo.create({ contact_id: contactId, assigned_attendant_id: opts.assigned_attendant_id || null, queue_id: opts.queue_id || null, status: opts.status || 'open', started_at: opts.started_at || new Date() }),
  findOrCreateOpenConversation: async (contactId) => {
    let conv = await repo.findOpenByContactId(contactId);
    if (!conv) {
      conv = await repo.create({ contact_id: contactId });
    }
    return conv;
  },
  assignAttendant: async (conversationId, attendantId) => repo.update(conversationId, { assigned_attendant_id: attendantId }),
  setStatus: async (conversationId, status) => repo.update(conversationId, { status })
};
