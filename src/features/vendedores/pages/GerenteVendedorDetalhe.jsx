import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useUsers, useQuotes, useClients } from "@/api/hooks";
import { useVendedorMetrics } from "@/features/vendedores/hooks/useVendedorMetrics";
import VendedorHeader from "@/features/vendedores/components/VendedorHeader";
import VendedorMetricCards from "@/features/vendedores/components/VendedorMetricCards";
import VendedorCarreiraFinanceiro from "@/features/vendedores/components/VendedorCarreiraFinanceiro";
import VendedorEvolucaoMensal from "@/features/vendedores/components/VendedorEvolucaoMensal";
import VendedorVendas from "@/features/vendedores/components/VendedorVendas";
import VendedorHistorico from "@/features/vendedores/components/VendedorHistorico";

export default function GerenteVendedorDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: allQuotes = [], isLoading: quotesLoading } = useQuotes();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const loading = usersLoading || quotesLoading || clientsLoading;

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const vendedor = useMemo(
    () => users.find((u) => u.id === id) || null,
    [users, id]
  );

  const quotes = useMemo(
    () => allQuotes.filter((q) => q.seller_id === id),
    [allQuotes, id]
  );

  const m = useVendedorMetrics({
    vendedor,
    quotes,
    clients,
    statusFilter,
    search,
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Carregando...
      </div>
    );
  }

  if (!vendedor) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-3" />
        <p className="font-semibold mb-2">Vendedor não encontrado</p>
        <p className="text-sm text-muted-foreground mb-4">
          O ID informado não corresponde a nenhum usuário ativo no sistema.
        </p>
        <Button variant="outline" onClick={() => navigate("/gerente/vendedores")}>
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const initials = vendedor.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const maxReceita = Math.max(...m.evolucaoMensal.map((mes) => mes.receita), 1);
  const aReceberMes = m.fixoMensal + m.comissaoMes;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/gerente/vendedores")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <VendedorHeader
          vendedor={vendedor}
          nivelAtual={m.nivelAtual}
          tempoAtivo={m.tempoAtivo}
          initials={initials}
        />
      </div>

      {/* ─── ROW 1: Métricas principais ─────────────────────────── */}
      <VendedorMetricCards
        quotes={quotes}
        cotacoesMes={m.cotacoesMes}
        vendidos={m.vendidos}
        pipeline={m.pipeline}
        receitaTotal={m.receitaTotal}
        receitaMes={m.receitaMes}
        taxaConversaoTotal={m.taxaConversaoTotal}
        ticketMedio={m.ticketMedio}
        clientesDoVendedor={m.clientesDoVendedor}
        followUpsPendentes={m.followUpsPendentes}
      />

      {/* ─── ROW 2: Carreira + Financeiro ───────────────────────── */}
      <VendedorCarreiraFinanceiro
        vendedor={vendedor}
        idxAtual={m.idxAtual}
        nivelAtual={m.nivelAtual}
        metaNivel={m.metaNivel}
        fixoMensal={m.fixoMensal}
        pctMeta={m.pctMeta}
        proximoNivel={m.proximoNivel}
        receitaMes={m.receitaMes}
        aReceberMes={aReceberMes}
        comissaoMes={m.comissaoMes}
        vendidosMes={m.vendidosMes}
        lucroMes={m.lucroMes}
        comissaoTotal={m.comissaoTotal}
      />

      {/* ─── ROW 3: Evolução mensal ─────────────────────────────── */}
      <VendedorEvolucaoMensal evolucaoMensal={m.evolucaoMensal} maxReceita={maxReceita} />

      {/* ─── ROW 4: Vendas realizadas + Top clientes ────────────── */}
      <VendedorVendas
        vendidos={m.vendidos}
        topClientes={m.topClientes}
        navigate={navigate}
      />

      {/* ─── ROW 5: Histórico completo ──────────────────────────── */}
      <VendedorHistorico
        historicoFiltrado={m.historicoFiltrado}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        navigate={navigate}
      />
    </div>
  );
}
