# On Stride

L’espace de travail simple pour organiser tes projets, tes clients et ton travail.

Site statique (aucune compilation) + Supabase pour la connexion et les données.
Le guide de mise en ligne est dans [LISEZ-MOI.md](LISEZ-MOI.md).

## Les plus

- **Tableau blanc** : dans chaque projet, un espace libre où poser des blocs, les déplacer et les relier entre eux. Les cartes à faire du Kanban s’y affichent toutes seules : un lien entre deux cartes indique laquelle doit être finie d’abord, et la suivante affiche « En attente de… ».
- **Chrono et rentabilité** : un chrono sur chaque carte de tes projets. Le temps reste privé ; avec le montant du projet, il donne ton taux horaire réel.
- **Point client** : un message d’avancement écrit à partir de tes cartes (terminé, en cours, prochaines étapes), à copier ou à ouvrir dans ta messagerie.
- **Mode Focus** : depuis l’accueil, une seule tâche à l’écran, la plus utile à faire maintenant (en retard, du jour, prioritaire, pas bloquée par une autre).
- **À encaisser** : un bloc d’accueil qui liste ce qu’on te doit, avec un message de relance prêt à envoyer pour les projets livrés.
- **Cartes récurrentes** : une carte peut se répéter chaque jour, semaine ou mois ; terminée, elle revient à la prochaine date.
- **Mail** : une messagerie entre personnes du site, présentée comme une boîte mail (reçus, envoyés, objet, réponses, non lus, recherche). Tout le monde lit ; écrire est réservé à Premium (15 messages par heure) et Pro (150).
- **Bazar** : les tâches notées en vrac, à ranger plus tard (appelé Inbox au tout début).
- **Mon rythme** : un bloc d’accueil avec les cartes terminées sur 7 jours, comparées aux 7 d’avant.
- **Dupliquer un projet** : pour s’en servir comme modèle (colonnes, labels, cartes, tableau blanc).
- **Thèmes à effets** (Premium et Pro) : Sakura, Aurore, Océan. Couleurs et fond du thème, petit effet à chaque clic ; en Pro, le fond s’anime.
- **Chef de projet** : un admin du site invité sur un projet peut y modifier le contenu et gérer les invités, sans voir les infos privées du propriétaire.
- **Raccourcis clavier modifiables** : dans Réglages, on change chaque raccourci, on en supprime et on en crée (aller à une page, ouvrir un projet précis, lancer le mode Focus…). Ils suivent le compte d’un appareil à l’autre.
- **Plusieurs personnes par carte** et des **responsables par projet** : on ajoute les noms un par un (Entrée ou virgule), avec des suggestions.
- **Dossiers dans le Bazar** : pour ranger les tâches en vrac avant de les mettre dans un projet (menu ou glisser-déposer).

Mail et le rôle de chef de projet passent par la base de données ; le reste vit dans `js/extras.js`, `js/more.js` et `js/skins.js`. Mail (`js/mail.js`) utilise la table `messages` : il faut relancer `supabase/schema.sql` une fois, voir [LISEZ-MOI.md](LISEZ-MOI.md).
