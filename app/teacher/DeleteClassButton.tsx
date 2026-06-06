"use client";

import { deleteClass } from "@/app/actions";

export default function DeleteClassButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteClass}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-sm text-red-400 hover:text-red-600 transition-colors"
        onClick={(e) => {
          if (!confirm(`Delete "${name}"?`)) e.preventDefault();
        }}
      >
        Delete
      </button>
    </form>
  );
}
