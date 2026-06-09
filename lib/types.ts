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

export interface Observation {
  id: string;
  teacher_id: string;
  observer_id: string;
  observation_number: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface ObservationResponse {
  id: string;
  observation_id: string;
  point_key: string;
  status: "observed" | "not_observed" | "na";
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

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface AnnouncementAccess {
  id: string;
  user_id: string;
  expires_at: string | null;
  can_send: boolean;
  created_at: string;
}

export interface ReadAnnouncement {
  id: string;
  user_id: string;
  announcement_id: string;
  read_at: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
}
