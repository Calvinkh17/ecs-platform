"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions";

// ── Icons ─────────────────────────────────────────────────────────────
function BookIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
function UsersIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function ShieldIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function BellIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function ChatIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: React.FC<{ size?: number }>;
  badge?: number;
  matchPrefix?: boolean;
}

interface SidebarNavProps {
  navItems: NavItem[];
  pathname: string;
  collapsed: boolean;
  userName: string;
  onNavClick?: () => void;
}

// ── Badge pill ────────────────────────────────────────────────────────
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Shared nav + footer (rendered in both desktop and mobile) ─────────
function SidebarNav({ navItems, pathname, collapsed, userName, onNavClick }: SidebarNavProps) {
  return (
    <>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.matchPrefix
            ? pathname.startsWith(item.href)
            : pathname === item.href;
          const visibleBadge = isActive ? 0 : (item.badge ?? 0);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              title={collapsed ? item.label : undefined}
              className={[
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                collapsed ? "justify-center" : "",
                isActive
                  ? "bg-gold text-white"
                  : "text-sidebar-dim hover:text-sidebar-text hover:bg-sidebar-raised",
              ].join(" ")}
            >
              <item.icon size={17} />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {visibleBadge > 0 && <Badge count={visibleBadge} />}
                </>
              )}
              {/* collapsed dot indicator */}
              {collapsed && visibleBadge > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border px-2 py-3">
        <div className={`flex items-center gap-3 px-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-sidebar-raised flex items-center justify-center text-sm font-bold text-sidebar-text flex-shrink-0 select-none">
            {userName ? userName.charAt(0).toUpperCase() : "?"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-text truncate leading-tight">{userName}</p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs text-sidebar-dim hover:text-sidebar-text transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────
interface Props {
  role: string;
  userName: string;
  userId: string;
  title: string;
}

export default function AppSidebarClient({ role, userName, userId, title }: Props) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announceBadge, setAnnounceBadge] = useState(0);
  const [chatBadge, setChatBadge] = useState(0);

  // Announcement unread count
  useEffect(() => {
    if (!userId || role === "pending") return;
    const supabase = createClient();
    const fetch = async () => {
      const { data } = await supabase.rpc("get_unread_announcement_count");
      setAnnounceBadge(data ?? 0);
    };
    fetch();
    const ch = supabase
      .channel("sidebar-announce")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, fetch)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "read_announcements" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, role]);

  // Chat unread count
  useEffect(() => {
    if (!userId || (role !== "admin" && role !== "teacher")) return;
    const supabase = createClient();
    const fetch = async () => {
      const { data } = await supabase.rpc("get_unread_mention_count");
      setChatBadge(data ?? 0);
    };
    fetch();
    const ch = supabase
      .channel("sidebar-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_mentions" }, fetch)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "channel_members" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, role]);

  // Build role-based nav items
  const navItems: NavItem[] = [];
  if (role === "admin" || role === "teacher") {
    navItems.push({ href: "/teacher", label: "Classes", icon: BookIcon, matchPrefix: true });
  }
  if (role === "admin" || role === "parent" || role === "student") {
    navItems.push({ href: "/parent", label: "Parent Portal", icon: UsersIcon });
  }
  if (role === "admin") {
    navItems.push({ href: "/admin", label: "Admin Panel", icon: ShieldIcon });
  }
  if (role !== "pending") {
    navItems.push({
      href: "/announcements",
      label: "Announcements",
      icon: BellIcon,
      badge: announceBadge,
    });
  }
  if (role === "admin" || role === "teacher") {
    navItems.push({
      href: "/chat",
      label: "Staff Chat",
      icon: ChatIcon,
      badge: chatBadge,
      matchPrefix: true,
    });
  }

  const appName = (
    <span className="font-heading font-semibold text-sidebar-text tracking-wide text-sm select-none">
      ECS Platform
    </span>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <div
        className={[
          "hidden lg:flex flex-col flex-shrink-0 bg-sidebar h-screen sticky top-0",
          "transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64",
        ].join(" ")}
      >
        {/* Header with collapse toggle */}
        <div className={`flex items-center px-4 py-5 border-b border-sidebar-border ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && appName}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-sidebar-dim hover:text-sidebar-text hover:bg-sidebar-raised transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        <SidebarNav
          navItems={navItems}
          pathname={pathname}
          collapsed={collapsed}
          userName={userName}
        />
      </div>

      {/* ── Mobile top bar (fixed) ───────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar flex items-center px-4 gap-3 shadow-sm">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-sidebar-dim hover:text-sidebar-text transition-colors"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <span className="font-heading font-semibold text-sidebar-text text-sm truncate">{title}</span>
      </div>

      {/* ── Mobile overlay ───────────────────────────────────── */}
      <div
        className={[
          "lg:hidden fixed inset-0 z-50 transition-opacity duration-200",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />

        {/* Drawer */}
        <div
          className={[
            "absolute left-0 top-0 bottom-0 w-72 bg-sidebar flex flex-col shadow-2xl",
            "transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
            {appName}
            <button
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center w-7 h-7 rounded-md text-sidebar-dim hover:text-sidebar-text hover:bg-sidebar-raised transition-colors"
              aria-label="Close menu"
            >
              <XIcon />
            </button>
          </div>

          <SidebarNav
            navItems={navItems}
            pathname={pathname}
            collapsed={false}
            userName={userName}
            onNavClick={() => setMobileOpen(false)}
          />
        </div>
      </div>
    </>
  );
}
