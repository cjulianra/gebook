"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { InstallNotificationsSettings } from "@/components/pwa/InstallNotificationsSettings";

interface DayBlock {
  id: string;
  business_member_id: string;
  block_date: string;
  reason: string | null;
}

const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${WEEKDAY_LABEL[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function MiPerfilClient(props: {
  businessId: string;
  memberId: string;
  fullName: string;
  specialty: string | null;
  photoUrl: string | null;
  commissionRate: number;
  dayBlocks: DayBlock[];
}) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({
  businessId,
  memberId,
  fullName,
  specialty,
  photoUrl,
  commissionRate,
  dayBlocks,
}: {
  businessId: string;
  memberId: string;
  fullName: string;
  specialty: string | null;
  photoUrl: string | null;
  commissionRate: number;
  dayBlocks: DayBlock[];
}) {
  const router = useRouter();
  const showToast = useToast();
  const [photo, setPhoto] = useState(photoUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Sube un archivo de imagen.", "danger");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("La imagen debe pesar menos de 2 MB.", "danger");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${businessId}/${memberId}/photo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      showToast("No pudimos subir la foto.", "danger");
      return;
    }

    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);

    // Se actualiza en los dos lugares donde vive la foto: el perfil global
    // (usado en el sidebar) y los datos de empleado (usado en agenda,
    // reportes y la página pública de reserva) — así queda igual en todo el sistema.
    await Promise.all([
      supabase.from("profiles").update({ avatar_url: publicUrl.publicUrl }).eq("id", user.id),
      // La función RPC no está en los tipos generados a mano; existe en la DB (migración 0013).
      (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>)("update_own_employee_photo", {
        p_photo_url: publicUrl.publicUrl,
      }),
    ]);

    setUploading(false);
    setPhoto(publicUrl.publicUrl);
    showToast("Foto actualizada.");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <PageHeader title="Mi perfil" description="Tu foto y tu horario de trabajo." />

      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <Avatar name={fullName} src={photo} size={72} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-[var(--color-ink-900)]">{fullName}</p>
              {specialty && <p className="truncate text-sm text-[var(--color-ink-500)]">{specialty}</p>}
              <div className="mt-1.5 flex items-center gap-2">
                <Badge tone="accent">{commissionRate}% comisión</Badge>
              </div>
            </div>
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Subiendo…" : photo ? "Cambiar foto" : "Subir foto"}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--color-ink-500)]">
            Esta foto se usa en tu perfil, en la agenda del negocio y en la página pública de reservas.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instalación y notificaciones</CardTitle>
        </CardHeader>
        <CardBody>
          <InstallNotificationsSettings memberId={memberId} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis días bloqueados</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-[var(--color-ink-500)]">
            El horario de atención lo define el negocio. Estos son los días en los que tu administrador te marcó como no disponible.
          </p>
          {dayBlocks.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-500)]">No tienes días bloqueados próximamente.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
              {dayBlocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="font-medium text-[var(--color-ink-900)]">{formatDate(b.block_date)}</span>
                  {b.reason && <span className="text-[var(--color-ink-500)]">{b.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
