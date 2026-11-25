import type { BlogPostStatus } from "@/lib/blog-helpers"

export interface BlogSeedCategory {
  id: string
  name: string
  slug: string
  description: string
}

export interface BlogSeedPost {
  id: string
  slug: string
  title: string
  excerpt: string
  author: string
  categorySlug: string
  coverImage: string
  status: BlogPostStatus
  publishAt: string
  content: string
}

export const BLOG_SEED_CATEGORIES: BlogSeedCategory[] = [
  {
    id: "blog-maintenance",
    name: "Maintenance",
    slug: "maintenance",
    description: "Care, servicing and reliability guidance for clinical equipment.",
  },
  {
    id: "blog-technology",
    name: "Technology",
    slug: "technology",
    description: "New diagnostic tools and the technology changing patient care.",
  },
  {
    id: "blog-guide",
    name: "Guide",
    slug: "guide",
    description: "Practical buying and implementation guides for healthcare facilities.",
  },
  {
    id: "blog-industry",
    name: "Industry",
    slug: "industry",
    description: "Trends and developments across healthcare and medical supply.",
  },
]

export const BLOG_SEED_POSTS: BlogSeedPost[] = [
  {
    id: "seed-equipment-maintenance",
    slug: "essential-medical-equipment-maintenance-tips",
    title: "Essential Medical Equipment Maintenance Tips",
    excerpt:
      "Proper maintenance ensures longevity and reliability of medical equipment. Learn best practices from industry experts.",
    author: "Dr. Felix",
    categorySlug: "maintenance",
    coverImage: "/medical-equipment-maintenance.png",
    status: "published",
    publishAt: "2026-01-10T07:00:00.000Z",
    content: `
      <h2>Introduction</h2>
      <p>Medical equipment is a significant investment for any healthcare facility. Proper maintenance extends the lifespan of your equipment, protects patients and keeps your team working efficiently.</p>
      <h2>1. Build a preventive maintenance schedule</h2>
      <p>Start with the intervals recommended by the manufacturer, then adjust them for your facility's workload. A good schedule usually includes:</p>
      <ul><li>Daily visual inspections for wear or damage</li><li>Weekly cleaning and sanitisation</li><li>Monthly performance checks</li><li>Annual comprehensive servicing</li></ul>
      <h2>2. Keep accurate records</h2>
      <p>Record service dates, parts replaced, test results and warranty information. Clear records make audits easier and help you spot recurring faults before they become expensive failures.</p>
      <h2>3. Train your staff</h2>
      <p>Your team is the first line of defence. Train staff to identify early warning signs, perform basic troubleshooting and report problems promptly.</p>
      <h2>4. Control the environment</h2>
      <p>Keep equipment clean and dust-free, maintain appropriate temperature and humidity, ensure proper grounding and protect sensitive devices from power surges.</p>
      <blockquote>Preventive maintenance is always more cost-effective than emergency repairs.</blockquote>
    `,
  },
  {
    id: "seed-portable-diagnostics",
    slug: "latest-advances-in-portable-diagnostic-equipment",
    title: "Latest Advances in Portable Diagnostic Equipment",
    excerpt:
      "Discover how portable diagnostic tools are revolutionising patient care in remote and resource-limited settings.",
    author: "Dr. Felix",
    categorySlug: "technology",
    coverImage: "/hospital-medical-facility-equipment.jpg",
    status: "published",
    publishAt: "2026-01-08T07:00:00.000Z",
    content: `
      <h2>The portable revolution</h2>
      <p>Portable diagnostic equipment brings clinical-grade testing directly to patients. For remote clinics and outreach teams, this removes barriers that once required long referrals.</p>
      <h2>What has changed</h2>
      <p>Ultra-compact ultrasound systems, handheld blood analysers and wireless ECG monitors now deliver reliable results in a fraction of the space needed by older systems.</p>
      <h2>Real-world impact</h2>
      <p>Faster results mean faster decisions. Clinicians can triage patients at the point of care, reduce referral times and monitor chronic conditions closer to home.</p>
      <h2>Looking ahead</h2>
      <p>Expect smarter devices with guided workflows, AI-assisted interpretation and real-time data sharing with central hospitals.</p>
    `,
  },
  {
    id: "seed-choosing-equipment",
    slug: "choosing-the-right-equipment-for-your-facility",
    title: "Choosing the Right Equipment for Your Facility",
    excerpt:
      "A practical guide to selecting medical equipment that fits your facility's needs, workflow and budget.",
    author: "Emma Rodriguez",
    categorySlug: "guide",
    coverImage: "/hospital-medical-facility-equipment.jpg",
    status: "published",
    publishAt: "2026-01-05T07:00:00.000Z",
    content: `
      <h2>Start with an assessment</h2>
      <p>Before purchasing, document your patient volume, service lines, available space and budget. Match the equipment to the work your team actually does every day.</p>
      <h2>Key considerations</h2>
      <ul><li>Patient volume and service types</li><li>Regulatory and registration requirements</li><li>Staff training and expertise</li><li>Maintenance and local support availability</li><li>Total cost of ownership, not just purchase price</li></ul>
      <h2>Choose the right vendor</h2>
      <p>Look for a supplier with a proven track record, transparent pricing, reliable delivery and comprehensive warranty support.</p>
      <h2>Plan implementation</h2>
      <p>Allow time for installation, staff training and workflow integration. The best equipment delivers value only when your team can use it confidently.</p>
    `,
  },
  {
    id: "seed-healthcare-trends",
    slug: "2026-healthcare-industry-trends",
    title: "2026 Healthcare Industry Trends",
    excerpt: "Explore the major trends shaping healthcare delivery and equipment requirements in the year ahead.",
    author: "Dr. Felix",
    categorySlug: "industry",
    coverImage: "/healthcare-trends-2024.jpg",
    status: "published",
    publishAt: "2026-01-01T07:00:00.000Z",
    content: `
      <h2>Digital health integration</h2>
      <p>Healthcare continues its digital transformation. More devices now offer connectivity and integration with electronic health record systems.</p>
      <h2>Sustainability focus</h2>
      <p>Facilities are prioritising energy-efficient equipment, reusable components and responsible disposal practices.</p>
      <h2>Point-of-care testing</h2>
      <p>Portable, quick-result diagnostics are reducing wait times and improving outcomes in busy clinics.</p>
      <h2>Support for telemedicine</h2>
      <p>Equipment that supports remote monitoring and virtual consultations is becoming essential in modern healthcare delivery.</p>
    `,
  },
]
