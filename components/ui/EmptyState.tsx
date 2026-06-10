interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export function EmptyState({ icon, title, subtitle, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="text-sm font-semibold text-primary">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}
