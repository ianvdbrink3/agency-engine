import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeoOverview } from "@/components/seo-overview";
import { SeaOverview } from "@/components/sea-overview";
import { StrategySummaryView } from "@/components/strategy-summary";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, Search, Target, BookOpen } from "lucide-react";
import type { SeoData, SeaData, StrategySummary } from "@shared/schema";

interface DashboardTabsProps {
  seoData?: SeoData | null;
  seaData?: SeaData | null;
  summary?: StrategySummary | null;
  isLoading?: boolean;
}

function EmptyTabState({ message }: { message: string }) {
  return (
    <Card className="border border-border/60 border-dashed">
      <CardContent className="py-16 text-center">
        <BarChart2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export function DashboardTabs({ seoData, seaData, summary, isLoading }: DashboardTabsProps) {
  const hasSeo = !!seoData;
  const hasSea = !!seaData;
  const hasSummary = !!summary;

  // Determine default tab based on available data
  const defaultTab = hasSeo ? "seo" : hasSea ? "sea" : "summary";

  return (
    <Tabs defaultValue={defaultTab} className="w-full" data-testid="dashboard-tabs">
      <TabsList className="mb-4 bg-muted/60 border border-border/60">
        {hasSeo && (
          <TabsTrigger value="seo" className="gap-1.5" data-testid="tab-seo">
            <Search className="w-3.5 h-3.5" />
            SEO
          </TabsTrigger>
        )}
        {hasSea && (
          <TabsTrigger value="sea" className="gap-1.5" data-testid="tab-sea">
            <Target className="w-3.5 h-3.5" />
            SEA
          </TabsTrigger>
        )}
        {hasSummary && (
          <TabsTrigger value="summary" className="gap-1.5" data-testid="tab-summary">
            <BookOpen className="w-3.5 h-3.5" />
            Samenvatting
          </TabsTrigger>
        )}
        {!hasSeo && !hasSea && !hasSummary && (
          <>
            <TabsTrigger value="seo" className="gap-1.5"><Search className="w-3.5 h-3.5" />SEO</TabsTrigger>
            <TabsTrigger value="sea" className="gap-1.5"><Target className="w-3.5 h-3.5" />SEA</TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" />Samenvatting</TabsTrigger>
          </>
        )}
      </TabsList>

      {hasSeo && (
        <TabsContent value="seo">
          {isLoading ? <TabSkeleton /> : <SeoOverview seoData={seoData!} />}
        </TabsContent>
      )}

      {hasSea && (
        <TabsContent value="sea">
          {isLoading ? <TabSkeleton /> : <SeaOverview seaData={seaData!} />}
        </TabsContent>
      )}

      {hasSummary && (
        <TabsContent value="summary">
          {isLoading ? <TabSkeleton /> : <StrategySummaryView summary={summary!} />}
        </TabsContent>
      )}

      {!hasSeo && !hasSea && !hasSummary && (
        <>
          <TabsContent value="seo">
            <EmptyTabState message="Geen SEO data beschikbaar. Genereer de strategie om te beginnen." />
          </TabsContent>
          <TabsContent value="sea">
            <EmptyTabState message="Geen SEA data beschikbaar. Genereer de strategie om te beginnen." />
          </TabsContent>
          <TabsContent value="summary">
            <EmptyTabState message="Geen samenvatting beschikbaar. Genereer de strategie om te beginnen." />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
