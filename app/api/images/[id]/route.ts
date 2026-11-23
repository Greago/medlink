import { getProductImage } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 })
  }

  try {
    const image = await getProductImage(id)
    if (!image) {
      return new Response("Not found", { status: 404 })
    }

    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mime,
        "Content-Length": String(image.data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Failed to load product image:", error)
    return new Response("Not found", { status: 404 })
  }
}
