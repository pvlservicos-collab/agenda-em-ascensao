const { sql, ensureSchema, normalizeFone } = require('../lib/db');
const { rateLimited } = require('../lib/rateLimit');

module.exports = async function handler(req, res) {
  await ensureSchema();

  const fone = normalizeFone(req.query.fone);
  if (fone.length < 10) return res.status(400).json({ error: 'Número inválido.' });

  if (req.method === 'GET') {
    if (await rateLimited(req, res, { scope: 'exclusao_get', limit: 15, windowMs: 10 * 60 * 1000 })) return;

    const [lead] = await sql`SELECT nome FROM leads WHERE whatsapp = ${fone}`;
    if (!lead) return res.status(200).json({ found: false });
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM eventos WHERE whatsapp = ${fone}`;
    return res.status(200).json({ found: true, nome: lead.nome, eventos: count });
  }

  if (req.method === 'DELETE') {
    // no máx. 1 tentativa a cada 1 min por IP
    if (await rateLimited(req, res, { scope: 'exclusao_delete_cooldown', limit: 1, windowMs: 1 * 60 * 1000 })) return;
    // ...e no máx. 2 exclusões por IP (janela bem longa = efetivamente um limite permanente)
    if (await rateLimited(req, res, { scope: 'exclusao_delete_max', limit: 2, windowMs: 10 * 365 * 24 * 60 * 60 * 1000 })) return;

    const [{ count: eventosCount }] = await sql`SELECT count(*)::int AS count FROM eventos WHERE whatsapp = ${fone}`;
    const leadRows = await sql`DELETE FROM leads WHERE whatsapp = ${fone} RETURNING id`;
    await sql`DELETE FROM eventos WHERE whatsapp = ${fone}`;
    if (leadRows.length === 0 && eventosCount === 0) {
      return res.status(404).json({ error: 'Nenhum dado encontrado para este número.' });
    }
    return res.status(200).json({ ok: true, deletados: { leads: leadRows.length, eventos: eventosCount } });
  }

  res.setHeader('Allow', 'GET, DELETE');
  return res.status(405).json({ error: 'Método não permitido.' });
};
