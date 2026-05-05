import { supabase } from '@/lib/supabase';

const store = (key) => ({
  list: () => {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return data;
  },
  get: (id) => {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return data.find((item) => item.id === id) || null;
  },
  create: (item) => {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    const newItem = { id: crypto.randomUUID(), ...item };
    data.push(newItem);
    localStorage.setItem(key, JSON.stringify(data));
    return newItem;
  },
  update: (id, updates) => {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    const index = data.findIndex((item) => item.id === id);
    if (index === -1) return null;
    data[index] = { ...data[index], ...updates };
    localStorage.setItem(key, JSON.stringify(data));
    return data[index];
  },
  delete: (id) => {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = data.filter((item) => item.id !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
    return { success: true };
  },
});

// Users: persistido no Supabase (tabela pcd_users) — assim usuários
// criados num PC funcionam em qualquer outro navegador/máquina.
const usersStore = {
  list: async () => {
    const { data, error } = await supabase
      .from('pcd_users')
      .select('*')
      .order('created_date', { ascending: false });
    if (error) {
      console.error('Erro ao listar usuários:', error);
      return [];
    }
    return data || [];
  },
  get: async (id) => {
    const { data, error } = await supabase
      .from('pcd_users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code !== 'PGRST116') console.error('Erro ao buscar usuário:', error);
      return null;
    }
    return data;
  },
  create: async (record) => {
    // O id é gerado pelo Supabase (default gen_random_uuid()).
    const { id: _ignored, ...rest } = record || {};
    const payload = {
      ...rest,
      created_date: rest.created_date || new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('pcd_users')
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error('Erro ao criar usuário:', error);
      return null;
    }
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('pcd_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      return null;
    }
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('pcd_users').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar usuário:', error);
      return null;
    }
    return { success: true };
  },
};

export const localClient = {
  entities: {
    MilesTable: store('pcd_miles_table'),
    Sellers: store('pcd_sellers'),
    Clients: store('pcd_clients'),
    Quotes: store('pcd_quotes'),
    Users: usersStore,
    CommercialGoals: store('pcd_commercial_goals'),
  },
};

export function seedCommercialGoals() {
  const existing = JSON.parse(localStorage.getItem('pcd_commercial_goals') || '[]');
  // Só re-seeda quando NÃO existe a meta de Maio (versão correta da escada).
  // Se já tem Maio + pelo menos 6 meses, considera dados válidos e não mexe.
  const hasMay = existing.some((g) => g.month === '2026-05');
  if (hasMay && existing.length >= 6) return;

  const goals = [
    {
      id: 'goal-2026-05',
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
      actual_revenue: 0,
      created_date: new Date().toISOString(),
    },
    {
      id: 'goal-2026-06',
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
      actual_revenue: 0,
      created_date: new Date().toISOString(),
    },
    {
      id: 'goal-2026-07',
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
      actual_revenue: 0,
      created_date: new Date().toISOString(),
    },
    {
      id: 'goal-2026-08',
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
      actual_revenue: 0,
      created_date: new Date().toISOString(),
    },
    {
      id: 'goal-2026-09',
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
      actual_revenue: 0,
      created_date: new Date().toISOString(),
    },
    {
      id: 'goal-2026-10',
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
      actual_revenue: 0,
      created_date: new Date().toISOString(),
    },
  ];

  localStorage.setItem('pcd_commercial_goals', JSON.stringify(goals));
}

// Stub mantido apenas por compatibilidade com imports existentes.
// O usuário admin agora vive no Supabase (tabela pcd_users) — não há
// nada para "seedar" localmente. Limpamos qualquer resíduo do seed antigo.
export function seedAdminUser() {
  try {
    const legacy = JSON.parse(localStorage.getItem('pcd_users') || '[]');
    if (Array.isArray(legacy) && legacy.length > 0) {
      localStorage.removeItem('pcd_users');
    }
  } catch {
    localStorage.removeItem('pcd_users');
  }
}

export function seedMilesIfEmpty() {
  const existing = JSON.parse(localStorage.getItem('pcd_miles_table') || '[]');
  // Se já tem dados no formato novo (com cost_per_thousand), não faz nada
  if (existing.length > 0 && existing[0].cost_per_thousand !== undefined) return;

  const initial = [
    {
      id: crypto.randomUUID(),
      program: 'LATAM',
      cost_per_thousand: 25,
      sale_per_thousand: 28.5,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: true,
      variable_tiers: [
        { min_miles: 100000, max_miles: null, label: '100K+ por pax', cost: 25.25 },
        { min_miles: 75000, max_miles: 99999, label: '75-99K por pax', cost: 25.75 },
        { min_miles: 50000, max_miles: 74999, label: '50-74K por pax', cost: 26.25 },
        { min_miles: 25000, max_miles: 49999, label: '25-49K por pax', cost: 27.0 },
        { min_miles: 18000, max_miles: 24999, label: '18-24K por pax', cost: 29.0 },
        { min_miles: 0, max_miles: 17999, label: 'Até 17K por pax', cost: 30.0 },
      ],
    },
    {
      id: crypto.randomUUID(),
      program: 'Voe Azul',
      cost_per_thousand: 15,
      sale_per_thousand: 20,
      updated_date: '2026-01-12T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'Smiles (GOL)',
      cost_per_thousand: 15,
      sale_per_thousand: 20,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'Avios',
      cost_per_thousand: 58,
      sale_per_thousand: 70,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'TAP',
      cost_per_thousand: 44,
      sale_per_thousand: 50,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'American Airlines',
      cost_per_thousand: 66,
      sale_per_thousand: 80,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'Livelo',
      cost_per_thousand: 33,
      sale_per_thousand: 40,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'Air Canada',
      cost_per_thousand: 65,
      sale_per_thousand: 80,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'Flying Blue',
      cost_per_thousand: 91,
      sale_per_thousand: 115,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'LifeMiles (Avianca)',
      cost_per_thousand: 70,
      sale_per_thousand: 80,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'Copa',
      cost_per_thousand: 60,
      sale_per_thousand: 72,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
    {
      id: crypto.randomUUID(),
      program: 'Azul Pelo Mundo',
      cost_per_thousand: 12,
      sale_per_thousand: 18,
      updated_date: '2025-10-28T00:00:00.000Z',
      has_variable_pricing: false,
      variable_tiers: [],
    },
  ];

  localStorage.setItem('pcd_miles_table', JSON.stringify(initial));
}
