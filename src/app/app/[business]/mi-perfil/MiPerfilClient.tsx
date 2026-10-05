"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { AccountPanel, currency, type Payout } from "@/components/employees/AccountModal";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

interface PeriodService {
  id: string;
  start_at: string;
  clientName: string;
  serviceName: string;
  price: number;
  commission: number;
}

export function MiPerfilClient(props: {
  businessId: string;
  memberId: string;
  fullName: string;
  email: string;
  specialty: string | null;
  photoUrl: string | null;
  commissionRate: number;
  earned: number;
  initialPayouts: Payout[];
  activePreset: string | null;
  periodServices: PeriodService[];
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
  email,
  specialty,
  photoUrl,
  commissionRate,
  earned,
  initialPayouts,
  activePreset,
  periodServices,
}: {
  businessId: string;
  memberId: string;
  fullName: string;
  email: string;
  specialty: string | null;
  photoUrl: string | null;
  commissionRate: number;
  earned: number;
  initialPayouts: Payout[];
  activePreset: string | null;
  periodServices: PeriodService[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const showToast = useToast();
  const [photo, setPhoto] = useState(photoUrl);
  const [uploading, setUploading] = useState(false);
  const [payouts] = useState(initialPayouts);
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
      <PageHeader title="Mi perfil" description="Tu foto y tus cuentas con el negocio." />

      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <Avatar name={fullName} src={photo} size={72} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-[var(--color-ink-900)]">{fullName}</p>
              <p className="truncate text-sm text-[var(--color-ink-500)]">{specialty ?? email}</p>
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

      <div className="flex flex-wrap gap-2">
        {[
          { key: "hoy", label: "Hoy" },
          { key: "semana", label: "Esta semana" },
          { key: "mes", label: "Este mes" },
        ].map((p) => (
          <Link
            key={p.key}
            href={`${pathname}?preset=${p.key}`}
            className={cn(
              "rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-colors",
              activePreset === p.key
                ? "bg-[var(--color-ink-900)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas)]"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis servicios</CardTitle>
        </CardHeader>
        {periodServices.length === 0 ? (
          <EmptyState title="Sin servicios completados en este período" />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-ink-500)]">
                    <th className="px-6 py-3 font-medium">Fecha</th>
                    <th className="px-6 py-3 font-medium">Hora</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 font-medium">Servicio</th>
                    <th className="px-6 py-3 font-medium">Precio</th>
                    <th className="px-6 py-3 font-medium">Comisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {periodServices.map((d) => {
                    const date = new Date(d.start_at);
                    return (
                      <tr key={d.id}>
                        <td className="whitespace-nowrap px-6 py-3 text-[var(--color-ink-700)]">{date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-[var(--color-ink-700)]">{date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}</td>
                        <td className="px-6 py-3 font-medium text-[var(--color-ink-900)]">{d.clientName}</td>
                        <td className="px-6 py-3 text-[var(--color-ink-700)]">{d.serviceName}</td>
                        <td className="px-6 py-3 text-[var(--color-ink-700)]">{currency.format(d.price)}</td>
                        <td className="px-6 py-3 font-medium text-[var(--color-ink-900)]">{currency.format(d.commission)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {periodServices.map((d) => {
                const date = new Date(d.start_at);
                return (
                  <div key={d.id} className="space-y-1.5 px-5 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[var(--color-ink-900)]">{d.clientName}</p>
                      <span className="shrink-0 whitespace-nowrap text-xs text-[var(--color-ink-500)]">
                        {date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} · {date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-ink-500)]">{d.serviceName}</span>
                      <span className="text-[var(--color-ink-700)]">{currency.format(d.price)}</span>
                    </div>
                    <p className="text-right text-xs font-medium text-[var(--color-accent-ink)]">Comisión: {currency.format(d.commission)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mi cuenta</CardTitle>
        </CardHeader>
        <CardBody>
          <AccountPanel memberId={memberId} payouts={payouts} earned={earned} businessId={businessId} readOnly />
        </CardBody>
      </Card>
    </div>
  );
}
