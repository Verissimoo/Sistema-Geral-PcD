// src/lib/sanitizeQuoteForPartner.js
//
// Remove TODOS os campos sensíveis de uma cotação antes de devolver para o
// portal do parceiro. Use sempre que carregar quotes nas telas /parceiro/*.
//
// O que sobra para o parceiro:
//   - Dados de identificação (quote_number, status, datas)
//   - Cliente final (partner_client_data)
//   - Itinerário completo (voos, datas, bagagem)
//   - Passageiros (quantidade)
//   - O valor final que ele paga à PCD (partner_base_sale_value, se já tiver sido definido)
//   - O valor final que ele cobra do cliente dele (partner_sale_value)
//   - Dados públicos: passenger_data, payment_method, etc
//
// O que NUNCA pode ir:
//   - Custo (cost_brl, tax, total_cost, miles_qty, miles_value_per_thousand)
//   - Nipon (nipon_value, total_nipon)
//   - RAV/Desconto (partner_rav, partner_desconto, partner_price_mode)
//   - Comissão (commission inteiro)
//   - sale_value (valor base da cotação, antes de virar partner_sale_value)
//   - Snapshots de auditoria

// Campos do pricing que são INTERNOS PCD — NUNCA expor
const SENSITIVE_PRICING_FIELDS = [
  "cost_brl", "cost_brl_calc", "total_cost",
  "tax",
  "nipon_value", "total_nipon",
  "miles_qty", "miles_value_per_thousand", "cost_per_thousand",
  "sale_per_thousand", "sale_value_per_thousand",
  "partner_rav", "partner_desconto", "partner_price_mode",
  "sale_value", "sale_per",
  "is_azul", "is_split",
  "program_id", "cost_per_pax", "nipon_per_pax",
  "price_overridden", "suggested_price",
  "trechos", // trechos do split contêm custo/taxa/milhas
];

// Campos top-level do quote que NÃO podem ir para o parceiro
const SENSITIVE_QUOTE_FIELDS = [
  "commission",
  "price_revisions",
  "sent_to_emission_date",
  "emission_handled_by",
];

export function sanitizeQuoteForPartner(quote) {
  if (!quote) return quote;

  // Clone profundo para não mutar o original (o cache do localClient ainda
  // serve a tela administrativa em outras abas).
  const safe = JSON.parse(JSON.stringify(quote));

  // Remover campos sensíveis do top-level
  for (const field of SENSITIVE_QUOTE_FIELDS) {
    delete safe[field];
  }

  // Sanitizar pricing — mantemos apenas os metadados que o portal precisa
  // para renderizar (tipo, nome do programa, se é multi-programa).
  if (safe.pricing) {
    const cleanPricing = { ...safe.pricing };
    for (const field of SENSITIVE_PRICING_FIELDS) {
      delete cleanPricing[field];
    }

    // Sanitizar trechos_pricing (multi-programa) — manter apenas tipo e nome
    let trechosPricing;
    if (Array.isArray(cleanPricing.trechos_pricing)) {
      trechosPricing = cleanPricing.trechos_pricing.map((tp) => ({
        tipo: tp.tipo,
        program_name: tp.program_name,
      }));
    }

    safe.pricing = {
      type: cleanPricing.type,
      program_name: cleanPricing.program_name,
      multi_program: cleanPricing.multi_program,
      ...(trechosPricing && { trechos_pricing: trechosPricing }),
    };
  }

  return safe;
}

export function sanitizeQuotesForPartner(quotes) {
  return (quotes || []).map(sanitizeQuoteForPartner);
}
