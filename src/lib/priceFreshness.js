// Detecta se um orçamento em milhas usa um preço/mil "snapshotado" defasado
// em relação ao valor corrente da pcd_miles_table. Mantemos o snapshot
// imutável (auditoria), mas o gestor precisa saber quando a tabela mudou
// para decidir se reprecifica antes de fechar.

import { getCostForMiles } from "./milesHelper";

const PRICE_TOLERANCE = 0.5; // R$/mil — abaixo disso consideramos "igual"

function toNumber(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (s.includes(",")) {
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function checkSingleSegment(pricing, currentMilesTable) {
  const programId = pricing?.program_id;
  const usedCostPerThousand = toNumber(pricing?.miles_value_per_thousand);
  if (!programId || !usedCostPerThousand) {
    return { isFresh: true, reason: "sem programa identificado" };
  }
  const currentProgram = (currentMilesTable || []).find((p) => p.id === programId);
  if (!currentProgram) {
    return { isFresh: true, reason: "programa não encontrado mais na tabela" };
  }
  // Tier-aware: para programas com faixas variáveis (LATAM), usa a quantidade
  // de milhas do trecho para identificar a faixa correta na tabela atual.
  const milesQty = toNumber(pricing.miles_qty);
  const currentCostPerThousand = getCostForMiles(currentProgram, milesQty);
  const diff = Math.abs(currentCostPerThousand - usedCostPerThousand);
  if (diff < PRICE_TOLERANCE) {
    return { isFresh: true, currentPrice: currentCostPerThousand };
  }
  return {
    isFresh: false,
    usedPrice: usedCostPerThousand,
    currentPrice: currentCostPerThousand,
    priceChange: currentCostPerThousand - usedCostPerThousand,
    programName: currentProgram.program,
    programId,
  };
}

/**
 * Verifica frescor do preço de milhas. Sync — recebe a tabela já carregada.
 * Para Quebra de Trecho, avalia cada trecho e devolve o pior caso (maior delta
 * absoluto), com flag `multipleSegments` quando mais de um trecho está stale.
 */
export function checkMilesPriceFreshness(quote, currentMilesTable = []) {
  if (quote?.pricing?.type !== "milhas") {
    return { isFresh: true };
  }

  if (quote.pricing.is_split && Array.isArray(quote.pricing.trechos)) {
    const stale = [];
    for (const t of quote.pricing.trechos) {
      const r = checkSingleSegment(t, currentMilesTable);
      if (!r.isFresh) stale.push(r);
    }
    if (stale.length === 0) return { isFresh: true };
    stale.sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange));
    return {
      ...stale[0],
      multipleSegments: stale.length > 1,
      segmentsStale: stale.length,
    };
  }

  return checkSingleSegment(quote.pricing, currentMilesTable);
}

// Status que tratamos como "imutáveis para auditoria" — não oferecemos
// o botão de reprecificar.
export const FROZEN_STATUSES = new Set(["Emitido", "Cancelado", "Recusado"]);
