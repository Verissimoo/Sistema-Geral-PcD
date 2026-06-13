import { useState } from "react";
import { Plane } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { getCostForMiles, getSaleForMiles, getTierForMiles } from "@/features/milhas/milesHelper";
import { useMilesTable } from "@/api/hooks";
import { parseBR, sanitizeBRInput } from "@/shared/lib/parseBR";
import { fmt } from "./platformsData";

// ─── Componente: Calculadora de Milhas ────────────────────────────
export default function CalculadoraMilhasTab() {
  const { data: milesTable = [] } = useMilesTable();
  const [programId, setProgramId] = useState("");
  const [milesQty, setMilesQty] = useState("");
  const [tax, setTax] = useState("");
  const [cashPart, setCashPart] = useState("");

  const program = milesTable.find((m) => m.id === programId);
  const isAzul = program?.program?.toLowerCase().includes("azul");
  const qty = parseBR(milesQty);
  const taxNum = parseBR(tax);
  // Parte em dinheiro só conta para programas Azul (tarifa híbrida milhas + R$).
  const cashNum = isAzul ? parseBR(cashPart) : 0;

  const costPerThousand = program && qty > 0 ? getCostForMiles(program, qty) : 0;
  const salePerThousand = program && qty > 0 ? getSaleForMiles(program, qty) : 0;
  const appliedTier = program && qty > 0 ? getTierForMiles(program, qty) : null;

  const custoBase = (qty / 1000) * costPerThousand;
  const valorVenda = (qty / 1000) * salePerThousand;
  // A parte em dinheiro é repasse: entra em custo E venda (neutra ao lucro das milhas).
  const custoTotal = custoBase + taxNum + cashNum;
  const vendaTotal = valorVenda + taxNum + cashNum;
  const lucro = vendaTotal - custoTotal;
  const margemPct = custoTotal > 0 ? ((lucro / custoTotal) * 100).toFixed(1) : "0.0";

  const ready = !!program && qty > 0;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-4 w-4 text-primary" /> Entradas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Programa de milhas</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger>
                <SelectValue placeholder={milesTable.length === 0 ? "Sem programas cadastrados" : "Selecione..."} />
              </SelectTrigger>
              <SelectContent>
                {milesTable.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.program} — venda {fmt(m.sale_per_thousand)}/mil
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade de milhas</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 80.000 ou 80000"
              value={milesQty}
              onChange={(e) => setMilesQty(sanitizeBRInput(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Taxa de embarque (R$, opcional)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 320,50"
              value={tax}
              onChange={(e) => setTax(sanitizeBRInput(e.target.value))}
            />
          </div>

          {isAzul && (
            <div className="space-y-2">
              <Label>Valor em dinheiro adicional (R$, por pax)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 2.500,00"
                value={cashPart}
                onChange={(e) => setCashPart(sanitizeBRInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tarifas Azul podem cobrar milhas + dinheiro simultaneamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={ready ? "border-warning/30 bg-warning/10 dark:bg-warning/5" : "border-border/50"}>
        <CardHeader>
          <CardTitle className="text-base">Resultado</CardTitle>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Selecione o programa e informe a quantidade de milhas para ver o cálculo.
            </p>
          ) : (
            <div className="space-y-3">
              {appliedTier && (
                <div className="rounded-lg border border-accent/30 bg-accent/10 dark:bg-accent/10 p-2 text-xs">
                  <strong>Faixa aplicada:</strong> {appliedTier.label}
                </div>
              )}

              <div className="space-y-1 pb-3 border-b">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Valor de venda
                </div>
                <div className="text-3xl font-semibold text-warning">{fmt(vendaTotal)}</div>
                <div className="text-xs text-muted-foreground">
                  ({(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 2)}k milhas × {fmt(salePerThousand)}/mil
                  {taxNum > 0 ? ` + ${fmt(taxNum)} taxa` : ""}
                  {cashNum > 0 ? ` + ${fmt(cashNum)} dinheiro` : ""})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Custo</div>
                  <div className="font-semibold">{fmt(custoTotal)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Lucro</div>
                  <div className={`font-semibold ${lucro >= 0 ? "text-success" : "text-danger"}`}>
                    {fmt(lucro)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Custo/mil</div>
                  <div>{fmt(costPerThousand)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Margem</div>
                  <div className="font-semibold">{margemPct}%</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
