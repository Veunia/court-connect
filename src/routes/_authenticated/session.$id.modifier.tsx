import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SessionForm } from "@/components/basket/SessionForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { fetchSession, updateSession, type SessionInput } from "@/lib/basket";
import { errorMessage } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/session/$id/modifier")({
  head: () => ({
    meta: [
      { title: "Modifier la session — Basket Crew" },
      { name: "description", content: "Mets à jour la date, le lieu, le terrain ou la capacité de ta session." },
      { property: "og:title", content: "Modifier la session — Basket Crew" },
      { property: "og:description", content: "L'organisateur peut ajuster les détails de la session." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditSessionPage,
});

function EditSessionPage() {
  const { id } = useParams({ from: "/_authenticated/session/$id/modifier" });
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: () => fetchSession(id),
  });

  const mutation = useMutation({
    mutationFn: (input: SessionInput) => updateSession(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session", id] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session mise à jour.");
      navigate({ to: "/session/$id", params: { id } });
    },
    onError: (err) => toast.error(errorMessage(err, "La modification a échoué.")),
  });

  if (isLoading) return <Skeleton className="m-5 h-96 rounded-3xl" />;
  if (!session)
    return (
      <p className="p-5 text-muted-foreground">
        Session introuvable — elle appartient peut-être à un espace dont tu n'es pas membre.
      </p>
    );
  if (session.organizer_id !== user?.id) {
    return <p className="p-5 text-muted-foreground">Seul l'organisateur peut modifier cette session.</p>;
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-6">
      <Link
        to="/session/$id"
        params={{ id }}
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Retour
      </Link>
      <h1 className="mb-6 font-display text-3xl font-bold tracking-wide uppercase">Modifier la session</h1>
      <SessionForm
        initial={{
          title: session.title,
          session_date: session.session_date,
          start_time: session.start_time,
          end_time: session.end_time,
          location: session.location,
          category: session.category,
          court: session.court,
          max_players: session.max_players,
          whatsapp_url: session.whatsapp_url,
        }}
        submitLabel="Enregistrer"
        pending={mutation.isPending}
        onSubmit={(input) => mutation.mutate(input)}
      />
    </main>
  );
}