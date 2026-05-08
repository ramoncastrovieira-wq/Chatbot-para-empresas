export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'client' | 'attendant' | 'system';
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'document' | 'system';
  timestamp: Date;
  created_at: Date;
}