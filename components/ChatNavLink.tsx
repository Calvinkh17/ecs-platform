"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ChatNavLink({ userId }: { userId: string }) {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();
  const onPage = pathname?.startsWith("/chat");

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    async function fetchCount() {
      const { data } = await supabase.rpc("get_unread_mention_count");
      setUnread(data ?? 0);
    }

    fetchCount();

    const channel = supabase
      .channel("chat-mention-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_mentions" }, fetchCount)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "channel_members" }, fetchCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <Link
      href="/chat"
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
    >
      Chat
      {!onPage && unread > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
