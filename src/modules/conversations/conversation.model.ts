export interface Conversation {
  id: string;
  contact_id: string;
  assigned_attendant_id?: string;
  queue_id?: string;
  status: 'open' | 'pending' | 'closed';
  started_at?: Date;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}