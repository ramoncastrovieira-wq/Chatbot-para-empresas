export interface Queue {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: Date;
}