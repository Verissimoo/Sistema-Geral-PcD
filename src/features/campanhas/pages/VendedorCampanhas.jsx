import { useNavigate } from "react-router-dom";
import { Megaphone, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { useCampaigns } from "@/api/hooks";

// Consulta (read-only) das campanhas para o vendedor. Só campanhas ATIVAS.
export default function VendedorCampanhas() {
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const ativas = campaigns.filter((c) => c.status === "ativa");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Campanhas Ativas</h1>
          <p className="text-sm text-text-muted">Hotéis e pacotes prontos para apoiar sua negociação.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : ativas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-text-muted">
            <Megaphone className="h-8 w-8 mx-auto mb-3 opacity-40" />
            Nenhuma campanha ativa no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ativas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/vendedor/campanhas/${c.id}`)}
              className="text-left"
            >
              <Card className="h-full border-border/60 hover:border-primary/40 hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{c.name}</h3>
                    <ArrowRight className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                  </div>
                  {c.description && <p className="text-xs text-text-muted line-clamp-2">{c.description}</p>}
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {c.destinations_count} destino(s)
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
