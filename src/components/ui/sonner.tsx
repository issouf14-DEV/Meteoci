import * as React from "react";
import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/components/theme-provider";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:font-sans",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-destructive",
          info: "[&_[data-icon]]:text-primary",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
