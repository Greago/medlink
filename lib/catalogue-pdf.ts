import { readFile } from "node:fs/promises"
import path from "node:path"
import { formatPrice, type CatalogueProduct } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { DEFAULT_MODULE, type AppModule } from "@/lib/modules/types"

type PdfDocument = InstanceType<typeof import("jspdf").jsPDF>
type Rgb = [number, number, number]
type ImageFormat = "JPEG" | "PNG"

interface LoadedImage {
  dataUrl: string
  format: ImageFormat
}

interface Cursor {
  y: number
  column: number
}

const MARGIN = 42
const HEADER_HEIGHT = 68
const CARD_GAP = 14
const CARD_WIDTH = 248.64
const CARD_HEIGHT = 292
const RIBBON_HEIGHT = 28

const INK: Rgb = [13, 35, 38]
const MUTED: Rgb = [90, 111, 114]
const TEAL: Rgb = [10, 61, 61]
const ACCENT: Rgb = [15, 168, 153]
const LIGHT: Rgb = [241, 245, 249]
const BORDER: Rgb = [221, 232, 232]
const WHITE: Rgb = [255, 255, 255]

const imageCache = new Map<string, Promise<LoadedImage | null>>()

function normalizeAsset(asset: string | undefined | null): string | null {
  if (!asset) return null
  if (asset.startsWith("data:image/")) return asset
  if (!asset.startsWith("/") || asset.startsWith("//")) return null
  return asset.split(/[?#]/)[0]
}

function imageFormatFromPath(filePath: string): ImageFormat | null {
  const extension = path.extname(filePath).toLowerCase()
  if (extension === ".jpg" || extension === ".jpeg") return "JPEG"
  if (extension === ".png") return "PNG"
  return null
}

function toLoadedImage(buffer: Buffer, format: ImageFormat): LoadedImage {
  const mime = format === "JPEG" ? "image/jpeg" : "image/png"
  return {
    dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
    format,
  }
}

async function loadImage(asset: string | null, origin?: string): Promise<LoadedImage | null> {
  const normalized = normalizeAsset(asset)
  if (!normalized) return null

  if (normalized.startsWith("data:image/")) {
    const match = normalized.match(/^data:image\/(png|jpeg);base64,/i)
    if (!match) return null
    return Promise.resolve({
      dataUrl: normalized,
      format: (match[1].toLowerCase() === "png" ? "PNG" : "JPEG") as ImageFormat,
    })
  }

  const cacheKey = `${origin || "local"}:${normalized}`
  const cached = imageCache.get(cacheKey)
  if (cached) return cached

  const task = (async () => {
    const publicRoot = path.resolve(process.cwd(), "public")
    const filePath = path.resolve(publicRoot, `.${normalized}`)
    const format = imageFormatFromPath(filePath)

    if (format && filePath.startsWith(`${publicRoot}${path.sep}`)) {
      try {
        const buffer = await readFile(filePath)
        return toLoadedImage(buffer, format)
      } catch {
        // Fall through to fetching the public asset from the app origin.
      }
    }

    if (origin) {
      try {
        const response = await fetch(new URL(normalized, origin), { cache: "force-cache" })
        if (response.ok) {
          const contentType = response.headers.get("content-type") || ""
          const responseFormat =
            imageFormatFromPath(new URL(normalized, origin).pathname) ||
            (contentType.includes("image/png")
              ? "PNG"
              : contentType.includes("image/jpeg")
                ? "JPEG"
                : null)
          if (responseFormat) {
            return toLoadedImage(Buffer.from(await response.arrayBuffer()), responseFormat)
          }
        }
      } catch {
        // A missing image is handled with a designed placeholder.
      }
    }

    return null
  })()

  imageCache.set(cacheKey, task)
  return task
}

function setText(doc: PdfDocument, size: number, color: Rgb, style: "normal" | "bold" | "italic" = "normal") {
  doc.setFont("helvetica", style)
  doc.setFontSize(size)
  doc.setTextColor(...color)
}

function splitLines(doc: PdfDocument, text: string, width: number, maxLines?: number): string[] {
  const lines = (doc.splitTextToSize(text, width) as string[]) || []
  if (!maxLines || lines.length <= maxLines) return lines

  const result = lines.slice(0, maxLines)
  let last = result[maxLines - 1] || ""
  while (last.length > 0 && doc.getTextWidth(`${last}…`) > width) {
    last = last.slice(0, -1)
  }
  result[maxLines - 1] = `${last.trimEnd()}…`
  return result
}

function drawLines(
  doc: PdfDocument,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  color: Rgb,
  size: number,
  style: "normal" | "bold" | "italic" = "normal"
) {
  setText(doc, size, color, style)
  lines.forEach((line, index) => doc.text(line, x, y + index * lineHeight))
  return y + Math.max(lines.length, 1) * lineHeight
}

function drawImageContain(
  doc: PdfDocument,
  image: LoadedImage | null,
  x: number,
  y: number,
  width: number,
  height: number,
  padding = 0
) {
  if (!image) return false

  try {
    const properties = doc.getImageProperties(image.dataUrl)
    const availableWidth = Math.max(width - padding * 2, 1)
    const availableHeight = Math.max(height - padding * 2, 1)
    const scale = Math.min(availableWidth / properties.width, availableHeight / properties.height)
    const imageWidth = properties.width * scale
    const imageHeight = properties.height * scale

    doc.addImage(
      image.dataUrl,
      image.format,
      x + (width - imageWidth) / 2,
      y + (height - imageHeight) / 2,
      imageWidth,
      imageHeight
    )
    return true
  } catch {
    return false
  }
}

function drawImageCover(
  doc: PdfDocument,
  image: LoadedImage | null,
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (!image) return false

  try {
    const properties = doc.getImageProperties(image.dataUrl)
    const targetRatio = width / height
    const sourceRatio = properties.width / properties.height

    if (sourceRatio > targetRatio) {
      const cropWidth = properties.height * targetRatio
      const offsetX = (properties.width - cropWidth) / 2
      const scale = width / cropWidth
      doc.addImage(image.dataUrl, image.format, x - offsetX * scale, y, properties.width * scale, height)
    } else {
      const cropHeight = properties.width / targetRatio
      const offsetY = (properties.height - cropHeight) / 2
      const scale = height / cropHeight
      doc.addImage(image.dataUrl, image.format, x, y - offsetY * scale, width, properties.height * scale)
    }
    return true
  } catch {
    return false
  }
}

function drawImagePanel(
  doc: PdfDocument,
  image: LoadedImage | null,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string
) {
  doc.setFillColor(...LIGHT)
  doc.roundedRect(x, y, width, height, 6, 6, "F")

  const added = drawImageContain(doc, image, x, y, width, height, 5)
  if (!added) {
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(1)
    doc.roundedRect(x + 4, y + 4, width - 8, height - 8, 4, 4, "S")

    doc.setDrawColor(148, 176, 176)
    doc.setLineWidth(1.4)
    doc.circle(x + width / 2, y + height / 2 - 10, 12, "S")
    doc.line(x + width / 2 + 8, y + height / 2 - 2, x + width / 2 + 16, y + height / 2 + 6)

    setText(doc, 7.5, MUTED, "bold")
    doc.text(label.toUpperCase(), x + width / 2, y + height - 16, { align: "center", maxWidth: width - 20 })
  }
}

function drawContentHeader(doc: PdfDocument, pageWidth: number, section: string, module: AppModule) {
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F")
  doc.setFillColor(...ACCENT)
  doc.rect(0, HEADER_HEIGHT, pageWidth, 3, "F")

  setText(doc, 13, WHITE, "bold")
  doc.text("MEDLINK EXPEDITES", MARGIN, 29)

  setText(doc, 8, [180, 220, 216], "normal")
  doc.text(getModule(module).catalogueTitle, MARGIN, 48)

  setText(doc, 8.5, WHITE, "normal")
  doc.text("info@medlinkexpedite.co.ke  |  +254 743 325 746", pageWidth - MARGIN, 29, { align: "right" })

  setText(doc, 8, [180, 220, 216], "bold")
  doc.text(section, pageWidth - MARGIN, 48, { align: "right" })
}

function addContentPage(doc: PdfDocument, pageWidth: number, section: string, module: AppModule) {
  doc.addPage()
  drawContentHeader(doc, pageWidth, section, module)
  return { y: HEADER_HEIGHT + 28, column: 0 }
}

function drawCover(
  doc: PdfDocument,
  pageWidth: number,
  pageHeight: number,
  products: CatalogueProduct[],
  images: Map<string, LoadedImage | null>,
  categoryCount: number,
  module: AppModule
) {
  const moduleInfo = getModule(module)
  const contentWidth = pageWidth - MARGIN * 2

  doc.setFillColor(...TEAL)
  doc.rect(0, 0, pageWidth, pageHeight, "F")

  doc.setFillColor(10, 78, 78)
  doc.circle(pageWidth - 52, 82, 122, "F")
  doc.setFillColor(11, 91, 89)
  doc.circle(pageWidth - 18, 176, 68, "F")

  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2])
  doc.roundedRect(MARGIN, 44, 156, 58, 7, 7, "F")
  const logoDrawn = drawImageContain(doc, images.get("/colorlogo.png") || null, MARGIN + 8, 50, 140, 46, 2)
  if (!logoDrawn) {
    setText(doc, 14, TEAL, "bold")
    doc.text("MEDLINK", MARGIN + 18, 78)
  }

  setText(doc, 9, [180, 220, 216], "normal")
  doc.text("info@medlinkexpedite.co.ke", pageWidth - MARGIN, 58, { align: "right" })
  doc.text("+254 743 325 746", pageWidth - MARGIN, 76, { align: "right" })

  doc.setFillColor(...ACCENT)
  doc.rect(MARGIN, 130, 54, 4, "F")

  setText(doc, 9, [151, 223, 212], "bold")
  doc.text(`${moduleInfo.catalogueKicker}  ${new Date().getFullYear()}`, MARGIN, 157)

  setText(doc, 30, WHITE, "bold")
  doc.text(moduleInfo.catalogueTitle.replace(/ CATALOGUE$/, "").trim(), MARGIN, 194)
  doc.text("PRODUCT CATALOGUE", MARGIN, 229)

  setText(doc, 11, [199, 231, 227], "normal")
  doc.text(moduleInfo.catalogueIntro, MARGIN, 257, { maxWidth: contentWidth - 40 })

  const stats = [
    { value: `${products.length}`, label: "PRODUCTS" },
    { value: `${categoryCount}`, label: "CATEGORIES" },
    { value: "KSh", label: "PRICING" },
  ]
  const statGap = 12
  const statWidth = (contentWidth - statGap * 2) / 3
  stats.forEach((stat, index) => {
    const x = MARGIN + index * (statWidth + statGap)
    doc.setFillColor(11, 87, 86)
    doc.roundedRect(x, 282, statWidth, 46, 6, 6, "F")
    setText(doc, 16, WHITE, "bold")
    doc.text(stat.value, x + 14, 305)
    setText(doc, 7.5, [151, 223, 212], "bold")
    doc.text(stat.label, x + statWidth - 14, 307, { align: "right" })
  })

  const heroY = 342
  const heroHeight = 190
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2])
  doc.roundedRect(MARGIN - 3, heroY - 3, contentWidth + 6, heroHeight + 6, 8, 8, "F")
  const heroAdded = drawImageCover(doc, images.get("/hero.jpg") || null, MARGIN, heroY, contentWidth, heroHeight)
  if (!heroAdded) {
    doc.setFillColor(...LIGHT)
    doc.rect(MARGIN, heroY, contentWidth, heroHeight, "F")
    setText(doc, 13, TEAL, "bold")
    doc.text(moduleInfo.catalogueHero, MARGIN + contentWidth / 2, heroY + heroHeight / 2, { align: "center" })
  }

  const gallery = products.slice(0, 3)
  if (gallery.length > 0) {
    const gap = 12
    const thumbWidth = (contentWidth - gap * (gallery.length - 1)) / gallery.length
    const thumbY = 548
    const thumbHeight = 82

    gallery.forEach((product, index) => {
      const x = MARGIN + index * (thumbWidth + gap)
      drawImagePanel(doc, images.get(product.image) || null, x, thumbY, thumbWidth, thumbHeight, product.name)

      doc.setFillColor(11, 87, 86)
      doc.roundedRect(x, thumbY + thumbHeight + 6, thumbWidth, 3, 1.5, 1.5, "F")
      setText(doc, 7.5, WHITE, "bold")
      doc.text(splitLines(doc, product.name, thumbWidth - 4, 1)[0] || "", x, thumbY + thumbHeight + 22)
    })
  }

  doc.setFillColor(8, 72, 72)
  doc.roundedRect(MARGIN, 684, contentWidth, 102, 8, 8, "F")
  doc.setFillColor(...ACCENT)
  doc.rect(MARGIN, 684, 5, 102, "F")

  setText(doc, 13, WHITE, "bold")
  doc.text("REQUEST A FORMAL QUOTE", MARGIN + 22, 713)
  setText(doc, 9, [199, 231, 227], "normal")
  doc.text(
    "All prices are indicative in Kenya Shillings. Ask us about availability, delivery, installation and service plans.",
    MARGIN + 22,
    733,
    { maxWidth: contentWidth - 230 }
  )

  setText(doc, 9, WHITE, "bold")
  doc.text("Medlink Expedites", pageWidth - MARGIN - 22, 714, { align: "right" })
  setText(doc, 8.5, [199, 231, 227], "normal")
  doc.text("info@medlinkexpedite.co.ke", pageWidth - MARGIN - 22, 732, { align: "right" })
  doc.text("+254 743 325 746", pageWidth - MARGIN - 22, 749, { align: "right" })
  doc.text("Nairobi, Kenya", pageWidth - MARGIN - 22, 766, { align: "right" })
}

function drawGuidePage(
  doc: PdfDocument,
  pageWidth: number,
  pageHeight: number,
  categories: string[],
  grouped: Map<string, CatalogueProduct[]>,
  module: AppModule
) {
  const moduleInfo = getModule(module)
  const cursor = addContentPage(doc, pageWidth, "CATALOGUE GUIDE", module)
  const contentWidth = pageWidth - MARGIN * 2

  setText(doc, 22, INK, "bold")
  doc.text("Welcome to Medlink Expedites", MARGIN, cursor.y + 6)

  setText(doc, 10, MUTED, "normal")
  const intro = `${moduleInfo.catalogueIntro} Clear category groupings, product photography and indicative KSh pricing are included throughout.`
  let y = drawLines(doc, splitLines(doc, intro, contentWidth), MARGIN, cursor.y + 31, 15, MUTED, 10)

  y += 24
  const steps = [
    {
      number: "01",
      title: "Browse by category",
      body: "Find the right equipment quickly using the category sections throughout this catalogue.",
    },
    {
      number: "02",
      title: "Request a quote",
      body: "Prices are indicative. Contact our sales team for a formal quote and current availability.",
    },
    {
      number: "03",
      title: "Plan delivery",
      body: "We support delivery, installation and after-sales service across Kenya.",
    },
  ]
  const stepGap = 12
  const stepWidth = (contentWidth - stepGap * 2) / 3
  const stepY = y
  const stepHeight = 116

  steps.forEach((step, index) => {
    const x = MARGIN + index * (stepWidth + stepGap)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, stepY, stepWidth, stepHeight, 7, 7, "F")
    doc.setFillColor(...ACCENT)
    doc.circle(x + 22, stepY + 24, 12, "F")

    setText(doc, 8, WHITE, "bold")
    doc.text(step.number, x + 22, stepY + 27, { align: "center" })

    setText(doc, 10.5, INK, "bold")
    doc.text(step.title, x + 14, stepY + 52, { maxWidth: stepWidth - 28 })

    setText(doc, 8.5, MUTED, "normal")
    doc.text(step.body, x + 14, stepY + 70, { maxWidth: stepWidth - 28 })
  })

  y = stepY + stepHeight + 30
  setText(doc, 12, INK, "bold")
  doc.text("CATEGORIES IN THIS EDITION", MARGIN, y)

  y += 18
  doc.setFillColor(...TEAL)
  doc.roundedRect(MARGIN, y, contentWidth, 28, 4, 4, "F")
  setText(doc, 8.5, WHITE, "bold")
  doc.text("CATEGORY", MARGIN + 14, y + 18)
  doc.text("PRODUCTS", MARGIN + contentWidth - 130, y + 18)
  doc.text("SECTION", MARGIN + contentWidth - 14, y + 18, { align: "right" })

  y += 28
  categories.forEach((category, index) => {
    const rowHeight = 25
    if (index % 2 === 0) {
      doc.setFillColor(247, 250, 250)
      doc.rect(MARGIN, y, contentWidth, rowHeight, "F")
    }
    setText(doc, 9.5, INK, "bold")
    doc.text(category, MARGIN + 14, y + 16)
    setText(doc, 9, MUTED, "normal")
    doc.text(`${grouped.get(category)?.length || 0}`, MARGIN + contentWidth - 130, y + 16)
    setText(doc, 8, ACCENT, "bold")
    doc.text("PRODUCT DIRECTORY", MARGIN + contentWidth - 14, y + 16, { align: "right" })
    y += rowHeight
  })

  doc.setDrawColor(...BORDER)
  doc.line(MARGIN, y, MARGIN + contentWidth, y)

  let ctaY = y + 26
  if (ctaY + 108 > pageHeight - 54) {
    doc.addPage()
    drawContentHeader(doc, pageWidth, "CATALOGUE GUIDE", module)
    ctaY = HEADER_HEIGHT + 34
  }

  doc.setFillColor(232, 248, 245)
  doc.roundedRect(MARGIN, ctaY, contentWidth, 108, 8, 8, "F")
  doc.setFillColor(...ACCENT)
  doc.rect(MARGIN, ctaY, 5, 108, "F")

  setText(doc, 14, TEAL, "bold")
  doc.text("Need a formal quotation or product specification sheet?", MARGIN + 22, ctaY + 30)
  setText(doc, 9.5, MUTED, "normal")
  doc.text(
    "Send us the products you are interested in and our team will prepare pricing, lead times and delivery options for your facility.",
    MARGIN + 22,
    ctaY + 50,
    { maxWidth: contentWidth - 44 }
  )
  setText(doc, 9.5, TEAL, "bold")
  doc.text("info@medlinkexpedite.co.ke    |    +254 743 325 746", MARGIN + 22, ctaY + 84)
}

function drawCategoryRibbon(doc: PdfDocument, category: string, count: number, x: number, y: number, width: number) {
  doc.setFillColor(8, 72, 72)
  doc.roundedRect(x, y, width, RIBBON_HEIGHT, 5, 5, "F")
  doc.setFillColor(...ACCENT)
  doc.rect(x, y, 4, RIBBON_HEIGHT, "F")

  setText(doc, 9, WHITE, "bold")
  doc.text(category.toUpperCase(), x + 14, y + 18)

  setText(doc, 8, [180, 220, 216], "normal")
  doc.text(`${count} product${count === 1 ? "" : "s"}`, x + width - 14, y + 18, { align: "right" })
}

function drawStockBadge(doc: PdfDocument, product: CatalogueProduct, x: number, y: number, width: number) {
  const label = product.inStock ? "IN STOCK" : "TO ORDER"
  const badgeWidth = 62
  doc.setFillColor(product.inStock ? 5 : 194, product.inStock ? 120 : 120, product.inStock ? 86 : 53)
  doc.roundedRect(x + width - badgeWidth - 10, y + 10, badgeWidth, 17, 5, 5, "F")
  setText(doc, 7, WHITE, "bold")
  doc.text(label, x + width - badgeWidth / 2 - 10, y + 22, { align: "center" })
}

function drawProductCard(
  doc: PdfDocument,
  product: CatalogueProduct,
  image: LoadedImage | null,
  x: number,
  y: number,
  width: number,
  height: number
) {
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2])
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.8)
  doc.roundedRect(x, y, width, height, 7, 7, "FD")

  doc.setFillColor(...ACCENT)
  doc.rect(x + 12, y, width - 24, 2.5, "F")

  drawImagePanel(doc, image, x + 10, y + 10, width - 20, 96, product.name)
  drawStockBadge(doc, product, x, y, width)

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0
  if (discount > 0) {
    doc.setFillColor(194, 120, 53)
    doc.roundedRect(x + 18, y + 18, 42, 17, 5, 5, "F")
    setText(doc, 7, WHITE, "bold")
    doc.text(`-${discount}%`, x + 39, y + 29, { align: "center" })
  }

  setText(doc, 7.5, ACCENT, "bold")
  doc.text(splitLines(doc, product.category.toUpperCase(), width - 92, 1)[0] || "", x + 14, y + 120)

  const metadata = [product.brand, product.strength, product.dosageForm]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("  ·  ")
  if (metadata) {
    setText(doc, 7, MUTED, "normal")
    doc.text(splitLines(doc, metadata, width - 130, 1)[0] || "", x + width - 14, y + 120, { align: "right" })
  }

  const nameLines = splitLines(doc, product.name, width - 28, 2)
  let textY = drawLines(doc, nameLines, x + 14, y + 137, 13, INK, 12, "bold")

  textY += 15
  const priceText = formatPrice(product.price)
  setText(doc, 12, TEAL, "bold")
  doc.text(priceText, x + 14, textY)

  if (discount > 0 && product.compareAtPrice) {
    const compareX = x + 14 + doc.getTextWidth(priceText) + 8
    const compareText = formatPrice(product.compareAtPrice)
    setText(doc, 8, MUTED, "normal")
    doc.text(compareText, compareX, textY)
    const compareWidth = doc.getTextWidth(compareText)
    doc.setDrawColor(...MUTED)
    doc.setLineWidth(0.6)
    doc.line(compareX, textY - 2.5, compareX + compareWidth, textY - 2.5)
  }

  if (product.requiresPrescription) {
    const rxX = x + width - 38
    doc.setFillColor(219, 234, 254)
    doc.roundedRect(rxX, textY - 11, 26, 15, 4, 4, "F")
    setText(doc, 7, TEAL, "bold")
    doc.text("Rx", rxX + 13, textY, { align: "center" })
  }

  textY += 16
  const description = splitLines(doc, product.description, width - 28, 2)
  textY = drawLines(doc, description, x + 14, textY, 10, MUTED, 8.2)

  textY += 12
  setText(doc, 7, MUTED, "bold")
  doc.text("KEY SPECS", x + 14, textY)
  const specs = product.specs.length > 0 ? product.specs.slice(0, 3).join("   •   ") : "Available on request"
  drawLines(doc, splitLines(doc, specs, width - 28, 2), x + 14, textY + 12, 9, INK, 7.8)

  const highlight = product.features.length > 0 ? `• ${product.features[0]}` : "Full details available on request"
  drawLines(doc, splitLines(doc, highlight, width - 28, 1), x + 14, y + height - 14, 9, MUTED, 7.8)
}

function drawProductPages(
  doc: PdfDocument,
  pageWidth: number,
  pageHeight: number,
  categories: string[],
  grouped: Map<string, CatalogueProduct[]>,
  images: Map<string, LoadedImage | null>,
  module: AppModule
) {
  const contentWidth = pageWidth - MARGIN * 2
  const maxY = pageHeight - 54
  let cursor = addContentPage(doc, pageWidth, "PRODUCT DIRECTORY", module)
  let section = "PRODUCT DIRECTORY"

  const newPage = () => {
    cursor = addContentPage(doc, pageWidth, section, module)
  }

  const ribbonAndCard = RIBBON_HEIGHT + 10 + CARD_HEIGHT

  categories.forEach((category) => {
    const products = grouped.get(category) || []

    if (cursor.y + ribbonAndCard > maxY) {
      newPage()
    }

    drawCategoryRibbon(doc, category, products.length, MARGIN, cursor.y, contentWidth)
    cursor.y += RIBBON_HEIGHT + 10

    products.forEach((product) => {
      if (cursor.column >= 2) {
        cursor.y += CARD_HEIGHT + CARD_GAP
        cursor.column = 0
      }

      if (cursor.y + CARD_HEIGHT > maxY) {
        section = `${category.toUpperCase()} (CONTINUED)`
        newPage()
        drawCategoryRibbon(doc, category, products.length, MARGIN, cursor.y, contentWidth)
        cursor.y += RIBBON_HEIGHT + 10
        cursor.column = 0
      }

      const x = MARGIN + cursor.column * (CARD_WIDTH + CARD_GAP)
      drawProductCard(doc, product, images.get(product.image) || null, x, cursor.y, CARD_WIDTH, CARD_HEIGHT)
      cursor.column += 1
    })

    cursor.y += CARD_HEIGHT + CARD_GAP
    cursor.column = 0
    section = "PRODUCT DIRECTORY"
  })
}

function drawFooters(doc: PdfDocument, pageWidth: number, pageHeight: number, module: AppModule) {
  const pageCount = doc.getNumberOfPages()

  for (let page = 2; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.7)
    doc.line(MARGIN, pageHeight - 38, pageWidth - MARGIN, pageHeight - 38)

    setText(doc, 8, MUTED, "normal")
    doc.text(`Medlink Expedites  |  ${getModule(module).footerDescriptor}`, MARGIN, pageHeight - 21)
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 21, { align: "right" })
  }
}

export async function buildCataloguePdf(
  products: CatalogueProduct[],
  origin?: string,
  module: AppModule = DEFAULT_MODULE
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const sortedProducts = [...products].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  const grouped = new Map<string, CatalogueProduct[]>()
  for (const product of sortedProducts) {
    const existing = grouped.get(product.category) || []
    existing.push(product)
    grouped.set(product.category, existing)
  }
  const categories = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b))

  const assets = Array.from(
    new Set(["/colorlogo.png", "/hero.jpg", ...sortedProducts.map((product) => normalizeAsset(product.image)).filter(Boolean)])
  ) as string[]
  const imageEntries = await Promise.all(
    assets.map(async (asset) => [asset, await loadImage(asset, origin)] as const)
  )
  const images = new Map(imageEntries)

  drawCover(doc, pageWidth, pageHeight, sortedProducts, images, categories.length, module)
  drawGuidePage(doc, pageWidth, pageHeight, categories, grouped, module)
  drawProductPages(doc, pageWidth, pageHeight, categories, grouped, images, module)
  drawFooters(doc, pageWidth, pageHeight, module)

  return new Uint8Array(doc.output("arraybuffer"))
}
