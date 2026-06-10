interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className = "", noPadding = false }: CardProps) {
  return (
    <div className={`bg-surface-raised border border-border rounded-lg shadow-card ${noPadding ? "" : "p-6"} ${className}`}>
      {children}
    </div>
  );
}
