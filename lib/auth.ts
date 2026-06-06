import { createClient } from "@/lib/supabase/server";

export type UserRole = "pending" | "admin" | "teacher" | "parent" | "student";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
  return (data as AppUser) ?? null;
}

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case "admin":   return "/admin";
    case "teacher": return "/teacher";
    case "parent":  return "/parent";
    case "student": return "/parent";
    default:        return "/pending";
  }
}
