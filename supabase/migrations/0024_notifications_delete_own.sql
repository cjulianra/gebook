-- Un miembro puede borrar sus propias notificaciones — se usa al hacer clic
-- en una desde la campanita, para que no se vayan acumulando en la lista.
create policy notifications_delete_own on notifications
  for delete
  using (
    business_member_id in (
      select id from business_members where user_id = auth.uid()
    )
  );
