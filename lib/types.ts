export interface Class {
  id: string;
  name: string;
  created_at: string;
}

export interface Student {
  id: string;
  class_id: string;
  name: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  name: string;
  due_date: string;
  created_at: string;
}

export interface Grade {
  id: string;
  assignment_id: string;
  student_id: string;
  score: number | null;
  created_at: string;
}
