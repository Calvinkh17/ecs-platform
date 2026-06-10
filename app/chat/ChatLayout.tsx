"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatChannel } from "@/lib/types";

interface StaffUser { id: string; name: string; email: string; role: string; }
interface Member { memberId: string; userId: string; name: string; }
interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  mentionedIds: string[];
}

interface Props {
  channels: ChatChannel[];
  staffUsers: StaffUser[];
  myId: string;
  myName: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return time;
  if (now.getTime() - d.getTime() < 7 * 86400000)
    return d.toLocaleDateString("en-US", { weekday: "short" }) + " " + time;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + time;
}

function renderBody(body: string, isMe: boolean): React.ReactNode {
  const segments = body.split(/(@\S+)/g);
  return segments.map((seg, i) =>
    seg.startsWith("@") ? (
      <span key={i} className={`font-semibold ${isMe ? "text-white/70" : "text-accent"}`}>
        {seg}
      </span>
    ) : seg
  );
}

export default function ChatLayout({ channels, staffUsers, myId, myName }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const nameMap = useMemo(
    () => Object.fromEntries(staffUsers.map((u) => [u.id, u.name])),
    [staffUsers]
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [mentionMap, setMentionMap] = useState<Record<string, string>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const realtimeChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const scrolledUpRef = useRef(false);
  const msgContainerRef = useRef<HTMLDivElement>(null);

  const activeChannel = channels.find((c) => c.id === activeId) ?? null;

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m) => m.userId !== myId && m.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, members, myId]);

  const loadChannel = useCallback(
    async (channelId: string) => {
      setLoadingMsgs(true);
      setMessages([]);
      setMembers([]);
      scrolledUpRef.current = false;

      if (realtimeChanRef.current) {
        supabase.removeChannel(realtimeChanRef.current);
        realtimeChanRef.current = null;
      }

      const [{ data: msgData }, { data: memberData }] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("*")
          .eq("channel_id", channelId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("channel_members")
          .select("id, user_id")
          .eq("channel_id", channelId),
      ]);

      const msgIds = (msgData ?? []).map((m) => m.id);
      const { data: mentionData } =
        msgIds.length > 0
          ? await supabase
              .from("message_mentions")
              .select("message_id, mentioned_user_id")
              .in("message_id", msgIds)
          : { data: [] };

      const built: Message[] = [...(msgData ?? [])]
        .reverse()
        .map((m) => ({
          id: m.id,
          channel_id: m.channel_id,
          author_id: m.author_id,
          author_name: nameMap[m.author_id] ?? "Unknown",
          body: m.body,
          created_at: m.created_at,
          mentionedIds: (mentionData ?? [])
            .filter((mn) => mn.message_id === m.id)
            .map((mn) => mn.mentioned_user_id),
        }));

      const builtMembers: Member[] = (memberData ?? []).map((m) => ({
        memberId: m.id,
        userId: m.user_id,
        name: nameMap[m.user_id] ?? "Unknown",
      }));

      setMessages(built);
      setMembers(builtMembers);
      setLoadingMsgs(false);

      supabase
        .from("channel_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("channel_id", channelId)
        .eq("user_id", myId)
        .then();

      const rt = supabase
        .channel(`chat-${channelId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
          async (payload) => {
            const raw = payload.new as { id: string; channel_id: string; author_id: string; body: string; created_at: string };
            const { data: newMentions } = await supabase
              .from("message_mentions")
              .select("mentioned_user_id")
              .eq("message_id", raw.id);
            const newMsg: Message = {
              ...raw,
              author_name: nameMap[raw.author_id] ?? "Unknown",
              mentionedIds: (newMentions ?? []).map((m) => m.mentioned_user_id),
            };
            setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
            supabase
              .from("channel_members")
              .update({ last_read_at: new Date().toISOString() })
              .eq("channel_id", channelId)
              .eq("user_id", myId)
              .then();
          }
        )
        .subscribe();
      realtimeChanRef.current = rt;
    },
    [supabase, nameMap, myId]
  );

  function selectChannel(id: string) {
    setActiveId(id);
    setShowSidebar(false);
    setText("");
    setMentionQuery(null);
    setMentionMap({});
    loadChannel(id);
  }

  useEffect(() => {
    return () => {
      if (realtimeChanRef.current) supabase.removeChannel(realtimeChanRef.current);
    };
  }, [supabase]);

  useEffect(() => {
    if (!loadingMsgs && messages.length > 0 && !scrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, loadingMsgs]);

  useEffect(() => {
    if (!loadingMsgs && messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
        scrolledUpRef.current = false;
      }, 50);
    }
  }, [loadingMsgs]);

  function handleScroll() {
    const el = msgContainerRef.current;
    if (!el) return;
    scrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    if (atIdx !== -1) {
      const query = before.slice(atIdx + 1);
      if (!query.includes(" ") && !query.includes("\n")) {
        setMentionStart(atIdx);
        setMentionQuery(query);
        setMentionIdx(0);
        return;
      }
    }
    setMentionQuery(null);
  }

  function selectMention(member: Member) {
    const firstName = member.name.split(" ")[0];
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const after = text.slice(cursor);
    const newText = text.slice(0, mentionStart) + `@${firstName} ` + after;
    setText(newText);
    setMentionMap((prev) => ({ ...prev, [firstName]: member.userId }));
    setMentionQuery(null);
    setTimeout(() => {
      if (inputRef.current) {
        const pos = mentionStart + firstName.length + 2;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((i) => Math.min(i + 1, mentionSuggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectMention(mentionSuggestions[mentionIdx]); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleSend() {
    if (!text.trim() || !activeId || sending) return;
    setSending(true);
    const body = text.trim();

    const mentionedIds = new Set<string>();
    const matches = body.match(/@(\w+)/g) ?? [];
    for (const match of matches) {
      const name = match.slice(1);
      if (mentionMap[name]) mentionedIds.add(mentionMap[name]);
    }

    const { data: msg, error } = await supabase
      .from("chat_messages")
      .insert({ channel_id: activeId, author_id: myId, body })
      .select("id")
      .single();

    if (!error && msg && mentionedIds.size > 0) {
      await supabase.from("message_mentions").insert(
        [...mentionedIds].map((uid) => ({ message_id: msg.id, mentioned_user_id: uid }))
      );
    }

    setSending(false);
    if (!error) {
      setText("");
      setMentionMap({});
      setMentionQuery(null);
      scrolledUpRef.current = false;
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="h-full flex">
      {/* ── Channel sidebar ── */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex w-full md:w-64 lg:w-72 flex-shrink-0 flex-col bg-surface-raised border-r border-border`}>
        <div className="px-4 py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted">Channels</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {channels.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted italic">No channels yet.</p>
          ) : (
            channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => selectChannel(ch.id)}
                className={`w-full text-left px-3 py-2 mx-1 rounded-md flex items-center gap-2 text-sm transition-all ${
                  activeId === ch.id
                    ? "bg-accent text-white"
                    : "text-secondary hover:bg-surface hover:text-primary"
                }`}
              >
                <span className={`font-mono text-base leading-none ${activeId === ch.id ? "text-white/60" : "text-muted"}`}>#</span>
                <span className="truncate font-medium">{ch.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Message area ── */}
      <div className={`${!showSidebar ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0 bg-background`}>
        {!activeChannel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted gap-3">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border-strong">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm font-medium">
              {channels.length === 0 ? "You are not a member of any channels yet." : "Select a channel to start chatting."}
            </p>
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-surface-raised border-b border-border flex-shrink-0">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden text-muted hover:text-secondary mr-1"
                aria-label="Back to channels"
              >
                ←
              </button>
              <div className="text-muted font-medium">#</div>
              <div>
                <p className="font-semibold text-primary text-sm">{activeChannel.name}</p>
                {activeChannel.description && (
                  <p className="text-xs text-muted mt-0.5">{activeChannel.description}</p>
                )}
              </div>
              <div className="ml-auto text-xs text-muted">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={msgContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-5 bg-surface"
            >
              {loadingMsgs ? (
                <div className="flex flex-col">
                  {[
                    { isMe: false, w: 160, first: true },
                    { isMe: false, w: 210, first: false },
                    { isMe: true,  w: 130, first: true },
                    { isMe: false, w: 185, first: true },
                    { isMe: true,  w: 240, first: true },
                    { isMe: true,  w: 170, first: false },
                  ].map((s, i) => (
                    <div key={i} className={`flex ${s.isMe ? "justify-end" : "justify-start"} ${s.first && i > 0 ? "mt-4" : "mt-0.5"}`}>
                      <div
                        className="h-9 rounded-[18px] animate-pulse"
                        style={{
                          width: s.w,
                          background: s.isMe ? "var(--theme-accent)" : "var(--theme-border)",
                          opacity: s.isMe ? 0.4 : 1,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border-strong">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p className="text-sm font-medium">No messages yet — say something!</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {messages.map((msg, i) => {
                    const isMe = msg.author_id === myId;
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

                    const sameAuthorPrev = prevMsg?.author_id === msg.author_id &&
                      new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60000;
                    const sameAuthorNext = nextMsg?.author_id === msg.author_id &&
                      new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() < 5 * 60000;

                    const isFirst = !sameAuthorPrev;
                    const isLast = !sameAuthorNext;

                    const R = 18, S = 4;
                    const borderRadius = isMe
                      ? `${R}px ${isFirst ? R : S}px ${isLast ? R : S}px ${R}px`
                      : `${isFirst ? R : S}px ${R}px ${R}px ${isLast ? R : S}px`;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isFirst && i > 0 ? "mt-4" : "mt-0.5"}`}
                      >
                        {isFirst && !isMe && (
                          <p className="text-[11px] text-muted ml-10 mb-0.5 font-medium">
                            {msg.author_name}
                          </p>
                        )}

                        <div className={`flex items-end gap-1.5 max-w-[75%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                          {!isMe && (
                            <div className="w-7 h-7 flex-shrink-0 self-end">
                              {isLast ? (
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold select-none"
                                  style={{
                                    background: `hsl(${(msg.author_name.charCodeAt(0) * 37) % 360}deg 50% 50%)`,
                                    color: "white",
                                  }}
                                >
                                  {msg.author_name.charAt(0).toUpperCase()}
                                </div>
                              ) : (
                                <div className="w-7 h-7" />
                              )}
                            </div>
                          )}

                          <div
                            className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${isMe ? "text-white" : "text-primary"}`}
                            style={{
                              borderRadius,
                              background: isMe ? "var(--theme-accent)" : "var(--theme-surface-raised)",
                              border: isMe ? "none" : "1px solid var(--theme-border)",
                            }}
                          >
                            {renderBody(msg.body, isMe)}
                          </div>
                        </div>

                        {isLast && (
                          <p className={`text-[10px] text-muted mt-1 ${isMe ? "mr-0.5" : "ml-9"}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 bg-surface-raised border-t border-border px-4 py-3 relative">
              {mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-surface-raised border border-border rounded-2xl shadow-elevated overflow-hidden z-10">
                  {mentionSuggestions.map((m, i) => (
                    <button
                      key={m.userId}
                      onMouseDown={(e) => { e.preventDefault(); selectMention(m); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                        i === mentionIdx ? "bg-surface" : "hover:bg-surface"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 select-none"
                        style={{
                          background: `hsl(${(m.name.charCodeAt(0) * 37) % 360}deg 50% 50%)`,
                          color: "white",
                        }}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-primary">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2.5">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${activeChannel.name}...`}
                  rows={1}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 resize-none leading-relaxed overflow-y-auto transition-colors"
                  style={{ minHeight: "42px", maxHeight: "128px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Send"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-muted mt-1.5 ml-1 select-none">
                Enter to send · Shift+Enter for new line · @ to mention
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
