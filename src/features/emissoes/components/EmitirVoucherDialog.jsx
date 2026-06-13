import { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import { useUpdateQuote } from "@/api/hooks";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";

export function EmitirDialog({ quote, open, onClose, onSuccess }) {
  const { user } = useAuth();
  const updateQuote = useUpdateQuote();
  const [voucherFile, setVoucherFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Trava síncrona contra clique duplo: evita uploads paralelos do mesmo voucher.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setVoucherFile(null);
      setNotes("");
      setError("");
    }
  }, [open]);

  const handleEmitir = async () => {
    if (isSubmittingRef.current) return;
    setError("");
    if (!voucherFile) {
      setError("Anexe o documento de emissão.");
      return;
    }
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const ext = voucherFile.name.split(".").pop();
      const fileName = `voucher-${quote.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("pcd-emission-files")
        .upload(fileName, voucherFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("pcd-emission-files")
        .getPublicUrl(fileName);

      await updateQuote.mutateAsync({
        id: quote.id,
        updates: {
          status: "Emitido",
          emission_voucher_url: urlData.publicUrl,
          emission_notes: notes,
          emission_handled_by: user?.name || "Suporte",
          emission_completed_date: new Date().toISOString(),
          issued_date: new Date().toISOString(),
        },
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Erro ao confirmar emissão: " + (err.message || "tente novamente"));
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Emissão</DialogTitle>
          <DialogDescription>
            {quote?.quote_number || `#${quote?.id?.slice(0, 8)}`} ·{" "}
            {quote?.client?.name || quote?.partner_name || "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Documento de emissão (voucher) *</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setVoucherFile(e.target.files?.[0] || null)}
            />
            {voucherFile && <p className="text-xs text-success">✓ {voucherFile.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Localizador, referências, observações da emissão..."
            />
          </div>
          {error && (
            <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-sm text-danger">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleEmitir}
            disabled={loading || !voucherFile}
          >
            {loading ? "Processando..." : "Confirmar Emissão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
