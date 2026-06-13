import { describe, it, expect } from "vitest";
import {
  parseTimeWithOffset,
  addDaysToDate,
  isNextDayArrival,
  calculateSegmentDuration,
} from "../timeParser";

describe("parseTimeWithOffset", () => {
  it("hora simples e com offset +Nd", () => {
    expect(parseTimeWithOffset("08:30")).toEqual({ time: "08:30", dayOffset: 0 });
    expect(parseTimeWithOffset("08:30+1d")).toEqual({ time: "08:30", dayOffset: 1 });
    expect(parseTimeWithOffset("08:30 +2d")).toEqual({ time: "08:30", dayOffset: 2 });
  });

  it("null/vazio → vazio; inválido passa intacto sem offset", () => {
    expect(parseTimeWithOffset(null)).toEqual({ time: "", dayOffset: 0 });
    expect(parseTimeWithOffset("")).toEqual({ time: "", dayOffset: 0 });
    expect(parseTimeWithOffset("invalido")).toEqual({ time: "invalido", dayOffset: 0 });
  });
});

describe("addDaysToDate", () => {
  it("soma dias preservando YYYY-MM-DD; offset 0 retorna original", () => {
    expect(addDaysToDate("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysToDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDate("2026-06-12", 0)).toBe("2026-06-12");
  });

  it("entradas vazias passam intactas", () => {
    expect(addDaysToDate("", 1)).toBe("");
    expect(addDaysToDate(null, 1)).toBeNull();
  });
});

describe("isNextDayArrival", () => {
  it("datas explícitas mandam (mesmo dia → false; dias diferentes → true)", () => {
    expect(isNextDayArrival({ data_saida: "2026-06-12", data_chegada: "2026-06-12", horario_saida: "23:00", horario_chegada: "01:00" })).toBe(false);
    expect(isNextDayArrival({ data_saida: "2026-06-12", data_chegada: "2026-06-13" })).toBe(true);
  });

  it("sufixo +1d na chegada → true", () => {
    expect(isNextDayArrival({ horario_chegada: "06:00+1d" })).toBe(true);
  });

  it("heurística chegada < saída → true; chegada ≥ saída → false", () => {
    expect(isNextDayArrival({ horario_saida: "23:30", horario_chegada: "05:45" })).toBe(true);
    expect(isNextDayArrival({ horario_saida: "08:00", horario_chegada: "12:00" })).toBe(false);
  });

  it("segment nulo → false", () => {
    expect(isNextDayArrival(null)).toBe(false);
  });
});

describe("calculateSegmentDuration", () => {
  it("voo no mesmo dia", () => {
    expect(calculateSegmentDuration({ horario_saida: "08:00", horario_chegada: "12:30" })).toBe("4h 30min");
  });

  it("voo virando o dia (heurística +24h)", () => {
    expect(calculateSegmentDuration({ horario_saida: "23:30", horario_chegada: "05:45" })).toBe("6h 15min");
  });

  it("datas explícitas têm precisão exata (voo de 2 dias)", () => {
    expect(
      calculateSegmentDuration({
        data_saida: "2026-06-12", horario_saida: "10:00",
        data_chegada: "2026-06-14", horario_chegada: "11:30",
      })
    ).toBe("49h 30min");
  });

  it("COMPORTAMENTO ATUAL: chegada igual à saída sem datas vira 24h", () => {
    expect(calculateSegmentDuration({ horario_saida: "10:00", horario_chegada: "10:00" })).toBe("24h 00min");
  });

  it("dados faltando → string vazia", () => {
    expect(calculateSegmentDuration(null)).toBe("");
    expect(calculateSegmentDuration({ horario_saida: "10:00" })).toBe("");
    expect(calculateSegmentDuration({})).toBe("");
  });
});
