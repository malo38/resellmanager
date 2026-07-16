-- ============================================================
-- VintControl — Adresse du point relais pour les achats en attente de retrait
-- Copiez-collez dans Supabase SQL Editor
-- ============================================================
-- Vinted ne donne aucune date limite de retrait (ni dans l'app, ni dans
-- l'API — même son endpoint de suivi le plus détaillé renvoie
-- estimated_detail: null, vérifié le 2026-07-16), mais le nom + l'adresse
-- du point relais et le code transporteur exact sont récupérables. Le site
-- s'en sert pour calculer une ESTIMATION du délai de retrait (jamais une
-- vraie échéance) à partir des durées habituelles connues par transporteur.
-- pickup_since est la date d'arrivée réelle au point relais.

ALTER TABLE vinted_purchases ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE vinted_purchases ADD COLUMN IF NOT EXISTS pickup_since DATE;
ALTER TABLE vinted_purchases ADD COLUMN IF NOT EXISTS pickup_carrier TEXT;

NOTIFY pgrst, 'reload schema';
