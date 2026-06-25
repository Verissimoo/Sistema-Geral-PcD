-- ════════════════════════════════════════════════════════════════════════
-- Storage: bucket de fotos de hotéis das campanhas
--
-- Espelha o padrão dos buckets existentes (pcd-emission-files, pcd-partner-logos):
-- bucket PÚBLICO + policies em storage.objects para o role `public`, escopadas
-- por bucket_id (SELECT/INSERT/UPDATE/DELETE). Ou seja, o UPLOAD funciona via
-- anon key — NÃO é necessário service_role nem Edge Function no modelo atual.
--
-- Path sugerido dentro do bucket: {campaign_id}/{hotel_id}/{filename}
--   (o nome do bucket não faz parte do object name; a URL pública fica
--    /storage/v1/object/public/campaign-hotels/{campaign_id}/{hotel_id}/{filename})
-- ════════════════════════════════════════════════════════════════════════

-- ── Bucket público ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('campaign-hotels', 'campaign-hotels', true)
on conflict (id) do nothing;

-- ── Policies em storage.objects (role public, escopadas por bucket) ─────
create policy "Permitir leitura publica em campaign-hotels"
  on storage.objects for select to public
  using (bucket_id = 'campaign-hotels');

create policy "Permitir upload publico em campaign-hotels"
  on storage.objects for insert to public
  with check (bucket_id = 'campaign-hotels');

create policy "Permitir update publico em campaign-hotels"
  on storage.objects for update to public
  using (bucket_id = 'campaign-hotels');

create policy "Permitir delete publico em campaign-hotels"
  on storage.objects for delete to public
  using (bucket_id = 'campaign-hotels');

-- NOTA: igual aos buckets atuais, NÃO há restrição por path/role — é tudo
-- público por bucket. Quando migrarmos pra Supabase Auth, trocar as policies
-- de INSERT/UPDATE/DELETE para exigir role 'gerente' (mantendo SELECT público,
-- pois as URLs entram direto no orçamento/PDF do cliente).
