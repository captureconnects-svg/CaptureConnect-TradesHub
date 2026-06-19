import {
  HardHat,
  Zap,
  Car,
  Home,
  Sparkles,
  Leaf,
  Wrench,
  Droplets,
  ShoppingBag,
  UtensilsCrossed,
  Cpu,
  Factory,
  Truck,
  Camera,
  Music,
  PartyPopper,
  Printer,
  Building2,
  Heart,
  MapPin,
  type LucideIcon,
} from "lucide-react";

export type Category = {
  slug: string;
  name: string;
  icon: LucideIcon;
  gradient: string;
  subcategories: string[];
};

export const CATEGORIES: Category[] = [
  { slug: "construction", name: "Construction", icon: HardHat, gradient: "from-orange-500/30 to-red-600/30", subcategories: ["Mason", "Carpenter", "Roofer", "Steelman"] },
  { slug: "electrical-plumbing", name: "Electrical & Plumbing", icon: Zap, gradient: "from-amber-500/30 to-orange-600/30", subcategories: ["Electrician", "Plumber", "Solar Tech"] },
  { slug: "automotive", name: "Automotive", icon: Car, gradient: "from-blue-500/30 to-cyan-600/30", subcategories: ["Mechanics", "Tire Shops", "Auto Parts"] },
  { slug: "home-services", name: "Home Services", icon: Home, gradient: "from-sky-500/30 to-indigo-600/30", subcategories: ["Appliance Repair", "AC Tech", "Handyman"] },
  { slug: "beauty-fashion", name: "Beauty & Fashion", icon: Sparkles, gradient: "from-pink-500/30 to-rose-600/30", subcategories: ["Barber", "Braider", "Nail Tech", "Tailor"] },
  { slug: "agriculture", name: "Agriculture", icon: Leaf, gradient: "from-green-500/30 to-emerald-700/30", subcategories: ["Farmers", "Produce Sellers", "Irrigation"] },
  { slug: "repair-services", name: "Repair Services", icon: Wrench, gradient: "from-yellow-600/30 to-amber-700/30", subcategories: ["Phone Repair", "Generator Repair", "Electronics"] },
  { slug: "cleaning-maintenance", name: "Cleaning & Maintenance", icon: Droplets, gradient: "from-cyan-500/30 to-blue-600/30", subcategories: ["Janitorial", "Landscaping", "Pest Control"] },
  { slug: "retail-wholesale", name: "Retail & Wholesale", icon: ShoppingBag, gradient: "from-violet-500/30 to-purple-600/30", subcategories: ["Hardware", "Vendors", "Bulk Suppliers"] },
  { slug: "food-catering", name: "Food & Catering", icon: UtensilsCrossed, gradient: "from-red-500/30 to-orange-700/30", subcategories: ["Caterers", "Bakers", "Food Vendors"] },
  { slug: "electronics-tech", name: "Electronics & Tech", icon: Cpu, gradient: "from-indigo-500/30 to-violet-600/30", subcategories: ["CCTV", "Networking", "Computer Repair"] },
  { slug: "manufacturing-fabrication", name: "Manufacturing & Fabrication", icon: Factory, gradient: "from-slate-500/30 to-gray-700/30", subcategories: ["Welding", "Furniture Making", "Metal Works"] },
  { slug: "transportation-delivery", name: "Transportation & Delivery", icon: Truck, gradient: "from-stone-500/30 to-zinc-700/30", subcategories: ["Taxi", "Trucking", "Courier", "Movers"] },
  { slug: "film-photography", name: "Film & Photography", icon: Camera, gradient: "from-yellow-400/30 to-amber-600/30", subcategories: ["Videographers", "Photographers", "Editors"] },
  { slug: "music-entertainment", name: "Music & Entertainment", icon: Music, gradient: "from-fuchsia-500/30 to-pink-600/30", subcategories: ["DJs", "Producers", "Sound Systems", "MCs"] },
  { slug: "events-decorations", name: "Events & Decorations", icon: PartyPopper, gradient: "from-rose-500/30 to-pink-700/30", subcategories: ["Party Planners", "Decorators", "Tent Rentals"] },
  { slug: "printing-branding", name: "Printing & Branding", icon: Printer, gradient: "from-teal-500/30 to-cyan-700/30", subcategories: ["Printing Shops", "Sign Makers", "Graphic Design"] },
  { slug: "real-estate", name: "Real Estate & Property", icon: Building2, gradient: "from-stone-600/30 to-amber-900/30", subcategories: ["Realtors", "Property Managers", "Inspectors"] },
  { slug: "health-wellness", name: "Health & Wellness", icon: Heart, gradient: "from-emerald-500/30 to-green-700/30", subcategories: ["Massage Therapists", "Fitness Trainers", "Spa"] },
  { slug: "tourism-hospitality", name: "Tourism & Hospitality", icon: MapPin, gradient: "from-sky-400/30 to-blue-600/30", subcategories: ["Tour Guides", "Airbnb Services", "Boat Charters"] },
];

export type Tradesperson = {
  id: string;
  urlSlug?: string;
  name: string;
  trade: string;
  categorySlug: string;
  location: string;
  rating: number;
  reviews: number;
  hourly: number;
  verified: boolean;
  initials: string;
  tagline: string;
  specialties?: string[];
  startingPrice?: number;
  profileImage?: string;
};

export function slugifyName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const FIRST = ["Mike", "Sarah", "Carlos", "James", "Aisha", "Diego", "Emily", "Tom", "Priya", "Noah", "Liam", "Olivia", "Ethan", "Maya", "Sam", "Jordan", "Riley", "Avery", "Logan", "Quinn"];
const LAST = ["Hayes", "Bennett", "Reyes", "Foster", "Khan", "Morales", "Walsh", "Caldwell", "Patel", "Brooks", "Stone", "Hayes", "Wright", "Rivera", "Cole"];
const CITIES = ["Austin, TX", "Denver, CO", "Phoenix, AZ", "Portland, OR", "Nashville, TN", "Tampa, FL", "Raleigh, NC", "Boise, ID", "Charlotte, NC", "Salt Lake City, UT"];
const TAGLINES = [
  "Licensed & insured. Same-day quotes.",
  "20+ years on the tools. No job too small.",
  "Fast, clean, and on-budget every time.",
  "Family-run business serving since 2008.",
  "Specialists in residential & light commercial.",
  "Master tradesperson. Premium finishes only.",
];

function seeded(i: number) {
  return Math.abs(Math.sin(i * 99.13) * 10000) % 1;
}

export const TRADESPEOPLE: Tradesperson[] = CATEGORIES.flatMap((cat, ci) =>
  Array.from({ length: 6 }).map((_, i) => {
    const idx = ci * 6 + i;
    const first = FIRST[Math.floor(seeded(idx + 1) * FIRST.length)];
    const last = LAST[Math.floor(seeded(idx + 2) * LAST.length)];
    const reviews = 5 + Math.floor(seeded(idx + 3) * 280);
    const rating = +(4.3 + seeded(idx + 4) * 0.7).toFixed(1);
    return {
      id: `${cat.slug}-${i}`,
      name: `${first} ${last}`,
      trade: cat.name.replace(/s$/, ""),
      categorySlug: cat.slug,
      location: CITIES[Math.floor(seeded(idx + 5) * CITIES.length)],
      rating: Math.min(5, rating),
      reviews,
      hourly: 45 + Math.floor(seeded(idx + 6) * 90),
      verified: seeded(idx + 7) > 0.25,
      initials: `${first[0]}${last[0]}`,
      tagline: TAGLINES[Math.floor(seeded(idx + 8) * TAGLINES.length)],
    };
  }),
);

export const TOP_RATED = [...TRADESPEOPLE]
  .filter((t) => t.reviews >= 50)
  .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
  .slice(0, 8);
