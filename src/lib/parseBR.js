// Parser numérico para o padrão brasileiro de entrada de valores.
//
// Regras:
//   • Vírgula = separador decimal
//   • Ponto   = separador de milhar (sempre removido)
//
// Exemplos:
//   "34.607"      → 34607     (ponto como milhar)
//   "34607"       → 34607
//   "34,607"      → 34.607    (vírgula como decimal)
//   "1.234,56"    → 1234.56
//   "1.000.000"   → 1000000
//   "320,50"      → 320.5
//   ""            → 0
//   null/undef    → 0
//
// Idempotente para números: parseBR(123) === 123.
export function parseBR(input) {
  if (input === null || input === undefined || input === '') return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  const normalized = String(input)
    .trim()
    .replace(/\./g, '')   // remove pontos de milhar
    .replace(',', '.');   // vírgula vira separador decimal
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

// Filtra caracteres permitidos em inputs numéricos (dígitos, vírgula, ponto, sinal).
// Use no onChange de inputs type="text" inputMode="decimal".
export function sanitizeBRInput(value) {
  return String(value ?? '').replace(/[^\d.,-]/g, '');
}
