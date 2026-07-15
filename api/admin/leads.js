const { sql, ensureSchema } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { buildLeadsWhere } = require('../../lib/leadsFilter');

const PAGE_SIZE = 20;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  if (!requireAdmin(req, res)) return;

  await ensureSchema();

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
