import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import AdminTabs from "./AdminTabs";
import type { SchoolStudent, ParentLink, Observation, ObservationResponse } from "@/lib/types";

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") redirect("/");

  const supabase = await createClient();
  const [
    { data: users },
    { data: schoolStudents },
    { data: rawLinks },
    { data: observations },
    { data: observationResponses },
  ] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase.from("school_students").select("*").order("name"),
    supabase.from("parent_students").select("id, parent_id, student_id, created_at").order("created_at", { ascending: false }),
    supabase.from("observations").select("*").order("created_at", { ascending: false }),
    supabase.from("observation_responses").select("*"),
  ]);

  const parentLinks: ParentLink[] = (rawLinks ?? []).map((link) => ({
    ...link,
    parent_name: users?.find((u) => u.id === link.parent_id)?.name ?? "Unknown",
    parent_email: users?.find((u) => u.id === link.parent_id)?.email ?? "",
    student_name: (schoolStudents as SchoolStudent[])?.find((s) => s.id === link.student_id)?.name ?? "Unknown",
  }));

  return (
    <div className="min-h-screen">
      <AppNav title="Admin" />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <AdminTabs
          meId={me.id}
          users={users ?? []}
          schoolStudents={(schoolStudents as SchoolStudent[]) ?? []}
          initialParentLinks={parentLinks}
          initialObservations={(observations as Observation[]) ?? []}
          initialResponses={(observationResponses as ObservationResponse[]) ?? []}
        />
      </main>
    </div>
  );
}
