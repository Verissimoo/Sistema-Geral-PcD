// Converte um hotel de campanha (shape do banco) para o shape de package.hotel
// do gerador de orçamento. Tudo vira SUGESTÃO editável:
//   - fotos: URLs http do Storage entram direto como `src` (leves, persistem).
//   - quartos/adicionais: price_from (ilustrativo) vira o `value` editável.
//   - hotel_commission: vem de hotel_commission_suggested.
//   - source: referência leve de origem (campaign_id, hotel_id) p/ rastreio.

let _seq = 0;
const newId = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${_seq++}`;

// Número → string BR para os inputs monetários ("3.500,00"); vazio se 0/nulo.
const toBRInput = (n) => {
  const v = Number(n) || 0;
  return v > 0 ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
};

export function mapCampaignHotelToPackage(campaign, destination, chotel) {
  const photos = (Array.isArray(chotel?.photos) ? chotel.photos : [])
    .map((p) => p?.url)
    .filter(Boolean)
    .map((url) => ({ id: newId(), src: url }));

  const rooms = (Array.isArray(chotel?.rooms) ? chotel.rooms : []).map((r) => ({
    id: newId(),
    name: r?.name || "",
    value: toBRInput(r?.price_from),
    photo: r?.photo_url || null, // URL http do Storage (persiste no save)
  }));

  const additionals = (Array.isArray(chotel?.additionals) ? chotel.additionals : []).map((a) => ({
    id: newId(),
    name: a?.name || "",
    value: toBRInput(a?.price_from),
  }));

  return {
    hotel: {
      name: chotel?.name || "",
      location: chotel?.location || "",
      check_in: "",
      check_out: "",
      nights: "",
      description: chotel?.description || "",
      hotel_commission: toBRInput(chotel?.hotel_commission_suggested),
      selected_room_id: rooms[0]?.id || null,
      photos,
      rooms,
      // Rastreio de origem (analytics) — não precisa exibir.
      source: { campaign_id: campaign?.id || null, hotel_id: chotel?.id || null },
    },
    additionals,
  };
}
