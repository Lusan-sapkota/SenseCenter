import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap transition-colors duration-150 select-none [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-brand-teal/35 bg-brand-teal/10 text-brand-teal",
        secondary:
          "border-white/[0.08] bg-white/[0.04] text-muted-foreground",
        destructive:
          "border-rose-500/35 bg-rose-500/10 text-rose-400",
        outline:
          "border-white/15 bg-black/40 text-foreground/90",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
        amber:
          "border-amber-500/35 bg-amber-500/10 text-amber-300",
        emerald:
          "border-emerald-500/35 bg-emerald-500/10 text-emerald-400",
        violet:
          "border-brand-violet/35 bg-brand-violet/10 text-brand-violet",
        link:
          "border-transparent text-brand-teal underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
