import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import AdminTabs from "./AdminTabs";
import type { SchoolStudent } from "@/lib/types";

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") redirect("/");

  const supabase = await createClient();
  const [{ data: users }, { data: schoolStudents }] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase.from("school_students").select("*").order("name"),
  ]);

  return (
    <div className="min-h-screen">
      <AppNav title="Admin" />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <AdminTabs
          meId={me.id}
          users={users ?? []}
          schoolStudents={(schoolStudents as SchoolStudent[]) ?? []}
        />
      </main>
    </div>
  );
}
