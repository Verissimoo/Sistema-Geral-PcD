import { useEffect, useMemo } from "react";
import {
  useCommercialGoals, useQuotes, useUsers,
  useUpdateGoal,
} from "@/api/hooks";
import { filterCommercialQuotes } from "@/features/metas/commercialFilter";
import { getRevenueQuotes } from "@/features/metas/revenueHelper";
import { monthMatches, getIssuedDate } from "@/features/metas/lib/metasUtils";

// Centraliza dados e derivações da Escada de Crescimento (GerenteMetasComerciais).
// Mantém EXATAMENTE a lógica original: mês de calendário, status esperado,
// sync de status divergente no Supabase, e cálculos de receita por meta.
export function useCommercialGoalsData() {
  const { data: goals = [] } = useCommercialGoals();
  const { data: quotes = [] } = useQuotes();
  const { data: users = [] } = useUsers();
  const updateGoal = useUpdateGoal();

  // Mês real do calendário (independente do status "Ativa" das metas seedadas)
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Status derivado do calendário (não depende do flag "Ativa" persistido)
  const expectedStatus = (monthStr) => {
    if (!monthStr) return "Futura";
    if (monthStr === currentMonth) return "Ativa";
    if (monthStr < currentMonth) return "Concluída";
    return "Futura";
  };

  // Atualiza status no Supabase para refletir o calendário real — a
  // invalidation pós-mutation re-busca a lista já corrigida.
  useEffect(() => {
    const stale = goals.filter((g) => g.status !== expectedStatus(g.month));
    if (stale.length === 0) return;
    Promise.all(
      stale.map((g) =>
        updateGoal.mutateAsync({
          id: g.id,
          updates: { status: expectedStatus(g.month) },
        })
      )
    ).catch(() => {
      /* toast central já exibe o erro */
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionalmente estreitas (efeito de sync); incluir as faltantes mudaria comportamento
  }, [goals]);

  // Ordena cronologicamente (a lista da API vem por created_date)
  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => (a.month || "").localeCompare(b.month || "")),
    [goals]
  );

  const maxTarget = useMemo(
    () => Math.max(1, ...sortedGoals.map((g) => Number(g.monthly_target) || 0)),
    [sortedGoals]
  );

  // Apenas quotes de vendedor/gerente contam para metas comerciais.
  // Suporte, admin e parceiro NÃO entram — filtro feito por seller_id × role.
  const commercialQuotes = useMemo(
    () => filterCommercialQuotes(quotes, users),
    [quotes, users]
  );

  // Receita = só "Emitido", alocada pela data de emissão. Mesma definição usada
  // em Dashboard, VendedorHome e Detalhe do Vendedor (via revenueHelper).
  const revenueQuotes = useMemo(
    () => getRevenueQuotes(commercialQuotes),
    [commercialQuotes]
  );

  const goalRevenue = (g) =>
    revenueQuotes
      .filter((q) => monthMatches(getIssuedDate(q), g.month))
      .reduce((s, q) => s + (Number(q.total_value) || 0), 0);

  // Estado visual baseado no calendário real
  const getGoalVisualState = (goal) => {
    if (!goal.month) return "future";
    if (goal.month === currentMonth) return "current";
    if (goal.month < currentMonth) return "past";
    return "future";
  };

  // Meta do mês atual (calendário); fallback à primeira meta com status "Ativa"
  const currentMonthGoal = useMemo(
    () => sortedGoals.find((g) => g.month === currentMonth) || null,
    [sortedGoals, currentMonth]
  );

  const currentMonthLabel = useMemo(() => {
    if (currentMonthGoal?.month_label) return currentMonthGoal.month_label;
    const label = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [currentMonthGoal]);

  return {
    currentMonth,
    sortedGoals,
    maxTarget,
    revenueQuotes,
    goalRevenue,
    getGoalVisualState,
    currentMonthGoal,
    currentMonthLabel,
  };
}
