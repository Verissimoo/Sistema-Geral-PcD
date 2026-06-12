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

## Correções de lint sem mudança de comportamento

- Imports/variáveis não usados removidos via `eslint --fix` (sobras de
  refatorações visuais anteriores).
- `GerenteClienteDetalhe.jsx`: o `useMemo` da timeline era chamado após um
  early-return condicional (violação de rules-of-hooks). Movido para antes do
  early-return — depende apenas de `quotes`, resultado idêntico.
