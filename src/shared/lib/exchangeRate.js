// Câmbio EUR-BRL via AwesomeAPI (gratuito, sem autenticação).
// Cache em localStorage por 1h.
// Endpoint: https://economia.awesomeapi.com.br/last/EUR-BRL

const CACHE_KEY = "pcd_exchange_eur_brl";
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function fetchEurBrlRate(forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TTL_MS) return parsed.data;
      }
    } catch {
      /* cache leitura inválida — ignora e busca da rede */
    }
  }

  try {
    const response = await fetch("https://economia.awesomeapi.com.br/last/EUR-BRL");
    if (!response.ok) throw new Error("Falha ao buscar câmbio");
    const json = await response.json();
    const eurbrl = json.EURBRL;
    const data = {
      rate: parseFloat(eurbrl.bid),
      rateAsk: parseFloat(eurbrl.ask),
      high: parseFloat(eurbrl.high),
      low: parseFloat(eurbrl.low),
      varBid: parseFloat(eurbrl.varBid),
      pctChange: parseFloat(eurbrl.pctChange),
      timestamp: Date.now(),
      sourceTimestamp: eurbrl.timestamp,
      createDate: eurbrl.create_date,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  } catch (err) {
    console.error("Erro ao buscar câmbio EUR-BRL:", err);
    // Fallback: último cache mesmo expirado, melhor que nada.
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached).data;
    } catch {
      /* sem cache válido */
    }
    return null;
  }
}

export function convertEurToBrl(eurValue, rate) {
  if (!eurValue || !rate) return 0;
  return parseFloat(eurValue) * rate;
}

export function convertBrlToEur(brlValue, rate) {
  if (!brlValue || !rate) return 0;
  return parseFloat(brlValue) / rate;
}

export function formatEUR(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "EUR" });
}
