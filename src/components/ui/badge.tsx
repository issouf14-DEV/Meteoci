import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary/15 text-cyan-800 dark:text-cyan-300",
        accent: "border-transparent bg-accent/15 text-amber-800 dark:text-amber-300",
        muted: "border-transparent bg-muted text-muted-foreground",
        outline: "text-foreground",
        // Fond sombre opaque, sans flou : lisible et peu coûteux au-dessus de la vidéo.
        glass: "border-white/20 bg-black/35 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export type { BadgeProps };
export { Badge, badgeVariants };
