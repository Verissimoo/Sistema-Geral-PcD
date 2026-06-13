# Sistema Geral PCD

Sistema interno da PassagensComDesconto — gestão de orçamentos de passagens
(milhas/dinheiro/híbrido), precificação, comissões, metas comerciais, portais
de vendedor/gerente/suporte/parceiro, emissões e plano de carreira.

Produção: https://sistema-geral-pcd.vercel.app

## Stack

- **React 18** + **Vite 6** (JavaScript)
- **Tailwind CSS** + **shadcn/ui** (Radix) — tema escuro padrão, tokens semânticos
- **TanStack Query** — camada de dados (cache, mutations, invalidação)
- **Supabase** — banco / auth / storage
- **react-router-dom** — rotas com lazy loading
- **Vitest** — testes (lógica financeira)

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run preview` | Servir o build localmente |
| `npm test` | Testes (Vitest, single-run) |
| `npm run test:watch` | Testes em watch |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint com auto-fix |

## Setup

1. `npm install`
2. Crie um `.env.local` com as variáveis do Supabase:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. `npm run dev`

## Estrutura de pastas (feature-based)

```
src/
  app/          App.jsx + tabela de rotas (routes.js, lazy loading)
  api/          Camada de dados: store genérico, módulos por domínio
                (quotes, clients, users, ...), hooks TanStack Query,
                queryKeys, seeds
  features/     Uma pasta por domínio (pages/ + components/ + lib/):
                auth, orcamento, cotacao, milhas, metas, carreira, clientes,
                vendedores, parceiros, emissoes, projetos, rituais, dashboard,
                usuarios, configuracoes
  shared/
    components/ Layout, Sidebar, NotificationBell, ThemeToggle, ...
    ui/         shadcn/ui (Radix) — apenas os componentes em uso
    hooks/      use-mobile, useExchangeRate
    lib/        format, parseBR, timeParser, exchangeRate, pricingCalculator,
                utils, config, ThemeContext, query-client, supabase
  data/         Conteúdo estático (cultura PCD)
```

### Camada de dados

Toda leitura/escrita passa por `src/api`. As páginas usam os hooks
(`useQuotes`, `useUpdateQuote`, ...) — sem `useEffect`+`fetch`. Erros de
query/mutation disparam um toast central (`shared/lib/query-client.js`).

### Precificação

`shared/lib/pricingCalculator.js` é a **fonte única de verdade** de custo,
Nipon e comissão (coberto por testes de caracterização).

## Testes & CI

`npm test` roda a suíte Vitest (pricingCalculator, milesHelper, parseBR,
timeParser, exchangeRate, sanitizeQuoteForPartner, format). O CI
(`.github/workflows/ci.yml`) roda **lint + test + build** a cada push/PR.
