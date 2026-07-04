-- Copiez-collez ce code dans l'éditeur SQL de Supabase

-- Date de mise en ligne réelle sur Vinted (distincte de la date d'achat) :
-- utilisée pour le rappel de republication, qui se basait à tort sur la date
-- d'achat (faussé si l'article passe du temps en laver/photo avant d'être
-- publié). Se met à jour à chaque fois qu'un article entre dans l'étape
-- "En stock".
ALTER TABLE articles ADD COLUMN IF NOT EXISTS published_at DATE;

NOTIFY pgrst, 'reload schema';
