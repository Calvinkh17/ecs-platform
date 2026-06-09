export interface Class {
  id: string;
  name: string;
  created_at: string;
}

export interface SchoolStudent {
  id: string;
  name: string;
  grade_level: string;
  email: string | null;
  year_joined: number;
  graduating_year: number;
  created_at: string;
}

export interface Student {
  id: string;
  class_id: string;
  name: string;
  school_student_id: string | null;
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

export interface ParentLink {
  id: string;
  parent_id: string;
  student_id: string;
  parent_name: string;
  parent_email: string;
  student_name: string;
  created_at: string;
}
