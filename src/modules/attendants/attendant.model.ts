export interface Attendant {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'supervisor' | 'attendant';
  online: boolean;
  created_at: Date;
  updated_at: Date;
}