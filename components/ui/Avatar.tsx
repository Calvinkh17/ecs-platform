type Size = "xs" | "sm" | "md" | "lg";

interface AvatarProps {
  name: string;
  size?: Size;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-[11px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold select-none flex-shrink-0 ${className}`}
      style={{
        background: `hsl(${hue}deg 50% 50%)`,
        color: "white",
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
