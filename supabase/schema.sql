-- Classes
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Students
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Assignments
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  due_date date not null,
  created_at timestamptz default now()
);

-- Grades
create table if not exists grades (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  score numeric(5,2) check (score >= 0 and score <= 100),
  created_at timestamptz default now(),
  unique (assignment_id, student_id)
);

-- Indexes for common lookups
create index if not exists students_class_id_idx on students(class_id);
create index if not exists assignments_class_id_idx on assignments(class_id);
create index if not exists grades_assignment_id_idx on grades(assignment_id);
create index if not exists grades_student_id_idx on grades(student_id);
