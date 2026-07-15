-- ============================================================
-- VintControl — Galerie multi-photos par article
-- Copiez-collez dans Supabase SQL Editor
-- ============================================================
-- photo_url (existante) reste la photo principale, pour tout le code qui
-- l'utilise déjà (grille, liste, cartes...). photo_urls est le tableau
-- complet, index 0 = principale, utilisé par la galerie d'édition et la
-- fiche article détaillée.

ALTER TABLE articles ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Rattrapage : les articles existants n'ont qu'une photo_url, on la met
-- dans photo_urls pour que la galerie d'édition les affiche correctement
-- dès la première ouverture.
UPDATE articles SET photo_urls = ARRAY[photo_url]
  WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR photo_urls = '{}');

NOTIFY pgrst, 'reload schema';
