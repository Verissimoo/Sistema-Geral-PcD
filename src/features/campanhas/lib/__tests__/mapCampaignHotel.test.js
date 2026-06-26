import { describe, it, expect } from "vitest";
import { mapCampaignHotelToPackage } from "../mapCampaignHotel";

describe("mapCampaignHotelToPackage", () => {
  const campaign = { id: "camp-1", name: "Nordeste" };
  const dest = { id: "dest-1", name: "Fortaleza" };
  const chotel = {
    id: "hotel-1",
    name: "Hotel Praia",
    location: "Praia do Futuro",
    description: "All inclusive",
    hotel_commission_suggested: 400,
    photos: [{ url: "https://x.supabase.co/a.jpg", path: "p/a.jpg" }, { url: "https://x.supabase.co/b.jpg" }],
    rooms: [
      { id: "r-old", name: "Standard", price_from: 3500, photo_url: "https://x.supabase.co/r1.jpg" },
      { name: "Luxo", price_from: 0 },
    ],
    additionals: [{ name: "Buggy", price_from: 200 }, { name: "Café", price_from: 0 }],
  };

  it("mapeia fotos como URLs http em src", () => {
    const { hotel } = mapCampaignHotelToPackage(campaign, dest, chotel);
    expect(hotel.photos).toHaveLength(2);
    expect(hotel.photos[0].src).toBe("https://x.supabase.co/a.jpg");
    expect(hotel.photos[0].id).toBeTruthy();
  });

  it("preenche quartos com value sugerido (BR) e foto por URL", () => {
    const { hotel } = mapCampaignHotelToPackage(campaign, dest, chotel);
    expect(hotel.rooms[0].name).toBe("Standard");
    expect(hotel.rooms[0].value).toBe("3.500,00");
    expect(hotel.rooms[0].photo).toBe("https://x.supabase.co/r1.jpg");
    // price_from 0 → value vazio
    expect(hotel.rooms[1].value).toBe("");
    // selected_room_id aponta para o primeiro quarto
    expect(hotel.selected_room_id).toBe(hotel.rooms[0].id);
  });

  it("preenche adicionais e comissão sugerida", () => {
    const { hotel, additionals } = mapCampaignHotelToPackage(campaign, dest, chotel);
    expect(hotel.hotel_commission).toBe("400,00");
    expect(additionals).toHaveLength(2);
    expect(additionals[0]).toMatchObject({ name: "Buggy", value: "200,00" });
    expect(additionals[1].value).toBe("");
  });

  it("guarda a referência de origem (source)", () => {
    const { hotel } = mapCampaignHotelToPackage(campaign, dest, chotel);
    expect(hotel.source).toEqual({ campaign_id: "camp-1", hotel_id: "hotel-1" });
  });

  it("tolera hotel sem fotos/quartos/adicionais", () => {
    const { hotel, additionals } = mapCampaignHotelToPackage(campaign, dest, { id: "h", name: "X" });
    expect(hotel.photos).toEqual([]);
    expect(hotel.rooms).toEqual([]);
    expect(hotel.selected_room_id).toBeNull();
    expect(additionals).toEqual([]);
  });
});
