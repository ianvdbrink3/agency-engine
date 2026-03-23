import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: { value: string; positive?: boolean };
  description?: string;
  className?: string;
  "data-testid"?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  description,
  className,
  "data-testid": testId,
}: StatCardProps) {
  return (
    <Card
      className={cn("border border-border/60", className)}
      data-testid={testId}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {label}
            </p>
            <p
              className="text-xl font-bold tabular-nums text-foreground"
              data-testid={testId ? `${testId}-value` : undefined}
            >
              {value}
            </p>
            {delta && (
              <p
                className={cn(
                  "text-xs mt-1 font-medium",
                  delta.positive ? "text-emerald-500" : "text-destructive"
                )}
              >
                {delta.positive ? "↑" : "↓"} {delta.value}
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
