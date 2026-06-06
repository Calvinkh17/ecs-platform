"use client";

import { deleteStudent } from "@/app/actions";

export default function DeleteStudentButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteStudent}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs text-red-400 hover:text-red-600 transition-colors"
        onClick={(e) => {
          if (!confirm(`Remove "${name}" from this class?`)) e.preventDefault();
        }}
      >
        Remove
      </button>
    </form>
  );
}
