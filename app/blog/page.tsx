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
    <main className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-fade-in text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Medical Equipment Insights</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Expert articles, guides, and industry updates to help you make informed decisions about medical equipment.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {blogPosts.map((post, i) => (
              <article
                key={post.id}
                className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 animate-slide-in-right"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="relative overflow-hidden h-48">
                  <img
                    src={post.image || "/placeholder.svg"}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      {post.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm line-clamp-2">{post.excerpt}</p>

                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      {post.author}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {post.date}
                    </div>
                  </div>

                  <Link
                    href={`/blog/${post.id}`}
                    className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
                  >
                    Read More <ArrowRight size={16} />
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
