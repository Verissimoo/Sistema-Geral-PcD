import { useState } from "react";
import { MapPin, BedDouble, Images, ArrowRight, ImageIcon, Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatBRL } from "@/shared/lib/format";
import HotelLightbox from "@/shared/components/hotel/HotelLightbox";

// Menor preço "a partir de" entre os quartos do hotel (0 = sem preço).
function priceFrom(hotel) {
  const prices = (hotel.rooms || []).map((r) => Number(r.price_from) || 0).filter((v) => v > 0);
  return prices.length ? Math.min(...prices) : 0;
}

// Card visual (read-only) de um hotel de campanha — material de apoio à venda.
export default function VendedorHotelCard({ hotel, onUse }) {
  const photos = (Array.isArray(hotel.photos) ? hotel.photos : []).map((p) => p.url).filter(Boolean);
  const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];
  const additionals = Array.isArray(hotel.additionals) ? hotel.additionals : [];
  const from = priceFrom(hotel);

  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  const openAt = (i) => photos.length && setLightbox({ open: true, index: i });
  const close = () => setLightbox((s) => ({ ...s, open: false }));
  const prev = () => setLightbox((s) => ({ ...s, index: (s.index - 1 + photos.length) % photos.length }));
  const next = () => setLightbox((s) => ({ ...s, index: (s.index + 1) % photos.length }));

  return (
    <Card className="overflow-hidden border-border/60 hover:border-primary/40 hover:shadow-md transition-all">
      {/* Capa */}
      <button
        type="button"
        onClick={() => openAt(0)}
        className="relative block w-full h-44 bg-muted group"
        title={photos.length ? "Ver fotos" : undefined}
      >
        {photos[0] ? (
          <img src={photos[0]} alt={hotel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-text-muted">
            <ImageIcon className="h-8 w-8 opacity-40" />
          </div>
        )}
        {photos.length > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 text-white text-[11px] px-2 py-0.5">
            <Images className="h-3 w-3" /> {photos.length}
          </span>
        )}
        {from > 0 && (
          <span className="absolute top-2 left-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 shadow">
            a partir de {formatBRL(from)}
          </span>
        )}
      </button>

      <CardContent className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold leading-tight">{hotel.name || "Hotel"}</h4>
          {hotel.location && (
            <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" /> {hotel.location}
            </p>
          )}
          {hotel.description && (
            <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{hotel.description}</p>
          )}
        </div>

        {/* Quartos */}
        {rooms.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium flex items-center gap-1">
              <BedDouble className="h-3 w-3" /> Quartos
            </p>
            {rooms.map((r, i) => (
              <div key={r.id || i} className="flex items-center justify-between text-xs">
                <span className="truncate">{r.name || `Quarto ${i + 1}`}</span>
                {Number(r.price_from) > 0 && (
                  <span className="text-text-muted shrink-0 ml-2">a partir de {formatBRL(Number(r.price_from))}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Adicionais */}
        {additionals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {additionals.map((a, i) => (
              <Badge key={i} variant="outline" className="text-[11px] font-normal gap-1">
                <Plus className="h-2.5 w-2.5" /> {a.name}
                {Number(a.price_from) > 0 && <span className="text-text-muted">· {formatBRL(Number(a.price_from))}</span>}
              </Badge>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-2 pt-1">
          {photos.length > 0 && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => openAt(0)}>
              <Images className="h-3.5 w-3.5" /> Ver fotos
            </Button>
          )}
          <Button type="button" size="sm" className="gap-1.5 ml-auto" onClick={() => onUse?.(hotel)}>
            Usar no orçamento <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>

      <HotelLightbox
        images={photos}
        index={lightbox.index}
        open={lightbox.open}
        onClose={close}
        onPrev={prev}
        onNext={next}
      />
    </Card>
  );
}
