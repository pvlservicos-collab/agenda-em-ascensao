# Agenda em Ascensão

Aplicativo web de agenda — "Minha Agenda em Ascensão" (ASCENSÃO TITÃ). Frontend estático (HTML/CSS/JS puro) com funções serverless na Vercel e banco Postgres (Neon) para captura de leads, funil de eventos e exclusão de dados (LGPD).

## Estrutura

- [index.html](index.html) — a agenda em si. Antes de montar a semana, pede nome + WhatsApp ("Coloque seus dados").
- [painel.html](painel.html) — painel administrativo (funil de eventos + lista de leads). Login protegido.
- [exclusao-dados.html](exclusao-dados.html) — página de exclusão de dados (LGPD), busca por WhatsApp.
- `api/` — funções serverless (Vercel, Node.js) que conversam com o Postgres.
- `schema.sql` — schema do banco (aplicado automaticamente na primeira chamada de API).

## Rodar localmente

```
npm install
```

Abrir [index.html](index.html) direto no navegador já funciona para editar a agenda (fica salva no `localStorage`). As chamadas para `/api/*` (captura de lead, tracking, painel) só funcionam quando servidas pela Vercel — sem isso, elas falham silenciosamente e o resto do app continua normal.

Para testar com as funções de API rodando localmente:

```
npx vercel dev
```

## Deploy (Vercel)

O projeto já está conectado a um banco **Neon Postgres**. Variáveis de ambiente necessárias no projeto da Vercel (Settings → Environment Variables):

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão do Neon (normalmente já preenchida automaticamente pela integração Neon ↔ Vercel) |
| `ADMIN_USER` | Usuário de login do [painel.html](painel.html) |
| `ADMIN_PASSWORD` | Senha de login do painel |
| `SESSION_SECRET` | String aleatória usada para assinar o cookie de sessão do painel |

Valores locais de desenvolvimento ficam em `.env.local` (não commitado). Use `.env.example` como referência.

## Publicar com GitHub Pages (sem backend)

Se preferir publicar só a agenda (sem captura de lead, painel ou exclusão de dados), o GitHub Pages funciona: **Settings → Pages**, branch `main`, pasta `/ (root)`. Nesse caso as chamadas a `/api/*` falham silenciosamente e a agenda funciona 100% localmente pelo navegador.
