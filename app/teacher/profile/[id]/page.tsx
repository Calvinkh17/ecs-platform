export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import Link from "next/link";
import type { Teacher, Class } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_leave: "On Leave",
  contract: "Contract",
  probation: "Probation",
  retired: "Retired",
  resigned: "Resigned",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  on_leave: "bg-amber-100 text-amber-700",
  contract: "bg-blue-100 text-blue-700",
  probation: "bg-orange-100 text-orange-700",
  retired: "bg-surface text-muted",
  resigned: "bg-danger-faint text-danger",
};

export default async function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const supabase = await createClient();

  const [{ data: teacher }, { data: classes }] = await Promise.all([
    supabase.from("teachers").select("*").eq("id", id).single(),
    supabase.from("classes").select("id, name, created_at").eq("teacher_id", id).order("name"),
  ]);

  if (!teacher) notFound();
  const t = teacher as Teacher;

  return (
    <AppNav title={t.name}>
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Back link */}
        <Link href="/admin?tab=teachers" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Admin Panel
        </Link>

        {/* Profile card */}
        <div className="card rounded-2xl p-8">
          <div className="flex items-start gap-6">
            {t.photo_url ? (
              <img
                src={t.photo_url}
                alt={t.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-border flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center text-3xl font-bold text-accent flex-shrink-0 select-none">
                {t.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="font-serif text-2xl font-bold text-primary">{t.name}</h1>
                <span className={`mt-1 inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[t.status] ?? "bg-surface text-muted"}`}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
              </div>
              {t.department && (
                <p className="text-secondary mt-1">{t.department}</p>
              )}
              {t.email && (
                <a href={`mailto:${t.email}`} className="text-sm text-muted hover:text-accent transition-colors mt-0.5 block">
                  {t.email}
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {t.room_number && (
              <div className="bg-surface rounded-xl px-4 py-3">
                <p className="text-xs text-muted font-medium">Room</p>
                <p className="text-primary font-semibold mt-1">{t.room_number}</p>
              </div>
            )}
            {t.start_date && (
              <div className="bg-surface rounded-xl px-4 py-3">
                <p className="text-xs text-muted font-medium">Start Date</p>
                <p className="text-primary font-semibold mt-1">
                  {new Date(t.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
            <div className="bg-surface rounded-xl px-4 py-3">
              <p className="text-xs text-muted font-medium">Classes</p>
              <p className="text-primary font-semibold mt-1">{classes?.length ?? 0}</p>
            </div>
          </div>

          {t.notes && (
            <div className="mt-4 p-4 bg-surface rounded-xl">
              <p className="text-xs text-muted font-medium mb-1">Notes</p>
              <p className="text-sm text-secondary whitespace-pre-wrap">{t.notes}</p>
            </div>
          )}
        </div>

        {/* Classes taught */}
        {(classes?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted mb-3">Classes Taught</h2>
            <ul className="space-y-2">
              {(classes as Class[]).map((cls) => (
                <li key={cls.id}>
                  <Link
                    href={`/teacher/class/${cls.id}`}
                    className="card rounded-xl px-5 py-3.5 flex items-center justify-between hover:shadow-elevated transition-shadow"
                  >
                    <span className="font-medium text-primary">{cls.name}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </AppNav>
  );
}
