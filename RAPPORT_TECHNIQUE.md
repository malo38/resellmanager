# Vinted Manager — Rapport technique (session du 2026-07-02)

## Architecture générale

Le projet est réparti sur 3 composants indépendants (pas de mono-repo) :

| Composant | Dossier local | Dépôt GitHub | Déploiement |
|---|---|---|---|
| Site (frontend) | `resellpro 17` | `malo38/resellmanager` | Vercel — https://vintedmanager-three.vercel.app |
| Backend (API) | `vinted-backend 5` | `malo38/vinted-manager-backend` | Railway — https://web-production-662dc1.up.railway.app |
| Extension Chrome | `vinted-manager-extension` | aucun (pas de repo git) | Chrome Web Store (ID `feedjnhhdfeojkocphjgnbjginadclip`, en cours d'examen) |

**Stack** : HTML/CSS/JS vanilla (pas de build) côté site, FastAPI + supabase-py côté backend, Manifest V3 côté extension. Base de données et auth : Supabase (Postgres + RLS + Supabase Auth). Le site et l'extension utilisent tous les deux la clé anonyme Supabase directement (le backend utilise la clé service_role pour les upserts).

Les dépôts `resellpro 17` et `vinted-backend 5` sont maintenant de vrais dépôts git connectés à leurs remotes GitHub (authentification via `gh` CLI, configuré sur cette machine). L'extension n'a pas de dépôt : le code local sert à la fois au chargement "non empaqueté" pour le dev et au zip soumis au Chrome Web Store.

---

## Flux de synchronisation Vinted → App

1. L'extension (`background.js`) tourne en arrière-plan tant que Chrome est ouvert.
2. Toutes les 5 min (`chrome.alarms`), si un onglet `vinted.fr` est ouvert et connecté, elle exécute un script dans le contexte de cet onglet (`chrome.scripting.executeScript`) pour appeler l'API interne de Vinted (`/api/v2/my_orders`, `/api/v2/wardrobe/{id}/items`, `/api/v2/inbox`) en utilisant les cookies de session déjà présents.
3. Les données (ventes, achats, annonces, messages) sont envoyées via `POST /api/extension/sync` au backend, authentifié par un JWT Supabase (token de l'utilisateur Vinted Manager, pas de Vinted).
4. Le backend upsert ces données dans les tables Supabase (`articles`, `vinted_purchases`, `vinted_conversations`, `vinted_accounts`), clé de dédoublonnage = `vinted_item_id` / id de transaction.
5. Le site lit ces tables directement via le client Supabase (RLS : chaque utilisateur ne voit que ses lignes).

---

## Changements de cette session

### Fonctionnalité retirée : envoi automatique de messages aux favoris
Une fonctionnalité d'auto-DM aux utilisateurs ayant mis un article en favori avait été développée (toggle sur le site, endpoints backend, logique dans l'extension). **Elle a été entièrement retirée** après vérification en conditions réelles : Vinted bloque l'ouverture programmatique de conversation (`POST /api/v2/conversations`) avec un `403 {"code":106,"message_code":"access_denied"}`, **même avec un contrat d'API strictement identique à celui utilisé par leur propre frontend** (vérifié via DevTools sur un vrai clic utilisateur) et **même sur un compte jamais contacté auparavant**. Conclusion : protection anti-bot côté Vinted, pas un bug de code. Il ne reste que le bouton "Copier le message" (envoi manuel).

Fichiers concernés : `background.js` (fonctions supprimées : `runAutoMessage`, `sendMessageToBuyer`, `fetchFavoritesNotifications`), `popup.js`/`popup.html`, `main.py` (endpoints supprimés : `/api/extension/automessage-config`, `/api/settings/automessage`, `/api/extension/mark-messaged`, `/api/extension/sent-messages`, `/api/extension/debug-notifications`), `index.html`/`app.js` (page "Messages favoris" simplifiée).

**Dette restante** : les tables Supabase `vinted_automessage_settings` et `vinted_sent_messages` existent toujours en base mais ne sont plus utilisées par aucun code — jamais supprimées (pas de DROP TABLE fait par prudence). `supabase_automessage.sql` est obsolète.

### Bugs corrigés
- **Photos manquantes sur le stock** : la sync des annonces actives (`annonces` → `status: "stock"`) ne récupérait jamais de photo, contrairement aux ventes. Corrigé dans `background.js` (`photo: i.photo?.url || i.photos?.[0]?.url`) et `main.py` (ajout de `photo_url` dans l'upsert). Champ deviné (non vérifié sur la doc Vinted), mais confirmé fonctionnel via resync réelle.
- **Profit affiché sur articles non vendus** : `articleHTML()` affichait `sell_price - buy_price` même pour un article encore en stock (juste "mis en vente à X€", pas vendu), ce qui affichait un faux profit positif. Corrigé : le profit affiché est 0€ tant que `status !== 'vendu'`.
- **Déconnexions répétées (token expiré)** : `popup.js` ne stockait que le `access_token` Supabase (expire ~1h) et jetait le `refresh_token`, forçant une reconnexion manuelle régulière pour **tous les utilisateurs**, pas seulement en dev. Corrigé : le `refresh_token` est stocké, et `background.js` renouvelle le token proactivement (alarme toutes les 45 min) et réactivement (retry automatique sur 401 dans `backendFetch`).
- **Logo non transparent** : les fichiers logo (`light.png`/`dark.png`, hébergés sur Supabase Storage) avaient un fond opaque intégré (blanc/noir), visible en bordure sur les nouveaux fonds de la landing page. Retraités avec Pillow (seuillage colorimétrique sur les coins) pour un vrai fond transparent, puis rehébergés directement dans le repo (`img/logo-light.png`, `img/logo-dark.png`) plutôt que sur Supabase Storage — évite toute dépendance externe pour un asset statique.

### Fonctionnalités ajoutées
- **Page "Messages Vinted"** (`js/app.js` : `renderMessages()`) : affiche la table `vinted_conversations` (déjà synchronisée mais jamais exploitée par l'UI avant), avec badge de non-lus dans la sidebar.
- **Badges vues/favoris** sur les articles en stock synchronisés (`vinted_vues`, `vinted_favoris`, colonnes déjà en base mais jamais affichées).
- **Bandeau de statut de synchronisation** sur le tableau de bord (`renderSyncBanner()`), lit `vinted_accounts`.
- **Détection automatique des achats** : l'extension appelle en plus `/my_orders?order_type=purchased` (paramètre découvert via l'URL de la page Vinted `vinted.fr/my_orders?order_type=purchased`, observée en pratique). Les achats sont synchronisés dans une nouvelle table `vinted_purchases` (SQL : `vinted-backend 5/supabase_purchases.sql`) et affichés en KPI "🛍️ Achats Vinted ce mois" sur le dashboard. **Non vérifié** : le compte de test n'avait aucun achat réel, la structure de champ est supposée identique à celle des ventes (même endpoint) mais jamais confirmée sur un vrai achat.
- **Page d'accueil (landing page)** pour les visiteurs non connectés (`#landingScreen`) : hero "avant/après" (galère manuelle vs automatisation), grille de 6 fonctionnalités, section "Comment ça marche" en 3 étapes, footer avec lien vers `privacy.html`. Thème clair dédié (palette scoppée en CSS via variables `--l-*`, indépendante du thème sombre/clair de l'app elle-même).
- **Thème clair par défaut** : l'app démarrait en sombre par défaut (`data-theme="dark"`). Changé en clair partout (landing, connexion, app). Migration automatique : tout visiteur ayant déjà silencieusement une préférence "sombre" enregistrée (ancien défaut) est basculé une seule fois vers le clair au prochain chargement (flag `theme_default_migrated` dans localStorage), sans écraser un choix "sombre" fait après cette bascule.
- **`privacy.html`** : politique de confidentialité requise par le Chrome Web Store (le lien précédent ne pointait vers rien de valide, cause du premier rejet de l'extension).

### Nettoyage
- Dossiers fantômes `{css,js}` (dans `resellpro 17`) supprimés — artefact d'une commande shell mal échappée, vide, non suivi par git.
- `.gitignore` ajoutés sur les deux repos git (`.DS_Store`, `.env`, `__pycache__`, `.claude/`).

---

## État de l'extension Chrome Web Store

- ID : `feedjnhhdfeojkocphjgnbjginadclip`
- Premier envoi rejeté : lien de politique de confidentialité invalide → corrigé (`privacy.html` publiée, lien mis à jour dans le Developer Dashboard) → resoumis.
- Statut actuel : **Pending review**.
- Important : **la version soumise à Google ne contient aucune des fonctionnalités développées cette session** (photos, achats, refresh token, etc.) — c'était juste la sync de base. Une fois cette première version approuvée, il faudra soumettre une mise à jour (bump de version, ex. `1.1.0`) avec le code local à jour pour que les utilisateurs en bénéficient.

---

## Points d'attention pour la suite

1. Vérifier la détection des achats sur un vrai achat Vinted (structure de champ non confirmée).
2. Nettoyer ou ignorer les tables Supabase obsolètes (`vinted_automessage_settings`, `vinted_sent_messages`).
3. Préparer la mise à jour de l'extension (nouvelle version zip) une fois la première approuvée.
4. Le site a déjà des utilisateurs actifs réels (retours directs à l'auteur) — toute régression a un impact réel, pas seulement en dev.
