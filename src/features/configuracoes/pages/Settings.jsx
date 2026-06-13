import { useState, useRef } from "react";
import {
  Settings as SettingsIcon, Database, Info, CheckCircle2,
  AlertTriangle, Trash2, Loader2, Calculator, FileSearch, Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/shared/ui/use-toast";
import { useAuth } from "@/features/auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { listQuotes, updateQuote, deleteQuote } from "@/api/quotes";
import { listMiles } from "@/api/miles";
import { qk } from "@/api/queryKeys";
import { computePricingTotals, buildCommissionSnapshot } from "@/shared/lib/pricingCalculator";
import { checkMilesPriceFreshness, FROZEN_STATUSES } from "@/features/orcamento/lib/priceFreshness";

export default function Settings() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cleaning, setCleaning] = useState(false);
  const isCleaningRef = useRef(false);
  const [recalculando, setRecalculando] = useState(false);
  const isRecalculandoRef = useRef(false);
  const [auditandoPrecos, setAuditandoPrecos] = useState(false);
  const isAuditandoRef = useRef(false);
  const [normalizando, setNormalizando] = useState(false);
  const isNormalizandoRef = useRef(false);

  // Detecta e remove quote_numbers duplicados, mantendo o registro mais antigo.
  // O banco já tem UNIQUE constraint em quote_number, então duplicatas só podem
  // existir se a constraint for removida em alguma operação de manutenção.
  const limparDuplicatas = async () => {
    if (isCleaningRef.current) return;
    isCleaningRef.current = true;
    setCleaning(true);
    try {
      const allQuotes = (await listQuotes()) || [];

      const byNumber = {};
      for (const q of allQuotes) {
        if (!q.quote_number) continue;
        if (!byNumber[q.quote_number]) byNumber[q.quote_number] = [];
        byNumber[q.quote_number].push(q);
      }

      const duplicateGroups = Object.entries(byNumber).filter(
        ([, items]) => items.length > 1
      );

      if (duplicateGroups.length === 0) {
        toast({
          title: "Sem duplicatas",
          description: "Nenhuma duplicata de quote_number encontrada.",
        });
        return;
      }

      const totalExtras = duplicateGroups.reduce(
        (s, [, items]) => s + items.length - 1,
        0
      );

      const ok = window.confirm(
        `Encontradas ${duplicateGroups.length} séries duplicadas, totalizando ${totalExtras} registros extras para excluir.\n\n` +
        `O registro mais antigo de cada série será mantido. Continuar?`
      );
      if (!ok) return;

      let deleted = 0;
      for (const [, items] of duplicateGroups) {
        items.sort(
          (a, b) =>
            new Date(a.created_date || 0).getTime() -
            new Date(b.created_date || 0).getTime()
        );
        const [, ...toDelete] = items;
        for (const dup of toDelete) {
          await deleteQuote(dup.id);
          deleted++;
        }
      }

      toast({
        title: "Limpeza concluída",
        description: `${deleted} ${deleted === 1 ? "duplicata removida" : "duplicatas removidas"}.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro na limpeza",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      queryClient.invalidateQueries({ queryKey: qk.quotes.all });
      isCleaningRef.current = false;
      setCleaning(false);
    }
  };

  // Recalcula commission.* de TODOS os quotes usando a fórmula corrigida
  // (que multiplica custo/nipon por passageiros e aplica 30% para Carteira
  // própria). Necessário uma vez após a correção do bug de múltiplos pax.
  const recalcularComissoes = async () => {
    if (isRecalculandoRef.current) return;
    const ok = window.confirm(
      "Esta ação vai recalcular a comissão de TODAS as cotações no banco usando a nova fórmula.\n\n" +
        "Necessária após a correção do bug de múltiplos passageiros (custo/nipon × pax) e da regra Carteira própria 30%.\n\n" +
        "Continuar?"
    );
    if (!ok) return;
    isRecalculandoRef.current = true;
    setRecalculando(true);
    try {
      const allQuotes = (await listQuotes()) || [];
      let verificadas = 0;
      let corrigidas = 0;
      const detalhes = [];

      for (const q of allQuotes) {
        // Pula orçamentos de parceiro ainda sem preço final.
        if (q.recipient_type === "parceiro" && q.partner_sale_value == null) {
          verificadas++;
          continue;
        }
        const snapshot = buildCommissionSnapshot(q);
        const oldTotal = Number(q.commission?.total) || 0;
        const diff = Math.abs(snapshot.total - oldTotal);

        if (diff > 0.01) {
          await updateQuote(q.id, {
            commission: {
              ...(q.commission || {}),
              ...snapshot,
              recalculated_at: new Date().toISOString(),
            },
          });
          corrigidas++;
          detalhes.push({
            quote: q.quote_number || q.id?.slice(0, 8),
            passageiros: snapshot.passengers,
            antes: oldTotal.toFixed(2),
            depois: snapshot.total.toFixed(2),
            diferenca: (snapshot.total - oldTotal).toFixed(2),
          });
        }
        verificadas++;
      }

      if (detalhes.length > 0) {
        console.table(detalhes);
      }
      toast({
        title: "Recálculo concluído",
        description:
          corrigidas > 0
            ? `${verificadas} cotações verificadas, ${corrigidas} comissões corrigidas. Veja o console (F12) para detalhes.`
            : `${verificadas} cotações verificadas — todas já estavam corretas.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro no recálculo",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      queryClient.invalidateQueries({ queryKey: qk.quotes.all });
      isRecalculandoRef.current = false;
      setRecalculando(false);
    }
  };

  // Lista orçamentos ativos (não congelados) cujo preço snapshotado de milhas
  // está defasado em relação à tabela atual. Apenas relatório — não modifica
  // os registros. Detalhes vão pro console pra análise.
  const auditarPrecosDesatualizados = async () => {
    if (isAuditandoRef.current) return;
    isAuditandoRef.current = true;
    setAuditandoPrecos(true);
    try {
      const [allQuotes, milesTable] = await Promise.all([
        listQuotes(),
        listMiles(),
      ]);
      const ativos = (allQuotes || []).filter(
        (q) =>
          !FROZEN_STATUSES.has(q.status) && q.pricing?.type === "milhas"
      );
      const desatualizados = [];
      for (const q of ativos) {
        const f = checkMilesPriceFreshness(q, milesTable || []);
        if (f.isFresh) continue;
        desatualizados.push({
          PCD: q.quote_number || q.id?.slice(0, 8),
          cliente: q.client?.name || q.partner_name || "—",
          vendedor: q.seller_name || "—",
          status: q.status,
          programa: f.programName,
          cotado_por_mil: Number(f.usedPrice).toFixed(2),
          atual_por_mil: Number(f.currentPrice).toFixed(2),
          diferenca_por_mil: Number(f.priceChange).toFixed(2),
          valor_total: Number(q.total_value || 0).toFixed(2),
        });
      }
      if (desatualizados.length > 0) {
        console.table(desatualizados);
      }
      toast({
        title:
          desatualizados.length === 0
            ? "Tudo em dia"
            : `${desatualizados.length} orçamento${desatualizados.length === 1 ? "" : "s"} com preço desatualizado`,
        description:
          desatualizados.length === 0
            ? "Nenhum orçamento ativo está defasado em relação à tabela de milhas."
            : "Veja o console (F12) para detalhes de cada cotação.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro na auditoria",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      isAuditandoRef.current = false;
      setAuditandoPrecos(false);
    }
  };

  // Reescreve pricing.nipon_value de TODAS as cotações para o valor derivado
  // pelo helper (custo × 1.10 ou × 1.0 Azul). Útil após mudanças manuais em
  // cost_brl/tax/programa que não passam pelo gerador.
  const normalizarNiponValues = async () => {
    if (isNormalizandoRef.current) return;
    const ok = window.confirm(
      "Esta ação vai reescrever pricing.nipon_value de TODAS as cotações no banco com base no cálculo dinâmico (custo × 1.10, exceto Azul).\n\n" +
        "Útil após correção manual de preços, mas só altera o snapshot armazenado — os cálculos de comissão e margem já usam o valor derivado.\n\n" +
        "Continuar?"
    );
    if (!ok) return;
    isNormalizandoRef.current = true;
    setNormalizando(true);
    try {
      const allQuotes = (await listQuotes()) || [];
      let verificadas = 0;
      let atualizadas = 0;
      const detalhes = [];

      for (const q of allQuotes) {
        if (!q.pricing) continue;
        verificadas++;
        const derived = computePricingTotals(q);
        const niponSalvo = Number(q.pricing.nipon_value) || 0;
        if (Math.abs(derived.niponPerPax - niponSalvo) <= 0.01) continue;
        await updateQuote(q.id, {
          pricing: { ...q.pricing, nipon_value: derived.niponPerPax },
        });
        atualizadas++;
        detalhes.push({
          PCD: q.quote_number || q.id?.slice(0, 8),
          antes: niponSalvo.toFixed(2),
          depois: derived.niponPerPax.toFixed(2),
          delta: (derived.niponPerPax - niponSalvo).toFixed(2),
        });
      }

      if (detalhes.length > 0) {
        console.table(detalhes);
      }
      toast({
        title: "Normalização concluída",
        description:
          atualizadas > 0
            ? `${verificadas} cotações verificadas, ${atualizadas} nipon corrigidos. Detalhes no console (F12).`
            : `${verificadas} cotações verificadas — todas já estavam consistentes.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro na normalização",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      queryClient.invalidateQueries({ queryKey: qk.quotes.all });
      isNormalizandoRef.current = false;
      setNormalizando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground text-sm">Configurações gerais do sistema</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Sincronização de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/30 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <div className="text-success dark:text-success">
              Os dados agora ficam centralizados no Supabase. Cada PC enxerga as
              mesmas informações em tempo real — não é mais necessário exportar
              ou importar backups.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent dark:text-accent">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Apenas a sessão de login (quem está logado neste navegador) ainda
              é armazenada localmente. Tudo o que se refere a clientes, cotações,
              metas, milhas e usuários está na nuvem.
            </span>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="border-warning/30 bg-warning/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-warning">
              <Calculator className="h-4 w-4" />
              Recalcular comissões existentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aplica a fórmula corrigida (custo/nipon × passageiros, regra Carteira
              própria 30%) em todas as cotações do banco. Use uma única vez após
              implantar a correção. Os detalhes das comissões corrigidas vão para
              o console do navegador (F12).
            </p>
            <Button
              onClick={recalcularComissoes}
              disabled={recalculando}
              className="gap-2 bg-warning hover:bg-warning text-white"
            >
              {recalculando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Recalculando...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" /> Recalcular comissões existentes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="border-accent/30 bg-accent/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-accent">
              <FileSearch className="h-4 w-4" />
              Auditoria: preços de milhas desatualizados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Lista todos os orçamentos ativos (não emitidos/cancelados/recusados)
              cujo preço/mil snapshotado está diferente do valor atual da tabela
              de milhas. Apenas relatório — não altera registros. Detalhes vão
              para o console do navegador (F12).
            </p>
            <Button
              onClick={auditarPrecosDesatualizados}
              disabled={auditandoPrecos}
              className="gap-2 bg-accent hover:bg-accent text-white"
            >
              {auditandoPrecos ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Auditando...
                </>
              ) : (
                <>
                  <FileSearch className="h-4 w-4" /> Relatório de preços desatualizados
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="border-success/30 bg-success/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-success">
              <Wand2 className="h-4 w-4" />
              Normalizar snapshot do Nipon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reescreve <code className="text-xs bg-muted px-1 rounded">pricing.nipon_value</code>{" "}
              de todas as cotações para o valor derivado (custo × 1,10, exceto
              Azul). Os cálculos de comissão e margem já usam essa derivação
              dinâmica — esta ação alinha o snapshot armazenado para que
              relatórios externos leiam o mesmo valor.
            </p>
            <Button
              onClick={normalizarNiponValues}
              disabled={normalizando}
              className="gap-2 bg-success hover:bg-success text-white"
            >
              {normalizando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Normalizando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> Normalizar valores Nipon
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="border-danger/30 bg-danger/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-danger">
              <AlertTriangle className="h-4 w-4" />
              Manutenção avançada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use apenas se desconfiar de orçamentos duplicados no banco. A
              ferramenta procura quote_numbers repetidos e mantém somente o
              registro mais antigo de cada série.
            </p>
            <Button
              variant="destructive"
              onClick={limparDuplicatas}
              disabled={cleaning}
              className="gap-2"
            >
              {cleaning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Limpar orçamentos duplicados
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
