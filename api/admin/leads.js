const { sql, ensureSchema } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { buildLeadsWhere } = require('../../lib/leadsFilter');

const PAGE_SIZE = 20;

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  await ensureSchema();

  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id, 10);
    if (!id) return res.status(400).json({ error: 'id inválido.' });
    const [lead] = await sql`DELETE FROM leads WHERE id = ${id} RETURNING whatsapp`;
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' });
    await sql`DELETE FROM eventos WHERE whatsapp = ${lead.whatsapp}`;
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const { where, params } = buildLeadsWhere(req.query);

  const totalRows = await sql.query(`SELECT count(*)::int AS n FROM leads ${where}`, params);
  const total = totalRows[0].n;

  const itens = await sql.query(
    `SELECT id, nome, whatsapp, email, criado_em, agenda FROM leads ${where}
     ORDER BY criado_em DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    params
  );

  return res.status(200).json({ total, pagina: page, itens });
};
