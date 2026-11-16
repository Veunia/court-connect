# Passage en revue des 20 points de sécurité

Reprise point par point de la checklist, avec ce qui est déjà en place et ce que je modifierais.

## Déjà conforme (aucune action)

- **Clés API dans les variables d'environnement** — aucune clé n'est écrite en dur ; seule la clé publique est côté client.
- **RLS activée** — activée sur toutes les tables métier, avec cloisonnement par espace et par utilisateur (24 politiques).
- **Mots de passe hachés** — gérés par le service d'authentification, jamais stockés par l'app.
- **Droits vérifiés côté serveur** — RLS + fonctions `security definer` ; les outils agent (MCP) agissent avec le jeton de l'utilisateur.
- **Clé publique côté client** — c'est bien la clé publiable qui est exposée, jamais la clé secrète.
- **HTTPS partout** — imposé par l'hébergement.
- **Taille max des uploads** — avatars limités à 5 Mo.
- **Type de fichier vérifié** — JPEG / PNG / WebP uniquement à la sélection.
- **Message d'erreur unique à la connexion** — « Email ou mot de passe incorrect. » ne révèle pas si le compte existe ; le mot de passe oublié répond de façon neutre.
- **Protection des mots de passe compromis** — vérification HIBP déjà activée.

## Modifications prévues

1. **`.env` ignoré par Git** — ajouter `.env`, `.env.*` (sauf `.env.example`) au fichier d'exclusion : aujourd'hui il n'y est pas.
2. **Limitation des tentatives de connexion** — activer/renforcer les quotas côté service d'authentification (connexion, inscription, envoi d'emails) et ajouter un ralentissement progressif côté formulaire après plusieurs échecs, avec message clair.
3. **Expiration des sessions** — vérifier et fixer explicitement la durée de vie des jetons et la rotation des jetons de rafraîchissement ; déconnexion propre si le jeton est révoqué.
4. **Validation des entrées** — passer chaque écriture (session, profil, espace, invitation) par un schéma de validation partagé : longueurs max des textes, date/heures cohérentes (fin après début), capacité dans une plage réaliste, lien WhatsApp restreint aux domaines attendus, email normalisé. Même validation appliquée dans les outils agent.
5. **Vérification réelle du fichier image** — contrôler la signature binaire de l'image (pas seulement le type déclaré) et le nom de fichier généré côté client avant envoi.
6. **CORS / accès aux points d'entrée publics** — restreindre les en-têtes de réponse aux origines attendues sur les routes publiques (`/api/public/*`, `/mcp`, sitemap) et refuser les autres.
7. **Erreurs détaillées coupées en production** — s'assurer qu'aucune trace technique (message base de données, pile d'appels) n'atteint l'utilisateur : messages génériques à l'écran, détail uniquement dans les journaux serveur.
8. **Journalisation propre** — retirer/encadrer les traces de développement, ne jamais journaliser email, jeton ou contenu de session ; conserver la remontée d'erreurs serveur.
9. **Webhooks signés** — aucun webhook aujourd'hui ; je documente et prépare le gabarit vérifiant la signature (HMAC, comparaison à temps constant) pour tout futur point d'entrée sous `/api/public/*`.
10. **Dépendances à jour** — mise à jour des paquets ayant des correctifs disponibles (versions mineures/patch : outils de formulaire, notifications, SDK IA, routeur), sans changement de version majeure risqué, puis vérification que l'app démarre.
11. **Points 19-20 (laissés libres sur la liste)** — je propose : sauvegarde/restauration vérifiée de la base, et double contrôle des rôles administrateurs d'espace (aucun moyen d'obtenir le rôle admin autrement que par un admin existant).

## Détails techniques

- Validation : module `src/lib/validation.ts` avec schémas Zod réutilisés par `src/lib/basket.ts`, `src/lib/spaces.ts`, les formulaires et les outils MCP.
- Vérification image : lecture des premiers octets (magic bytes) dans `profil.tsx` avant redimensionnement Canvas.
- Limitation de débit : réglages côté service d'auth + compteur local d'échecs avec délai croissant dans `src/routes/auth.tsx`.
- Erreurs : centraliser le formatage utilisateur, garder `console.error` serveur (pipeline de remontée) et supprimer les traces client superflues.
- CORS : en-têtes explicites dans les gestionnaires de `src/routes/api/public/*` et `src/routes/mcp.ts`.
- Dépendances : `bun update` ciblé, sans passer `lucide-react`, `recharts`, `react-day-picker` en version majeure.
