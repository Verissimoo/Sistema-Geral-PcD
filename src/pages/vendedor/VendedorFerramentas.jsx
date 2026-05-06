import { useState, useEffect, useMemo } from "react";
import { Wrench, Calculator, CreditCard, DollarSign, Percent, RefreshCw, Plane } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getCostForMiles, getSaleForMiles, getTierForMiles } from "@/lib/milesHelper";
import { localClient } from "@/api/localClient";
import { parseBR, sanitizeBRInput } from "@/lib/parseBR";

// ─── Dados de Plataformas de Pagamento ─────────────────────────────
const PLATFORMS = [
  {
    name: 'Infinite Pay',
    modalities: [
      {
        name: 'Link de Pagamento',
        has_fixed_fee: false,
        fixed_fee_value: 0,
        rates: [
          { label: '1x', percentage: 4.20 }, { label: '2x', percentage: 6.09 },
          { label: '3x', percentage: 7.01 }, { label: '4x', percentage: 7.91 },
          { label: '5x', percentage: 8.80 }, { label: '6x', percentage: 9.67 },
          { label: '7x', percentage: 12.59 }, { label: '8x', percentage: 13.42 },
          { label: '9x', percentage: 14.25 }, { label: '10x', percentage: 15.06 },
          { label: '11x', percentage: 15.87 }, { label: '12x', percentage: 16.66 }
        ]
      },
      {
        name: 'Maquininha Smart',
        has_fixed_fee: false,
        fixed_fee_value: 0,
        rates: [
          { label: 'Débito', percentage: 0.75 }, { label: '1x', percentage: 2.69 },
          { label: '2x', percentage: 3.94 }, { label: '3x', percentage: 4.46 },
          { label: '4x', percentage: 4.98 }, { label: '5x', percentage: 5.49 },
          { label: '6x', percentage: 5.99 }, { label: '7x', percentage: 6.51 },
          { label: '8x', percentage: 6.99 }, { label: '9x', percentage: 7.51 },
          { label: '10x', percentage: 7.99 }, { label: '11x', percentage: 8.49 },
          { label: '12x', percentage: 8.99 }
        ]
      }
    ]
  },
  {
    name: 'Hyper Cash',
    modalities: [
      {
        name: 'Cartão',
        has_fixed_fee: true,
        fixed_fee_value: 1.50,
        rates: [
          { label: 'À vista', percentage: 4.20 }, { label: '2x', percentage: 5.47 },
          { label: '3x', percentage: 6.76 }, { label: '4x', percentage: 8.06 },
          { label: '5x', percentage: 9.38 }, { label: '6x', percentage: 10.71 },
          { label: '7x', percentage: 12.06 }, { label: '8x', percentage: 13.43 },
          { label: '9x', percentage: 14.81 }, { label: '10x', percentage: 16.22 },
          { label: '11x', percentage: 17.63 }, { label: '12x', percentage: 19.07 }
        ]
      }
    ]
  }
];

const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Componente: Cálculo de Comissão ────────────────────────────────
function ComissaoTab() {
  const [modoMilhas, setModoMilhas] = useState(false);
  // Dinheiro
  const [custoPassagem, setCustoPassagem] = useState('');
  // Milhas
  const [qtdMilhas, setQtdMilhas] = useState('');
  const [valorTaxa, setValorTaxa] = useState('');
  const [programaSelecionado, setProgramaSelecionado] = useState('');
  const [milesPrograms, setMilesPrograms] = useState([]);
  // Comum
  const [valorVenda, setValorVenda] = useState('');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await localClient.entities.MilesTable.list();
      setMilesPrograms(data || []);
    })();
  }, []);

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
        <DollarSign className={`h-5 w-5 transition-colors ${!modoMilhas ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
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
        <Percent className={`h-5 w-5 transition-colors ${modoMilhas ? 'text-blue-500' : 'text-muted-foreground/40'}`} />
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
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1.5">
                {modoMilhas && appliedTier && (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 border">
                    Faixa: {appliedTier.label}
                  </Badge>
                )}
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  Valor Nipon (preço base de venda): {fmt(valorNipon)}
                </p>
                {modoMilhas && selectedProgram && (
                  <>
                    <p className="text-xs text-blue-500/80">
                      Baseado em {fmt(appliedSale)} por mil milhas (preço de venda)
                    </p>
                    <div className="text-[11px] text-muted-foreground border-t border-blue-500/20 pt-1.5 mt-1 space-y-0.5">
                      <div>Custo real (interno): {fmt(custoReal)}</div>
                      <div>
                        Margem bruta:{" "}
                        <span className="font-semibold text-emerald-600">
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
        <Card className={`border-border/50 transition-all duration-300 ${resultado ? 'ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'opacity-60'}`}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Resultado da Comissão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultado ? (
              <div className="space-y-3">
                {resultado.abaixoNipon && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
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
                <div className="flex justify-between items-center py-3 px-4 -mx-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">COMISSÃO TOTAL</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
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

// ─── Componente: Taxa de Juros do Cartão ────────────────────────────
function TaxaJurosTab() {
  const [platform, setPlatform] = useState('');
  const [modality, setModality] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [parcela, setParcela] = useState('');

  const selectedPlatform = PLATFORMS.find(p => p.name === platform);
  const modalities = selectedPlatform?.modalities || [];
  const selectedModality = modalities.find(m => m.name === modality);
  const rates = selectedModality?.rates || [];
  const selectedRate = rates.find(r => r.label === parcela);

  // Reset cascata
  useEffect(() => { setModality(''); setParcela(''); }, [platform]);
  useEffect(() => { setParcela(''); }, [modality]);

  const parseParcelas = (label) => {
    if (!label) return 1;
    if (label === 'Débito' || label === 'À vista') return 1;
    const m = label.match(/^(\d+)x$/);
    return m ? parseInt(m[1], 10) : 1;
  };

  const resultado = useMemo(() => {
    if (!selectedRate || !valorVenda) return null;
    const venda = parseFloat(valorVenda);
    if (!venda || isNaN(venda)) return null;

    const taxaPct = selectedRate.percentage;
    const valorTaxa = venda * taxaPct / 100;
    const fixedFee = selectedModality.has_fixed_fee ? selectedModality.fixed_fee_value : 0;
    const totalComTaxa = venda + valorTaxa + fixedFee;
    const liquidoRecebido = venda - valorTaxa - fixedFee;
    const numParcelas = parseParcelas(selectedRate.label);
    const valorParcela = totalComTaxa / numParcelas;

    return {
      venda,
      taxaPct,
      valorTaxa,
      fixedFee,
      totalComTaxa,
      liquidoRecebido,
      numParcelas,
      valorParcela,
      parcelaLabel: selectedRate.label,
      hasFixedFee: selectedModality.has_fixed_fee,
    };
  }, [selectedRate, valorVenda, selectedModality]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Campos */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Simulador de Taxas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="select-platform">
                <SelectValue placeholder="Selecione a plataforma" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modalidade</Label>
            <Select value={modality} onValueChange={setModality} disabled={!platform}>
              <SelectTrigger id="select-modality">
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                {modalities.map(m => (
                  <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor-venda-taxa">Valor da Venda (R$)</Label>
            <Input
              id="valor-venda-taxa"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valorVenda}
              onChange={(e) => setValorVenda(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Parcelas</Label>
            <Select value={parcela} onValueChange={setParcela} disabled={!selectedModality}>
              <SelectTrigger id="select-parcela">
                <SelectValue placeholder="Selecione as parcelas" />
              </SelectTrigger>
              <SelectContent>
                {rates.map(r => (
                  <SelectItem key={r.label} value={r.label}>
                    {r.label} — {r.percentage.toFixed(2)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card className={`border-border/50 transition-all duration-300 ${resultado ? 'ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/5' : 'opacity-60'}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-4 w-4 text-amber-500" />
            Resultado das Taxas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultado ? (
            <div className="space-y-4">
              {/* DESTAQUE PRINCIPAL — valor total com taxa */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-amber-700 mb-1">
                  Valor total a cobrar do cliente
                </p>
                <p className="text-4xl font-black text-amber-600">
                  {fmt(resultado.totalComTaxa)}
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  Inclui taxa de {resultado.taxaPct.toFixed(2)}%
                  {resultado.hasFixedFee ? ` + ${fmt(resultado.fixedFee)} fixo` : ''} repassada ao cliente
                </p>
              </div>

              {/* DESTAQUE SECUNDÁRIO — parcelas */}
              <div className="bg-slate-900 text-white rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                  Valor das parcelas
                </p>
                <p className="text-3xl font-bold">
                  {resultado.numParcelas}x de <span className="text-amber-400">{fmt(resultado.valorParcela)}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {resultado.parcelaLabel} no cartão de crédito
                </p>
              </div>

              {/* Detalhamento — valores menores */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Valor base</p>
                  <p className="font-semibold">{fmt(resultado.venda)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Taxa ({resultado.taxaPct.toFixed(2)}%)</p>
                  <p className="font-semibold text-red-600">+ {fmt(resultado.valorTaxa)}</p>
                </div>
                {resultado.hasFixedFee && (
                  <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">Taxa fixa adicional</p>
                    <p className="font-semibold text-red-600">+ {fmt(resultado.fixedFee)}</p>
                  </div>
                )}
                <div className="bg-emerald-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-emerald-700">Valor líquido recebido (vendedor)</p>
                  <p className="font-semibold text-emerald-700">{fmt(resultado.liquidoRecebido)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione a plataforma e preencha os dados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Componente: Calculadora de Milhas ────────────────────────────
function CalculadoraMilhasTab() {
  const [milesTable, setMilesTable] = useState([]);
  const [programId, setProgramId] = useState("");
  const [milesQty, setMilesQty] = useState("");
  const [tax, setTax] = useState("");

  useEffect(() => {
    (async () => {
      const data = await localClient.entities.MilesTable.list();
      setMilesTable(data || []);
    })();
  }, []);

  const program = milesTable.find((m) => m.id === programId);
  const qty = parseBR(milesQty);
  const taxNum = parseBR(tax);

  const costPerThousand = program && qty > 0 ? getCostForMiles(program, qty) : 0;
  const salePerThousand = program && qty > 0 ? getSaleForMiles(program, qty) : 0;
  const appliedTier = program && qty > 0 ? getTierForMiles(program, qty) : null;

  const custoBase = (qty / 1000) * costPerThousand;
  const valorVenda = (qty / 1000) * salePerThousand;
  const custoTotal = custoBase + taxNum;
  const vendaTotal = valorVenda + taxNum;
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
        </CardContent>
      </Card>

      <Card className={ready ? "border-amber-300 bg-amber-50/40 dark:bg-amber-500/5" : "border-border/50"}>
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
                <div className="rounded-lg border border-purple-300 bg-purple-100/60 dark:bg-purple-500/10 p-2 text-xs">
                  <strong>Faixa aplicada:</strong> {appliedTier.label}
                </div>
              )}

              <div className="space-y-1 pb-3 border-b">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Valor de venda
                </div>
                <div className="text-3xl font-black text-amber-600">{fmt(vendaTotal)}</div>
                <div className="text-xs text-muted-foreground">
                  ({(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 2)}k milhas × {fmt(salePerThousand)}/mil
                  {taxNum > 0 ? ` + ${fmt(taxNum)} taxa` : ""})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Custo</div>
                  <div className="font-semibold">{fmt(custoTotal)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Lucro</div>
                  <div className={`font-semibold ${lucro >= 0 ? "text-emerald-600" : "text-red-600"}`}>
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

// ─── Página Principal ──────────────────────────────────────────────
export default function VendedorFerramentas() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Ferramentas do Vendedor</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">Calculadoras de comissão e simulador de taxas de cartão</p>
      </div>

      <Tabs defaultValue="comissao" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="comissao" className="gap-2">
            <Calculator className="h-4 w-4" />
            Cálculo de Comissão
          </TabsTrigger>
          <TabsTrigger value="taxas" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Taxa de Juros
          </TabsTrigger>
          <TabsTrigger value="milhas" className="gap-2">
            <Plane className="h-4 w-4" />
            Calculadora de Milhas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comissao">
          <ComissaoTab />
        </TabsContent>

        <TabsContent value="taxas">
          <TaxaJurosTab />
        </TabsContent>

        <TabsContent value="milhas">
          <CalculadoraMilhasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
