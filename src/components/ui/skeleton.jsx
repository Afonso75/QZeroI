import { cn } from "@/lib/utils"

function Skeleton({
  className,
  shimmer = true,
  ...props
}) {
  return (
    (<div
      className={cn(
        "rounded-md bg-muted/50",
        shimmer && "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        !shimmer && "animate-pulse",
        className
      )}
      {...props} />)
  );
}

export { Skeleton }
