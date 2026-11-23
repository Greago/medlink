import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { saveProductImage } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"]
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export async function POST(request: Request) {
  try {
    await requireAdmin(request, {
      permissions: ["products.manage", "agents.manage", "customers.manage", "pos.sell", "recruitment.manage"],
      scopeModule: true,
    })

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please choose an image file." }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG and PNG images are supported." }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Images must be 4 MB or smaller." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const id = await saveProductImage(file.type, buffer)

    return NextResponse.json({ url: `/api/images/${id}` }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not upload the image.")
  }
}
