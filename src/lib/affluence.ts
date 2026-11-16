export type CourtType = "demi" | "plein";

export type AffluenceLevel = "insuffisant" | "optimal" | "dense" | "tres-dense" | "complet";

type Thresholds = {
  insuffisantMax: number;
  optimalMax: number;
  denseMax: number;
  tresDenseMax: number;
  idealMid: number;
  suggested: number;
};

export const COURT_THRESHOLDS: Record<CourtType, Thresholds> = {
  demi: {
    insuffisantMax: 5,
    optimalMax: 10,
    denseMax: 16,
    tresDenseMax: 19,
    idealMid: 8,
    suggested: 12,
  },
  plein: {
    insuffisantMax: 9,
    optimalMax: 16,
    denseMax: 20,
    tresDenseMax: 24,
    idealMid: 13,
    suggested: 20,
  },
};

export const COURT_LABEL: Record<CourtType, string> = {
  demi: "DEMI-TERRAIN",
  plein: "TOUT-TERRAIN",
};

export const AFFLUENCE_LABEL: Record<AffluenceLevel, string> = {
  insuffisant: "INSUFFISANT",
  optimal: "OPTIMAL",
  dense: "DENSE",
  "tres-dense": "TRÈS DENSE",
  complet: "COMPLET",
};

/** Tailwind classes for the filled part of the affluence bar. */
export const AFFLUENCE_BAR_CLASS: Record<AffluenceLevel, string> = {
  insuffisant: "bg-muted-foreground",
  optimal: "bg-affluence-optimal",
  dense: "bg-affluence-dense",
  "tres-dense": "bg-affluence-tres-dense",
  complet: "bg-affluence-complet",
};

export const AFFLUENCE_TEXT_CLASS: Record<AffluenceLevel, string> = {
  insuffisant: "text-muted-foreground",
  optimal: "text-affluence-optimal",
  dense: "text-affluence-dense",
  "tres-dense": "text-affluence-tres-dense",
  complet: "text-affluence-complet",
};

/**
 * Session capacity always wins: reaching max_players means COMPLET even when
 * the theoretical thresholds for the court type go further.
 */
export function getAffluenceLevel(
  count: number,
  maxPlayers: number,
  court: CourtType,
): AffluenceLevel {
  if (count >= maxPlayers) return "complet";
  const t = COURT_THRESHOLDS[court];
  if (count <= t.insuffisantMax) return "insuffisant";
  if (count <= t.optimalMax) return "optimal";
  if (count <= t.denseMax) return "dense";
  if (count <= t.tresDenseMax) return "tres-dense";
  return "tres-dense";
}

export function getAffluencePercent(count: number, maxPlayers: number): number {
  if (maxPlayers <= 0) return 0;
  return Math.min(100, Math.max(0, (count / maxPlayers) * 100));
}

/** The ideal number of players for this court, never above the session capacity. */
export function getIdealCount(maxPlayers: number, court: CourtType): number {
  return Math.min(COURT_THRESHOLDS[court].idealMid, maxPlayers);
}

/** Where to place the little basketball marker: the ideal number of players. */
export function getIdealPercent(maxPlayers: number, court: CourtType): number {
  return getAffluencePercent(getIdealCount(maxPlayers, court), maxPlayers);
}
