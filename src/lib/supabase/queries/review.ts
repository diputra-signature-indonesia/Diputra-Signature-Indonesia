export type ReviewPost = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'Shown' | 'Hidden';
  created_at: string;
  updated_at: string;
};
