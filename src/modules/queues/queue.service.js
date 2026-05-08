class QueueService {
  constructor(repository) {
    this.repository = repository;
  }

  async findByMenuOption(option) {
    return this.repository.findByMenuOption(option);
  }
}

module.exports = QueueService;