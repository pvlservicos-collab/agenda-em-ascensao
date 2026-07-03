const crypto = require('crypto');
const { setSessionCookie, clearSessionCookie } = require('../../lib/auth');

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async function handler(req, res) {
  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_USER / ADMIN_PASSWORD não configuradas.' });
  }

  const body = req.body || {};
  const user = String(body.user || '');
  const senha = String(body.senha || '');

  if (!safeEqual(user, process.env.ADMIN_USER) || !safeEqual(senha, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  setSessionCookie(res, user);
  return res.status(200).json({ ok: true, user });
};
