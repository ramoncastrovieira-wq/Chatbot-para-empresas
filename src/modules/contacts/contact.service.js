class ContactService {
  constructor(repository) {
    this.repository = repository;
  }

  async findOrCreate(data) {
    const existing = await this.repository.findByJid(data.jid);

    if (existing) {
      return existing;
    }

    return this.repository.create(data);
  }
}

module.exports = ContactService;