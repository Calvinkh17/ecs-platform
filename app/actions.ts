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

export async function addSchoolStudent(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const grade_level = formData.get("grade_level") as string;
  const year_joined = formData.get("year_joined") as string;
  const email = formData.get("email") as string;
  if (!name?.trim() || !grade_level || !year_joined) {
    console.error("addSchoolStudent: missing fields", { name, grade_level, year_joined });
    return;
  }
  const { error } = await supabase.from("school_students").insert({
    name: name.trim(),
    grade_level,
    year_joined: parseInt(year_joined),
    email: email?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteSchoolStudent(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return;
  const { error } = await supabase.from("school_students").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
