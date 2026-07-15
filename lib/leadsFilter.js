const PERIODOS = {
  hoje: "date_trunc('day', now())",
  '7d': "now() - interval '7 days'",
  '30d': "now() - interval '30 days'",
};

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
}

function buildLeadsWhere(query) {
  const periodExpr = PERIODOS[query.period] || null;
  const q = query.q ? String(query.q).trim() : '';
  const from = isValidDate(query.from) ? query.from : null;
  const to = isValidDate(query.to) ? query.to : null;

  const whereParts = [];
  const params = [];
  if (periodExpr) whereParts.push(`criado_em >= ${periodExpr}`);
  if (from) {
    params.push(from);
    whereParts.push(`criado_em >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    whereParts.push(`criado_em < ($${params.length}::date + interval '1 day')`);
  }
  if (q) {
    params.push(`%${q}%`);
    whereParts.push(`(nome ILIKE $${params.length} OR whatsapp ILIKE $${params.length})`);
  }
  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  return { where, params };
}

module.exports = { buildLeadsWhere };
