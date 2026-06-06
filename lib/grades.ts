export function letterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function gradeColor(letter: string): string {
  switch (letter) {
    case "A": return "text-emerald-600";
    case "B": return "text-blue-600";
    case "C": return "text-yellow-600";
    case "D": return "text-orange-500";
    default:  return "text-red-500";
  }
}
