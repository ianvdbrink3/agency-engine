import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProjectStatus = "intake" | "processing" | "completed" | "archived";

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
  "data-testid"?: string;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  intake: {
    label: "Intake",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10",
  },
  processing: {
    label: "Verwerking",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10",
  },
  completed: {
    label: "Voltooid",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10",
  },
  archived: {
    label: "Gearchiveerd",
    className:
      "bg-muted text-muted-foreground border-border hover:bg-muted",
  },
};

export function StatusBadge({ status, className, "data-testid": testId }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.intake;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border px-2 py-0.5",
        config.className,
        className
      )}
      data-testid={testId}
    >
      {config.label}
    </Badge>
  );
}
