-- ============================================================
-- VintControl — Adresse du point relais pour les achats en attente de retrait
-- Copiez-collez dans Supabase SQL Editor
-- ============================================================
-- Vinted ne donne aucune date limite de retrait (ni dans l'app, ni dans
-- l'API), mais le nom + l'adresse du point relais sont récupérables via le
-- message système de la conversation liée à l'achat. pickup_since est la
-- date d'arrivée au point relais (pas une échéance), utilisée pour afficher
-- "en attente depuis X jours".

ALTER TABLE vinted_purchases ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE vinted_purchases ADD COLUMN IF NOT EXISTS pickup_since DATE;

NOTIFY pgrst, 'reload schema';
