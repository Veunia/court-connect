# Corriger « Action impossible pour le moment. » à l'inscription

## Ce que j'ai vérifié

- Le message vient d'un seul endroit : le gestionnaire d'erreur générique de l'inscription/liste d'attente (`src/hooks/useSignupToggle.ts`). Il masque la vraie cause : toute erreur, quelle qu'elle soit, affiche ce texte.
- Côté données : aucune inscription enregistrée depuis le 4 septembre. Les deux membres arrivés depuis (7 et 8 septembre) n'ont jamais réussi à s'inscrire, alors qu'ils sont bien membres du club « ff » et que leur email est confirmé. Les sessions concernées sont actives et loin d'être complètes (1/12, 2/16).
- L'inscription se fait aujourd'hui par une écriture directe dans la table des inscriptions, soumise aux règles d'accès. La base contient déjà des fonctions dédiées (`join_session`, `leave_session`, `join_waitlist`, `leave_waitlist`) qui font le même travail de façon atomique et qui renvoient un statut précis (déjà inscrit, complet, session annulée, email non confirmé, pas membre du club).
- La cause exacte n'est pas encore confirmée : le journal actuel ne remonte aucun détail. La première étape du plan est donc de la rendre visible, puis de basculer sur le chemin fiable.

## Ce que je vais faire

1. **Rendre la vraie cause visible**
   - Journaliser le détail technique de l'échec (code + message) au moment du clic, pour identifier immédiatement le blocage si quelque chose résiste.

2. **Passer l'inscription par le chemin fiable de la base**
   - Utiliser `join_session` / `leave_session` pour le bouton « Je m'inscris » / « Je me désinscris ».
   - Utiliser `join_waitlist` / `leave_waitlist` pour la liste d'attente.
   - Avantages : une seule opération atomique (plus de conflit entre le comptage des places et l'écriture), bascule automatique en liste d'attente si la session vient d'être remplie, et impossibilité de double inscription.

3. **Afficher des messages compréhensibles au lieu du message fourre-tout**
   - « Session complète : tu es sur la liste d'attente. »
   - « Cette session a été annulée. »
   - « Confirme ton adresse email pour t'inscrire. » (avec possibilité de renvoyer l'email)
   - « Tu n'es plus membre de ce club. »
   - « Tu es déjà inscrit. »
   - Message générique conservé uniquement en dernier recours, avec invitation à réessayer.

4. **Rafraîchir l'affichage après action**
   - Recharger la session et la liste des joueurs à partir de la réponse, pour que le compteur et le bouton reflètent immédiatement le résultat.

5. **Vérifier**
   - Reproduire le parcours d'un membre récemment arrivé : inscription, désinscription, réinscription, et inscription sur une session complète.
   - Étendre le test automatisé existant d'inscription/désinscription pour couvrir le nouveau chemin.

## Détails techniques

- `src/hooks/useSignupToggle.ts` : remplacer les mutations par des appels RPC, exploiter le champ `status` renvoyé (`joined`, `left`, `waitlisted`, `full`, `cancelled`, `email_unconfirmed`, `forbidden`, `not_found`, `already_signed_up`) pour choisir le toast, et invalider `["sessions"]` / `["session"]`.
- `src/lib/basket.ts` : `joinSession`/`leaveSession`/`joinWaitlist`/`leaveWaitlist` deviennent des wrappers `supabase.rpc(...)` typés, renvoyant le statut au lieu de `void`.
- Aucune migration n'est nécessaire pour l'étape 2 : les fonctions et les droits d'exécution pour les comptes connectés existent déjà. Si le journal de l'étape 1 révèle un blocage de droits résiduel sur la table d'inscriptions, une migration correctrice ciblée sera ajoutée dans la même passe.
- `src/routes/_authenticated/index.tsx` et `session.$id.index.tsx` : adapter l'état du bouton au statut renvoyé (inscrit / en attente).
- Tests : `tests/e2e/signup-toggle.spec.ts` mis à jour.
