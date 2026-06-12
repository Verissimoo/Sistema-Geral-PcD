import { describe, it, expect } from "vitest";
import { formatBRL, formatDateBR, formatDateTimeBR } from "../format";

const clean = (s) => s.replace(/[  ]/g, " ");

describe("formatBRL", () => {
  it("formata números em pt-BR", () => {
    expect(clean(formatBRL(1234.56))).toBe("R$ 1.234,56");
    expect(clean(formatBRL(0))).toBe("R$ 0,00");
    expect(clean(formatBRL(-50))).toBe("-R$ 50,00");
  });

  it("NaN-safe: inválidos viram R$ 0,00", () => {
    expect(clean(formatBRL(null))).toBe("R$ 0,00");
    expect(clean(formatBRL(undefined))).toBe("R$ 0,00");
    expect(clean(formatBRL("abc"))).toBe("R$ 0,00");
  });

  it("aceita strings numéricas", () => {
    expect(clean(formatBRL("1500"))).toBe("R$ 1.500,00");
  });
});

describe("formatDateBR", () => {
  it("YYYY-MM-DD → DD/MM/YYYY sem shift de fuso", () => {
    expect(formatDateBR("2026-06-12")).toBe("12/06/2026");
    expect(formatDateBR("2026-01-01")).toBe("01/01/2026");
  });

  it("ISO com hora usa toLocaleDateString", () => {
    // meio-dia local — sem risco de virar o dia em nenhum fuso BR
    const iso = new Date(2026, 5, 12, 12, 0, 0).toISOString();
    expect(formatDateBR(iso)).toBe(new Date(iso).toLocaleDateString("pt-BR"));
  });

  it("vazio → fallback (padrão '—', customizável)", () => {
    expect(formatDateBR(null)).toBe("—");
    expect(formatDateBR("")).toBe("—");
    expect(formatDateBR("", "")).toBe("");
  });
});

describe("formatDateTimeBR", () => {
  it("formata data + hora; vazio → —", () => {
    const d = new Date(2026, 5, 12, 14, 30, 0);
    expect(clean(formatDateTimeBR(d.toISOString()))).toMatch(/12\/06\/2026,? 14:30/);
    expect(formatDateTimeBR(null)).toBe("—");
  });
});
