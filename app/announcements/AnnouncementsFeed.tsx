"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { postAnnouncement } from "@/app/actions";
import { SectionLabel } from "@/components/ui/SectionLabel";

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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
          const item: AnnouncementItem = { ...raw, author_name: userNamesRef.current[raw.author_id] ?? "Unknown" };
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
    if (result?.error) { setPostError(result.error); return; }
    setTitle("");
    setBody("");
  }

  return (
    <div className="space-y-6">
      {canSend && (
        <section className="card rounded-xl p-5">
          <SectionLabel>New Announcement</SectionLabel>
          <form onSubmit={handlePost} className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
              required
              className="w-full px-3 h-9 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your announcement…"
              required
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none transition-colors"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={posting || !title.trim() || !body.trim()}
                className="px-5 h-9 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {posting ? "Posting…" : "Post Announcement"}
              </button>
              {postError && <p className="text-sm text-danger">{postError}</p>}
            </div>
          </form>
        </section>
      )}

      <section>
        <SectionLabel>Announcements ({announcements.length}{hasMore ? "+" : ""})</SectionLabel>
        {announcements.length === 0 ? (
          <div className="card text-center py-16 rounded-xl">
            <svg className="mx-auto mb-3 text-muted" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p className="text-sm font-medium text-secondary">No announcements yet</p>
            <p className="text-xs text-muted mt-1">School announcements will appear here.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="card rounded-xl p-5 hover:shadow-elevated transition-shadow duration-150">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-semibold text-primary text-base leading-snug">{a.title}</h3>
                    <span className="text-xs text-muted whitespace-nowrap flex-shrink-0 mt-0.5">
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">
                    {a.body}
                  </p>
                  <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold select-none flex-shrink-0"
                      style={{
                        background: `hsl(${(a.author_name.charCodeAt(0) * 37) % 360}deg 50% 50%)`,
                        color: "white",
                      }}
                    >
                      {a.author_name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs text-muted">{a.author_name}</p>
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-5 h-9 border border-border text-sm text-secondary font-medium rounded-md hover:bg-surface hover:border-border-strong active:scale-95 transition-all disabled:opacity-40"
                >
                  {loadingMore ? "Loading…" : "Load more announcements"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
