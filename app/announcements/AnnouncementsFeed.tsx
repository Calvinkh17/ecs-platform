"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { postAnnouncement } from "@/app/actions";

const PAGE_SIZE = 20;

interface AnnouncementItem {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  created_at: string;
}

interface Props {
  initialAnnouncements: AnnouncementItem[];
  userNames: Record<string, string>;
  canSend: boolean;
  myId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function AnnouncementsFeed({ initialAnnouncements, userNames, canSend, myId }: Props) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [hasMore, setHasMore] = useState(initialAnnouncements.length === PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const userNamesRef = useRef(userNames);

  useEffect(() => {
    if (!myId) return;
    const supabase = createClient();

    async function markRead(ids: string[]) {
      if (ids.length === 0) return;
      await supabase.from("read_announcements").upsert(
        ids.map(id => ({ user_id: myId, announcement_id: id })),
        { onConflict: "user_id,announcement_id", ignoreDuplicates: true }
      );
    }

    if (initialAnnouncements.length > 0) {
      markRead(initialAnnouncements.map(a => a.id));
    }

    const channel = supabase
      .channel("announcements-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload) => {
          const raw = payload.new as { id: string; author_id: string; title: string; body: string; created_at: string };
          const item: AnnouncementItem = {
            ...raw,
            author_name: userNamesRef.current[raw.author_id] ?? "Unknown",
          };
          setAnnouncements(prev => {
            if (prev.some(a => a.id === item.id)) return prev;
            return [item, ...prev];
          });
          markRead([item.id]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myId]);

  async function loadMore() {
    const cursor = announcements[announcements.length - 1]?.created_at;
    if (!cursor) return;
    setLoadingMore(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .lt("created_at", cursor)
      .limit(PAGE_SIZE);
    const items: AnnouncementItem[] = (data ?? []).map((a: { id: string; author_id: string; title: string; body: string; created_at: string }) => ({
      ...a,
      author_name: userNamesRef.current[a.author_id] ?? "Unknown",
    }));
    setAnnouncements(prev => [...prev, ...items]);
    setHasMore(items.length === PAGE_SIZE);
    if (items.length > 0) {
      supabase.from("read_announcements").upsert(
        items.map(a => ({ user_id: myId, announcement_id: a.id })),
        { onConflict: "user_id,announcement_id", ignoreDuplicates: true }
      );
    }
    setLoadingMore(false);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setPostError("");
    const fd = new FormData();
    fd.append("title", title);
    fd.append("body", body);
    const result = await postAnnouncement(fd);
    setPosting(false);
    if (result?.error) {
      setPostError(result.error);
      return;
    }
    setTitle("");
    setBody("");
  }

  return (
    <div className="space-y-6">
      {canSend && (
        <section className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            New Announcement
          </h2>
          <form onSubmit={handlePost} className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your announcement…"
              required
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={posting || !title.trim() || !body.trim()}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {posting ? "Posting…" : "Post"}
              </button>
              {postError && <p className="text-sm text-red-500">{postError}</p>}
            </div>
          </form>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          Announcements ({announcements.length}{hasMore ? "+" : ""})
        </h2>
        {announcements.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
            No announcements yet.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-gray-900 text-base">{a.title}</h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {a.body}
                  </p>
                  <p className="mt-3 text-xs text-gray-400">Posted by {a.author_name}</p>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-5 py-2 border border-gray-200 text-sm text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
