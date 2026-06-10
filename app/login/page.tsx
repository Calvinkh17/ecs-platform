import LoginButton from "./LoginButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center px-4">
      <div className="text-center space-y-10 max-w-xs w-full">
        {/* School crest / wordmark */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-full bg-sidebar-raised border border-sidebar-border flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="font-heading text-3xl font-bold text-sidebar-text tracking-tight">
            ECS Platform
          </h1>
          <p className="text-sm text-sidebar-dim">
            Excelsior Classical School
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-white/5 border border-sidebar-border rounded-2xl px-8 py-8 space-y-6 backdrop-blur-sm">
          <p className="text-sm text-sidebar-dim leading-relaxed">
            Sign in with your school Google account to continue.
          </p>
          <LoginButton />
        </div>
      </div>
    </div>
  );
}
