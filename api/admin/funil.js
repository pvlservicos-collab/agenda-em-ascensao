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

  const contagens = await sql.query(
    `SELECT tipo, count(*)::int AS n FROM eventos WHERE criado_em >= ${startExpr} GROUP BY tipo`
  );
  const [{ n: leadsCount }] = await sql.query(
    `SELECT count(*)::int AS n FROM leads WHERE criado_em >= ${startExpr}`
  );
  const serieRows = await sql.query(
    `SELECT to_char(date_trunc('day', criado_em), 'YYYY-MM-DD') AS dia, tipo, count(*)::int AS n
     FROM eventos WHERE criado_em >= ${startExpr}
     GROUP BY 1, 2 ORDER BY 1`
  );

  const porTipo = { site_view: 0, wizard_complete: 0, cta_diag: 0, cta_form: 0, cta_insta: 0 };
  contagens.forEach(r => { porTipo[r.tipo] = r.n; });
  const ctaClick = porTipo.cta_diag + porTipo.cta_form + porTipo.cta_insta;

  const serieMap = {};
  serieRows.forEach(r => {
    if (!serieMap[r.dia]) serieMap[r.dia] = { data: r.dia, site_view: 0, wizard_complete: 0, cta_click: 0 };
    if (r.tipo === 'site_view') serieMap[r.dia].site_view = r.n;
    else if (r.tipo === 'wizard_complete') serieMap[r.dia].wizard_complete = r.n;
    else if (r.tipo.startsWith('cta_')) serieMap[r.dia].cta_click += r.n;
  });

  return res.status(200).json({
    site_view: porTipo.site_view,
    wizard_complete: porTipo.wizard_complete,
    cta_click: ctaClick,
    leads: leadsCount,
    serie: Object.values(serieMap).sort((a, b) => a.data.localeCompare(b.data)),
  });
};
