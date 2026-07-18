const { sql } = require('./db');

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// janela fixa: conta tentativas por chave (rota+IP); zera quando a janela expira.
async function contarTentativa(chave, windowMs) {
  const janelaLimite = new Date(Date.now() - windowMs);
  const [row] = await sql`
    INSERT INTO rate_limits (chave, contagem, janela_inicio)
    VALUES (${chave}, 1, now())
    ON CONFLICT (chave) DO UPDATE SET
      contagem = CASE WHEN rate_limits.janela_inicio > ${janelaLimite} THEN rate_limits.contagem + 1 ELSE 1 END,
      janela_inicio = CASE WHEN rate_limits.janela_inicio > ${janelaLimite} THEN rate_limits.janela_inicio ELSE now() END
    RETURNING contagem
  `;
  return row.contagem;
}

// retorna true (e já responde 429) se o limite foi excedido; false se pode seguir.
async function rateLimited(req, res, { scope, limit, windowMs }) {
  try {
    const chave = scope + ':' + clientIp(req);
    const contagem = await contarTentativa(chave, windowMs);
    if (contagem > limit) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      res.status(429).json({ error: 'Muitas tentativas. Aguarde um pouco e tente novamente.' });
      return true;
    }
    return false;
  } catch (e) {
    // se o rate limiter falhar (ex.: banco fora do ar), não derruba a rota por causa dele
    return false;
  }
}

// cache em memória (por instância serverless) pra não bater no banco a cada evento
let ignoredCache = null, ignoredCacheAt = 0;
const IGNORED_CACHE_MS = 60 * 1000;

async function isIgnoredIp(req) {
  try {
    const now = Date.now();
    if (!ignoredCache || now - ignoredCacheAt > IGNORED_CACHE_MS) {
      const rows = await sql`SELECT ip FROM ignored_ips`;
      ignoredCache = new Set(rows.map(r => r.ip));
      ignoredCacheAt = now;
    }
    return ignoredCache.has(clientIp(req));
  } catch (e) {
    return false;
  }
}

module.exports = { rateLimited, clientIp, isIgnoredIp };
