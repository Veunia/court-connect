# BasketApp — sessions de basket entre amis

Webapp privée, mobile-first, 100 % en français, pour répondre à : « On joue quand, où, et on est combien ? »

## Backend (Lovable Cloud)

Activation de Lovable Cloud (base de données, comptes, temps réel).

- **profils** : prénom/nom, email, poste facultatif (meneur, arrière, ailier, ailier-fort, pivot), URL d'avatar, compteurs matchs joués / annulations.
- **sessions** : titre facultatif, date, heure début/fin, lieu, catégorie (intérieur / extérieur / tournoi), type (demi-terrain / tout-terrain), capacité max, organisateur, état (active / annulée).
- **inscriptions** : un joueur ↔ une session, unique.

Règles d'accès : tout membre connecté voit les sessions et les inscrits ; chacun ne gère que sa propre inscription ; seul l'organisateur modifie ou annule sa session. Aucune inscription publique : les comptes sont créés à l'avance (je créerai quelques comptes de test et des sessions d'exemple pour que l'app soit utilisable immédiatement).

## Écrans

**Connexion** — écran très simple : email + mot de passe, session conservée entre les visites. Pas de création de compte.

**Accueil (liste des sessions)**
- En-tête : logo/nom basket, avatar du joueur connecté (accès profil), bouton + (flottant en bas à droite sur mobile).
- Onglets : INTÉRIEUR | EXTÉRIEUR | TOURNOI.
- Uniquement les sessions futures et actives, tri chronologique ; la première porte le badge PROCHAINE SESSION.
- Carte : date en clair (MARDI 8 FÉVRIER), horaires, type de terrain, lieu, créateur, X / Y joueurs, barre d'affluence, bouton « Je m'inscris » / « Je me désinscris » / « COMPLET » (désactivé).
- État vide par onglet : « Aucune session prévue dans cette catégorie. » + bouton « Créer une session ».

**Détail d'une session** — toutes les infos (titre, date, horaires, lieu, catégorie, type, organisateur, inscrits/capacité), barre d'affluence, bouton inscription/désinscription, puis la grille des joueurs inscrits (avatar rond, prénom, poste) — 2 par ligne sur mobile. Pour l'organisateur uniquement : « Modifier la session » et « Annuler la session » (confirmation demandée ; la session passe à annulée, plus aucune inscription possible).

**Création / modification** — formulaire : titre facultatif, date, heure début, heure fin, lieu, catégorie, type, nombre max de joueurs (pré-rempli 12 en demi-terrain, 20 en tout-terrain, modifiable). La session apparaît immédiatement dans la liste.

**Profil** — avatar rond (ou initiales), prénom/nom, email, poste, matchs joués, annulations ; modification du nom, du poste et de l'URL d'image ; bouton « Se déconnecter ».

## Indicateur d'affluence

Barre de progression + libellé, avec un petit ballon de basket positionné sur la zone idéale.

- Demi-terrain : 0-5 INSUFFISANT (gris) · 6-10 OPTIMAL (vert) · 11-16 DENSE (orange) · 17-19 TRÈS DENSE (rouge).
- Tout-terrain : 0-9 INSUFFISANT · 10-16 OPTIMAL · 17-20 DENSE · 21-24 TRÈS DENSE.
- La capacité de la session est toujours prioritaire : atteinte = COMPLET (rouge foncé), inscriptions bloquées.

## Temps réel

Les inscriptions et désinscriptions se propagent automatiquement : compteur, barre d'affluence, libellé et liste des participants se mettent à jour sur tous les appareils ouverts, sans rechargement.

## Direction visuelle

Ambiance sportive sobre : fond clair, orange ballon en couleur d'accent, gris ardoise pour le texte, typographie condensée en majuscules pour les titres et dates. Cartes généreuses, coins arrondis, ombres douces, grandes zones tactiles. Une colonne sur mobile, contenu centré et grille multi-colonnes sur desktop. Pas de menus superflus.

## Détails techniques

- TanStack Start + TanStack Query ; routes : `/` (liste), `/session/$id`, `/session/nouvelle`, `/session/$id/modifier`, `/profil`, `/connexion`.
- Lecture/écriture via server functions authentifiées ; pages protégées sous le layout authentifié, redirection vers `/connexion` si non connecté.
- Temps réel via abonnement aux changements de la table des inscriptions + invalidation du cache Query.
- Logique d'affluence isolée dans un module partagé (seuils par type de terrain, capacité prioritaire) et testée.
- Dates et libellés formatés en français (fuseau local).
