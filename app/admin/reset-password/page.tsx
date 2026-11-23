import Link from "next/link"
import { ArrowLeft, LockKeyhole } from "lucide-react"
import { Card } from "@/components/design-system"
import { AdminResetPasswordForm } from "@/components/admin-reset-password-form"

export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const params = await searchParams
  const token = Array.isArray(params.token) ? params.token[0] : params.token

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link href="/admin/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0c1f1d]">
          <ArrowLeft size={16} /> Back to admin login
        </Link>

        <Card className="mt-6 gap-0 p-7">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole size={22} />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter a new password for your Medlink staff login. Use at least 8 characters.
          </p>
          <AdminResetPasswordForm token={token} />
        </Card>
      </div>
    </main>
  )
}
