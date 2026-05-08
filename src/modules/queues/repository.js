const { dbGet, dbAll, dbRun } = require('../../shared/utils/dbAsync');

module.exports = {
  listActive: () => dbAll('SELECT * FROM queues WHERE active = true ORDER BY id ASC'),
  listAll: () => dbAll('SELECT * FROM queues ORDER BY id ASC'),
  findById: (id) => dbGet('SELECT * FROM queues WHERE id = ?', [id]),
  findBySlug: (slug) => dbGet('SELECT * FROM queues WHERE slug = ?', [slug]),
  findByOption: (option) => dbGet('SELECT * FROM queues WHERE menu_option = ?', [String(option)]),
  create: async ({ name, slug, description = null, menu_option = null, active = true }) => {
    const result = await dbRun(
      'INSERT INTO queues (name, slug, description, menu_option, active) VALUES (?,?,?,?,?)',
      [name, slug, description, menu_option, active]
    );
    return module.exports.findById(result.id);
  }
};
