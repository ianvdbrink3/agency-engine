import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Target, DollarSign, Copy, CheckCheck } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { SeaData, Campaign, AdGroup } from "@shared/schema";

interface SeaOverviewProps {
  seaData: SeaData;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const MATCH_TYPE_COLORS: Record<string, string> = {
  exact: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  phrase: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  broad: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

function AdGroupCard({ group }: { group: AdGroup }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-4 py-3 h-auto rounded-lg border border-border/60 hover:bg-muted/40 bg-card"
          data-testid={`button-adgroup-${group.name}`}
        >
          <div className="flex items-center gap-2 text-left">
            <Target className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium">{group.name}</span>
            <Badge variant="outline" className="text-[10px] bg-muted/50">
              {group.keywords.length} zoekwoorden
            </Badge>
          </div>
          <ChevronDown
            className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-3 px-1">
          {/* Keywords */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Zoekwoorden
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.keywords.map((kw, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={cn(
                    "text-xs border",
                    MATCH_TYPE_COLORS[kw.matchType?.toLowerCase()] ?? "bg-muted/50 border-border text-muted-foreground"
                  )}
                >
                  {kw.keyword}{" "}
                  <span className="opacity-60 ml-1 text-[9px]">
                    ({kw.matchType?.toLowerCase()})
                  </span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Ad copy */}
          {group.headlines?.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Advertentietekst (RSA)
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() =>
                    copyText(
                      [...group.headlines, "", ...group.descriptions].join("\n"),
                      group.name
                    )
                  }
                  data-testid={`button-copy-adcopy-${group.name}`}
                >
                  {copied === group.name ? (
                    <CheckCheck className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied === group.name ? "Gekopieerd" : "Kopieer"}
                </Button>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Koppen:</p>
                {group.headlines.slice(0, 5).map((h, i) => (
                  <p key={i} className="text-xs">
                    {i + 1}. {h}
                  </p>
                ))}
              </div>
              {group.descriptions?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Beschrijvingen:</p>
                  {group.descriptions.slice(0, 3).map((d, i) => (
                    <p key={i} className="text-xs">
                      {i + 1}. {d}
                    </p>
                  ))}
                </div>
              )}
              {group.landingPage && (
                <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
                  → {group.landingPage}
                </p>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SeaOverview({ seaData }: SeaOverviewProps) {
  const campaigns = parseJson<Campaign[]>(seaData.campaigns, []);
  const rawBudget = parseJson<any[]>(seaData.budgetAllocation, []);
  const budgetAllocation = rawBudget.map((b: any) => ({
    name: b.name ?? b.campaign ?? "",
    budget: b.budget ?? 0,
    percent: b.percent ?? b.percentage ?? 0,
    rationale: b.rationale ?? "",
  }));
  const negativeKeywords = parseJson<string[]>(seaData.negativeKeywords, []);

  const totalBudget = budgetAllocation.reduce((s, b) => s + b.budget, 0);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border border-border/60">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">Campagnes</p>
            <p className="text-xl font-bold tabular-nums mt-0.5">{campaigns.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/60">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">Advertentiegroepen</p>
            <p className="text-xl font-bold tabular-nums mt-0.5">
              {campaigns.reduce((s, c) => s + (c.adGroups?.length ?? 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border/60">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">Totaal budget/mnd</p>
            <p className="text-xl font-bold tabular-nums mt-0.5">
              {totalBudget > 0 ? `€${totalBudget.toLocaleString("nl-NL")}` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget chart */}
      {budgetAllocation.length > 0 && (
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Budgetverdeling
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={budgetAllocation}
                    dataKey="budget"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {budgetAllocation.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(val: number) => [`€${val.toLocaleString("nl-NL")}`, "Budget"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {budgetAllocation.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-xs">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 tabular-nums text-xs">
                      <span className="text-muted-foreground">{item.percent}%</span>
                      <span className="font-semibold">€{item.budget.toLocaleString("nl-NL")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns */}
      {campaigns.map((campaign, ci) => (
        <Card key={ci} className="border border-border/60" data-testid={`card-campaign-${ci}`}>
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm">{campaign.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{campaign.objective}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs">
                  {campaign.type}
                </Badge>
                {campaign.budget > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  >
                    €{campaign.budget.toLocaleString("nl-NL")}/mnd
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {campaign.adGroups?.map((ag, ai) => (
              <AdGroupCard key={ai} group={ag} />
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Negative keywords */}
      {negativeKeywords.length > 0 && (
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm">Negatieve zoekwoorden</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex flex-wrap gap-1.5">
              {negativeKeywords.map((kw, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs bg-destructive/5 text-destructive border-destructive/20"
                >
                  -{kw}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
