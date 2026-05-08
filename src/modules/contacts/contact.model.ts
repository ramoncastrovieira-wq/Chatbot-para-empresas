export interface Contact {
  id: string;
  name: string;
  phone: string;
  profile_picture?: string;
  last_message_at?: Date;
  created_at: Date;
  updated_at: Date;
}