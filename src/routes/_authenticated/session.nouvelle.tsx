import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SessionForm } from "@/components/basket/SessionForm";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useActiveSpace } from "@/hooks/useActiveSpace";
import { createSession, type SessionInput } from "@/lib/basket";
import { errorMessage } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/session/nouvelle")({
  head: () => ({
    meta: [
      { title: "Créer une session — Basket Crew" },
      {
        name: "description",
        content:
          "Propose une nouvelle session de basket : date, lieu, terrain et nombre de joueurs.",
      },
      { property: "og:title", content: "Créer une session — Basket Crew" },
      {
        property: "og:description",
        content: "Organise la prochaine session du groupe en quelques secondes.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewSessionPage,
});

function NewSessionPage() {
  const { user } = useCurrentUser();
  const { activeSpace, isLoading: spacesLoading } = useActiveSpace(user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: SessionInput) => {
      if (!user) throw new Error("Non connecté");
      if (!activeSpace) throw new Error("Aucun espace actif");
      return createSession(input, user.id, activeSpace.id);
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session créée !");
      navigate({ to: "/session/$id", params: { id } });
    },
    onError: (err) => toast.error(errorMessage(err, "La session n'a pas pu être créée.")),
  });

  return (
    <main className="mx-auto max-w-lg px-5 py-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Retour
      </Link>
      <h1 className="mb-6 font-display text-3xl font-bold tracking-wide uppercase">
        Nouvelle session
      </h1>
      {!spacesLoading && !activeSpace ? (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-muted-foreground">
            Crée ou rejoins un espace avant de proposer une session.
          </p>
          <Button asChild size="lg" className="mt-6 font-display font-bold tracking-widest">
            <Link to="/espaces">Mes espaces</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-6 -mt-4 text-sm text-muted-foreground">
            Visible uniquement par les membres de {activeSpace?.name ?? "ton espace"}.
          </p>
          <SessionForm
            submitLabel="Créer la session"
            pending={mutation.isPending}
            onSubmit={(input) => mutation.mutate(input)}
          />
        </>
      )}
    </main>
  );
}
