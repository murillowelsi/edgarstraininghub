import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { ReactNode, useState } from "react";

interface Column {
  key: string;
  label: string;
  className?: string;
  /** Show this column's value in the primary collapsed row (top-right), without a label */
  mobilePrimaryBadge?: boolean;
  /** Hide this column entirely on mobile */
  mobileHidden?: boolean;
}

interface ResponsiveTableProps {
  columns: Column[];
  rows: Record<string, ReactNode>[];
  rowKey?: string;
  actions?: (row: Record<string, ReactNode>) => ReactNode;
  emptyState?: ReactNode;
  loading?: boolean;
}

export function ResponsiveTable({ columns, rows, rowKey, actions, emptyState, loading }: ResponsiveTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  const toggleRow = (key: string | number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <>
        {/* Desktop skeleton */}
        <div className="hidden md:block rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th key={col.key} className="h-12 px-4 text-left font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
                {actions && <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {[...Array(3)].map((_, i) => (
                <tr key={`skeleton-desktop-${i}`} className="border-b">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={`skeleton-mobile-${i}`} className="rounded-lg border bg-card px-3 py-2.5 flex items-center gap-2">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!rows.length) {
    return emptyState ? (
      <>{emptyState}</>
    ) : (
      <div className="text-center py-8 text-muted-foreground text-sm">No data available</div>
    );
  }

  const primaryCol = columns[0];
  const badgeCols = columns.filter((c) => c.mobilePrimaryBadge);
  const expandableCols = columns.filter((c) => !c.mobilePrimaryBadge && !c.mobileHidden && c.key !== primaryCol.key);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th key={col.key} className={`h-12 px-4 text-left font-medium text-muted-foreground ${col.className ?? ""}`}>
                  {col.label}
                </th>
              ))}
              {actions && <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey ? String(row[rowKey]) : i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                    {row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">{actions(row)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.map((row, i) => {
          const key = rowKey ? String(row[rowKey]) : i;
          const isExpanded = expandedRows.has(key);

          return (
            <div key={key} className="rounded-lg border bg-card overflow-hidden">
              {/* Always-visible row: chevron + primary field + badge(s) + actions */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                {expandableCols.length > 0 && (
                  <button
                    onClick={() => toggleRow(key)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-90")} />
                  </button>
                )}
                <div className="flex-1 min-w-0 text-sm">
                  {row[primaryCol.key]}
                </div>
                {badgeCols.map((col) => (
                  <div key={col.key} className="shrink-0">
                    {row[col.key]}
                  </div>
                ))}
                {actions && (
                  <div className="flex gap-1 shrink-0 ml-1">
                    {actions(row)}
                  </div>
                )}
              </div>

              {/* Expandable section */}
              {isExpanded && expandableCols.length > 0 && (
                <div className="border-t px-3 py-2.5 space-y-1.5 bg-muted/20">
                  {expandableCols.map((col) => (
                    <div key={col.key} className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{col.label}</span>
                      <div className="text-sm flex-1">{row[col.key]}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
