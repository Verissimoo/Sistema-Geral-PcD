// Utilitários para lidar com horários que podem trazer offset de dia
// (ex.: "08:30+1d") e cálculo de chegada no dia seguinte.

const TIME_OFFSET_RE = /^(\d{1,2}:\d{2})(?:\s*\+\s*(\d+)\s*d)?$/i;

/**
 * Converte "08:30+1d" em { time: "08:30", dayOffset: 1 }.
 * Aceita formatos: "08:30", "08:30+1d", "08:30 +1d", "08:30+2d".
 * Strings inválidas retornam { time: input, dayOffset: 0 } para não quebrar UI.
 */
export function parseTimeWithOffset(timeStr) {
  if (timeStr == null) return { time: "", dayOffset: 0 };
  const s = String(timeStr).trim();
  if (!s) return { time: "", dayOffset: 0 };
  const m = s.match(TIME_OFFSET_RE);
  if (!m) return { time: s, dayOffset: 0 };
  return {
    time: m[1],
    dayOffset: m[2] ? parseInt(m[2], 10) : 0,
  };
}

/**
 * Soma N dias a uma data YYYY-MM-DD. Retorna a data original se algum
 * argumento estiver vazio. Usa T12:00:00 para evitar shifts de fuso.
 */
export function addDaysToDate(baseDate, dayOffset) {
  if (!baseDate) return baseDate;
  const offset = Number(dayOffset) || 0;
  if (offset === 0) return baseDate;
  const d = new Date(`${baseDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return baseDate;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/**
 * Verifica se um segmento tem chegada no dia seguinte à saída.
 * Ordem de prioridade:
 *  1. Datas explícitas (data_saida + data_chegada)
 *  2. Sufixo +Nd no horario_chegada
 *  3. Heurística: chegada < saída (assume +1d)
 */
export function isNextDayArrival(segment) {
  if (!segment) return false;

  if (segment.data_saida && segment.data_chegada) {
    return segment.data_saida !== segment.data_chegada;
  }

  const { dayOffset } = parseTimeWithOffset(segment.horario_chegada);
  if (dayOffset > 0) return true;

  if (segment.horario_saida && segment.horario_chegada) {
    const cleanArr = parseTimeWithOffset(segment.horario_chegada).time;
    const cleanDep = parseTimeWithOffset(segment.horario_saida).time;
    const [depH, depM] = cleanDep.split(":").map(Number);
    const [arrH, arrM] = cleanArr.split(":").map(Number);
    if (
      Number.isFinite(depH) && Number.isFinite(arrH) &&
      arrH * 60 + (arrM || 0) < depH * 60 + (depM || 0)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calcula a duração de um segmento de forma robusta:
 *  - Se há datas explícitas, usa-as para precisão exata.
 *  - Caso contrário cai na heurística de somar 24h quando chegada < saída.
 * Retorna "" se faltar dado essencial.
 */
export function calculateSegmentDuration(segment) {
  if (!segment) return "";
  const { time: cleanDep } = parseTimeWithOffset(segment.horario_saida);
  const { time: cleanArr } = parseTimeWithOffset(segment.horario_chegada);
  if (!cleanDep || !cleanArr) return "";

  if (segment.data_saida && segment.data_chegada) {
    const dep = new Date(`${segment.data_saida}T${cleanDep}:00`);
    const arr = new Date(`${segment.data_chegada}T${cleanArr}:00`);
    if (!Number.isNaN(dep.getTime()) && !Number.isNaN(arr.getTime()) && arr > dep) {
      const diffMin = Math.round((arr - dep) / 60000);
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return `${h}h ${String(m).padStart(2, "0")}min`;
    }
  }

  const [depH, depM] = cleanDep.split(":").map(Number);
  const [arrH, arrM] = cleanArr.split(":").map(Number);
  if (![depH, depM, arrH, arrM].every(Number.isFinite)) return "";
  let depMin = depH * 60 + depM;
  let arrMin = arrH * 60 + arrM;
  if (arrMin <= depMin) arrMin += 24 * 60;
  const diff = arrMin - depMin;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}
