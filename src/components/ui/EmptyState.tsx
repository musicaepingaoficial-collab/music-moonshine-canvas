import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground transition-all duration-200">
      <Icon className="h-12 w-12" />
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm max-w-xs text-center">{description}</p>}
    </div>
  );
}
