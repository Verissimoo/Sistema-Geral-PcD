// Calculadora unificada de comissão e custos. Fonte única de verdade.
//
// REGRA FUNDAMENTAL:
//   - pricing.cost_brl, pricing.tax são valores POR PASSAGEIRO (uma emissão de
//     milhas = 1 passageiro). O front coleta esses campos em "modo unitário"
//     e nunca multiplica antes de gravar.
//   - O nipon NÃO é mais lido do banco. Ele é SEMPRE derivado de
//     (cost_brl + tax) × 1.10 — ou × 1.0 quando o programa é Azul.
//     Antes confiávamos em `pricing.nipon_value` salvo, mas esse campo congela
//     ao editar custo/taxa/programa em separado, ficando inconsistente.
//     O campo `nipon_value` segue gravado apenas como snapshot informativo.
//   - Para Quebra de Trecho (pricing.is_split=true), pricing.total_cost é a
//     soma dos custos dos trechos POR PASSAGEIRO; o nipon do split também
//     deriva desse total (× 1.10 / × 1.0 Azul).
//   - quote.total_value é a venda TOTAL da operação (todos os passageiros + extras).
//   - pricing.sale_value pode ser "por pessoa" ou "total" segundo pricing.sale_per.
//
// Toda métrica de lucro/comissão no resto do sistema deve passar por este
// módulo.

// Aceita number, string ISO numérica ("1054.6") ou BR ("1.054,60").
function toNumber(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  // BR-format: tem vírgula como separador decimal
  if (s.includes(",")) {
    const cleaned = s.replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Detecta programa Azul a partir dos campos do pricing — tolera variantes
// ("Voe Azul", "Azul Pelo Mundo", flag explícita is_azul, etc.).
function isAzulProgram(pricing) {
  if (!pricing) return false;
  if (pricing.is_azul === true || pricing.is_azul === "true") return true;
  const label =
    pricing.program_name || pricing.program || pricing.miles_program || "";
  return String(label).toLowerCase().includes("azul");
}

// Detecta carteira própria pela origem do lead, tolerante a maiúsculas,
// acentuação e variantes ("Carteira Própria", "carteira propria"...).
function isCarteiraPropriaOrigin(origin) {
  if (!origin) return false;
  const normalized = String(origin)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
  return normalized.startsWith("carteira propria");
}

/**
 * Totais reais de uma cotação considerando múltiplos passageiros.
 * @param {object} quote — formato cru do banco OU do formData do gerador.
 */
export function computePricingTotals(quote) {
  const passengers = Math.max(1, parseInt(quote?.passengers, 10) || 1);
  const pricing = quote?.pricing || {};

  let costPerPax = 0;

  if (pricing.is_split === true || pricing.is_split === "true") {
    // Quebra de Trecho — soma dos custos dos trechos POR PASSAGEIRO.
    costPerPax = toNumber(pricing.total_cost);
  } else {
    const cost = toNumber(pricing.cost_brl_calc) || toNumber(pricing.cost_brl);
    const tax = toNumber(pricing.tax);
    costPerPax = cost + tax;
  }

  // Nipon SEMPRE derivado do custo. Nunca lemos pricing.nipon_value, porque
  // ele congela quando o vendedor (ou um script de manutenção) atualiza
  // cost_brl/tax sem reabrir o gerador — o que historicamente causou nipon
  // inconsistente em quotes antigos.
  const isAzul = isAzulProgram(pricing);
  const niponPerPax = isAzul ? costPerPax : costPerPax * 1.1;

  // Venda total — prioriza pricing.sale_value (input do vendedor) e cai para
  // quote.total_value (que já é o total final, incluindo serviços e adicionais).
  const saleRaw = toNumber(pricing.sale_value);
  const isPerPerson = pricing.sale_per === "pessoa";
  const saleFromPricing = isPerPerson ? saleRaw * passengers : saleRaw;
  // Se pricing.sale_value não foi informado mas o quote já tem total_value
  // (caso de orçamentos antigos), usa o total armazenado direto.
  const saleTotal = saleFromPricing > 0 ? saleFromPricing : toNumber(quote?.total_value);

  const costTotal = costPerPax * passengers;
  const niponTotal = niponPerPax * passengers;

  return {
    passengers,
    costPerPax,
    niponPerPax,
    isPerPerson,
    saleTotal,
    costTotal,
    niponTotal,
    lucroNipon: niponTotal - costTotal,
    excedente: Math.max(0, saleTotal - niponTotal),
    margemBruta: saleTotal - costTotal,
  };
}

/**
 * Comissão correta de um quote (carteira própria = 30%, demais = 25%; +45% do excedente).
 * Retorna os totais de computePricingTotals + os campos de comissão.
 */
export function computeCommission(quote) {
  const totals = computePricingTotals(quote);
  const isCarteiraPropria = isCarteiraPropriaOrigin(quote?.client?.lead_origin);
  const baseRate = isCarteiraPropria ? 0.3 : 0.25;

  const comissaoBase = Math.max(0, totals.lucroNipon) * baseRate;
  const comissaoExtra = totals.excedente * 0.45;
  const total = comissaoBase + comissaoExtra;

  return {
    ...totals,
    baseRate,
    comissaoBase,
    comissaoExtra,
    total,
    isCarteiraPropria,
  };
}

/**
 * Snapshot para gravar em quote.commission. Útil para auditoria e para evitar
 * recálculo no consumo (basta ler quote.commission.*_total).
 */
export function buildCommissionSnapshot(quote) {
  const r = computeCommission(quote);
  return {
    base: r.comissaoBase,
    extra: r.comissaoExtra,
    total: r.total,
    base_rate: r.baseRate,
    cost_per_pax: r.costPerPax,
    nipon_per_pax: r.niponPerPax,
    cost_total: r.costTotal,
    nipon_total: r.niponTotal,
    passengers: r.passengers,
    is_carteira_propria: r.isCarteiraPropria,
    calculated_at: new Date().toISOString(),
  };
}
