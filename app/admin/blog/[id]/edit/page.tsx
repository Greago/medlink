import { BlogPostForm } from "@/components/admin/blog/blog-post-form"

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <BlogPostForm postId={id} />
}
