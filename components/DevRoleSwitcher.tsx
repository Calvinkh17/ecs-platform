"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDevRole } from "@/lib/dev-role-context";

const ROLES = [
  { value: "admin",   label: "Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "parent",  label: "Parent" },
  { value: "student", label: "Student" },
  { value: "pending", label: "Pending" },
] as const;

const ROLE_ROUTES: Record<string, string> = {
  admin:   "/teacher",
  teacher: "/teacher",
  parent:  "/parent",
  student: "/parent",
  pending: "/pending",
};

export default function DevRoleSwitcher({ realRole }: { realRole: string }) {
  const { isDevUser, previewRole, setPreviewRole } = useDevRole();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!isDevUser) return null;

  const activeRole = previewRole ?? realRole;

  function handleSelect(role: string | null) {
    setOpen(false);
    if (role === null) {
      setPreviewRole(null);
      router.push(ROLE_ROUTES[realRole] ?? "/teacher");
    } else {
      setPreviewRole(role as "admin" | "teacher" | "parent" | "student" | "pending");
      router.push(ROLE_ROUTES[role] ?? "/teacher");
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[201]">
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2.5 bg-surface-raised border border-border rounded-xl shadow-elevated overflow-hidden w-48">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">Dev: View as</p>
            </div>
            {ROLES.map((r) => {
              const isActive = previewRole === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => handleSelect(r.value)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    isActive
                      ? "bg-accent-faint text-accent font-semibold"
                      : "text-primary hover:bg-surface"
                  }`}
                >
                  {r.label}
                  {isActive && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
            {previewRole && (
              <>
                <div className="border-t border-border" />
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full text-left px-3 py-2.5 text-sm text-danger hover:bg-danger-faint transition-colors"
                >
                  Exit Preview
                </button>
              </>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-semibold shadow-elevated hover:bg-accent-hover transition-all active:scale-95"
      >
        <span className="opacity-60">Dev</span>
        <span className="w-px h-3 bg-white/40 flex-shrink-0" />
        <span>{activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  );
}
