import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeywordEntry } from "@shared/schema";

type SortKey = keyof Pick<KeywordEntry, "keyword" | "volume" | "difficulty" | "cpc">;
type SortDir = "asc" | "desc";

interface KeywordTableProps {
  keywords: KeywordEntry[];
  className?: string;
}

const INTENT_CONFIG: Record<KeywordEntry["intent"], { label: string; className: string }> = {
  informational: { label: "Informatief", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  navigational: { label: "Navigatie", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  transactional: { label: "Transactioneel", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  commercial: { label: "Commercieel", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
};

const CATEGORY_CONFIG: Record<KeywordEntry["category"], { label: string; className: string }> = {
  primary: { label: "Primair", className: "bg-primary/10 text-primary border-primary/20" },
  secondary: { label: "Secundair", className: "bg-muted text-muted-foreground border-border" },
  "long-tail": { label: "Long-tail", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
};

function DifficultyBar({ value }: { value: number }) {
  const color =
    value < 30 ? "bg-emerald-500" : value < 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="tabular-nums text-xs text-muted-foreground">{value}</span>
    </div>
  );
}

export function KeywordTable({ keywords, className }: KeywordTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = [...keywords].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary" />
    );
  }

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[280px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 font-semibold text-xs gap-1"
                onClick={() => toggleSort("keyword")}
                data-testid="sort-keyword"
              >
                Zoekwoord
                <SortIcon col="keyword" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 font-semibold text-xs gap-1"
                onClick={() => toggleSort("volume")}
                data-testid="sort-volume"
              >
                Volume
                <SortIcon col="volume" />
              </Button>
            </TableHead>
            <TableHead>Moeilijkheid</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 font-semibold text-xs gap-1"
                onClick={() => toggleSort("cpc")}
                data-testid="sort-cpc"
              >
                CPC
                <SortIcon col="cpc" />
              </Button>
            </TableHead>
            <TableHead>Intent</TableHead>
            <TableHead>Categorie</TableHead>
            {keywords.some((k) => k.cluster) && <TableHead>Cluster</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground py-10 text-sm"
              >
                Geen zoekwoorden gevonden
              </TableCell>
            </TableRow>
          )}
          {sorted.map((kw, i) => {
            const intentCfg = INTENT_CONFIG[kw.intent];
            const catCfg = CATEGORY_CONFIG[kw.category];
            return (
              <TableRow
                key={`${kw.keyword}-${i}`}
                className="even:bg-muted/20 hover:bg-muted/30"
                data-testid={`row-keyword-${i}`}
              >
                <TableCell className="font-medium text-sm">{kw.keyword}</TableCell>
                <TableCell className="tabular-nums text-sm">
                  {kw.volume.toLocaleString("nl-NL")}
                </TableCell>
                <TableCell>
                  <DifficultyBar value={kw.difficulty} />
                </TableCell>
                <TableCell className="tabular-nums text-sm">
                  €{kw.cpc.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs border", intentCfg?.className)}
                  >
                    {intentCfg?.label ?? kw.intent}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs border", catCfg?.className)}
                  >
                    {catCfg?.label ?? kw.category}
                  </Badge>
                </TableCell>
                {keywords.some((k) => k.cluster) && (
                  <TableCell className="text-xs text-muted-foreground">
                    {kw.cluster ?? "—"}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
