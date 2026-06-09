"use client";

import { useState } from "react";
import { createChannel, deleteChannel, addChannelMember, removeChannelMember } from "@/app/actions";
import type { ChatChannel, ChannelMember } from "@/lib/types";

interface AppUser { id: string; name: string; email: string; role: string; }
interface MemberWithName extends ChannelMember { user_name: string; user_email: string; }

interface Props {
  users: AppUser[];
  initialChannels: ChatChannel[];
  initialMembers: MemberWithName[];
}

export default function ChannelsTab({ users, initialChannels, initialMembers }: Props) {
  const [channels, setChannels] = useState<ChatChannel[]>(initialChannels);
  const [members, setMembers] = useState<MemberWithName[]>(initialMembers);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Add member per-channel state
  const [addingMember, setAddingMember] = useState<Record<string, string>>({}); // channelId → userId
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
    const newChannel: ChatChannel = {
      id: result.id ?? crypto.randomUUID(),
      name: newName.trim(),
      description: newDesc.trim() || null,
      created_by: null,
      created_at: new Date().toISOString(),
    };
    setChannels((prev) => [...prev, newChannel].sort((a, b) => a.name.localeCompare(b.name)));
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
    const newMember: MemberWithName = {
      id: result.id ?? crypto.randomUUID(),
      channel_id: channelId,
      user_id: userId,
      joined_at: new Date().toISOString(),
      last_read_at: new Date().toISOString(),
      user_name: user?.name || user?.email || "Unknown",
      user_email: user?.email || "",
    };
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
      {/* Create channel */}
      <section className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Create Channel</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. general"
              required
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Description (optional)</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What's this channel for?"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-64"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {createError && <p className="mt-2 text-sm text-red-500">{createError}</p>}
      </section>

      {/* Channel list */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          All Channels ({channels.length})
        </h2>
        {channels.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
            No channels yet.
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map((ch) => {
              const chMembers = channelMembers(ch.id);
              const expanded = expandedId === ch.id;
              const eligible = eligibleToAdd(ch.id);
              return (
                <div key={ch.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  {/* Channel row */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button
                      onClick={() => setExpandedId(expanded ? null : ch.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <span className="text-gray-400 font-medium text-sm">#</span>
                      <span className="font-medium text-gray-900 text-sm truncate">{ch.name}</span>
                      {ch.description && (
                        <span className="text-xs text-gray-400 truncate hidden sm:block">— {ch.description}</span>
                      )}
                    </button>
                    <span className="text-xs text-gray-400 flex-shrink-0">{chMembers.length} member{chMembers.length !== 1 ? "s" : ""}</span>
                    <button
                      onClick={() => setExpandedId(expanded ? null : ch.id)}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                    >
                      {expanded ? "▲ Collapse" : "▼ Manage"}
                    </button>
                    <button
                      onClick={() => handleDelete(ch.id, ch.name)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Expanded members panel */}
                  {expanded && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
                      {/* Add member */}
                      {eligible.length > 0 ? (
                        <div className="flex gap-2 items-center flex-wrap">
                          <select
                            value={addingMember[ch.id] ?? ""}
                            onChange={(e) => setAddingMember((prev) => ({ ...prev, [ch.id]: e.target.value }))}
                            className="h-[34px] px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-56"
                          >
                            <option value="" disabled>Add member…</option>
                            {eligible.map((u) => (
                              <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAddMember(ch.id)}
                            disabled={!addingMember[ch.id] || addingStatus[ch.id]}
                            className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                          >
                            {addingStatus[ch.id] ? "Adding…" : "Add"}
                          </button>
                          {addError[ch.id] && <p className="text-xs text-red-500">{addError[ch.id]}</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">All staff are already members.</p>
                      )}
                      {/* Current members */}
                      {chMembers.length === 0 ? (
                        <p className="text-xs text-gray-400">No members yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {chMembers.map((m) => (
                            <li key={m.id} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{m.user_name}</span>
                              <button
                                onClick={() => handleRemoveMember(m.id, m.user_name, ch.name)}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                              >
                                Remove
                              </button>
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
