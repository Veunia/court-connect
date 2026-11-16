import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { AffluenceBar } from "./AffluenceBar";
import { Button } from "@/components/ui/button";
import { COURT_LABEL } from "@/lib/affluence";
import type { SessionWithPlayers } from "@/lib/basket";
import { firstName, formatLongDate, formatRange } from "@/lib/fr";

type Props = {
  session: SessionWithPlayers;
  isNext?: boolean;
  isJoined: boolean;
  isWaiting?: boolean;
  waitlistPending?: boolean;
  pending?: boolean;
  onToggle: () => void;
  onToggleWaitlist?: () => void;
};

export function SessionCard({
  session,
  isNext,
  isJoined,
  isWaiting,
  waitlistPending,
  pending,
  onToggle,
  onToggleWaitlist,
}: Props) {
  const full = session.count >= session.max_players;
  const waitingCount = session.waitlist.length;

  return (
    <article className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {isNext ? (
        <div className="bg-primary px-5 py-2 font-display text-xs font-bold tracking-[0.2em] text-primary-foreground">
          PROCHAINE SESSION
        </div>
      ) : null}

      <Link
        to="/session/$id"
        params={{ id: session.id }}
        className="block space-y-3 p-5 focus-visible:outline-none"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-2xl leading-tight font-bold tracking-wide">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-5 shrink-0 text-primary" />
                <span className="truncate">{formatLongDate(session.session_date)}</span>
              </span>
            </h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" />
              {formatRange(session.start_time, session.end_time)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1 font-display text-xs font-bold tracking-widest text-secondary-foreground">
            {COURT_LABEL[session.court]}
          </span>
        </div>

        {session.title ? <p className="font-medium">{session.title}</p> : null}

        <p className="flex items-center gap-2 text-sm">
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className="truncate">{session.location}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Créé par {firstName(session.organizer?.full_name)}
        </p>

        <AffluenceBar
          count={session.count}
          maxPlayers={session.max_players}
          court={session.court}
          className="pt-1"
        />
      </Link>

      <div className="space-y-2 border-t border-border bg-muted/40 px-5 py-4">
        {full && !isJoined ? (
          <>
            <Button
              disabled
              size="lg"
              className="w-full font-display text-base font-bold tracking-widest"
            >
              COMPLET
            </Button>
            <Button
              variant={isWaiting ? "outline" : "secondary"}
              size="lg"
              disabled={waitlistPending}
              onClick={onToggleWaitlist}
              className="w-full font-display text-xs font-bold tracking-widest"
            >
              {isWaiting ? "QUITTER LA LISTE D'ATTENTE" : "REJOINDRE LA LISTE D'ATTENTE"}
            </Button>
          </>
        ) : (
          <Button
            variant={isJoined ? "outline" : "default"}
            size="lg"
            disabled={pending}
            onClick={onToggle}
            className="w-full font-display text-base font-bold tracking-widest"
          >
            {isJoined ? "Je me désinscris" : "Je m'inscris"}
          </Button>
        )}
        {waitingCount > 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            {waitingCount} joueur{waitingCount > 1 ? "s" : ""} en liste d'attente
          </p>
        ) : null}
      </div>
    </article>
  );
}
