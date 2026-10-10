-- El cálculo de disponibilidad (computeFreeSlots) necesita resolver el
-- business_id de un business_member_id para leer el horario general del
-- negocio, pero un visitante anónimo de la página pública no tiene permiso
-- para leer business_members directamente. Esta vista expone solo lo
-- mínimo necesario (id + business_id, de negocios activos), siguiendo el
-- mismo patrón que public_employees / public_busy_slots (0007).
create view public.public_member_business
with (security_invoker = false) as
select bm.id as business_member_id, bm.business_id
from public.business_members bm
join public.businesses b on b.id = bm.business_id
where b.is_active = true;

grant select on public.public_member_business to anon, authenticated;
