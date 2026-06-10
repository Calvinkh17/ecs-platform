import { signOut } from "@/app/actions";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm text-muted hover:text-primary transition-colors">
        Sign out
      </button>
    </form>
  );
}
