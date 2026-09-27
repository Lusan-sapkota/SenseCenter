import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-clip-padding font-mono text-xs font-semibold tracking-wider whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-brand-teal active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-brand-teal to-brand-violet text-black font-bold hover:brightness-110 active:brightness-95 shadow-sm",
        outline:
          "border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.07] hover:border-white/20 active:bg-white/[0.05]",
        secondary:
          "border border-white/[0.08] bg-[#121724] text-foreground hover:bg-[#171E2E] hover:border-white/15",
        ghost:
          "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
        destructive:
          "border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:bg-rose-500/15",
        link: "text-brand-teal underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-[10px]",
        sm: "h-7 gap-1.5 rounded-lg px-2.5 text-[11px]",
        lg: "h-9 gap-2 px-4 text-xs",
        icon: "size-8 rounded-xl",
        "icon-xs":
          "size-6 rounded-lg",
        "icon-sm":
          "size-7 rounded-lg",
        "icon-lg": "size-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
