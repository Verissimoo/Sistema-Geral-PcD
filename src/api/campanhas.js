import { supabase } from "./client";

// Camada de dados da feature Campanhas Ativas.
// Tabelas: pcd_campaigns → pcd_campaign_destinations → pcd_campaign_hotels.
// Fotos vão pro Storage (bucket público campaign-hotels), persistentes — ao
// contrário das fotos efêmeras (base64) do orçamento avulso.

const T = {
  campaigns: "pcd_campaigns",
  destinations: "pcd_campaign_destinations",
  hotels: "pcd_campaign_hotels",
};
const BUCKET = "campaign-hotels";

const sortBySortOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

// ─── Campanhas ──────────────────────────────────────────────────────
export async function listCampaigns() {
  const { data, error } = await supabase
    .from(T.campaigns)
    .select("*, destinations:pcd_campaign_destinations(id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // anexa contagem de destinos para a listagem
  return (data || []).map((c) => ({
    ...c,
    destinations_count: Array.isArray(c.destinations) ? c.destinations.length : 0,
  }));
}

// Campanha + destinos + hotéis aninhados, já ordenados por sort_order.
export async function getCampaignFull(id) {
  const { data, error } = await supabase
    .from(T.campaigns)
    .select(
      "*, destinations:pcd_campaign_destinations(*, hotels:pcd_campaign_hotels(*))"
    )
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  if (Array.isArray(data?.destinations)) {
    data.destinations.sort(sortBySortOrder);
    for (const d of data.destinations) {
      if (Array.isArray(d.hotels)) d.hotels.sort(sortBySortOrder);
    }
  }
  return data;
}

export async function createCampaign(payload) {
  const { data, error } = await supabase
    .from(T.campaigns)
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(id, updates) {
  const { data, error } = await supabase
    .from(T.campaigns)
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaign(id) {
  // Limpa as fotos do Storage de todos os hotéis da campanha (best-effort)
  // antes do delete em cascata das linhas.
  try {
    const full = await getCampaignFull(id);
    const paths = collectStoragePaths(full);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  } catch {
    /* limpeza best-effort — não bloqueia a exclusão */
  }
  const { error } = await supabase.from(T.campaigns).delete().eq("id", id);
  if (error) throw error;
  return { success: true };
}

// ─── Destinos ───────────────────────────────────────────────────────
export async function createDestination(payload) {
  const { data, error } = await supabase
    .from(T.destinations)
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDestination(id, updates) {
  const { data, error } = await supabase
    .from(T.destinations)
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDestination(id) {
  try {
    const { data } = await supabase
      .from(T.hotels)
      .select("photos, rooms")
      .eq("destination_id", id);
    const paths = (data || []).flatMap(hotelStoragePaths);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  } catch {
    /* best-effort */
  }
  const { error } = await supabase.from(T.destinations).delete().eq("id", id);
  if (error) throw error;
  return { success: true };
}

// ─── Hotéis ─────────────────────────────────────────────────────────
export async function createHotel(payload) {
  const { data, error } = await supabase
    .from(T.hotels)
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHotel(id, updates) {
  const { data, error } = await supabase
    .from(T.hotels)
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHotel(hotel) {
  const id = typeof hotel === "string" ? hotel : hotel?.id;
  if (typeof hotel === "object") {
    try {
      const paths = hotelStoragePaths(hotel);
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    } catch {
      /* best-effort */
    }
  }
  const { error } = await supabase.from(T.hotels).delete().eq("id", id);
  if (error) throw error;
  return { success: true };
}

// ─── Storage ────────────────────────────────────────────────────────
// Converte data URL (saída do compressImage) em Blob para upload.
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

// Sobe uma imagem (data URL já comprimido) pro bucket e devolve { url, path }.
export async function uploadCampaignPhoto(dataUrl, { campaignId, hotelId }) {
  const blob = await dataUrlToBlob(dataUrl);
  const rand = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const path = `${campaignId}/${hotelId}/${rand}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removeCampaignPhoto(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

// Extrai todos os paths de Storage de um hotel (galeria + fotos de quarto).
function hotelStoragePaths(hotel) {
  const paths = [];
  for (const p of Array.isArray(hotel?.photos) ? hotel.photos : []) {
    if (p?.path) paths.push(p.path);
  }
  for (const r of Array.isArray(hotel?.rooms) ? hotel.rooms : []) {
    if (r?.photo_path) paths.push(r.photo_path);
  }
  return paths;
}

function collectStoragePaths(campaignFull) {
  const paths = [];
  for (const d of campaignFull?.destinations || []) {
    for (const h of d?.hotels || []) paths.push(...hotelStoragePaths(h));
  }
  return paths;
}
