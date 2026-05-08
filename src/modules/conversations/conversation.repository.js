const db = require('../../config/database');

module.exports = {
  async findOpenConversation(contactId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM conversations
         WHERE contact_id = ?
         AND status IN ('pending', 'open')
         ORDER BY id DESC
         LIMIT 1`,
        [contactId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  },

  async create(data) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO conversations
         (contact_id, status, started_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [data.contact_id, data.status],
        function(err) {
          if (err) return reject(err);

          resolve({
            id: this.lastID,
            ...data
          });
        }
      );
    });
  },

  async assignQueue(conversationId, queueId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE conversations
         SET queue_id = ?
         WHERE id = ?`,
        [queueId, conversationId],
        err => {
          if (err) return reject(err);
          resolve(true);
        }
      );
    });
  },

  async assignAttendant(conversationId, attendantId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE conversations
         SET assigned_attendant_id = ?,
             status = 'open'
         WHERE id = ?`,
        [attendantId, conversationId],
        err => {
          if (err) return reject(err);
          resolve(true);
        }
      );
    });
  }
};