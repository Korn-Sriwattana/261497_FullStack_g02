export interface TodoItem {
  id: string;
  todoText: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate?: string | null;
  tagId?: string | null;       // tagId อาจจะไม่มีหรือเป็น null ก็ได้
  tagName?: string | null;     // ชื่อ tag (optional)
}

export interface TagItem {
  id: string;
  name: string;
}
export interface TagOption {
  label: string;
  value: string;
}