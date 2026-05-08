class ConversationService {
  constructor(repository) {
    this.repository = repository;
  }

  async findOrCreateOpenConversation(contactId) {
    const existing =
      await this.repository.findOpenConversation(contactId);

    if (existing) {
      return existing;
    }

    return this.repository.create({
      contact_id: contactId,
      status: 'pending'
    });
  }

  async assignQueue(conversationId, queueId) {
    return this.repository.assignQueue(conversationId, queueId);
  }

  async assignAttendant(conversationId, attendantId) {
    return this.repository.assignAttendant(
      conversationId,
      attendantId
    );
  }
}

module.exports = ConversationService;