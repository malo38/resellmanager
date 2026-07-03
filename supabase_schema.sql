-- Copiez-collez ce code dans l'éditeur SQL de Supabase

-- 1. Créer la table articles
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  buy_price NUMERIC DEFAULT 0,
  sell_price NUMERIC DEFAULT 0,
  platform TEXT DEFAULT 'Autre',
  status TEXT DEFAULT 'stock',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activer la sécurité (chaque user voit uniquement ses articles)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own articles" ON articles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own articles" ON articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own articles" ON articles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own articles" ON articles
  FOR DELETE USING (auth.uid() = user_id);
