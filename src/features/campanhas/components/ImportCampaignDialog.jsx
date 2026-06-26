import { useState } from "react";
import { ChevronRight, MapPin, Hotel as HotelIcon, ArrowLeft, Loader2, ImageIcon, Megaphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { formatBRL } from "@/shared/lib/format";
import { useCampaigns, useCampaignFull } from "@/api/hooks";
import { mapCampaignHotelToPackage } from "@/features/campanhas/lib/mapCampaignHotel";

const priceFrom = (hotel) => {
  const prices = (hotel.rooms || []).map((r) => Number(r.price_from) || 0).filter((v) => v > 0);
  return prices.length ? Math.min(...prices) : 0;
};

// Modal de importação: campanha ativa → destino → hotel. Ao escolher o hotel,
// devolve o package mapeado via onSelect e fecha.
export default function ImportCampaignDialog({ open, onOpenChange, onSelect }) {
  const [campaignId, setCampaignId] = useState(null);
  const [destId, setDestId] = useState(null);

  const { data: campaigns = [], isLoading: loadingList } = useCampaigns({ enabled: open });
  const ativas = campaigns.filter((c) => c.status === "ativa");
  const { data: campaign, isLoading: loadingFull } = useCampaignFull(campaignId, { enabled: !!campaignId });

  const reset = () => { setCampaignId(null); setDestId(null); };
  const close = () => { onOpenChange(false); reset(); };

  const destinations = campaign?.destinations || [];
  const dest = destinations.find((d) => d.id === destId) || null;

  const pickHotel = (chotel) => {
    onSelect(mapCampaignHotelToPackage(campaign, dest, chotel));
    close();
  };

  // Breadcrumb de navegação
  const crumb = (
    <div className="flex items-center gap-1.5 text-xs text-text-muted flex-wrap">
      <button className="hover:text-text-primary" onClick={reset}>Campanhas</button>
      {campaign && <><ChevronRight className="h-3 w-3" /><button className="hover:text-text-primary" onClick={() => setDestId(null)}>{campaign.name}</button></>}
      {dest && <><ChevronRight className="h-3 w-3" /><span className="text-text-primary">{dest.name}</span></>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Importar de campanha ativa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {crumb}

          {/* Passo 1: campanhas */}
          {!campaignId && (
            loadingList ? (
              <Loading />
            ) : ativas.length === 0 ? (
              <Empty text="Nenhuma campanha ativa disponível." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ativas.map((c) => (
                  <RowButton key={c.id} onClick={() => setCampaignId(c.id)}
                    icon={<Megaphone className="h-4 w-4 text-primary" />}
                    title={c.name} subtitle={`${c.destinations_count} destino(s)`} />
                ))}
              </div>
            )
          )}

          {/* Passo 2: destinos */}
          {campaignId && !destId && (
            loadingFull ? (
              <Loading />
            ) : destinations.length === 0 ? (
              <Empty text="Esta campanha não tem destinos." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {destinations.map((d) => (
                  <RowButton key={d.id} onClick={() => setDestId(d.id)}
                    icon={<MapPin className="h-4 w-4 text-primary" />}
                    title={d.name} subtitle={`${(d.hotels || []).length} hotel(is)`} />
                ))}
              </div>
            )
          )}

          {/* Passo 3: hotéis */}
          {campaignId && destId && (
            <>
              <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-text-muted" onClick={() => setDestId(null)}>
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar aos destinos
              </Button>
              {(dest?.hotels || []).length === 0 ? (
                <Empty text="Nenhum hotel neste destino." />
              ) : (
                <div className="space-y-2">
                  {dest.hotels.map((h) => {
                    const from = priceFrom(h);
                    return (
                      <button key={h.id} type="button" onClick={() => pickHotel(h)}
                        className="w-full flex items-center gap-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors p-2.5 text-left">
                        <div className="h-12 w-16 rounded-md overflow-hidden bg-muted shrink-0 grid place-items-center">
                          {h.photos?.[0]?.url
                            ? <img src={h.photos[0].url} alt={h.name} className="h-full w-full object-cover" />
                            : <ImageIcon className="h-4 w-4 text-text-muted" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate flex items-center gap-1.5">
                            <HotelIcon className="h-3.5 w-3.5 text-text-muted shrink-0" /> {h.name || "Hotel"}
                          </div>
                          <div className="text-xs text-text-muted truncate">
                            {h.location || "Sem localização"} · {(h.rooms || []).length} quarto(s)
                            {from > 0 && ` · a partir de ${formatBRL(from)}`}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RowButton({ onClick, icon, title, subtitle }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors p-3 text-left">
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{title}</span>
        <span className="block text-xs text-text-muted">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
    </button>
  );
}

const Loading = () => (
  <div className="flex items-center justify-center py-10 text-text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
);
const Empty = ({ text }) => (
  <div className="py-10 text-center text-sm text-text-muted">{text}</div>
);
