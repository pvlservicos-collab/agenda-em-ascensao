-- Agenda em Ascensão — schema do banco (Neon Postgres)
-- Aplicado automaticamente pelo scripts/migrate.js na primeira execução de qualquer função da API.

CREATE TABLE IF NOT EXISTS leads (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  whatsapp    TEXT NOT NULL UNIQUE,
  email       TEXT,
  session_id  TEXT,
  agenda      JSONB,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS agenda JSONB;

CREATE TABLE IF NOT EXISTS eventos (
  id          BIGSERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL,
  session_id  TEXT,
  whatsapp    TEXT,
  dados       JSONB,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eventos_tipo_idx    ON eventos (tipo);
CREATE INDEX IF NOT EXISTS eventos_criado_idx  ON eventos (criado_em);
CREATE INDEX IF NOT EXISTS eventos_whats_idx   ON eventos (whatsapp);
CREATE INDEX IF NOT EXISTS leads_criado_idx    ON leads (criado_em);
