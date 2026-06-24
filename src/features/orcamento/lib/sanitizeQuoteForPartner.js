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

// Remove campos INTERNOS do pacote (hotel/adicionais) antes de ir pro parceiro.
// hotel_commission é a comissão fixa da consolidadora — é LUCRO interno da
// agência (análogo ao DU) e NUNCA pode vazar. Mantemos só o que o parceiro
// mostra ao cliente final: dados do hotel e dos quartos (nome + valor de VENDA)
// e os adicionais. Fotos já são efêmeras (nunca chegam ao banco).
function sanitizePackageForPartner(pkg) {
  if (!pkg || typeof pkg !== "object") return pkg;
  const hotel = pkg.hotel && typeof pkg.hotel === "object" ? pkg.hotel : null;
  return {
    include_flight: pkg.include_flight !== false,
    hotel: hotel
      ? {
          name: hotel.name,
          location: hotel.location,
          check_in: hotel.check_in,
          check_out: hotel.check_out,
          nights: hotel.nights,
          description: hotel.description,
          selected_room_id: hotel.selected_room_id,
          // value = preço de VENDA do quarto (o cliente vê). hotel_commission e
          // qualquer campo de custo são removidos por construção (whitelist).
          rooms: Array.isArray(hotel.rooms)
            ? hotel.rooms.map((r) => ({ id: r?.id, name: r?.name, value: r?.value }))
            : [],
        }
      : null,
    additionals: Array.isArray(pkg.additionals)
      ? pkg.additionals.map((a) => ({ name: a?.name ?? a?.nome, value: a?.value ?? a?.valor }))
      : [],
  };
}

export function sanitizeQuoteForPartner(quote) {
  if (!quote) return quote;

  // Clone profundo para não mutar o original (o cache do localClient ainda
  // serve a tela administrativa em outras abas).
  const safe = JSON.parse(JSON.stringify(quote));

  // Remover campos sensíveis do top-level
  for (const field of SENSITIVE_QUOTE_FIELDS) {
    delete safe[field];
  }

  // Pacote no top-level (formData) — sanitiza removendo hotel_commission/custos.
  if (safe.package) {
    safe.package = sanitizePackageForPartner(safe.package);
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
      // quote_kind não é sensível (apenas "aereo"/"pacote"); package vai
      // sanitizado (sem hotel_commission/custos) para o portal renderizar.
      ...(cleanPricing.quote_kind && { quote_kind: cleanPricing.quote_kind }),
      ...(cleanPricing.package && { package: sanitizePackageForPartner(cleanPricing.package) }),
      ...(trechosPricing && { trechos_pricing: trechosPricing }),
    };
  }

  return safe;
}

export function sanitizeQuotesForPartner(quotes) {
  return (quotes || []).map(sanitizeQuoteForPartner);
}
