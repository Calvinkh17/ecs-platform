export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import AppNav from "@/components/AppNav";
import AnnouncementsFeed from "./AnnouncementsFeed";
import type { Announcement, AnnouncementAccess } from "@/lib/types";

export default async function AnnouncementsPage() {
  const me = await getCurrentUser();
  if (!me || me.role === "pending") redirect("/");

  const supabase = await createClient();

  const [
    { data: announcements },
    { data: users },
    { data: myAccess },
  ] = await Promise.all([
    supabase.from("announcements").select("*").order("created_at", { ascending: false }).range(0, 19),
    supabase.from("users").select("id, name, email"),
    supabase.from("announcement_access").select("*").eq("user_id", me.id).maybeSingle(),
  ]);

  const userNames: Record<string, string> = Object.fromEntries(
    (users ?? []).map((u: { id: string; name: string; email: string }) => [
      u.id,
      u.name || u.email,
    ])
  );

  const announcementsWithAuthors = ((announcements as Announcement[]) ?? []).map(a => ({
    ...a,
    author_name: userNames[a.author_id] ?? "Unknown",
  }));

  const accessRecord = myAccess as AnnouncementAccess | null;
  const accessExpired = accessRecord?.expires_at
    ? new Date(accessRecord.expires_at) <= new Date()
    : false;
  const canSend =
    me.role === "admin" ||
    me.role === "teacher" ||
    (accessRecord?.can_send === true && !accessExpired);

  return (
    <div className="min-h-screen">
      <AppNav title="Announcements" />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <AnnouncementsFeed
          initialAnnouncements={announcementsWithAuthors}
          userNames={userNames}
          canSend={canSend}
          myId={me.id}
        />
      </main>
    </div>
  );
}
