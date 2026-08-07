-- ============================================================
-- VintControl — Ajout en masse par lot (fournisseur, facture, SKU partagé)
-- Copiez-collez dans Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own suppliers" ON suppliers;
CREATE POLICY "own suppliers" ON suppliers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Un "lot" = une commande groupée (ex: 10 exemplaires du même article achetés
-- en gros). Chaque exemplaire reste un article séparé dans `articles` (sku
-- individuel conservé — nécessaire pour le rattachement fiable par #SKU sur
-- Vinted, voir resolve_sku côté backend : des SKU identiques feraient
-- correspondre plusieurs annonces différentes à une seule fiche). Le lot,
-- lui, porte l'info commune (fournisseur, facture, coût total...) et sert de
-- "référence de commande" partagée, dans l'esprit de la demande initiale
-- ("SKU unique pour le lot") sans casser le système de rattachement Vinted
-- existant qui suppose un SKU unique par article.
CREATE TABLE IF NOT EXISTS article_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  already_sold_elsewhere INTEGER NOT NULL DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  target_sell_price NUMERIC DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  vat_regime TEXT DEFAULT '',
  purchase_date DATE,
  notes TEXT DEFAULT '',
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE article_lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own lots" ON article_lots;
CREATE POLICY "own lots" ON article_lots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE articles ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES article_lots(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
