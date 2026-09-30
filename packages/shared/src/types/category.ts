export interface Category {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}
