const { sql, ensureSchema, normalizeFone } = require('../lib/db');
const { rateLimited } = require('../lib/rateLimit');

const EVENTOS_VALIDOS = new Set(['site_view', 'wizard_complete', 'cta_diag', 'cta_form', 'cta_form_submit', 'cta_consultor', 'cta_insta', 'export_ics']);
const EXTRAS_MAX_CHARS = 5000;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  await ensureSchema();
  if (await rateLimited(req, res, { scope: 'track', limit: 120, windowMs: 5 * 60 * 1000 })) return;

  const body = req.body || {};
  const tipo = String(body.event || '');
  if (!EVENTOS_VALIDOS.has(tipo)) return res.status(400).json({ error: 'Evento inválido.' });

  const sessionId = body.session_id ? String(body.session_id).slice(0, 100) : null;
  const whatsapp = body.whatsapp ? normalizeFone(body.whatsapp).slice(0, 15) : null;
  const { event, session_id, whatsapp: _w, ...extras } = body;
  const extrasStr = JSON.stringify(extras);
  if (extrasStr.length > EXTRAS_MAX_CHARS) return res.status(413).json({ error: 'Dados excedem o tamanho permitido.' });

  await sql`
    INSERT INTO eventos (tipo, session_id, whatsapp, dados)
    VALUES (${tipo}, ${sessionId}, ${whatsapp}, ${extrasStr})
  `;

  return res.status(200).json({ ok: true });
};
