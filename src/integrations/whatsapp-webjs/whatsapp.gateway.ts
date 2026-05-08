export class WhatsAppGateway {
  public async initialize() {
    console.log('WhatsApp Gateway initialized');
  }

  public async sendMessage(to: string, content: string) {
    console.log(`Sending message to ${to}: ${content}`);
  }
}