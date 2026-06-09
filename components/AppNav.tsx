import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import SignOutButton from "./SignOutButton";
import AnnouncementNavLink from "./AnnouncementNavLink";

export default async function AppNav({ title }: { title: string }) {
  const me = await getCurrentUser();

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-xl font-semibold text-gray-900">{title}</span>
          <nav className="flex items-center gap-4">
            {(me?.role === "admin" || me?.role === "teacher") && (
              <Link href="/teacher" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Teacher
              </Link>
            )}
            {(me?.role === "admin" || me?.role === "parent" || me?.role === "student") && (
              <Link href="/parent" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Parent View
              </Link>
            )}
            {me?.role === "admin" && (
              <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Admin
              </Link>
            )}
            {me && me.role !== "pending" && (
              <AnnouncementNavLink userId={me.id} />
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">{me?.name ?? me?.email}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
