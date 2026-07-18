const { sql, ensureSchema } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { clientIp } = require('../../lib/rateLimit');

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  await ensureSchema();

  if (req.method === 'GET') {
    const rows = await sql`SELECT ip FROM ignored_ips ORDER BY criado_em DESC`;
    return res.status(200).json({ mine: clientIp(req), ignored: rows.map(r => r.ip) });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const ip = String(body.ip || clientIp(req)).trim().slice(0, 64);
    if (!ip) return res.status(400).json({ error: 'IP inválido.' });
    await sql`INSERT INTO ignored_ips (ip) VALUES (${ip}) ON CONFLICT (ip) DO NOTHING`;
    return res.status(200).json({ ok: true, ip });
  }

  if (req.method === 'DELETE') {
    const ip = String(req.query.ip || '').trim().slice(0, 64);
    if (!ip) return res.status(400).json({ error: 'IP inválido.' });
    await sql`DELETE FROM ignored_ips WHERE ip = ${ip}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Método não permitido.' });
};
