import { supabase } from "./client";

// Factory CRUD genérica da camada de dados. Diferente do antigo localClient,
// SEMPRE lança erro em caso de falha — o tratamento é central (react-query).
// Exceção semântica: get() retorna null para "não encontrado" (PGRST116),
// que não é falha.
export function createStore(tableName, dateField = "created_date") {
  return {
    list: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order(dateField, { ascending: false });
      if (error) throw error;
      return data || [];
    },

    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null; // not found
        throw error;
      }
      return data;
    },

    create: async (record) => {
      // Deixa o Supabase gerar UUID via default — não passamos id do client.
      const { id: _ignored, ...rest } = record || {};
      const { data, error } = await supabase
        .from(tableName)
        .insert([rest])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    update: async (id, updates) => {
      const payload = { ...updates };
      // JSONB: garante que undefineds não vão na request (ex.: change_log).
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k];
      }
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    remove: async (id) => {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
      return { success: true };
    },

    filter: async (query) => {
      let q = supabase.from(tableName).select("*");
      for (const [key, value] of Object.entries(query || {})) {
        q = q.eq(key, value);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },

    // Listagem paginada server-side com seleção explícita de colunas.
    // Retorna { rows, total } — `total` vem de count:'exact' (independe da
    // página), permitindo paginação real sem trazer a tabela inteira.
    //
    // ATENÇÃO: só use em telas que NÃO agregam o conjunto completo no client.
    // As listas atuais (orçamentos/clientes) calculam somatórios/contagens
    // sobre todas as linhas — paginá-las exigiria mover a agregação para o
    // banco (RPC/count). Ver REFACTOR_NOTES (Etapa 4).
    listPaged: async ({
      page = 0,
      pageSize = 20,
      columns = "*",
      ascending = false,
      filters = {},
    } = {}) => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let q = supabase
        .from(tableName)
        .select(columns, { count: "exact" })
        .order(dateField, { ascending })
        .range(from, to);
      for (const [key, value] of Object.entries(filters)) {
        q = q.eq(key, value);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data || [], total: count ?? 0 };
    },
  };
}
