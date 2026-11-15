import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#43291F]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#43291F] text-[#FFFDF8]",
        secondary:
          "border-transparent bg-[#EFE7DA] text-[#43291F]",
        terracotta:
          "border-transparent bg-[#FAF0EB] text-[#B56C4A] border-[#F3DDD2]",
        olive:
          "border-transparent bg-[#F0F1EA] text-[#737B52] border-[#DEE0D1]",
        destructive:
          "border-transparent bg-red-100 text-red-800 border-red-200",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 border-emerald-200",
        warning:
          "border-transparent bg-amber-100 text-amber-800 border-amber-200",
        outline:
          "text-[#30231E] border-[#E8DED0]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
