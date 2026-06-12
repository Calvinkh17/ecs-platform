import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import AdminTabs from "./AdminTabs";
import type { SchoolStudent, ParentLink, Observation, ObservationResponse, AnnouncementAccess, ChatChannel, ChannelMember, Class, Teacher, DisciplineRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    { data: announcementAccess },
    { data: chatChannels },
    { data: rawChannelMembers },
    { data: allClasses },
    { data: teachers },
    { data: rawDiscipline },
  ] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase.from("school_students").select("*").order("name"),
    supabase.from("parent_students").select("id, parent_id, student_id, created_at").order("created_at", { ascending: false }),
    supabase.from("observations").select("*").order("created_at", { ascending: false }),
    supabase.from("observation_responses").select("*"),
    supabase.from("announcement_access").select("*").order("created_at", { ascending: false }),
    supabase.from("chat_channels").select("*").order("name"),
    supabase.from("channel_members").select("*").order("joined_at"),
    supabase.from("classes").select("*").order("name"),
    supabase.from("teachers").select("*").order("name"),
    supabase.from("discipline_records").select("*").order("created_at", { ascending: false }),
  ]);

  const parentLinks: ParentLink[] = (rawLinks ?? []).map((link) => ({
    ...link,
    parent_name: users?.find((u) => u.id === link.parent_id)?.name ?? "Unknown",
    parent_email: users?.find((u) => u.id === link.parent_id)?.email ?? "",
    student_name: (schoolStudents as SchoolStudent[])?.find((s) => s.id === link.student_id)?.name ?? "Unknown",
  }));

  const channelMembersWithNames = ((rawChannelMembers as ChannelMember[]) ?? []).map((m) => ({
    ...m,
    user_name: users?.find((u) => u.id === m.user_id)?.name ?? "Unknown",
    user_email: users?.find((u) => u.id === m.user_id)?.email ?? "",
  }));

  const studentMap = Object.fromEntries(
    ((schoolStudents as SchoolStudent[]) ?? []).map((s) => [s.id, s.name])
  );
  const userMap = Object.fromEntries(
    (users ?? []).map((u) => [u.id, u.name || u.email])
  );
  const enrichedDiscipline = ((rawDiscipline as DisciplineRecord[]) ?? []).map((r) => ({
    ...r,
    student_name: r.student_id ? studentMap[r.student_id] : undefined,
    reporter_name: r.reported_by ? userMap[r.reported_by] : undefined,
    handler_name: r.handled_by ? userMap[r.handled_by] : undefined,
  }));

  return (
    <AppNav title="Admin Panel">
      <main className="max-w-5xl mx-auto px-6 py-8">
        <AdminTabs
          meId={me.id}
          users={users ?? []}
          schoolStudents={(schoolStudents as SchoolStudent[]) ?? []}
          initialParentLinks={parentLinks}
          initialObservations={(observations as Observation[]) ?? []}
          initialResponses={(observationResponses as ObservationResponse[]) ?? []}
          initialAnnouncementAccess={(announcementAccess as AnnouncementAccess[]) ?? []}
          initialChannels={(chatChannels as ChatChannel[]) ?? []}
          initialChannelMembers={channelMembersWithNames}
          initialClasses={(allClasses as Class[]) ?? []}
          initialTeachers={(teachers as Teacher[]) ?? []}
          initialDisciplineRecords={enrichedDiscipline}
          studentMap={studentMap}
        />
      </main>
    </AppNav>
  );
}
