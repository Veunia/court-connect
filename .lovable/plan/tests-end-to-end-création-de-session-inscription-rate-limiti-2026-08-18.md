# Tests end-to-end : création de session, inscription, rate limiting

Objectif : trois parcours automatisés qui vérifient le comportement réel de l'app dans un vrai navigateur, exécutables en une commande.

## Ce qui sera testé

1. **Création de session**
   Connexion avec un compte de test, choix d'un espace, ouverture de « Nouvelle session », remplissage du formulaire (titre, date à venir, horaires, lieu, catégorie, terrain, capacité), validation, puis vérification que la page de détail affiche bien la session et que celle-ci apparaît sur l'accueil.

2. **Inscription / désinscription**
   Depuis le détail de la session créée : clic sur « Je viens », vérification que le compteur d'affluence augmente et que le joueur apparaît dans la liste des inscrits ; puis désinscription et vérification du retour à l'état initial (compteur et liste).

3. **Rate limiting de la connexion**
   Quatre tentatives de connexion avec un mauvais mot de passe sur `/auth` : les trois premières affichent « Email ou mot de passe incorrect », la quatrième déclenche le verrouillage (bouton désactivé et compte à rebours « Réessaie dans …s »). Vérification que le bouton se réactive après expiration du délai le plus court.

## Détails techniques

- **Outil** : Playwright (Chromium), tests en TypeScript sous `tests/e2e/`, exécutés contre le serveur de dev local (`http://localhost:8080`).
- **Fichiers** :
  - `playwright.config.ts` — baseURL, viewport mobile-first (390×844), un seul worker (les tests partagent des données), `webServer` réutilisant le serveur de dev.
  - `tests/e2e/helpers.ts` — connexion réutilisable, sélection d'espace, création d'une session avec un titre unique horodaté.
  - `tests/e2e/session-creation.spec.ts`, `tests/e2e/signup-toggle.spec.ts`, `tests/e2e/login-rate-limit.spec.ts`.
- **Comptes** : identifiants de test lus depuis les variables d'environnement (`E2E_EMAIL`, `E2E_PASSWORD`) avec repli sur le compte de démo existant ; aucun identifiant en dur dans le dépôt, aucune donnée sensible affichée.
- **Sélecteurs** : rôles et libellés accessibles (`getByRole`, `getByLabel`). Là où l'app n'expose pas de repère stable (compteur d'affluence, liste des inscrits), ajout d'attributs `data-testid` discrets dans les composants concernés (`AffluenceBar`, détail de session) — sans changement visuel.
- **Scripts** : ajout de `test:e2e` (et `test:e2e:ui`) dans `package.json`, plus installation de `@playwright/test` en devDependency.
- **Nettoyage** : chaque test crée ses propres données avec un titre unique ; la session créée est supprimée en fin de test via l'action « Annuler la session » de l'organisateur.
- **Rate limiting** : le test s'appuie uniquement sur le verrou local progressif de `src/routes/auth.tsx` (3 essais libres, puis 15s) pour rester rapide et éviter de déclencher les quotas serveur.

## Livrable

`bun run test:e2e` exécute les trois parcours et rapporte le résultat ; les échecs produisent captures d'écran et traces dans `tests/e2e/.artifacts` (ignoré par git).
