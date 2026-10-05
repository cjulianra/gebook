-- Un empleado solo debe ver y actualizar SUS PROPIAS reservas, nunca las de
-- sus compañeros. El owner/admin sigue viendo todas. La política anterior
-- (bookings_select_member / bookings_update_member) dejaba a cualquier
-- miembro activo ver/editar todas las reservas del negocio sin importar su rol.

drop policy "bookings_select_member" on public.bookings;
drop policy "bookings_update_member" on public.bookings;

create policy "bookings_select_scoped" on public.bookings for select
  using (
    public.is_business_member(business_id, array['owner','admin']::public.member_role[])
    or exists (
      select 1 from public.business_members bm
      where bm.id = bookings.business_member_id
        and bm.user_id = auth.uid()
        and bm.status = 'active'
    )
  );

create policy "bookings_update_scoped" on public.bookings for update
  using (
    public.is_business_member(business_id, array['owner','admin']::public.member_role[])
    or exists (
      select 1 from public.business_members bm
      where bm.id = bookings.business_member_id
        and bm.user_id = auth.uid()
        and bm.status = 'active'
    )
  );

-- Un empleado debe poder ver su propio historial de pagos/comisiones
-- (antes solo owner/admin podían leer employee_payouts).
create policy "employee_payouts_select_self" on public.employee_payouts for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.id = employee_payouts.business_member_id and bm.user_id = auth.uid()
    )
  );
