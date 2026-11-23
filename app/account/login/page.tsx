import { AuthShell } from "@/components/auth-shell"
import { AccountForm } from "@/components/account-form"

export default function AccountLoginPage() {
  return (
    <AuthShell>
      <AccountForm mode="login" />
    </AuthShell>
  )
}
