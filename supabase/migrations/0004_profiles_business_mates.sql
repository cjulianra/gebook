-- Los miembros de un mismo negocio deben poder ver el nombre de sus
-- compañeros (ej. mostrar el empleado asignado a una reserva en la agenda).
-- La política anterior solo permitía ver el propio perfil.
create policy "profiles_select_business_mate" on public.profiles for select
  using (
    exists (
      select 1
      from public.business_members bm1
      join public.business_members bm2 on bm1.business_id = bm2.business_id
      where bm1.user_id = auth.uid()
        and bm2.user_id = public.profiles.id
    )
  );
