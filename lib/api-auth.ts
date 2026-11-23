import { NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/admin-auth"
import type { AppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"
import { canAccessModule, hasPermission, type AdminRole, type Permission } from "@/lib/roles"
import type { AdminUser } from "@/lib/store"

export class ApiAuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
  }
}

export interface RequireAdminOptions {
  permission?: Permission
  permissions?: Permission[]
  /** Use the active medlink_module cookie when no module is supplied. */
  scopeModule?: boolean
  module?: AppModule
}

export interface AuthenticatedAdmin extends AdminUser {
  role: AdminRole
}

export async function requireAdmin(
  request: Request,
  options: RequireAdminOptions = {}
): Promise<AuthenticatedAdmin> {
  const admin = await getCurrentAdmin(request)
  if (!admin) throw new ApiAuthError("Please sign in to continue.", 401)
  if (admin.status === "inactive") throw new ApiAuthError("This account has been deactivated.", 403)

  const pathname = new URL(request.url).pathname
  const changePasswordPaths = ["/api/admin/password-change", "/api/admin/logout", "/api/admin/me"]
  if (admin.mustChangePassword && !changePasswordPaths.includes(pathname)) {
    throw new ApiAuthError("Change your temporary password before continuing.", 403)
  }

  const module = options.module ?? (options.scopeModule ? parseModuleFromRequest(request) : null)
  if (module && !canAccessModule(admin, module)) {
    throw new ApiAuthError("You do not have access to this division.", 403)
  }

  const required = options.permissions ?? (options.permission ? [options.permission] : [])
  const allowed = required.length === 0 || required.some((permission) => hasPermission(admin, permission))
  if (!allowed) throw new ApiAuthError("You do not have permission to do that.", 403)

  return admin as AuthenticatedAdmin
}

export function assertModuleAccess(admin: AuthenticatedAdmin, module: AppModule): void {
  if (!canAccessModule(admin, module)) {
    throw new ApiAuthError("You do not have access to this division.", 403)
  }
}

export function apiErrorResponse(error: unknown, fallbackMessage = "Request failed."): NextResponse {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error(fallbackMessage, error instanceof Error ? error.message : "Unknown error")
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
