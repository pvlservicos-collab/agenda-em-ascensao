const { sql, ensureSchema, normalizeFone } = require('../lib/db');

const EVENTOS_VALIDOS = new Set(['site_view', 'wizard_complete', 'cta_diag', 'cta_form', 'cta_insta']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  await ensureSchema();

  const body = req.body || {};
  const tipo = String(body.event || '');
  if (!EVENTOS_VALIDOS.has(tipo)) return res.status(400).json({ error: 'Evento inválido.' });

  const sessionId = body.session_id ? String(body.session_id).slice(0, 100) : null;
  const whatsapp = body.whatsapp ? normalizeFone(body.whatsapp) : null;
  const { event, session_id, whatsapp: _w, ...extras } = body;

  await sql`
    INSERT INTO eventos (tipo, session_id, whatsapp, dados)
    VALUES (${tipo}, ${sessionId}, ${whatsapp}, ${JSON.stringify(extras)})
  `;

  return res.status(200).json({ ok: true });
};
