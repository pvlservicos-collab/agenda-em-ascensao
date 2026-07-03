const { sql, ensureSchema, normalizeFone } = require('../lib/db');

module.exports = async function handler(req, res) {
  await ensureSchema();

  const fone = normalizeFone(req.query.fone);
  if (fone.length < 10) return res.status(400).json({ error: 'Número inválido.' });

  if (req.method === 'GET') {
    const [lead] = await sql`SELECT nome FROM leads WHERE whatsapp = ${fone}`;
    if (!lead) return res.status(200).json({ found: false });
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM eventos WHERE whatsapp = ${fone}`;
    return res.status(200).json({ found: true, nome: lead.nome, eventos: count });
  }

  if (req.method === 'DELETE') {
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
