export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import AppNav from "@/components/AppNav";
import ChatLayout from "./ChatLayout";
import type { ChatChannel } from "@/lib/types";

export default async function ChatPage() {
  const me = await getCurrentUser();
  if (!me || !["admin", "teacher"].includes(me.role)) redirect("/");

  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("channel_members")
    .select("channel_id")
    .eq("user_id", me.id);

  const channelIds = (memberships ?? []).map((m) => m.channel_id);

  const [{ data: channels }, { data: staffUsers }] = await Promise.all([
    channelIds.length > 0
      ? supabase.from("chat_channels").select("*").in("id", channelIds).order("name")
      : Promise.resolve({ data: [] }),
    supabase.from("users").select("id, name, email, role").in("role", ["admin", "teacher"]),
  ]);

  return (
    <AppNav title="Staff Chat" fullHeight>
      <div className="flex-1 overflow-hidden">
        <ChatLayout
          channels={(channels as ChatChannel[]) ?? []}
          staffUsers={(staffUsers ?? []).map((u) => ({
            id: u.id,
            name: (u.name || u.email) as string,
            email: u.email as string,
            role: u.role as string,
          }))}
          myId={me.id}
          myName={(me.name || me.email) as string}
        />
      </div>
    </AppNav>
  );
}
