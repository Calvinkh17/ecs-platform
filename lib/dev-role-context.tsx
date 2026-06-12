"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type PreviewRole = "admin" | "teacher" | "parent" | "student" | "pending" | null;

interface DevRoleContextValue {
  previewRole: PreviewRole;
  setPreviewRole: (role: PreviewRole) => void;
  isDevUser: boolean;
}

const DEV_EMAIL = "calvinkhiggins@gmail.com";
const SESSION_KEY = "dev_preview_role";

const DevRoleContext = createContext<DevRoleContextValue>({
  previewRole: null,
  setPreviewRole: () => {},
  isDevUser: false,
});

export function DevRoleProvider({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: ReactNode;
}) {
  const isDevUser = userEmail === DEV_EMAIL;
  const [previewRole, setPreviewRoleState] = useState<PreviewRole>(null);

  useEffect(() => {
    if (!isDevUser) return;
    const stored = sessionStorage.getItem(SESSION_KEY) as PreviewRole;
    if (stored) setPreviewRoleState(stored);
  }, [isDevUser]);

  function setPreviewRole(role: PreviewRole) {
    setPreviewRoleState(role);
    if (role) {
      sessionStorage.setItem(SESSION_KEY, role);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  return (
    <DevRoleContext.Provider value={{ previewRole, setPreviewRole, isDevUser }}>
      {children}
    </DevRoleContext.Provider>
  );
}

export function useDevRole() {
  return useContext(DevRoleContext);
}
