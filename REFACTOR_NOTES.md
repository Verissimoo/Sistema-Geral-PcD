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

## Correções de lint sem mudança de comportamento

- Imports/variáveis não usados removidos via `eslint --fix` (sobras de
  refatorações visuais anteriores).
- `GerenteClienteDetalhe.jsx`: o `useMemo` da timeline era chamado após um
  early-return condicional (violação de rules-of-hooks). Movido para antes do
  early-return — depende apenas de `quotes`, resultado idêntico.
