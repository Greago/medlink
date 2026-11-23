import { AuthShell } from "@/components/auth-shell"
import { AccountForm } from "@/components/account-form"

export default function AccountRegisterPage() {
  return (
    <AuthShell>
      <AccountForm mode="register" />
    </AuthShell>
  )
}
