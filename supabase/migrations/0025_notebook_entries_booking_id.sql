-- Permite "editar" en el Cuaderno una anotación que en realidad viene de una
-- reserva de la Agenda (no de un registro manual): en vez de mutar la
-- reserva real, se guarda una fila de corrección vinculada a esa reserva
-- (booking_id) que el Cuaderno usa para mostrar los datos editados en lugar
-- de los originales, sin duplicar el servicio como una anotación aparte.
alter table public.notebook_entries
  add column booking_id uuid references public.bookings (id) on delete cascade;

create unique index notebook_entries_booking_id_key on public.notebook_entries (booking_id) where booking_id is not null;
