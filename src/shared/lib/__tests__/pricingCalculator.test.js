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
