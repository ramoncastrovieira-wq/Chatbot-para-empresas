const db = require('../../config/database');

function dbGet(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))); }
function dbAll(sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))); }
function dbRun(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function (err) { if (err) return reject(err); return resolve(this.lastID || null); })); }

module.exports = {
  findById: async (id) => dbGet('SELECT * FROM conversations WHERE id = ?', [id]),
  findOpenByContactId: async (contactId) => dbGet("SELECT * FROM conversations WHERE contact_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1", [contactId]),
  create: async ({ contact_id, assigned_attendant_id = null, queue_id = null, status = 'open', started_at = null }) => {
    const id = await dbRun('INSERT INTO conversations (contact_id, assigned_attendant_id, queue_id, status, started_at) VALUES (?,?,?,?,?)', [contact_id, assigned_attendant_id, queue_id, status, started_at]);
    return module.exports.findById(id);
  },
  update: async (id, data) => {
    const fields = [];
    const params = [];
    if (data.assigned_attendant_id !== undefined) { fields.push('assigned_attendant_id = ?'); params.push(data.assigned_attendant_id); }
    if (data.queue_id !== undefined) { fields.push('queue_id = ?'); params.push(data.queue_id); }
    if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
    if (data.closed_at !== undefined) { fields.push('closed_at = ?'); params.push(data.closed_at); }
    if (fields.length === 0) return module.exports.findById(id);
    params.push(id);
    await dbRun(`UPDATE conversations SET ${fields.join(', ')}, updated_at = now() WHERE id = ?`, params);
    return module.exports.findById(id);
  }
};
