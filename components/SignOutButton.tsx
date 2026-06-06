import { signOut } from "@/app/actions";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
        Sign out
      </button>
    </form>
  );
}
