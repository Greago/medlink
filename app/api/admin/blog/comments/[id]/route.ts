import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { deleteBlogComment, setBlogCommentStatus } from "@/lib/blog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

const statusSchema = z.object({
  status: z.enum(["pending", "published", "hidden"]),
})

export async function PATCH(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin(request, { permission: "blog.manage" })
    const { id } = await params
    const parsed = statusSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid comment status." }, { status: 400 })
    }

    const comment = await setBlogCommentStatus(id, parsed.data.status)
    if (!comment) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 })
    }
    await writeAudit({
      adminId: admin.id,
      module: "medical",
      action: "blog.comment.status",
      entityType: "blog_comment",
      entityId: id,
      after: { status: parsed.data.status },
    })
    return NextResponse.json({ comment })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the comment.")
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin(request, { permission: "blog.manage" })
    const { id } = await params
    const removed = await deleteBlogComment(id)
    if (!removed) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 })
    }
    await writeAudit({
      adminId: admin.id,
      module: "medical",
      action: "blog.comment.delete",
      entityType: "blog_comment",
      entityId: id,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete the comment.")
  }
}
