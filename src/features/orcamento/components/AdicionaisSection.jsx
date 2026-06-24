import { PlusCircle, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { parseBR, sanitizeBRInput } from "@/shared/lib/parseBR";
import { formatBRL } from "@/shared/lib/format";

let _seq = 0;
const newId = () => (globalThis.crypto?.randomUUID?.() || `add-${Date.now()}-${_seq++}`);

// Adicionais do pacote — { id, name, value }. São VENDA pura repassada ao
// cliente: somam ao total mas NÃO geram lucro/comissão (ver pricingCalculator).
export default function AdicionaisSection({ additionals, onChange }) {
  const items = Array.isArray(additionals) ? additionals : [];

  const add = () => onChange([...items, { id: newId(), name: "", value: "" }]);
  const update = (idx, patch) =>
    onChange(items.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));

  const total = items.reduce((acc, a) => acc + parseBR(a.value), 0);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Adicionais</h3>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={add}>
            <Plus className="h-3.5 w-3.5" /> Adicionar item
          </Button>
        </div>

        <p className="text-xs text-text-muted">
          Itens repassados ao cliente (passeios, seguro, traslado…). Somam ao total do pacote, sem comissão.
        </p>

        {items.length === 0 ? (
          <p className="text-xs text-text-muted">Nenhum adicional ainda.</p>
        ) : (
          <div className="space-y-2">
            {items.map((a, idx) => (
              <div key={a.id || idx} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Input placeholder="Ex: Passeio de barco"
                    value={a.name} onChange={(e) => update(idx, { name: e.target.value })} />
                </div>
                <div className="w-36 space-y-1.5">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input type="text" inputMode="decimal" placeholder="Ex: 300,00"
                    value={a.value} onChange={(e) => update(idx, { value: sanitizeBRInput(e.target.value) })} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-danger" onClick={() => remove(idx)} title="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex justify-end pt-1 text-sm">
              <span className="text-text-muted">Total adicionais:&nbsp;</span>
              <span className="font-semibold">{formatBRL(total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
