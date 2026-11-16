# Contact organisateur, photo de profil, tri et partage

## 1. Lien groupe WhatsApp / contact organisateur

- Nouveau champ facultatif sur la session : lien d'invitation WhatsApp (validé : doit commencer par `https://chat.whatsapp.com/` ou `https://wa.me/`).
- Ajouté au formulaire de création/modification (« Lien du groupe WhatsApp — facultatif »).
- Sur le détail de session : bouton « Rejoindre le groupe WhatsApp » (icône, ouverture dans un nouvel onglet) visible seulement si le lien existe.
- Sur le détail, bloc « Organisateur » avec avatar + prénom, et le bouton de contact juste à côté.

## 2. Photo de profil par téléversement

- Espace de stockage public dédié aux avatars, avec droits : lecture pour tous, écriture/suppression limitée au propriétaire de sa propre image.
- Page Profil : bouton « Changer la photo » ouvrant le sélecteur de fichiers (appareil photo compatible mobile), aperçu immédiat, images limitées à ~5 Mo (JPEG/PNG/WebP), redimensionnement côté navigateur avant envoi.
- Le champ « URL de l'image » reste disponible en secours.
- Bouton « Retirer la photo » (retour aux initiales).

## 3. Tri des sessions

- Barre de tri sur l'accueil, sous les onglets de catégorie : **Date** (défaut), **Lieu** (alphabétique), **Horaire** (heure de début).
- Bouton d'inversion croissant/décroissant.
- Le choix est conservé pendant la navigation ; la session « PROCHAINE SESSION » reste identifiée par la vraie prochaine date, quel que soit le tri.

## 4. Partage par lien direct

- Bouton « Partager » sur le détail de session : utilise le partage natif du téléphone quand disponible (WhatsApp, SMS…), sinon copie le lien dans le presse-papiers avec confirmation.
- Texte partagé : titre/date, horaires, lieu + lien vers la session.
- Le lien reste privé : une personne non connectée est redirigée vers la connexion, puis renvoyée automatiquement vers la session une fois connectée.

## Détails techniques

- Migration : colonne `whatsapp_url` (text, nullable) sur `game_sessions` ; bucket de stockage `avatars` (public en lecture) + politiques par dossier `auth.uid()`.
- `SessionInput` et `SessionRow` étendus ; formulaire et mutations mis à jour.
- Tri en mémoire dans `src/routes/_authenticated/index.tsx` (état local `sortKey`/`sortDir`), aucun changement de requête.
- Upload via le client de stockage côté navigateur depuis la page profil, puis `upsertProfile` avec l'URL publique.
- Redirection post-connexion : la garde d'authentification transmet le chemin demandé, `auth.tsx` y renvoie après session établie.
- Partage : `navigator.share` avec repli `navigator.clipboard`.
