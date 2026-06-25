import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Loader2 } from "lucide-react";

export const STATUS_OPTIONS = [
  { value: "ativa", label: "Ativa" },
  { value: "pausada", label: "Pausada" },
  { value: "encerrada", label: "Encerrada" },
];

const empty = { name: "", description: "", status: "ativa", starts_at: "", ends_at: "" };

// Dialog de criação/edição da campanha (metadados). onSubmit recebe o payload
// pronto (datas vazias viram null) e deve retornar uma Promise.
export default function CampanhaFormDialog({ open, onOpenChange, campaign, onSubmit, saving }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) {
      setForm(
        campaign
          ? {
              name: campaign.name || "",
              description: campaign.description || "",
              status: campaign.status || "ativa",
              starts_at: campaign.starts_at || "",
              ends_at: campaign.ends_at || "",
            }
          : empty
      );
    }
  }, [open, campaign]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.name.trim()) return;
    await onSubmit({
      name: form.name.trim(),
      description: form.description?.trim() || null,
      status: form.status,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign ? "Editar campanha" : "Nova campanha"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.name} placeholder="Ex: Pacotes Nordeste — Verão"
              onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={2} value={form.description}
              placeholder="Campanha de tráfego pago para o litoral nordestino."
              onChange={(e) => set({ description: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Início (opcional)</Label>
              <Input type="date" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim (opcional)</Label>
              <Input type="date" value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !form.name.trim()} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {campaign ? "Salvar" : "Criar campanha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
