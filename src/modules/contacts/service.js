const repo = require('./repository');

module.exports = {
  findByJid: async (jid) => repo.findByJid(jid),
  findById: async (id) => repo.findById(id),
  listJids: async () => repo.listJids(),
  findOrCreateByJid: async (jid, meta = {}) => {
    if (!jid) throw new Error('jid required');
    let contact = await repo.findByJid(jid);
    if (!contact) {
      contact = await repo.create({ jid, name: meta.name || null, phone: meta.phone || jid, profile_picture: meta.profile_picture || null });
    }
    return contact;
  },
  updateLastMessage: async (contactId, timestamp) => {
    return repo.update(contactId, { last_message_at: timestamp });
  }
};
