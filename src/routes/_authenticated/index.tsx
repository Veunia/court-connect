import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, Plus, Users } from "lucide-react";
import { AppHeader } from "@/components/basket/AppHeader";
import { BasketballIcon } from "@/components/basket/BasketballIcon";
import { SessionCard } from "@/components/basket/SessionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useProfile } from "@/hooks/useCurrentUser";
import { useActiveSpace } from "@/hooks/useActiveSpace";
import { useRealtimeSessions } from "@/hooks/useRealtimeSessions";
import { useSignupToggle, useWaitlistToggle } from "@/hooks/useSignupToggle";
import { CATEGORY_LABEL, fetchUpcomingSessions, type Category } from "@/lib/basket";
import { cn } from "@/lib/utils";

const CATEGORIES: Category[] = ["interieur", "exterieur", "tournoi"];

type SortKey = "date" | "lieu" | "horaire";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "date", label: "DATE" },
  { key: "lieu", label: "LIEU" },
  { key: "horaire", label: "HORAIRE" },
];

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Prochaines sessions — Basket Crew" },
      {
        name: "description",
        content:
          "Les prochaines sessions de basket du groupe : date, lieu, joueurs inscrits et affluence.",
      },
      { property: "og:title", content: "Prochaines sessions — Basket Crew" },
      {
        property: "og:description",
        content: "On joue quand, où, et on est combien ? Inscris-toi en un clic.",
      },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  const { user } = useCurrentUser();
  const { data: profile } = useProfile(user);
  const {
    spaces,
    activeSpace,
    activeSpaceId,
    isLoading: spacesLoading,
    selectSpace,
  } = useActiveSpace(user);
  const [category, setCategory] = useState<Category>("interieur");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(true);
  useRealtimeSessions();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions", activeSpaceId],
    enabled: Boolean(activeSpaceId),
    queryFn: () => fetchUpcomingSessions(activeSpaceId!),
  });

  const toggle = useSignupToggle(user?.id);
  const waitToggle = useWaitlistToggle(user?.id);
  const inCategory = (sessions ?? []).filter((session) => session.category === category);
  // La « prochaine session » reste la plus proche dans le temps, quel que soit le tri.
  const nextId = inCategory[0]?.id;
  const visible = [...inCategory].sort((a, b) => {
    const factor = sortAsc ? 1 : -1;
    if (sortKey === "lieu") return a.location.localeCompare(b.location, "fr") * factor;
    if (sortKey === "horaire") return a.start_time.localeCompare(b.start_time) * factor;
    return (
      (a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time)) *
      factor
    );
  });

  return (
    <div className="min-h-screen pb-28">
      <AppHeader
        profile={profile}
        spaces={spaces}
        activeSpace={activeSpace}
        onSelectSpace={selectSpace}
      />

      <div className="sticky top-[57px] z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 px-5 py-3">
          {CATEGORIES.map((value) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={cn(
                "h-10 flex-1 rounded-full font-display text-xs font-bold tracking-widest transition-colors",
                category === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {CATEGORY_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-5 py-5">
        <h1 className="font-display text-3xl font-bold tracking-wide uppercase">
          Prochaines sessions de basket
        </h1>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          {activeSpace ? `${activeSpace.name} — ` : ""}
          date, lieu, joueurs inscrits et affluence — {CATEGORY_LABEL[category].toLowerCase()}.
        </p>

        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs tracking-widest text-muted-foreground uppercase">Trier par</span>
          {SORTS.map((option) => (
            <button
              key={option.key}
              onClick={() => setSortKey(option.key)}
              className={cn(
                "h-9 rounded-full border px-3 font-display text-xs font-bold tracking-widest transition-colors",
                sortKey === option.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
          <button
            onClick={() => setSortAsc((value) => !value)}
            aria-label={sortAsc ? "Trier en ordre décroissant" : "Trier en ordre croissant"}
            className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground"
          >
            <ArrowDownUp className="size-4" />
          </button>
        </div>
        {!spacesLoading && spaces.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
              <Users className="size-7" />
            </div>
            <p className="mt-4 text-muted-foreground">
              Tu n'appartiens à aucun espace. Crée le tien ou rejoins ton club avec un code.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="font-display font-bold tracking-widest">
                <Link to="/espaces">Créer un espace</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="font-display font-bold tracking-widest"
              >
                <Link to="/rejoindre">Rejoindre avec un code</Link>
              </Button>
            </div>
          </div>
        ) : isLoading || spacesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">
              <BasketballIcon className="size-7" />
            </div>
            <p className="mt-4 text-muted-foreground">
              Aucune session prévue dans cette catégorie.
            </p>
            <Button asChild size="lg" className="mt-6 font-display font-bold tracking-widest">
              <Link to="/session/nouvelle">Créer une session</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((session) => {
              const joined = session.players.some((player) => player.id === user?.id);
              const waiting = session.waitlist.some((player) => player.id === user?.id);
              const isNext = session.id === nextId;
              return (
                <div key={session.id} className={cn(isNext && "sm:col-span-2")}>
                  <SessionCard
                    session={session}
                    isNext={isNext}
                    isJoined={joined}
                    isWaiting={waiting}
                    waitlistPending={waitToggle.isPending}
                    pending={toggle.isPending}
                    onToggle={() => toggle.mutate({ sessionId: session.id, joined })}
                    onToggleWaitlist={() => waitToggle.mutate({ sessionId: session.id, waiting })}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Link
        to="/session/nouvelle"
        aria-label="Créer une session"
        className="fixed right-5 bottom-6 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 sm:hidden"
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}
