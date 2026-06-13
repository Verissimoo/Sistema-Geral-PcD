import { describe, it, expect } from "vitest";
import { sanitizeQuoteForPartner, sanitizeQuotesForPartner } from "../sanitizeQuoteForPartner";

// Orçamento completo com TODOS os campos sensíveis preenchidos — se qualquer
// um deles vazar para o portal do parceiro, este teste quebra.
function buildFullQuote() {
  return {
    id: "q1",
    quote_number: "PCD-12345",
    status: "Enviado",
    created_date: "2026-06-01T10:00:00Z",
    passengers: 2,
    total_value: 5000,
    partner_base_sale_value: 4500,
    partner_sale_value: 5200,
    partner_client_data: { name: "Cliente Final" },
    passenger_data: [{ full_name: "Fulano", cpf: "000" }],
    payment_method: "PIX",
    seller_name: "Vendedor X",
    itinerary: { trechos: [{ tipo: "ida", origem_iata: "GRU", destino_iata: "LIS" }] },
    // ---- sensíveis top-level ----
    commission: { base: 100, extra: 50, total: 150 },
    price_revisions: [{ at: "2026-06-02" }],
    sent_to_emission_date: "2026-06-03",
    emission_handled_by: "Suporte Y",
    // ---- pricing com tudo ----
    pricing: {
      type: "milhas",
      program_name: "Smiles",
      multi_program: false,
      cost_brl: 1000, cost_brl_calc: 950, total_cost: 1900,
      tax: 100,
      nipon_value: 1210, total_nipon: 2420,
      miles_qty: 50000, miles_value_per_thousand: 18,
      cost_per_thousand: 18, sale_per_thousand: 25, sale_value_per_thousand: 25,
      partner_rav: 200, partner_desconto: 0, partner_price_mode: "rav",
      sale_value: 3000, sale_per: "total",
      is_azul: false, is_split: false,
      program_id: "prog-1",
      cost_per_pax: 1100, nipon_per_pax: 1210,
      price_overridden: true, suggested_price: 2800,
      trechos: [{ miles_qty: 25000, tax: 50, cost_brl: 500 }],
      cash_part: 2500,
      extra_blocks: [{ type: "dinheiro", cost_brl: 550, tax: 0 }],
      trechos_pricing: [
        { tipo: "ida", program_name: "LATAM", miles_qty: 10000, cost_per_thousand: 20, tax: 50 },
      ],
    },
  };
}

// Campos que NUNCA podem chegar ao parceiro
const FORBIDDEN_TOP_LEVEL = [
  "commission", "price_revisions", "sent_to_emission_date", "emission_handled_by",
];
const FORBIDDEN_PRICING = [
  "cost_brl", "cost_brl_calc", "total_cost", "tax",
  "nipon_value", "total_nipon",
  "miles_qty", "miles_value_per_thousand", "cost_per_thousand",
  "sale_per_thousand", "sale_value_per_thousand",
  "partner_rav", "partner_desconto", "partner_price_mode",
  "sale_value", "sale_per",
  "is_azul", "is_split", "program_id",
  "cost_per_pax", "nipon_per_pax",
  "price_overridden", "suggested_price",
  "trechos",
  // protegidos pela whitelist final (não listados em SENSITIVE_*, mas igualmente barrados):
  "cash_part", "extra_blocks",
];

describe("sanitizeQuoteForPartner", () => {
  it("remove TODOS os campos sensíveis do top-level", () => {
    const safe = sanitizeQuoteForPartner(buildFullQuote());
    for (const field of FORBIDDEN_TOP_LEVEL) {
      expect(safe, `top-level "${field}" vazou`).not.toHaveProperty(field);
    }
  });

  it("pricing vira whitelist: nenhum campo de custo/comissão/margem sobrevive", () => {
    const safe = sanitizeQuoteForPartner(buildFullQuote());
    for (const field of FORBIDDEN_PRICING) {
      expect(safe.pricing, `pricing.${field} vazou`).not.toHaveProperty(field);
    }
    // só os metadados públicos sobrevivem (trechos_pricing entra sanitizado
    // sempre que presente — comportamento atual, mesmo com multi_program false)
    expect(Object.keys(safe.pricing).sort()).toEqual(
      ["multi_program", "program_name", "trechos_pricing", "type"].sort()
    );
    expect(safe.pricing.trechos_pricing).toEqual([{ tipo: "ida", program_name: "LATAM" }]);
  });

  it("trechos_pricing (quando multi) mantém apenas tipo e program_name", () => {
    const q = buildFullQuote();
    q.pricing.multi_program = true;
    const safe = sanitizeQuoteForPartner(q);
    expect(safe.pricing.trechos_pricing).toEqual([{ tipo: "ida", program_name: "LATAM" }]);
  });

  it("preserva os campos públicos que o portal precisa", () => {
    const safe = sanitizeQuoteForPartner(buildFullQuote());
    expect(safe.quote_number).toBe("PCD-12345");
    expect(safe.status).toBe("Enviado");
    expect(safe.passengers).toBe(2);
    expect(safe.partner_base_sale_value).toBe(4500);
    expect(safe.partner_sale_value).toBe(5200);
    expect(safe.partner_client_data).toEqual({ name: "Cliente Final" });
    expect(safe.passenger_data).toHaveLength(1);
    expect(safe.itinerary.trechos[0].origem_iata).toBe("GRU");
  });

  it("não muta o objeto original", () => {
    const original = buildFullQuote();
    sanitizeQuoteForPartner(original);
    expect(original.commission).toBeDefined();
    expect(original.pricing.cost_brl).toBe(1000);
  });

  it("null/undefined passam intactos", () => {
    expect(sanitizeQuoteForPartner(null)).toBeNull();
    expect(sanitizeQuoteForPartner(undefined)).toBeUndefined();
  });
});

describe("sanitizeQuotesForPartner", () => {
  it("mapeia listas e tolera null", () => {
    const list = sanitizeQuotesForPartner([buildFullQuote(), buildFullQuote()]);
    expect(list).toHaveLength(2);
    expect(list[0]).not.toHaveProperty("commission");
    expect(sanitizeQuotesForPartner(null)).toEqual([]);
  });
});
