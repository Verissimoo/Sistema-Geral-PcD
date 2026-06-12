import { describe, it, expect } from "vitest";
import {
  getCostForMiles,
  getSaleForMiles,
  getTierForMiles,
  getMarginPercent,
  isOutdated,
  daysSinceUpdate,
} from "../milesHelper";

const FLAT = { cost_per_thousand: 18, sale_per_thousand: 25 };

const TIERED = {
  cost_per_thousand: 18,
  sale_per_thousand: 25,
  has_variable_pricing: true,
  variable_tiers: [
    { min_miles: 0, max_miles: 49999, cost: 20, sale: 28, label: "até 50k" },
    { min_miles: 50000, max_miles: 99999, cost: 17, sale: 0, label: "50k–100k" }, // sale 0 → cai p/ margem base
    { min_miles: 100000, max_miles: null, cost: 15, label: "100k+" }, // sem sale
  ],
};

describe("getCostForMiles", () => {
  it("programa nulo → 0", () => {
    expect(getCostForMiles(null, 10000)).toBe(0);
  });

  it("sem variable_pricing → cost_per_thousand fixo", () => {
    expect(getCostForMiles(FLAT, 10000)).toBe(18);
    expect(getCostForMiles(FLAT, 0)).toBe(18);
  });

  it("fronteiras dos tiers: min inclusivo, max inclusivo", () => {
    expect(getCostForMiles(TIERED, 0)).toBe(20);
    expect(getCostForMiles(TIERED, 49999)).toBe(20);
    expect(getCostForMiles(TIERED, 50000)).toBe(17);
    expect(getCostForMiles(TIERED, 99999)).toBe(17);
    expect(getCostForMiles(TIERED, 100000)).toBe(15);
    expect(getCostForMiles(TIERED, 5000000)).toBe(15); // max null = sem teto
  });

  it("qty não-numérica → 0 milhas → primeiro tier", () => {
    expect(getCostForMiles(TIERED, "abc")).toBe(20);
    expect(getCostForMiles(TIERED, null)).toBe(20);
  });
});

describe("getTierForMiles", () => {
  it("retorna o objeto do tier ou null", () => {
    expect(getTierForMiles(TIERED, 60000)?.label).toBe("50k–100k");
    expect(getTierForMiles(FLAT, 60000)).toBeNull();
    expect(getTierForMiles(null, 60000)).toBeNull();
  });
});

describe("getSaleForMiles", () => {
  it("programa nulo → 0; flat → sale_per_thousand", () => {
    expect(getSaleForMiles(null, 1)).toBe(0);
    expect(getSaleForMiles(FLAT, 1)).toBe(25);
  });

  it("tier com sale > 0 usa o sale do tier", () => {
    expect(getSaleForMiles(TIERED, 10000)).toBe(28);
  });

  it("tier com sale 0/ausente: cost do tier + margem base do programa", () => {
    // margem base = 25 - 18 = 7
    expect(getSaleForMiles(TIERED, 60000)).toBe(17 + 7);
    expect(getSaleForMiles(TIERED, 200000)).toBe(15 + 7);
  });
});

describe("getMarginPercent", () => {
  it("calcula % com 1 casa; custo 0 → 0", () => {
    expect(getMarginPercent(20, 28)).toBe(40);
    expect(getMarginPercent(18, 25)).toBe(38.9);
    expect(getMarginPercent(0, 25)).toBe(0);
    expect(getMarginPercent(null, 25)).toBe(0);
  });
});

describe("isOutdated / daysSinceUpdate", () => {
  it("sem data → outdated true / null", () => {
    expect(isOutdated(null)).toBe(true);
    expect(daysSinceUpdate(null)).toBeNull();
  });

  it("data recente não está desatualizada; antiga está", () => {
    const ontem = new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString();
    const haMuito = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString();
    expect(isOutdated(ontem)).toBe(false);
    expect(isOutdated(haMuito)).toBe(true);
    expect(isOutdated(haMuito, 60)).toBe(false); // threshold customizado
    expect(daysSinceUpdate(ontem)).toBe(1);
    expect(daysSinceUpdate(haMuito)).toBe(45);
  });
});
