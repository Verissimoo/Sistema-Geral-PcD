import { useMemo, useEffect } from "react";
import { Info, PlaneTakeoff, PlaneLanding } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { getCostForMiles, getSaleForMiles } from "@/features/milhas/milesHelper";
import { parseBR, sanitizeBRInput } from "@/shared/lib/parseBR";
import { formatBRL } from "@/shared/lib/format";

// ─── Multi-programa — IDA e VOLTA com programas diferentes ────────
export default function MultiProgramPricing({
  trechosPricing,
  milesTable,
  onChange,
  passengers = 1,
  custoPorPessoa = 0,
  niponPorPessoa = 0,
  custoTotal = 0,
  niponTotal = 0,
}) {
  if (trechosPricing.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted/40 border border-dashed text-sm text-muted-foreground text-center">
        Preencha os trechos no Bloco 3 para configurar os programas por trecho.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
        <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="text-warning dark:text-warning">
          <strong>Multi-programa:</strong> cada trecho usa um programa de milhas próprio. Os totais (custo e Nipon) somam todos os trechos × passageiros.
        </div>
      </div>

      {trechosPricing.map((tp, idx) => (
        <MultiProgramTrechoCard
          key={idx}
          trechoPricing={tp}
          index={idx}
          milesTable={milesTable}
          onUpdate={(patch) => onChange(idx, patch)}
          passengers={passengers}
        />
      ))}

      {/* Consolidado */}
      <Card className="bg-bg-elevated text-text-primary border-border-strong">
        <CardContent className="p-5 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-text-muted">
            Total consolidado (IDA + VOLTA){passengers >= 2 ? ` · × ${passengers} pax` : ""}
          </div>
          {passengers >= 2 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Custo por pessoa:</span>
                <span className="font-semibold">{formatBRL(custoPorPessoa)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Nipon por pessoa:</span>
                <span className="font-semibold text-warning">{formatBRL(niponPorPessoa)}</span>
              </div>
              <Separator className="my-2 bg-bg-overlay" />
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Custo total:</span>
            <span className="font-semibold">{formatBRL(custoTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Valor Nipon total:</span>
            <span className="font-semibold text-warning">{formatBRL(niponTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MultiProgramTrechoCard({ trechoPricing, index, milesTable, onUpdate, passengers }) {
  const isIda = trechoPricing.tipo === "ida";
  const tp = trechoPricing;

  const selectedProgram = useMemo(
    () => milesTable.find((m) => m.id === tp.program_id) || null,
    [milesTable, tp.program_id]
  );

  const milesParsed = parseBR(tp.miles_qty);
  const cpt = useMemo(
    () => (selectedProgram ? getCostForMiles(selectedProgram, milesParsed) : Number(tp.cost_per_thousand) || 0),
    [selectedProgram, milesParsed, tp.cost_per_thousand]
  );
  const spt = useMemo(
    () => (selectedProgram ? getSaleForMiles(selectedProgram, milesParsed) : Number(tp.sale_per_thousand) || 0),
    [selectedProgram, milesParsed, tp.sale_per_thousand]
  );

  // Mantém snapshot dos preços do programa atualizado quando o vendedor
  // muda programa ou quantidade de milhas (faixas com preço variável).
  useEffect(() => {
    if (
      Math.abs(cpt - (Number(tp.cost_per_thousand) || 0)) < 0.001 &&
      Math.abs(spt - (Number(tp.sale_per_thousand) || 0)) < 0.001
    ) return;
    onUpdate({ cost_per_thousand: cpt, sale_per_thousand: spt });

  }, [cpt, spt]);

  const tax = parseBR(tp.tax);
  const segCost = (milesParsed / 1000) * cpt + tax;
  const segSaleSugerida = (milesParsed / 1000) * spt + tax;

  return (
    <Card className={cn("border-l-4", isIda ? "border-l-red-500" : "border-l-blue-500")}>
      <CardHeader className={cn("py-3", isIda ? "bg-danger/10" : "bg-accent/10")}>
        <CardTitle className={cn("text-sm flex items-center gap-2", isIda ? "text-danger" : "text-accent")}>
          {isIda ? <PlaneTakeoff className="w-4 h-4" /> : <PlaneLanding className="w-4 h-4" />}
          {isIda ? "IDA" : "VOLTA"} — Configuração de milhas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <Label>Programa de milhas</Label>
          <Select
            value={tp.program_id || ""}
            onValueChange={(v) => {
              const program = milesTable.find((m) => m.id === v);
              onUpdate({
                program_id: v,
                program_name: program?.program || "",
                cost_per_thousand: program?.cost_per_thousand || 0,
                sale_per_thousand: program?.sale_per_thousand || 0,
                is_azul: !!program?.program?.toLowerCase().includes("azul"),
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={milesTable.length === 0 ? "Sem programas" : "Selecione..."} />
            </SelectTrigger>
            <SelectContent>
              {milesTable.map((m) => (
                <SelectItem
                  key={m.id}
                  value={m.id}
                  disabled={m.stock_status === "unavailable"}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        m.stock_status === "own" && "bg-success",
                        m.stock_status === "unavailable" && "bg-danger",
                        (!m.stock_status || m.stock_status === "supplier") && "bg-warning"
                      )}
                    />
                    {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Milhas por pessoa</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 23.300"
              value={tp.miles_qty || ""}
              onChange={(e) => onUpdate({ miles_qty: sanitizeBRInput(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Taxa por pessoa (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 32,87"
              value={tp.tax || ""}
              onChange={(e) => onUpdate({ tax: sanitizeBRInput(e.target.value) })}
            />
          </div>
        </div>

        {milesParsed > 0 && (
          <div className="bg-bg-elevated rounded p-2.5 text-xs space-y-1 border border-border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo por pax neste trecho:</span>
              <strong>{formatBRL(segCost)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Venda sugerida por pax (tabela):</span>
              <strong className="text-warning">{formatBRL(segSaleSugerida)}</strong>
            </div>
            {passengers > 1 && (
              <div className="flex justify-between text-muted-foreground pt-1 border-t border-border mt-1">
                <span>Custo × {passengers} pax:</span>
                <strong>{formatBRL(segCost * passengers)}</strong>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
