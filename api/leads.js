const { sql, ensureSchema, normalizeFone } = require('../lib/db');
const { rateLimited } = require('../lib/rateLimit');

const AGENDA_MAX_CHARS = 30000;

module.exports = async function handler(req, res) {
  await ensureSchema();

  if (req.method === 'GET') {
    if (await rateLimited(req, res, { scope: 'leads_get', limit: 20, windowMs: 10 * 60 * 1000 })) return;

    const whatsapp = normalizeFone(req.query.whatsapp);
    if (whatsapp.length < 10) return res.status(400).json({ error: 'WhatsApp inválido.' });

    const [lead] = await sql`SELECT id, nome, agenda FROM leads WHERE whatsapp = ${whatsapp}`;
    if (!lead) return res.status(200).json({ found: false });
    return res.status(200).json({ found: true, id: lead.id, nome: lead.nome, agenda: lead.agenda || null });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (await rateLimited(req, res, { scope: 'leads_post', limit: 15, windowMs: 10 * 60 * 1000 })) return;

  const body = req.body || {};
  const nome = String(body.nome || '').trim().slice(0, 200);
  const whatsapp = normalizeFone(body.whatsapp).slice(0, 15);
  const email = body.email ? String(body.email).trim().slice(0, 200) : null;
  const sessionId = body.session_id ? String(body.session_id).slice(0, 100) : null;
  const agenda = body.agenda ? JSON.stringify(body.agenda) : null;
  const leadId = Number.isInteger(body.id) || /^\d+$/.test(String(body.id || '')) ? parseInt(body.id, 10) : null;

  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (whatsapp.length < 10) return res.status(400).json({ error: 'WhatsApp inválido.' });
  if (agenda && agenda.length > AGENDA_MAX_CHARS) return res.status(413).json({ error: 'Dados da agenda excedem o tamanho permitido.' });

  // se já conhecemos o id do lead (devolvido numa chamada anterior), atualiza direto por id —
  // garante que tudo (instagram, área de atuação, faturamento, investimento) cai na mesma linha
  // da pessoa, mesmo que o texto do whatsapp tenha variado entre uma chamada e outra.
  let lead = null;
  if (leadId) {
    [lead] = await sql`
      UPDATE leads SET
        nome = ${nome},
        whatsapp = ${whatsapp},
        email = COALESCE(${email}, email),
        session_id = COALESCE(${sessionId}, session_id),
        agenda = COALESCE(${agenda}::jsonb, agenda),
        atualizado_em = now()
      WHERE id = ${leadId}
      RETURNING id, false AS is_new
    `;
  }

  if (!lead) {
    [lead] = await sql`
      INSERT INTO leads (nome, whatsapp, email, session_id, agenda)
      VALUES (${nome}, ${whatsapp}, ${email}, ${sessionId}, ${agenda}::jsonb)
      ON CONFLICT (whatsapp) DO UPDATE
        SET nome = EXCLUDED.nome,
            email = COALESCE(EXCLUDED.email, leads.email),
            session_id = COALESCE(EXCLUDED.session_id, leads.session_id),
            agenda = COALESCE(EXCLUDED.agenda, leads.agenda),
            atualizado_em = now()
      RETURNING id, (xmax = 0) AS is_new
    `;
  }

  if (lead.is_new) {
    await sql`
      INSERT INTO eventos (tipo, session_id, whatsapp, lead_id, dados)
      VALUES ('lead_submit', ${sessionId}, ${whatsapp}, ${lead.id}, ${JSON.stringify({ nome })})
    `;
  }

  return res.status(200).json({ ok: true, id: lead.id });
};
