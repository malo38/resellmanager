# 🚀 Guide de mise en ligne — ResellPro

## Ce que vous allez faire
1. Créer une base de données gratuite sur **Supabase** (stockage des données)
2. Connecter votre site à Supabase
3. Mettre le site en ligne gratuitement sur **Vercel**

Durée estimée : **20-30 minutes**

---

## ÉTAPE 1 — Créer votre base de données Supabase

1. Allez sur **https://supabase.com** et cliquez sur **"Start your project"**
2. Créez un compte gratuit (avec Google ou Email)
3. Cliquez sur **"New project"**
4. Donnez un nom à votre projet : `resellpro`
5. Choisissez un mot de passe fort et la région **"West EU (Ireland)"**
6. Cliquez sur **"Create new project"** (attendre ~1 minute)

### Créer la table articles

7. Dans le menu gauche, cliquez sur **"SQL Editor"**
8. Cliquez sur **"New query"**
9. Copiez-collez tout le contenu du fichier `supabase_schema.sql`
10. Cliquez sur **"Run"** (bouton vert)
11. Vous devriez voir "Success" ✅

### Récupérer vos clés

12. Dans le menu gauche, cliquez sur **"Project Settings"** (icône engrenage)
13. Cliquez sur **"API"**
14. Copiez :
    - **Project URL** → c'est votre `SUPABASE_URL`
    - **anon public** key → c'est votre `SUPABASE_ANON_KEY`

---

## ÉTAPE 2 — Connecter votre site à Supabase

1. Ouvrez le fichier `js/app.js`
2. Tout en haut du fichier, remplacez :
   ```
   const SUPABASE_URL = 'VOTRE_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'VOTRE_SUPABASE_ANON_KEY';
   ```
   Par vos vraies valeurs, par exemple :
   ```
   const SUPABASE_URL = 'https://abcdefgh.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';
   ```

---

## ÉTAPE 3 — Mettre en ligne sur Vercel

### Option A — Sans code (la plus simple) ✅

1. Allez sur **https://vercel.com** et créez un compte gratuit
2. Sur le tableau de bord, cliquez sur **"Add New → Project"**
3. Cliquez sur **"Upload"** (pas besoin de GitHub)
4. Glissez-déposez votre dossier `resellpro` entier
5. Cliquez sur **"Deploy"**
6. Après ~1 minute, Vercel vous donne une URL : `resellpro.vercel.app` 🎉

### Option B — Avec GitHub (recommandé pour les mises à jour)

1. Créez un compte sur **https://github.com**
2. Créez un nouveau dépôt public nommé `resellpro`
3. Uploadez vos fichiers dans ce dépôt
4. Sur Vercel, importez ce dépôt GitHub
5. À chaque modification sur GitHub, le site se met à jour automatiquement

---

## ÉTAPE 4 — Activer l'authentification Supabase

1. Dans Supabase, allez dans **"Authentication → Providers"**
2. L'Email est activé par défaut ✅
3. (Optionnel) Dans **"Authentication → URL Configuration"**,
   ajoutez votre URL Vercel dans "Site URL" : `https://resellpro.vercel.app`

---

## ✅ C'est terminé !

Votre site est maintenant en ligne. Chaque utilisateur peut :
- Créer son propre compte avec son email
- Se connecter depuis n'importe quel appareil
- Gérer ses articles en toute sécurité

## 🔒 Sécurité

Vos données sont protégées : chaque utilisateur ne peut voir **que ses propres articles** grâce aux règles de sécurité Supabase (Row Level Security).

---

## Besoin d'aide ?

- Supabase docs : https://supabase.com/docs
- Vercel docs : https://vercel.com/docs
- Ou demandez à Claude ! 😊
