import { Suspense } from "react"
import { QuotesClient } from "@/components/quotes-client"

export default function QuotesPage() {
  return (
    <Suspense fallback={null}>
      <QuotesClient />
    </Suspense>
  )
}
