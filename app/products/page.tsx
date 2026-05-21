import { Suspense } from "react"
import { ProductsClient } from "@/components/products-client"

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsClient />
    </Suspense>
  )
}
