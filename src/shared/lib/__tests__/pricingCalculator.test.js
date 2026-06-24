import { describe, it, expect } from "vitest";
import {
  computePricingTotals,
  computeCommission,
  buildCommissionSnapshot,
} from "../pricingCalculator";

// Testes de CARACTERIZAÇÃO: travam o comportamento atual da lógica financeira.
// Não "corrigir" valores aqui sem decisão de negócio — eles são a rede de
// segurança da refatoração estrutural.

describe("computePricingTotals — modo padrão (bloco único)", () => {
  it("dinheiro não-Azul: custo = cost_brl + tax; Nipon = custo × 1.1", () => {
    const t = computePricingTotals({
      passengers: 2,
      pricing: { type: "dinheiro", cost_brl: 1000, tax: 100, sale_value: 3000, sale_per: "total" },
    });
    expect(t.passengers).toBe(2);
    expect(t.costPerPax).toBeCloseTo(1100, 6);
    expect(t.niponPerPax).toBeCloseTo(1210, 6);
    expect(t.costTotal).toBeCloseTo(2200, 6);
    expect(t.niponTotal).toBeCloseTo(2420, 6);
    expect(t.saleTotal).toBe(3000);
    expect(t.lucroNipon).toBeCloseTo(220, 6);
    expect(t.excedente).toBeCloseTo(580, 6);
    expect(t.margemBruta).toBeCloseTo(800, 6);
  });

  it("dinheiro Azul (is_azul): Nipon = custo (sem +10%)", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: { type: "dinheiro", cost_brl: 1000, tax: 100, is_azul: true },
    });
    expect(t.niponPerPax).toBeCloseTo(1100, 6);
    expect(t.lucroNipon).toBeCloseTo(0, 6);
  });

  it("aceita strings BR (vírgula decimal, ponto de milhar)", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: { type: "dinheiro", cost_brl: "1.054,60", tax: "45,40" },
    });
    expect(t.costPerPax).toBeCloseTo(1100, 6);
    expect(t.niponPerPax).toBeCloseTo(1210, 6);
  });

  it("milhas não-Azul: usa cost_brl_calc quando presente; Nipon = custo × 1.1", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: { type: "milhas", program_name: "Smiles", cost_brl_calc: 240, tax: 50 },
    });
    expect(t.costPerPax).toBeCloseTo(290, 6);
    expect(t.niponPerPax).toBeCloseTo(319, 6);
  });

  it("milhas Azul puro: Nipon = custo (×1.0)", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: { type: "milhas", program_name: "Voe Azul", cost_brl_calc: 240, tax: 50 },
    });
    expect(t.niponPerPax).toBeCloseTo(290, 6);
  });

  it("milhas sem cost_brl_calc: cai para milhas × custo do milheiro", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: { type: "milhas", miles_qty: 20000, cost_per_thousand: 12, tax: 0 },
    });
    expect(t.costPerPax).toBeCloseTo(240, 6);
    expect(t.niponPerPax).toBeCloseTo(264, 6);
  });

  it("milhas_dinheiro (híbrida Azul): custo = milhas + dinheiro + taxa; Nipon SEMPRE ×1.1", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: {
        type: "milhas_dinheiro", program_name: "Azul Pelo Mundo",
        miles_qty: 20000, cost_per_thousand: 12, cash_part: 2500, tax: 0,
      },
    });
    expect(t.costPerPax).toBeCloseTo(2740, 6);
    expect(t.niponPerPax).toBeCloseTo(3014, 6);
  });

  it("quote vazio: tudo zero, 1 passageiro", () => {
    const t = computePricingTotals({});
    expect(t.passengers).toBe(1);
    expect(t.costTotal).toBe(0);
    expect(t.niponTotal).toBe(0);
    expect(t.saleTotal).toBe(0);
  });

  it("undefined: não lança", () => {
    expect(() => computePricingTotals(undefined)).not.toThrow();
  });
});

describe("computePricingTotals — cost_is_total", () => {
  it("true: valor digitado é o TOTAL de todos os passageiros (não multiplica)", () => {
    const t = computePricingTotals({
      passengers: 3,
      pricing: { type: "dinheiro", cost_brl: 9000, tax: 300, cost_is_total: true },
    });
    expect(t.costTotal).toBeCloseTo(9300, 6);
    expect(t.niponTotal).toBeCloseTo(10230, 6);
    expect(t.costPerPax).toBeCloseTo(3100, 6);
  });

  it("false/ausente: multiplica por passageiros", () => {
    const t = computePricingTotals({
      passengers: 3,
      pricing: { type: "dinheiro", cost_brl: 3000, tax: 100 },
    });
    expect(t.costTotal).toBeCloseTo(9300, 6);
  });
});

describe("computePricingTotals — extra_blocks (blocos somados)", () => {
  it("soma custo e Nipon do bloco principal + extras", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: {
        type: "dinheiro", cost_brl: 1000, tax: 0,
        extra_blocks: [{ type: "dinheiro", cost_brl: 550, tax: 0 }],
      },
    });
    expect(t.costTotal).toBeCloseTo(1550, 6);
    expect(t.niponTotal).toBeCloseTo(1705, 6);
  });

  it("bloco extra com cost_is_total não multiplica só ele", () => {
    const t = computePricingTotals({
      passengers: 2,
      pricing: {
        type: "dinheiro", cost_brl: 1000, tax: 0, // por pax → ×2
        extra_blocks: [{ type: "dinheiro", cost_brl: 600, tax: 0, cost_is_total: true }],
      },
    });
    expect(t.costTotal).toBeCloseTo(2600, 6);
  });
});

describe("computePricingTotals — consolidadora", () => {
  it("custo = tarifa + taxa − DU; nipon = custo × 1.1; RAV não entra no custo", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: {
        type: "consolidadora",
        fare_total: 5000, boarding_tax: 300, du_value: 200, rav_value: 400,
      },
    });
    expect(t.costPerPax).toBeCloseTo(5100, 6); // 5000 + 300 − 200
    expect(t.niponPerPax).toBeCloseTo(5610, 6); // 5100 × 1.1
    expect(t.costTotal).toBeCloseTo(5100, 6);
    expect(t.niponTotal).toBeCloseTo(5610, 6);
  });

  it("DU=0 e RAV=0 equivale a um bloco dinheiro do mesmo custo", () => {
    const consol = computePricingTotals({
      passengers: 1,
      pricing: { type: "consolidadora", fare_total: 1000, boarding_tax: 100, du_value: 0 },
    });
    const dinheiro = computePricingTotals({
      passengers: 1,
      pricing: { type: "dinheiro", cost_brl: 1000, tax: 100 },
    });
    expect(consol.costPerPax).toBeCloseTo(dinheiro.costPerPax, 6);
    expect(consol.niponPerPax).toBeCloseTo(dinheiro.niponPerPax, 6);
  });

  it("DU maior reduz o custo e aumenta a comissão total (venda fixa)", () => {
    // DU abate o custo → Nipon menor → mais excedente sobre a venda fixa.
    // (lucroNipon = nipon − custo = custo×0.1, então ele encolhe; mas o
    // excedente×0.45 cresce mais e a comissão total sobe.)
    const base = { type: "consolidadora", fare_total: 5000, boarding_tax: 300, sale_value: 6000, sale_per: "total" };
    const semDu = computeCommission({ passengers: 1, client: { lead_origin: "x" }, pricing: { ...base, du_value: 0 } });
    const comDu = computeCommission({ passengers: 1, client: { lead_origin: "x" }, pricing: { ...base, du_value: 500 } });
    expect(comDu.costTotal).toBeLessThan(semDu.costTotal);
    expect(comDu.total).toBeGreaterThan(semDu.total);
  });

  it("respeita cost_is_total (não multiplica por passageiros)", () => {
    const t = computePricingTotals({
      passengers: 3,
      pricing: { type: "consolidadora", fare_total: 5000, boarding_tax: 300, du_value: 200, cost_is_total: true },
    });
    expect(t.costTotal).toBeCloseTo(5100, 6); // total, não ×3
  });
});

describe("computePricingTotals — multi-programa", () => {
  it("soma trechos; Azul ×1.0 e demais ×1.1 por trecho", () => {
    const t = computePricingTotals({
      passengers: 2,
      pricing: {
        multi_program: true,
        trechos_pricing: [
          { miles_qty: 10000, cost_per_thousand: 20, tax: 50, program_name: "LATAM" },
          { miles_qty: 10000, cost_per_thousand: 14, tax: 50, program_name: "Voe Azul" },
        ],
      },
    });
    // LATAM: custo 250 → nipon 275; Azul: custo 190 → nipon 190
    expect(t.costPerPax).toBeCloseTo(440, 6);
    expect(t.niponPerPax).toBeCloseTo(465, 6);
    expect(t.costTotal).toBeCloseTo(880, 6);
    expect(t.niponTotal).toBeCloseTo(930, 6);
  });
});

describe("computePricingTotals — quebra de trecho (is_split)", () => {
  it("usa pricing.total_cost por pax; Nipon ×1.1 quando não-Azul", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: { is_split: true, total_cost: 1500 },
    });
    expect(t.costPerPax).toBeCloseTo(1500, 6);
    expect(t.niponPerPax).toBeCloseTo(1650, 6);
  });

  it("split Azul (program_name): Nipon = custo", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: { is_split: true, total_cost: 1500, program_name: "Azul Pelo Mundo" },
    });
    expect(t.niponPerPax).toBeCloseTo(1500, 6);
  });
});

describe("computePricingTotals — venda", () => {
  it("sale_per 'pessoa' multiplica por passageiros", () => {
    const t = computePricingTotals({
      passengers: 2,
      pricing: { type: "dinheiro", cost_brl: 100, tax: 0, sale_value: 2000, sale_per: "pessoa" },
    });
    expect(t.isPerPerson).toBe(true);
    expect(t.saleTotal).toBe(4000);
  });

  it("sem sale_value cai para quote.total_value", () => {
    const t = computePricingTotals({
      passengers: 1,
      total_value: 5000,
      pricing: { type: "dinheiro", cost_brl: 100, tax: 0 },
    });
    expect(t.saleTotal).toBe(5000);
  });
});

describe("computeCommission", () => {
  const baseQuote = {
    passengers: 2,
    pricing: { type: "dinheiro", cost_brl: 1000, tax: 100, sale_value: 3000, sale_per: "total" },
  };

  it("padrão (25%): base = lucroNipon × 0.25; extra = excedente × 0.45", () => {
    const c = computeCommission({ ...baseQuote, client: { lead_origin: "Instagram" } });
    expect(c.baseRate).toBe(0.25);
    expect(c.comissaoBase).toBeCloseTo(220 * 0.25, 6);
    expect(c.comissaoExtra).toBeCloseTo(580 * 0.45, 6);
    expect(c.total).toBeCloseTo(220 * 0.25 + 580 * 0.45, 6);
    expect(c.isCarteiraPropria).toBe(false);
  });

  it("carteira própria (30%) — tolera acentos e sufixos", () => {
    const c = computeCommission({ ...baseQuote, client: { lead_origin: "Carteira Própria - indicação" } });
    expect(c.baseRate).toBe(0.3);
    expect(c.comissaoBase).toBeCloseTo(220 * 0.3, 6);
    expect(c.isCarteiraPropria).toBe(true);
  });

  it("lucroNipon negativo não gera comissão base negativa", () => {
    const c = computeCommission({
      passengers: 1,
      pricing: { type: "dinheiro", cost_brl: 1000, tax: 0, is_azul: true, sale_value: 900, sale_per: "total" },
    });
    expect(c.comissaoBase).toBe(0);
  });
});

describe("computePricingTotals — pacotes (hotel + adicionais)", () => {
  const hotelPkg = (over = {}) => ({
    quote_kind: "pacote",
    passengers: 1,
    package: {
      include_flight: false,
      hotel: {
        hotel_commission: 500,
        rooms: [{ id: "r1", name: "Standard", value: 4500 }],
      },
      additionals: [],
      ...over.package,
    },
    ...over.rest,
  });

  it("pacote só-hotel (include_flight=false): aéreo zerado; lucro = hotel_commission", () => {
    const t = computePricingTotals(hotelPkg());
    expect(t.isPacote).toBe(true);
    expect(t.includeFlight).toBe(false);
    expect(t.costPerPax).toBe(0);
    expect(t.niponPerPax).toBe(0);
    expect(t.saleTotal).toBeCloseTo(4500, 6);   // venda = valor do quarto
    expect(t.niponTotal).toBeCloseTo(4500, 6);  // hotel não usa ×1.10
    expect(t.costTotal).toBeCloseTo(4000, 6);   // 4500 − 500
    expect(t.lucroNipon).toBeCloseTo(500, 6);   // = hotel_commission
    expect(t.excedente).toBeCloseTo(0, 6);      // venda == nipon → sem excedente
    expect(t.hotelCommission).toBeCloseTo(500, 6);
  });

  it("hotel sem comissão: lucro e comissão zero", () => {
    const t = computePricingTotals(
      hotelPkg({ package: { hotel: { hotel_commission: 0, rooms: [{ id: "r1", value: 3000 }] }, additionals: [] } })
    );
    expect(t.costTotal).toBeCloseTo(3000, 6);
    expect(t.niponTotal).toBeCloseTo(3000, 6);
    expect(t.lucroNipon).toBeCloseTo(0, 6);
    const c = computeCommission(
      hotelPkg({ package: { hotel: { hotel_commission: 0, rooms: [{ id: "r1", value: 3000 }] }, additionals: [] }, rest: { client: { lead_origin: "x" } } })
    );
    expect(c.total).toBeCloseTo(0, 6);
  });

  it("seleciona o quarto por selected_room_id (default = primeiro)", () => {
    const base = {
      quote_kind: "pacote",
      passengers: 1,
      package: {
        include_flight: false,
        hotel: {
          hotel_commission: 0,
          rooms: [
            { id: "r1", value: 3000 },
            { id: "r2", value: 5000 },
          ],
        },
        additionals: [],
      },
    };
    // default → primeiro quarto
    expect(computePricingTotals(base).saleTotal).toBeCloseTo(3000, 6);
    // marca o segundo como principal
    const withSel = { ...base, package: { ...base.package, hotel: { ...base.package.hotel, selected_room_id: "r2" } } };
    expect(computePricingTotals(withSel).saleTotal).toBeCloseTo(5000, 6);
  });

  it("comissão da consolidadora não excede a venda do quarto (clamp)", () => {
    const t = computePricingTotals(
      hotelPkg({ package: { hotel: { hotel_commission: 9999, rooms: [{ id: "r1", value: 4500 }] }, additionals: [] } })
    );
    expect(t.costTotal).toBeCloseTo(0, 6);       // custo nunca negativo
    expect(t.hotelCommission).toBeCloseTo(4500, 6);
    expect(t.lucroNipon).toBeCloseTo(4500, 6);
  });

  it("pacote voo + hotel: soma aéreo e hotel; lucros somam", () => {
    const t = computePricingTotals({
      quote_kind: "pacote",
      passengers: 1,
      pricing: { type: "dinheiro", cost_brl: 1000, tax: 100, sale_value: 2000, sale_per: "total" },
      package: {
        include_flight: true,
        hotel: { hotel_commission: 400, rooms: [{ id: "r1", value: 3000 }] },
        additionals: [],
      },
    });
    // aéreo: custo 1100, nipon 1210, venda 2000 | hotel: venda 3000, nipon 3000, custo 2600
    expect(t.costTotal).toBeCloseTo(3700, 6);
    expect(t.niponTotal).toBeCloseTo(4210, 6);
    expect(t.saleTotal).toBeCloseTo(5000, 6);
    expect(t.lucroNipon).toBeCloseTo(510, 6);   // 110 (voo) + 400 (hotel)
    expect(t.excedente).toBeCloseTo(790, 6);    // só do voo (2000 − 1210)
  });

  it("adicionais somam ao total sem afetar lucro/comissão", () => {
    const semAdd = {
      quote_kind: "pacote",
      passengers: 1,
      pricing: { type: "dinheiro", cost_brl: 1000, tax: 100, sale_value: 2000, sale_per: "total" },
      client: { lead_origin: "x" },
      package: { include_flight: true, hotel: { hotel_commission: 400, rooms: [{ id: "r1", value: 3000 }] }, additionals: [] },
    };
    const comAdd = {
      ...semAdd,
      package: { ...semAdd.package, additionals: [{ name: "Seguro", value: 200 }, { nome: "Passeio", valor: 300 }] },
    };
    const a = computeCommission(semAdd);
    const b = computeCommission(comAdd);
    expect(b.saleTotal - a.saleTotal).toBeCloseTo(500, 6);   // total cresce
    expect(b.lucroNipon).toBeCloseTo(a.lucroNipon, 6);       // lucro inalterado
    expect(b.excedente).toBeCloseTo(a.excedente, 6);         // excedente inalterado
    expect(b.total).toBeCloseTo(a.total, 6);                 // comissão inalterada
  });

  it("comissão do hotel segue o baseRate (carteira própria = 30%)", () => {
    const c = computeCommission({
      quote_kind: "pacote",
      passengers: 1,
      client: { lead_origin: "Carteira Própria" },
      package: { include_flight: false, hotel: { hotel_commission: 1000, rooms: [{ id: "r1", value: 5000 }] }, additionals: [] },
    });
    expect(c.baseRate).toBe(0.3);
    expect(c.comissaoBase).toBeCloseTo(1000 * 0.3, 6);  // baseRate sobre o lucro do hotel
    expect(c.comissaoExtra).toBeCloseTo(0, 6);
    expect(c.total).toBeCloseTo(300, 6);
  });

  it("retrocompat: quote_kind ausente → idêntico ao aéreo puro", () => {
    const q = { passengers: 2, pricing: { type: "dinheiro", cost_brl: 1000, tax: 100, sale_value: 3000, sale_per: "total" } };
    const t = computePricingTotals(q);
    expect(t.isPacote).toBe(false);
    expect(t.costTotal).toBeCloseTo(2200, 6);
    expect(t.niponTotal).toBeCloseTo(2420, 6);
    expect(t.saleTotal).toBe(3000);
    expect(t.lucroNipon).toBeCloseTo(220, 6);
  });

  it("quote_kind=pacote sem package → trata como aéreo (não quebra)", () => {
    const t = computePricingTotals({ quote_kind: "pacote", passengers: 1, pricing: { type: "dinheiro", cost_brl: 1000, tax: 0 } });
    expect(t.isPacote).toBe(false); // sem package não há pacote efetivo
    expect(t.costTotal).toBeCloseTo(1000, 6);
  });

  it("lê package aninhado em pricing (persistência no jsonb)", () => {
    const t = computePricingTotals({
      passengers: 1,
      pricing: {
        type: "dinheiro", cost_brl: 1000, tax: 0, sale_value: 1500, sale_per: "total",
        quote_kind: "pacote",
        package: { include_flight: true, hotel: { hotel_commission: 200, rooms: [{ id: "r1", value: 2000 }] }, additionals: [] },
      },
    });
    expect(t.isPacote).toBe(true);
    expect(t.saleTotal).toBeCloseTo(3500, 6); // 1500 voo + 2000 hotel
    expect(t.costTotal).toBeCloseTo(2800, 6); // 1000 voo + 1800 hotel
  });
});

describe("buildCommissionSnapshot", () => {
  it("retorna o shape persistível com calculated_at ISO", () => {
    const s = buildCommissionSnapshot({
      passengers: 2,
      client: { lead_origin: "Instagram" },
      pricing: { type: "dinheiro", cost_brl: 1000, tax: 100, sale_value: 3000, sale_per: "total" },
    });
    expect(s).toMatchObject({
      base_rate: 0.25,
      passengers: 2,
      is_carteira_propria: false,
    });
    expect(s.base).toBeCloseTo(55, 6);
    expect(s.extra).toBeCloseTo(261, 6);
    expect(s.total).toBeCloseTo(316, 6);
    expect(s.cost_total).toBeCloseTo(2200, 6);
    expect(s.nipon_total).toBeCloseTo(2420, 6);
    expect(new Date(s.calculated_at).toString()).not.toBe("Invalid Date");
  });
});
