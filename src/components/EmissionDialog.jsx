import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { supabase } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, X, Users } from "lucide-react";

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const initialForm = (quote) => ({
  payment_method: "",
  installments: [{ date: "", value: "" }],
  final_paid_value: quote?.total_value ? String(quote.total_value) : "",
  purchase_responsible: "",
});

const initialPassengers = (quote) => {
  const count = Math.max(1, Number(quote?.passengers) || 1);
  const existing = Array.isArray(quote?.passenger_data) ? quote.passenger_data : [];
  return Array.from({ length: count }, (_, idx) => ({
    full_name: existing[idx]?.full_name || "",
    cpf: existing[idx]?.cpf || "",
    birth_date: existing[idx]?.birth_date || "",
    passport: existing[idx]?.passport || "",
    passport_expiry: existing[idx]?.passport_expiry || "",
    nationality: existing[idx]?.nationality || "",
  }));
};

export function EmissionDialog({ quote, open, onClose, onSuccess }) {
  const [formData, setFormData] = useState(initialForm(quote));
  const [passengerData, setPassengerData] = useState(initialPassengers(quote));
  const [proofFile, setProofFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFormData(initialForm(quote));
      setPassengerData(initialPassengers(quote));
      setProofFile(null);
      setError("");
    }
  }, [open, quote]);

  const updatePassenger = (idx, field, value) => {
    setPassengerData((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const isInstallment =
    formData.payment_method === "Cartão Parcelado" || formData.payment_method === "Composição";

  const addInstallment = () => {
    setFormData((p) => ({ ...p, installments: [...p.installments, { date: "", value: "" }] }));
  };

  const removeInstallment = (idx) => {
    setFormData((p) => ({ ...p, installments: p.installments.filter((_, i) => i !== idx) }));
  };

  const updateInstallment = (idx, field, value) => {
    setFormData((p) => {
      const next = [...p.installments];
      next[idx] = { ...next[idx], [field]: value };
      return { ...p, installments: next };
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (!formData.payment_method) {
      setError("Selecione a forma de pagamento.");
      return;
    }
    const passageirosValidos = passengerData.every(
      (p) => p.full_name?.trim() && p.cpf?.trim() && p.birth_date
    );
    if (!passageirosValidos) {
      setError("Preencha nome, CPF e data de nascimento de TODOS os passageiros.");
      return;
    }
    if (!proofFile) {
      setError("Anexe o comprovante de pagamento.");
      return;
    }
    setLoading(true);

    try {
      const ext = proofFile.name.split(".").pop();
      const fileName = `proof-${quote.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("pcd-emission-files")
        .upload(fileName, proofFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("pcd-emission-files")
        .getPublicUrl(fileName);

      const updated = await localClient.entities.Quotes.update(quote.id, {
        status: "Aguardando Emissão",
        payment_method: formData.payment_method,
        payment_installments: isInstallment
          ? formData.installments.filter((i) => i.date || i.value)
          : null,
        payment_proof_url: urlData.publicUrl,
        final_paid_value: parseFloat(formData.final_paid_value) || 0,
        purchase_responsible: formData.purchase_responsible,
        passenger_data: passengerData,
        sent_to_emission_date: new Date().toISOString(),
      });
      if (!updated) throw new Error("Falha ao atualizar orçamento.");

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Erro ao enviar: " + (err.message || "tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar para Emissão</DialogTitle>
          <DialogDescription>
            Orçamento {quote?.quote_number || `#${quote?.id?.slice(0, 8)}`} ·{" "}
            {quote?.client?.name || quote?.partner_name || "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Dados dos Passageiros ({quote?.passengers || 1})
              </Label>
              <span className="text-xs text-muted-foreground">
                Obrigatório: nome, CPF, nascimento
              </span>
            </div>

            {passengerData.map((pax, idx) => (
              <Card key={idx} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    Passageiro {idx + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Nome completo *</Label>
                      <Input
                        value={pax.full_name}
                        onChange={(e) => updatePassenger(idx, "full_name", e.target.value)}
                        placeholder="Como no documento"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CPF *</Label>
                      <Input
                        value={pax.cpf}
                        onChange={(e) => updatePassenger(idx, "cpf", e.target.value)}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de nascimento *</Label>
                      <Input
                        type="date"
                        value={pax.birth_date}
                        onChange={(e) => updatePassenger(idx, "birth_date", e.target.value)}
                      />
                    </div>
                  </div>

                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-slate-700 select-none">
                      ▸ Dados internacionais (opcional)
                    </summary>
                    <div className="grid grid-cols-2 gap-3 mt-3 pl-3 border-l-2 border-slate-200">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Passaporte</Label>
                        <Input
                          value={pax.passport}
                          onChange={(e) => updatePassenger(idx, "passport", e.target.value)}
                          placeholder="Número do passaporte"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Validade</Label>
                        <Input
                          type="date"
                          value={pax.passport_expiry}
                          onChange={(e) => updatePassenger(idx, "passport_expiry", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nacionalidade</Label>
                        <Input
                          value={pax.nationality}
                          onChange={(e) => updatePassenger(idx, "nationality", e.target.value)}
                          placeholder="Brasileira"
                        />
                      </div>
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Forma de pagamento *</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(v) =>
                setFormData((p) => ({
                  ...p,
                  payment_method: v,
                  installments: [{ date: "", value: "" }],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Cartão à vista">Cartão à vista</SelectItem>
                <SelectItem value="Cartão Parcelado">Cartão Parcelado</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
                <SelectItem value="Composição">Composição (PIX + Cartão)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isInstallment && (
            <div className="space-y-2">
              <Label>Parcelas (datas e valores)</Label>
              {formData.installments.map((inst, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Data {idx + 1}</Label>
                    <Input
                      type="date"
                      value={inst.date}
                      onChange={(e) => updateInstallment(idx, "date", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={inst.value}
                      onChange={(e) => updateInstallment(idx, "value", e.target.value)}
                    />
                  </div>
                  {formData.installments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInstallment(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addInstallment} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Adicionar parcela
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Valor pago final (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.final_paid_value}
              onChange={(e) =>
                setFormData((p) => ({ ...p, final_paid_value: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Valor original do orçamento: {formatBRL(quote?.total_value)}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Responsável pela compra</Label>
            <Input
              value={formData.purchase_responsible}
              onChange={(e) =>
                setFormData((p) => ({ ...p, purchase_responsible: e.target.value }))
              }
              placeholder="Nome de quem fez o pagamento"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Comprovante de pagamento *</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            />
            {proofFile && (
              <p className="text-xs text-emerald-600">✓ {proofFile.name}</p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.payment_method || !proofFile}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Enviando..." : "Enviar para Emissão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
