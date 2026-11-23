"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Eye, Heart, PackageOpen, ShoppingCart, Star } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge, Button, Card, CardContent, Skeleton } from "@/components/ui/index"
import { formatPrice } from "@/lib/catalogue"
import type { CatalogueProduct } from "@/lib/modules/types"
import { cn } from "@/lib/utils"

export type MerchProduct = CatalogueProduct

function discountPercent(product: MerchProduct): number {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) return 0
  return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
}

export function PriceTag({ product, className }: { product: MerchProduct; className?: string }) {
  const discount = discountPercent(product)
  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
      {product.compareAtPrice && discount > 0 && (
        <>
          <span className="text-xs text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
          <Badge variant="discount" className="rounded-full px-2 py-0.5 text-[10px] font-bold">
            {discount}% OFF
          </Badge>
        </>
      )}
    </div>
  )
}

export function StockBadge({ product, className }: { product: MerchProduct; className?: string }) {
  const soldOut = !product.inStock || product.stockQuantity === 0
  const low =
    !soldOut &&
    typeof product.stockQuantity === "number" &&
    typeof product.lowStockThreshold === "number" &&
    product.stockQuantity <= product.lowStockThreshold

  if (soldOut) {
    return (
      <Badge variant="danger" className={cn("rounded-full px-2.5 py-1 text-[10px]", className)}>
        Out of stock
      </Badge>
    )
  }
  if (low) {
    return (
      <Badge variant="warning" className={cn("rounded-full px-2.5 py-1 text-[10px]", className)}>
        Low stock
      </Badge>
    )
  }
  return (
    <Badge variant="success" className={cn("rounded-full px-2.5 py-1 text-[10px]", className)}>
      In stock
    </Badge>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-3xl font-bold leading-tight md:text-4xl">{title}</h2>
        {description && <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function CategoryCard({
  name,
  count,
  image,
  href,
  className,
}: {
  name: string
  count?: number
  image?: string | null
  href: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "surface-card hover-lift focus-ring group flex min-h-[158px] flex-col justify-between overflow-hidden p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug text-ink">{name}</h3>
        {typeof count === "number" && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {count}
          </span>
        )}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          Explore <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </span>
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-surface-soft">
          <Image
            src={image || "/placeholder.jpg"}
            alt=""
            fill
            sizes="56px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </div>
    </Link>
  )
}

export interface ProductCardProps {
  product: MerchProduct
  liked?: boolean
  onAdd?: (product: MerchProduct) => void
  onLike?: (product: MerchProduct) => void
  onQuickView?: (product: MerchProduct) => void
  priority?: boolean
  className?: string
}

export function ProductCard({
  product,
  liked = false,
  onAdd,
  onLike,
  onQuickView,
  priority = false,
  className,
}: ProductCardProps) {
  const soldOut = !product.inStock || product.stockQuantity === 0
  const discount = discountPercent(product)
  const hasRating = typeof product.rating === "number" && (product.reviewCount || 0) > 0

  return (
    <Card
      className={cn(
        "group surface-card hover-lift focus-within:ring-2 focus-within:ring-ring/40 gap-0 overflow-hidden p-0",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-surface-soft">
        <Link href={`/products/${product.id}`} className="absolute inset-0" aria-label={`View ${product.name}`}>
          <Image
            src={product.image || "/placeholder.jpg"}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {discount > 0 && (
            <Badge variant="discount" className="rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm">
              {discount}% OFF
            </Badge>
          )}
          {product.requiresPrescription && (
            <Badge variant="rx" className="rounded-full px-2.5 py-1 text-[10px] shadow-sm">
              Rx
            </Badge>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={liked ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
          aria-pressed={liked}
          onClick={() => onLike?.(product)}
          className="absolute right-3 top-3 rounded-full border border-border/70 bg-card/90 shadow-sm backdrop-blur"
        >
          <Heart size={17} className={cn(liked && "fill-danger text-danger")} />
        </Button>

        {onQuickView && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Quick view ${product.name}`}
            onClick={() => onQuickView?.(product)}
            className="absolute bottom-3 right-3 rounded-full border border-border/70 bg-card/90 opacity-100 shadow-sm backdrop-blur transition-opacity md:opacity-0 md:group-hover:opacity-100"
          >
            <Eye size={17} />
          </Button>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-primary">
            {product.brand || product.category}
          </span>
          <StockBadge product={product} />
        </div>

        <Link
          href={`/products/${product.id}`}
          className="line-clamp-2 min-h-[42px] text-sm font-semibold leading-tight text-ink hover:text-primary"
        >
          {product.name}
        </Link>

        {hasRating && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star size={13} className="fill-accent text-accent" />
            <span className="font-semibold text-ink">{Number(product.rating).toFixed(1)}</span>
            <span>({product.reviewCount})</span>
          </div>
        )}

        <PriceTag product={product} className="mt-auto" />

        <Button
          type="button"
          variant="primary"
          size="touch"
          disabled={soldOut || !onAdd}
          onClick={() => onAdd?.(product)}
          className="mt-1 w-full"
          aria-label={soldOut ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
        >
          <ShoppingCart size={16} />
          {soldOut ? "Out of stock" : "Add to cart"}
        </Button>
      </CardContent>
    </Card>
  )
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("surface-card gap-0 overflow-hidden p-0", className)}>
      <Skeleton className="skeleton-shimmer aspect-square rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="skeleton-shimmer h-3 w-1/3" />
        <Skeleton className="skeleton-shimmer h-4 w-full" />
        <Skeleton className="skeleton-shimmer h-4 w-2/3" />
        <Skeleton className="skeleton-shimmer h-11 w-full rounded-xl" />
      </div>
    </Card>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  loading = false,
  className,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ size?: number; className?: string }>
  delta?: number | null
  hint?: string
  loading?: boolean
  className?: string
}) {
  const positive = typeof delta === "number" && delta >= 0
  return (
    <Card className={cn("surface-card gap-0 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="skeleton-shimmer mt-3 h-7 w-24" />
          ) : (
            <p className="mt-2 truncate text-2xl font-bold tracking-tight text-ink">{value}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            {typeof delta === "number" && (
              <span className={cn("font-semibold", positive ? "text-success" : "text-danger")}>
                {positive ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        </div>
        {Icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon size={20} />
          </span>
        )}
      </div>
    </Card>
  )
}

export function AlertTile({
  title,
  value,
  icon: Icon,
  href,
  tone = "warning",
}: {
  title: string
  value: React.ReactNode | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  href: string
  tone?: "warning" | "danger" | "info" | "success"
}) {
  const toneClass = {
    warning: "bg-warning/12 text-warning",
    danger: "bg-danger/12 text-danger",
    info: "bg-info/12 text-info",
    success: "bg-success/12 text-success",
  }[tone]

  return (
    <Link
      href={href}
      className="surface-card focus-ring hover-lift flex items-center gap-4 p-4"
      aria-label={`${title}: ${value}. Open details`}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", toneClass)}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-xl font-bold text-ink">{value}</p>
      </div>
      <ArrowRight size={16} className="ml-auto shrink-0 text-muted-foreground" />
    </Link>
  )
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("surface-card flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <Icon size={26} />
      </span>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: columns }).map((__, column) => (
            <Skeleton key={column} className="skeleton-shimmer h-10 flex-1 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  )
}

export const Modal = Dialog
export const ModalTrigger = DialogTrigger
export const ModalClose = DialogClose
export const ModalContent = DialogContent
export const ModalHeader = DialogHeader
export const ModalTitle = DialogTitle
export const ModalDescription = DialogDescription
export const ModalFooter = DialogFooter

export const Drawer = Sheet
export const DrawerTrigger = SheetTrigger
export const DrawerClose = SheetClose
export const DrawerContent = SheetContent
export const DrawerHeader = SheetHeader
export const DrawerTitle = SheetTitle
export const DrawerDescription = SheetDescription
export const DrawerFooter = SheetFooter

export const DataTable = Table
export const DataTableHeader = TableHeader
export const DataTableBody = TableBody
export const DataTableFooter = TableFooter
export const DataTableRow = TableRow
export const DataTableHead = TableHead
export const DataTableCell = TableCell
export const DataTableCaption = TableCaption

export { Badge, Button, Card, CardContent, Skeleton }
