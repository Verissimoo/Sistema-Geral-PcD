# REFACTOR_NOTES — refactor/arquitetura

Notas de decisões, comportamentos preservados-mesmo-parecendo-bug e registros
exigidos pelo plano de refatoração. Nenhum item aqui foi "corrigido" — apenas
documentado.

## Comportamentos preservados (caracterizados em teste)

- **parseBR("1234.56") → 123456** — o ponto é SEMPRE tratado como separador de
  milhar (formato americano não suportado). Caracterizado em
  `src/lib/__tests__/parseBR.test.js`.
- **calculateSegmentDuration com chegada == saída (sem datas) → "24h 00min"** —
  a heurística soma 24h quando chegada ≤ saída. Caracterizado em
  `timeParser.test.js`.
- **sanitizeQuoteForPartner inclui `trechos_pricing` sanitizado mesmo com
  `multi_program: false`** — sempre que o array existe ele vai (apenas
  tipo/program_name). Caracterizado em `sanitizeQuoteForPartner.test.js`.
- **Front (VendedorOrcamento `calc`) vs pricingCalculator divergem no Nipon de
  milhas**: o front exibe Nipon = venda do milheiro (sale_per_thousand) + taxa;
  o pricingCalculator (autoridade p/ comissão) deriva Nipon = custo × 1.1.
  Pré-existente; não alterado.

## Etapa 2 — consolidação de formatadores (shared/lib/format.js)

- **formatBRL**: 24 cópias tinham 3 variantes textuais; a canônica é a NaN-safe
  `(Number(v) || 0)`. Divergência teórica: as variantes `Number(v || 0)`
  renderizavam `"R$ NaN"` para strings inválidas; a canônica rende `R$ 0,00`.
  Inputs reais são numéricos do banco — sem impacto prático.
- **formatDateBR**: canônica = variante mais completa (trata ISO com "T" via
  toLocaleDateString + split para `YYYY-MM-DD` + guard de string malformada
  vindo das cópias do parceiro). Para os call sites que usavam split puro,
  entradas com "T" agora renderizam data correta em vez de string quebrada
  (estritamente melhor; nenhum call site passava "T" nelas).
- **VendedorOrcamento.jsx** esperava `""` (não `"—"`) para datas vazias —
  mantido via wrapper local `formatDateBR = (d) => formatDateBRBase(d, "")`.
- **fmtDate/fmtDateBR (new Date().toLocaleDateString)**: consolidadas em
  formatDateBR. Diferença teórica: para entradas `YYYY-MM-DD` puras a versão
  antiga via Date() sofria shift de fuso (UTC→local podia mostrar o dia
  anterior); os call sites passam timestamps ISO (created_date etc.), onde o
  output é idêntico.
- **GerenteVendedorDetalhe.formatDate** (month: "short") e
  **GerenteMetasComerciais.formatBRLShort**: formatos únicos — mantidos locais.
- **generateQuoteHTML.formatDateLong**: formato único do PDF — mantido local.

## Etapa 4 — paginação server-side (PARCIAL, com justificativa)

**Conflito identificado:** as listas candidatas a paginação (orçamentos,
clientes, emissões, histórico) NÃO são puramente de exibição — elas alimentam
agregações no client:
- `GerenteOrcamentos`/`VendedorOrcamentos`: cards de resumo (total, vendidos,
  receita, ticket médio) via `reduce`/`length` sobre a lista filtrada inteira.
- `Dashboard`, `GerenteVendedores`, `VendedorHome`, `GerenteVendedorDetalhe`,
  `GerenteMetasComerciais`: rankings, receita, comissões — todos sobre o
  conjunto completo de `useQuotes()` (16 consumidores da lista cheia).

Paginar essas listas server-side (`.range()`) faria os somatórios enxergarem
apenas uma página → **números errados em produção**, o que viola a regra nº1
(nenhuma mudança de comportamento visível). Fazer certo exigiria mover as
agregações para o banco (RPC/`count`/`sum`) — mudança de arquitetura e de
comportamento fora do escopo "refatoração estrutural pura".

**Entregue (estrutural, invisível):** primitivo `store.listPaged({ page,
pageSize, columns, filters })` com `.range()` + `count:'exact'` + seleção
explícita de colunas, pronto para as telas que vierem a separar exibição de
agregação (ou quando a agregação migrar para RPC). Não foi ligado às páginas
para preservar os resumos atuais.

**Mantido:** `select('*')` nas listas compartilhadas (a agregação lê pricing,
datas, total_value etc.) e nos `get` de detalhe. `pagination.jsx` é a UI
prevista para `listPaged` — preservar na Etapa 8.

## Etapa 6 — rotas declarativas + lazy loading (bundle)

- `app/routes.js`: tabela declarativa (path/roles/lazy import). Paths e
  allowedRoles idênticos ao App.jsx anterior (validado rota a rota).
- `app/App.jsx`: gera as `<Route>` da tabela com `React.lazy` + `<Suspense>`
  (fallback = mesmo spinner do ProtectedRoute). Os componentes lazy são
  resolvidos UMA vez em escopo de módulo (`LAZY_ROUTES`) — chamar `lazy()` no
  render remontaria a página a cada re-render.
- Login segue fora do Layout e sem proteção; catch-all `*` → PageNotFound.

**Bundle (npm run build):**
- Antes (Etapa 5): 1 chunk único `index-*.js` = **1.415 KB** (gzip 381 KB).
- Depois: entry `index-*.js` = **472 KB** + **113 chunks** sob demanda (1 por
  página). Ex.: VendedorOrcamento 120 KB, ProjectKanban 112 KB, VendedorCotacao
  80 KB — só baixam quando a rota é acessada.

## Etapa 7 — decomposição dos god components

15 páginas > 500 linhas decompostas em página-orquestrador + hooks (lógica
pura) + componentes (JSX coeso), por feature. Extração MECÂNICA (corpos movidos
byte-for-byte; só imports/exports ajustados) — zero mudança de
comportamento/cálculo/ordem de hooks. **Nenhuma página > 500 linhas** ao final.
Destaques: VendedorOrcamento 4649→272, VendedorCotacao 2351→100 (era a página
"Manual do Vendedor", apresentacional), Dashboard 1053→156.

**Componentes (não-página) que permanecem > 500 linhas** — aceitável pelo
critério ("nenhum arquivo de PÁGINA > 500"); são blocos coesos cuja
fragmentação adicional traria risco sem ganho:
- `features/orcamento/components/BlocoPrecificacao.jsx` (~1478) — núcleo de
  precificação (milhas/dinheiro/híbrido, split, multi-programa, blocos extras,
  cost_is_total, EUR). Não fragmentado para não arriscar a lógica financeira.
- `features/orcamento/components/BlocoItinerario.jsx` (~959) e `BlocoGerar.jsx`
  (~585).
- `features/cotacao/components/manualPrimitives.jsx` (~550) e
  `ManualTabsGerais.jsx` (~517) — coleções de componentes apresentacionais.

Nota: VendedorCotacao — cada `<TabsContent>` agora envolve o conteúdo da aba
extraída num `<div className="space-y-6">`; como o TabsContent passa a ter um
único filho, o espaçamento renderizado é idêntico ao original.

## Correções de lint sem mudança de comportamento

- Imports/variáveis não usados removidos via `eslint --fix` (sobras de
  refatorações visuais anteriores).
- `GerenteClienteDetalhe.jsx`: o `useMemo` da timeline era chamado após um
  early-return condicional (violação de rules-of-hooks). Movido para antes do
  early-return — depende apenas de `quotes`, resultado idêntico.
