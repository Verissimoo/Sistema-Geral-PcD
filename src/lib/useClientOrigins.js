import { useState, useEffect, useCallback } from "react";
import { localClient } from "@/api/localClient";
import { useAuth } from "./AuthContext";

// Mantém uma cache simples em memória + listeners para invalidar a lista
// quando algum lugar criar/editar/excluir um tipo.
let cache = null;
const listeners = new Set();

async function loadOrigins() {
  const all = (await localClient.entities.ClientOrigins.list()) || [];
  cache = all;
  listeners.forEach((fn) => fn(all));
  return all;
}

export function invalidateClientOrigins() {
  cache = null;
  return loadOrigins();
}

export function useClientOrigins() {
  const { user } = useAuth();
  const [origins, setOrigins] = useState(() => cache || []);

  useEffect(() => {
    const handler = (all) => setOrigins(all);
    listeners.add(handler);
    if (cache) {
      setOrigins(cache);
    } else {
      loadOrigins();
    }
    return () => { listeners.delete(handler); };
  }, []);

  // Suporte / admin / gerente veem todos os escopos.
  // Demais perfis veem apenas escopo 'geral'.
  const role = user?.role;
  const seesAll = role === "suporte" || role === "admin" || role === "gerente";
  return seesAll ? origins : origins.filter((o) => (o.scope || "geral") === "geral");
}

// Hook auxiliar que sempre retorna todos os tipos (uso na tela de gestão)
export function useAllClientOrigins() {
  const [origins, setOrigins] = useState(() => cache || []);
  const reload = useCallback(async () => {
    const all = await invalidateClientOrigins();
    setOrigins(all);
  }, []);
  useEffect(() => {
    const handler = (all) => setOrigins(all);
    listeners.add(handler);
    if (cache) {
      setOrigins(cache);
    } else {
      loadOrigins();
    }
    return () => { listeners.delete(handler); };
  }, []);
  return { origins, reload };
}
