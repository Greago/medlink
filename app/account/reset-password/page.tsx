import { AuthShell } from "@/components/auth-shell"
import { PasswordResetForm } from "@/components/password-reset-form"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const params = await searchParams
  const token = Array.isArray(params.token) ? params.token[0] : params.token

  return (
    <AuthShell>
      <PasswordResetForm token={token} />
    </AuthShell>
  )
}
