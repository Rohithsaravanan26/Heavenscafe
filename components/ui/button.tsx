import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#43291F] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#43291F] text-[#FFFDF8] hover:bg-[#341F17] shadow-sm",
        terracotta:
          "bg-[#B56C4A] text-[#FFFDF8] hover:bg-[#9F5D3D] shadow-sm",
        olive:
          "bg-[#737B52] text-[#FFFDF8] hover:bg-[#606742] shadow-sm",
        destructive:
          "bg-red-700 text-white hover:bg-red-800 shadow-sm",
        outline:
          "border border-[#E8DED0] bg-[#FFFDF8] text-[#30231E] hover:bg-[#F8F3E9] hover:border-[#D8CEBE]",
        secondary:
          "bg-[#EFE7DA] text-[#43291F] hover:bg-[#E2D8C7]",
        ghost:
          "hover:bg-[#EFE7DA] text-[#30231E]",
        link:
          "text-[#B56C4A] underline-offset-4 hover:underline p-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-6 text-base font-semibold",
        xl: "h-14 rounded-lg px-8 text-lg font-bold",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
