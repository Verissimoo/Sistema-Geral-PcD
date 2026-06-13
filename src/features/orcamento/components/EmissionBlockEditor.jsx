import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/shared/ui/select";
import { sanitizeBRInput } from "@/shared/lib/parseBR";
import { formatBRL } from "@/shared/lib/format";
import { emissionBlockCN } from "@/features/orcamento/lib/orcamentoHelpers";

// ─── Bloco extra de tipo de emissão (vários tipos de tarifa somados) ──
export default function EmissionBlockEditor({ block, index, milesTable, passengers, onChange, onRemove }) {
  const cn2 = emissionBlockCN(block);
  const isTotal = block.cost_is_total === true;
  const mult = isTotal ? 1 : passengers;
  const custoTotal = cn2.cost * mult;
  const niponTotal = cn2.nipon * mult;

  const selectAzul = (m) => (m.program || "").toLowerCase().includes("azul");

  const pickProgram = (v) => {
    const prog = milesTable.find((m) => m.id === v);
    onChange({
      program_id: v,
      program_name: prog?.program || "",
      cost_per_thousand: Number(prog?.cost_per_thousand) || 0,
      sale_per_thousand: Number(prog?.sale_per_thousand) || 0,
      is_azul: selectAzul(prog || {}),
    });
  };

  return (
    <Card className="border-border bg-muted/30 mt-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Tipo de tarifa adicional {index + 2}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-text-muted hover:text-danger"
            onClick={onRemove}
            title="Remover bloco"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Tabs value={block.type} onValueChange={(v) => onChange({ type: v })}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="milhas">Milhas</TabsTrigger>
            <TabsTrigger value="milhas_dinheiro">Milhas + Dinheiro</TabsTrigger>
            <TabsTrigger value="dinheiro">Dinheiro</TabsTrigger>
          </TabsList>

          <TabsContent value="milhas" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Programa</Label>
                <Select value={block.program_id} onValueChange={pickProgram}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {milesTable.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Custo em milhas</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 80.000"
                  value={block.miles_qty}
                  onChange={(e) => onChange({ miles_qty: sanitizeBRInput(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de embarque (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 320,50"
                  value={block.tax}
                  onChange={(e) => onChange({ tax: sanitizeBRInput(e.target.value) })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="milhas_dinheiro" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label>Programa de milhas (Azul)</Label>
              <Select value={block.program_id} onValueChange={pickProgram}>
                <SelectTrigger><SelectValue placeholder="Selecione programa Azul..." /></SelectTrigger>
                <SelectContent>
                  {milesTable.filter(selectAzul).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Milhas (por pax)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 20.000"
                  value={block.miles_qty}
                  onChange={(e) => onChange({ miles_qty: sanitizeBRInput(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Dinheiro (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 2.500,00"
                  value={block.cash_part}
                  onChange={(e) => onChange({ cash_part: sanitizeBRInput(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de embarque (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 64,60"
                  value={block.tax}
                  onChange={(e) => onChange({ tax: sanitizeBRInput(e.target.value) })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dinheiro" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço de custo (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 1.234,56"
                  value={block.cost_brl}
                  onChange={(e) => onChange({ cost_brl: sanitizeBRInput(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de embarque (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 320,50"
                  value={block.tax}
                  onChange={(e) => onChange({ tax: sanitizeBRInput(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id={`azul-extra-${index}`} checked={block.is_azul === true}
                onCheckedChange={(c) => onChange({ is_azul: !!c })} />
              <Label htmlFor={`azul-extra-${index}`} className="text-sm cursor-pointer">
                Azul — não aplicar 10%
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        {passengers >= 2 && (
          <div className="flex items-start gap-2">
            <Checkbox id={`total-extra-${index}`} checked={isTotal} className="mt-0.5"
              onCheckedChange={(c) => onChange({ cost_is_total: !!c })} />
            <Label htmlFor={`total-extra-${index}`} className="text-xs cursor-pointer text-text-muted leading-snug">
              O valor deste bloco já é o total de todos os passageiros (não multiplicar)
            </Label>
          </div>
        )}

        <div className="flex items-center justify-between text-sm border-t border-border pt-2">
          <span className="text-text-muted">Custo {mult > 1 ? `× ${passengers}` : "(total)"}</span>
          <span className="tabular-nums">
            {formatBRL(custoTotal)} · Nipon <strong className="text-primary">{formatBRL(niponTotal)}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
