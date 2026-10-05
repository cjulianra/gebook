"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { ToastProvider, useToast } from "@/components/ui/Toast";

type Business = Database["public"]["Tables"]["businesses"]["Row"];

export function ConfiguracionClient({ business }: { business: Business }) {
  return (
    <ToastProvider>
      <Inner business={business} />
    </ToastProvider>
  );
}

function Inner({ business }: { business: Business }) {
  const showToast = useToast();
  const [logoUrl, setLogoUrl] = useState(business.logo_url);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    const ext = file.name.split(".").pop();
    const path = `${business.id}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      showToast("No pudimos subir el logo.", "danger");
      return;
    }

    const { data: publicUrl } = supabase.storage.from("logos").getPublicUrl(path);
    const { error: updateError } = await supabase.from("businesses").update({ logo_url: publicUrl.publicUrl }).eq("id", business.id);

    setUploading(false);
    if (updateError) {
      showToast("Subimos la imagen pero no pudimos guardarla.", "danger");
      return;
    }

    setLogoUrl(publicUrl.publicUrl);
    showToast("Logo actualizado.");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("El nombre es obligatorio.");
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("businesses")
      .update({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null })
      .eq("id", business.id);

    setSaving(false);
    if (updateError) {
      setError("No pudimos guardar los cambios.");
      return;
    }
    showToast("Datos del negocio actualizados.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <PageHeader title="Configuración" description="La información pública de tu negocio." />

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] [background:var(--gradient-accent)]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo lives in Supabase Storage, a dynamic external host
                <img src={logoUrl} alt={business.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-[var(--color-accent-ink)]">{business.name[0]?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
              </Button>
              <p className="mt-1.5 text-xs text-[var(--color-ink-500)]">PNG o JPG, máximo 2 MB.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del negocio</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <FieldError>{error ?? undefined}</FieldError>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
