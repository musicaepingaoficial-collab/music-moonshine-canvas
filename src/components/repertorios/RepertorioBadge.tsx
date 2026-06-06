interface RepertorioBadgeProps {
  text?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  className?: string;
}

export const RepertorioBadge = ({ text, bgColor, textColor, className = "" }: RepertorioBadgeProps) => {
  if (!text || !text.trim()) return null;
  return (
    <div
      className={`absolute top-0 left-0 z-10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-md rounded-br-sm rounded-tl-md max-w-[90%] truncate ${className}`}
      style={{
        background: bgColor || "#e11d48",
        color: textColor || "#ffffff",
      }}
    >
      {text}
    </div>
  );
};
