import type { CatalogueProduct } from "./types"

export const PHARMACY_CATEGORIES = [
  "Prescription Medicines",
  "Over-the-Counter",
  "Vaccines",
  "Supplements",
  "Medical Supplies",
  "Personal Care",
  "Emergency Care",
]

/**
 * Starter pharmacy range. Admin can replace the placeholder photos with
 * real product images from /admin/products at any time.
 */
export const PHARMACY_PRODUCTS: CatalogueProduct[] = [
  {
    id: "ph-1",
    module: "pharmacy",
    name: "Amoxicillin 500mg Capsules",
    category: "Prescription Medicines",
    price: 350,
    image: "/placeholder.jpg",
    description:
      "Broad-spectrum antibiotic capsules used in the treatment of bacterial infections of the respiratory tract, urinary tract and skin. Dispensed on prescription.",
    specs: ["500mg capsules", "Pack of 20", "Prescription required", "Store below 30°C"],
    features: [
      "Effective against a wide range of bacterial infections",
      "Clinically verified quality and potency",
      "Clear dosage information on every pack",
      "Sealed, tamper-evident packaging",
      "Suitable for adult patients",
    ],
    inStock: true,
  },
  {
    id: "ph-2",
    module: "pharmacy",
    name: "Paracetamol 500mg Tablets",
    category: "Over-the-Counter",
    price: 120,
    image: "/placeholder.jpg",
    description:
      "Trusted paracetamol tablets for the relief of mild to moderate pain and reduction of fever. Suitable for everyday household use.",
    specs: ["500mg tablets", "Pack of 20", "Adults and children over 12", "Store in a dry place"],
    features: [
      "Fast-acting relief from headache and body pain",
      "Helps reduce fever associated with common infections",
      "Gentle on the stomach when taken as directed",
      "Clearly labelled dosage instructions",
      "Compact pack for home or travel",
    ],
    inStock: true,
  },
  {
    id: "ph-3",
    module: "pharmacy",
    name: "Artemether-Lumefantrine Tablets",
    category: "Prescription Medicines",
    price: 480,
    image: "/placeholder.jpg",
    description:
      "Artemisinin-based combination therapy for the treatment of uncomplicated malaria. Supplied in a complete course pack with patient guidance.",
    specs: ["20mg/120mg", "24-tablet course", "Prescription required", "Store below 30°C"],
    features: [
      "WHO-recommended first-line malaria treatment",
      "Complete course in one convenient pack",
      "Clear age and weight based dosing guide",
      "Quality-assured pharmaceutical sourcing",
      "Sealed and tamper-evident packaging",
    ],
    inStock: true,
  },
  {
    id: "ph-4",
    module: "pharmacy",
    name: "Hepatitis B Vaccine (Adult)",
    category: "Vaccines",
    price: 2800,
    image: "/placeholder.jpg",
    description:
      "Sterile adult hepatitis B vaccine for active immunisation against hepatitis B infection. Supplied in a single-dose vial for clinical use.",
    specs: ["20mcg / 1ml", "Single-dose vial", "Cold chain required", "Administered by a clinician"],
    features: [
      "Protective active immunisation against hepatitis B",
      "Suitable for healthcare workers and at-risk adults",
      "Manufactured under strict quality controls",
      "Supplied with storage and handling guidance",
      "Single-use sterile vial",
    ],
    inStock: true,
  },
  {
    id: "ph-5",
    module: "pharmacy",
    name: "Vitamin D3 2000IU Capsules",
    category: "Supplements",
    price: 650,
    image: "/placeholder.jpg",
    description:
      "Daily vitamin D3 supplement that supports bone health, immune function and calcium absorption. Ideal for adults with limited sun exposure.",
    specs: ["2000IU softgel", "Pack of 60", "Once daily", "Gluten free"],
    features: [
      "Supports strong bones and teeth",
      "Contributes to a healthy immune system",
      "Aids calcium and phosphorus absorption",
      "Easy-to-swallow softgel capsules",
      "Two-month supply in one pack",
    ],
    inStock: true,
  },
  {
    id: "ph-6",
    module: "pharmacy",
    name: "Sterile Syringes 5ml (Box of 100)",
    category: "Medical Supplies",
    price: 950,
    image: "/placeholder.jpg",
    description:
      "Disposable sterile 5ml syringes for clinical injections and sample collection. Individually wrapped for guaranteed sterility.",
    specs: ["5ml capacity", "Box of 100", "Individually wrapped", "Luer slip tip"],
    features: [
      "Sterile, single-use design",
      "Smooth plunger action for accurate dosing",
      "Clear graduated markings",
      "Individually sealed for safe handling",
      "Ideal for clinics, pharmacies and labs",
    ],
    inStock: true,
  },
  {
    id: "ph-7",
    module: "pharmacy",
    name: "Oral Rehydration Salt Sachets",
    category: "Over-the-Counter",
    price: 80,
    image: "/placeholder.jpg",
    description:
      "Oral rehydration salts for the prevention and treatment of dehydration caused by diarrhoea, vomiting or heat exposure.",
    specs: ["WHO formula", "Sachet makes 1 litre", "Pack of 10", "Store in a cool dry place"],
    features: [
      "Restores essential fluids and electrolytes",
      "Simple mix-with-water preparation",
      "Suitable for adults and children",
      "Long shelf life in sealed sachets",
      "Essential for travel and household first aid",
    ],
    inStock: true,
  },
  {
    id: "ph-8",
    module: "pharmacy",
    name: "Digital Thermometer",
    category: "Personal Care",
    price: 420,
    image: "/placeholder.jpg",
    description:
      "Fast-reading digital thermometer with a clear LCD display and memory function. A practical addition to any home medicine cabinet.",
    specs: ["LCD display", "30-second reading", "Memory function", "Auto shut-off"],
    features: [
      "Quick and accurate temperature readings",
      "Easy-to-read backlit display",
      "Stores the last recorded reading",
      "Hygienic, easy-to-clean tip",
      "Compact and lightweight design",
    ],
    inStock: true,
  },
  {
    id: "ph-9",
    module: "pharmacy",
    name: "Emergency First Aid Kit",
    category: "Emergency Care",
    price: 1850,
    image: "/placeholder.jpg",
    description:
      "Compact first aid kit containing essential dressings, antiseptics and tools for handling minor injuries at home, work or on the move.",
    specs: ["32 pieces", "Hard carry case", "Wall mountable", "Refillable"],
    features: [
      "Organised compartments for fast access",
      "Includes sterile dressings and bandages",
      "Antiseptic wipes and adhesive plasters included",
      "Durable, portable carry case",
      "Suitable for homes, offices and vehicles",
    ],
    inStock: false,
  },
]
