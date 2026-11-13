/* eslint-disable i18next/no-literal-string -- only proper names here (Porto, Faro); the page copy is in translations (ryh) */
import { END, MAP_OUTLINE, STAGES, START } from "./ryhPaths";

export interface StageRow {
  label: string;
  distance: string;
  elevation: string;
}

/**
 * The route (RC-7, RC-12): Portugal with exactly MAP_OUTLINE, a light fill and a
 * non-scaling outline in the text colour; the 7 stages in their colours with numbered
 * markers; Porto and Faro with a halo in the background colour.
 */
export function RouteMap({ label }: { label: string }) {
  return (
    <svg viewBox="-130 -20 520 745" className="block h-[420px] w-full md:h-[560px]" role="img" aria-label={label}>
      <path d={MAP_OUTLINE} fill="var(--ryh-map-fill)" stroke="var(--ryh-fg)" strokeLinejoin="round" className="ryh-outline-map" />
      {STAGES.map((s) => (
        <path key={s.color} d={s.d} fill="none" stroke={s.color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {STAGES.map((s, i) => (
        <g key={`m${i}`}>
          <circle cx={s.marker[0]} cy={s.marker[1]} r="14" fill={s.color} stroke="var(--ryh-bg)" strokeWidth="3" />
          <text x={s.marker[0]} y={s.marker[1] + 5} textAnchor="middle" fontSize="14" fontWeight="600" fill="#fff" fontFamily="Inter, system-ui, sans-serif">
            {i + 1}
          </text>
        </g>
      ))}
      <circle cx={START[0]} cy={START[1]} r="7" fill="var(--ryh-fg)" />
      <text x={START[0] - 14} y={START[1] + 6} textAnchor="end" fontSize="19" fill="var(--ryh-fg)" className="ryh-halo" fontFamily="Newsreader, Georgia, serif">
        Porto
      </text>
      <circle cx={END[0]} cy={END[1]} r="7" fill="var(--ryh-fg)" />
      <text x={END[0] + 14} y={END[1] + 7} fontSize="19" fill="var(--ryh-fg)" className="ryh-halo" fontFamily="Newsreader, Georgia, serif">
        Faro
      </text>
    </svg>
  );
}

/** Same numbers, accessible: a real table with only hairlines */
export function StageTable({ rows, headers }: { rows: StageRow[]; headers: [string, string, string] }) {
  const cell = "border-b border-[var(--ryh-line)] px-1 py-3 md:px-2 md:py-[15px]";
  return (
    <table className="w-full border-collapse text-[14.5px] tabular-nums md:text-base">
      <thead>
        <tr className="text-left text-[13px] text-[var(--ryh-muted)]">
          {headers.map((h) => (
            <th key={h} scope="col" className={`${cell} font-normal`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-[var(--ryh-muted)]">
        {rows.map((r, i) => (
          <tr key={r.label}>
            <th scope="row" className={`${cell} whitespace-nowrap text-left font-medium text-[var(--ryh-fg)]`}>
              <i aria-hidden className="mr-3 inline-block h-[9px] w-[9px] rounded-full align-[1px]" style={{ backgroundColor: STAGES[i]?.color }} />
              {r.label}
            </th>
            <td className={cell}>{r.distance}</td>
            <td className={cell}>{r.elevation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
