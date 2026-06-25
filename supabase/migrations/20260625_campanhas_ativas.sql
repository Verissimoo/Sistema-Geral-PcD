-- ════════════════════════════════════════════════════════════════════════
-- Feature: Campanhas Ativas
-- Tabelas: pcd_campaigns, pcd_campaign_destinations, pcd_campaign_hotels
--
-- Padrão do banco atual (conferido em pg_class/pg_policies):
--   • RLS DESABILITADO nas tabelas pcd_ (acesso via anon key, sem Supabase Auth).
--   • anon / authenticated / service_role já recebem CRUD por default privileges.
-- Mantemos esse padrão por ora; abaixo deixamos comentado onde entrará a
-- restrição por role 'gerente' quando migrarmos para Supabase Auth.
-- ════════════════════════════════════════════════════════════════════════

-- ── updated_at automático ───────────────────────────────────────────────
-- Não havia convenção de updated_at no banco; criamos uma função reutilizável.
create or replace function public.pcd_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 1) Campanhas ────────────────────────────────────────────────────────
create table if not exists public.pcd_campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                              -- ex "Pacotes Nordeste - Verão"
  description text,
  status      text not null default 'ativa'
              check (status in ('ativa', 'pausada', 'encerrada')),
  starts_at   date,                                       -- janela opcional da campanha
  ends_at     date,
  created_by  uuid,                                       -- id do gerente (pcd_users.id); FK omitida por ora
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_pcd_campaigns_updated_at
  before update on public.pcd_campaigns
  for each row execute function public.pcd_set_updated_at();

create index if not exists idx_pcd_campaigns_status on public.pcd_campaigns (status);

-- ── 2) Destinos da campanha ─────────────────────────────────────────────
create table if not exists public.pcd_campaign_destinations (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.pcd_campaigns (id) on delete cascade,
  name        text not null,                              -- ex "Fortaleza", "Porto Seguro"
  sort_order  int default 0
);

create index if not exists idx_pcd_campaign_destinations_campaign
  on public.pcd_campaign_destinations (campaign_id);

-- ── 3) Hotéis do destino ────────────────────────────────────────────────
create table if not exists public.pcd_campaign_hotels (
  id             uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.pcd_campaign_destinations (id) on delete cascade,
  name           text not null,
  location       text,
  description    text,
  photos         jsonb not null default '[]'::jsonb,  -- [{ url, path }] apontando pro Storage
  rooms          jsonb not null default '[]'::jsonb,  -- [{ id, name, price_from, photo_url, photo_path }] preços ILUSTRATIVOS
  additionals    jsonb not null default '[]'::jsonb,  -- [{ name, price_from }]
  hotel_commission_suggested numeric,                 -- comissão sugerida (editável no orçamento)
  sort_order     int default 0,
  created_at     timestamptz not null default now()
);

create index if not exists idx_pcd_campaign_hotels_destination
  on public.pcd_campaign_hotels (destination_id);

-- ── Grants (espelha o padrão das demais pcd_) ───────────────────────────
-- Em geral as default privileges do Supabase já concedem isso a tabelas novas
-- no schema public; explicitamos para a migration ficar autocontida.
grant select, insert, update, delete
  on public.pcd_campaigns,
     public.pcd_campaign_destinations,
     public.pcd_campaign_hotels
  to anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════
-- RLS — DESABILITADO por ora (igual às demais pcd_). NÃO habilitar agora.
--
-- Quando migrarmos para Supabase Auth com claim de role, habilitar e restringir
-- a ESCRITA ao gerente, mantendo LEITURA pública (campanhas aparecem no
-- gerador de orçamento de qualquer vendedor). Esboço:
--
--   alter table public.pcd_campaigns            enable row level security;
--   alter table public.pcd_campaign_destinations enable row level security;
--   alter table public.pcd_campaign_hotels       enable row level security;
--
--   -- leitura pública (todas as tabelas)
--   create policy "campanhas: leitura" on public.pcd_campaigns
--     for select using (true);
--
--   -- escrita só gerente (repetir nas 3 tabelas)
--   create policy "campanhas: escrita gerente" on public.pcd_campaigns
--     for all
--     using      (auth.jwt() ->> 'role' = 'gerente')
--     with check (auth.jwt() ->> 'role' = 'gerente');
-- ════════════════════════════════════════════════════════════════════════
