-- Bucket público para fotos de empleado. Puede subirla el propio empleado
-- (a su carpeta) o el owner/admin del negocio (a la carpeta de cualquiera
-- de sus empleados). Ruta: `${business_id}/${business_member_id}/...`.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_write" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (
      public.is_business_member((storage.foldername(name))[1]::uuid, array['owner','admin']::public.member_role[])
      or exists (
        select 1 from public.business_members bm
        where bm.id = (storage.foldername(name))[2]::uuid and bm.user_id = auth.uid()
      )
    )
  );

create policy "avatars_update" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (
      public.is_business_member((storage.foldername(name))[1]::uuid, array['owner','admin']::public.member_role[])
      or exists (
        select 1 from public.business_members bm
        where bm.id = (storage.foldername(name))[2]::uuid and bm.user_id = auth.uid()
      )
    )
  );

-- Un empleado puede actualizar SOLO su propia foto (nunca su comisión ni la
-- de otros) — se expone como función en vez de una policy de UPDATE directa
-- para no abrir el resto de columnas de employee_details a escritura propia.
create function public.update_own_employee_photo(p_photo_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.employee_details
  set photo_url = p_photo_url
  where business_member_id in (
    select id from public.business_members where user_id = auth.uid()
  );
end;
$$;

grant execute on function public.update_own_employee_photo(text) to authenticated;
