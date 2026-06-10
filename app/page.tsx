import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await getCurrentUser();

  if (!me) redirect("/login");
  if (me.role === "pending") redirect("/pending");
  if (me.role === "admin" || me.role === "teacher") redirect("/teacher");
  if (me.role === "parent" || me.role === "student") redirect("/parent");

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <h1 className="font-heading text-3xl font-bold text-sidebar-text">ECS Platform</h1>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/teacher"
            className="px-6 py-3 bg-forest text-sidebar-text rounded-xl font-medium hover:bg-forest-light transition-colors border border-sidebar-border"
          >
            Classes
          </Link>
          <Link
            href="/parent"
            className="px-6 py-3 bg-white/10 text-sidebar-text rounded-xl font-medium hover:bg-white/20 transition-colors border border-sidebar-border"
          >
            Parent Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
