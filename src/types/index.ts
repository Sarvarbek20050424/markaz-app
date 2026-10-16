export interface Group {
  id: number;
  name: string;
  teacher_id: string;
  created_at: string;
  profiles?: { full_name: string };
}

export interface Student {
  id: number;
  full_name: string;
  group_id: number;
  is_active: boolean;
  created_at: string;
  groups?: { name: string };
}