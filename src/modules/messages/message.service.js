class MessageService {
  constructor({
    contactService,
    conversationService,
    queueService,
    messageRepository,
    whatsappService,
    websocket
  }) {
    this.contactService = contactService;
    this.conversationService = conversationService;
    this.queueService = queueService;
    this.messageRepository = messageRepository;
    this.whatsappService = whatsappService;
    this.websocket = websocket;
  }

  async processIncomingMessage(payload) {
    const body = (payload.body || '').trim();

    const contact = await this.contactService.findOrCreate({
      jid: payload.from,
      name: payload.notifyName || payload.pushname || 'Cliente'
    });

    const conversation =
      await this.conversationService.findOrCreateOpenConversation(contact.id);

    await this.messageRepository.create({
      conversation_id: conversation.id,
      sender_type: 'client',
      content: body,
      message_type: 'text',
      timestamp: Date.now()
    });

    if (!conversation.queue_id) {
      const queue = await this.queueService.findByMenuOption(body);

      if (queue) {
        await this.conversationService.assignQueue(
          conversation.id,
          queue.id
        );

        await this.whatsappService.sendMessage(
          payload.from,
          `Seu atendimento foi direcionado para ${queue.name}.`
        );

        this.websocket.emit('conversation:update', {
          conversationId: conversation.id,
          queueId: queue.id
        });

        return;
      }

      await this.whatsappService.sendMessage(
        payload.from,
`Olá 👋
Bem-vindo à Tico Auto Peças.

Selecione a unidade desejada:

1️⃣ Várzea Paulista (Centro)
2️⃣ Várzea Paulista (Jd. América)
3️⃣ Francisco Morato
4️⃣ Taipas`
      );

      return;
    }

    this.websocket.emit('message:new', {
      conversationId: conversation.id,
      body
    });
  }
}

module.exports = MessageService;