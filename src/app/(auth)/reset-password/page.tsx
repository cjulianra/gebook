"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { PasswordInput, Label, FieldError } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/login";
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // El enlace de recuperación trae el token en la URL; el cliente de Supabase
    // lo detecta solo y crea la sesión — solo hay que confirmar que quedó activa.
    supabase.auth.getSession().then(({ data }) => {
      setValidSession(!!data.session);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("No pudimos actualizar tu contraseña. Intenta de nuevo.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.replace(nextPath);
    }, 2000);
  }

  if (checking) {
    return (
      <Card>
        <CardBody className="text-center text-sm text-[var(--color-ink-500)]">Verificando enlace…</CardBody>
      </Card>
    );
  }

  if (!validSession) {
    return (
      <Card>
        <CardBody className="space-y-3 text-center">
          <h2 className="text-lg font-semibold text-[var(--color-ink-900)]">Enlace inválido o vencido</h2>
          <p className="text-sm text-[var(--color-ink-500)]">Pide un nuevo enlace para recuperar tu contraseña.</p>
          <Link href="/forgot-password" className="inline-block text-sm font-medium text-[var(--color-accent)] hover:underline">
            Solicitar enlace nuevo
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardBody className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-2xl">✓</div>
          <h2 className="text-lg font-semibold text-[var(--color-ink-900)]">Contraseña actualizada</h2>
          <p className="text-sm text-[var(--color-ink-500)]">Te llevamos a iniciar sesión…</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <h1 className="mb-1 text-lg font-semibold text-[var(--color-ink-900)]">Crea una nueva contraseña</h1>
        <p className="mb-4 text-sm text-[var(--color-ink-500)]">Mínimo 8 caracteres.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Nueva contraseña</Label>
            <PasswordInput id="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirma la contraseña</Label>
            <PasswordInput
              id="confirmPassword"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
            />
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
