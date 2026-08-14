import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { getCategoryMeta } from "@/lib/category-images";
import { formatCurrency } from "@/lib/utils";

interface FeaturedProduct {
  name: string;
  description: string;
  price: number;
  salePrice?: number;
}

interface FeaturedCategory {
  key: string;
  products: FeaturedProduct[];
}

// A curated, static selection of products for the public catalog page.
// This is intentionally not wired to the database — it's a lightweight
// showcase, not the admin product list.
const FEATURED_CATEGORIES: FeaturedCategory[] = [
  {
    key: "MANGO",
    products: [
      { name: "Alphonsa Mango", description: "King of mangoes — saffron-coloured, rich aromatic flavour", price: 600, salePrice: 1200 },
      { name: "Kottukonam Mango", description: "Popular Kerala mango variety with sweet, fiberless pulp", price: 600, salePrice: 1200 },
      { name: "All Season Mango", description: "Grafted mango that bears fruit across multiple seasons", price: 500, salePrice: 1000 },
      { name: "Banganapalli Mango", description: "GI-tagged Andhra mango, thin-skinned with minimal fibre", price: 600, salePrice: 1000 },
    ],
  },
  {
    key: "JACKFRUIT",
    products: [
      { name: "Muttomvarikka Jackfruit", description: "Popular Kerala jackfruit with firm yellow perianths, great for cooking", price: 350, salePrice: 500 },
      { name: "Vietnam Super Early Jackfruit", description: "Grafted jackfruit bearing fruit in 2–3 years, compact size", price: 750, salePrice: 1000 },
      { name: "Red Jackfruit", description: "Rare red-perianth jackfruit with sweet, aromatic taste", price: 500, salePrice: 1000 },
    ],
  },
  {
    key: "COCONUT",
    products: [
      { name: "Kuttiadi Coconut", description: "High-yielding traditional Kerala coconut variety from Kuttiadi", price: 350, salePrice: 500 },
      { name: "Malaysian Green Dwarf Coconut", description: "Compact dwarf variety, heavy yielder with green fruit", price: 650 },
      { name: "DXT Coconut", description: "Dwarf × Tall hybrid, high-yield and disease-resistant", price: 650 },
    ],
  },
  {
    key: "SPICES",
    products: [
      { name: "Nutmeg Plant (Netmeg)", description: "Yields both nutmeg and mace; thrives in humid tropical climate", price: 750, salePrice: 1000 },
      { name: "Bush Pepper", description: "Compact pepper vine ideal for grow bags and home gardens", price: 300, salePrice: 450 },
      { name: "Cardamom (Elam)", description: "Queen of spices; shade-loving plant for humid regions", price: 200 },
      { name: "Karuvapatta (Cinnamon)", description: "True cinnamon plant, bark used as a spice and herbal remedy", price: 150 },
    ],
  },
  {
    key: "FRUIT_PLANTS",
    products: [
      { name: "Jaboticaba", description: "Brazilian grape tree — unique trunk-bearing dark purple fruits", price: 750, salePrice: 1000 },
      { name: "Star Fruit (Carambola)", description: "Star-shaped cross-section fruit, sweet-tart flavour", price: 500 },
      { name: "Custard Apple (Atha)", description: "Creamy sweet flesh with a custard-like texture", price: 500 },
    ],
  },
];

export default function CustomerCatalogPage() {
  return (
    <>
      {/* Header */}
      <header className="border-b border-[#e2e8f0] bg-[#1E4D3D]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center sm:py-10">
          <Logo size="md" />
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              LeafLand Kerala
            </h1>
            <p className="mt-1 text-sm text-white/80 sm:text-base">
              A selection of plants, saplings &amp; spices from our nursery
            </p>
          </div>
        </div>
      </header>

      {/* Category nav */}
      <nav className="sticky top-0 z-10 border-b border-[#e2e8f0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 py-3 text-sm">
          {FEATURED_CATEGORIES.map(({ key }) => {
            const meta = getCategoryMeta(key);
            return (
              <a
                key={key}
                href={`#${key}`}
                className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#e2e8f0] px-3 py-1.5 font-medium text-[#1a1a1a] transition-colors hover:border-[#1E4D3D] hover:text-[#1E4D3D]"
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Product sections */}
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:py-10">
        {FEATURED_CATEGORIES.map(({ key, products }) => {
          const meta = getCategoryMeta(key);
          return (
            <section key={key} id={key} className="scroll-mt-16">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-2xl leading-none">{meta.emoji}</span>
                <h2 className="text-lg font-bold text-[#1a1a1a] sm:text-xl">
                  {meta.label}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Card key={product.name} className="overflow-hidden">
                    <div className={`flex h-32 items-center justify-center ${meta.bg}`}>
                      <span className="text-5xl leading-none">{meta.emoji}</span>
                    </div>
                    <div className="p-4">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight text-[#1a1a1a]">
                          {product.name}
                        </h3>
                        <Badge variant="default" className="flex-shrink-0 text-[10px]">
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="mb-3 text-sm text-[#64748b]">
                        {product.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#1E4D3D]">
                          {formatCurrency(product.price)}
                        </span>
                        {product.salePrice && (
                          <span className="text-sm font-medium text-[#2E7D32]">
                            Sale: {formatCurrency(product.salePrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] bg-white px-4 py-8 text-center">
        <p className="text-sm text-[#64748b]">
          This is a preview of our catalogue. Visit or contact LeafLand Kerala for full pricing,
          availability, and orders.
        </p>
      </footer>
    </>
  );
}
