# Espaces (clubs) privés avec invitations

Chaque groupe de joueurs a son propre espace. On ne voit que les sessions de ses espaces.

## Ce que ça change pour l'utilisateur

1. **Créer un espace** — n'importe quel utilisateur connecté peut créer un espace (nom + description). Il en devient l'admin.
2. **Inviter des membres** — deux façons, disponibles pour l'admin :
   - **Lien / code partageable** : code court (ex. `CREW-7F3K`) + lien direct. Toute personne connectée qui saisit le code rejoint l'espace. Le code peut être régénéré ou désactivé.
   - **Invitation par email** : l'admin saisit une adresse ; dès que cette personne se connecte (ou crée son compte) avec cet email, elle est automatiquement ajoutée à l'espace.
3. **Plusieurs espaces** — un joueur peut appartenir à plusieurs clubs. Un sélecteur d'espace dans l'en-tête permet de basculer ; l'accueil, la création de session et les détails sont filtrés sur l'espace actif.
4. **Sessions cloisonnées** — chaque session appartient à un espace. Un membre ne voit, ne rejoint et ne partage que les sessions des espaces dont il est membre. Le lien partagé reste inaccessible aux non-membres.
5. **Gestion de l'espace** — page « Mon espace » : liste des membres (avatar, poste), invitations en attente, code d'invitation, retrait d'un membre et transfert/ajout d'admin (admin uniquement) ; « quitter l'espace » pour les membres.
6. **Premier écran** — un utilisateur sans espace arrive sur un écran « Créer un espace ou rejoindre avec un code ».
7. **Repartir de zéro** — les sessions de démo actuelles sont supprimées, comme demandé. Les comptes existants restent valides et créent/rejoignent leur espace.

## Détails techniques

### Base de données (migration)
- `spaces` : `id`, `name`, `description`, `invite_code` (unique), `invite_code_active`, `created_by`, timestamps.
- `space_members` : `space_id`, `user_id`, `role` (enum `space_role`: `admin` | `member`), unique `(space_id, user_id)`.
- `space_invites` : `space_id`, `email` (lowercase), `invited_by`, `created_at`, unique `(space_id, email)`.
- `game_sessions.space_id` (uuid, NOT NULL après nettoyage des données de démo, FK → `spaces`).
- GRANTs explicites (`authenticated`, `service_role`) sur les trois nouvelles tables ; pas d'accès `anon`.
- Fonctions `security definer` pour éviter la récursion RLS :
  - `is_space_member(_space uuid, _user uuid)`
  - `is_space_admin(_space uuid, _user uuid)`
  - `join_space_by_code(_code text)` → insère le membre si le code est actif, renvoie l'espace.
  - `accept_pending_invites()` → à la connexion, convertit les invitations correspondant à l'email du compte en adhésions.
- RLS revue :
  - `game_sessions`, `session_signups`, `session_waitlist` : SELECT/INSERT/UPDATE/DELETE conditionnés par `is_space_member(space_id, auth.uid())` (via jointure pour les inscriptions).
  - `profiles` : lecture limitée aux profils partageant au moins un espace avec l'utilisateur (colonnes non sensibles, comme aujourd'hui).
  - `spaces` : lecture pour les membres ; création libre pour un utilisateur authentifié ; modification réservée à `is_space_admin`.
  - `space_invites` : visibles par les admins de l'espace et par l'invité (email correspondant).
- Suppression des sessions/inscriptions de démo dans la même opération.

### Frontend
- `src/lib/spaces.ts` : `fetchMySpaces`, `createSpace`, `joinByCode`, `fetchSpaceMembers`, `inviteByEmail`, `revokeInvite`, `removeMember`, `setMemberRole`, `regenerateInviteCode`, `leaveSpace`.
- `src/hooks/useActiveSpace.ts` : espace actif persisté en `localStorage`, validé contre la liste des espaces du membre.
- `src/lib/basket.ts` : `fetchUpcomingSessions(spaceId)`, `createSession` ajoute `space_id`, types mis à jour.
- `src/components/basket/SpaceSwitcher.tsx` intégré à `AppHeader` (menu : espaces, « Créer un espace », « Rejoindre avec un code », « Mon espace »).
- Nouvelles routes sous `_authenticated/` : `espaces.tsx` (onboarding création/adhésion), `espace.$id.tsx` (membres, invitations, code, rôles), et `rejoindre.tsx` supportant `?code=` pour les liens d'invitation.
- `_authenticated/index.tsx` : requête clé `["sessions", spaceId]`, redirection vers `/espaces` si aucun espace, mention de l'espace dans le titre de page.
- `session.$id.index.tsx` / `.modifier.tsx` : garde d'appartenance avec message clair si la session appartient à un autre espace.
- `useRealtimeSessions` : invalidation incluant `space_members` pour rafraîchir la liste après une adhésion.
- `accept_pending_invites()` appelée après connexion (dans `auth.tsx` et au montage de la zone authentifiée).
- Chaque nouvelle route reçoit son `head()` (titre/description/OG) et `noindex`, cohérent avec l'existant.
