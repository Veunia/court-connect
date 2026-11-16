import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BasketballIcon } from "@/components/basket/BasketballIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Basket Crew" },
      {
        name: "description",
        content: "Choisis un nouveau mot de passe pour accéder aux sessions de basket.",
      },
      { property: "og:title", content: "Nouveau mot de passe — Basket Crew" },
      {
        property: "og:description",
        content: "Réinitialise ton mot de passe Basket Crew en quelques secondes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError("Mise à jour impossible : " + updateError.message);
      return;
    }
    setInfo("Mot de passe mis à jour ! Redirection...");
    await router.invalidate();
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
            <BasketballIcon className="size-8" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wide uppercase">
            Nouveau mot de passe
          </h1>
          <p className="text-sm text-muted-foreground">Choisis un mot de passe pour ton compte.</p>
        </div>

        {ready ? (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {info ? <p className="text-sm text-primary">{info}</p> : null}
            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="w-full font-display text-base font-bold tracking-widest"
            >
              Enregistrer
            </Button>
          </form>
        ) : (
          <div className="space-y-4 rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <p>Ce lien de réinitialisation est invalide ou expiré.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>
              Retour à la connexion
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
