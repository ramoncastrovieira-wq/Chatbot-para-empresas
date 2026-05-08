const db = require('../../config/database');

function dbGet(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))); }
function dbAll(sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))); }
function dbRun(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function (err) { if (err) return reject(err); return resolve(this.lastID || null); })); }

module.exports = {
  findById: async (id) => dbGet('SELECT * FROM messages WHERE id = ?', [id]),
  listByConversation: async (conversationId) => dbAll('SELECT * FROM messages WHERE conversation_id = ? ORDER BY COALESCE(timestamp, created_at) ASC', [conversationId]),
  create: async ({ conversation_id, sender_type, sender_id = null, content, message_type = 'text', timestamp = Date.now(), from_jid = null, to_jid = null, direction = 'in' }) => {
    const id = await dbRun('INSERT INTO messages (conversation_id, sender_type, sender_id, content, message_type, timestamp, from_jid, to_jid, direction) VALUES (?,?,?,?,?,?,?,?,?)', [conversation_id, sender_type, sender_id, content, message_type, timestamp, from_jid, to_jid, direction]);
    return module.exports.findById(id);
  }
};
