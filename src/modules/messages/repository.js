const { dbGet, dbAll, dbRun } = require('../../shared/utils/dbAsync');

module.exports = {
  findById: (id) => dbGet('SELECT * FROM messages WHERE id = ?', [id]),

  listByConversation: (conversationId) => dbAll(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY COALESCE(timestamp, EXTRACT(EPOCH FROM created_at) * 1000) ASC, id ASC',
    [conversationId]
  ),

  listByJid: (jid) => dbAll(`
    SELECT * FROM messages
    WHERE from_jid = ? OR to_jid = ?
    ORDER BY COALESCE(timestamp, EXTRACT(EPOCH FROM created_at) * 1000) ASC, id ASC
  `, [jid, jid]),

  create: async ({
    conversation_id,
    sender_type,
    sender_id = null,
    content,
    message_type = 'text',
    timestamp = Date.now(),
    from_jid = null,
    to_jid = null,
    direction = 'in'
  }) => {
    const result = await dbRun(`
      INSERT INTO messages
      (conversation_id, sender_type, sender_id, content, body, message_type, timestamp, from_jid, to_jid, direction)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `, [conversation_id, sender_type, sender_id, content, content, message_type, timestamp, from_jid, to_jid, direction]);
    return module.exports.findById(result.id);
  }
};
