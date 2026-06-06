"use client";

import { deleteAssignment } from "@/app/actions";

export default function DeleteAssignmentButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteAssignment}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs text-red-400 hover:text-red-600 transition-colors"
        onClick={(e) => {
          if (!confirm(`Delete "${name}" and all its grades?`)) e.preventDefault();
        }}
      >
        Delete
      </button>
    </form>
  );
}
