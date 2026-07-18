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
  lead_id     INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  dados       JSONB,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- liga cada evento ao lead pelo id do banco (mais confiável que casar por texto de whatsapp)
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS eventos_tipo_idx    ON eventos (tipo);
CREATE INDEX IF NOT EXISTS eventos_criado_idx  ON eventos (criado_em);
CREATE INDEX IF NOT EXISTS eventos_whats_idx   ON eventos (whatsapp);
CREATE INDEX IF NOT EXISTS eventos_lead_idx    ON eventos (lead_id);
CREATE INDEX IF NOT EXISTS leads_criado_idx    ON leads (criado_em);

-- contador de tentativas por IP/rota, usado pelo rate limiter (lib/rateLimit.js)
CREATE TABLE IF NOT EXISTS rate_limits (
  chave         TEXT PRIMARY KEY,
  contagem      INT NOT NULL DEFAULT 1,
  janela_inicio TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IPs ignorados nas métricas (ex.: o próprio admin testando o site) — api/track.js pula esses
CREATE TABLE IF NOT EXISTS ignored_ips (
  ip        TEXT PRIMARY KEY,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
