import { supabase } from "@/shared/lib/supabase";
import { parseBR } from "@/shared/lib/parseBR";
import { formatDateBR as formatDateBRBase } from "@/shared/lib/format";

// ─── Helpers ────────────────────────────────────────────────────────
export const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Call sites deste arquivo esperam "" (não "—") para datas vazias.
export const formatDateBR = (dateStr) => formatDateBRBase(dateStr, "");

// Custo e Nipon (1 emissão) de um bloco extra de tipo de emissão. Espelha
// emissionCostNipon do pricingCalculator, mas lê strings BR do formData.
export const blockIsAzul = (b) =>
  b?.is_azul === true || String(b?.program_name || "").toLowerCase().includes("azul");

export function emissionBlockCN(b) {
  if (!b) return { cost: 0, nipon: 0 };
  const tax = parseBR(b.tax);
  if (b.type === "milhas_dinheiro") {
    const cost =
      (parseBR(b.miles_qty) / 1000) * (Number(b.cost_per_thousand) || 0) +
      parseBR(b.cash_part) +
      tax;
    return { cost, nipon: cost * 1.1 };
  }
  if (b.type === "milhas") {
    const cpt = Number(b.cost_per_thousand) || Number(b.miles_value_per_thousand) || 0;
    const cost = (parseBR(b.miles_qty) / 1000) * cpt + tax;
    return { cost, nipon: blockIsAzul(b) ? cost : cost * 1.1 };
  }
  const cost = parseBR(b.cost_brl) + tax;
  return { cost, nipon: blockIsAzul(b) ? cost : cost * 1.1 };
}

export const EMPTY_EMISSION_BLOCK = {
  type: "milhas",
  program_id: "",
  program_name: "",
  miles_qty: "",
  cost_per_thousand: 0,
  sale_per_thousand: 0,
  cash_part: "",
  cost_brl: "",
  tax: "",
  is_azul: false,
  cost_is_total: false,
};

// Gera um quote_number único — tenta até 5 vezes contra o banco antes do fallback
// baseado em timestamp. Combinado com a UNIQUE constraint em pcd_quotes.quote_number,
// elimina a chance de colisão entre vendedores que abram o gerador simultaneamente.
export async function gerarNumeroPCDUnico() {
  for (let i = 0; i < 5; i++) {
    const candidato = `PCD-${Math.floor(10000 + Math.random() * 90000)}`;
    const { data } = await supabase
      .from('pcd_quotes')
      .select('id')
      .eq('quote_number', candidato)
      .maybeSingle();
    if (!data) return candidato;
  }
  return `PCD-${Date.now().toString().slice(-7)}`;
}

export const calculateDuration = (departure, arrival) => {
  if (!departure || !arrival) return "";
  const depMatch = departure.match(/^(\d{1,2}):(\d{2})$/);
  const arrMatch = arrival.match(/^(\d{1,2}):(\d{2})$/);
  if (!depMatch || !arrMatch) return "";
  const depMinutes = parseInt(depMatch[1], 10) * 60 + parseInt(depMatch[2], 10);
  let arrMinutes = parseInt(arrMatch[1], 10) * 60 + parseInt(arrMatch[2], 10);
  // Se chegada é antes ou igual à saída, assume dia seguinte
  if (arrMinutes <= depMinutes) arrMinutes += 24 * 60;
  const diff = arrMinutes - depMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
};

// ─── Segmentos: helpers ────────────────────────────────────────────
// Constrói um "segmento" a partir dos campos legacy do trecho (quotes antigos).
export function createLegacySegment(trecho) {
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

export function getSegmentos(trecho) {
  if (!trecho) return [];
  if (Array.isArray(trecho.segmentos) && trecho.segmentos.length > 0) {
    return trecho.segmentos;
  }
  const legacy = createLegacySegment(trecho);
  return legacy ? [legacy] : [];
}

// Mantém os campos top-level do trecho espelhando segmentos[0] e segmentos[last],
// para retrocompatibilidade com código que ainda lê trecho.origem_iata etc.
export function syncTrechoFromSegmentos(trecho) {
  const segmentos = getSegmentos(trecho);
  if (segmentos.length === 0) return trecho;
  const first = segmentos[0];
  const last = segmentos[segmentos.length - 1];
  return {
    ...trecho,
    segmentos,
    escalas: Math.max(0, segmentos.length - 1),
    origem_iata: first.origem_iata || trecho.origem_iata || "",
    origem_cidade: first.origem_cidade || trecho.origem_cidade || "",
    destino_iata: last.destino_iata || trecho.destino_iata || "",
    destino_cidade: last.destino_cidade || trecho.destino_cidade || "",
    horario_saida: first.horario_saida || trecho.horario_saida || "",
    horario_chegada: last.horario_chegada || trecho.horario_chegada || "",
    companhia: first.companhia || trecho.companhia || "",
    numero_voo: first.numero_voo || trecho.numero_voo || "",
    duracao: trecho.tempo_total || trecho.duracao || "",
    aeroporto_escala:
      segmentos
        .slice(0, -1)
        .map((s) => s.destino_iata)
        .filter(Boolean)
        .join(" / ") || trecho.aeroporto_escala || "",
  };
}

// ─── Helpers Hidden City ───────────────────────────────────────────
// Retorna apenas os segmentos efetivos do trecho (até o segmento marcado
// como is_hidden_city_stop, inclusive). Se não houver hidden stop, retorna
// todos os segmentos.
export function getEffectiveSegments(trecho) {
  const segmentos = (trecho && Array.isArray(trecho.segmentos)) ? trecho.segmentos : [];
  const hiddenIdx = segmentos.findIndex((s) => s && s.is_hidden_city_stop);
  if (hiddenIdx === -1) return segmentos;
  return segmentos.slice(0, hiddenIdx + 1);
}

export const TICKET_TYPES = [
  { value: "Normal", help: "Bilhete padrão ponto a ponto" },
  { value: "Hidden City", help: "Passageiro desembarca antes do destino final do bilhete" },
  { value: "Quebra de Trecho", help: "Bilhetes separados por voo — funciona em ida-volta ou só-ida com conexão (mínimo 2 voos)" },
  { value: "Imigração", help: "Pacote com voo + assessoria para imigração" },
];

export const initialFormData = {
  // Tipo de orçamento: "aereo" (atual) ou "pacote" (voo opcional + hotel + adicionais).
  // Ausência do campo em quotes antigos = "aereo" (retrocompatibilidade total).
  quote_kind: "aereo",
  // Modelo do pacote — preenchido nos próximos passos (hotel/adicionais).
  package: { include_flight: true, hotel: null, additionals: [] },
  recipient_type: "cliente",
  partner_id: null,
  partner_name: null,
  client: null,
  product: null,
  ticket_type: "Normal",
  flight_images: [],
  itinerary: { trechos: [] },
  itinerary_reviewed: false,
  departure_date: "",
  return_date: "",
  one_way: false,
  passengers: 1,
  baggage: { personal: 1, carry_on: 1, checked: 0 },
  pricing: {
    type: "milhas",
    program_id: "",
    program_name: "",
    miles_value_per_thousand: 0,
    miles_qty: "",
    tax: "",
    cost_brl: "",
    is_azul: false,
    nipon_value: 0,
    sale_value: "",
    sale_per: "pessoa", // 'pessoa' (multiplica pelo nº de pax) | 'total' (já é o valor total)
  },
  additional: { active: false, value: "", description: "" },
  competitor: { active: false, name: "", value: "", fare_type: "Econômica" },
  services: {
    insurance: { active: false, value: "" },
    transfer: { active: false, value: "" },
  },
  // Cotação derivada (mesmo cliente)
  parent_quote_id: null,
  quote_sequence: 1,
};
