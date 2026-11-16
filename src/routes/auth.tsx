import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BasketballIcon } from "@/components/basket/BasketballIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Limitation locale des tentatives : après 3 échecs, un délai croissant est
 * imposé avant un nouvel essai (le service d'authentification applique en plus
 * ses propres quotas côté serveur).
 */
const FREE_ATTEMPTS = 3;
const LOCK_STEPS_SECONDS = [15, 30, 60, 120, 300];

function lockSeconds(failures: number): number {
  if (failures <= FREE_ATTEMPTS) return 0;
  const index = Math.min(failures - FREE_ATTEMPTS - 1, LOCK_STEPS_SECONDS.length - 1);
  return LOCK_STEPS_SECONDS[index] ?? 0;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Connexion ou inscription — Basket Crew" },
      {
        name: "description",
        content: "Crée ton compte ou connecte-toi pour voir les prochaines sessions de basket.",
      },
      { property: "og:title", content: "Connexion ou inscription — Basket Crew" },
      {
        property: "og:description",
        content: "Rejoins le groupe : sessions, inscriptions et affluence en direct.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect: redirectTo } = useSearch({ from: "/auth" });
  // On n'accepte qu'un chemin interne, jamais une URL externe.
  const target =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const remaining = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const locked = remaining > 0;

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !window.location.hash.includes("type=recovery")) {
        navigate({ to: target, replace: true });
      }
    });
  }, [navigate, target]);

  /** Enregistre un échec (connexion, inscription ou envoi de lien). */
  function registerFailure() {
    const next = failures + 1;
    setFailures(next);
    const wait = lockSeconds(next);
    if (wait > 0) {
      setLockedUntil(Date.now() + wait * 1000);
      setNow(Date.now());
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (locked) {
      setError(
        `Trop de tentatives. Réessaie dans ${remaining} seconde${remaining > 1 ? "s" : ""}.`,
      );
      return;
    }
    setPending(true);
    setError(null);
    setInfo(null);

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setPending(false);
      if (resetError) {
        registerFailure();
        setError("Envoi impossible pour le moment. Réessaie dans un instant.");
        return;
      }
      setInfo(
        "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.",
      );
      return;
    }

    if (mode === "signup") {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${target}`,
          data: { full_name: fullName.trim() },
        },
      });
      setPending(false);
      if (signUpError) {
        registerFailure();
        setError(
          signUpError.message.toLowerCase().includes("already")
            ? "Un compte existe déjà avec cet email."
            : "Inscription impossible. Vérifie tes informations et réessaie.",
        );
        return;
      }
      if (!signUpData.session) {
        setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.");
        return;
      }
      setFailures(0);
      await router.invalidate();
      navigate({ to: target, replace: true });
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setPending(false);
      registerFailure();
      setError("Email ou mot de passe incorrect.");
      return;
    }
    // Attendre que la session soit bien disponible avant de quitter la page.
    const { data } = await supabase.auth.getUser();
    setPending(false);
    if (!data.user) {
      registerFailure();
      setError("Connexion impossible, réessaie.");
      return;
    }
    setFailures(0);
    await router.invalidate();
    navigate({ to: target, replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
            <BasketballIcon className="size-8" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-wide uppercase">
            Basket Crew — Sessions et inscriptions
          </h1>
          <p className="text-sm text-muted-foreground">On joue quand, où, et on est combien ?</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm"
        >
          {mode === "signup" ? (
            <div className="space-y-2">
              <Label htmlFor="fullName">Prénom / Nom</Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode !== "forgot" ? (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 6 : undefined}
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {locked && !error ? (
            <p className="text-sm text-destructive">
              Trop de tentatives. Réessaie dans {remaining} seconde{remaining > 1 ? "s" : ""}.
            </p>
          ) : null}
          {info ? <p className="text-sm text-primary">{info}</p> : null}
          <Button
            type="submit"
            size="lg"
            disabled={pending || locked}
            className="w-full font-display text-base font-bold tracking-widest"
          >
            {locked
              ? `Réessaie dans ${remaining}s`
              : mode === "signup"
                ? "Créer mon compte"
                : mode === "forgot"
                  ? "Envoyer le lien"
                  : "Se connecter"}
          </Button>
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setInfo(null);
              }}
              className="w-full text-center text-xs text-muted-foreground underline underline-offset-4"
            >
              Mot de passe oublié ?
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="w-full text-center text-xs text-muted-foreground underline underline-offset-4"
          >
            {mode === "signin"
              ? "Pas encore de compte ? Inscris-toi"
              : "J'ai déjà un compte — me connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
