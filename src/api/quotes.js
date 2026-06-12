import { supabase } from "./client";
import { createStore } from "./store";

const store = createStore("pcd_quotes");

// Quotes precisa de idempotência: o front pode disparar múltiplas chamadas em
// paralelo (clique duplo em "Gerar orçamento") e quote_number tem UNIQUE
// constraint. Se já existe registro com o mesmo quote_number, devolve o
// existente como sucesso.
async function createQuote(record) {
  const { id: _ignored, quote_number, ...rest } = record || {};

  if (quote_number) {
    const { data: existing } = await supabase
      .from("pcd_quotes")
      .select("*")
      .eq("quote_number", quote_number)
      .maybeSingle();
    if (existing) {
      console.warn(
        `[createQuote] ${quote_number} já existe — retornando registro existente em vez de duplicar.`
      );
      return existing;
    }
  }

  const payload = quote_number ? { ...rest, quote_number } : { ...rest };
  const { data, error } = await supabase
    .from("pcd_quotes")
    .insert([payload])
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation. Corrida real: dois inserts simultâneos.
    if (error.code === "23505" && quote_number) {
      const { data: existing } = await supabase
        .from("pcd_quotes")
        .select("*")
        .eq("quote_number", quote_number)
        .maybeSingle();
      if (existing) {
        console.warn(
          `[createQuote] corrida detectada em ${quote_number} — retornando registro vencedor.`
        );
        return existing;
      }
    }
    throw error;
  }
  return data;
}

export const listQuotes = store.list;
export const getQuote = store.get;
export { createQuote };
export const updateQuote = store.update;
export const deleteQuote = store.remove;
