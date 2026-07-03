const crypto = require('crypto');

const COOKIE_NAME = 'painel_sid';
const TTL_MS = 1000 * 60 * 60 * 12; // 12h

function secret() {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET não configurada.');
  return process.env.SESSION_SECRET;
}

function sign(payloadObj) {
  const body = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + mac;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function setSessionCookie(res, user) {
  const token = sign({ u: user, exp: Date.now() + TTL_MS });
  const secure = process.env.VERCEL ? 'Secure; ' : '';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=${Math.floor(TTL_MS / 1000)}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function requireAdmin(req, res) {
  const cookies = parseCookies(req);
  const payload = verify(cookies[COOKIE_NAME]);
  if (!payload) {
    res.status(401).json({ error: 'Não autenticado.' });
    return null;
  }
  return payload;
}

module.exports = { COOKIE_NAME, setSessionCookie, clearSessionCookie, requireAdmin, parseCookies };
