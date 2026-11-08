import type * as React from "react";
import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/components/theme-provider";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-right"
      // Sous l'en-tête, comme les notifications de l'original.
      offset={{ top: "96px", right: "16px" }}
      mobileOffset={{ top: "92px", left: "16px", right: "16px" }}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:font-sans",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "border-l-4 border-l-success [&_[data-icon]]:text-success",
          error: "border-l-4 border-l-destructive [&_[data-icon]]:text-destructive",
          info: "border-l-4 border-l-[#3b82f6] [&_[data-icon]]:text-[#3b82f6]",
          warning: "border-l-4 border-l-accent [&_[data-icon]]:text-accent",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
