import LoginButton from "./LoginButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Gradebook</h1>
          <p className="mt-2 text-gray-500">Sign in to continue</p>
        </div>
        <LoginButton />
      </div>
    </div>
  );
}
