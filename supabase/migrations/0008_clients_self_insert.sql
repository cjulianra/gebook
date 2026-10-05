-- Un cliente autenticado puede crear su propia fila de `clients` en un
-- negocio (primera vez que reserva ahí) — pero solo con su propio user_id,
-- nunca en nombre de otro.
create policy "clients_insert_self" on public.clients for insert
  with check (user_id = auth.uid());
