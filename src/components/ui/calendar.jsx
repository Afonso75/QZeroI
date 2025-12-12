import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    (<DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 select-none", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-6",
        month: "space-y-5",
        caption: "flex justify-center pt-2 pb-3 relative items-center",
        caption_label: "text-base font-semibold text-slate-800 dark:text-slate-200 capitalize",
        nav: "flex items-center gap-1",
        nav_button: cn(
          "inline-flex items-center justify-center rounded-full",
          "h-9 w-9 bg-transparent",
          "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2",
          "disabled:opacity-30 disabled:pointer-events-none"
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse",
        head_row: "flex mb-2",
        head_cell: cn(
          "flex-1 text-center",
          "text-xs font-semibold uppercase tracking-wider",
          "text-slate-400 dark:text-slate-500",
          "py-2"
        ),
        row: "flex w-full gap-1 mb-1",
        cell: cn(
          "flex-1 relative text-center",
          "focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-transparent",
          "first:[&:has([aria-selected])]:rounded-l-xl",
          "last:[&:has([aria-selected])]:rounded-r-xl",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-xl [&:has(>.day-range-start)]:rounded-l-xl"
            : ""
        ),
        day: cn(
          "inline-flex items-center justify-center",
          "h-10 w-10 sm:h-11 sm:w-11",
          "rounded-xl",
          "text-sm font-medium",
          "text-slate-700 dark:text-slate-300",
          "transition-all duration-200 ease-out",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          "hover:text-slate-900 dark:hover:text-slate-100",
          "hover:scale-105",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
          "aria-selected:opacity-100",
          "cursor-pointer"
        ),
        day_range_start: "day-range-start rounded-l-xl rounded-r-none",
        day_range_end: "day-range-end rounded-r-xl rounded-l-none",
        day_selected: cn(
          "!bg-gradient-to-br from-blue-500 to-blue-600",
          "!text-white font-semibold",
          "shadow-lg shadow-blue-500/30",
          "hover:from-blue-600 hover:to-blue-700",
          "hover:shadow-blue-500/40",
          "hover:scale-105",
          "ring-2 ring-blue-400/30"
        ),
        day_today: cn(
          "bg-slate-100 dark:bg-slate-800",
          "text-blue-600 dark:text-blue-400",
          "font-bold",
          "ring-1 ring-blue-200 dark:ring-blue-800"
        ),
        day_outside: cn(
          "text-slate-300 dark:text-slate-600",
          "opacity-60",
          "hover:opacity-80",
          "aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30",
          "aria-selected:text-blue-400 aria-selected:opacity-80"
        ),
        day_disabled: cn(
          "text-slate-300 dark:text-slate-600",
          "opacity-40",
          "cursor-not-allowed",
          "hover:bg-transparent hover:scale-100"
        ),
        day_range_middle: cn(
          "aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30",
          "aria-selected:text-blue-700 dark:aria-selected:text-blue-300",
          "rounded-none"
        ),
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-5 w-5", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-5 w-5", className)} {...props} />
        ),
      }}
      {...props} />)
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
