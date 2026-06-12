"use client";

import { useRouter } from "next/navigation";
import { useDevRole } from "@/lib/dev-role-context";

export default function DevPreviewBanner() {
  const { previewRole, setPreviewRole, isDevUser } = useDevRole();
  const router = useRouter();

  if (!isDevUser || !previewRole) return null;

  function exitPreview() {
    setPreviewRole(null);
    router.push("/teacher");
  }

  const label = previewRole.charAt(0).toUpperCase() + previewRole.slice(1);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-1.5 bg-accent text-white text-xs font-medium py-1.5 px-4 cursor-pointer hover:bg-accent-hover transition-colors select-none"
      onClick={exitPreview}
    >
      <span className="opacity-70">Dev Preview:</span>
      <span>Viewing as {label}</span>
      <span className="opacity-40 mx-1">—</span>
      <span className="underline underline-offset-2 opacity-90">click to exit</span>
    </div>
  );
}
