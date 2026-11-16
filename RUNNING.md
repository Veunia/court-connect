# Lancer l'app en local

L'app est **Basket Crew** (TanStack Start + Vite + Supabase). Gestionnaire
de paquets : **Bun**.

## Prérequis (une fois)

```bash
# Bun (si absent) — installe dans ~/.bun
curl -fsSL https://bun.sh/install | bash

# Dépendances
bun install
```

Un fichier `.env` est nécessaire pour Supabase (auth, données temps réel) et
Google Maps. Il est déjà présent ici ; sinon, demande les clés à l'équipe.
Sans `.env`, l'UI se charge mais la connexion et les données ne marchent pas.

## Visualiser l'app (mode dev, hot-reload)

```bash
./scripts/dev.sh
# ou directement :
bun run dev
```

Puis ouvre **http://localhost:8080** dans ton navigateur.

- Non connecté → redirige vers `/auth`.
- Le port (8080) est fixé par `@lovable.dev/vite-tanstack-config`.
- `scripts/dev.sh` retrouve Bun dans `~/.bun/bin` au besoin et libère le
  port 8080 s'il est déjà pris.

## Vérifier le build de production

```bash
bun run build      # compile le bundle (sortie dans .output/)
bunx tsc --noEmit  # types (les seules erreurs attendues sont dans src/lib/firebase.ts)
```

> `bun run preview` (`vite preview`) n'est **pas** opérationnel sur ce projet :
> le build passe par nitro (cible Cloudflare) et écrit dans `.output/`, pas
> dans `dist/`. Pour voir l'app, utilise le serveur de dev ci-dessus.

## Captures d'écran automatiques (optionnel)

Pour vérifier visuellement plusieurs pages sans ouvrir un navigateur :

```bash
bunx playwright install chromium   # une fois

# serveur de dev lancé dans un autre terminal, puis :
ROUTES="/,/auth,/reset-password" bun scripts/screenshot.mjs
THEME=dark ROUTES="/auth" bun scripts/screenshot.mjs
```

Les images sont écrites dans `./.screenshots/` (ignoré par git).
