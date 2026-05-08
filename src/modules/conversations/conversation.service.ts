export class ConversationService {
  async findOrCreateConversation(contactId: string) {
    return {
      contactId,
      status: 'open'
    };
  }
}