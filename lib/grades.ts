export function letterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/** Tailwind classes for a colored text-only grade label */
export function gradeColor(letter: string): string {
  switch (letter) {
    case "A": return "text-emerald-600";
    case "B": return "text-blue-600";
    case "C": return "text-amber-600";
    case "D": return "text-orange-500";
    default:  return "text-red-500";
  }
}

/** Tailwind classes for a filled grade chip (bg + text) */
export function gradeChip(letter: string): string {
  switch (letter) {
    case "A": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "B": return "bg-blue-50 text-blue-700 border border-blue-200";
    case "C": return "bg-amber-50 text-amber-700 border border-amber-200";
    case "D": return "bg-orange-50 text-orange-600 border border-orange-200";
    default:  return "bg-red-50 text-red-600 border border-red-200";
  }
}
