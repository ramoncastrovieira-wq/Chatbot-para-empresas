const db = require('../../config/database');

module.exports = {
  async findByJid(jid) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM contacts
         WHERE jid = ?
         LIMIT 1`,
        [jid],
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
        `INSERT INTO contacts
         (jid, name)
         VALUES (?, ?)`,
        [data.jid, data.name],
        function(err) {
          if (err) return reject(err);

          resolve({
            id: this.lastID,
            ...data
          });
        }
      );
    });
  }
};