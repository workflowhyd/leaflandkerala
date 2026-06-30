/**
 * Seeds all products from the Agricultural Farm, Mannuthy Thrissur catalogue.
 * Run: npx tsx prisma/seed-products.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { randomUUID } from "crypto";

if (typeof globalThis.WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = ws;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const now = () => new Date().toISOString();

type ProductInput = {
  name: string;
  category: string;
  price: number;
  salePrice?: number;
  stock?: number;
  description?: string;
};

// SKUs 1001–1200 assigned sequentially
const products: ProductInput[] = [
  // ── MANGOES (1001–1014) ───────────────────────────────────────────────────
  { name: "All Season Mango",       category: "MANGO", price: 500,  salePrice: 1000, stock: 50, description: "Grafted mango that bears fruit across multiple seasons" },
  { name: "Kottukonam Mango",       category: "MANGO", price: 600,  salePrice: 1200, stock: 40, description: "Popular Kerala mango variety with sweet, fiberless pulp" },
  { name: "Alphonsa Mango",         category: "MANGO", price: 600,  salePrice: 1200, stock: 40, description: "King of mangoes — saffron-coloured, rich aromatic flavour" },
  { name: "Himapasanth Mango",      category: "MANGO", price: 600,  salePrice: 1000, stock: 30, description: "Hybrid mango with large fruit and excellent shelf life" },
  { name: "Malgova Mango",          category: "MANGO", price: 600,  salePrice: 1000, stock: 30, description: "Tamil Nadu origin large mango, sweet and juicy" },
  { name: "Banganapalli Mango",     category: "MANGO", price: 600,  salePrice: 1000, stock: 35, description: "GI-tagged Andhra mango, thin-skinned with minimal fibre" },
  { name: "Nadashala Mango",        category: "MANGO", price: 600,  salePrice: 1000, stock: 25, description: "Traditional Kerala mango variety, medium-sized fruit" },
  { name: "Mallika Mango",          category: "MANGO", price: 600,  salePrice: 1200, stock: 35, description: "IARI hybrid (Neelum × Dashehari), juicy and flavourful" },
  { name: "Sindhooram Mango",       category: "MANGO", price: 600,  salePrice: 1200, stock: 30, description: "Deep red-skinned mango with sweet orange flesh" },
  { name: "Baramasi Mango",         category: "MANGO", price: 500,  salePrice: 1000, stock: 40, description: "Year-round bearing mango variety, ideal for home gardens" },
  { name: "Thailand Mango (ATM)",   category: "MANGO", price: 500,  salePrice: 1000, stock: 45, description: "Thai variety with long green fruit, eaten raw or ripe" },
  { name: "Priyoor Mango",          category: "MANGO", price: 750,  stock: 20, description: "Kerala heritage mango from Kannur, distinct aroma and flavour" },
  { name: "Moovandan Mango",        category: "MANGO", price: 600,  stock: 20, description: "Classic Kerala mango that ripens in the early season" },
  { name: "Chandrakaran Mango",     category: "MANGO", price: 750,  stock: 20, description: "Rare Kerala variety with crescent-shaped fruit and rich flavour" },

  // ── JACKFRUIT (1015–1020) ─────────────────────────────────────────────────
  { name: "Muttomvarikka Jackfruit",       category: "JACKFRUIT", price: 350, salePrice: 500,  stock: 40, description: "Popular Kerala jackfruit with firm yellow perianths, great for cooking" },
  { name: "Dung Suriya Jackfruit",         category: "JACKFRUIT", price: 500, salePrice: 1000, stock: 30, description: "High-yield jackfruit variety with large fruits" },
  { name: "Vietnam Super Early Jackfruit", category: "JACKFRUIT", price: 750, salePrice: 1000, stock: 25, description: "Grafted jackfruit bearing fruit in 2–3 years, compact size" },
  { name: "All Season Jackfruit",          category: "JACKFRUIT", price: 750, salePrice: 2500, stock: 20, description: "Produces fruits throughout the year, ideal for commercial farming" },
  { name: "Gumless Jackfruit",             category: "JACKFRUIT", price: 500, stock: 25, description: "Low-latex jackfruit variety, easy to cut and process" },
  { name: "Red Jackfruit",                 category: "JACKFRUIT", price: 500, salePrice: 1000, stock: 15, description: "Rare red-perianth jackfruit with sweet, aromatic taste" },

  // ── COCONUT (1021–1029) ───────────────────────────────────────────────────
  { name: "Kuttiadi Coconut",                category: "COCONUT", price: 350, salePrice: 500, stock: 60, description: "High-yielding traditional Kerala coconut variety from Kuttiadi" },
  { name: "Chowhound Yellow Dwarf Coconut",  category: "COCONUT", price: 500, stock: 40, description: "Yellow-fruited dwarf coconut, early bearer with tender water" },
  { name: "Ganga Bondam Coconut",            category: "COCONUT", price: 650, stock: 35, description: "Andhra dwarf variety with very sweet coconut water" },
  { name: "Malaysian Green Dwarf Coconut",   category: "COCONUT", price: 650, stock: 30, description: "Compact dwarf variety, heavy yielder with green fruit" },
  { name: "Malaysian Orange Dwarf Coconut",  category: "COCONUT", price: 500, stock: 30, description: "Ornamental and productive, orange-coloured coconut fruits" },
  { name: "Malaysian Yellow Dwarf Coconut",  category: "COCONUT", price: 650, stock: 30, description: "Early-bearing yellow dwarf variety with abundant fruit clusters" },
  { name: "Red Coconut",                     category: "COCONUT", price: 300, stock: 25, description: "Rare red-husked coconut, highly prized for traditional use" },
  { name: "DXT Coconut",                     category: "COCONUT", price: 650, stock: 40, description: "Dwarf × Tall hybrid, high-yield and disease-resistant" },
  { name: "Chavakkadan Green Dwarf Coconut", category: "COCONUT", price: 600, stock: 35, description: "Kerala local dwarf variety, widely cultivated for coconut water" },

  // ── SPICES & ARECANUT (1030–1041) ────────────────────────────────────────
  { name: "Nutmeg Plant (Netmeg)",    category: "SPICES", price: 750, salePrice: 1000, stock: 30, description: "Yields both nutmeg and mace; thrives in humid tropical climate" },
  { name: "Kudampuly (Gamboge)",      category: "SPICES", price: 500, salePrice: 1000, stock: 25, description: "Garcinia cambogia — fruit rind used in Kerala cooking and weight management" },
  { name: "Bush Pepper",              category: "SPICES", price: 300, salePrice: 450,  stock: 50, description: "Compact pepper vine ideal for grow bags and home gardens" },
  { name: "Grampu (Clove)",           category: "SPICES", price: 100, stock: 40, description: "Clove sapling — aromatic spice used in cooking and medicine" },
  { name: "Karuvapatta (Cinnamon)",   category: "SPICES", price: 150, stock: 35, description: "True cinnamon plant, bark used as a spice and herbal remedy" },
  { name: "Cardamom (Elam)",          category: "SPICES", price: 200, stock: 30, description: "Queen of spices; shade-loving plant for humid regions" },
  { name: "Mohit Nagar Arecanut",     category: "SPICES", price: 100, stock: 60, description: "High-yielding arecanut variety released by CPCRI" },
  { name: "Inter C Mangala Arecanut", category: "SPICES", price: 100, stock: 60, description: "Cross-bred arecanut with improved yield and disease resistance" },
  { name: "Sumangala Arecanut",       category: "SPICES", price: 100, stock: 60, description: "CPCRI-released variety with tolerance to yellow leaf disease" },
  { name: "Kazarkodan Arecanut",      category: "SPICES", price: 100, stock: 50, description: "Traditional Kerala arecanut variety from Kasaragod district" },
  { name: "Hirehalli Dwarf Arecanut", category: "SPICES", price: 500, stock: 25, description: "Dwarf variety, early bearer — fruit within 3–4 years of planting" },
  { name: "Mangala Arecanut",         category: "SPICES", price: 100, stock: 50, description: "CPCRI Mangala — one of the most popular high-yield varieties" },

  // ── ORNAMENTAL PALMS (1042–1053) ──────────────────────────────────────────
  { name: "Fox Tail Palm",          category: "ORNAMENTAL_PALMS", price: 0, stock: 20, description: "Elegant feather-leaf palm, grows 6–10 m tall" },
  { name: "Red Palm (Sealing Wax)", category: "ORNAMENTAL_PALMS", price: 0, stock: 15, description: "Ornamental clustering palm with striking red stems" },
  { name: "Triangle Palm",          category: "ORNAMENTAL_PALMS", price: 0, stock: 10, description: "Unique Madagascar palm with leaves arranged in three planes" },
  { name: "Royal Palm",             category: "ORNAMENTAL_PALMS", price: 0, stock: 15, description: "Tall stately avenue palm, classic for grand landscapes" },
  { name: "Merrilli Gold Palm",     category: "ORNAMENTAL_PALMS", price: 0, stock: 10, description: "Golden-leafed ornamental palm for gardens and avenues" },
  { name: "Date Palm",              category: "ORNAMENTAL_PALMS", price: 0, stock: 20, description: "Phoenix dactylifera — ornamental and fruit-bearing" },
  { name: "Licola Palm",            category: "ORNAMENTAL_PALMS", price: 0, stock: 10, description: "Slow-growing compact palm for home gardens and pots" },
  { name: "Bismarck Palm",          category: "ORNAMENTAL_PALMS", price: 0, stock: 8,  description: "Stunning silvery-blue fan palm, a focal point plant" },
  { name: "Arica Palm (Yellow Palm)", category: "ORNAMENTAL_PALMS", price: 0, stock: 30, description: "Areca catechu — popular indoor/outdoor ornamental clustering palm" },
  { name: "Shampain Palm",          category: "ORNAMENTAL_PALMS", price: 0, stock: 10, description: "Champagne palm with attractive golden trunk rings" },
  { name: "Finex Palm",             category: "ORNAMENTAL_PALMS", price: 0, stock: 10, description: "Fine-leaved ornamental palm suitable for tropical gardens" },
  { name: "Finger Palm",            category: "ORNAMENTAL_PALMS", price: 0, stock: 15, description: "Compact multi-stem palm, great for pots and small spaces" },

  // ── FLOWERS (1054–1073) ───────────────────────────────────────────────────
  { name: "Hibiscus Hybrid",   category: "FLOWERS", price: 0, stock: 50, description: "Double and single bloom hybrid hibiscus in multiple colours" },
  { name: "Melastoma",         category: "FLOWERS", price: 0, stock: 30, description: "Native purple-flowered shrub, attracts butterflies" },
  { name: "Vinca",             category: "FLOWERS", price: 0, stock: 60, description: "Low-maintenance flowering annual in pink, red, and white" },
  { name: "Salvia",            category: "FLOWERS", price: 0, stock: 40, description: "Colourful spike flowers in red, blue, and purple" },
  { name: "Tecoma",            category: "FLOWERS", price: 0, stock: 30, description: "Yellow/orange trumpet-flowered shrub, fast-growing hedge plant" },
  { name: "Dahlia",            category: "FLOWERS", price: 0, stock: 35, description: "Showy tuber plant with large blooms in every colour" },
  { name: "Hydrangea",         category: "FLOWERS", price: 0, stock: 20, description: "Large ball-shaped flower clusters, pink or blue depending on soil pH" },
  { name: "Bougainvillea",     category: "FLOWERS", price: 0, stock: 50, description: "Vibrant paper-like bracts in red, pink, orange, and purple" },
  { name: "Jasmine",           category: "FLOWERS", price: 0, stock: 60, description: "Fragrant white flowers used in garlands and perfumes" },
  { name: "Aster",             category: "FLOWERS", price: 0, stock: 40, description: "Star-shaped daisy-like flowers in purple, white, and pink" },
  { name: "Gerbera",           category: "FLOWERS", price: 0, stock: 40, description: "Bold daisy flowers in bright colours, popular for bouquets" },
  { name: "Petunia",           category: "FLOWERS", price: 0, stock: 50, description: "Trumpet-shaped blooms ideal for hanging baskets and borders" },
  { name: "Arali (Oleander)",  category: "FLOWERS", price: 0, stock: 30, description: "Nerium oleander — vibrant flowers in red, pink, white; drought-hardy" },
  { name: "Mandevilla",        category: "FLOWERS", price: 0, stock: 20, description: "Tropical climbing vine with large showy pink or red flowers" },
  { name: "Plumbago",          category: "FLOWERS", price: 0, stock: 30, description: "Light blue flowers cascading on a bushy shrub, great for hedges" },
  { name: "Zinnia",            category: "FLOWERS", price: 0, stock: 50, description: "Bright daisy-like flowers, easy to grow from seed" },
  { name: "Moss Rose",         category: "FLOWERS", price: 0, stock: 40, description: "Portulaca — succulent flowering annual, thrives in full sun" },
  { name: "Dianthus",          category: "FLOWERS", price: 0, stock: 35, description: "Clove-scented blooms in red, pink, and white" },
  { name: "Marigold",          category: "FLOWERS", price: 0, stock: 60, description: "Tagetes — vibrant orange and yellow flowers, natural pest repellent" },
  { name: "Gazania",           category: "FLOWERS", price: 0, stock: 30, description: "Treasure flower with striking daisy blooms, drought-tolerant" },

  // ── INDOOR PLANTS (1074–1093) ─────────────────────────────────────────────
  { name: "Lucky Bamboo",               category: "INDOOR_PLANTS", price: 0, stock: 50, description: "Feng shui plant, grows in water or soil, gift favourite" },
  { name: "Anthurium",                  category: "INDOOR_PLANTS", price: 0, stock: 40, description: "Waxy red/pink spathes, long-lasting blooms" },
  { name: "Aglaonema (Chinese Evergreen)", category: "INDOOR_PLANTS", price: 0, stock: 45, description: "Colourful foliage plant, tolerates low light and humidity" },
  { name: "Money Plant",                category: "INDOOR_PLANTS", price: 0, stock: 60, description: "Epipremnum aureum — fast-growing vine, air purifier" },
  { name: "Selloum (Philodendron)",     category: "INDOOR_PLANTS", price: 0, stock: 30, description: "Large deeply-lobed tropical leaves, dramatic statement plant" },
  { name: "Sansevieria (Snake Plant)",  category: "INDOOR_PLANTS", price: 0, stock: 50, description: "Nearly indestructible air-purifying plant, thrives in low light" },
  { name: "Aloe Vera",                  category: "INDOOR_PLANTS", price: 0, stock: 60, description: "Succulent with medicinal gel, needs bright indirect light" },
  { name: "Syngonium",                  category: "INDOOR_PLANTS", price: 0, stock: 40, description: "Arrow-head vine in green, pink, and white varieties" },
  { name: "Moonshine Sansevieria",      category: "INDOOR_PLANTS", price: 0, stock: 30, description: "Silvery-green upright sansevieria, striking modern look" },
  { name: "Rex Begonia",                category: "INDOOR_PLANTS", price: 0, stock: 25, description: "Spectacular patterned foliage in silver, red, and purple" },
  { name: "African Violet",             category: "INDOOR_PLANTS", price: 0, stock: 35, description: "Compact flowering houseplant in purple, pink, and white" },
  { name: "English Ivy",                category: "INDOOR_PLANTS", price: 0, stock: 30, description: "Classic trailing vine for hanging baskets or wall coverage" },
  { name: "Peperomia",                  category: "INDOOR_PLANTS", price: 0, stock: 35, description: "Compact low-maintenance plant with attractive textured leaves" },
  { name: "Impatiens",                  category: "INDOOR_PLANTS", price: 0, stock: 30, description: "Busy Lizzie — non-stop bloomer in shady spots" },
  { name: "Spathiphyllum (Peace Lily)", category: "INDOOR_PLANTS", price: 0, stock: 40, description: "White blooms, superb air purifier, thrives in low light" },
  { name: "Alocasia",                   category: "INDOOR_PLANTS", price: 0, stock: 25, description: "Elephant ear plant with dramatic tropical foliage" },
  { name: "Begonia",                    category: "INDOOR_PLANTS", price: 0, stock: 30, description: "Fibrous begonia with year-round flowers in shaded areas" },
  { name: "Zamioculcas (ZZ Plant)",     category: "INDOOR_PLANTS", price: 0, stock: 30, description: "Ultra-low maintenance glossy plant, survives neglect" },
  { name: "Maranta (Prayer Plant)",     category: "INDOOR_PLANTS", price: 0, stock: 25, description: "Striking herringbone leaf pattern, closes leaves at night" },
  { name: "Xanadu Philodendron",        category: "INDOOR_PLANTS", price: 0, stock: 30, description: "Compact philodendron with deeply lobed glossy leaves" },

  // ── ORNAMENTAL PLANTS (1094–1113) ─────────────────────────────────────────
  { name: "Poinsettia",            category: "ORNAMENTAL_PLANTS", price: 0, stock: 30, description: "Christmas star plant with red, pink, or white bracts" },
  { name: "Heliconia",             category: "ORNAMENTAL_PLANTS", price: 0, stock: 20, description: "Tropical lobster-claw blooms, stunning garden centrepiece" },
  { name: "Starlight Plant",       category: "ORNAMENTAL_PLANTS", price: 0, stock: 20, description: "Ornamental shrub with star-shaped white or pink flowers" },
  { name: "Plumeria (Frangipani)", category: "ORNAMENTAL_PLANTS", price: 0, stock: 25, description: "Fragrant temple flower in white, yellow, and pink" },
  { name: "Bottle Brush",          category: "ORNAMENTAL_PLANTS", price: 0, stock: 25, description: "Callistemon — red cylindrical flower spikes attract birds" },
  { name: "Ficus Panda",           category: "ORNAMENTAL_PLANTS", price: 0, stock: 20, description: "Decorative round-leafed ficus for pots and bonsai" },
  { name: "Yellow Pandanus",       category: "ORNAMENTAL_PLANTS", price: 0, stock: 15, description: "Golden-striped variegated screw pine, dramatic accent plant" },
  { name: "Golden Cypress",        category: "ORNAMENTAL_PLANTS", price: 0, stock: 20, description: "Bright yellow-gold conical conifer for garden accents" },
  { name: "Canna Flower",          category: "ORNAMENTAL_PLANTS", price: 0, stock: 30, description: "Bold tropical foliage with showy red/orange/yellow flowers" },
  { name: "Christina Plant",       category: "ORNAMENTAL_PLANTS", price: 0, stock: 25, description: "Colourful low-growing border plant with bright foliage" },
  { name: "Unipress Tree",         category: "ORNAMENTAL_PLANTS", price: 0, stock: 10, description: "Upright ornamental tree for avenue and landscape planting" },
  { name: "Ambal (Pink Lotus)",    category: "ORNAMENTAL_PLANTS", price: 0, stock: 15, description: "Sacred lotus — stunning aquatic plant for ponds and pots" },
  { name: "Ixora",                 category: "ORNAMENTAL_PLANTS", price: 0, stock: 40, description: "Jungle flame — compact shrub with red, orange, and yellow clusters" },
  { name: "Podocarpus",            category: "ORNAMENTAL_PLANTS", price: 0, stock: 15, description: "Conifer-like shrub used for formal hedges and topiary" },
  { name: "Adenium (Desert Rose)", category: "ORNAMENTAL_PLANTS", price: 0, stock: 20, description: "Succulent bonsai with stunning rose-like flowers" },
  { name: "Mussaenda Plant",       category: "ORNAMENTAL_PLANTS", price: 0, stock: 20, description: "Tropical shrub with large colourful sepals in pink, white, and red" },
  { name: "Buddha Bamboo",         category: "ORNAMENTAL_PLANTS", price: 0, stock: 25, description: "Clumping dwarf bamboo for privacy screens and pots" },
  { name: "Yellow Bamboo",         category: "ORNAMENTAL_PLANTS", price: 0, stock: 20, description: "Golden-stemmed clumping bamboo, non-invasive" },
  { name: "New Golden Bamboo",     category: "ORNAMENTAL_PLANTS", price: 0, stock: 20, description: "Phyllostachys aurea — upright golden canes for screening" },
  { name: "White Bamboo",          category: "ORNAMENTAL_PLANTS", price: 0, stock: 15, description: "Variegated white-green bamboo for decorative planting" },

  // ── TIMBER TREES (1114–1120) ──────────────────────────────────────────────
  { name: "Jathi (Nutmeg Tree)",    category: "TIMBER_TREES", price: 1000, stock: 15, description: "Large specimen nutmeg tree; valuable timber and spice" },
  { name: "Teak Burman",            category: "TIMBER_TREES", price: 150,  stock: 40, description: "Premium Burma teak sapling, highly durable hardwood timber" },
  { name: "Nila Amari",             category: "TIMBER_TREES", price: 100,  stock: 30, description: "Kerala native timber tree, medium-density wood" },
  { name: "Thampakam",              category: "TIMBER_TREES", price: 150,  stock: 25, description: "Tropical hardwood tree used in furniture and construction" },
  { name: "Mahogany",               category: "TIMBER_TREES", price: 150,  stock: 35, description: "Swietenia mahagoni — premier cabinet timber, fast-growing" },
  { name: "Chembakam (Magnolia)",   category: "TIMBER_TREES", price: 300,  stock: 20, description: "Fragrant white flowers; timber used in furniture making" },
  { name: "Madhuratulasi",          category: "TIMBER_TREES", price: 100,  stock: 30, description: "Sweet basil tree — aromatic leaves used in traditional medicine" },

  // ── FRUIT PLANTS — Exotic & Tropical (1121–1192) ──────────────────────────
  { name: "Hybrid Lime Lemon",              category: "FRUIT_PLANTS", price: 500,  stock: 40, description: "High-yielding seedless lime with thin skin and juicy fruit" },
  { name: "Jaboticaba",                     category: "FRUIT_PLANTS", price: 750,  salePrice: 1000, stock: 20, description: "Brazilian grape tree — unique trunk-bearing dark purple fruits" },
  { name: "Star Fruit (Carambola)",         category: "FRUIT_PLANTS", price: 500,  stock: 35, description: "Star-shaped cross-section fruit, sweet-tart flavour" },
  { name: "Custard Apple (Atha)",           category: "FRUIT_PLANTS", price: 500,  stock: 30, description: "Creamy sweet flesh with a custard-like texture" },
  { name: "White Sapota",                   category: "FRUIT_PLANTS", price: 500,  salePrice: 1200, stock: 25, description: "Casimiroa edulis — white sweet fruit with apple-like texture" },
  { name: "Kiwi",                           category: "FRUIT_PLANTS", price: 0,    stock: 10, description: "Actinidia deliciosa — climbing vine, requires cool climate" },
  { name: "Lemon Vine Fruit",               category: "FRUIT_PLANTS", price: 800,  stock: 15, description: "Pereskia aculeata — edible leaves and fruit, ornamental cactus relative" },
  { name: "Peanut Butter Fruit",            category: "FRUIT_PLANTS", price: 500,  stock: 15, description: "Bunchosia argentea — orange fruit with peanut butter flavour" },
  { name: "Malayan Apple (Jambu Air)",      category: "FRUIT_PLANTS", price: 500,  stock: 20, description: "Syzygium malaccense — rose-apple with crisp watery flesh" },
  { name: "Red Dragon Fruit",               category: "FRUIT_PLANTS", price: 600,  stock: 30, description: "Hylocereus costaricensis — vibrant red flesh, rich in antioxidants" },
  { name: "Mullatha",                       category: "FRUIT_PLANTS", price: 450,  stock: 25, description: "Kerala wild fruit tree, small sweet fruits edible when ripe" },
  { name: "Seethapazham (Sugar Apple)",     category: "FRUIT_PLANTS", price: 500,  stock: 25, description: "Annona squamosa — sweet segmented tropical fruit" },
  { name: "Athi (Fig)",                     category: "FRUIT_PLANTS", price: 650,  stock: 20, description: "Ficus carica — sweet fresh or dried figs, fast-bearing" },
  { name: "Strawberry Guava",               category: "FRUIT_PLANTS", price: 500,  stock: 30, description: "Psidium cattleianum — small red fruits with strawberry-guava flavour" },
  { name: "Bush Orange",                    category: "FRUIT_PLANTS", price: 600,  stock: 20, description: "Compact ornamental orange tree, suitable for containers" },
  { name: "Hybrid Guava",                   category: "FRUIT_PLANTS", price: 500,  salePrice: 1000, stock: 35, description: "Large-fruited hybrid guava with pink or white flesh" },
  { name: "Pineapple Chamba (Rose Apple)",  category: "FRUIT_PLANTS", price: 500,  stock: 25, description: "Syzygium jambos — pineapple-fragrant rose apple fruits" },
  { name: "Red Velvet Apple",               category: "FRUIT_PLANTS", price: 1000, stock: 10, description: "Diospyros discolor — rare velvety red fruit with sweet flesh" },
  { name: "Gooseberry (NA7)",               category: "FRUIT_PLANTS", price: 500,  stock: 30, description: "Phyllanthus emblica — Amla NA7 variety, high Vitamin C content" },
  { name: "Pomegranate",                    category: "FRUIT_PLANTS", price: 500,  stock: 35, description: "Punica granatum — antioxidant-rich red arils, drought-tolerant" },
  { name: "Kalapathi Sapotta (All Season)", category: "FRUIT_PLANTS", price: 1000, stock: 15, description: "Chiku variety that bears fruit year-round, dark brown sapota" },
  { name: "Rose Chamba",                    category: "FRUIT_PLANTS", price: 300,  stock: 30, description: "Rose apple with faint rose water fragrance, crispy texture" },
  { name: "Jamaican Milk Fruit",            category: "FRUIT_PLANTS", price: 500,  stock: 15, description: "Chrysophyllum cainito — star apple with milky sweet flesh" },
  { name: "Mootipazham",                    category: "FRUIT_PLANTS", price: 300,  stock: 20, description: "Traditional Kerala wild fruit, small and sweet" },
  { name: "Langsat",                        category: "FRUIT_PLANTS", price: 500,  stock: 15, description: "Lansium domesticum — cluster-bearing translucent sweet fruit" },
  { name: "Longan Fruit",                   category: "FRUIT_PLANTS", price: 750,  stock: 15, description: "Dimocarpus longan — dragon eye fruit, sweet and fragrant" },
  { name: "Durian",                         category: "FRUIT_PLANTS", price: 750,  stock: 10, description: "King of fruits — rich creamy flesh with strong distinctive aroma" },
  { name: "Thailand Chamba",                category: "FRUIT_PLANTS", price: 300,  salePrice: 500, stock: 20, description: "Wax apple variety from Thailand with elongated bell-shaped fruit" },
  { name: "Bread Fruit",                    category: "FRUIT_PLANTS", price: 650,  stock: 20, description: "Artocarpus altilis — starchy staple fruit, high-yield tree" },
  { name: "Lychee",                         category: "FRUIT_PLANTS", price: 650,  stock: 20, description: "Litchi chinensis — juicy sweet aromatic fruit, valued export crop" },
  { name: "Mosambi (Sweet Lime)",           category: "FRUIT_PLANTS", price: 750,  stock: 25, description: "Citrus limetta — mild citrus for fresh juice, easy to peel" },
  { name: "Seedless Jamun",                 category: "FRUIT_PLANTS", price: 600,  stock: 20, description: "Syzygium cumini — Indian blackberry without seeds, high yield" },
  { name: "Egg Fruit (Canistel)",           category: "FRUIT_PLANTS", price: 300,  stock: 15, description: "Pouteria campechiana — egg-yolk coloured sweet flesh" },
  { name: "Brazilian Mulberry",             category: "FRUIT_PLANTS", price: 0,    stock: 10, description: "Morus species — red-black berries with tangy sweet flavour" },
  { name: "Cocoa",                          category: "FRUIT_PLANTS", price: 250,  stock: 30, description: "Theobroma cacao — chocolate source plant, shade-loving" },
  { name: "Falsa",                          category: "FRUIT_PLANTS", price: 750,  stock: 15, description: "Grewia asiatica — small purple berries, cooling summer fruit" },
  { name: "Santol Fruit",                   category: "FRUIT_PLANTS", price: 1000, stock: 10, description: "Sandoricum koetjape — cottony sweet-sour tropical fruit" },
  { name: "Manila Cherry",                  category: "FRUIT_PLANTS", price: 850,  stock: 15, description: "Pseudomorus brunoniana — clusters of small sweet cherry-like fruits" },
  { name: "Bakery Cherry",                  category: "FRUIT_PLANTS", price: 300,  stock: 20, description: "Ornamental cherry used in desserts and confectionery" },
  { name: "Rollinia Fruit",                 category: "FRUIT_PLANTS", price: 1000, stock: 10, description: "Annona family — lemon-flavoured creamy tropical fruit" },
  { name: "Pepino Fruit",                   category: "FRUIT_PLANTS", price: 0,    stock: 10, description: "Solanum muricatum — mild sweet melon-flavoured fruit" },
  { name: "West Indian Cherry (Acerola)",   category: "FRUIT_PLANTS", price: 300,  salePrice: 500, stock: 20, description: "Malpighia emarginata — highest natural Vitamin C content" },
  { name: "Walnut",                         category: "FRUIT_PLANTS", price: 0,    stock: 5,  description: "Juglans regia — brain-shaped nut, requires cool winters" },
  { name: "Cherimoya",                      category: "FRUIT_PLANTS", price: 0,    stock: 8,  description: "Mark Twain's 'most delicious fruit' — creamy custard-like flesh" },
  { name: "Peach",                          category: "FRUIT_PLANTS", price: 0,    stock: 10, description: "Prunus persica — fuzzy sweet stone fruit, needs chilling" },
  { name: "Plums",                          category: "FRUIT_PLANTS", price: 650,  stock: 15, description: "Prunus domestica — juicy stone fruit in red, yellow, or purple" },
  { name: "Black Berry",                    category: "FRUIT_PLANTS", price: 650,  stock: 15, description: "Rubus fruticosus — thorny cane berry with dark sweet fruits" },
  { name: "White Jamun",                    category: "FRUIT_PLANTS", price: 600,  stock: 20, description: "Syzygium cumini white variety — less astringent, sweeter taste" },
  { name: "Sweet Ambazham (Hog Plum)",      category: "FRUIT_PLANTS", price: 650,  stock: 20, description: "Spondias dulcis — golden plum with tangy-sweet flavour" },
  { name: "Seedless Lemon",                 category: "FRUIT_PLANTS", price: 600,  stock: 30, description: "High-yield thornless lemon with no seeds, heavy crops" },
  { name: "Babloos",                        category: "FRUIT_PLANTS", price: 600,  stock: 15, description: "Local tropical fruit variety with sweet edible pulp" },
  { name: "Passion Fruit",                  category: "FRUIT_PLANTS", price: 100,  stock: 40, description: "Passiflora edulis — fast-growing vine, tart aromatic fruit" },
  { name: "Abiu",                           category: "FRUIT_PLANTS", price: 1000, salePrice: 1500, stock: 10, description: "Pouteria caimito — silky caramel-sweet yellow Amazonian fruit" },
  { name: "Pulasan",                        category: "FRUIT_PLANTS", price: 1000, stock: 8,  description: "Nephelium mutabile — rambutan relative, sweeter and more aromatic" },
  { name: "Rambutan",                       category: "FRUIT_PLANTS", price: 500,  salePrice: 1500, stock: 20, description: "Nephelium lappaceum — hairy red fruit with translucent sweet flesh" },
  { name: "Pistachio (Pistha)",             category: "FRUIT_PLANTS", price: 0,    stock: 5,  description: "Pistacia vera — requires arid conditions, premium nut crop" },
  { name: "Mangosteen",                     category: "FRUIT_PLANTS", price: 750,  salePrice: 1000, stock: 15, description: "Queen of fruits — sweet-tart white flesh with purple shell" },
  { name: "Red Lady Papaya",                category: "FRUIT_PLANTS", price: 150,  stock: 60, description: "Taiwan hybrid papaya, female-only plants, prolific bearer" },
  { name: "Malabari Chestnut",              category: "FRUIT_PLANTS", price: 500,  stock: 15, description: "Pachira aquatica — edible nut with coconut-like taste" },
  { name: "Red Apple Guava",                category: "FRUIT_PLANTS", price: 650,  stock: 25, description: "Apple-sized red-skinned guava with pink flesh and mild flavour" },
  { name: "Bear Apple",                     category: "FRUIT_PLANTS", price: 500,  stock: 15, description: "Tropical fruit with resemblance to small apples" },
  { name: "Miracle Fruit",                  category: "FRUIT_PLANTS", price: 500,  salePrice: 1000, stock: 15, description: "Synsepalum dulcificum — makes sour foods taste sweet after eating" },
  { name: "Surinam Cherry",                 category: "FRUIT_PLANTS", price: 750,  stock: 20, description: "Eugenia uniflora — ribbed red-black berries, sweet-tart tropical fruit" },
  { name: "Strawberry",                     category: "FRUIT_PLANTS", price: 400,  stock: 30, description: "Fragaria × ananassa — popular red berry, grows in pots" },
  { name: "Grapes",                         category: "FRUIT_PLANTS", price: 100,  salePrice: 400, stock: 40, description: "Vitis vinifera — table and wine grapes, needs trellis support" },
  { name: "Butter Fruit (Avocado)",         category: "FRUIT_PLANTS", price: 500,  salePrice: 1000, stock: 30, description: "Persea americana — creamy fatty fruit, nutrient powerhouse" },
  { name: "Baraba",                         category: "FRUIT_PLANTS", price: 500,  stock: 15, description: "Tropical fruit tree, round sweet fruits with edible skin" },
  { name: "Cashewnut",                      category: "FRUIT_PLANTS", price: 400,  stock: 25, description: "Anacardium occidentale — nut and cashew apple, fast-growing tree" },
  { name: "Loquat Fruit",                   category: "FRUIT_PLANTS", price: 0,    stock: 10, description: "Eriobotrya japonica — sweet-tart apricot-like fruit, cool-season" },
  { name: "Orange Tree",                    category: "FRUIT_PLANTS", price: 1000, stock: 20, description: "Citrus sinensis — grafted orange for tropical and sub-tropical regions" },
  { name: "Apple Tree",                     category: "FRUIT_PLANTS", price: 1500, stock: 10, description: "Low-chill apple variety for warm regions, grafted plant" },
  { name: "Ethan (Nendran Banana)",         category: "FRUIT_PLANTS", price: 100,  stock: 50, description: "Premium Kerala cooking banana, Nendran variety sucker" },

  // ── GROW SUPPLIES (1193–1200) ─────────────────────────────────────────────
  { name: "Grow Bag (Empty)",            category: "GROW_SUPPLIES", price: 40,  stock: 200, description: "UV-stabilised black HDPE grow bag for home and terrace gardens" },
  { name: "Grow Bag (Filled with Soil)", category: "GROW_SUPPLIES", price: 250, stock: 100, description: "Ready-to-plant grow bag filled with enriched potting mix" },
  { name: "Organic Fertilizer 5kg",      category: "GROW_SUPPLIES", price: 200, stock: 80,  description: "Balanced organic fertilizer blend for fruiting and flowering plants" },
  { name: "Organic Fertilizer 10kg",     category: "GROW_SUPPLIES", price: 350, stock: 60,  description: "Economy pack organic fertilizer for kitchen gardens" },
  { name: "Organic Fertilizer 25kg",     category: "GROW_SUPPLIES", price: 800, stock: 40,  description: "Bulk pack organic fertilizer, ideal for farm and large gardens" },
  { name: "Robust Growth Supplement",    category: "GROW_SUPPLIES", price: 100, stock: 60,  description: "Liquid growth booster for faster root establishment after transplanting" },
  { name: "Sarvasuganithi",              category: "GROW_SUPPLIES", price: 100, stock: 50,  description: "Traditional Kerala herbal compost activator for organic farming" },
  { name: "Biodite Fertilizer 1kg",      category: "GROW_SUPPLIES", price: 100, stock: 80,  description: "Bio-organic fertilizer blend for soil microbial activity improvement" },
];

async function main() {
  console.log("🗑️  Deleting old products with prefixed SKUs...");
  const prefixes = ["MANGO-","JACK-","COCO-","SPICE-","PALM-","FLOW-","INDOOR-","ORNAM-","TIMBER-","FRUIT-","SUPPLY-"];
  for (const prefix of prefixes) {
    const { error } = await supabase.from("Product").delete().like("sku", `${prefix}%`);
    if (error) console.error(`  ⚠️  Delete ${prefix}*: ${error.message}`);
  }
  console.log("   Done.\n");

  console.log(`🌱 Seeding ${products.length} products with 4-digit SKUs (1001–${1000 + products.length})...\n`);

  let saved = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const sku = String(1001 + i);

    const row = {
      id: randomUUID(),
      sku,
      name: p.name,
      category: p.category,
      price: p.price,
      salePrice: p.salePrice ?? null,
      stock: p.stock ?? 0,
      description: p.description ?? null,
      imageUrl: null,
      imagePublicId: null,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    };

    const { error } = await supabase
      .from("Product")
      .upsert(row, { onConflict: "sku", ignoreDuplicates: false })
      .select("id");

    if (error) {
      console.error(`  ❌ ${sku} ${p.name} — ${error.message}`);
      failed++;
    } else {
      process.stdout.write(`  ✅ #${sku}  ${p.name}\n`);
      saved++;
    }
  }

  console.log(`
─────────────────────────────────────
  Total  : ${products.length}
  Saved  : ${saved}
  Failed : ${failed}
─────────────────────────────────────`);

  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
