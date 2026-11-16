import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useActiveSpace } from "@/hooks/useActiveSpace";
import { joinSpaceByCode } from "@/lib/spaces";

export const Route = createFileRoute("/_authenticated/rejoindre")({
  validateSearch: (search: Record<string, unknown>): { code?: string } =>
    typeof search["code"] === "string" ? { code: search["code"] } : {},
  head: () => ({
    meta: [
      { title: "Rejoindre un espace — Basket Crew" },
      {
        name: "description",
        content: "Saisis le code d'invitation de ton club pour accéder à ses sessions.",
      },
      { property: "og:title", content: "Rejoindre un espace — Basket Crew" },
      { property: "og:description", content: "Un code, et tu vois les sessions de ton club." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinSpacePage,
});

function JoinSpacePage() {
  const { code: codeFromLink } = useSearch({ from: "/_authenticated/rejoindre" });
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectSpace } = useActiveSpace(user);
  const [code, setCode] = useState(codeFromLink ?? "");

  useEffect(() => {
    if (codeFromLink) setCode(codeFromLink);
  }, [codeFromLink]);

  const mutation = useMutation({
    mutationFn: () => joinSpaceByCode(code.trim()),
    onSuccess: async (space) => {
      selectSpace(space.id);
      await queryClient.invalidateQueries({ queryKey: ["my-spaces"] });
      toast.success(`Bienvenue dans ${space.name} !`);
      navigate({ to: "/" });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      toast.error(message.includes("actif") ? "Ce code n'est plus actif." : "Code invalide.");
    },
  });

  return (
    <main className="mx-auto max-w-sm px-5 py-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Retour
      </Link>
      <h1 className="mb-2 font-display text-3xl font-bold tracking-wide uppercase">
        Rejoindre un espace
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Entre le code d'invitation transmis par l'admin de ton club.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!code.trim()) return;
          mutation.mutate();
        }}
        className="space-y-4 rounded-3xl border border-border bg-card p-5"
      >
        <div className="space-y-2">
          <Label htmlFor="code">Code d'invitation</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AB3K7Z"
            className="text-center font-display text-xl tracking-[0.4em] uppercase"
            required
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={mutation.isPending}
          className="w-full font-display font-bold tracking-widest"
        >
          Rejoindre
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas de code ?{" "}
        <Link to="/espaces" className="underline underline-offset-4">
          Crée ton propre espace
        </Link>
      </p>
    </main>
  );
}
