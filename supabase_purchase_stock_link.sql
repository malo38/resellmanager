-- Copiez-collez ce code dans l'éditeur SQL de Supabase

-- Marque quels achats Vinted ont déjà donné lieu à un article de stock créé
-- automatiquement (voir /api/extension/sync). On backfille tout l'historique
-- existant à true pour NE PAS convertir rétroactivement les vieux achats en
-- stock "à laver" — seuls les nouveaux achats à partir de maintenant seront
-- transformés automatiquement.
ALTER TABLE vinted_purchases ADD COLUMN IF NOT EXISTS stock_created BOOLEAN DEFAULT FALSE;
UPDATE vinted_purchases SET stock_created = TRUE WHERE stock_created = FALSE;

NOTIFY pgrst, 'reload schema';
