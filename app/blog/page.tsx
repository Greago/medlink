import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { ArrowRight, Calendar, User } from "lucide-react"

const blogPosts = [
  {
    id: 1,
    title: "Essential Medical Equipment Maintenance Tips",
    excerpt:
      "Proper maintenance ensures longevity and reliability of medical equipment. Learn best practices from industry experts.",
    author: "Dr. Felix",
    date: "Jan 10, 2026",
    category: "Maintenance",
    image: "/medical-equipment-maintenance.png",
  },
  {
    id: 2,
    title: "Latest Advances in Portable Diagnostic Equipment",
    excerpt:
      "Discover how portable diagnostic tools are revolutionizing patient care in remote and resource-limited settings.",
    author: "Dr. Felix",
    date: "Jan 8, 2026",
    category: "Technology",
    image: "/portable-diagnostic-equipment.jpg",
  },
  {
    id: 3,
    title: "Choosing the Right Equipment for Your Facility",
    excerpt:
      "A comprehensive guide to selecting medical equipment that meets your facility's specific needs and budget.",
    author: "Emma Rodriguez",
    date: "Jan 5, 2026",
    category: "Guide",
    image: "/hospital-medical-facility-equipment.jpg",
  },
  {
    id: 4,
    title: "2026 Healthcare Industry Trends",
    excerpt: "Explore the major trends shaping healthcare delivery and equipment requirements in the coming year.",
    author: "Dr. Felix",
    date: "Jan 1, 2024",
    category: "Industry",
    image: "/healthcare-trends-2024.jpg",
  },
]

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-br from-[#0a3d3d] via-[#0d4f4f] to-[#115e59]">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Medical Equipment Insights
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            Expert articles, guides, and industry updates to help you make informed decisions about medical equipment.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {blogPosts.map((post, i) => (
              <article
                key={post.id}
                className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-[#0d9488]/30 transition-all duration-500"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

                {/* Image */}
                <div className="relative overflow-hidden h-56 bg-gradient-to-br from-gray-100 to-gray-50">
                  <img
                    src={post.image || "/placeholder.svg"}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {/* Category Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-[#0d9488] text-white text-xs font-semibold rounded-full">
                      {post.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 relative z-10">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#0d9488] transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">{post.excerpt}</p>

                  {/* Meta Info */}
                  <div className="flex flex-col gap-3 text-sm text-gray-600 border-t border-gray-100 pt-4 mb-4">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-[#0d9488]" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-[#0d9488]" />
                      <span>{post.date}</span>
                    </div>
                  </div>

                  {/* Read More Link */}
                  <Link
                    href={`/blog/${post.id}`}
                    className="inline-flex items-center gap-2 text-[#0d9488] font-semibold hover:gap-3 transition-all group/link"
                  >
                    Read More <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
