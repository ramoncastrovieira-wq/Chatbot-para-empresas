const db = require('../../config/database');

module.exports = {
  async findByMenuOption(option) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM queues
         WHERE menu_option = ?
         LIMIT 1`,
        [String(option)],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  }
};