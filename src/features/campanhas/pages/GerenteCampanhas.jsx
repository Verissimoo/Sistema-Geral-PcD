import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Plus, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useToast } from "@/shared/ui/use-toast";
import { useCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from "@/api/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { formatDateBR } from "@/shared/lib/format";
import CampanhaFormDialog, { STATUS_OPTIONS } from "@/features/campanhas/components/CampanhaFormDialog";

const STATUS_STYLE = {
  ativa: "bg-success/15 text-success border-success/30",
  pausada: "bg-warning/15 text-warning border-warning/30",
  encerrada: "bg-muted text-text-muted border-border",
};
const statusLabel = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

function periodLabel(c) {
  const a = c.starts_at ? formatDateBR(c.starts_at) : "";
  const b = c.ends_at ? formatDateBR(c.ends_at) : "";
  if (a && b) return `${a} → ${b}`;
  if (a) return `A partir de ${a}`;
  if (b) return `Até ${b}`;
  return "Sem período definido";
}

export default function GerenteCampanhas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c) => { setEditing(c); setFormOpen(true); };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateCampaign.mutateAsync({ id: editing.id, updates: payload });
        toast({ title: "Campanha atualizada" });
        setFormOpen(false);
      } else {
        const created = await createCampaign.mutateAsync({ ...payload, created_by: user?.id || null });
        toast({ title: "Campanha criada" });
        setFormOpen(false);
        navigate(`/gerente/campanhas/${created.id}`);
      }
    } catch {
      toast({ title: "Erro ao salvar a campanha", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteCampaign.mutateAsync(toDelete.id);
      toast({ title: "Campanha excluída" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Campanhas Ativas</h1>
            <p className="text-sm text-text-muted">Biblioteca de hotéis pré-montados para o gerador de orçamento (modo Pacote).</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova campanha
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-text-muted">
            <Megaphone className="h-8 w-8 mx-auto mb-3 opacity-40" />
            Nenhuma campanha ainda. Crie a primeira para montar destinos e hotéis.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="border-border/60 hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/gerente/campanhas/${c.id}`)}
                    className="text-left min-w-0"
                  >
                    <h3 className="font-semibold truncate hover:text-primary transition-colors">{c.name}</h3>
                    {c.description && <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{c.description}</p>}
                  </button>
                  <Badge variant="outline" className={STATUS_STYLE[c.status] || ""}>{statusLabel(c.status)}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {c.destinations_count} destino(s)
                  </span>
                  <span>·</span>
                  <span>{periodLabel(c)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/gerente/campanhas/${c.id}`)}>
                    Gerenciar
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto text-text-muted hover:text-danger" onClick={() => setToDelete(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CampanhaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        campaign={editing}
        onSubmit={handleSubmit}
        saving={createCampaign.isPending || updateCampaign.isPending}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove a campanha, todos os destinos, hotéis e as fotos no Storage. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCampaign.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteCampaign.isPending}
              className="bg-danger hover:bg-danger text-white"
            >
              {deleteCampaign.isPending ? "Excluindo…" : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
