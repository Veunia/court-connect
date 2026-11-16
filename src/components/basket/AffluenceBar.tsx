import {
  AFFLUENCE_BAR_CLASS,
  AFFLUENCE_LABEL,
  AFFLUENCE_TEXT_CLASS,
  getAffluenceLevel,
  getAffluencePercent,
  getIdealCount,
  getIdealPercent,
  type CourtType,
} from "@/lib/affluence";
import { cn } from "@/lib/utils";
import { BasketballIcon } from "./BasketballIcon";

type Props = {
  count: number;
  maxPlayers: number;
  court: CourtType;
  className?: string;
};

export function AffluenceBar({ count, maxPlayers, court, className }: Props) {
  const level = getAffluenceLevel(count, maxPlayers, court);
  const percent = getAffluencePercent(count, maxPlayers);
  const ideal = getIdealPercent(maxPlayers, court);
  const idealCount = getIdealCount(maxPlayers, court);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span
          data-testid="affluence-count"
          className="font-display text-lg font-semibold tracking-wide"
        >
          {count} / {maxPlayers} joueurs
        </span>
        <span
          className={cn(
            "font-display text-sm font-bold tracking-widest",
            AFFLUENCE_TEXT_CLASS[level],
          )}
        >
          {AFFLUENCE_LABEL[level]}
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-secondary">
        <div
          className={cn("h-3 rounded-full transition-all duration-500", AFFLUENCE_BAR_CLASS[level])}
          style={{ width: `${percent}%` }}
        />
        <BasketballIcon
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-primary"
          style={{ left: `${ideal}%` }}
        />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BasketballIcon className="size-3.5 shrink-0 text-primary" />
        Idéal : {idealCount} joueur{idealCount > 1 ? "s" : ""}
      </p>
    </div>
  );
}
