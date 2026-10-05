alter table employee_details
  add column if not exists can_create_bookings boolean not null default true;

-- Reemplaza la política de inserción de reservas: antes cualquier miembro
-- podía crear reservas para cualquier empleado. Ahora, si el negocio lo
-- configuró así, un empleado solo puede crear SU PROPIA reserva, y solo si
-- tiene el permiso can_create_bookings activo. Owner/admin siempre pueden.
drop policy if exists "bookings_write_admin" on public.bookings;

create policy "bookings_insert_scoped" on public.bookings for insert
  with check (
    public.is_business_member(business_id, array['owner','admin']::public.member_role[])
    or (
      public.is_business_member(business_id, array['employee']::public.member_role[])
      and business_member_id in (
        select bm.id from public.business_members bm
        join public.employee_details ed on ed.business_member_id = bm.id
        where bm.business_id = business_id
          and bm.user_id = auth.uid()
          and ed.can_create_bookings = true
      )
    )
  );
