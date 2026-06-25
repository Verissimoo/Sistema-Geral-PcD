import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, ArrowUp, ArrowDown, MapPin, Hotel as HotelIcon, Loader2, ImageIcon,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useToast } from "@/shared/ui/use-toast";
import { formatDateBR } from "@/shared/lib/format";
import {
  useCampaignFull, useUpdateCampaign,
  useCreateDestination, useUpdateDestination, useDeleteDestination,
  useCreateHotel, useDeleteHotel,
} from "@/api/hooks";
import CampanhaFormDialog, { STATUS_OPTIONS } from "@/features/campanhas/components/CampanhaFormDialog";
import CampanhaHotelEditor from "@/features/campanhas/components/CampanhaHotelEditor";

const STATUS_STYLE = {
  ativa: "bg-success/15 text-success border-success/30",
  pausada: "bg-warning/15 text-warning border-warning/30",
  encerrada: "bg-muted text-text-muted border-border",
};
const statusLabel = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

export default function GerenteCampanhaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: campaign, isLoading } = useCampaignFull(id);
  const updateCampaign = useUpdateCampaign();
  const createDestination = useCreateDestination();
  const updateDestination = useUpdateDestination();
  const deleteDestination = useDeleteDestination();
  const createHotel = useCreateHotel();
  const deleteHotel = useDeleteHotel();

  const [formOpen, setFormOpen] = useState(false);
  const [newDestName, setNewDestName] = useState("");
  const [editorHotelId, setEditorHotelId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind, item, label }

  const destinations = campaign?.destinations || [];
  // Hotel atualmente em edição (lookup nos dados frescos da campanha).
  const editorHotel =
    editorHotelId && destinations.flatMap((d) => d.hotels || []).find((h) => h.id === editorHotelId);

  const handleEditCampaign = async (payload) => {
    try {
      await updateCampaign.mutateAsync({ id, updates: payload });
      toast({ title: "Campanha atualizada" });
      setFormOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const addDestination = async () => {
    const name = newDestName.trim();
    if (!name) return;
    try {
      const sort_order = destinations.length
        ? Math.max(...destinations.map((d) => d.sort_order ?? 0)) + 1
        : 0;
      await createDestination.mutateAsync({ campaign_id: id, name, sort_order });
      setNewDestName("");
    } catch {
      toast({ title: "Erro ao adicionar destino", variant: "destructive" });
    }
  };

  const renameDestination = async (dest, name) => {
    if (name.trim() === dest.name || !name.trim()) return;
    try {
      await updateDestination.mutateAsync({ id: dest.id, updates: { name: name.trim() } });
    } catch {
      toast({ title: "Erro ao renomear destino", variant: "destructive" });
    }
  };

  const moveDestination = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= destinations.length) return;
    const a = destinations[idx], b = destinations[j];
    try {
      await Promise.all([
        updateDestination.mutateAsync({ id: a.id, updates: { sort_order: b.sort_order ?? j } }),
        updateDestination.mutateAsync({ id: b.id, updates: { sort_order: a.sort_order ?? idx } }),
      ]);
    } catch {
      toast({ title: "Erro ao reordenar", variant: "destructive" });
    }
  };

  const addHotel = async (dest) => {
    try {
      const sort_order = (dest.hotels || []).length
        ? Math.max(...dest.hotels.map((h) => h.sort_order ?? 0)) + 1
        : 0;
      const created = await createHotel.mutateAsync({
        destination_id: dest.id,
        name: "Novo hotel",
        sort_order,
      });
      setEditorHotelId(created.id);
    } catch {
      toast({ title: "Erro ao adicionar hotel", variant: "destructive" });
    }
  };

  const runConfirm = async () => {
    const c = confirm;
    setConfirm(null);
    try {
      if (c.kind === "destination") {
        await deleteDestination.mutateAsync(c.item.id);
        toast({ title: "Destino excluído" });
      } else if (c.kind === "hotel") {
        await deleteHotel.mutateAsync(c.item); // passa o objeto p/ limpar Storage
        toast({ title: "Hotel excluído" });
      }
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
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
        <Button variant="outline" onClick={() => navigate("/gerente/campanhas")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-2 text-text-muted" onClick={() => navigate("/gerente/campanhas")}>
          <ArrowLeft className="h-4 w-4" /> Campanhas
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{campaign.name}</h1>
              <Badge variant="outline" className={STATUS_STYLE[campaign.status] || ""}>{statusLabel(campaign.status)}</Badge>
            </div>
            {campaign.description && <p className="text-sm text-text-muted mt-1">{campaign.description}</p>}
            <p className="text-xs text-text-muted mt-1">
              {campaign.starts_at ? formatDateBR(campaign.starts_at) : "—"} → {campaign.ends_at ? formatDateBR(campaign.ends_at) : "—"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar campanha
          </Button>
        </div>
      </div>

      {/* Adicionar destino */}
      <Card className="border-border/60">
        <CardContent className="p-4 flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Novo destino</Label>
            <Input
              value={newDestName}
              placeholder="Ex: Fortaleza"
              onChange={(e) => setNewDestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDestination()}
            />
          </div>
          <Button className="gap-1.5" onClick={addDestination} disabled={!newDestName.trim() || createDestination.isPending}>
            <Plus className="h-4 w-4" /> Adicionar destino
          </Button>
        </CardContent>
      </Card>

      {/* Destinos */}
      {destinations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-text-muted">
            <MapPin className="h-7 w-7 mx-auto mb-2 opacity-40" />
            Nenhum destino ainda. Adicione um destino para cadastrar hotéis.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {destinations.map((dest, idx) => (
            <Card key={dest.id} className="border-border/60">
              <CardContent className="p-4 space-y-3">
                {/* Cabeçalho do destino */}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <Input
                    defaultValue={dest.name}
                    className="h-8 font-semibold max-w-xs"
                    onBlur={(e) => renameDestination(dest, e.target.value)}
                  />
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveDestination(idx, -1)} title="Subir">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === destinations.length - 1} onClick={() => moveDestination(idx, 1)} title="Descer">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-danger" onClick={() => setConfirm({ kind: "destination", item: dest, label: dest.name })} title="Excluir destino">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Hotéis do destino */}
                <div className="space-y-2 pl-6">
                  {(dest.hotels || []).length === 0 && (
                    <p className="text-xs text-text-muted">Nenhum hotel sugerido ainda.</p>
                  )}
                  {(dest.hotels || []).map((h) => (
                    <div key={h.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5">
                      <div className="h-12 w-16 rounded-md overflow-hidden bg-muted shrink-0 grid place-items-center">
                        {h.photos?.[0]?.url
                          ? <img src={h.photos[0].url} alt={h.name} className="h-full w-full object-cover" />
                          : <ImageIcon className="h-4 w-4 text-text-muted" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate flex items-center gap-1.5">
                          <HotelIcon className="h-3.5 w-3.5 text-text-muted shrink-0" /> {h.name || "Hotel sem nome"}
                        </div>
                        <div className="text-xs text-text-muted truncate">
                          {h.location || "Sem localização"} · {(h.rooms || []).length} quarto(s) · {(h.photos || []).length} foto(s)
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditorHotelId(h.id)}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-danger" onClick={() => setConfirm({ kind: "hotel", item: h, label: h.name || "este hotel" })} title="Excluir hotel">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => addHotel(dest)} disabled={createHotel.isPending}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar hotel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editar metadados da campanha */}
      <CampanhaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        campaign={campaign}
        onSubmit={handleEditCampaign}
        saving={updateCampaign.isPending}
      />

      {/* Editor de hotel */}
      {editorHotel && (
        <CampanhaHotelEditor
          key={editorHotel.id}
          hotel={editorHotel}
          campaignId={id}
          open={!!editorHotelId}
          onOpenChange={(o) => !o && setEditorHotelId(null)}
        />
      )}

      {/* Confirmação de exclusão (destino ou hotel) */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {confirm?.kind === "destination" ? "destino" : "hotel"} “{confirm?.label}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "destination"
                ? "Remove o destino e todos os seus hotéis (e fotos no Storage)."
                : "Remove o hotel e suas fotos no Storage."} Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); runConfirm(); }}
              className="bg-danger hover:bg-danger text-white"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
