"use server";

import { createClient } from "@/lib/supabase/server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function assignRole(formData: FormData) {
  const supabase = await createClient();
  const user_id = formData.get("user_id") as string;
  const role = formData.get("role") as string;
  if (!user_id || !role) return;
  await supabase.from("users").update({ role }).eq("id", user_id);
  refresh();
}

export async function createClass(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = formData.get("name") as string;
  if (!name?.trim()) return;
  await supabase.from("classes").insert({ name: name.trim(), teacher_id: user.id });
  refresh();
}

export async function addStudent(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const class_id = formData.get("class_id") as string;
  const school_student_id = formData.get("school_student_id") as string | null;
  if (!name?.trim() || !class_id) return;
  await supabase.from("students").insert({
    name: name.trim(),
    class_id,
    school_student_id: school_student_id || null,
  });
  refresh();
}

export async function addSchoolStudent(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const grade_level = formData.get("grade_level") as string;
  const year_joined = formData.get("year_joined") as string;
  const email = formData.get("email") as string;
  const graduating_year = formData.get("graduating_year") as string;
  if (!name?.trim() || !grade_level || !year_joined || !graduating_year?.trim()) {
    return { error: "Name, grade, year joined, and graduating year are all required." };
  }
  const { error } = await supabase.from("school_students").insert({
    name: name.trim(),
    grade_level,
    year_joined: parseInt(year_joined),
    email: email?.trim() || null,
    graduating_year: parseInt(graduating_year),
  });
  if (error) return { error: error.message };
  return {};
}

export async function updateSchoolStudent(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const grade_level = formData.get("grade_level") as string;
  const year_joined = formData.get("year_joined") as string;
  const email = formData.get("email") as string;
  const graduating_year = formData.get("graduating_year") as string;
  if (!id || !name?.trim() || !grade_level || !year_joined || !graduating_year?.trim()) return { error: "Missing required fields." };
  const { error } = await supabase
    .from("school_students")
    .update({
      name: name.trim(),
      grade_level,
      year_joined: parseInt(year_joined),
      email: email?.trim() || null,
      graduating_year: parseInt(graduating_year),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteSchoolStudent(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return;
  const { error } = await supabase.from("school_students").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function linkParentStudent(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const parent_id = formData.get("parent_id") as string;
  const student_id = formData.get("student_id") as string;
  if (!parent_id || !student_id) return { error: "Select both a parent and a student." };
  const { error } = await supabase.from("parent_students").insert({ parent_id, student_id });
  if (error) return { error: error.message };
  return {};
}

export async function unlinkParentStudent(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing ID." };
  const { error } = await supabase.from("parent_students").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function createObservation(formData: FormData): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const teacher_id = formData.get("teacher_id") as string;
  const observation_number = formData.get("observation_number") as string;
  const date = formData.get("date") as string;
  if (!teacher_id || !observation_number || !date) return { error: "Missing required fields." };
  const { data: obs, error } = await supabase
    .from("observations")
    .insert({ teacher_id, observer_id: user.id, observation_number: parseInt(observation_number), date })
    .select()
    .single();
  if (error) return { error: error.message };
  return { id: obs.id };
}

export async function deleteObservation(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing ID." };
  const { error } = await supabase.from("observations").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function saveObservation(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const observation_id = formData.get("observation_id") as string;
  const notes = formData.get("notes") as string;
  const responsesJson = formData.get("responses") as string;
  if (!observation_id) return { error: "Missing observation ID." };
  const { error: notesError } = await supabase
    .from("observations")
    .update({ notes: notes?.trim() || null })
    .eq("id", observation_id);
  if (notesError) return { error: notesError.message };
  const responses: { point_key: string; status: string }[] = JSON.parse(responsesJson || "[]");
  if (responses.length > 0) {
    const { error: respError } = await supabase
      .from("observation_responses")
      .upsert(
        responses.map(r => ({ observation_id, point_key: r.point_key, status: r.status })),
        { onConflict: "observation_id,point_key" }
      );
    if (respError) return { error: respError.message };
  }
  return {};
}

export async function postAnnouncement(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  if (!title?.trim() || !body?.trim()) return { error: "Title and body are required." };
  const { error } = await supabase.from("announcements").insert({
    author_id: user.id,
    title: title.trim(),
    body: body.trim(),
  });
  if (error) return { error: error.message };
  return {};
}

export async function grantAnnouncementAccess(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user_id = formData.get("user_id") as string;
  const expires_at = formData.get("expires_at") as string;
  if (!user_id) return { error: "Select a user." };
  const { error } = await supabase.from("announcement_access").upsert(
    { user_id, expires_at: expires_at?.trim() || null, can_send: true },
    { onConflict: "user_id" }
  );
  if (error) return { error: error.message };
  return {};
}

export async function createChannel(formData: FormData): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  if (!name?.trim()) return { error: "Channel name is required." };
  const { data: channel, error } = await supabase
    .from("chat_channels")
    .insert({ name: name.trim(), description: description?.trim() || null, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await supabase.from("channel_members").insert({ channel_id: channel.id, user_id: user.id });
  return { id: channel.id };
}

export async function deleteChannel(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing ID." };
  const { error } = await supabase.from("chat_channels").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function addChannelMember(formData: FormData): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const channel_id = formData.get("channel_id") as string;
  const user_id = formData.get("user_id") as string;
  if (!channel_id || !user_id) return { error: "Missing required fields." };
  const { data, error } = await supabase
    .from("channel_members")
    .insert({ channel_id, user_id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return {}; // already a member, not an error
    return { error: error.message };
  }
  return { id: data.id };
}

export async function removeChannelMember(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing ID." };
  const { error } = await supabase.from("channel_members").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function revokeAnnouncementAccess(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing ID." };
  const { error } = await supabase.from("announcement_access").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function addAssignment(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const due_date = formData.get("due_date") as string;
  const class_id = formData.get("class_id") as string;
  if (!name?.trim() || !due_date || !class_id) return;
  await supabase.from("assignments").insert({ name: name.trim(), due_date, class_id });
  refresh();
}

export async function upsertGrade(formData: FormData) {
  const supabase = await createClient();
  const assignment_id = formData.get("assignment_id") as string;
  const student_id = formData.get("student_id") as string;
  const scoreRaw = formData.get("score") as string;
  if (!assignment_id || !student_id) return;
  const score = scoreRaw === "" ? null : Math.min(100, Math.max(0, Number(scoreRaw)));
  await supabase
    .from("grades")
    .upsert({ assignment_id, student_id, score }, { onConflict: "assignment_id,student_id" });
  refresh();
}

export async function reassignClass(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const teacher_id = formData.get("teacher_id") as string;
  if (!id) return { error: "Missing class ID." };
  const { error } = await supabase
    .from("classes")
    .update({ teacher_id: teacher_id || null })
    .eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteClass(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return;
  await supabase.from("classes").delete().eq("id", id);
  refresh();
}

export async function deleteStudent(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return;
  await supabase.from("students").delete().eq("id", id);
  refresh();
}

export async function deleteAssignment(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return;
  await supabase.from("assignments").delete().eq("id", id);
  refresh();
}
