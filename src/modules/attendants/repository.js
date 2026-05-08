const { dbGet, dbAll, dbRun } = require('../../shared/utils/dbAsync');

module.exports = {
  list: () => dbAll('SELECT id, name, email, role, online, created_at, updated_at FROM attendants ORDER BY name ASC'),
  findById: (id) => dbGet('SELECT id, name, email, role, online, created_at, updated_at FROM attendants WHERE id = ?', [id]),
  setOnline: async (id, online) => {
    await dbRun('UPDATE attendants SET online = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [!!online, id]);
    return module.exports.findById(id);
  }
};
