export interface CategoryMeta {
  emoji: string;
  color: string;
  bg: string;
  label: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  SEEDS:                 { emoji: "🌱", color: "text-green-700",   bg: "bg-green-50",   label: "Seeds" },
  FERTILIZERS:           { emoji: "🌾", color: "text-yellow-700",  bg: "bg-yellow-50",  label: "Fertilizers" },
  PESTICIDES:            { emoji: "🧪", color: "text-red-700",     bg: "bg-red-50",     label: "Pesticides" },
  ORGANIC_PRODUCTS:      { emoji: "🌿", color: "text-green-800",   bg: "bg-green-100",  label: "Organic" },
  FARMING_TOOLS:         { emoji: "🔧", color: "text-gray-700",    bg: "bg-gray-100",   label: "Tools" },
  IRRIGATION_SUPPLIES:   { emoji: "💧", color: "text-blue-700",    bg: "bg-blue-50",    label: "Irrigation" },
  AGRICULTURAL_EQUIPMENT:{ emoji: "🚜", color: "text-amber-700",   bg: "bg-amber-50",   label: "Equipment" },
  MANGO:                 { emoji: "🥭", color: "text-orange-700",  bg: "bg-orange-50",  label: "Mango" },
  JACKFRUIT:             { emoji: "🌳", color: "text-lime-700",    bg: "bg-lime-50",    label: "Jackfruit" },
  COCONUT:               { emoji: "🥥", color: "text-amber-800",   bg: "bg-amber-50",   label: "Coconut" },
  SPICES:                { emoji: "🌶️", color: "text-red-700",     bg: "bg-red-50",     label: "Spices" },
  ORNAMENTAL_PALMS:      { emoji: "🌴", color: "text-emerald-700", bg: "bg-emerald-50", label: "Palms" },
  FLOWERS:               { emoji: "🌸", color: "text-pink-700",    bg: "bg-pink-50",    label: "Flowers" },
  INDOOR_PLANTS:         { emoji: "🪴", color: "text-green-700",   bg: "bg-lime-50",    label: "Indoor" },
  ORNAMENTAL_PLANTS:     { emoji: "🌺", color: "text-purple-700",  bg: "bg-purple-50",  label: "Ornamental" },
  TIMBER_TREES:          { emoji: "🌲", color: "text-green-900",   bg: "bg-green-100",  label: "Timber" },
  FRUIT_PLANTS:          { emoji: "🍊", color: "text-orange-700",  bg: "bg-orange-50",  label: "Fruit Plants" },
  GROW_SUPPLIES:         { emoji: "🪣", color: "text-teal-700",    bg: "bg-teal-50",    label: "Supplies" },
};

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? { emoji: "🌿", color: "text-gray-600", bg: "bg-gray-50", label: category };
}
