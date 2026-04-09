import { supabase } from '@/lib/supabase';

const createSupabaseStore = (tableName) => ({
  list: async () => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
    return data || null;
  },

  create: async (data) => {
    const { data: created, error } = await supabase
      .from(tableName)
      .insert([{ ...data }])
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  update: async (id, data) => {
    const updatePayload = { ...data };
    
    // Tratamento explícito para JSONB (ex: change_log em Projetos)
    // O SDK do Supabase serializa objetos e arrays Javascript no JSONB automaticamente,
    // mas garantimos que não sofra com undefineds na request.
    if (updatePayload.change_log === undefined) {
      delete updatePayload.change_log;
    }

    const { data: updated, error } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },

  filter: async (query) => {
    let q = supabase.from(tableName).select('*');
    for (const [key, value] of Object.entries(query)) {
      q = q.eq(key, value);
    }
    const { data, error } = await q;

    if (error) throw error;
    return data;
  }
});

export const supabaseClient = {
  entities: {
    Contractor: createSupabaseStore('contractors'),
    Project: createSupabaseStore('projects'),
    Ritual: createSupabaseStore('rituals'),
  }
};
