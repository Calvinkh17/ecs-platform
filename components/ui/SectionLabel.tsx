interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className = "" }: SectionLabelProps) {
  return (
    <p className={`text-xs font-semibold text-muted mb-3 ${className}`}>
      {children}
    </p>
  );
}
