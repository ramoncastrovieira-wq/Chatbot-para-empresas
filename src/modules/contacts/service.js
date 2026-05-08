const repository = require('./repository');

module.exports = {
  list: repository.list,
  listJids: repository.listJids,
  findByJid: repository.findByJid,

  findOrCreateByJid: async (jid, meta = {}) => {
    let contact = await repository.findByJid(jid);
    if (!contact) {
      contact = await repository.create({
        jid,
        name: meta.name || null,
        phone: meta.phone || jid,
        profile_picture: meta.profile_picture || null
      });
    }
    return contact;
  },

  updateLastMessage: (contactId, timestamp) => repository.update(contactId, { last_message_at: new Date(Number(timestamp) || Date.now()) })
};
