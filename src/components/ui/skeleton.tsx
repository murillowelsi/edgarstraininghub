import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Pulse only when the person allows motion (design system 6.3)
      className={cn("motion-safe:animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
