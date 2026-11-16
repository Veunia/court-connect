import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  MessageCircle,
  Pencil,
  Share2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AffluenceBar } from "@/components/basket/AffluenceBar";
import { PlayerAvatar } from "@/components/basket/PlayerAvatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRealtimeSessions } from "@/hooks/useRealtimeSessions";
import { useSignupToggle, useWaitlistToggle } from "@/hooks/useSignupToggle";
import { COURT_LABEL } from "@/lib/affluence";
import { CATEGORY_LABEL, cancelSession, fetchSession } from "@/lib/basket";
import { firstName, formatLongDate, formatRange } from "@/lib/fr";

export const Route = createFileRoute("/_authenticated/session/$id/")({
  head: () => ({
    meta: [
      { title: "Détail de la session — Basket Crew" },
      {
        name: "description",
        content: "Horaires, lieu, affluence et joueurs inscrits pour cette session de basket.",
      },
      { property: "og:title", content: "Détail de la session — Basket Crew" },
      { property: "og:description", content: "Vois qui joue et inscris-toi en un clic." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionDetailPage,
});

function SessionDetailPage() {
  const { id } = useParams({ from: "/_authenticated/session/$id/" });
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useRealtimeSessions();

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: () => fetchSession(id),
  });

  const toggle = useSignupToggle(user?.id);
  const waitToggle = useWaitlistToggle(user?.id);
  const cancel = useMutation({
    mutationFn: () => cancelSession(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["session", id] });
      toast.success("Session annulée.");
      navigate({ to: "/" });
    },
    onError: () => toast.error("L'annulation a échoué."),
  });

  if (isLoading) return <Skeleton className="m-5 h-96 rounded-3xl" />;
  if (!session)
    return (
      <p className="p-5 text-muted-foreground">
        Session introuvable — elle appartient peut-être à un espace dont tu n'es pas membre.
      </p>
    );

  const joined = session.players.some((p) => p.id === user?.id);
  const waiting = session.waitlist.some((p) => p.id === user?.id);
  const waitingRank = session.waitlist.findIndex((p) => p.id === user?.id) + 1;
  const full = session.count >= session.max_players;
  const isOrganizer = session.organizer_id === user?.id;
  const cancelled = session.status === "annulee";
  const shareUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/session/${session.id}`;

  async function shareSession() {
    const s = session;
    if (!s) return;
    const text = [
      s.title ?? formatLongDate(s.session_date),
      `${formatLongDate(s.session_date)} · ${formatRange(s.start_time, s.end_time)}`,
      s.location,
    ].join("\n");
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Session de basket", text, url: shareUrl });
        return;
      } catch {
        // partage annulé : on retombe sur la copie du lien
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      toast.success("Lien de la session copié.");
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-16">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Toutes les sessions
      </Link>

      <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 font-display text-xs font-bold tracking-widest">
            {CATEGORY_LABEL[session.category]}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 font-display text-xs font-bold tracking-widest">
            {COURT_LABEL[session.court]}
          </span>
          {cancelled ? (
            <span className="rounded-full bg-destructive px-3 py-1 font-display text-xs font-bold tracking-widest text-destructive-foreground">
              ANNULÉE
            </span>
          ) : null}
        </div>

        <h1 className="font-display text-3xl font-bold tracking-wide uppercase">
          {session.title ?? formatLongDate(session.session_date)}
        </h1>

        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            {formatLongDate(session.session_date)}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-primary" />
            {formatRange(session.start_time, session.end_time)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary" />
            {session.location}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
          <PlayerAvatar name={session.organizer?.full_name} url={session.organizer?.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">Organisateur</p>
            <p className="truncate font-medium">{firstName(session.organizer?.full_name)}</p>
          </div>
          {session.whatsapp_url ? (
            <Button asChild variant="secondary">
              <a href={session.whatsapp_url} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" /> Groupe WhatsApp
              </a>
            </Button>
          ) : null}
        </div>

        <Button
          variant="outline"
          size="lg"
          onClick={shareSession}
          className="w-full font-display text-xs font-bold tracking-widest"
        >
          <Share2 className="size-4" /> PARTAGER LA SESSION
        </Button>

        <AffluenceBar
          count={session.count}
          maxPlayers={session.max_players}
          court={session.court}
        />

        {cancelled ? (
          <p className="text-sm text-muted-foreground">
            Cette session est annulée, les inscriptions sont fermées.
          </p>
        ) : full && !joined ? (
          <div className="space-y-2">
            <Button disabled size="lg" className="w-full font-display font-bold tracking-widest">
              COMPLET
            </Button>
            <Button
              variant={waiting ? "outline" : "secondary"}
              size="lg"
              disabled={waitToggle.isPending}
              onClick={() => waitToggle.mutate({ sessionId: session.id, waiting })}
              className="w-full font-display text-xs font-bold tracking-widest"
            >
              {waiting ? "QUITTER LA LISTE D'ATTENTE" : "REJOINDRE LA LISTE D'ATTENTE"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {waiting
                ? `Tu es en position ${waitingRank} : dès qu'une place se libère, elle est pour toi.`
                : "Une place libérée est attribuée automatiquement au premier de la liste."}
            </p>
          </div>
        ) : (
          <Button
            variant={joined ? "outline" : "default"}
            size="lg"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate({ sessionId: session.id, joined })}
            className="w-full font-display font-bold tracking-widest"
          >
            {joined ? "Je me désinscris" : "Je m'inscris"}
          </Button>
        )}

        {isOrganizer && !cancelled ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="secondary" size="lg">
              <Link to="/session/$id/modifier" params={{ id }}>
                <Pencil className="size-4" /> Modifier la session
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="lg" className="text-destructive">
                  <XCircle className="size-4" /> Annuler la session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annuler cette session ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Les joueurs ne pourront plus s'y inscrire. Cette action peut être communiquée au
                    groupe.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Retour</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel.mutate()}>
                    Annuler la session
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-xl font-bold tracking-widest uppercase">
          Joueurs inscrits ({session.count})
        </h2>
        {session.players.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Personne pour l'instant. Sois le premier !
          </p>
        ) : (
          <ul data-testid="players-list" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {session.players.map((player) => (
              <li
                key={player.id}
                data-testid="player-item"
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <PlayerAvatar
                  name={player.full_name}
                  url={player.avatar_url}
                  className="size-11 shrink-0"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{firstName(player.full_name)}</p>
                  {player.position ? (
                    <p className="truncate text-xs text-muted-foreground">{player.position}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {session.waitlist.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-4 font-display text-xl font-bold tracking-widest uppercase">
            Liste d'attente ({session.waitlist.length})
          </h2>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {session.waitlist.map((player, index) => (
              <li
                key={player.id}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-3"
              >
                <span className="font-display text-sm font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <PlayerAvatar
                  name={player.full_name}
                  url={player.avatar_url}
                  className="size-9 shrink-0"
                />
                <p className="min-w-0 truncate text-sm font-semibold">
                  {firstName(player.full_name)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
