import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { parseBR, sanitizeBRInput } from "@/shared/lib/parseBR";
import { formatBRL } from "@/shared/lib/format";
import { PLATFORMS, calcInstallment } from "@/shared/lib/cardFees";

// Opções de pagamento ADICIONAIS mostradas ao cliente no PDF, além do preço à
// vista (que é o sale_value principal e a referência de comissão). Cada opção
// tem seu próprio valor-base (à vista pode ser mais barato que parcelado).
export const EMPTY_SALE_OPTION = {
  method: "cartao",
  label: "",
  base_value: "",
  acquirer: "",
  modality: "",
  installments_label: "",
  boleto_installments: "2",
};

function optionPreview(opt) {
  const base = parseBR(opt.base_value);
  if (!base) return null;
  if (opt.method === "avista") {
    return { totalLabel: formatBRL(base), parcelaLabel: "à vista" };
  }
  if (opt.method === "boleto") {
    const n = Math.max(1, parseInt(opt.boleto_installments, 10) || 1);
    return { totalLabel: formatBRL(base), parcelaLabel: `${n}x de ${formatBRL(base / n)} (sem juros)` };
  }
  // cartão
  const acq = PLATFORMS.find((p) => p.name === opt.acquirer);
  const mod = acq?.modalities.find((m) => m.name === opt.modality);
  const rate = mod?.rates.find((r) => r.label === opt.installments_label);
  if (!rate) return { totalLabel: formatBRL(base), parcelaLabel: "selecione a parcela" };
  const fixed = mod.has_fixed_fee ? mod.fixed_fee_value : 0;
  const r = calcInstallment(base, rate.percentage, fixed, rate.label);
  return {
    totalLabel: `${formatBRL(r.totalComTaxa)} (taxa ${rate.percentage.toFixed(2)}%)`,
    parcelaLabel: `${r.numParcelas}x de ${formatBRL(r.valorParcela)}`,
  };
}

export default function SaleOptionsEditor({ options, onAdd, onUpdate, onRemove }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Opções de pagamento (mostradas ao cliente)</Label>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" /> Adicionar opção
        </Button>
      </div>
      {options.length === 0 && (
        <p className="text-xs text-text-muted">
          O preço à vista acima é a opção principal. Adicione alternativas (cartão/boleto) para o cliente escolher no orçamento.
        </p>
      )}

      {options.map((opt, idx) => {
        const acq = PLATFORMS.find((p) => p.name === opt.acquirer);
        const modalities = acq?.modalities || [];
        const mod = modalities.find((m) => m.name === opt.modality);
        const rates = mod?.rates || [];
        const preview = optionPreview(opt);
        return (
          <Card key={idx} className="border-border bg-muted/30">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Opção {idx + 1}
                </span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-danger"
                  onClick={() => onRemove(idx)} title="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Forma de pagamento</Label>
                  <Select value={opt.method} onValueChange={(v) => onUpdate(idx, { method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avista">À vista</SelectItem>
                      <SelectItem value="cartao">Cartão de crédito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor base (R$)</Label>
                  <Input type="text" inputMode="decimal" placeholder="Ex: 6.000,00"
                    value={opt.base_value}
                    onChange={(e) => onUpdate(idx, { base_value: sanitizeBRInput(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rótulo (opcional)</Label>
                  <Input type="text" placeholder="Ex: Cartão 12x"
                    value={opt.label}
                    onChange={(e) => onUpdate(idx, { label: e.target.value })} />
                </div>
              </div>

              {opt.method === "cartao" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Adquirente</Label>
                    <Select value={opt.acquirer}
                      onValueChange={(v) => onUpdate(idx, { acquirer: v, modality: "", installments_label: "" })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Modalidade</Label>
                    <Select value={opt.modality} disabled={!acq}
                      onValueChange={(v) => onUpdate(idx, { modality: v, installments_label: "" })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {modalities.map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Parcelas</Label>
                    <Select value={opt.installments_label} disabled={!mod}
                      onValueChange={(v) => onUpdate(idx, { installments_label: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {rates.map((r) => <SelectItem key={r.label} value={r.label}>{r.label} — {r.percentage.toFixed(2)}%</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {opt.method === "boleto" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nº de parcelas (sem juros)</Label>
                      <Input type="number" min="1" placeholder="Ex: 6"
                        value={opt.boleto_installments}
                        onChange={(e) => onUpdate(idx, { boleto_installments: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/30 rounded p-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Confira as condições do boleto (sujeito à aprovação).
                  </div>
                </div>
              )}

              {preview && (
                <div className="text-sm border-t border-border pt-2 flex items-center justify-between">
                  <span className="text-text-muted">Cliente vê</span>
                  <span className="font-medium text-text-primary">
                    {preview.parcelaLabel}
                    <span className="text-text-muted font-normal"> · {preview.totalLabel}</span>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
