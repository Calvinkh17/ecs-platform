import { signOut } from "@/app/actions";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-14 h-14 rounded-full bg-yellow-50 border border-yellow-100 flex items-center justify-center mx-auto">
          <span className="text-2xl">⏳</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Account Pending Approval</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Your account is pending approval. Please contact your school administrator.
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
