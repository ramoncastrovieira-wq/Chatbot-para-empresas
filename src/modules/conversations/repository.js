const { dbGet, dbAll, dbRun } = require('../../shared/utils/dbAsync');

module.exports = {
  findById: (id) => dbGet(`
    SELECT c.*, ct.jid, ct.name AS contact_name, ct.phone, q.name AS queue_name, a.name AS attendant_name
    FROM conversations c
    LEFT JOIN contacts ct ON ct.id = c.contact_id
    LEFT JOIN queues q ON q.id = c.queue_id
    LEFT JOIN attendants a ON a.id = c.assigned_attendant_id
    WHERE c.id = ?
  `, [id]),

  findOpenByContactId: (contactId) => dbGet(
    "SELECT * FROM conversations WHERE contact_id = ? AND status IN ('open', 'pending') ORDER BY created_at DESC LIMIT 1",
    [contactId]
  ),

  list: ({ status = null, queue_id = null } = {}) => {
    const where = [];
    const params = [];
    if (status) { where.push('c.status = ?'); params.push(status); }
    if (queue_id) { where.push('c.queue_id = ?'); params.push(queue_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    return dbAll(`
      SELECT c.*, ct.jid, ct.name AS contact_name, ct.phone, q.name AS queue_name, a.name AS attendant_name,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY COALESCE(m.timestamp, EXTRACT(EPOCH FROM m.created_at) * 1000) DESC LIMIT 1) AS last_message
      FROM conversations c
      LEFT JOIN contacts ct ON ct.id = c.contact_id
      LEFT JOIN queues q ON q.id = c.queue_id
      LEFT JOIN attendants a ON a.id = c.assigned_attendant_id
      ${whereSql}
      ORDER BY c.updated_at DESC, c.created_at DESC
    `, params);
  },

  create: async ({ contact_id, assigned_attendant_id = null, queue_id = null, status = 'pending', started_at = new Date() }) => {
    const result = await dbRun(
      'INSERT INTO conversations (contact_id, assigned_attendant_id, queue_id, status, started_at) VALUES (?,?,?,?,?)',
      [contact_id, assigned_attendant_id, queue_id, status, started_at]
    );
    return module.exports.findById(result.id);
  },

  update: async (id, data) => {
    const fields = [];
    const params = [];
    const allowed = ['assigned_attendant_id', 'queue_id', 'status', 'closed_at', 'started_at'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
    if (!fields.length) return module.exports.findById(id);
    params.push(id);
    await dbRun(`UPDATE conversations SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    return module.exports.findById(id);
  }
};
