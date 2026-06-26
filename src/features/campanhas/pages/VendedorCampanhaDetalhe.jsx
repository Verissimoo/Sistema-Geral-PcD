import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useToast } from "@/shared/ui/use-toast";
import { useCampaignFull } from "@/api/hooks";
import VendedorHotelCard from "@/features/campanhas/components/VendedorHotelCard";

export default function VendedorCampanhaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: campaign, isLoading } = useCampaignFull(id);

  // "Usar no orçamento" — prepara a navegação. A integração real (pré-preencher
  // package.hotel) é o próximo passo; por ora levamos o vendedor ao gerador com
  // o hotel escolhido no state da rota.
  const useInQuote = (hotel) => {
    toast({ title: "Hotel selecionado", description: "Abrindo o gerador de orçamento…" });
    navigate("/vendedor/orcamento", {
      state: {
        fromCampaign: {
          campaignId: campaign.id,
          campaignName: campaign.name,
          hotel,
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!campaign) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <p className="text-text-muted">Campanha não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/vendedor/campanhas")}>Voltar</Button>
      </div>
    );
  }

  const destinations = campaign.destinations || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-2 text-text-muted" onClick={() => navigate("/vendedor/campanhas")}>
          <ArrowLeft className="h-4 w-4" /> Campanhas Ativas
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold">{campaign.name}</h1>
          {campaign.status !== "ativa" && (
            <Badge variant="outline" className="bg-muted text-text-muted border-border">{campaign.status}</Badge>
          )}
        </div>
        {campaign.description && <p className="text-sm text-text-muted mt-1">{campaign.description}</p>}
      </div>

      {destinations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-text-muted">
            Esta campanha ainda não tem destinos cadastrados.
          </CardContent>
        </Card>
      ) : (
        destinations.map((dest) => (
          <section key={dest.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">{dest.name}</h2>
              <span className="text-xs text-text-muted">· {(dest.hotels || []).length} hotel(is)</span>
            </div>
            {(dest.hotels || []).length === 0 ? (
              <p className="text-xs text-text-muted pl-6">Sem hotéis cadastrados neste destino.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dest.hotels.map((h) => (
                  <VendedorHotelCard key={h.id} hotel={h} onUse={useInQuote} />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
