import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";

interface Column {
  key: string;
  label: string;
  className?: string;
}

interface ResponsiveTableProps {
  columns: Column[];
  rows: Record<string, ReactNode>[];
  actions?: (row: Record<string, ReactNode>) => ReactNode;
  emptyState?: ReactNode;
  loading?: boolean;
}

export function ResponsiveTable({ columns, rows, actions, emptyState, loading }: ResponsiveTableProps) {
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
                <tr key={i} className="border-b">
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
        <div className="md:hidden space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
              {columns.map((col) => (
                <Skeleton key={col.key} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!rows.length && emptyState) {
    return <>{emptyState}</>;
  }

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
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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
      <div className="md:hidden space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="space-y-2">
              {columns.map((col) => (
                <div key={col.key}>
                  <p className="text-xs text-muted-foreground">{col.label}</p>
                  <div className="text-sm">{row[col.key]}</div>
                </div>
              ))}
            </div>
            {actions && (
              <div className="mt-3 pt-3 border-t flex gap-2">
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
