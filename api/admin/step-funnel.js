const { sql, ensureSchema } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');

const PERIODOS = {
  hoje: "date_trunc('day', now())",
  '7d': "now() - interval '7 days'",
  '30d': "now() - interval '30 days'",
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  if (!requireAdmin(req, res)) return;

  await ensureSchema();

  const period = PERIODOS[req.query.period] ? req.query.period : '7d';
  const startExpr = PERIODOS[period];

  const steps = await sql.query(`
    SELECT
      dados->>'funnel' AS funnel,
      dados->>'step' AS step,
      COALESCE((dados->>'step_index')::int, 0) AS step_index,
      count(DISTINCT session_id)::int AS n
    FROM eventos
    WHERE tipo = 'step_view' AND criado_em >= ${startExpr} AND dados->>'funnel' IS NOT NULL
    GROUP BY 1, 2, 3
    ORDER BY 1, 3
  `);

  return res.status(200).json({ steps });
};
