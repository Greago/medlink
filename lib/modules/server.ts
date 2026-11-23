import { cookies } from "next/headers"
import type { NextResponse } from "next/server"
import { DEFAULT_MODULE, MODULE_COOKIE, MODULE_COOKIE_MAX_AGE_SECONDS, isAppModule } from "./types"
import type { AppModule } from "./types"

/** Reads the active storefront module from the request cookies. */
export async function getActiveModule(): Promise<AppModule> {
  const cookieStore = await cookies()
  const value = cookieStore.get(MODULE_COOKIE)?.value
  return isAppModule(value) ? value : DEFAULT_MODULE
}

/** True once the visitor has explicitly picked a module. */
export async function hasChosenModule(): Promise<boolean> {
  const cookieStore = await cookies()
  return isAppModule(cookieStore.get(MODULE_COOKIE)?.value)
}

/** Cookie parsing for route handlers that only receive a Request object. */
export function parseModuleFromRequest(request: Request): AppModule {
  const header = request.headers.get("cookie")
  if (!header) return DEFAULT_MODULE

  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=")
    if (name === MODULE_COOKIE) {
      try {
        const value = decodeURIComponent(valueParts.join("="))
        return isAppModule(value) ? value : DEFAULT_MODULE
      } catch {
        return DEFAULT_MODULE
      }
    }
  }

  return DEFAULT_MODULE
}

export function setModuleCookie(response: NextResponse, module: AppModule): void {
  response.cookies.set(MODULE_COOKIE, module, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production",
    path: "/",
    maxAge: MODULE_COOKIE_MAX_AGE_SECONDS,
  })
}
