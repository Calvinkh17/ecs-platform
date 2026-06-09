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

function renderBody(body: string, mentionedIds: string[], myId: string): React.ReactNode {
  const isMentioned = mentionedIds.includes(myId);
  const segments = body.split(/(@\S+)/g);
  return segments.map((seg, i) =>
    seg.startsWith("@") ? (
      <span key={i} className={`font-semibold ${isMentioned ? "text-yellow-700" : "text-blue-600"}`}>
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

  // ── UI state ──────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true); // mobile toggle

  // ── Channel data ──────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // ── Message input ─────────────────────────────────────────
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [mentionMap, setMentionMap] = useState<Record<string, string>>({}); // firstName → userId

  // ── Refs ──────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const realtimeChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const scrolledUpRef = useRef(false);
  const msgContainerRef = useRef<HTMLDivElement>(null);

  const activeChannel = channels.find((c) => c.id === activeId) ?? null;

  // ── Mention suggestions ───────────────────────────────────
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m) => m.userId !== myId && m.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, members, myId]);

  // ── Load channel ──────────────────────────────────────────
  const loadChannel = useCallback(
    async (channelId: string) => {
      setLoadingMsgs(true);
      setMessages([]);
      setMembers([]);
      scrolledUpRef.current = false;

      // Unsubscribe previous realtime
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

      // Mark channel as read (fire and forget)
      supabase
        .from("channel_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("channel_id", channelId)
        .eq("user_id", myId)
        .then();

      // Realtime subscription
      const rt = supabase
        .channel(`chat-${channelId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `channel_id=eq.${channelId}`,
          },
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
            // Mark as read since user is viewing
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeChanRef.current) supabase.removeChannel(realtimeChanRef.current);
    };
  }, [supabase]);

  // ── Auto-scroll ───────────────────────────────────────────
  useEffect(() => {
    if (!loadingMsgs && messages.length > 0 && !scrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, loadingMsgs]);

  // Scroll on initial load (when messages first arrive)
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

  // ── @mention input handling ───────────────────────────────
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

  // ── Send message ──────────────────────────────────────────
  async function handleSend() {
    if (!text.trim() || !activeId || sending) return;
    setSending(true);
    const body = text.trim();

    // Resolve mentioned user IDs from mentionMap
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
      // Scroll to bottom since we just sent
      scrolledUpRef.current = false;
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="h-full flex">
      {/* ── Sidebar ── */}
      <div
        className={`
          ${showSidebar ? "flex" : "hidden"} md:flex
          w-full md:w-64 lg:w-72 flex-shrink-0
          flex-col bg-white border-r border-gray-100
        `}
      >
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {channels.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No channels yet.</p>
          ) : (
            channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => selectChannel(ch.id)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-2 text-sm transition-colors ${
                  activeId === ch.id
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className={activeId === ch.id ? "text-gray-300" : "text-gray-400"}>#</span>
                <span className="truncate font-medium">{ch.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Message area ── */}
      <div
        className={`
          ${!showSidebar ? "flex" : "hidden"} md:flex
          flex-1 flex-col min-w-0 bg-gray-50
        `}
      >
        {!activeChannel ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {channels.length === 0
              ? "You are not a member of any channels yet."
              : "Select a channel to start chatting."}
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden text-gray-400 hover:text-gray-700 mr-1"
                aria-label="Back to channels"
              >
                ←
              </button>
              <div className="text-gray-400 font-medium">#</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{activeChannel.name}</p>
                {activeChannel.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{activeChannel.description}</p>
                )}
              </div>
              <div className="ml-auto text-xs text-gray-400">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={msgContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5"
            >
              {loadingMsgs ? (
                <div className="flex justify-center pt-8 text-sm text-gray-400">Loading…</div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center pt-8 text-sm text-gray-400">
                  No messages yet. Say something!
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.author_id === myId;
                  const isMentioned = msg.mentionedIds.includes(myId);
                  const prevMsg = i > 0 ? messages[i - 1] : null;
                  const sameAuthor = prevMsg?.author_id === msg.author_id &&
                    new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60000;

                  return (
                    <div
                      key={msg.id}
                      className={`group flex gap-2.5 px-2 py-0.5 rounded-lg transition-colors ${
                        isMentioned ? "bg-yellow-50 border border-yellow-100" : "hover:bg-white"
                      } ${sameAuthor ? "" : "mt-3"}`}
                    >
                      {/* Avatar */}
                      {!sameAuthor ? (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 mt-0.5">
                          {msg.author_name.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-8 flex-shrink-0" />
                      )}
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {!sameAuthor && (
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className={`text-sm font-semibold ${isMe ? "text-blue-700" : "text-gray-900"}`}>
                              {isMe ? "You" : msg.author_name}
                            </span>
                            <span className="text-[11px] text-gray-400">{formatTime(msg.created_at)}</span>
                          </div>
                        )}
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                          {renderBody(msg.body, msg.mentionedIds, myId)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 px-5 py-4 bg-white border-t border-gray-100 relative">
              {/* @mention dropdown */}
              {mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-5 right-5 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                  {mentionSuggestions.map((m, i) => (
                    <button
                      key={m.userId}
                      onMouseDown={(e) => { e.preventDefault(); selectMention(m); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                        i === mentionIdx ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                      {m.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${activeChannel.name}… (@ to mention)`}
                    rows={1}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none leading-relaxed max-h-32 overflow-y-auto"
                    style={{ minHeight: "42px" }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Send"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
              <p className="text-[11px] text-gray-300 mt-1.5 ml-1">
                Enter to send · Shift+Enter for new line · @ to mention
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
