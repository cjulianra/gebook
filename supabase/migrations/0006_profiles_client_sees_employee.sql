-- Un cliente debe poder ver el nombre del empleado que lo atendió/atenderá
-- en sus propias reservas (la política anterior solo cubre compañeros de
-- un mismo negocio, y un cliente no es business_member).
create policy "profiles_select_by_client_booking" on public.profiles for select
  using (
    exists (
      select 1 from public.bookings b
      join public.clients c on c.id = b.client_id
      join public.business_members bm on bm.id = b.business_member_id
      where c.user_id = auth.uid() and bm.user_id = public.profiles.id
    )
  );
