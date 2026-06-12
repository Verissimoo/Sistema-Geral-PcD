// Tipos de origem de cliente — agora em cima do TanStack Query (antes era um
// cache manual em memória com listeners). A API externa permanece a mesma.
import { qk } from "@/api/queryKeys";
import { useClientOriginsQuery } from "@/api/hooks";
import { queryClientInstance } from "./query-client";
import { useAuth } from "./AuthContext";

export function invalidateClientOrigins() {
  return queryClientInstance.invalidateQueries({ queryKey: qk.clientOrigins.all });
}

export function useClientOrigins() {
  const { user } = useAuth();
  const { data: origins = [] } = useClientOriginsQuery();

  // Suporte / admin / gerente veem todos os escopos.
  // Demais perfis veem apenas escopo 'geral'.
  const role = user?.role;
  const seesAll = role === "suporte" || role === "admin" || role === "gerente";
  return seesAll ? origins : origins.filter((o) => (o.scope || "geral") === "geral");
}

// Hook auxiliar que sempre retorna todos os tipos (uso na tela de gestão)
export function useAllClientOrigins() {
  const { data: origins = [], refetch } = useClientOriginsQuery();
  return { origins, reload: refetch };
}
