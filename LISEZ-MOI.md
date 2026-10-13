# On Stride — mettre le site en ligne

Ce dossier est le site complet. Il n'y a rien à compiler : ce sont des fichiers à déposer chez un hébergeur.
Il lui faut une base de données et un système de connexion : on utilise **Supabase** (gratuit pour démarrer).

Compte 30 à 45 minutes la première fois. Les noms de menus peuvent changer légèrement chez Supabase, Google ou Discord.

## Étape 1 — Créer la base (Supabase)

1. Va sur https://supabase.com, crée un compte, puis **New project**. Choisis une région proche (par exemple Paris ou Francfort) et note le mot de passe de la base.
2. Dans le projet, ouvre **SQL Editor > New query**.
3. Ouvre le fichier `supabase/schema.sql` de ce dossier, copie tout son contenu, colle-le, clique **Run**. Tu dois voir « Success ».
4. Récupère deux valeurs (bouton **Connect** en haut, ou **Settings > API Keys**) :
   - l'adresse du projet, du type `https://abcdefgh.supabase.co` ;
   - la clé **publishable**, du type `sb_publishable_...`.

Ne prends jamais la clé « secret » ni « service_role » : elles donnent tous les droits.

## Étape 2 — Relier le site à la base

Ouvre `config.js` avec un éditeur de texte et colle les deux valeurs entre les guillemets :

```js
supabaseUrl: 'https://abcdefgh.supabase.co',
supabaseKey: 'sb_publishable_xxxxxxxx',
```

Tant que tu n'as pas activé Google ou Discord (étape 5), retire-les de la liste : `providers: []`.
La connexion par e-mail fonctionne tout de suite.

## Étape 3 — Mettre en ligne (Netlify)

1. Va sur https://app.netlify.com/drop
2. Glisse **ce dossier entier** dans la page.
3. Netlify te donne une adresse du type `https://nom-au-hasard.netlify.app`. Crée un compte pour garder le site (sinon il n'est pas conservé), et renomme-le dans **Site configuration > Change site name**.

Pour mettre à jour plus tard : onglet **Deploys**, et glisse de nouveau le dossier.

## Étape 4 — Autoriser ton adresse dans Supabase

Dans Supabase : **Authentication > URL Configuration**.

- **Site URL** : l'adresse de ton site, par exemple `https://avancee.netlify.app`
- **Redirect URLs** : ajoute la même adresse suivie de `/**`, par exemple `https://avancee-theta.vercel.app/**` (nécessaire pour les liens « mot de passe oublié »).

Sans ça, la connexion te renvoie vers une page d'erreur.

Tu peux maintenant ouvrir ton site et te connecter par e-mail.

## Étape 5 — Activer Google et Discord (facultatif)

Dans les deux cas, l'adresse de retour à donner est :
`https://TON-PROJET.supabase.co/auth/v1/callback`
(Supabase l'affiche dans **Authentication > Sign In / Providers**, dans la fiche de chaque fournisseur.)

**Google**
1. https://console.cloud.google.com > crée un projet > **APIs & Services > OAuth consent screen** (type « External », remplis le nom et ton e-mail).
2. **Credentials > Create credentials > OAuth client ID > Web application**.
3. Dans **Authorized redirect URIs**, colle l'adresse de retour ci-dessus.
4. Copie le **Client ID** et le **Client secret** dans Supabase : **Authentication > Sign In / Providers > Google**, active, enregistre.

**Discord**
1. https://discord.com/developers/applications > **New Application**.
2. Menu **OAuth2** : dans **Redirects**, ajoute l'adresse de retour ci-dessus.
3. Copie le **Client ID** et le **Client Secret** dans Supabase : **Authentication > Sign In / Providers > Discord**, active, enregistre.

Puis remets dans `config.js` : `providers: ['google', 'discord']`, et redépose le dossier sur Netlify.

## Mail : la messagerie

**Mail** est une boîte de messages entre personnes qui ont un compte sur ton site. On écrit à une adresse e-mail ; la personne lit le message en se connectant avec cette adresse (si elle n'a pas encore de compte, le message l'attend).
Le **Bazar** : les tâches notées en vrac, à ranger plus tard dans un projet.

**À faire une fois** : dans Supabase > **SQL Editor**, recolle tout le fichier `supabase/schema.sql` et clique **Run**. Il crée la table des messages et ne supprime rien. Tant que ce n'est pas fait, Mail affiche un message qui te le rappelle.

Règles imposées par le serveur : un message n'est visible que par la personne qui l'écrit et celle qui le reçoit ; on ne peut pas écrire au nom de quelqu'un d'autre.

### Qui peut écrire

Tout le monde peut **lire** les messages qu'il reçoit. **Écrire et répondre** est réservé aux formules payantes, avec un nombre de messages par heure :

- Gratuit : lecture seule ;
- Premium : 15 messages par heure ;
- Pro : 150 messages par heure.

Ces limites sont imposées par le serveur (fonction `my_mail_quota` dans `schema.sql`) ; pour les changer, modifie les chiffres à cet endroit et dans `js/plans.js`, puis relance le fichier SQL.

Aucun vrai e-mail n'est envoyé : la personne est prévenue par une notification dans l'appli (et sur son écran si elle a activé les notifications de bureau dans Réglages), tant que le site est ouvert chez elle.

## Devis et factures

Menu **Devis** (ou `G` puis `D`). **À faire une fois** : dans Supabase > **SQL Editor**, recolle tout le fichier `supabase/schema.sql` et clique **Run**. Il crée la table des devis et ne supprime rien. Tant que ce n'est pas fait, la page Devis affiche un message qui te le rappelle ; le reste du site fonctionne normalement.

Puis remplis **Réglages > Entreprise** : nom, adresse, SIRET, IBAN, TVA (ou « franchise en base » pour une micro-entreprise), délais par défaut. Ces infos sont imprimées sur chaque document.

- **Devis** : numéroté dès sa création (D-2026-001). « PDF » ouvre le document à imprimer ou enregistrer en PDF ; « Envoyer » prépare l'e-mail au client (joins le PDF). Accepté, il donne une **facture** (complète, d'acompte, puis de solde qui déduit les acomptes) ou un **projet** avec une carte par ligne, son client et son montant.
- **Facture** : elle reçoit son numéro quand tu la **valides** (F-2026-001), pour que les numéros se suivent sans trou. Ensuite elle ne se modifie plus : en cas d'erreur, annule-la et duplique-la. « Marquer payée » ajoute le montant à « Encaissé » du projet relié.
- Seul le propriétaire voit ses devis et factures, comme ses clients et ses montants.

Les mentions par défaut (pénalités de retard, indemnité de 40 €, art. 293 B du CGI) sont un point de départ : vérifie-les avec ton comptable.

## Formules : ce que chacune permet

| | Gratuit | Premium | Pro |
|---|---|---|---|
| Projets actifs | 3 | 15 | illimités |
| Photos par tâche | 2 | 6 | 15 |
| Fichiers par tâche | 2 (5 Mo) | 8 (20 Mo) | 20 (50 Mo) |
| Mail | lecture | 15 messages par heure | 150 messages par heure |
| Devis et factures | 3 par mois | illimités | illimités |
| Cartes récurrentes, dupliquer un projet, point client, relances, créer des raccourcis, thèmes à effets | non | oui | oui |
| Fond animé, taux horaire réel, export tableur (tâches, livre des recettes) | non | non | oui |

Tout est réglé dans `js/plans.js` (objet `PLANS`). Le nombre de projets et de messages est aussi imposé par le serveur : si tu changes ces deux chiffres, change-les aussi dans `supabase/schema.sql` (fonctions `my_project_quota` et `my_mail_quota`) et relance le fichier.

Une personne qui dépasse une limite après un changement (par exemple 5 projets actifs en Gratuit) garde tout ce qu'elle a : elle ne peut simplement plus en créer tant qu'elle n'est pas repassée sous la limite.

## Partager un projet

Ouvre un projet > **Partager** > entre l'adresse e-mail de la personne et choisis :

- **Lecteur** : voit le projet et ses cartes, ne modifie rien ;
- **Éditeur** : peut créer, déplacer et modifier les cartes, les colonnes et les labels.

**Chef de projet** : si quelqu'un invite un admin du site (toi) sur son projet, en lecteur ou en éditeur, l'admin y agit en chef de projet. Il peut modifier les cartes et inviter ou retirer des personnes, comme le propriétaire. Il ne voit pas le client, les montants ni les notes privées, et ne peut pas supprimer le projet. Cette règle est dans `supabase/schema.sql` : relance le fichier une fois pour l'activer.

Si un client avec une adresse e-mail est relié au projet, le site propose de l'inviter en un clic.

La personne se connecte au site **avec cette adresse** et retrouve le projet dans « Partagés avec moi ».
Aucun e-mail n'est envoyé automatiquement : envoie-lui le lien avec « Copier le lien du projet ».

Ce que les invités ne voient jamais, même en éditeur : ton Bazar, tes messages, tes autres projets, tes clients, les montants et les notes privées. C'est le serveur qui l'impose, pas seulement l'affichage.

## Installer comme une appli

- **iPhone** : ouvre le site dans Safari > bouton Partager > « Sur l'écran d'accueil ».
- **Android / PC (Chrome, Edge)** : menu du navigateur > « Installer l'application ».

Le site a besoin d'une connexion Internet : il n'y a pas de mode hors ligne.

## Limites à connaître

- **E-mails de connexion** : l'envoi intégré de Supabase est limité à quelques e-mails par heure. Pour un vrai usage, branche ton propre service d'envoi dans **Authentication > Emails > SMTP Settings**.
- **Offre gratuite Supabase** : un projet sans activité pendant une semaine est mis en pause ; il se réactive depuis le tableau de bord.
- **Volume** : le site charge au plus 1 000 lignes par table. Au-delà, il faudra ajouter une pagination.
- **Paiement, offre Pro, notifications par e-mail** : pas encore faits.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html`, `app.css` | la page et ses styles |
| `config.js` | **le seul fichier à modifier** |
| `js/backend.js` | connexion et échanges avec Supabase |
| `js/i18n.js`, `js/lang-en.js` | les langues (français et anglais) |
| `js/core.js`, `ui.js`, `views.js`, `overlays.js`, `main.js` | l'application |
| `vendor/supabase.js` | bibliothèque Supabase (version figée) |
| `supabase/schema.sql` | tables et règles d'accès, à exécuter une fois |
| `manifest.webmanifest`, `icons/` | installation comme appli |

## Photos

Dans une tâche, le bloc **Photos** permet d'ajouter jusqu'à 8 images (photo du téléphone, capture d'écran…). Elles sont réduites avant l'envoi (1600 px de côté au plus) et la première sert de couverture à la carte.

Les photos sont rangées dans le stockage de Supabase, dans un espace privé nommé `photos`, créé par `supabase/schema.sql`. Seules les personnes qui ont le droit de voir la tâche peuvent voir ses photos. **Si tu avais déjà lancé `schema.sql` avant l'arrivée des photos, relance-le une fois** (sans risque pour tes données).

L'offre gratuite de Supabase donne 1 Go de stockage, soit plusieurs milliers de photos réduites.

## Fichiers

Dans une tâche, le bloc **Fichiers** (au-dessus des photos) permet de joindre jusqu'à 10 fichiers de 25 Mo au plus : PDF, devis, documents, archives… Ils sont rangés dans l'espace privé `fichiers` de Supabase, avec les mêmes droits que la tâche. Comme pour les photos, **relance `supabase/schema.sql` une fois** pour créer cet espace.

## Notifications de bureau

Dans **Réglages > Notifications de bureau**, active les notifications sur chaque appareil : rappel des tâches du jour (une fois par jour) et activité des autres sur les projets partagés. Elles arrivent tant qu'On Stride est ouverte sur l'appareil (même en arrière-plan). Sur iPhone, il faut d'abord ajouter On Stride à l'écran d'accueil.

## Formules (Gratuit, Premium, Pro)

| | Gratuit | Premium — 4,99 €/mois ou 49 €/an | Pro — 9,99 €/mois ou 99 €/an |
|---|---|---|---|
| Projets actifs | 5 | illimités | illimités |
| Photos par tâche | 3 | 8 | 8 |
| Fichiers par tâche | 3 de 5 Mo | 10 de 25 Mo | 10 de 50 Mo |
| Couleurs en plus, badge | – | oui | oui |
| Export en tableur (Excel) | – | – | oui |

Pas encore de paiement en ligne : le bouton « Contacter » ouvre un e-mail vers l'adresse `contact` de `config.js`. Tu actives ensuite la formule toi-même dans **Admin** (menu de gauche, visible seulement par les admins) : adresse e-mail de la personne, formule, durée (1 mois, 1 an, ou sans fin).

Les admins sont listés dans la table `admins` (créée par `schema.sql` avec ton adresse). La limite de 5 projets est aussi vérifiée par le serveur ; les autres limites le sont par l'appli.

## Langues

Le site existe en **français** et en **anglais**. Il démarre dans la langue du navigateur (français si le navigateur est en français, anglais sinon). On change de langue sur la page de connexion (boutons FR / EN) ou dans **Réglages > Apparence et langue**. Le choix est mémorisé sur l'appareil.

Seule l'interface est traduite : les noms de projets, les tâches et les notes restent tels qu'ils ont été écrits.

Pour ajouter une langue : copie `js/lang-en.js`, traduis les textes de droite, ajoute le fichier dans `index.html` et la langue dans `I18N.langs` (`js/i18n.js`).
