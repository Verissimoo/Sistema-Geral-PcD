import { useState, useEffect, useMemo } from "react";
import { CreditCard, Percent, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { FINANCEIRO_WHATSAPP } from "@/shared/lib/config";
import { useAuth } from "@/features/auth/AuthContext";
import { PLATFORMS, fmt } from "./platformsData";

// ─── Componente: Taxa de Juros do Cartão ────────────────────────────
export default function TaxaJurosTab() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState('');
  const [modality, setModality] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [parcela, setParcela] = useState('');
  const [isUrgente, setIsUrgente] = useState(false);
  // Repassar a taxa ao cliente (marcado): cobra base + taxa, parcela sobre o total.
  // Desmarcado (absorver): cliente paga só a base; a taxa sai do líquido do vendedor.
  const [repassarTaxa, setRepassarTaxa] = useState(true);

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
    // A taxa da plataforma sempre sai do que o vendedor recebe.
    const liquidoRecebido = venda - valorTaxa - fixedFee;
    const numParcelas = parseParcelas(selectedRate.label);

    // Repassar: cliente paga base + taxa. Absorver: cliente paga só a base.
    const valorCobradoCliente = repassarTaxa ? totalComTaxa : venda;
    const valorParcela = valorCobradoCliente / numParcelas;

    return {
      venda,
      taxaPct,
      valorTaxa,
      fixedFee,
      totalComTaxa,
      valorCobradoCliente,
      liquidoRecebido,
      numParcelas,
      valorParcela,
      repassarTaxa,
      parcelaLabel: selectedRate.label,
      hasFixedFee: selectedModality.has_fixed_fee,
    };
  }, [selectedRate, valorVenda, selectedModality, repassarTaxa]);

  const gerarMensagem = () => {
    if (!resultado) return '';
    const nomeVendedor = user?.name || 'Vendedor';
    let mensagem = `*Solicitação de link de pagamento*\n\n`;
    mensagem += `👤 *Vendedor:* ${nomeVendedor}\n`;
    mensagem += `💰 *Valor base:* ${fmt(resultado.venda)}\n`;
    mensagem += `📊 *Parcelas:* ${resultado.parcelaLabel}\n`;
    mensagem += `🏷️ *Taxa aplicada:* ${resultado.taxaPct.toFixed(2)}%`;
    mensagem += resultado.repassarTaxa ? ` (repassada ao cliente)\n` : ` (absorvida pelo vendedor)\n`;
    if (resultado.hasFixedFee) {
      mensagem += `➕ *Taxa fixa:* ${fmt(resultado.fixedFee)}\n`;
    }
    mensagem += `💳 *Valor a cobrar do cliente:* ${fmt(resultado.valorCobradoCliente)}\n`;
    mensagem += `📦 *Cada parcela:* ${resultado.numParcelas}x de ${fmt(resultado.valorParcela)}\n`;
    mensagem += `💚 *Líquido para o vendedor:* ${fmt(resultado.liquidoRecebido)}\n`;
    if (isUrgente) {
      mensagem += `\n🔥 *URGENTE* — cliente aguardando para fechar`;
    }
    mensagem += `\n\nPor favor, gere o link de pagamento. Obrigado!`;
    return mensagem;
  };

  const enviarParaFinanceiro = () => {
    const mensagem = gerarMensagem();
    if (!mensagem) return;
    const url = `https://wa.me/${FINANCEIRO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
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

          {/* Toggle: repassar a taxa ao cliente ou absorver no líquido */}
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="repassar-taxa"
              checked={repassarTaxa}
              onCheckedChange={(v) => setRepassarTaxa(!!v)}
              className="mt-0.5"
            />
            <Label htmlFor="repassar-taxa" className="cursor-pointer leading-snug">
              <span className="text-sm font-medium">Repassar taxas ao cliente</span>
              <span className="block text-xs text-text-muted font-normal mt-0.5">
                {repassarTaxa
                  ? "Cliente paga a taxa — o valor cobrado já vem com a taxa embutida."
                  : "Você absorve a taxa — cliente paga só o valor base e a taxa sai do seu líquido."}
              </span>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card className={`border-border/50 transition-all duration-300 ${resultado ? 'ring-2 ring-warning/40 shadow-lg' : 'opacity-60'}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-4 w-4 text-warning" />
            Resultado das Taxas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultado ? (
            <div className="space-y-4">
              {/* DESTAQUE PRINCIPAL — valor cobrado do cliente (com ou sem taxa embutida) */}
              <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-warning mb-1">
                  {resultado.repassarTaxa
                    ? "Valor total a cobrar do cliente"
                    : "Valor cobrado do cliente"}
                </p>
                <p className="text-4xl font-semibold text-warning">
                  {fmt(resultado.valorCobradoCliente)}
                </p>
                <p className="text-xs text-warning mt-2">
                  {resultado.repassarTaxa
                    ? `Inclui taxa de ${resultado.taxaPct.toFixed(2)}%${resultado.hasFixedFee ? ` + ${fmt(resultado.fixedFee)} fixo` : ''} repassada ao cliente`
                    : `Cliente paga só o valor base — taxa de ${resultado.taxaPct.toFixed(2)}%${resultado.hasFixedFee ? ` + ${fmt(resultado.fixedFee)} fixo` : ''} absorvida pelo vendedor`}
                </p>
              </div>

              {/* DESTAQUE SECUNDÁRIO — parcelas */}
              <div className="bg-bg-elevated text-text-primary rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-text-muted mb-1">
                  Valor das parcelas
                </p>
                <p className="text-3xl font-bold">
                  {resultado.numParcelas}x de <span className="text-warning">{fmt(resultado.valorParcela)}</span>
                </p>
                <p className="text-xs text-text-muted mt-2">
                  {resultado.parcelaLabel} no cartão de crédito
                </p>
              </div>

              {/* Detalhamento — valores menores */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-bg-elevated rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Valor base</p>
                  <p className="font-semibold">{fmt(resultado.venda)}</p>
                </div>
                <div className="bg-bg-elevated rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Taxa ({resultado.taxaPct.toFixed(2)}%)</p>
                  <p className="font-semibold text-danger">− {fmt(resultado.valorTaxa)}</p>
                </div>
                {resultado.hasFixedFee && (
                  <div className="bg-bg-elevated rounded-lg p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">Taxa fixa adicional</p>
                    <p className="font-semibold text-danger">− {fmt(resultado.fixedFee)}</p>
                  </div>
                )}
                {/* Líquido — destaque forte quando a taxa é absorvida (é o número-chave) */}
                <div className={`bg-success/10 rounded-lg p-4 col-span-2 ${resultado.repassarTaxa ? '' : 'border-2 border-success/40'}`}>
                  <p className="text-xs text-success uppercase tracking-wider">
                    Valor líquido recebido (vendedor)
                  </p>
                  <p className={`font-semibold text-success ${resultado.repassarTaxa ? 'text-lg' : 'text-3xl'}`}>
                    {fmt(resultado.liquidoRecebido)}
                  </p>
                  {!resultado.repassarTaxa && (
                    <p className="text-xs text-success/80 mt-1">
                      Já descontada a taxa da plataforma do valor base
                    </p>
                  )}
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

    {resultado && (
      <Card className="border-2 border-success/30 bg-success/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-success" />
            Solicitar link de pagamento ao financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="urgente"
              checked={isUrgente}
              onCheckedChange={(v) => setIsUrgente(!!v)}
            />
            <Label htmlFor="urgente" className="cursor-pointer flex items-center gap-2">
              <span className="text-sm font-medium">🔥 Marcar como urgente</span>
              <span className="text-xs text-muted-foreground">
                (cliente esperando para fechar)
              </span>
            </Label>
          </div>

          <div className="bg-bg-surface border border-border rounded-lg p-3 text-xs font-mono text-text-secondary whitespace-pre-line">
            {gerarMensagem()}
          </div>

          <Button
            onClick={enviarParaFinanceiro}
            className="w-full bg-success hover:bg-success text-white font-semibold"
            size="lg"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Enviar via WhatsApp ao financeiro
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            O WhatsApp abrirá com a mensagem pronta. Basta confirmar o envio.
          </p>
        </CardContent>
      </Card>
    )}
    </div>
  );
}
