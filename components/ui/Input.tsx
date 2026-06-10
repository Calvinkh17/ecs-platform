import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={[
        "h-9 w-full px-3 text-sm bg-surface-raised text-primary border border-border rounded-md",
        "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40",
        "transition-colors disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}
