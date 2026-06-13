import { useState, useMemo } from "react";
import { Calculator, DollarSign, Percent, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { getCostForMiles, getSaleForMiles, getTierForMiles } from "@/features/milhas/milesHelper";
import { useMilesTable } from "@/api/hooks";
import { fmt } from "./platformsData";

// ─── Componente: Cálculo de Comissão ────────────────────────────────
export default function ComissaoTab() {
  const [modoMilhas, setModoMilhas] = useState(false);
  // Dinheiro
  const [custoPassagem, setCustoPassagem] = useState('');
  // Milhas
  const [qtdMilhas, setQtdMilhas] = useState('');
  const [valorTaxa, setValorTaxa] = useState('');
  const [programaSelecionado, setProgramaSelecionado] = useState('');
  const { data: milesPrograms = [] } = useMilesTable();
  // Comum
  const [valorVenda, setValorVenda] = useState('');
  const [resultado, setResultado] = useState(null);

  const selectedProgram = milesPrograms.find(p => p.id === programaSelecionado);
  const appliedTier = useMemo(
    () => (selectedProgram ? getTierForMiles(selectedProgram, qtdMilhas) : null),
    [selectedProgram, qtdMilhas]
  );
  const appliedCost = useMemo(
    () => (selectedProgram ? getCostForMiles(selectedProgram, qtdMilhas) : 0),
    [selectedProgram, qtdMilhas]
  );
  const appliedSale = useMemo(
    () => (selectedProgram ? getSaleForMiles(selectedProgram, qtdMilhas) : 0),
    [selectedProgram, qtdMilhas]
  );

  const valorNipon = useMemo(() => {
    if (modoMilhas) {
      if (!selectedProgram || !qtdMilhas) return 0;
      // Nipon usa o preço de VENDA da milha (não o custo) — define o preço base ao cliente
      const base = (parseFloat(qtdMilhas) / 1000) * appliedSale;
      const taxa = parseFloat(valorTaxa) || 0;
      return base + taxa;
    } else {
      const custo = parseFloat(custoPassagem);
      if (!custo || isNaN(custo)) return 0;
      return custo + (custo * 0.10);
    }
  }, [modoMilhas, custoPassagem, qtdMilhas, valorTaxa, selectedProgram, appliedSale]);

  const custoReal = useMemo(() => {
    if (!modoMilhas || !selectedProgram || !qtdMilhas) return 0;
    return (parseFloat(qtdMilhas) / 1000) * appliedCost + (parseFloat(valorTaxa) || 0);
  }, [modoMilhas, selectedProgram, qtdMilhas, appliedCost, valorTaxa]);

  const calcular = () => {
    const venda = parseFloat(valorVenda);
    if (!venda || valorNipon === 0) return;

    // Custo total = custo base + taxa (apenas modo milhas tem taxa separada)
    const custoTotal = modoMilhas
      ? custoReal // já inclui taxa
      : (parseFloat(custoPassagem) || 0);

    // Lucro Nipon = nipon - custoTotal (sempre não-negativo)
    const lucroNipon = Math.max(0, valorNipon - custoTotal);
    const comissaoBase = lucroNipon * 0.25;

    // Excedente: só conta o que passou do Nipon (nunca negativo)
    const excedente = Math.max(0, venda - valorNipon);
    const comissaoExtra = excedente * 0.45;

    const comissaoTotal = comissaoBase + comissaoExtra;

    setResultado({
      valorNipon,
      valorVenda: venda,
      lucroNipon,
      excedente,
      abaixoNipon: venda < valorNipon,
      comissaoBase,
      comissaoExtra,
      comissaoTotal,
    });
  };

  const limpar = () => {
    setCustoPassagem('');
    setQtdMilhas('');
    setValorTaxa('');
    setProgramaSelecionado('');
    setValorVenda('');
    setResultado(null);
  };

  return (
    <div className="space-y-6">
      {/* Toggle Modo */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
        <DollarSign className={`h-5 w-5 transition-colors ${!modoMilhas ? 'text-success' : 'text-muted-foreground/40'}`} />
        <span className={`text-sm font-medium transition-colors ${!modoMilhas ? 'text-foreground' : 'text-muted-foreground'}`}>
          Dinheiro
        </span>
        <Switch
          id="modo-comissao"
          checked={modoMilhas}
          onCheckedChange={setModoMilhas}
        />
        <span className={`text-sm font-medium transition-colors ${modoMilhas ? 'text-foreground' : 'text-muted-foreground'}`}>
          Milhas
        </span>
        <Percent className={`h-5 w-5 transition-colors ${modoMilhas ? 'text-accent' : 'text-muted-foreground/40'}`} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Campos */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              {modoMilhas ? 'Dados da Venda (Milhas)' : 'Dados da Venda (Dinheiro)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!modoMilhas ? (
              <div className="space-y-2">
                <Label htmlFor="custo-passagem">Custo da Passagem (R$)</Label>
                <Input
                  id="custo-passagem"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={custoPassagem}
                  onChange={(e) => setCustoPassagem(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="qtd-milhas">Quantidade de Milhas</Label>
                  <Input
                    id="qtd-milhas"
                    type="number"
                    placeholder="10000"
                    value={qtdMilhas}
                    onChange={(e) => setQtdMilhas(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor-taxa">Valor da Taxa (R$)</Label>
                  <Input
                    id="valor-taxa"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={valorTaxa}
                    onChange={(e) => setValorTaxa(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programa-milhas">Programa de Milhas</Label>
                  <Select value={programaSelecionado} onValueChange={setProgramaSelecionado}>
                    <SelectTrigger id="programa-milhas">
                      <SelectValue placeholder="Selecione o programa" />
                    </SelectTrigger>
                    <SelectContent>
                      {milesPrograms.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.program} — {fmt(p.cost_per_thousand)}/mil
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Valor Nipon (destaque) */}
            {valorNipon > 0 && (
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-1.5">
                {modoMilhas && appliedTier && (
                  <Badge className="bg-accent/10 text-accent border-accent/30 hover:bg-accent/10 border">
                    Faixa: {appliedTier.label}
                  </Badge>
                )}
                <p className="text-sm font-semibold text-accent dark:text-accent">
                  Valor Nipon (preço base de venda): {fmt(valorNipon)}
                </p>
                {modoMilhas && selectedProgram && (
                  <>
                    <p className="text-xs text-accent">
                      Baseado em {fmt(appliedSale)} por mil milhas (preço de venda)
                    </p>
                    <div className="text-[11px] text-muted-foreground border-t border-accent/30 pt-1.5 mt-1 space-y-0.5">
                      <div>Custo real (interno): {fmt(custoReal)}</div>
                      <div>
                        Margem bruta:{" "}
                        <span className="font-semibold text-success">
                          {fmt(valorNipon - custoReal)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="valor-venda-comissao">Valor de Venda (R$)</Label>
              <Input
                id="valor-venda-comissao"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valorVenda}
                onChange={(e) => setValorVenda(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={calcular} className="flex-1" disabled={!valorVenda || valorNipon === 0}>
                <Calculator className="h-4 w-4 mr-2" />
                Calcular Comissão
              </Button>
              <Button variant="outline" onClick={limpar}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card className={`border-border/50 transition-all duration-300 ${resultado ? 'ring-2 ring-success/40 shadow-lg' : 'opacity-60'}`}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              Resultado da Comissão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultado ? (
              <div className="space-y-3">
                {resultado.abaixoNipon && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning dark:text-warning">
                    ⚠️ Venda ({fmt(resultado.valorVenda)}) está abaixo do Nipon ({fmt(resultado.valorNipon)}).
                    Sem comissão extra — só comissão base sobre o lucro mínimo.
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Valor Nipon</span>
                  <span className="text-sm font-medium">{fmt(resultado.valorNipon)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Valor de Venda</span>
                  <span className="text-sm font-medium">{fmt(resultado.valorVenda)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Lucro Nipon (nipon − custo)</span>
                  <span className="text-sm font-medium">{fmt(resultado.lucroNipon)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Comissão Base (25% do lucro Nipon)</span>
                  <span className="text-sm font-medium">{fmt(resultado.comissaoBase)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Excedente sobre Nipon</span>
                  <span className="text-sm font-medium">{fmt(resultado.excedente)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Comissão Extra (45% do excedente)</span>
                  <span className="text-sm font-medium">{fmt(resultado.comissaoExtra)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center py-3 px-4 -mx-4 rounded-xl bg-success/10 border border-success/30">
                  <span className="text-base font-bold text-success dark:text-success">COMISSÃO TOTAL</span>
                  <span className="text-xl font-bold text-success dark:text-success">
                    {fmt(resultado.comissaoTotal)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Preencha os dados e clique em calcular</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
