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

## Correções de lint sem mudança de comportamento

- Imports/variáveis não usados removidos via `eslint --fix` (sobras de
  refatorações visuais anteriores).
- `GerenteClienteDetalhe.jsx`: o `useMemo` da timeline era chamado após um
  early-return condicional (violação de rules-of-hooks). Movido para antes do
  early-return — depende apenas de `quotes`, resultado idêntico.
