import { describe, it, expect } from "vitest";
import { convertEurToBrl, convertBrlToEur, formatEUR } from "../exchangeRate";

// normaliza NBSP/narrow-NBSP que o toLocaleString insere
const clean = (s) => s.replace(/ | /g, " ");

describe("convertEurToBrl", () => {
  it("multiplica pelo rate", () => {
    expect(convertEurToBrl(100, 6.2)).toBeCloseTo(620, 6);
    expect(convertEurToBrl("100", 6.2)).toBeCloseTo(620, 6); // aceita string
  });

  it("valor ou rate falsy → 0", () => {
    expect(convertEurToBrl(0, 6.2)).toBe(0);
    expect(convertEurToBrl(100, 0)).toBe(0);
    expect(convertEurToBrl(null, 6.2)).toBe(0);
    expect(convertEurToBrl(100, null)).toBe(0);
  });
});

describe("convertBrlToEur", () => {
  it("divide pelo rate", () => {
    expect(convertBrlToEur(620, 6.2)).toBeCloseTo(100, 6);
  });

  it("valor ou rate falsy → 0 (sem divisão por zero)", () => {
    expect(convertBrlToEur(0, 6.2)).toBe(0);
    expect(convertBrlToEur(620, 0)).toBe(0);
    expect(convertBrlToEur(null, 6.2)).toBe(0);
  });
});

describe("formatEUR", () => {
  it("formata em pt-BR com símbolo €", () => {
    expect(clean(formatEUR(1234.56))).toBe("€ 1.234,56");
    expect(clean(formatEUR(0))).toBe("€ 0,00");
  });

  it("não-numérico → € 0,00", () => {
    expect(clean(formatEUR(null))).toBe("€ 0,00");
    expect(clean(formatEUR("abc"))).toBe("€ 0,00");
  });
});
