const { dbGet, dbAll, dbRun } = require('../../shared/utils/dbAsync');

module.exports = {
  list: () => dbAll('SELECT * FROM contacts ORDER BY COALESCE(last_message_at, created_at) DESC'),
  listJids: async () => (await module.exports.list()).map(c => c.jid).filter(Boolean),
  findById: (id) => dbGet('SELECT * FROM contacts WHERE id = ?', [id]),
  findByJid: (jid) => dbGet('SELECT * FROM contacts WHERE jid = ?', [jid]),

  create: async ({ jid, name = null, phone = null, profile_picture = null }) => {
    const result = await dbRun(
      'INSERT INTO contacts (jid, name, phone, profile_picture) VALUES (?,?,?,?)',
      [jid, name, phone, profile_picture]
    );
    return module.exports.findById(result.id);
  },

  update: async (id, data) => {
    const fields = [];
    const params = [];
    for (const key of ['name', 'phone', 'profile_picture', 'last_message_at']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
    if (!fields.length) return module.exports.findById(id);
    params.push(id);
    await dbRun(`UPDATE contacts SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    return module.exports.findById(id);
  }
};
