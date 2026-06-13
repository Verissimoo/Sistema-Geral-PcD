import { parseTimeWithOffset, addDaysToDate, isNextDayArrival } from "@/shared/lib/timeParser";

// Constrói um segmento a partir dos campos legacy do trecho.
function legacyToSegment(trecho) {
  if (!trecho) return null;
  return {
    numero_voo: trecho.numero_voo || "",
    companhia: trecho.companhia || "",
    origem_iata: trecho.origem_iata || "",
    origem_cidade: trecho.origem_cidade || "",
    destino_iata: trecho.destino_iata || "",
    destino_cidade: trecho.destino_cidade || "",
    horario_saida: trecho.horario_saida || "",
    horario_chegada: trecho.horario_chegada || "",
    data_saida: trecho.data_saida || null,
    data_chegada: trecho.data_chegada || null,
    duracao: trecho.duracao || "",
  };
}

function normalizeSegment(seg, previousArrivalDate) {
  if (!seg) return seg;
  const { time: cleanDep, dayOffset: depOff } = parseTimeWithOffset(seg.horario_saida);
  const { time: cleanArr, dayOffset: arrOff } = parseTimeWithOffset(seg.horario_chegada);

  const result = {
    ...seg,
    horario_saida: cleanDep,
    horario_chegada: cleanArr,
  };

  // Se a data_saida não veio mas temos a chegada do segmento anterior, herda.
  if (!result.data_saida && previousArrivalDate) {
    result.data_saida = previousArrivalDate;
  }

  // Aplica offset de dia da saída (raro mas suportado: "23:50+1d").
  if (result.data_saida && depOff > 0) {
    result.data_saida = addDaysToDate(result.data_saida, depOff);
  }

  // Se há sufixo +Nd na chegada e temos data_saida, calcula data_chegada exata.
  if (result.data_saida && arrOff > 0) {
    result.data_chegada = addDaysToDate(result.data_saida, arrOff);
  }

  // Heurística final: chegada < saída sem dados explícitos → +1d.
  if (!result.data_chegada && isNextDayArrival(result)) {
    if (result.data_saida) {
      result.data_chegada = addDaysToDate(result.data_saida, 1);
    }
  }

  // Se temos data_saida mas falta data_chegada e mesmo dia (sem sinal de overnight),
  // preenche data_chegada = data_saida para facilitar cálculos downstream.
  if (result.data_saida && !result.data_chegada && !isNextDayArrival(result)) {
    result.data_chegada = result.data_saida;
  }

  return result;
}

export function normalizeTrecho(trecho) {
  if (!trecho) return trecho;
  const rawSegs = Array.isArray(trecho.segmentos) && trecho.segmentos.length > 0
    ? trecho.segmentos
    : [legacyToSegment(trecho)];

  // Cada segmento herda a data_chegada do anterior para "encadear" multi-trechos.
  let prevArrival = null;
  const segmentos = rawSegs.map((s) => {
    const normalized = normalizeSegment(s, prevArrival);
    prevArrival = normalized.data_chegada || prevArrival;
    return normalized;
  });

  return {
    ...trecho,
    segmentos,
  };
}

export function normalizeItinerary(rawItinerary) {
  if (!rawItinerary?.trechos) return rawItinerary;
  return {
    ...rawItinerary,
    trechos: rawItinerary.trechos.map(normalizeTrecho),
  };
}
