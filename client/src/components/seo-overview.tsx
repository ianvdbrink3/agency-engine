import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeywordTable } from "@/components/keyword-table";
import { Layers, TrendingUp, FileText, Link2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import type { SeoData, KeywordCluster, PillarPage } from "@shared/schema";

interface SeoOverviewProps {
  seoData: SeoData;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function ClusterCard({ cluster }: { cluster: KeywordCluster }) {
  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{cluster.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pillar: <span className="font-medium text-foreground">{cluster.pillarKeyword}</span>
            </p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {cluster.intent}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span className="tabular-nums">
            <span className="font-semibold text-foreground">
              {cluster.totalVolume.toLocaleString("nl-NL")}
            </span>{" "}
            vol/mnd
          </span>
          <span className="tabular-nums">
            <span className="font-semibold text-foreground">{cluster.avgDifficulty}</span> gem. KD
          </span>
          <span>
            <span className="font-semibold text-foreground">{cluster.keywords.length}</span> zoekwoorden
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {cluster.keywords.slice(0, 6).map((kw, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-xs bg-muted/50 border-border text-muted-foreground"
            >
              {kw.keyword}
            </Badge>
          ))}
          {cluster.keywords.length > 6 && (
            <Badge variant="outline" className="text-xs bg-muted/50 border-border text-muted-foreground">
              +{cluster.keywords.length - 6}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PillarPageCard({ page }: { page: PillarPage }) {
  return (
    <Card className="border border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded bg-primary/10 shrink-0 mt-0.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{page.title}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">/{page.slug}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                <span className="font-semibold text-foreground">{page.totalVolume.toLocaleString("nl-NL")}</span> vol
              </span>
              <span>
                <span className="font-semibold text-foreground">{page.clusterPages.length}</span> cluster pagina's
              </span>
            </div>
            {page.clusterPages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {page.clusterPages.slice(0, 3).map((cp, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs bg-muted/40 border-border text-muted-foreground"
                  >
                    {cp.title}
                  </Badge>
                ))}
                {page.clusterPages.length > 3 && (
                  <Badge variant="outline" className="text-xs bg-muted/40 border-border text-muted-foreground">
                    +{page.clusterPages.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SeoOverview({ seoData }: SeoOverviewProps) {
  const keywords = parseJson<any[]>(seoData.keywords, []);
  const clusters = parseJson<KeywordCluster[]>(seoData.clusters, []);
  const pillarPages = parseJson<PillarPage[]>(seoData.pillarPages, []);

  // Build chart data from clusters
  const chartData = clusters.slice(0, 8).map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
    volume: c.totalVolume,
    kd: c.avgDifficulty,
  }));

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Zoekwoorden", value: keywords.length, icon: TrendingUp },
          { label: "Clusters", value: clusters.length, icon: Layers },
          { label: "Pillar pagina's", value: pillarPages.length, icon: FileText },
          {
            label: "Totaal volume",
            value: keywords.reduce((s: number, k: any) => s + (k.volume ?? 0), 0).toLocaleString("nl-NL"),
            icon: Link2,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-primary/10 shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-base font-bold tabular-nums">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Volume chart */}
      {chartData.length > 0 && (
        <Card className="border border-border/60">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm">Zoekvolume per cluster</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [val.toLocaleString("nl-NL"), "Volume"]}
                />
                <Bar dataKey="volume" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Keyword table */}
      {keywords.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Alle zoekwoorden
          </h3>
          <KeywordTable keywords={keywords} />
        </div>
      )}

      {/* Clusters grid */}
      {clusters.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Zoekwoord clusters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clusters.map((cluster, i) => (
              <ClusterCard key={i} cluster={cluster} />
            ))}
          </div>
        </div>
      )}

      {/* Pillar pages */}
      {pillarPages.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Pillar-cluster model
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pillarPages.map((page, i) => (
              <PillarPageCard key={i} page={page} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
