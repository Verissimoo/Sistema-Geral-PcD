import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

export function VendedorStatusChangeDialog({
  statusChangeQuote,
  statusChangeTo,
  statusExtra,
  onStatusExtraChange,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog open={!!statusChangeQuote} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar status</DialogTitle>
          <DialogDescription>
            Mudar de <strong>{statusChangeQuote?.status}</strong> para{" "}
            <strong>{statusChangeTo}</strong>
          </DialogDescription>
        </DialogHeader>
        {statusChangeTo === "Aprovado" && (
          <div className="space-y-2">
            <Label>Data de emissão prevista (opcional)</Label>
            <Input
              type="date"
              value={statusExtra.emission_date}
              onChange={(e) =>
                onStatusExtraChange((p) => ({ ...p, emission_date: e.target.value }))
              }
            />
          </div>
        )}
        {statusChangeTo === "Recusado" && (
          <div className="space-y-2">
            <Label>Motivo da recusa (opcional)</Label>
            <Textarea
              rows={3}
              value={statusExtra.reject_reason}
              onChange={(e) =>
                onStatusExtraChange((p) => ({ ...p, reject_reason: e.target.value }))
              }
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Confirmar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
