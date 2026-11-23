"use client"

import { use } from "react"
import { JobForm } from "@/components/admin/recruitment/job-form"

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <JobForm jobId={id} />
}