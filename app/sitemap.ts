import type { MetadataRoute } from "next"
import { listPublicJobs } from "@/lib/careers-jobs"
import { siteUrl } from "@/lib/careers"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/careers`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ]
  try {
    const jobs = await listPublicJobs()
    const jobEntries: MetadataRoute.Sitemap = jobs.map((job) => ({
      url: `${base}/careers/${job.slug}`,
      lastModified: job.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }))
    return [...staticEntries, ...jobEntries]
  } catch {
    return staticEntries
  }
}