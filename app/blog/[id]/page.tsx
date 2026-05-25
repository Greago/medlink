"use client"

import React, { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Heart, MessageCircle, Share2, Calendar, User, ArrowLeft, Copy, Check } from "lucide-react"
import Link from "next/link"

const blogPosts: Record<string, any> = {
  "1": {
    id: 1,
    title: "Essential Medical Equipment Maintenance Tips",
    excerpt:
      "Proper maintenance ensures longevity and reliability of medical equipment. Learn best practices from industry experts.",
    author: "Dr. Felix",
    date: "Jan 10, 2026",
    category: "Maintenance",
    image: "/medical-equipment-maintenance.png",
    content: `
      <h2>Introduction</h2>
      <p>
        Medical equipment is a significant investment for any healthcare facility. Proper maintenance not only extends the lifespan 
        of your equipment but also ensures patient safety and operational efficiency. In this comprehensive guide, we'll explore 
        the essential maintenance practices that every facility should implement.
      </p>

      <h2>1. Preventive Maintenance Schedule</h2>
      <p>
        The foundation of good equipment maintenance is establishing a preventive maintenance schedule. This involves regular 
        checks and servicing at intervals recommended by the manufacturer. Key aspects include:
      </p>
      <ul>
        <li>Daily visual inspections for signs of wear or damage</li>
        <li>Weekly cleaning and sanitization protocols</li>
        <li>Monthly performance testing</li>
        <li>Annual comprehensive servicing</li>
      </ul>

      <h2>2. Documentation and Record Keeping</h2>
      <p>
        Maintaining detailed records of all maintenance activities is crucial. This includes:
      </p>
      <ul>
        <li>Service dates and types of maintenance performed</li>
        <li>Parts replaced and their specifications</li>
        <li>Performance metrics and test results</li>
        <li>Cost tracking and warranty information</li>
      </ul>

      <h2>3. Staff Training</h2>
      <p>
        Your staff are the first line of defense in equipment maintenance. Regular training ensures they can:
      </p>
      <ul>
        <li>Identify potential issues early</li>
        <li>Perform basic troubleshooting</li>
        <li>Follow proper usage protocols</li>
        <li>Report problems promptly</li>
      </ul>

      <h2>4. Environmental Conditions</h2>
      <p>
        Maintaining proper environmental conditions significantly extends equipment lifespan:
      </p>
      <ul>
        <li>Keep equipment in a clean, dust-free environment</li>
        <li>Maintain appropriate temperature and humidity levels</li>
        <li>Ensure proper electrical grounding</li>
        <li>Protect from power surges with proper power management</li>
      </ul>

      <h2>Conclusion</h2>
      <p>
        By implementing these essential maintenance practices, your facility can ensure reliable equipment performance, 
        reduce downtime, and provide better patient care. Remember, preventive maintenance is always more cost-effective 
        than emergency repairs.
      </p>
    `,
  },
  "2": {
    id: 2,
    title: "Latest Advances in Portable Diagnostic Equipment",
    excerpt:
      "Discover how portable diagnostic tools are revolutionizing patient care in remote and resource-limited settings.",
    author: "Dr. Felix",
    date: "Jan 8, 2026",
    category: "Technology",
    image: "/portable-diagnostic-equipment.jpg",
    content: `
      <h2>The Portable Revolution</h2>
      <p>
        Portable diagnostic equipment has transformed healthcare delivery, particularly in remote and underserved areas. 
        These advanced devices bring clinical-grade diagnostics directly to patients, eliminating barriers to access.
      </p>

      <h2>Key Technological Advances</h2>
      <p>
        Recent innovations include ultra-compact ultrasound systems, portable blood analyzers, and wireless ECG monitors. 
        These devices offer remarkable accuracy while maintaining portability and ease of use.
      </p>

      <h2>Real-World Impact</h2>
      <p>
        In remote clinics and rural areas, portable diagnostic equipment has reduced referral times and improved patient 
        outcomes. Healthcare providers can now make informed decisions at the point of care.
      </p>

      <h2>Future Outlook</h2>
      <p>
        As technology continues to advance, we can expect even more sophisticated portable solutions, including AI-powered 
        diagnostics and real-time data sharing capabilities.
      </p>
    `,
  },
  "3": {
    id: 3,
    title: "Choosing the Right Equipment for Your Facility",
    excerpt:
      "A comprehensive guide to selecting medical equipment that meets your facility's specific needs and budget.",
    author: "Emma Rodriguez",
    date: "Jan 5, 2026",
    category: "Guide",
    image: "/hospital-medical-facility-equipment.jpg",
    content: `
      <h2>Assessment Phase</h2>
      <p>
        Before purchasing any equipment, conduct a thorough assessment of your facility's needs, budget, and space constraints.
      </p>

      <h2>Key Considerations</h2>
      <ul>
        <li>Patient volume and service types</li>
        <li>Regulatory compliance requirements</li>
        <li>Staff training and expertise</li>
        <li>Maintenance and support availability</li>
        <li>Total cost of ownership</li>
      </ul>

      <h2>Vendor Selection</h2>
      <p>
        Choose vendors with proven track records, reliable customer support, and comprehensive warranty options.
      </p>

      <h2>Implementation Planning</h2>
      <p>
        Plan for proper installation, staff training, and workflow integration to ensure successful equipment deployment.
      </p>
    `,
  },
  "4": {
    id: 4,
    title: "2026 Healthcare Industry Trends",
    excerpt: "Explore the major trends shaping healthcare delivery and equipment requirements in the coming year.",
    author: "Dr. Felix",
    date: "Jan 1, 2024",
    category: "Industry",
    image: "/healthcare-trends-2024.jpg",
    content: `
      <h2>Digital Health Integration</h2>
      <p>
        The healthcare industry continues its digital transformation, with more equipment offering wireless connectivity 
        and integration with electronic health records systems.
      </p>

      <h2>Sustainability Focus</h2>
      <p>
        Healthcare facilities are increasingly prioritizing energy-efficient equipment and sustainable practices.
      </p>

      <h2>Point-of-Care Testing</h2>
      <p>
        There's a growing trend toward portable, quick-result diagnostic devices that reduce wait times and improve outcomes.
      </p>

      <h2>Telemedicine Support</h2>
      <p>
        Equipment that supports remote monitoring and telemedicine capabilities is becoming essential in modern healthcare.
      </p>
    `,
  },
}

export default function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const post = blogPosts[id]
  const [claps, setClaps] = useState(0)
  const [comments, setComments] = useState<Array<{ id: number; name: string; email: string; comment: string }>>([])
  const [commentForm, setCommentForm] = useState({ name: "", email: "", comment: "" })
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)

  const handleShare = async (platform: string) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/blog/${id}` : ""
    const title = post?.title || "Check out this article"
    const text = post?.excerpt || "Great content on medical equipment"

    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
          "_blank"
        )
        break
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank"
        )
        break
      case "linkedin":
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          "_blank"
        )
        break
      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
          "_blank"
        )
        break
      case "copy":
        navigator.clipboard.writeText(url)
        setCopyFeedback(true)
        setTimeout(() => setCopyFeedback(false), 2000)
        break
    }
    setShowShareMenu(false)
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Blog post not found</h1>
          <Link href="/blog" className="text-[#0d9488] hover:underline mt-4 inline-block">
            Back to blog
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (commentForm.name && commentForm.email && commentForm.comment) {
      setComments([
        ...comments,
        {
          id: comments.length + 1,
          name: commentForm.name,
          email: commentForm.email,
          comment: commentForm.comment,
        },
      ])
      setCommentForm({ name: "", email: "", comment: "" })
    }
  }

  const handleClap = () => {
    setClaps(claps + 1)
  }

  return (
    <main className="min-h-screen bg-white">
      <Navigation />

      {/* Back Button */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/blog" className="inline-flex items-center gap-2 text-[#0d9488] hover:text-[#0f766e] font-semibold">
            <ArrowLeft size={18} /> Back to Blog
          </Link>
        </div>
      </div>

      {/* Article */}
      <article className="py-12 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-[#0d9488]/10 text-[#0d9488] text-xs font-semibold rounded-full">
                {post.category}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">{post.title}</h1>

            {/* Meta Info */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-gray-600 border-b border-gray-200 pb-6 mb-8">
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{post.date}</span>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="mb-8 rounded-2xl overflow-hidden h-96 md:h-[500px]">
            <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none mb-12 text-gray-700 leading-relaxed">
            <div
              dangerouslySetInnerHTML={{
                __html: post.content
                  .replace(/<h2>/g, '<h2 style="font-size: 1.875rem; font-weight: bold; margin-top: 2rem; margin-bottom: 1rem; color: #1f2937;">')
                  .replace(/<h3>/g, '<h3 style="font-size: 1.5rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1f2937;">')
                  .replace(/<p>/g, '<p style="margin-bottom: 1rem; line-height: 1.75;">')
                  .replace(/<ul>/g, '<ul style="list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem;">')
                  .replace(/<li>/g, '<li style="margin-bottom: 0.5rem;">')
                  .replace(/<ol>/g, '<ol style="list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem;">')
              }}
            />
          </div>

          {/* Engagement Bar */}
          <div className="flex items-center gap-6 py-6 border-y border-gray-200 mb-12">
            <button
              onClick={handleClap}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors group"
            >
              <Heart
                size={24}
                className={`${claps > 0 ? "fill-red-500 text-red-500" : "text-gray-400 group-hover:text-red-500"} transition-colors`}
              />
              <span className="font-semibold text-gray-700">{claps}</span>
            </button>

            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-gray-700">
              <MessageCircle size={24} className="text-gray-400" />
              <span className="font-semibold">{comments.length}</span>
            </button>

            {/* Share Button with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors text-gray-700"
              >
                <Share2 size={24} className="text-gray-400" />
                <span className="font-semibold">Share</span>
              </button>

              {/* Share Menu */}
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => handleShare("twitter")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-100"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.207-6.807-5.974 6.807H2.882l7.432-8.489H4.25l5.066 6.659 5.928-6.659zM17.15 18.75h1.828L5.97 4.099H4.04l13.11 14.65z" />
                    </svg>
                    <span className="font-medium text-gray-700">X</span>
                  </button>
                  <button
                    onClick={() => handleShare("facebook")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-100"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span className="font-medium text-gray-700">Facebook</span>
                  </button>
                  <button
                    onClick={() => handleShare("linkedin")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-100"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
                    </svg>
                    <span className="font-medium text-gray-700">LinkedIn</span>
                  </button>
                  <button
                    onClick={() => handleShare("whatsapp")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-100"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.672 13.259c-.289-.149-1.71-.845-1.977-.942-.267-.097-.461-.146-.655.146-.194.292-.752.941-.921 1.136-.169.194-.339.218-.628.069-.289-.15-1.223-.451-2.329-1.437-.862-.768-1.444-1.718-1.612-2.008-.169-.289-.018-.446.127-.59.13-.129.289-.337.434-.507.145-.169.193-.289.289-.483.096-.194.048-.363-.024-.508-.072-.146-.655-1.576-.898-2.158-.236-.566-.477-.489-.655-.499-.169-.008-.361-.01-.556-.01-.194 0-.508.072-.773.363-.265.291-1.013.991-1.013 2.419 0 1.429 1.038 2.81 1.182 3.004.144.193 2.045 3.124 4.955 4.38.692.299 1.232.476 1.652.612.694.225 1.327.193 1.826.116.557-.083 1.712-.702 1.954-1.379.243-.676.243-1.254.169-1.379-.074-.121-.265-.193-.556-.339" />
                    </svg>
                    <span className="font-medium text-gray-700">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleShare("copy")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    {copyFeedback ? (
                      <>
                        <Check size={20} className="text-green-500" />
                        <span className="font-medium text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={20} className="text-gray-700" />
                        <span className="font-medium text-gray-700">Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Comments ({comments.length})</h2>

              {/* Comment Form */}
              <form onSubmit={handleAddComment} className="bg-gray-50 rounded-2xl p-6 mb-8">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      required
                      value={commentForm.name}
                      onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={commentForm.email}
                      onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Comment</label>
                  <textarea
                    required
                    rows={4}
                    value={commentForm.comment}
                    onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] resize-none"
                    placeholder="Share your thoughts..."
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0d9488] text-white rounded-lg font-semibold hover:bg-[#0f766e] transition-colors"
                >
                  Post Comment
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{comment.name}</h4>
                        <span className="text-sm text-gray-500">{comment.email}</span>
                      </div>
                      <p className="text-gray-700">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
