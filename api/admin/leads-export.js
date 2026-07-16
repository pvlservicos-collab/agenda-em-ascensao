const { sql, ensureSchema } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { buildLeadsWhere } = require('../../lib/leadsFilter');

const DIAS_ABREV = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function diasFmt(arr) {
  if (!Array.isArray(arr) || !arr.length) return '—';
  return arr.slice().sort((a, b) => a - b).map(i => DIAS_ABREV[i] || '?').join(',');
}
function durNice(min) {
  min = Number(min) || 0;
  const h = Math.floor(min / 60), m = min % 60;
  if (h && m) return h + 'h' + String(m).padStart(2, '0');
  if (h) return h + 'h';
  return m + 'min';
}
function fmtReceita(v) { return v ? 'R$' + (v / 1000) + 'k' : '—'; }
function fmtSono(a1) { return (a1 && a1.bed && a1.wake) ? a1.bed + '–' + a1.wake : '—'; }
function fmtTrabalho(a1) { return (a1 && a1.ws && a1.we) ? a1.ws + '–' + a1.we + ' (' + diasFmt(a1.wdays) + ')' : '—'; }
function fmtDeslocamento(a1) { return (a1 && a1.commute) ? durNice(a1.commute) + '/trecho' : '—'; }
function fmtReunioes(a1) {
  if (!a1) return '—';
  const partes = [];
  if (a1.meetAM > 0) partes.push('manhã ' + durNice(a1.meetAM));
  if (a1.meetPM > 0) partes.push('tarde ' + durNice(a1.meetPM));
  if (a1.meetEve > 0) partes.push('noite ' + durNice(a1.meetEve));
  return partes.length ? partes.join(', ') : '—';
}
function fmtRefeicao(hora, dur) { return hora ? hora + ' (' + durNice(dur) + ')' : '—'; }
function fmtTreino(a1) { return (a1 && a1.train) ? diasFmt(a1.trainDays) + ' ' + a1.trainT + ' (' + durNice(a1.trainD) + ')' : 'Não'; }
function fmtPessoas(a1) {
  if (!a1 || !a1.ppl) return 'Não';
  const partes = [];
  if (a1.pplWkDays && a1.pplWkDays.length) partes.push(diasFmt(a1.pplWkDays) + ' ' + a1.pplWkT);
  if (a1.pplWeDays && a1.pplWeDays.length) partes.push(diasFmt(a1.pplWeDays) + ' ' + a1.pplWeT);
  return partes.length ? partes.join(' / ') : 'Sim';
}
function fmtProcrastinacao(a1) {
  if (!a1) return '—';
  const partes = [];
  if (a1.vazAM > 0) partes.push('manhã ' + durNice(a1.vazAM));
  if (a1.vazPM > 0) partes.push('tarde ' + durNice(a1.vazPM));
  return partes.length ? partes.join(', ') : '—';
}
function csvField(v) {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  if (!requireAdmin(req, res)) return;

  await ensureSchema();

  const { where, params } = buildLeadsWhere(req.query);
  const itens = await sql.query(
    `SELECT nome, whatsapp, email, criado_em, agenda FROM leads ${where} ORDER BY criado_em DESC`,
    params
  );

  const header = ['Nome', 'WhatsApp', 'Instagram', 'E-mail', 'Data', 'Faturamento', 'Profissão',
    'Sono', 'Trabalho', 'Deslocamento', 'Reuniões', 'Café da manhã', 'Almoço', 'Jantar',
    'Treino', 'Pessoas importantes', 'Procrastinação'];

  const rows = itens.map(l => {
    const ag = l.agenda || {}; const a1 = ag.a1 || {};
    const dt = new Date(l.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    return [
      l.nome, l.whatsapp, ag.instagram || '—', l.email || '—', dt, fmtReceita(ag.receita), ag.profissao || '—',
      fmtSono(a1), fmtTrabalho(a1), fmtDeslocamento(a1), fmtReunioes(a1),
      fmtRefeicao(a1.bfT, a1.bfD), fmtRefeicao(a1.lunchT, a1.lunchD), fmtRefeicao(a1.dinT, a1.dinD),
      fmtTreino(a1), fmtPessoas(a1), fmtProcrastinacao(a1),
    ].map(csvField).join(';');
  });

  const csv = '﻿' + header.join(';') + '\n' + rows.join('\n') + '\n';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  return res.status(200).send(csv);
};
