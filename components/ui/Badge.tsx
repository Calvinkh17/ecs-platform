const badgeClasses: Record<string, string> = {
  admin: "bg-primary text-background",
  teacher: "bg-accent-faint text-accent",
  parent: "bg-surface text-secondary border border-border",
  student: "bg-surface text-secondary border border-border",
  pending: "bg-danger-faint text-danger",
};

interface BadgeProps {
  role: string;
  className?: string;
}

export function RoleBadge({ role, className = "" }: BadgeProps) {
  const cls = badgeClasses[role] ?? "bg-surface text-muted border border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls} ${className}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}
