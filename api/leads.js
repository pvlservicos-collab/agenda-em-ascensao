const { sql, ensureSchema, normalizeFone } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  await ensureSchema();

  const body = req.body || {};
  const nome = String(body.nome || '').trim().slice(0, 200);
  const whatsapp = normalizeFone(body.whatsapp);
  const email = body.email ? String(body.email).trim().slice(0, 200) : null;
  const sessionId = body.session_id ? String(body.session_id).slice(0, 100) : null;

  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (whatsapp.length < 10) return res.status(400).json({ error: 'WhatsApp inválido.' });

  const [lead] = await sql`
    INSERT INTO leads (nome, whatsapp, email, session_id)
    VALUES (${nome}, ${whatsapp}, ${email}, ${sessionId})
    ON CONFLICT (whatsapp) DO UPDATE
      SET nome = EXCLUDED.nome,
          email = COALESCE(EXCLUDED.email, leads.email),
          session_id = COALESCE(EXCLUDED.session_id, leads.session_id),
          atualizado_em = now()
    RETURNING id
  `;

  await sql`
    INSERT INTO eventos (tipo, session_id, whatsapp, dados)
    VALUES ('lead_submit', ${sessionId}, ${whatsapp}, ${JSON.stringify({ nome })})
  `;

  return res.status(200).json({ ok: true, id: lead.id });
};
