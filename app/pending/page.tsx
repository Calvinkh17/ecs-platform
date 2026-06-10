import { signOut } from "@/app/actions";

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-sm w-full">
        <div className="bg-white/5 border border-sidebar-border rounded-2xl px-8 py-10 space-y-6">
          <div className="w-14 h-14 rounded-full bg-sidebar-raised border border-sidebar-border flex items-center justify-center mx-auto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold text-sidebar-text">Account Pending</h1>
            <p className="mt-2 text-sm text-sidebar-dim leading-relaxed">
              Your account is awaiting approval. Please contact your school administrator.
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-sidebar-dim hover:text-sidebar-text transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
