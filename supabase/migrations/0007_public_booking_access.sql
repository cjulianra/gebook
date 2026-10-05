-- ============================================================================
-- Acceso público controlado para la página de reserva de cada negocio
-- (/b/[slug]). RLS es por fila, no por columna — así que lo que no es
-- sensible (negocio, servicios, horarios) se expone con policies directas,
-- y lo que sí lo es (email de empleados, identidad de otros clientes) se
-- expone solo a través de vistas que seleccionan columnas específicas y
-- corren con los privilegios del dueño de la vista (no de quien consulta),
-- por lo tanto nunca evalúan RLS de profiles/bookings para el visitante.
-- ============================================================================

-- Negocios activos: visibles públicamente (es la ficha del negocio)
create policy "businesses_select_public" on public.businesses for select
  using (is_active = true);

-- Servicios activos de un negocio activo: es el catálogo/menú público
create policy "services_select_public" on public.services for select
  using (is_active = true);

-- Qué empleados realizan qué servicio: necesario para filtrar el picker
create policy "employee_services_select_public" on public.employee_services for select
  using (exists (
    select 1 from public.services s
    where s.id = service_id and s.is_active = true
  ));

-- Horarios de trabajo: nada sensible, necesarios para calcular disponibilidad
create policy "work_schedules_select_public" on public.work_schedules for select
  using (exists (
    select 1 from public.business_members bm
    join public.businesses b on b.id = bm.business_id
    where bm.id = work_schedules.business_member_id and b.is_active and bm.status = 'active'
  ));

-- Directorio público de empleados: solo nombre, especialidad y foto —
-- nunca email/teléfono. Vista "security invoker = false" (comportamiento
-- por defecto): corre con los privilegios de quien la crea, de modo que
-- ignora la RLS de profiles para quien la consulta.
create view public.public_employees
with (security_invoker = false) as
select
  bm.id as business_member_id,
  bm.business_id,
  p.full_name,
  ed.specialty,
  ed.photo_url
from public.business_members bm
join public.profiles p on p.id = bm.user_id
left join public.employee_details ed on ed.business_member_id = bm.id
join public.businesses b on b.id = bm.business_id
where bm.role = 'employee' and bm.status = 'active' and b.is_active = true;

grant select on public.public_employees to anon, authenticated;

-- Franjas ocupadas: solo horario, nunca el cliente ni el servicio — así
-- un visitante puede ver qué horas están libres sin ver la agenda interna.
create view public.public_busy_slots
with (security_invoker = false) as
select business_member_id, start_at, end_at
from public.bookings
where status in ('pending', 'confirmed', 'in_progress');

grant select on public.public_busy_slots to anon, authenticated;
