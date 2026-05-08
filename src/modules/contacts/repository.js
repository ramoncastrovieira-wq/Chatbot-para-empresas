const db = require('../../config/database');

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) return reject(err);
    return resolve(this.lastID || null);
  }));
}

module.exports = {
  findByJid: async (jid) => dbGet('SELECT * FROM contacts WHERE jid = ?', [jid]),
  findByPhone: async (phone) => dbGet('SELECT * FROM contacts WHERE phone = ?', [phone]),
  findById: async (id) => dbGet('SELECT * FROM contacts WHERE id = ?', [id]),
  create: async ({ jid, name, phone, profile_picture }) => {
    const id = await dbRun('INSERT INTO contacts (jid, name, phone, profile_picture) VALUES (?,?,?,?)', [jid, name || null, phone || null, profile_picture || null]);
    return module.exports.findById(id);
  },
  update: async (id, data) => {
    const fields = [];
    const params = [];
    if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
    if (data.phone !== undefined) { fields.push('phone = ?'); params.push(data.phone); }
    if (data.profile_picture !== undefined) { fields.push('profile_picture = ?'); params.push(data.profile_picture); }
    if (data.last_message_at !== undefined) { fields.push('last_message_at = ?'); params.push(data.last_message_at); }
    if (fields.length === 0) return module.exports.findById(id);
    params.push(id);
    await dbRun(`UPDATE contacts SET ${fields.join(', ')}, updated_at = now() WHERE id = ?`, params);
    return module.exports.findById(id);
  },
  listJids: async () => {
    const rows = await dbAll('SELECT jid FROM contacts ORDER BY COALESCE(last_message_at, created_at) DESC');
    return rows.map(r => r.jid);
  }
};
