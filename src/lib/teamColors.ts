export const TEAM_COLORS = [
  { key: "violet",  color: "#8b5cf6" },
  { key: "blue",    color: "#3b82f6" },
  { key: "cyan",    color: "#06b6d4" },
  { key: "teal",    color: "#14b8a6" },
  { key: "green",   color: "#22c55e" },
  { key: "amber",   color: "#f59e0b" },
  { key: "orange",  color: "#f97316" },
  { key: "rose",    color: "#f43f5e" },
  { key: "pink",    color: "#ec4899" },
];

export const DEFAULT_TEAM_COLOR = TEAM_COLORS[0];

export const getTeamColor = (colorKey?: string) => {
  return TEAM_COLORS.find((c) => c.key === colorKey) ?? DEFAULT_TEAM_COLOR;
};
