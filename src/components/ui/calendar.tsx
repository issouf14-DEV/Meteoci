import { fr } from "date-fns/locale/fr";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import { type ChevronProps, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";

function CalendarChevron({ orientation, className }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon aria-hidden="true" className={cn("size-4", className)} />;
}

type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendrier shadcn/ui (react-day-picker v9) en français, semaine commençant
 * le lundi. Cases de 36 px (44 px sur écran tactile).
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = fr,
  components,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      data-slot="calendar"
      locale={locale}
      showOutsideDays={showOutsideDays}
      className={cn("select-none", className)}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-4", defaults.months),
        month: cn("flex w-full flex-col gap-3", defaults.month),
        nav: cn("absolute inset-x-0 top-0 flex items-center justify-between gap-1", defaults.nav),
        button_previous: cn(navButton, defaults.button_previous),
        button_next: cn(navButton, defaults.button_next),
        month_caption: cn(
          "flex h-9 items-center justify-center px-10 pointer-coarse:h-11",
          defaults.month_caption,
        ),
        caption_label: cn("text-sm font-semibold capitalize", defaults.caption_label),
        month_grid: cn("w-full border-collapse", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "flex w-9 items-center justify-center text-[0.75rem] font-medium capitalize text-muted-foreground pointer-coarse:w-11",
          defaults.weekday,
        ),
        week: cn("mt-1 flex w-full", defaults.week),
        day: cn("group/day relative size-9 p-0 text-center pointer-coarse:size-11", defaults.day),
        day_button: cn(
          "inline-flex size-full items-center justify-center rounded-lg text-sm tabular-nums transition-[background-color,color,transform] duration-150 hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:pointer-events-none",
          defaults.day_button,
        ),
        today: cn(
          "[&>button]:font-semibold [&>button]:text-primary [&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-primary/40",
          defaults.today,
        ),
        selected: cn(
          "[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button]:ring-0 [&>button]:hover:bg-primary/90",
          defaults.selected,
        ),
        outside: cn("text-muted-foreground/60", defaults.outside),
        disabled: cn("text-muted-foreground/40", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        ...components,
      }}
      {...props}
    />
  );
}

const navButton =
  "inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-[background-color,opacity] duration-150 hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 pointer-coarse:size-11";

export { Calendar, type CalendarProps };
