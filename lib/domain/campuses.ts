export const CAMPUSES = [
  { slug: "paralakhemundi", name: "Paralakhemundi" },
  { slug: "bhubaneswar", name: "Bhubaneswar" },
  { slug: "balangir", name: "Balangir" },
  { slug: "rayagada", name: "Rayagada" },
  { slug: "balasore", name: "Balasore" },
  { slug: "chatrapur", name: "Chatrapur" },
] as const

export type CampusSlug = (typeof CAMPUSES)[number]["slug"]
