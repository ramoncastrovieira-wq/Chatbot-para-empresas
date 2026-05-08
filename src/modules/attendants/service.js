const repository = require('./repository');

module.exports = {
  list: repository.list,
  findById: repository.findById,
  setOnline: repository.setOnline
};
