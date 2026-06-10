"use client";

import { useState } from "react";
import { createChannel, deleteChannel, addChannelMember, removeChannelMember } from "@/app/actions";
import type { ChatChannel, ChannelMember } from "@/lib/types";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface AppUser { id: string; name: string; email: string; role: string; }
interface MemberWithName extends ChannelMember { user_name: string; user_email: string; }

interface Props {
  meId: string;
  users: AppUser[];
  initialChannels: ChatChannel[];
  initialMembers: MemberWithName[];
}

const inputCls = "h-9 px-3 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors";
const selectCls = "h-9 px-3 rounded-md border border-border bg-surface-raised text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors";

export default function ChannelsTab({ meId, users, initialChannels, initialMembers }: Props) {
  const [channels, setChannels] = useState<ChatChannel[]>(initialChannels);
  const [members, setMembers] = useState<MemberWithName[]>(initialMembers);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [addingMember, setAddingMember] = useState<Record<string, string>>({});
  const [addingStatus, setAddingStatus] = useState<Record<string, boolean>>({});
  const [addError, setAddError] = useState<Record<string, string>>({});

  const staffUsers = users.filter((u) => ["admin", "teacher"].includes(u.role));

  function channelMembers(channelId: string) {
    return members.filter((m) => m.channel_id === channelId);
  }

  function eligibleToAdd(channelId: string) {
    const currentIds = new Set(channelMembers(channelId).map((m) => m.user_id));
    return staffUsers.filter((u) => !currentIds.has(u.id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    const fd = new FormData();
    fd.append("name", newName);
    fd.append("description", newDesc);
    const result = await createChannel(fd);
    setCreating(false);
    if (result?.error) { setCreateError(result.error); return; }
    const channelId = result.id ?? crypto.randomUUID();
    const newChannel: ChatChannel = { id: channelId, name: newName.trim(), description: newDesc.trim() || null, created_by: meId, created_at: new Date().toISOString() };
    const me = users.find((u) => u.id === meId);
    const creatorMember: MemberWithName = { id: crypto.randomUUID(), channel_id: channelId, user_id: meId, joined_at: new Date().toISOString(), last_read_at: new Date().toISOString(), user_name: me?.name || me?.email || "Unknown", user_email: me?.email || "" };
    setChannels((prev) => [...prev, newChannel].sort((a, b) => a.name.localeCompare(b.name)));
    setMembers((prev) => [...prev, creatorMember]);
    setNewName("");
    setNewDesc("");
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete channel "#${name}" and all its messages?`)) return;
    const fd = new FormData();
    fd.append("id", id);
    const result = await deleteChannel(fd);
    if (result?.error) { alert(result.error); return; }
    setChannels((prev) => prev.filter((c) => c.id !== id));
    setMembers((prev) => prev.filter((m) => m.channel_id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function handleAddMember(channelId: string) {
    const userId = addingMember[channelId];
    if (!userId) return;
    setAddingStatus((s) => ({ ...s, [channelId]: true }));
    setAddError((e) => ({ ...e, [channelId]: "" }));
    const fd = new FormData();
    fd.append("channel_id", channelId);
    fd.append("user_id", userId);
    const result = await addChannelMember(fd);
    setAddingStatus((s) => ({ ...s, [channelId]: false }));
    if (result?.error) { setAddError((e) => ({ ...e, [channelId]: result.error! })); return; }
    const user = staffUsers.find((u) => u.id === userId);
    const newMember: MemberWithName = { id: result.id ?? crypto.randomUUID(), channel_id: channelId, user_id: userId, joined_at: new Date().toISOString(), last_read_at: new Date().toISOString(), user_name: user?.name || user?.email || "Unknown", user_email: user?.email || "" };
    setMembers((prev) => [...prev, newMember]);
    setAddingMember((prev) => ({ ...prev, [channelId]: "" }));
  }

  async function handleRemoveMember(memberId: string, memberName: string, channelName: string) {
    if (!confirm(`Remove ${memberName} from #${channelName}?`)) return;
    const fd = new FormData();
    fd.append("id", memberId);
    const result = await removeChannelMember(fd);
    if (result?.error) { alert(result.error); return; }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  return (
    <div className="space-y-6">
      <section className="card rounded-xl p-5">
        <SectionLabel>Create Channel</SectionLabel>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Name</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. general" required className={`${inputCls} w-48`} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Description (optional)</label>
            <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What's this channel for?" className={`${inputCls} w-64`} />
          </div>
          <button type="submit" disabled={creating || !newName.trim()} className="h-9 px-4 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50">
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {createError && <p className="mt-2 text-sm text-danger">{createError}</p>}
      </section>

      <section>
        <SectionLabel>All Channels ({channels.length})</SectionLabel>
        {channels.length === 0 ? (
          <div className="text-center py-10 text-muted card rounded-xl text-sm">No channels yet.</div>
        ) : (
          <div className="space-y-2">
            {channels.map((ch) => {
              const chMembers = channelMembers(ch.id);
              const expanded = expandedId === ch.id;
              const eligible = eligibleToAdd(ch.id);
              return (
                <div key={ch.id} className="card rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button onClick={() => setExpandedId(expanded ? null : ch.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      <span className="text-muted font-medium text-sm">#</span>
                      <span className="font-medium text-primary text-sm truncate">{ch.name}</span>
                      {ch.description && <span className="text-xs text-muted truncate hidden sm:block">— {ch.description}</span>}
                    </button>
                    <span className="text-xs text-muted flex-shrink-0">{chMembers.length} member{chMembers.length !== 1 ? "s" : ""}</span>
                    <button onClick={() => setExpandedId(expanded ? null : ch.id)} className="text-xs text-muted hover:text-secondary transition-colors flex-shrink-0">
                      {expanded ? "▲ Collapse" : "▼ Manage"}
                    </button>
                    <button onClick={() => handleDelete(ch.id, ch.name)} className="text-xs text-danger hover:text-danger/80 transition-colors flex-shrink-0">Delete</button>
                  </div>

                  {expanded && (
                    <div className="border-t border-border px-5 py-4 bg-surface space-y-4">
                      {eligible.length > 0 ? (
                        <div className="flex gap-2 items-center flex-wrap">
                          <select value={addingMember[ch.id] ?? ""} onChange={(e) => setAddingMember((prev) => ({ ...prev, [ch.id]: e.target.value }))} className={`${selectCls} w-56`}>
                            <option value="" disabled>Add member…</option>
                            {eligible.map((u) => <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>)}
                          </select>
                          <button onClick={() => handleAddMember(ch.id)} disabled={!addingMember[ch.id] || addingStatus[ch.id]} className="h-8 px-3 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50">
                            {addingStatus[ch.id] ? "Adding…" : "Add"}
                          </button>
                          {addError[ch.id] && <p className="text-xs text-danger">{addError[ch.id]}</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-muted">All staff are already members.</p>
                      )}
                      {chMembers.length === 0 ? (
                        <p className="text-xs text-muted">No members yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {chMembers.map((m) => (
                            <li key={m.id} className="flex items-center justify-between">
                              <span className="text-sm text-secondary">{m.user_name}</span>
                              <button onClick={() => handleRemoveMember(m.id, m.user_name, ch.name)} className="text-xs text-danger hover:text-danger/80 transition-colors">Remove</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
