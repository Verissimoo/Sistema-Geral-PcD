import { useState, useEffect, useMemo } from "react";
import { Wrench, Calculator, CreditCard, DollarSign, Percent, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getCostForMiles, getSaleForMiles, getTierForMiles } from "@/lib/milesHelper";

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
    const data = JSON.parse(localStorage.getItem('pcd_miles_table') || '[]');
    setMilesPrograms(data);
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

    const custoBase = modoMilhas ? 0 : parseFloat(custoPassagem);
    const lucroNipon = valorNipon - (modoMilhas ? 0 : custoBase);
    const comissaoBase = lucroNipon * 0.25;

    let comissaoExtra = 0;
    if (venda > valorNipon) {
      const excedente = venda - valorNipon;
      comissaoExtra = excedente * 0.45;
    }

    const comissaoTotal = comissaoBase + comissaoExtra;

    setResultado({
      valorNipon,
      valorVenda: venda,
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
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Valor Nipon</span>
                  <span className="text-sm font-medium">{fmt(resultado.valorNipon)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Valor de Venda</span>
                  <span className="text-sm font-medium">{fmt(resultado.valorVenda)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Comissão Base (25% do lucro Nipon)</span>
                  <span className="text-sm font-medium">{fmt(resultado.comissaoBase)}</span>
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

  const resultado = useMemo(() => {
    if (!selectedRate || !valorVenda) return null;
    const venda = parseFloat(valorVenda);
    if (!venda || isNaN(venda)) return null;

    const taxaPct = selectedRate.percentage;
    const valorTaxa = venda * taxaPct / 100;
    const fixedFee = selectedModality.has_fixed_fee ? selectedModality.fixed_fee_value : 0;
    const totalComTaxa = venda + valorTaxa + fixedFee;
    const liquidoRecebido = venda - valorTaxa - fixedFee;

    return { taxaPct, valorTaxa, fixedFee, totalComTaxa, liquidoRecebido, hasFixedFee: selectedModality.has_fixed_fee };
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
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Taxa aplicada</span>
                <Badge variant="outline" className="font-mono">{resultado.taxaPct.toFixed(2)}%</Badge>
              </div>
              {resultado.hasFixedFee && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Taxa fixa adicional</span>
                  <span className="text-sm font-medium">{fmt(resultado.fixedFee)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Valor da taxa</span>
                <span className="text-sm font-medium text-red-500">{fmt(resultado.valorTaxa)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Valor total com taxa</span>
                <span className="text-sm font-semibold">{fmt(resultado.totalComTaxa)}</span>
              </div>
              <div className="flex justify-between items-center py-3 px-4 -mx-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Valor líquido recebido</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {fmt(resultado.liquidoRecebido)}
                </span>
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
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="comissao" className="gap-2">
            <Calculator className="h-4 w-4" />
            Cálculo de Comissão
          </TabsTrigger>
          <TabsTrigger value="taxas" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Taxa de Juros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comissao">
          <ComissaoTab />
        </TabsContent>

        <TabsContent value="taxas">
          <TaxaJurosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
