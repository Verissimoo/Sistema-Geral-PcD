import { createStore } from "./store";

// Tabelas do módulo de contratos/projetos NÃO usam o prefixo pcd_ e ordenam
// por created_at (legado do antigo supabaseClient).
const store = createStore("contractors", "created_at");

export const listContractors = store.list;
export const getContractor = store.get;
export const createContractor = store.create;
export const updateContractor = store.update;
export const deleteContractor = store.remove;
export const filterContractors = store.filter;
