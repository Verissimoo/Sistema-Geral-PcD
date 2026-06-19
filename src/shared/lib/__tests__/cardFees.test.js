import { describe, it, expect } from "vitest";
import { calcInstallment, parseParcelas, findRate, PLATFORMS } from "../cardFees";

describe("parseParcelas", () => {
  it("deriva nº de parcelas do label", () => {
    expect(parseParcelas("12x")).toBe(12);
    expect(parseParcelas("1x")).toBe(1);
    expect(parseParcelas("À vista")).toBe(1);
    expect(parseParcelas("Débito")).toBe(1);
    expect(parseParcelas("")).toBe(1);
    expect(parseParcelas(null)).toBe(1);
  });
});

describe("calcInstallment", () => {
  it("taxa = venda × %; total = venda + taxa; parcela = total / n", () => {
    const r = calcInstallment(2000, 13.43, 0, "8x");
    expect(r.valorTaxa).toBeCloseTo(268.6, 6);
    expect(r.totalComTaxa).toBeCloseTo(2268.6, 6);
    expect(r.numParcelas).toBe(8);
    expect(r.valorParcela).toBeCloseTo(283.575, 6);
    expect(r.taxaPct).toBe(13.43);
  });

  it("inclui taxa fixa quando informada", () => {
    const r = calcInstallment(2000, 13.43, 1.5, "8x");
    expect(r.totalComTaxa).toBeCloseTo(2270.1, 6);
    expect(r.valorParcela).toBeCloseTo(2270.1 / 8, 6);
  });

  it("à vista → 1 parcela igual ao total", () => {
    const r = calcInstallment(1000, 4.2, 0, "À vista");
    expect(r.numParcelas).toBe(1);
    expect(r.valorParcela).toBeCloseTo(r.totalComTaxa, 6);
  });

  it("entradas inválidas → zeros seguros", () => {
    const r = calcInstallment(null, null, null, "1x");
    expect(r.valorTaxa).toBe(0);
    expect(r.totalComTaxa).toBe(0);
  });
});

describe("findRate", () => {
  it("encontra a taxa por adquirente/modalidade/parcela", () => {
    const f = findRate("Hyper Cash", "Cartão", "8x");
    expect(f.rate.percentage).toBe(13.43);
    expect(f.modality.has_fixed_fee).toBe(true);
  });
  it("retorna null quando não existe", () => {
    expect(findRate("X", "Y", "1x")).toBeNull();
  });
});

describe("PLATFORMS", () => {
  it("tem as adquirentes esperadas", () => {
    expect(PLATFORMS.map((p) => p.name)).toEqual(["Infinite Pay", "Hyper Cash"]);
  });
});
