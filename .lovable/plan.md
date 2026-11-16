# Audit BasketCrew — rapport final (lecture seule, 10 sept. 2026)

Périmètre : aucun code applicatif, aucune configuration, aucune donnée modifiée ; aucune publication ; aucun email/notification déclenché. Seul ajout au dépôt : ce rapport (`.lovable/plan.md`, diff vérifié). Commit audité : `0a488f3`.

Limites explicites : **les tests E2E n'ont pas été exécutés**. L'UI connectée et le rendu sur mobile réel **n'ont pas été vérifiés**. Aucune métrique de performance ou d'accessibilité mesurée. Les réglages du service d'authentification (confirmation d'email obligatoire, quotas) n'ont pas été inspectés.

## Domaine

`basketcrew.app` (primaire) et `www.basketcrew.app` sont rattachés à ce projet, actifs depuis 24 j, projet publié ; `www` redirige vers le domaine nu. Conforme.

---

## P1 — Fiabilité et sécurité

**P1.1 — Colonnes de statistiques modifiables par le joueur lui-même**
`profiles` a un `GRANT UPDATE` global pour `authenticated` (migrations `20260814155542…sql:16`, `20260814160820…sql:4`) et la politique `profiles_update_own` autorise toute mise à jour de sa propre ligne. Donc `matches_played`, `cancellations` et `suspended_at` sont modifiables par l'utilisateur via l'API, indépendamment de l'interface.
État des données : 16 profils, 4 avec `matches_played` ≠ 0, 0 avec `cancellations` ≠ 0. Les compteurs ne sont donc **pas** tous à zéro — le vrai problème est double : (a) aucun mécanisme actuel ne les met à jour (aucune écriture dans `src`, aucun trigger), (b) ils sont inscriptibles côté client, y compris une auto-suspension/dé-suspension.
Correction : restreindre l'UPDATE aux seules colonnes de profil (droits par colonne, comme le SELECT déjà en place), et confier les compteurs à un trigger ou à un calcul serveur.
Validation : une tentative directe d'écriture sur `matches_played` est refusée ; après une session passée, le compteur évolue seul.

**P1.2 — Anti-force brute des codes d'invitation inopérant**
`join_space_by_code` insère `rate_events(success=false)` puis lève `RAISE EXCEPTION` **dans la même transaction** : l'exception annule l'insertion, donc les échecs ne sont jamais comptés et le seuil de 5 tentatives/10 min n'est jamais atteint. (À retirer de la liste des protections acquises.)
Correction : journaliser l'échec hors transaction annulée (fonction séparée avec `pragma`/`dblink`-like, ou renvoyer un statut au lieu de lever, l'appelant traitant l'erreur).
Validation : après plusieurs codes erronés, des lignes `kind='join_code', success=false` existent et le blocage se déclenche.

**P1.3 — Écritures directes possibles sur les inscriptions et la liste d'attente**
`authenticated` détient `INSERT` sur `session_signups` et `session_waitlist` (migration `20260909080040…sql`), toutes colonnes comprises ; la RLS ne contrôle que l'identité et l'appartenance à l'espace. L'outil agent `mcp/tools/toggle-signup.ts:28-31` écrit d'ailleurs directement.
Ce que les triggers couvrent réellement : `enforce_session_capacity` vérifie capacité et `status` **pour les inscriptions** ; `reject_waitlist_if_signed_up` vérifie seulement l'absence de doublon. Conséquences :
- une entrée en liste d'attente peut être créée sur une session **annulée** ;
- `created_at` étant fourni par le client, on peut se placer artificiellement **en tête** de la file (`promote_from_waitlist` trie `ORDER BY created_at`) ;
- aucun contrôle d'email confirmé ni de date sur ces chemins directs.
Correction : passer tous les écrivains par les RPC (`join_session`, `join_waitlist`, …), puis **seulement après avoir prouvé que la version publiée utilise bien les RPC** (l'historique contient un rollback), retirer le `GRANT INSERT` direct et/ou forcer `created_at` en base.
Validation : insertion directe refusée ; insertion en attente sur session annulée refusée ; `created_at` client ignoré.

**P1.4 — Aucune contrainte serveur sur les sessions**
`pg_constraint` ne comporte **aucun CHECK** sur `game_sessions` : ni cohérence des horaires, ni bornes de capacité, ni longueurs de texte, ni format du lien WhatsApp. Aucun trigger `UPDATE` hormis `touch_updated_at`. La validation Zod (`src/lib/validation.ts`) est côté client/serveur applicatif : ce n'est pas une garantie base.
Effets constatés par lecture : `max_players` peut être ramené **sous** le nombre d'inscrits ; à l'inverse, l'augmenter ne promeut personne (la promotion n'a lieu qu'`AFTER DELETE` sur `session_signups`).
Données actuelles : 30 sessions, 0 dépassement de capacité, 0 anomalie de base (`invalid_basics` = 0).
Correction : CHECK (`end_time > start_time`, bornes `max_players`, longueurs, motif WhatsApp) + trigger de promotion sur augmentation de `max_players`.
Validation : un UPDATE fixant `max_players` sous l'effectif est refusé ; augmenter la capacité promeut le premier de la file.

**P1.5 — Aucun contrôle de date à l'inscription**
Ni `join_session`, ni `join_waitlist`, ni `enforce_session_capacity` ne comparent la date/heure de la session à l'instant courant ; la liste d'accueil ne filtre que sur le jour (`basket.ts:111`, `fr.ts:53-57`). On peut donc s'inscrire à une session passée. Données : 11 sessions actives déjà terminées sur 30.
Correction : refus côté base au-delà de `session_date` + heure de fin ; filtrage de liste tenant compte de l'heure.

**P1.6 — Aucun quota applicatif sur les appels IA et cartes**
`ai.functions.ts` et `maps.functions.ts` sont protégés par `requireSupabaseAuth`, qui ne fait que valider les claims. Aucun quota par utilisateur, aucun délai maximal, aucun `maxOutputTokens`. Tout compte connecté peut boucler sur `suggestLocations` / `geocodePlace`.
Correction : quota (la fonction `consume_quota` existe déjà en base), timeout, plafond de tokens.
Validation : au-delà du quota, la suggestion renvoie un message d'attente au lieu d'appeler le modèle.

**P1.7 — Cohérence schéma / dépôt après rollback**
Les migrations d'août et de septembre sont présentes en base, mais au moins `20260819161300` est **absente du dépôt** après rollback. Le code versionné ne décrit donc plus l'état réel de la base — c'est ce qui a déjà produit la régression d'inscription du 9 septembre.
Correction : réaligner le dossier de migrations sur l'état réel avant tout nouveau changement de schéma.

---

## P2 — Confidentialité, robustesse, expérience

**P2.1 — Fiabilité des lieux proposés**
`ai.functions.ts:38` demande explicitement « 5 lieux **plausibles** » : le modèle peut donc inventer des gymnases. Correction : s'appuyer sur une source vérifiée (recherche de lieux Google) plutôt que sur la génération libre.

**P2.2 — Avatars : lien de 10 ans et fichier jamais supprimé**
`basket.ts:237-250` signe l'URL pour 10 ans et la stocke dans `profiles.avatar_url` ; « Retirer la photo » (`profil.tsx:132-136`) ne fait que `avatar_url = null`, sans `storage.remove`. Le fichier et son lien restent donc exploitables, y compris après départ de l'espace. Correction : TTL court signé à l'affichage + suppression du fichier.

**P2.3 — Aucun état d'erreur dans l'interface**
`index.tsx:46-50` et `session.$id.index.tsx:47-50` n'exploitent pas `isError` : une panne réseau ou un refus de droits s'affiche comme « aucune session » ou « session introuvable ». Correction : état d'erreur distinct avec bouton Réessayer.

**P2.4 — Invitations acceptées sans email confirmé**
`accept_pending_invites` n'appelle pas `email_confirmed()`, alors que `create_space` l'exige ; par ailleurs la politique `spaces_insert_self` permet un INSERT direct dans `spaces` sans ce contrôle. Impact réel conditionné aux réglages d'authentification, non inspectés ici.

**P2.5 — Fuseau horaire dépendant de l'appareil**
`todayISO()` / `parseDate` (`fr.ts:18-21,53-57`) utilisent l'heure locale du téléphone. Un joueur hors métropole voit un jour décalé. Correction : référence unique `Europe/Paris`.

**P2.6 — Constats sur le site en ligne (inspection sans soumission de formulaire)**
Pages connexion / inscription / récupération de `basketcrew.app` : `lang="en"` sur le document alors que tout le contenu est en français (`__root.tsx:116`) ; boutons secondaires à hauteur 16 px, sous la cible tactile recommandée ; erreur React #418 observée en console — **cause non isolée**, une extension de navigateur peut être en jeu.

**P2.7 — Message d'erreur technique exposé**
`reset-password.tsx:56` affiche `updateError.message` brut, contrairement au reste du code (`validation.ts:29-31`).

---

## P3 — Qualité, SEO, statistiques (après fiabilité et sécurité)

- **P3.1** Sitemap et robots pointent l'ancien domaine : `sitemap[.]xml.ts:4`, `public/robots.txt:16` → remplacer par `https://basketcrew.app`.
- **P3.2** Aucune balise canonique, aucun `og:image` (recherche sans résultat dans `src`).
- **P3.3** Compteurs `matches_played` / `cancellations` sans mécanisme d'alimentation (voir P1.1 pour la partie sécurité) — l'affichage `profil.tsx:206-211` reste donc partiellement figé.
- **P3.4** Formulaire vs schéma : `SessionForm.tsx:341,152` accepte 1-40, `validation.ts:83-84` impose 2-50.
- **P3.5** Temps réel bavard : `useRealtimeSessions.ts:12-28` invalide toutes les requêtes sessions pour n'importe quel espace.
- **P3.6** Accessibilité : filtres catégorie/tri sans `aria-pressed` (`index.tsx:77-118`).
- **P3.7** Limitation locale des tentatives de connexion remise à zéro au rechargement (`auth.tsx:13-20,72-80`).
- **P3.8** `cancelSession` (`basket.ts:196-199`) ne valide pas l'UUID, contrairement aux autres écritures.
- **P3.9** Droits `anon` larges au niveau SQL sur `rate_events`, `support_threads`, `support_messages`, `user_roles` ; seule la RLS bloque. `rate_events` a la RLS active sans aucune politique.
- **P3.10** 16 fonctions `security definer` exécutables par les comptes connectés (alerte du linter) : légitime pour la plupart, à revoir nominativement.

---

## Choix de gouvernance, pas des bugs

- **Droits admin sur les sessions** : la RLS réserve modification et annulation à l'organisateur (`sessions_update_organizer`, `sessions_delete_organizer`), conformément au cahier des charges initial. Élargir aux admins d'espace est une décision produit, à ne pas appliquer d'office.
- **Conservation des inscriptions d'une session annulée** : c'est un historique, pas un défaut.

## Corrections apportées à mes constats précédents

- `clear_waitlist_on_signup` **existe** : le nettoyage de la liste d'attente à l'inscription est bien assuré.
- `join_session` renvoie `full` sur session complète — il n'y a **pas** de bascule automatique en liste d'attente à ce niveau ; seul `join_waitlist` inscrit directement si une place est libre.
- Les compteurs de statistiques ne sont pas tous à zéro (4 profils sur 16 ont `matches_played` ≠ 0).
- L'anti-force brute des codes d'invitation ne fonctionne pas (voir P1.2) et ne figure plus parmi les protections acquises.

## Protections réellement en place

- RLS active et cloisonnée par espace sur toutes les tables métier ; `is_space_member` / `is_space_admin` vérifient que l'appelant partage l'espace.
- Capacité protégée en base : `enforce_session_capacity`, verrous `pg_advisory_xact_lock`, promotion `promote_from_waitlist` après désinscription, `clear_waitlist_on_signup`.
- Colonne `email` de `profiles` non lisible par les comptes connectés : le SELECT est accordé colonne par colonne (`id, full_name, position, matches_played, cancellations, avatar_path, avatar_url`), vérifié sur la base.
- Garde-fou « dernier admin » (`guard_last_admin`) côté base et côté interface (`espace.$id.tsx:284-293`).
- Chemin d'avatar contraint au dossier de l'utilisateur (`check_avatar_path`), bucket privé, type déclaré **et** signature binaire vérifiés (`profil.tsx:23-38`), 5 Mo max, redimensionnement avant envoi.
- Redirection après connexion limitée aux chemins internes (`auth.tsx:42`) ; messages de connexion et de mot de passe oublié neutres.
- Validation Zod partagée entre écrans et outils agent ; lien WhatsApp restreint à deux domaines (contrôle applicatif, pas base — voir P1.4).
- CORS restreint et vérification HMAC en temps constant prêtes pour les endpoints publics (`http-security.ts`).
- Pages privées en `noindex` ; sous-arbre `_authenticated` protégé avant chargement (`_authenticated/route.tsx:7-14`) ; cache vidé à la déconnexion (`__root.tsx:134-154`).
- Export et purge des données personnelles disponibles (`export_my_data`, `purge_my_account_data`).

## Non couvert / inachevé

- **Notifications et PWA** : aucun manifeste, aucun service worker, aucune API Notification, aucun envoi d'email applicatif (les invitations sont seulement enregistrées).
- **Feedback / chatbot** : `support_threads` et `support_messages` existent et sont publiées en temps réel, mais aucune route ni composant ne les utilise.
- **Tests** : 3 spécifications Playwright présentes (`tests/e2e/`), **non exécutées** ; aucun test unitaire ; espaces, permissions et liste d'attente non couverts.

## Ordre d'intervention recommandé

1. P1.7 (réaligner migrations), puis P1.3, P1.1, P1.4, P1.2, P1.5, P1.6.
2. P2.1 à P2.7.
3. P3 (SEO, statistiques, ergonomie, dette).
