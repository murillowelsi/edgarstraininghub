import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASS: Record<SpinnerSize, string> = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/**
 * Only for an action in progress inside a button ("Saving…"). Screens, lists
 * and app start use skeletons (components/feedback) instead.
 */
export const Spinner = ({
  size = "md",
  className,
}: {
  size?: SpinnerSize;
  className?: string;
}) => (
  <Loader2 className={cn("animate-spin text-primary", SIZE_CLASS[size], className)} />
);
