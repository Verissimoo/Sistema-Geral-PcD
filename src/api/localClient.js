import { supabase } from '@/lib/supabase';

// Factory genérica: cria CRUD assíncrono apontando para qualquer tabela do Supabase.
// Padrão idêntico ao usersStore que já estava em produção.
const supabaseStore = (tableName, dateField = 'created_date') => ({
  list: async () => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(dateField, { ascending: false });
    if (error) {
      console.error(`Erro ao listar ${tableName}:`, error);
      return [];
    }
    return data || [];
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code !== 'PGRST116') console.error(`Erro ao buscar ${tableName}:`, error);
      return null;
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
    if (error) {
      console.error(`Erro ao criar em ${tableName}:`, error);
      return null;
    }
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error(`Erro ao atualizar ${tableName}:`, error);
      return null;
    }
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
      console.error(`Erro ao deletar ${tableName}:`, error);
      return null;
    }
    return { success: true };
  },
});

export const localClient = {
  entities: {
    Users: supabaseStore('pcd_users'),
    Clients: supabaseStore('pcd_clients'),
    Quotes: supabaseStore('pcd_quotes'),
    MilesTable: supabaseStore('pcd_miles_table', 'updated_date'),
    CommercialGoals: supabaseStore('pcd_commercial_goals'),
    Rituals: supabaseStore('pcd_rituals'),
    Contractors: supabaseStore('pcd_contractors'),
    Projects: supabaseStore('pcd_projects'),
    Partners: supabaseStore('pcd_partners'),
  },
};

// ─── Seeds ──────────────────────────────────────────────────────────
// Inserem dados iniciais no Supabase apenas quando a tabela está vazia.

export async function seedAdminUser() {
  // Limpeza preventiva: remove qualquer pcd_users legado do localStorage.
  try {
    localStorage.removeItem('pcd_users');
  } catch {
    /* ignore */
  }

  const { data: existing } = await supabase
    .from('pcd_users')
    .select('id')
    .eq('username', 'admin')
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from('pcd_users').insert([
    {
      username: 'admin',
      password: 'Vento123',
      name: 'Administrador',
      role: 'admin',
      status: 'Ativo',
    },
  ]);
  if (error) console.error('Erro ao seedar admin:', error);
}

export async function seedMilesIfEmpty() {
  const { data: existing, error: readError } = await supabase
    .from('pcd_miles_table')
    .select('id')
    .limit(1);
  if (readError) {
    console.error('Erro ao verificar pcd_miles_table:', readError);
    return;
  }
  if (existing && existing.length > 0) return;

  const miles = [
    {
      program: 'LATAM',
      cost_per_thousand: 25,
      sale_per_thousand: 28.5,
      has_variable_pricing: true,
      stock_status: 'own',
      variable_tiers: [
        { min_miles: 100000, max_miles: null, label: '100K+ por pax', cost: 25.25 },
        { min_miles: 75000, max_miles: 99999, label: '75-99K por pax', cost: 25.75 },
        { min_miles: 50000, max_miles: 74999, label: '50-74K por pax', cost: 26.25 },
        { min_miles: 25000, max_miles: 49999, label: '25-49K por pax', cost: 27.0 },
        { min_miles: 18000, max_miles: 24999, label: '18-24K por pax', cost: 29.0 },
        { min_miles: 0, max_miles: 17999, label: 'Até 17K por pax', cost: 30.0 },
      ],
    },
    { program: 'Voe Azul', cost_per_thousand: 15, sale_per_thousand: 20, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'Smiles (GOL)', cost_per_thousand: 15, sale_per_thousand: 20, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'Avios', cost_per_thousand: 58, sale_per_thousand: 70, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'TAP', cost_per_thousand: 44, sale_per_thousand: 50, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'American Airlines', cost_per_thousand: 66, sale_per_thousand: 80, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'Livelo', cost_per_thousand: 33, sale_per_thousand: 40, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'Air Canada', cost_per_thousand: 65, sale_per_thousand: 80, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'Flying Blue', cost_per_thousand: 91, sale_per_thousand: 115, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'LifeMiles (Avianca)', cost_per_thousand: 70, sale_per_thousand: 80, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'Copa', cost_per_thousand: 60, sale_per_thousand: 72, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
    { program: 'Azul Pelo Mundo', cost_per_thousand: 12, sale_per_thousand: 18, has_variable_pricing: false, variable_tiers: [], stock_status: 'supplier' },
  ];

  const { error } = await supabase.from('pcd_miles_table').insert(miles);
  if (error) console.error('Erro ao seedar pcd_miles_table:', error);
}

export async function seedCommercialGoals() {
  const { data: existing, error: readError } = await supabase
    .from('pcd_commercial_goals')
    .select('id, month')
    .limit(50);
  if (readError) {
    console.error('Erro ao verificar pcd_commercial_goals:', readError);
    return;
  }
  if (existing && existing.length > 0) return;

  const goals = [
    {
      month: '2026-05',
      month_label: 'Maio',
      monthly_target: 30000,
      weekly_target: 7500,
      ticket_2500_sales: 12,
      ticket_3000_sales: 10,
      objective: 'Validar o sistema e iniciar operação com a equipe.',
      advance_condition: 'R$ 30k com margem >=15%',
      advance_next_step: 'Junho mira R$ 60k.',
      status: 'Ativa',
    },
    {
      month: '2026-06',
      month_label: 'Junho',
      monthly_target: 60000,
      weekly_target: 15000,
      ticket_2500_sales: 24,
      ticket_3000_sales: 20,
      objective: 'Provar rotina, treinar primeira leva e medir conversão real.',
      advance_condition: 'R$ 60k com margem >=15%',
      advance_next_step: 'Julho mira R$ 90k.',
      status: 'Futura',
    },
    {
      month: '2026-07',
      month_label: 'Julho',
      monthly_target: 90000,
      weekly_target: 22500,
      ticket_2500_sales: 36,
      ticket_3000_sales: 30,
      objective: 'Começar escala com vendedores aprovados e canais mais ativos.',
      advance_condition: 'R$ 90k com margem >=15% e leads em alta',
      advance_next_step: 'Agosto mira R$ 130k.',
      status: 'Futura',
    },
    {
      month: '2026-08',
      month_label: 'Agosto',
      monthly_target: 130000,
      weekly_target: 32500,
      ticket_2500_sales: 52,
      ticket_3000_sales: 43,
      objective: 'Aumentar leads, proteger margem e consolidar vendedores de 60 dias.',
      advance_condition: 'R$ 130k com margem >=15% e ticket subindo',
      advance_next_step: 'Setembro mira R$ 170k.',
      status: 'Futura',
    },
    {
      month: '2026-09',
      month_label: 'Setembro',
      monthly_target: 170000,
      weekly_target: 42500,
      ticket_2500_sales: 68,
      ticket_3000_sales: 57,
      objective: 'Pré-teste de outubro. A operação precisa mostrar previsibilidade.',
      advance_condition: 'R$ 170k com margem >=15%',
      advance_next_step: 'Outubro mira R$ 200k oficial e R$ 220k de gestão.',
      status: 'Futura',
    },
    {
      month: '2026-10',
      month_label: 'Outubro',
      monthly_target: 220000,
      official_target: 200000,
      weekly_target: 55000,
      ticket_2500_sales: 88,
      ticket_3000_sales: 73,
      objective: 'Bater meta oficial e buscar stretch se os gatilhos estiverem saudáveis.',
      advance_condition: 'R$ 200k+ com ticket >= R$ 2.500, margem >=15%',
      advance_next_step: 'Consolidar operação e definir metas 2027.',
      status: 'Futura',
    },
  ];

  const { error } = await supabase.from('pcd_commercial_goals').insert(goals);
  if (error) console.error('Erro ao seedar pcd_commercial_goals:', error);
}
