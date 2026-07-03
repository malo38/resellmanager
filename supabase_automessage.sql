-- ============================================================
-- Vinted Manager — Envoi automatique de messages aux favoris
-- Copiez-collez dans Supabase SQL Editor
-- ============================================================

-- 1. Réglages de l'envoi automatique (1 ligne par utilisateur)
CREATE TABLE IF NOT EXISTS vinted_automessage_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  template TEXT DEFAULT '',
  delay_min_sec INTEGER DEFAULT 60,
  delay_max_sec INTEGER DEFAULT 180,
  daily_limit INTEGER DEFAULT 20,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vinted_automessage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own automessage settings" ON vinted_automessage_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own automessage settings" ON vinted_automessage_settings
  FOR ALL USING (auth.uid() = user_id);

-- 2. Historique des messages envoyés automatiquement (+ dédoublonnage)
-- id = id de la notification Vinted (favori), donc naturellement unique par événement.
CREATE TABLE IF NOT EXISTS vinted_sent_messages (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_login TEXT,
  recipient_id TEXT,
  item_id TEXT,
  item_title TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vinted_sent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sent messages" ON vinted_sent_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own sent messages" ON vinted_sent_messages
  FOR ALL USING (auth.uid() = user_id);
