import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useActiveSpace } from "@/hooks/useActiveSpace";
import { createSpace } from "@/lib/spaces";
import { errorMessage } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/espaces")({
  head: () => ({
    meta: [
      { title: "Mes espaces — Basket Crew" },
      {
        name: "description",
        content: "Crée un espace pour ton club et invite uniquement tes joueurs.",
      },
      { property: "og:title", content: "Mes espaces — Basket Crew" },
      {
        property: "og:description",
        content: "Un espace par club : chacun ne voit que ses propres sessions.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SpacesPage,
});

function SpacesPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { spaces, selectSpace } = useActiveSpace(user);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () => createSpace(name.trim(), description.trim()),
    onSuccess: async (space) => {
      selectSpace(space.id);
      await queryClient.invalidateQueries({ queryKey: ["my-spaces"] });
      toast.success("Espace créé !");
      navigate({ to: "/espace/$id", params: { id: space.id } });
    },
    onError: (err) => toast.error(errorMessage(err, "L'espace n'a pas pu être créé.")),
  });

  return (
    <main className="mx-auto max-w-lg px-5 py-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Retour
      </Link>
      <h1 className="mb-2 font-display text-3xl font-bold tracking-wide uppercase">Mes espaces</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Un espace = un club. Ses membres ne voient que les sessions de cet espace.
      </p>

      {spaces.length > 0 ? (
        <ul className="mb-8 space-y-2">
          {spaces.map((space) => (
            <li key={space.id}>
              <Link
                to="/espace/$id"
                params={{ id: space.id }}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display font-bold tracking-wide uppercase">
                    {space.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {space.role === "admin" ? "Admin" : "Membre"}
                  </span>
                </span>
                <Users className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          mutation.mutate();
        }}
        className="space-y-4 rounded-3xl border border-border bg-card p-5"
      >
        <h2 className="font-display text-lg font-bold tracking-widest uppercase">
          Créer un espace
        </h2>
        <div className="space-y-2">
          <Label htmlFor="space-name">Nom du club / espace</Label>
          <Input
            id="space-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Les Dunkers du 11e"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="space-desc">Description (optionnel)</Label>
          <Textarea
            id="space-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Sessions du mardi soir, niveau loisir."
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={mutation.isPending}
          className="w-full font-display font-bold tracking-widest"
        >
          Créer l'espace
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Tu as reçu un code d'invitation ?{" "}
        <Link to="/rejoindre" className="underline underline-offset-4">
          Rejoindre un espace
        </Link>
      </p>
    </main>
  );
}
