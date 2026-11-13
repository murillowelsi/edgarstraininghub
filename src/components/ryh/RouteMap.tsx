/* eslint-disable i18next/no-literal-string -- only proper names here (Raise Your Hands, Matosinhos, Faro); the page copy is in translations (ryh) */
import { END, MAP_OUTLINE, STAGES, START } from "./ryhPaths";

export interface StageRow {
  label: string;
  distance: string;
  elevation: string;
}

/**
 * The route in SVG (RYH-2): Portugal, the 7 stages in their colours with numbered
 * markers, Matosinhos and Faro. The table next to it carries the same colours and is
 * the accessible version of the numbers (real <table> with headers).
 */
export function RouteMap({ label }: { label: string }) {
  return (
    <svg viewBox="-130 -20 520 745" className="block h-[380px] w-full font-display md:h-[560px]" role="img" aria-label={label}>
      <path d={MAP_OUTLINE} fill="hsl(var(--ryh-s2))" stroke="hsl(var(--ryh-border))" strokeWidth="3" />
      {STAGES.map((s) => (
        <path key={s.color} d={s.d} fill="none" stroke={s.color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {STAGES.map((s, i) => (
        <g key={`m${i}`}>
          <circle cx={s.marker[0]} cy={s.marker[1]} r="15" fill={s.color} stroke="hsl(var(--ryh-card))" strokeWidth="4" />
          <text x={s.marker[0]} y={s.marker[1] + 5} textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">
            {i + 1}
          </text>
        </g>
      ))}
      <circle cx={START[0]} cy={START[1]} r="8" fill="hsl(var(--ryh-fg))" />
      <text x={START[0] - 16} y={START[1] + 6} textAnchor="end" fontSize="20" fontWeight="800" fill="hsl(var(--ryh-fg))">
        Matosinhos
      </text>
      <circle cx={END[0]} cy={END[1]} r="8" fill="hsl(var(--ryh-fg))" />
      <text x={END[0] + 16} y={END[1] + 8} fontSize="20" fontWeight="800" fill="hsl(var(--ryh-fg))">
        Faro
      </text>
    </svg>
  );
}

export function StageTable({ rows, headers }: { rows: StageRow[]; headers: [string, string, string] }) {
  return (
    <table className="w-full border-collapse text-[13px] tabular-nums md:text-[15px]">
      <thead>
        <tr className="text-left text-[hsl(var(--ryh-muted))]">
          {headers.map((h) => (
            <th key={h} scope="col" className="border-b border-[hsl(var(--ryh-border))] px-1.5 py-2.5 font-semibold md:px-3 md:py-3">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label}>
            <th scope="row" className="whitespace-nowrap border-b border-[hsl(var(--ryh-border))] px-1.5 py-2.5 text-left font-bold md:px-3 md:py-3">
              <i aria-hidden className="mr-2.5 inline-block h-3 w-3 rounded-full align-[-1px]" style={{ backgroundColor: STAGES[i]?.color }} />
              {r.label}
            </th>
            <td className="border-b border-[hsl(var(--ryh-border))] px-1.5 py-2.5 md:px-3 md:py-3">{r.distance}</td>
            <td className="border-b border-[hsl(var(--ryh-border))] px-1.5 py-2.5 md:px-3 md:py-3">{r.elevation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
