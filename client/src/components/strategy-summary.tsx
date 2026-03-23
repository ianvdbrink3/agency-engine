import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  Lightbulb,
  ListChecks,
  TrendingUp,
  CircleDot,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrategySummary, ChecklistItem } from "@shared/schema";

interface StrategySummaryProps {
  summary: StrategySummary;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const PRIORITY_CONFIG = {
  high: { label: "Hoog", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  medium: { label: "Middel", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  low: { label: "Laag", className: "bg-muted text-muted-foreground border-border" },
};

export function StrategySummaryView({ summary }: StrategySummaryProps) {
  const keyFindings = parseJson<string[]>(summary.keyFindings, []);
  const recommendations = parseJson<{ title: string; description: string; priority: string }[]>(
    summary.recommendations,
    []
  );
  const checklist = parseJson<ChecklistItem[]>(summary.implementationChecklist, []);
  const estimates = parseJson<{ metric: string; value: string; description?: string }[]>(
    summary.performanceEstimates,
    []
  );

  const [checklistState, setChecklistState] = useState<Record<number, boolean>>(() => {
    return Object.fromEntries(
      checklist.map((item, i) => [i, item.status === "completed"])
    );
  });

  const completedCount = Object.values(checklistState).filter(Boolean).length;
  const progressPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  function toggleItem(i: number) {
    setChecklistState((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  return (
    <div className="space-y-6">
      {/* Executive summary */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Managementsamenvatting
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {summary.executiveSummary}
          </p>
        </CardContent>
      </Card>

      {/* Key findings */}
      {keyFindings.length > 0 && (
        <Card className="border border-border/60">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Belangrijkste bevindingen
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ul className="space-y-2.5">
              {keyFindings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CircleDot className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{finding}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Performance estimates */}
      {estimates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Prestatieschattingen
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {estimates.map((est, i) => (
              <Card key={i} className="border border-border/60">
                <CardContent className="p-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{est.metric}</p>
                  <p className="text-lg font-bold tabular-nums mt-1">{est.value}</p>
                  {est.description && (
                    <p className="text-xs text-muted-foreground mt-1">{est.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Aanbevelingen
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const priCfg =
                PRIORITY_CONFIG[rec.priority as keyof typeof PRIORITY_CONFIG] ??
                PRIORITY_CONFIG.medium;
              return (
                <Card key={i} className="border border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold">{rec.title}</p>
                          <Badge
                            variant="outline"
                            className={cn("text-xs border shrink-0", priCfg.className)}
                          >
                            {priCfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {rec.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <Card className="border border-border/60">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary" />
                Implementatie checklist
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground tabular-nums">
                  {completedCount}/{checklist.length}
                </div>
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums">{progressPct}%</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-2">
              {checklist.map((item, i) => {
                const priCfg =
                  PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG] ??
                  PRIORITY_CONFIG.medium;
                const checked = checklistState[i] ?? false;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      checked
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-border/60 bg-muted/10 hover:bg-muted/20"
                    )}
                    data-testid={`checklist-item-${i}`}
                  >
                    <Checkbox
                      id={`check-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleItem(i)}
                      className="mt-0.5 shrink-0"
                      data-testid={`checkbox-checklist-${i}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`check-${i}`}
                          className={cn(
                            "text-sm cursor-pointer",
                            checked && "line-through text-muted-foreground"
                          )}
                        >
                          {item.task}
                        </label>
                        <Badge
                          variant="outline"
                          className={cn("text-xs border shrink-0", priCfg.className)}
                        >
                          {priCfg.label}
                        </Badge>
                      </div>
                      {item.category && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                      )}
                    </div>
                    {checked && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
