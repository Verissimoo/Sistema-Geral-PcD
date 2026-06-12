import { describe, it, expect } from "vitest";
import { parseBR, sanitizeBRInput } from "../parseBR";

describe("parseBR", () => {
  it("vírgula é decimal, ponto é milhar", () => {
    expect(parseBR("1.234,56")).toBe(1234.56);
    expect(parseBR("1234,56")).toBe(1234.56);
    expect(parseBR("320,50")).toBe(320.5);
    expect(parseBR("1.000.000")).toBe(1000000);
    expect(parseBR("34.607")).toBe(34607);
    expect(parseBR("34,607")).toBe(34.607);
  });

  it("COMPORTAMENTO ATUAL: '1234.56' tem o ponto removido como milhar → 123456", () => {
    // Caracterização: formato americano NÃO é suportado — o ponto é sempre milhar.
    expect(parseBR("1234.56")).toBe(123456);
  });

  it("vazio/null/undefined → 0", () => {
    expect(parseBR("")).toBe(0);
    expect(parseBR(null)).toBe(0);
    expect(parseBR(undefined)).toBe(0);
  });

  it("texto inválido → 0; NaN/Infinity → 0", () => {
    expect(parseBR("abc")).toBe(0);
    expect(parseBR(NaN)).toBe(0);
    expect(parseBR(Infinity)).toBe(0);
  });

  it("números passam direto (idempotente)", () => {
    expect(parseBR(123)).toBe(123);
    expect(parseBR(123.45)).toBe(123.45);
    expect(parseBR(-50)).toBe(-50);
  });

  it("negativos em string", () => {
    expect(parseBR("-1.234,56")).toBe(-1234.56);
    expect(parseBR("-320,50")).toBe(-320.5);
  });
});

describe("sanitizeBRInput", () => {
  it("mantém apenas dígitos, vírgula, ponto e sinal", () => {
    expect(sanitizeBRInput("R$ 1.234,56")).toBe("1.234,56");
    expect(sanitizeBRInput("abc123,45xyz")).toBe("123,45");
    expect(sanitizeBRInput("-50,00")).toBe("-50,00");
  });

  it("null/undefined → string vazia", () => {
    expect(sanitizeBRInput(null)).toBe("");
    expect(sanitizeBRInput(undefined)).toBe("");
  });

  it("números viram string", () => {
    expect(sanitizeBRInput(1234)).toBe("1234");
  });
});
