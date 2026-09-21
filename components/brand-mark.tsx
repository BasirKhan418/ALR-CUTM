import Image from "next/image"
import { cn } from "@/lib/utils"

const ASSETS = {
  seal: {
    src: "/brand/cutm-seal.png",
    width: 256,
    height: 256,
    alt: "Centurion University of Technology and Management",
  },
  lockup: {
    src: "/brand/cutm-logo.png",
    width: 282,
    height: 448,
    alt: "Centurion University of Technology and Management",
  },
} as const

const HEIGHT = {
  sm: "h-8",
  md: "h-10",
  lg: "h-20",
} as const

export function BrandMark({
  className,
  showWordmark = true,
  size = "sm",
  variant = "seal",
  preload = false,
}: {
  className?: string
  showWordmark?: boolean
  size?: keyof typeof HEIGHT
  variant?: keyof typeof ASSETS
  preload?: boolean
}) {
  const asset = ASSETS[variant]

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        preload={preload}
        className={cn("w-auto object-contain", HEIGHT[size])}
      />
      {showWordmark ? (
        <span className="font-heading text-sm font-semibold tracking-tight">
          ALR
        </span>
      ) : null}
    </span>
  )
}
