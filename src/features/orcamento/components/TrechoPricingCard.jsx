import { useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { getCostForMiles, getSaleForMiles } from "@/features/milhas/milesHelper";
import { parseBR, sanitizeBRInput } from "@/shared/lib/parseBR";
import { formatBRL } from "@/shared/lib/format";
import Row from "@/features/orcamento/components/Row";

export default function TrechoPricingCard({ trecho, index, milesTable, onChange }) {
  const isIda = (trecho.label || "").startsWith("Ida");
  const accentClass = isIda ? "border-l-blue-500" : "border-l-red-500";

  const selectedProgram = useMemo(
    () => milesTable.find((m) => m.id === trecho.program_id) || null,
    [milesTable, trecho.program_id]
  );

  // Recalcula nipon_value e cost_total deste trecho conforme entradas mudam.
  useEffect(() => {
    let cost_total = 0;
    let nipon_value = 0;
    const tax = parseBR(trecho.tax);

    if (trecho.type === "milhas") {
      const milhas = parseBR(trecho.miles_qty);
      if (selectedProgram && milhas > 0) {
        const costPerThousand = getCostForMiles(selectedProgram, milhas);
        const salePerThousand = getSaleForMiles(selectedProgram, milhas);
        cost_total = (milhas / 1000) * costPerThousand + tax;
        nipon_value = (milhas / 1000) * salePerThousand + tax;
      }
    } else {
      const cost = parseBR(trecho.cost_brl);
      if (cost > 0 || tax > 0) {
        const base = cost + tax;
        const acrescimo = trecho.is_azul ? 0 : base * 0.10;
        cost_total = base;
        nipon_value = base + acrescimo;
      }
    }

    if (
      Math.abs(cost_total - (Number(trecho.cost_total) || 0)) > 0.001 ||
      Math.abs(nipon_value - (Number(trecho.nipon_value) || 0)) > 0.001
    ) {
      onChange({ ...trecho, cost_total, nipon_value });
    }

  }, [trecho.type, trecho.program_id, trecho.miles_qty, trecho.tax, trecho.cost_brl, trecho.is_azul, selectedProgram]);

  return (
    <Card className={cn("border-l-4", accentClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
              {index + 1}
            </span>
            {trecho.label}
          </CardTitle>
          {Number(trecho.nipon_value) > 0 && (
            <span className="text-xs text-warning dark:text-warning font-semibold">
              Nipon: {formatBRL(trecho.nipon_value)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={trecho.type || "milhas"}
          onValueChange={(v) => onChange({ ...trecho, type: v })}
        >
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="milhas">Milhas</TabsTrigger>
            <TabsTrigger value="dinheiro">Dinheiro</TabsTrigger>
          </TabsList>

          <TabsContent value="milhas" className="space-y-3 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Programa de Milhas</Label>
                <Select
                  value={trecho.program_id || ""}
                  onValueChange={(v) => {
                    const program = milesTable.find((m) => m.id === v);
                    onChange({
                      ...trecho,
                      program_id: v,
                      program_name: program?.program || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={milesTable.length === 0 ? "Sem programas" : "Selecione..."}
                    />
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
                          {m.stock_status === "unavailable" && (
                            <span className="text-danger text-xs">(em falta)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custo em milhas</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 80.000 ou 80000"
                  value={trecho.miles_qty || ""}
                  onChange={(e) => onChange({ ...trecho, miles_qty: sanitizeBRInput(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de embarque (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 320,50"
                  value={trecho.tax || ""}
                  onChange={(e) => onChange({ ...trecho, tax: sanitizeBRInput(e.target.value) })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dinheiro" className="space-y-3 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preço de custo (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 1.234,56"
                  value={trecho.cost_brl || ""}
                  onChange={(e) => onChange({ ...trecho, cost_brl: sanitizeBRInput(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de embarque (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 320,50"
                  value={trecho.tax || ""}
                  onChange={(e) => onChange({ ...trecho, tax: sanitizeBRInput(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`azul-${index}`}
                checked={!!trecho.is_azul}
                onCheckedChange={(c) => onChange({ ...trecho, is_azul: !!c })}
              />
              <Label htmlFor={`azul-${index}`} className="text-sm cursor-pointer">
                Azul — não aplicar 10%
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        {Number(trecho.cost_total) > 0 && (
          <Card className="bg-muted/40 border-border/50 mt-4">
            <CardContent className="p-3 space-y-1.5 text-sm">
              <Row label="Custo deste trecho" value={formatBRL(trecho.cost_total)} muted />
              <Row
                label="Valor Nipon deste trecho"
                value={formatBRL(trecho.nipon_value)}
                bold
                accent
              />
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
