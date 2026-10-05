-- Bucket público para logos de negocio. Cada archivo vive en
-- `${business_id}/...`, así que la política solo deja escribir dentro de la
-- carpeta del propio negocio (y solo a su owner/admin).
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos_public_read" on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos_admin_write" on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and public.is_business_member((storage.foldername(name))[1]::uuid, array['owner','admin']::public.member_role[])
  );

create policy "logos_admin_update" on storage.objects for update
  using (
    bucket_id = 'logos'
    and public.is_business_member((storage.foldername(name))[1]::uuid, array['owner','admin']::public.member_role[])
  );

create policy "logos_admin_delete" on storage.objects for delete
  using (
    bucket_id = 'logos'
    and public.is_business_member((storage.foldername(name))[1]::uuid, array['owner','admin']::public.member_role[])
  );
