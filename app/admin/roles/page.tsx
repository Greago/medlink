import { RoleManager } from "@/components/admin/role-manager"

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string | string[]; id?: string | string[] }>
}) {
  const params = await searchParams
  const subject = Array.isArray(params.subject) ? params.subject[0] : params.subject
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  return <RoleManager initialSubject={subject} initialId={id} />
}
